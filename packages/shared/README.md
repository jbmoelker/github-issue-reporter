# GitHub Issue Reporter — Shared

Shared TypeScript types and Zod validation schemas used by both `packages/extension` and `packages/api`.

## Contents

| File | Description |
|------|-------------|
| `src/types.ts` | TypeScript interfaces (`GitHubUser`, `GitHubRepo`, `GitHubLabel`, `GitHubIssueType`, `BrowserContext`, `CreatedIssue`, `AuthPollResponse`) |
| `src/schemas.ts` | Zod schemas for runtime validation |
| `src/index.ts` | Re-exports everything |

## Usage

```ts
import type { GitHubRepo, CreatedIssue } from '@github-issue-reporter/shared'
```

This package is consumed via pnpm workspace protocol (`workspace:*`) and TypeScript path resolution — no build step required.
