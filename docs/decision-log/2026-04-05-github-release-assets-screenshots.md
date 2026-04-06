# GitHub Release Assets for Screenshot Uploads

**We've decided to upload screenshots to a GitHub Release asset rather than committing them to the repository via the Contents API.**

- Date: 2026-04-05
- Alternatives Considered: GitHub Contents API (git commits), external image hosts (Imgur, Cloudinary), base64 inline in issue body
- Decision Made By: [Jasper](https://github.com/jbmoelker), [Claude (AI)](https://github.com/claude)

## Decision

Issue screenshots need to be publicly accessible URLs so that GitHub can render them inline in the issue body. The options are:

**GitHub Contents API (not chosen)**

The natural first instinct is to commit the image file to the repository. This fails in practice on repositories that have branch protection rules or rulesets that block direct pushes to the default branch — a common configuration for any team repository. The API returns `403 Resource not accessible by integration`, and the only workaround is to ask repository owners to disable their branch protection, which is unacceptable.

**External image hosts (not chosen)**

Services like Imgur or Cloudinary would work technically, but they introduce a hard dependency on a third-party service and require the extension to hold additional credentials or API keys. Images could disappear if the service changes its policy. It also raises privacy questions for screenshots of internal tools.

**Base64 inline (not chosen)**

Embedding screenshots as base64 data URIs in the Markdown body avoids hosting entirely, but GitHub strips `<img>` tags with data URIs for security reasons. The images would not render.

**GitHub Release Assets (chosen)**

GitHub provides a separate upload endpoint (`uploads.github.com`) for attaching binary assets to a GitHub Release. This endpoint is not subject to branch protection rules — it does not create git commits. We create a single pre-release tagged `issue-screenshots` per repository (hidden from the main releases page) and upload screenshots as named assets to it. The returned `browser_download_url` is a stable, publicly accessible GitHub URL that renders correctly in issue bodies.

The main trade-off is that screenshots accumulate in the release over time. This is acceptable for now — the release is clearly labelled as a storage bucket, not a real release, and repository administrators can clean it up manually if needed.

Note: Octokit's built-in upload helper is unreliable in browser/extension environments for binary data, so uploads are made with a direct `fetch()` call to `uploads.github.com`.
