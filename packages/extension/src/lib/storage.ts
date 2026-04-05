const TOKEN_KEY = 'auth_token'
const LAST_REPO_KEY = 'last_repo'
const PENDING_AUTH_KEY = 'pending_auth'

export interface PendingAuth {
  state: string
  rememberMe: boolean
}

export interface StoredRepo {
  id: number
  owner: string
  name: string
  fullName: string
  private: boolean
}

export async function getToken(): Promise<string | null> {
  // Prefer session storage (non-persistent), fall back to local (persistent/remember-me)
  const session = await chrome.storage.session.get(TOKEN_KEY)
  if (session[TOKEN_KEY]) return session[TOKEN_KEY] as string

  const local = await chrome.storage.local.get(TOKEN_KEY)
  return (local[TOKEN_KEY] as string | undefined) ?? null
}

export async function setToken(token: string, remember: boolean): Promise<void> {
  if (remember) {
    await chrome.storage.local.set({ [TOKEN_KEY]: token })
  } else {
    await chrome.storage.session.set({ [TOKEN_KEY]: token })
  }
}

export async function clearToken(): Promise<void> {
  await Promise.all([
    chrome.storage.local.remove(TOKEN_KEY),
    chrome.storage.session.remove(TOKEN_KEY),
  ])
}

export async function getLastRepo(): Promise<StoredRepo | null> {
  const result = await chrome.storage.sync.get(LAST_REPO_KEY)
  return (result[LAST_REPO_KEY] as StoredRepo | undefined) ?? null
}

export async function setLastRepo(repo: StoredRepo): Promise<void> {
  await chrome.storage.sync.set({ [LAST_REPO_KEY]: repo })
}

export async function getPendingAuth(): Promise<PendingAuth | null> {
  const result = await chrome.storage.session.get(PENDING_AUTH_KEY)
  return (result[PENDING_AUTH_KEY] as PendingAuth | undefined) ?? null
}

export async function setPendingAuth(auth: PendingAuth): Promise<void> {
  await chrome.storage.session.set({ [PENDING_AUTH_KEY]: auth })
}

export async function clearPendingAuth(): Promise<void> {
  await chrome.storage.session.remove(PENDING_AUTH_KEY)
}

const LOCALE_KEY = 'locale'
const THEME_KEY = 'theme'

export async function getLocale(): Promise<string | null> {
  const result = await chrome.storage.local.get(LOCALE_KEY)
  return (result[LOCALE_KEY] as string | undefined) ?? null
}

export async function setLocale(locale: string): Promise<void> {
  await chrome.storage.local.set({ [LOCALE_KEY]: locale })
}

export async function getTheme(): Promise<string | null> {
  const result = await chrome.storage.local.get(THEME_KEY)
  return (result[THEME_KEY] as string | undefined) ?? null
}

export async function setTheme(theme: string): Promise<void> {
  await chrome.storage.local.set({ [THEME_KEY]: theme })
}
