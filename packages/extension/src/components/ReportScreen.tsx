import { useState } from 'react'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react'
import ReactSelect from 'react-select'
import { Camera, ChevronDown, X } from 'lucide-react'
import { useRepos } from '../hooks/useRepos'
import { useLabels } from '../hooks/useLabels'
import { useIssueTypes } from '../hooks/useIssueTypes'
import { useApp } from '../contexts/app'
import { createIssue, uploadScreenshot } from '../lib/github'
import { getBrowserContext, formatContextMarkdown } from '../lib/context'
import type { GitHubRepo, GitHubIssueType, CreatedIssue } from '@github-issue-reporter/shared'

interface Props {
  token: string
  onIssueCreated: (issue: CreatedIssue) => void
}

export function ReportScreen({ token, onIssueCreated }: Props) {
  const { t, theme } = useApp()
  const { repos, selectedRepo, selectRepo, reposLoading, error: reposError } = useRepos(token)
  const { labels, selectedLabels, setSelectedLabels, hasUnavailableLabels } = useLabels(
    token,
    selectedRepo?.owner ?? null,
    selectedRepo?.name ?? null,
  )
  const { issueTypes, selectedIssueType, setSelectedIssueType } = useIssueTypes(
    token,
    selectedRepo?.owner ?? null,
    selectedRepo?.name ?? null,
  )
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [capturing, setCapturing] = useState(false)
  const [includeUrl, setIncludeUrl] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const filteredRepos: GitHubRepo[] = query
    ? repos.filter(r => r.fullName.toLowerCase().includes(query.toLowerCase()))
    : repos

  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  async function handleCapture() {
    setCapturing(true)
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' })
      setScreenshots(prev => [...prev, dataUrl])
    } finally {
      setCapturing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRepo || !title.trim() || submitting) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const ctx = await getBrowserContext()
      const contextBlock = formatContextMarkdown(ctx, includeUrl)

      let screenshotBlock = ''
      if (screenshots.length > 0) {
        const timestamp = Date.now()
        const urls = await Promise.all(
          screenshots.map((dataUrl, i) =>
            uploadScreenshot(token, selectedRepo.owner, selectedRepo.name, dataUrl, `${timestamp}-${i + 1}.png`)
          )
        )
        screenshotBlock = urls.map((url, i) => `![${t.report.screenshot} ${i + 1}](${url})`).join('\n') + '\n\n'
      }

      const fullBody = body.trim()
        ? `${body.trim()}\n\n${screenshotBlock}${contextBlock}`
        : `${screenshotBlock}${contextBlock}`

      const issue = await createIssue(
        token,
        selectedRepo.owner,
        selectedRepo.name,
        title.trim(),
        fullBody,
        selectedLabels.length > 0 ? selectedLabels.map(l => l.name) : undefined,
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

  const labelOptions = labels.map(l => ({ value: l.id, label: l.name, color: l.color }))
  const labelValues = selectedLabels.map(l => ({ value: l.id, label: l.name, color: l.color }))

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 flex-1">
      {/* Repository selector */}
      <div>
        <label htmlFor="report-repo" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <Combobox value={selectedRepo} onChange={(repo: GitHubRepo | null) => { if (repo) selectRepo(repo) }}>
              <div className="relative">
                <ComboboxInput
                  id="report-repo"
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
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
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

      {/* Issue type selector */}
      {issueTypes.length > 0 && (
        <div>
          <label htmlFor="report-issue-type" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t.report.issueTypeLabel}
          </label>
          <select
            id="report-issue-type"
            value={selectedIssueType?.id ?? ''}
            onChange={e => {
              const id = Number(e.target.value)
              setSelectedIssueType(issueTypes.find(type => type.id === id) ?? null)
            }}
            className={inputClass}
          >
            <option value="">{t.report.issueTypePlaceholder}</option>
            {issueTypes.map((type: GitHubIssueType) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="report-title" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t.report.titleLabel} <span className="text-red-500">*</span>
        </label>
        <input
          id="report-title"
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
        <label htmlFor="report-description" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t.report.descriptionLabel}
        </label>
        <textarea
          id="report-description"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={5}
          className={`${inputClass} resize-none`}
          placeholder={t.report.descriptionPlaceholder}
        />
      </div>

      {/* Screenshots */}
      <div>
        {screenshots.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2" role="list" aria-label={t.report.screenshotsLabel}>
            {screenshots.map((dataUrl, i) => (
              <div key={i} className="relative group" role="listitem">
                <img
                  src={dataUrl}
                  alt={`${t.report.screenshot} ${i + 1}`}
                  className="w-20 h-14 object-cover rounded border border-gray-200 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setScreenshots(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label={`${t.report.removeScreenshot} ${i + 1}`}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={handleCapture}
          disabled={capturing}
          className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 border border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 rounded-lg px-3 py-2 w-full justify-center transition-colors"
        >
          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
          {t.report.takeScreenshot}
        </button>
      </div>

      {/* Label picker */}
      {labels.length > 0 && (
        <div>
          <label htmlFor="report-labels" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t.report.labelsLabel}
          </label>
          {hasUnavailableLabels && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
              {t.report.labelsUnavailable}
            </p>
          )}
          <ReactSelect
            inputId="report-labels"
            isMulti
            unstyled
            options={labelOptions}
            value={labelValues}
            onChange={opts => {
              const ids = new Set(opts.map(o => o.value))
              setSelectedLabels(labels.filter(l => ids.has(l.id)))
            }}
            placeholder={t.report.labelsPlaceholder}
            classNames={{
              control: ({ isFocused }) =>
                `border rounded-lg px-2 py-1 text-sm cursor-pointer ${
                  isDark
                    ? `border-gray-700 bg-gray-800 text-white ${isFocused ? 'ring-2 ring-gray-100 border-transparent' : ''}`
                    : `border-gray-200 bg-white text-gray-900 ${isFocused ? 'ring-2 ring-gray-900 border-transparent' : ''}`
                }`,
              placeholder: () => isDark ? 'text-gray-500' : 'text-gray-400',
              menu: () =>
                `mt-1 rounded-lg shadow-lg border text-sm z-10 ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`,
              option: ({ isFocused }) =>
                `px-3 py-2 cursor-pointer ${
                  isFocused
                    ? isDark ? 'bg-gray-700' : 'bg-gray-50'
                    : ''
                } ${isDark ? 'text-white' : 'text-gray-900'}`,
              multiValue: () =>
                `flex items-center gap-1 rounded px-1.5 py-0.5 mr-1 text-xs font-medium ${
                  isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                }`,
              multiValueRemove: () =>
                `hover:opacity-70 ml-0.5 ${isDark ? 'text-gray-300' : 'text-gray-500'}`,
              noOptionsMessage: () => isDark ? 'text-gray-500 px-3 py-2' : 'text-gray-400 px-3 py-2',
            }}
            formatOptionLabel={(opt: { value: number; label: string; color: string }) => (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  aria-hidden="true"
                  style={{ backgroundColor: `#${opt.color}` }}
                />
                {opt.label}
              </span>
            )}
          />
        </div>
      )}

      {/* Context toggle */}
      <label htmlFor="report-include-url" className="flex items-center gap-2 cursor-pointer select-none">
        <input
          id="report-include-url"
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
