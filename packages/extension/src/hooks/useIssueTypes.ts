import { useState, useEffect } from 'react'
import { listIssueTypes } from '../lib/github'
import type { GitHubIssueType } from '@github-issue-reporter/shared'

export function useIssueTypes(token: string, owner: string | null, repo: string | null) {
  const [issueTypes, setIssueTypes] = useState<GitHubIssueType[]>([])
  const [selectedIssueType, setSelectedIssueType] = useState<GitHubIssueType | null>(null)

  useEffect(() => {
    if (!owner || !repo) {
      setIssueTypes([])
      setSelectedIssueType(null)
      return
    }
    let cancelled = false
    listIssueTypes(token, owner, repo).then(types => {
      if (cancelled) return
      setIssueTypes(types)
      setSelectedIssueType(prev => {
        if (!prev) return null
        return types.find(t => t.id === prev.id) ?? null
      })
    })
    return () => { cancelled = true }
  }, [token, owner, repo])

  return { issueTypes, selectedIssueType, setSelectedIssueType }
}
