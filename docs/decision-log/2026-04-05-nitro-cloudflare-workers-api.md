# Nitro + Cloudflare Workers for the OAuth API

**We've decided to implement the OAuth backend as a Nitro application deployed on Cloudflare Workers.**

- Date: 2026-04-05
- Alternatives Considered: Express on a VPS, Netlify Functions, Vercel Edge Functions, a plain Cloudflare Worker without a framework
- Decision Made By: [Jasper](https://github.com/jbmoelker), [Claude (AI)](https://github.com/claude)

## Decision

A backend is required because browser extensions cannot safely store an OAuth client secret — the extension package is distributed to users and can be inspected. The backend acts as a confidential OAuth client that holds the secret and exchanges authorization codes for access tokens.

**Why Cloudflare Workers?**

The OAuth backend is extremely lightweight (three routes, no database) and does not need persistent compute. Cloudflare Workers run at the edge with near-zero cold starts and a generous free tier — ideal for this workload. State between the OAuth start and callback is stored in Cloudflare KV, which Workers can access natively.

**Why Nitro?**

Writing a bare Cloudflare Worker requires adapting to the Workers runtime manually. Nitro is a server framework by the UnJS ecosystem that compiles to multiple targets (Node.js for local dev, `cloudflare-module` for production) without code changes. This means the API can be developed and tested locally as a plain Node.js server and deployed to Workers with `NITRO_PRESET=cloudflare-module`. Nitro also provides `useStorage()` with pluggable drivers, which maps to in-memory storage in dev and Cloudflare KV in production — removing the need for any environment-specific branching in route code.

**Alternatives not chosen:**

- *Express on a VPS*: Requires infrastructure management, no free tier, higher operational overhead.
- *Netlify/Vercel Functions*: Valid choices, but Cloudflare Workers' KV integration is more natural for ephemeral state than attaching an external key-value store.
- *Plain Cloudflare Worker*: Feasible but more boilerplate for routing, and no local dev server without a separate tool.
