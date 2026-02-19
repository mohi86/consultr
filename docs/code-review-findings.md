# Code Review Findings

## [P1] Restrict external URL schemes before calling `shell.openExternal`
- **Location:** `electron/main.cjs` (lines ~335-337)
- **Issue:** `setWindowOpenHandler` forwards every requested URL directly to `shell.openExternal(targetUrl)` without validating protocol or host.
- **Why this matters:** Research output is rendered as markdown links from model-generated content. If a report includes a `file:`, `ms-settings:`, or other custom-protocol link, clicking it in the desktop app can trigger arbitrary OS protocol handlers.
- **Recommended fix:** Only allow known-safe schemes (typically `https:` and optionally `http:`) and reject everything else before calling `shell.openExternal`.
