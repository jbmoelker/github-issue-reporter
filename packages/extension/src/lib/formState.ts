const STORAGE_KEY = 'formState'

export interface PersistedForm {
  title: string
  body: string
  includeUrl: boolean
  labelIds: number[]
  issueTypeId: number | null
}

type FormStateMap = Record<string, PersistedForm>

async function getAll(): Promise<FormStateMap> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return result[STORAGE_KEY] ?? {}
}

export async function loadFormState(url: string): Promise<PersistedForm | null> {
  const all = await getAll()
  return all[url] ?? null
}

export async function saveFormState(url: string, state: PersistedForm): Promise<void> {
  const all = await getAll()
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...all, [url]: state } })
}

export async function clearFormState(url: string): Promise<void> {
  const all = await getAll()
  const { [url]: _, ...rest } = all
  await chrome.storage.local.set({ [STORAGE_KEY]: rest })
}
