# pnpm Monorepo Structure

**We've decided to structure the project as a pnpm workspace monorepo with three packages: `extension`, `api`, and `shared`.**

- Date: 2026-04-05
- Alternatives Considered: Single repository with no package boundaries, npm workspaces, Turborepo
- Decision Made By: [Jasper](https://github.com/jbmoelker), [Claude (AI)](https://github.com/claude)

## Decision

The project has two deployable artefacts — the browser extension and the OAuth API — that share TypeScript types. Keeping them in a monorepo avoids duplicating type definitions and makes it easy to run both locally in parallel.

**Why a `shared` package?**

The extension and API both need the same TypeScript interfaces (e.g. `AuthPollResponse`, `GitHubUser`, `CreatedIssue`). Rather than copy-pasting types or publishing a separate npm package, a local `@github-issue-reporter/shared` package consumed via `workspace:*` gives type safety across the whole monorepo with zero publish friction.

**Why pnpm?**

pnpm's workspace protocol (`workspace:*`) is ergonomic, its hoisting behaviour reduces disk usage, and its lockfile is deterministic. The `--filter` flag makes it easy to run scripts in a single package from the root.

**Why not Turborepo?**

Turborepo adds build caching and parallelism, which matters for large monorepos. This project has three small packages and a simple build graph (shared → extension, shared → api). The overhead of configuring Turborepo pipelines is not justified at this scale. Plain pnpm workspace scripts are sufficient.
