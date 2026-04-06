# chrome.storage.session as Annotation Data Channel

**We've decided to use `chrome.storage.session` as the data channel between the extension popup and the annotation editor window.**

- Date: 2026-04-05
- Alternatives Considered: `chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`, `BroadcastChannel`, IndexedDB
- Decision Made By: [Jasper](https://github.com/jbmoelker), [Claude (AI)](https://github.com/claude)

## Decision

The annotation editor opens as a separate browser window (`chrome.windows.create` with `type: 'popup'`). When the user finishes annotating and clicks Done, the editor needs to pass the annotated screenshot back to the extension popup. This is a cross-context communication problem between two extension pages.

**`chrome.runtime.sendMessage` (not chosen)**

This works for one-shot messages from the editor back to the popup, but the popup may be closed by the time the user finishes annotating. A closed popup cannot receive messages, so the data would be lost.

**`chrome.tabs.sendMessage` (not chosen)**

Same problem as `sendMessage` — requires the recipient to be open and listening. Not reliable for data transfer to a page that can close and reopen.

**`BroadcastChannel` (not chosen)**

`BroadcastChannel` works across extension pages within the same origin, but subscribers must be open at the time the message is broadcast. Again, a closed popup would miss the message.

**IndexedDB (not chosen)**

IndexedDB would work as persistent storage, but it's significantly more complex to use than `chrome.storage`, requires managing database schema migrations, and is more than needed for ephemeral screenshot data.

**`chrome.storage.session` (chosen)**

`chrome.storage.session` persists for the lifetime of the browser session and is accessible from all extension pages (popup, tab pages, background). Crucially, it is shared memory: the annotation editor writes the updated screenshot to `storage.session`, and the popup reads it — whether it's currently open or not.

The popup listens with `chrome.storage.session.onChanged` to detect when an annotation is written. When the popup is closed and reopened, it reads the current state on mount. This means the data survives popup close/reopen, and the popup is always consistent with the latest annotation state.

Screenshots are stored under a single `screenshots` key as a `StoredScreenshot[]` array, where each entry holds the original data URL, the annotated data URL (or `null`), and the Fabric.js canvas JSON for re-editing. The `fabricJson` persists the full annotation state so the user can reopen the editor and continue where they left off.

Screenshots are cleared from session storage after a successful issue submission.
