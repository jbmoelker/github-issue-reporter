# GitHub Issue Reporter — API

The OAuth backend. Built with [Nitro](https://nitro.unjs.io/) and deployed on [Cloudflare Workers](https://workers.cloudflare.com/).

The extension cannot store a GitHub OAuth client secret (it would be visible to anyone who installs the extension). This API acts as the confidential OAuth client: it holds the secret, handles the GitHub OAuth dance, and exposes a short-lived polling endpoint so the extension can retrieve the resulting access token.

## OAuth flow

```
Extension                    API                         GitHub
    │                         │                              │
    │── /auth/start?state=X ──►│                              │
    │                         │── redirect ──────────────────►│
    │                         │                              │
    │  (user authorises)      │                              │
    │                         │◄── callback?code=Y&state=X ──│
    │                         │                              │
    │                         │── POST /login/oauth/access_token
    │                         │◄── { access_token }          │
    │                         │                              │
    │◄── poll /auth/poll ──────│                              │
    │    { status: complete,   │                              │
    │      token: "..." }      │                              │
```

1. The extension generates a random `state` token and opens `/auth/start?state=...` in a new tab.
2. The API stores the state as `pending` in KV and redirects to GitHub's OAuth authorisation page.
3. GitHub redirects to `/auth/callback` with a `code` and `state`.
4. The API exchanges the code for an access token (using the client secret) and stores it in KV under the state key.
5. The extension polls `/auth/poll?state=...` every 2 seconds until it gets a `200 { status: complete, token }` response.
6. The extension stores the token locally and discards the state.

State entries expire after 10 minutes. Once the token is retrieved, the KV entry is deleted.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [Nitro](https://nitro.unjs.io/) |
| Runtime | [Cloudflare Workers](https://workers.cloudflare.com/) |
| State storage | [Cloudflare KV](https://developers.cloudflare.com/kv/) (prod) / in-memory (dev) |
| Deployment | [Wrangler](https://developers.cloudflare.com/workers/wrangler/) |
| Language | TypeScript |

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/start` | Stores state, redirects to GitHub OAuth |
| `GET` | `/auth/callback` | Exchanges code for token, stores in KV |
| `GET` | `/auth/poll` | Returns token once ready, or pending/expired |

## Local development

### 1. Create a GitHub OAuth App

Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App** (or your organisation's equivalent).

| Field | Value |
|---|---|
| Application name | GitHub Issue Reporter (dev) |
| Homepage URL | `http://localhost:3001` |
| Authorization callback URL | `http://localhost:3001/auth/callback` |

Copy the **Client ID** and generate a **Client Secret**.

### 2. Set environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
NITRO_GITHUB_CLIENT_ID=your_client_id
NITRO_GITHUB_CLIENT_SECRET=your_client_secret
PORT=3001
```

### 3. Start the dev server

```bash
pnpm dev
# or from the monorepo root:
pnpm dev:api
```

The API runs on `http://localhost:3001`. In dev mode, OAuth state is held in memory (no KV needed).

## Deployment

### Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`wrangler login`)
- A Cloudflare account with Workers enabled

### 1. Create a KV namespace

```bash
wrangler kv namespace create OAUTH_STATE_KV
wrangler kv namespace create OAUTH_STATE_KV --preview
```

Copy the `id` and `preview_id` values into `wrangler.toml`.

### 2. Create a production GitHub OAuth App

Same as the dev app, but set the callback URL to your worker's URL:

```
https://github-issue-reporter-api.<your-subdomain>.workers.dev/auth/callback
```

### 3. Set secrets and vars

```bash
wrangler secret put NITRO_GITHUB_CLIENT_ID
wrangler secret put NITRO_GITHUB_CLIENT_SECRET
```

Set the public base URL in `wrangler.toml` (uncomment and fill in):

```toml
[vars]
NITRO_API_BASE_URL = "https://github-issue-reporter-api.<your-subdomain>.workers.dev"
```

### 4. Build and deploy

```bash
pnpm build
wrangler deploy
```

The build command sets `NITRO_PRESET=cloudflare-module` automatically (see `package.json`).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NITRO_GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID |
| `NITRO_GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `NITRO_API_BASE_URL` | Yes (prod) | Public base URL used to build the OAuth `redirect_uri` |
| `PORT` | No | Dev server port (default: `3001`) |
