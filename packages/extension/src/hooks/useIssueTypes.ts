import { useState, useEffect } from 'react'
import { listIssueTypes } from '../lib/github'
import type { GitHubIssueType } from '@github-issue-reporter/shared'

export function useIssueTypes(token: string, owner: string | null, repo: string | null) {
  const [issueTypes, setIssueTypes] = useState<GitHubIssueType[]>([])
  const [selectedIssueType, setSelectedIssueType] = useState<GitHubIssueType | null>(null)
  const [issueTypesLoading, setIssueTypesLoading] = useState(false)

  useEffect(() => {
    if (!owner || !repo) {
      setIssueTypes([])
      setSelectedIssueType(null)
      setIssueTypesLoading(false)
      return
    }
    let cancelled = false
    setIssueTypesLoading(true)
    listIssueTypes(token, owner, repo).then(types => {
      if (cancelled) return
      setIssueTypes(types)
      setIssueTypesLoading(false)
      setSelectedIssueType(prev => {
        if (!prev) return null
        return types.find(t => t.id === prev.id) ?? null
      })
    })
    return () => { cancelled = true }
  }, [token, owner, repo])

  return { issueTypes, issueTypesLoading, selectedIssueType, setSelectedIssueType }
}
