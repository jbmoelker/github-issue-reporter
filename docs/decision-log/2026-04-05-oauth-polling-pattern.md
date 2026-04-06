# OAuth Polling Pattern

**We've decided to use a server-side polling pattern for completing OAuth, rather than relying on messaging between the extension popup and the OAuth callback tab.**

- Date: 2026-04-05
- Alternatives Considered: Chrome native messaging, `chrome.tabs.onUpdated` listener, `postMessage` between tabs
- Decision Made By: [Jasper](https://github.com/jbmoelker), [Claude (AI)](https://github.com/claude)

## Decision

The standard GitHub OAuth flow ends with a redirect to a callback URL. In a browser extension, the popup cannot directly receive that redirect. The challenge is: how does the popup know when the user has completed login in the tab that was opened for OAuth?

**Option: `chrome.tabs.onUpdated`**

The popup could watch tab URL changes and detect when the callback URL is visited. This is fragile — it requires knowing the exact callback URL pattern and breaks if the tab is closed or navigated before the listener catches it. It also doesn't survive the popup being closed mid-flow.

**Option: `postMessage` / `chrome.runtime.sendMessage`**

The callback page (which we control) could send a message to the extension. This works only while the popup is open. If the user closes the popup while waiting (which is a natural thing to do), the message is lost.

**Option: Polling (chosen)**

The extension generates a random `state` value, stores it in `chrome.storage.session`, opens the OAuth tab, and then polls the API's `/auth/poll?state=...` endpoint every 2 seconds. The API stores the exchanged token in KV under that state key, so the poll returns `{ status: complete, token }` as soon as the OAuth dance finishes. The extension deletes the state after retrieving the token.

This approach has two key advantages:

1. **Survives popup close.** If the user closes the popup while waiting, the pending state (state token + `rememberMe` flag) is persisted in `chrome.storage.session`. When the popup is reopened, it resumes polling automatically.
2. **No reliance on tab messaging.** The callback page just needs to return a success HTML page (and can call `window.close()` to tidy up). No cross-tab communication is needed.

The poll endpoint returns `202 Accepted` while pending, `200 OK` with the token when complete, and `410 Gone` if the state has expired (10-minute TTL). Client-side, polling stops automatically after 5 minutes with a timeout message.
