# Plasmo as Extension Framework

**We've decided to use [Plasmo](https://docs.plasmo.com/) as the browser extension framework instead of hand-rolling a webpack/vite build.**

- Date: 2026-04-05
- Alternatives Considered: Vite + CRXJS plugin, WXT, hand-rolled webpack config
- Decision Made By: [Jasper](https://github.com/jbmoelker), [Claude (AI)](https://github.com/claude)

## Decision

Building a browser extension requires a non-trivial build setup: the manifest must be generated, multiple entry points (popup, background, content scripts, tab pages) must be bundled separately, and hot-reload in development is complex to wire up. Writing this from scratch with plain webpack or Vite would require significant boilerplate maintenance.

Plasmo provides an opinionated framework that handles all of this. It generates `manifest.json` from a convention-based file structure and from `package.json` metadata, supports React JSX out of the box, integrates Tailwind CSS, and gives instant hot-reload in development. Tab pages (used for the annotation editor) are declared simply by placing a file in `src/tabs/`.

**WXT** is a newer alternative with a slightly broader browser-target matrix, but at the time of the decision Plasmo was more mature and better documented for React + TypeScript workflows.

**CRXJS** (Vite plugin) was considered for its pure Vite integration, but it requires more manual manifest authoring and is less actively maintained.

Plasmo's build targets include both `chrome-mv3` and `firefox-mv2`, covering the two primary browser targets without separate build configurations.
