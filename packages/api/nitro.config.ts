import { defineNitroConfig } from 'nitropack/config'

const isCloudflare = process.env.NITRO_PRESET === 'cloudflare-module'

export default defineNitroConfig({
  preset: process.env.NITRO_PRESET || 'node-server',

  runtimeConfig: {
    githubClientId: '',
    githubClientSecret: '',
    apiBaseUrl: `http://localhost:${process.env.PORT ?? 3001}`,
  },

  storage: {
    'oauth-state': isCloudflare
      ? { driver: 'cloudflare-kv-binding', binding: 'GITHUB_ISSUE_REPORTER_OAUTH_STATE_KV' }
      : { driver: 'memory' },
  },

  // Allow the extension (chrome-extension:// origin) to poll for auth state
  routeRules: {
    '/auth/poll': {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    },
  },
})
