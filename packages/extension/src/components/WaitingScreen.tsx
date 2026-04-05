import { useTranslation } from '../hooks/useTranslation'

interface Props {
  onCancel: () => void
}

export function WaitingScreen({ onCancel }: Props) {
  const t = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 gap-6 text-center">
      <div className="w-10 h-10 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t.waiting.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t.waiting.subtitle}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2"
      >
        {t.waiting.cancel}
      </button>
    </div>
  )
}
