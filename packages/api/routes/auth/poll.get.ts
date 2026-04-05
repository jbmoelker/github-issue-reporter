interface StoredState {
  status: 'pending' | 'complete'
  createdAt: number
  token?: string
}

const EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

export default defineEventHandler(async (event) => {
  // Handle CORS preflight
  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return null
  }

  const { state } = getQuery(event) as { state?: string }

  if (!state) {
    throw createError({ statusCode: 400, message: 'Missing state parameter' })
  }

  const storage = useStorage<StoredState>('oauth-state')
  const stored = await storage.getItem(state)

  if (!stored || Date.now() - stored.createdAt > EXPIRY_MS) {
    if (stored) await storage.removeItem(state)
    setResponseStatus(event, 410)
    return { status: 'expired' }
  }

  if (stored.status === 'pending') {
    setResponseStatus(event, 202)
    return { status: 'pending' }
  }

  // Token is ready — return it and clean up
  await storage.removeItem(state)
  return { status: 'complete', token: stored.token }
})
