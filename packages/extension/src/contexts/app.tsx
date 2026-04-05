import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getLocale, setLocale as storeLocale, getTheme, setTheme as storeTheme } from '../lib/storage'
import { LOCALES, type LocaleCode } from '../i18n/index'
import en from '../i18n/en.json'
import nl from '../i18n/nl.json'

export type Theme = 'light' | 'dark' | 'auto'
export type Translations = typeof en

const translations: Record<LocaleCode, Translations> = { en, nl }

function detectBrowserLocale(): LocaleCode {
  const lang = navigator.language.split('-')[0].toLowerCase() as LocaleCode
  return lang in LOCALES ? lang : 'en'
}

interface AppContextValue {
  t: Translations
  locale: LocaleCode
  setLocale: (locale: LocaleCode) => Promise<void>
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(detectBrowserLocale)
  const [theme, setThemeState] = useState<Theme>('auto')

  // Restore stored preferences
  useEffect(() => {
    Promise.all([getLocale(), getTheme()]).then(([storedLocale, storedTheme]) => {
      if (storedLocale && storedLocale in LOCALES) setLocaleState(storedLocale as LocaleCode)
      if (storedTheme) setThemeState(storedTheme as Theme)
    })
  }, [])

  // Apply dark class to document based on theme + system preference
  useEffect(() => {
    function apply() {
      const isDark =
        theme === 'dark' ||
        (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', isDark)
    }

    apply()

    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])

  const setLocale = async (next: LocaleCode) => {
    setLocaleState(next)
    await storeLocale(next)
  }

  const setTheme = async (next: Theme) => {
    setThemeState(next)
    await storeTheme(next)
  }

  return (
    <AppContext.Provider value={{ t: translations[locale], locale, setLocale, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
