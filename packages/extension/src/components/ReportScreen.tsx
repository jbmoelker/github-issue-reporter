import { useState } from 'react'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react'
import { ChevronDown } from 'lucide-react'
import { useRepos } from '../hooks/useRepos'
import { useApp } from '../contexts/app'
import { createIssue } from '../lib/github'
import { getBrowserContext, formatContextMarkdown } from '../lib/context'
import type { GitHubRepo, CreatedIssue } from '@github-issue-reporter/shared'

interface Props {
  token: string
  onIssueCreated: (issue: CreatedIssue) => void
}

export function ReportScreen({ token, onIssueCreated }: Props) {
  const { t } = useApp()
  const { repos, selectedRepo, selectRepo, reposLoading, error: reposError } = useRepos(token)
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [includeUrl, setIncludeUrl] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const filteredRepos: GitHubRepo[] = query
    ? repos.filter(r => r.fullName.toLowerCase().includes(query.toLowerCase()))
    : repos

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRepo || !title.trim() || submitting) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const ctx = await getBrowserContext()
      const contextBlock = formatContextMarkdown(ctx, includeUrl)
      const fullBody = body.trim()
        ? `${body.trim()}\n\n${contextBlock}`
        : contextBlock

      const issue = await createIssue(
        token,
        selectedRepo.owner,
        selectedRepo.name,
        title.trim(),
        fullBody,
      )

      await chrome.tabs.create({ url: issue.htmlUrl })
      onIssueCreated(issue)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create issue'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 flex-1">
      {/* Repository selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t.report.repositoryLabel} <span className="text-red-500">*</span>
        </label>
        {reposError === 'failedToLoadRepos' ? (
          <p className="text-xs text-red-600 dark:text-red-400">{t.report.repositoryNotAvailable}</p>
        ) : (
          <>
            {reposError === 'repositoryNotAvailable' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                {t.report.repositoryNotAvailable}
              </p>
            )}
            <Combobox value={selectedRepo} onChange={selectRepo}>
              <div className="relative">
                <ComboboxInput
                  className={`${inputClass} pr-8`}
                  displayValue={(repo: GitHubRepo | null) => repo?.fullName ?? ''}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={
                    reposLoading
                      ? t.report.repositoryPlaceholderLoading
                      : t.report.repositoryPlaceholderSearch
                  }
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 dark:text-gray-500">
                  <ChevronDown className="w-4 h-4" />
                </ComboboxButton>
                <ComboboxOptions className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredRepos.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                      {reposLoading
                        ? t.report.repositoryPlaceholderLoading
                        : t.report.repositoryNoResults}
                    </div>
                  ) : (
                    filteredRepos.map(repo => (
                      <ComboboxOption
                        key={repo.id}
                        value={repo}
                        className="px-3 py-2 text-sm cursor-pointer text-gray-900 dark:text-white data-[focus]:bg-gray-50 dark:data-[focus]:bg-gray-700 data-[selected]:font-medium"
                      >
                        {repo.fullName}
                      </ComboboxOption>
                    ))
                  )}
                </ComboboxOptions>
              </div>
            </Combobox>
          </>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t.report.titleLabel} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className={inputClass}
          placeholder={t.report.titlePlaceholder}
        />
      </div>

      {/* Body */}
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t.report.descriptionLabel}
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={5}
          className={`${inputClass} resize-none`}
          placeholder={t.report.descriptionPlaceholder}
        />
      </div>

      {/* Context toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={includeUrl}
          onChange={e => setIncludeUrl(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 focus:ring-gray-900 dark:focus:ring-gray-100"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400">{t.report.includeUrl}</span>
      </label>

      {submitError && <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>}

      <button
        type="submit"
        disabled={!selectedRepo || !title.trim() || submitting}
        className="w-full bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
      >
        {submitting ? t.report.submitting : t.report.submit}
      </button>
    </form>
  )
}
