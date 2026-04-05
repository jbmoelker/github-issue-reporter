/** Locale metadata. Add an entry here + a matching JSON file to support a new language. */
export const LOCALES = {
  en: {},
  nl: {},
} as const

export type LocaleCode = keyof typeof LOCALES

/** Returns the native display name for a locale code, e.g. 'en' → 'English', 'nl' → 'Nederlands' */
export function getLocaleLabel(code: LocaleCode): string {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
  } catch {
    return code
  }
}
