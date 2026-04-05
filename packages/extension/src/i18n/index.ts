/** Locale metadata. Add an entry here + a matching JSON file to support a new language. */
export const LOCALES = {
  en: { label: 'English' },
  nl: { label: 'Nederlands' },
} as const

export type LocaleCode = keyof typeof LOCALES
