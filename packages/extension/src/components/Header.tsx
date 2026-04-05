import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import { Globe, Sun, Moon, Contrast, ChevronDown } from 'lucide-react'
import { useApp, type Theme } from '../contexts/app'
import { LOCALES, getLocaleLabel, type LocaleCode } from '../i18n/index'
import type { GitHubUser } from '@github-issue-reporter/shared'

const THEME_ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  auto: Contrast,
}

interface Props {
  user: GitHubUser | null
  onLogout: () => void
}

const menuItemClass =
  'w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 data-[focus]:bg-gray-50 dark:data-[focus]:bg-gray-700 transition-colors'

const menuPanelClass =
  'absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 focus:outline-none py-1 min-w-[8rem]'

export function Header({ user, onLogout }: Props) {
  const { t, locale, setLocale, theme, setTheme } = useApp()

  const ThemeIcon = THEME_ICONS[theme]

  const themeOptions: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: 'light', label: t.settings.themeLight, Icon: Sun },
    { value: 'dark',  label: t.settings.themeDark,  Icon: Moon },
    { value: 'auto',  label: t.settings.themeAuto,  Icon: Contrast },
  ]

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
      {/* Left: avatar menu (authenticated) or spacer */}
      <div>
        {user ? (
          <Menu as="div" className="relative">
            <MenuButton className="flex items-center gap-1.5 rounded-md px-1 py-1 -mx-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <img src={user.avatarUrl} alt={user.login} className="w-6 h-6 rounded-full" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.login}</span>
              <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            </MenuButton>
            <MenuItems className={`${menuPanelClass} left-0`}>
              <MenuItem as="button" onClick={onLogout} className={menuItemClass}>
                {t.report.logout}
              </MenuItem>
            </MenuItems>
          </Menu>
        ) : (
          <div />
        )}
      </div>

      {/* Right: language + theme selectors */}
      <div className="flex items-center gap-0.5">
        {/* Language selector */}
        <Menu as="div" className="relative">
          <MenuButton
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">{t.settings.selectLanguage}</span>
          </MenuButton>
          <MenuItems className={menuPanelClass}>
            {(Object.keys(LOCALES) as LocaleCode[]).map((code) => (
              <MenuItem
                key={code}
                as="button"
                onClick={() => setLocale(code)}
                className={`${menuItemClass} ${locale === code ? 'font-semibold text-gray-900 dark:text-white' : ''}`}
              >
                {getLocaleLabel(code)}
              </MenuItem>
            ))}
          </MenuItems>
        </Menu>

        {/* Theme selector */}
        <Menu as="div" className="relative">
          <MenuButton
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ThemeIcon className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">{t.settings.selectTheme}</span>
          </MenuButton>
          <MenuItems className={menuPanelClass}>
            {themeOptions.map(({ value, label, Icon }) => (
              <MenuItem
                key={value}
                as="button"
                onClick={() => setTheme(value)}
                className={`${menuItemClass} ${theme === value ? 'font-semibold text-gray-900 dark:text-white' : ''}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </MenuItem>
            ))}
          </MenuItems>
        </Menu>
      </div>
    </div>
  )
}
