interface StoredState {
  status: 'pending' | 'complete'
  createdAt: number
  token?: string
}

interface GitHubTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

const EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

export default defineEventHandler(async (event) => {
  const { code, state } = getQuery(event) as { code?: string; state?: string }

  if (!code || !state) {
    throw createError({ statusCode: 400, message: 'Missing code or state' })
  }

  const storage = useStorage<StoredState>('oauth-state')
  const stored = await storage.getItem(state)

  if (!stored || stored.status !== 'pending') {
    throw createError({ statusCode: 400, message: 'Invalid or expired state' })
  }
  if (Date.now() - stored.createdAt > EXPIRY_MS) {
    await storage.removeItem(state)
    throw createError({ statusCode: 400, message: 'State has expired, please try again' })
  }

  const config = useRuntimeConfig(event)
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      code,
      redirect_uri: `${config.apiBaseUrl}/auth/callback`,
    }),
  })

  const data = (await response.json()) as GitHubTokenResponse

  if (data.error || !data.access_token) {
    throw createError({
      statusCode: 400,
      message: data.error_description ?? 'Failed to exchange code for token',
    })
  }

  await storage.setItem(state, {
    status: 'complete',
    createdAt: stored.createdAt,
    token: data.access_token,
  })

  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Login successful – GitHub Issue Reporter</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p style="color:#111;font-size:1rem">Login successful — you can close this tab.</p>
  <script>window.close()</script>
</body>
</html>`
})
