import { useState, useEffect } from 'react'
import { listWritableRepos } from '../lib/github'
import { getLastRepo, setLastRepo, type StoredRepo } from '../lib/storage'
import type { GitHubRepo } from '@github-issue-reporter/shared'

export interface UseReposReturn {
  repos: GitHubRepo[]
  selectedRepo: GitHubRepo | null
  selectRepo: (repo: GitHubRepo) => Promise<void>
  reposLoading: boolean
  error: string | null
}

export function useRepos(token: string): UseReposReturn {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [reposLoading, setReposLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      // Step 1: show last repo immediately (optimistic)
      const lastRepo = await getLastRepo()
      if (lastRepo) setSelectedRepo(lastRepo)

      // Step 2: load full list, then validate selection
      try {
        const repoList = await listWritableRepos(token)
        setRepos(repoList)

        if (lastRepo) {
          const match = repoList.find(r => r.fullName === lastRepo.fullName)
          if (match) {
            setSelectedRepo(match) // replace optimistic value with fresh data
          } else {
            setSelectedRepo(null)
            setError('repositoryNotAvailable')
          }
        }
      } catch {
        setError('failedToLoadRepos')
      } finally {
        setReposLoading(false)
      }
    }
    load()
  }, [token])

  const selectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo)
    const stored: StoredRepo = {
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      private: repo.private,
    }
    await setLastRepo(stored)
  }

  return { repos, selectedRepo, selectRepo, reposLoading, error }
}
