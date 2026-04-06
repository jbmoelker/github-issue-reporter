# GitHub Issue Reporter — Extension

The browser extension package. Built with [Plasmo](https://docs.plasmo.com/), React 18, and Tailwind CSS. Targets Chrome MV3 and Firefox MV2.

## Features

- **One-click issue reporting** from any webpage
- **GitHub OAuth login** with optional "remember me" (session vs. persistent token)
- **Repository selector** — searchable dropdown of repositories the user has push access to
- **Issue labels** — multi-select from the repository's configured labels
- **Issue types** — shown when the repository has GitHub issue types configured
- **Screenshot capture** — takes a screenshot of the current tab
- **Screenshot annotation** — opens an annotation editor (separate window) with:
  - Filled rectangles, outlined rectangles, blur rectangles
  - Text, arrows
  - 10-colour palette
  - Undo/redo (Ctrl+Z / Ctrl+Y)
- **Browser context** — automatically appends URL, browser, OS and viewport to the issue body
- **Localisation** — English and Dutch, auto-detected from browser language
- **Theme** — Light, Dark, and Auto (follows system preference)
- **Form persistence** — title, description, labels and screenshots persist per URL across popup open/close until successful submission

## Tech stack

| Layer | Technology |
|-------|-----------|
| Extension framework | [Plasmo](https://docs.plasmo.com/) v0.90 |
| UI | React 18, Tailwind CSS v3 |
| Component library | Headless UI (combobox), React Select (label picker) |
| Icons | Lucide React |
| GitHub API | Octokit REST |
| Canvas annotation | Fabric.js v6 |
| Language | TypeScript |

## Project structure

```
src/
├── popup.tsx              # Extension popup entry point
├── background.ts          # MV3 service worker (minimal)
├── style.css              # Tailwind base styles
├── tabs/
│   └── annotation.tsx     # Full-page annotation editor tab
├── components/
│   ├── Header.tsx         # Theme / locale switcher, user avatar
│   ├── LoginScreen.tsx    # GitHub OAuth login form
│   ├── WaitingScreen.tsx  # Shown while polling for OAuth completion
│   ├── ReportScreen.tsx   # Main issue form
│   ├── AnnotationEditor.tsx # Fabric.js canvas + toolbar
│   └── SuccessScreen.tsx  # Shown after successful issue creation
├── hooks/
│   ├── useAuth.ts         # OAuth flow, session restore, polling
│   ├── useRepos.ts        # Lists writable repos, persists last selection
│   ├── useLabels.ts       # Fetches repo labels
│   ├── useIssueTypes.ts   # Fetches repo issue types (graceful 404 fallback)
│   └── useTranslation.ts  # Locale string lookup
├── contexts/
│   └── app.tsx            # AppProvider: theme + translation context
├── lib/
│   ├── github.ts          # Octokit wrappers + screenshot upload
│   ├── storage.ts         # chrome.storage wrappers (token, repo, locale, theme)
│   ├── screenshots.ts     # chrome.storage.session screenshot management
│   ├── formState.ts       # chrome.storage.local form state per URL
│   └── context.ts         # Browser context capture + Markdown formatting
└── i18n/
    ├── index.ts           # Locale registry + Intl.DisplayNames labels
    ├── en.json            # English strings
    └── nl.json            # Dutch strings
```

## Storage

| Storage area | Key | Contents |
|---|---|---|
| `chrome.storage.session` | `auth_token` | OAuth token (no "remember me") |
| `chrome.storage.local` | `auth_token` | OAuth token ("remember me") |
| `chrome.storage.local` | `pending_auth` | In-progress OAuth state (survives popup close) |
| `chrome.storage.sync` | `last_repo` | Last selected repository (syncs across devices) |
| `chrome.storage.local` | `locale` | User's chosen locale |
| `chrome.storage.local` | `theme` | User's chosen theme |
| `chrome.storage.session` | `screenshots` | Captured screenshots (cleared on submit) |
| `chrome.storage.local` | `formState` | Form state keyed by tab URL (cleared on submit) |

## Local development

### 1. Install dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Set environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
PLASMO_PUBLIC_API_URL=http://localhost:3001
```

The API must be running at this URL. See [`packages/api`](../api/README.md) for setup.

### 3. Start the dev server

```bash
pnpm dev
# or from the monorepo root:
pnpm dev:extension
```

Plasmo opens Chrome with the extension loaded automatically. Changes hot-reload.

### 4. Open the popup

Click the extension icon in the Chrome toolbar. If it's not pinned, find it in the extensions puzzle-piece menu.

## Building for production

```bash
# Chrome (MV3)
pnpm build

# Firefox (MV2)
pnpm build -- --target=firefox-mv2
```

Output lands in `build/chrome-mv3-prod/` (or `firefox-mv2-prod/`).

## Deployment

### Chrome Web Store

1. Build: `pnpm build`
2. Zip the `build/chrome-mv3-prod/` directory
3. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Firefox Add-ons (AMO)

1. Build: `pnpm build -- --target=firefox-mv2`
2. Zip the `build/firefox-mv2-prod/` directory
3. Upload to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)

### Loading unpacked (for testing)

1. Build: `pnpm build`
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select `build/chrome-mv3-prod/`

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PLASMO_PUBLIC_API_URL` | Yes | Base URL of the OAuth API (e.g. `https://your-api.workers.dev`) |
