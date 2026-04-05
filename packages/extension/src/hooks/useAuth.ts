import { useState, useEffect, useRef, useCallback } from 'react'
import * as storage from '../lib/storage'
import { getUser } from '../lib/github'
import type { GitHubUser } from '@github-issue-reporter/shared'

const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export type AuthStatus = 'loading' | 'idle' | 'waiting' | 'authenticated' | 'error'

export interface UseAuthReturn {
  status: AuthStatus
  token: string | null
  user: GitHubUser | null
  error: string | null
  startLogin: (rememberMe: boolean) => Promise<void>
  cancelLogin: () => Promise<void>
  logout: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartRef = useRef<number>(0)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const authenticate = useCallback(
    async (authToken: string, rememberMe: boolean) => {
      const userData = await getUser(authToken)
      await storage.setToken(authToken, rememberMe)
      await storage.clearPendingAuth()
      setToken(authToken)
      setUser(userData)
      setStatus('authenticated')
    },
    [],
  )

  const startPolling = useCallback(
    (state: string, rememberMe: boolean) => {
      pollStartRef.current = Date.now()
      setStatus('waiting')

      intervalRef.current = setInterval(async () => {
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
          stopPolling()
          await storage.clearPendingAuth()
          setError('Login timed out. Please try again.')
          setStatus('idle')
          return
        }

        try {
          const res = await fetch(
            `${API_URL}/auth/poll?state=${encodeURIComponent(state)}`,
          )

          if (res.status === 200) {
            stopPolling()
            const { token: authToken } = (await res.json()) as { token: string }
            await authenticate(authToken, rememberMe)
          } else if (res.status === 410) {
            stopPolling()
            await storage.clearPendingAuth()
            setError('Login expired. Please try again.')
            setStatus('idle')
          }
          // 202 = still pending, keep polling
        } catch {
          // Network error — keep polling, will time out if persistent
        }
      }, POLL_INTERVAL_MS)
    },
    [stopPolling, authenticate],
  )

  // On mount: restore session or resume pending OAuth
  useEffect(() => {
    async function init() {
      const existingToken = await storage.getToken()
      if (existingToken) {
        try {
          const userData = await getUser(existingToken)
          setToken(existingToken)
          setUser(userData)
          setStatus('authenticated')
          return
        } catch {
          // Token invalid or expired
          await storage.clearToken()
        }
      }

      // Resume polling if popup was closed mid-OAuth
      const pending = await storage.getPendingAuth()
      if (pending) {
        startPolling(pending.state, pending.rememberMe)
        return
      }

      setStatus('idle')
    }

    init()
    return () => stopPolling()
  }, [startPolling, stopPolling])

  const startLogin = useCallback(
    async (rememberMe: boolean) => {
      const state = crypto.randomUUID()
      await storage.setPendingAuth({ state, rememberMe })
      await chrome.tabs.create({
        url: `${API_URL}/auth/start?state=${encodeURIComponent(state)}`,
      })
      startPolling(state, rememberMe)
    },
    [startPolling],
  )

  const cancelLogin = useCallback(async () => {
    stopPolling()
    await storage.clearPendingAuth()
    setStatus('idle')
  }, [stopPolling])

  const logout = useCallback(async () => {
    stopPolling()
    await storage.clearToken()
    setToken(null)
    setUser(null)
    setStatus('idle')
  }, [stopPolling])

  return { status, token, user, error, startLogin, cancelLogin, logout }
}
