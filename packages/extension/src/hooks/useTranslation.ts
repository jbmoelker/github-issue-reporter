import { useApp } from '../contexts/app'

/** Convenience shorthand for useApp().t */
export function useTranslation() {
  return useApp().t
}
