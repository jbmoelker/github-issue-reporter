import { Octokit } from '@octokit/rest'
import type { GitHubUser, GitHubRepo, CreatedIssue } from '@github-issue-reporter/shared'

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

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
): Promise<CreatedIssue> {
  const octokit = createOctokit(token)
  try {
    const { data } = await octokit.rest.issues.create({ owner, repo, title, body })
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
