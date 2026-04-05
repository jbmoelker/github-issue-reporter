import { useState, useEffect } from 'react'
import { listLabels } from '../lib/github'
import type { GitHubLabel } from '@github-issue-reporter/shared'

export function useLabels(token: string, owner: string | null, repo: string | null) {
  const [labels, setLabels] = useState<GitHubLabel[]>([])
  const [selectedLabels, setSelectedLabels] = useState<GitHubLabel[]>([])
  const [hasUnavailableLabels, setHasUnavailableLabels] = useState(false)

  useEffect(() => {
    if (!owner || !repo) {
      setLabels([])
      setSelectedLabels([])
      setHasUnavailableLabels(false)
      return
    }
    let cancelled = false
    listLabels(token, owner, repo).then(fetched => {
      if (cancelled) return
      setLabels(fetched)
      // Remove any selected labels that no longer exist in the new repo
      setSelectedLabels(prev => {
        if (prev.length === 0) return prev
        const available = prev.filter(sel => fetched.some(l => l.id === sel.id))
        setHasUnavailableLabels(available.length < prev.length)
        return available
      })
    })
    return () => { cancelled = true }
  }, [token, owner, repo])

  return { labels, selectedLabels, setSelectedLabels, hasUnavailableLabels }
}
