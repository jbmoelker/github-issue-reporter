#!/usr/bin/env node
/**
 * One-time Cloudflare setup: creates KV namespaces, patches wrangler.toml,
 * then prompts for GitHub OAuth secrets.
 *
 * Prerequisites:
 *   Add CLOUDFLARE_API_TOKEN to packages/api/.env  (see .env.example)
 *   pnpm setup
 */
import { readFileSync, writeFileSync } from 'fs'
import { spawnSync } from 'child_process'

// Load .env into process.env (wrangler also does this, but we need it here for validation)
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([^#\s][^=]*)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* .env is optional */ }

if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error('Error: CLOUDFLARE_API_TOKEN not set. Add it to packages/api/.env first.')
  process.exit(1)
}

function wrangler(args, { interactive = false } = {}) {
  const result = spawnSync('wrangler', args, {
    env: process.env,
    encoding: 'utf8',
    stdio: interactive ? 'inherit' : ['inherit', 'pipe', 'pipe'],
  })
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? '')
    process.exit(result.status ?? 1)
  }
  return (result.stdout ?? '') + (result.stderr ?? '')
}

function createKvNamespace(binding, preview = false) {
  const args = ['kv', 'namespace', 'create', binding, ...(preview ? ['--preview'] : [])]
  console.log(`  $ wrangler ${args.join(' ')}`)
  const out = wrangler(args)
  const match = out.match(/id = "([^"]+)"/)
  if (!match) {
    console.error(`Could not parse KV namespace ID from output:\n${out}`)
    process.exit(1)
  }
  return match[1]
}

// 1. Create KV namespaces
console.log('\nCreating KV namespaces…')
const id = createKvNamespace('GITHUB_ISSUE_REPORTER_OAUTH_STATE_KV')
const previewId = createKvNamespace('GITHUB_ISSUE_REPORTER_OAUTH_STATE_KV', true)
console.log(`  id:         ${id}`)
console.log(`  preview_id: ${previewId}`)

// 2. Patch wrangler.toml
let toml = readFileSync('wrangler.toml', 'utf8')
toml = toml
  .replace('replace-with-your-kv-namespace-id', id)
  .replace('replace-with-your-preview-kv-namespace-id', previewId)
writeFileSync('wrangler.toml', toml)
console.log('\nUpdated wrangler.toml ✓')

// 3. Set GitHub OAuth secrets
console.log('\nSetting GitHub OAuth secrets (you will be prompted for each value)…')
wrangler(['secret', 'put', 'NITRO_GITHUB_CLIENT_ID'], { interactive: true })
wrangler(['secret', 'put', 'NITRO_GITHUB_CLIENT_SECRET'], { interactive: true })

console.log(`
Done! One manual step remains:

  Open wrangler.toml and uncomment + fill in the [vars] section:

    [vars]
    NITRO_API_BASE_URL = "https://github-issue-reporter-api.<your-subdomain>.workers.dev"

  Your subdomain is visible at: https://dash.cloudflare.com → Workers & Pages → Overview

  Then deploy with:  pnpm deploy
`)
