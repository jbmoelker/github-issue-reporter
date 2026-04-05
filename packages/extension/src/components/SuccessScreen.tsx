import { useTranslation } from '../hooks/useTranslation'
import type { CreatedIssue } from '@github-issue-reporter/shared'

interface Props {
  issue: CreatedIssue
  onReset: () => void
}

export function SuccessScreen({ issue, onReset }: Props) {
  const t = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 gap-6 text-center">
      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
        <svg
          className="w-6 h-6 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t.success.title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          #{issue.number} — {issue.title}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.success.openedInTab}</p>
      </div>

      <button
        onClick={onReset}
        className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline underline-offset-2"
      >
        {t.success.reportAnother}
      </button>
    </div>
  )
}
