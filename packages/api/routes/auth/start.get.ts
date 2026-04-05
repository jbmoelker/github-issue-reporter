interface StoredState {
  status: 'pending'
  createdAt: number
}

export default defineEventHandler(async (event) => {
  const { state } = getQuery(event) as { state?: string }

  if (!state || state.length < 16) {
    throw createError({ statusCode: 400, message: 'Invalid state parameter' })
  }

  const storage = useStorage<StoredState>('oauth-state')
  await storage.setItem(state, { status: 'pending', createdAt: Date.now() })

  const config = useRuntimeConfig(event)
  const params = new URLSearchParams({
    client_id: config.githubClientId as string,
    scope: 'repo',
    state,
    redirect_uri: `${config.apiBaseUrl}/auth/callback`,
  })

  return sendRedirect(event, `https://github.com/login/oauth/authorize?${params}`)
})
