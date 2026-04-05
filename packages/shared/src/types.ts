export interface GitHubUser {
  login: string
  name: string | null
  avatarUrl: string
}

export interface GitHubRepo {
  id: number
  fullName: string
  owner: string
  name: string
  private: boolean
}

export interface BrowserContext {
  url: string | null
  browser: string
  browserVersion: string
  os: string
  viewport: string
}

export interface AuthPollResponse {
  status: 'pending' | 'complete' | 'expired'
  token?: string
}

export interface CreatedIssue {
  number: number
  htmlUrl: string
  title: string
}

export interface GitHubLabel {
  id: number
  name: string
  color: string
}

export interface GitHubIssueType {
  id: number
  name: string
  description: string | null
}

/** Shape of .github/issue-reporter.yml in the target repository */
export interface RepoConfig {
  context?: {
    cookies?: Array<{ name: string; label: string }>
    localStorage?: Array<{ key: string; label: string }>
  }
}
