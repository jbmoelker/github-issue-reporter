import { Octokit } from '@octokit/rest'
import type { GitHubUser, GitHubRepo, GitHubLabel, GitHubIssueType, CreatedIssue } from '@github-issue-reporter/shared'

function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token })
}

export async function getUser(token: string): Promise<GitHubUser> {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.users.getAuthenticated()
  return {
    login: data.login,
    name: data.name ?? null,
    avatarUrl: data.avatar_url,
  }
}

export async function listWritableRepos(token: string): Promise<GitHubRepo[]> {
  const octokit = createOctokit(token)
  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    sort: 'full_name',
    per_page: 100,
    affiliation: 'owner,collaborator,organization_member',
  })
  return repos
    .filter(r => r.permissions?.push && r.has_issues && !r.archived)
    .map(r => ({
      id: r.id,
      fullName: r.full_name,
      owner: r.owner.login,
      name: r.name,
      private: r.private,
    }))
}

export async function listLabels(token: string, owner: string, repo: string): Promise<GitHubLabel[]> {
  const octokit = createOctokit(token)
  try {
    const labels = await octokit.paginate(octokit.rest.issues.listLabelsForRepo, {
      owner,
      repo,
      per_page: 100,
    })
    return labels.map(l => ({
      id: l.id,
      name: l.name,
      color: l.color,
    }))
  } catch {
    return []
  }
}

export async function listIssueTypes(token: string, owner: string, repo: string): Promise<GitHubIssueType[]> {
  const octokit = createOctokit(token)
  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/issues/types', { owner, repo })
    return (data as Array<{ id: number; name: string; description: string | null }>).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description ?? null,
    }))
  } catch {
    return []
  }
}

const SCREENSHOTS_TAG = 'issue-screenshots'

async function getOrCreateScreenshotsRelease(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<number> {
  try {
    const { data } = await octokit.rest.repos.getReleaseByTag({ owner, repo, tag: SCREENSHOTS_TAG })
    return data.id
  } catch {
    // Release doesn't exist yet — create it as a pre-release so it stays off the main releases page
    const { data } = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: SCREENSHOTS_TAG,
      name: 'Issue Screenshots',
      body: 'Stores screenshots attached to GitHub issues via the GitHub Issue Reporter extension.',
      prerelease: true,
    })
    return data.id
  }
}

export async function uploadScreenshot(
  token: string,
  owner: string,
  repo: string,
  dataUrl: string,
  filename: string,
): Promise<string> {
  const octokit = createOctokit(token)
  const releaseId = await getOrCreateScreenshotsRelease(octokit, owner, repo)

  // Convert base64 data URL to binary Blob
  const base64 = dataUrl.split(',')[1]
  const byteString = atob(base64)
  const bytes = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'image/png' })

  // Use fetch directly against uploads.github.com — Octokit's binary handling
  // is unreliable in browser/extension environments
  const url = `https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(filename)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'image/png' },
    body: blob,
  })
  if (!res.ok) {
    const { message } = await res.json().catch(() => ({ message: `Upload failed: ${res.status}` }))
    throw new Error(message)
  }
  const asset = await res.json() as { browser_download_url: string }
  return asset.browser_download_url
}

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels?: string[],
): Promise<CreatedIssue> {
  const octokit = createOctokit(token)
  try {
    const { data } = await octokit.rest.issues.create({ owner, repo, title, body, labels })
    return {
      number: data.number,
      htmlUrl: data.html_url,
      title: data.title,
    }
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    const message = (err as { message?: string }).message ?? 'Failed to create issue'
    throw new Error(status ? `GitHub ${status}: ${message}` : message)
  }
}
