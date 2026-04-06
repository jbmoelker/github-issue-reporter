const STORAGE_KEY = 'screenshots'

export interface StoredScreenshot {
  /** Original captured data URL — never mutated. */
  original: string
  /** Flattened annotated result, or null if not yet annotated. */
  annotated: string | null
  /** Fabric.js canvas JSON (without background image) for resuming annotation. */
  fabricJson: object | null
}

export async function getScreenshots(): Promise<StoredScreenshot[]> {
  const result = await chrome.storage.session.get(STORAGE_KEY)
  return (result[STORAGE_KEY] as StoredScreenshot[]) ?? []
}

export async function setScreenshots(screenshots: StoredScreenshot[]): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEY]: screenshots })
}

export async function addScreenshot(original: string): Promise<StoredScreenshot[]> {
  const current = await getScreenshots()
  const next = [...current, { original, annotated: null, fabricJson: null }]
  await setScreenshots(next)
  return next
}

export async function updateScreenshot(
  index: number,
  update: Partial<StoredScreenshot>,
): Promise<void> {
  const current = await getScreenshots()
  if (index < 0 || index >= current.length) return
  const next = current.map((s, i) => (i === index ? { ...s, ...update } : s))
  await setScreenshots(next)
}

export async function removeScreenshot(index: number): Promise<StoredScreenshot[]> {
  const current = await getScreenshots()
  const next = current.filter((_, i) => i !== index)
  await setScreenshots(next)
  return next
}

export async function clearScreenshots(): Promise<void> {
  await chrome.storage.session.remove(STORAGE_KEY)
}
