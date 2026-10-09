# Privacy

CatchUp scans rendered message text on the supported Slack and WhatsApp Web origins only. It does not read cookies, credentials, raw HTML, or unrelated pages. Page adapters can only see content currently exposed by the site DOM; they cannot guarantee a complete inbox or unread-message view.

Captured chat messages and text extracted from ZIP archives stay in `chrome.storage.local`. The side panel provides per-record deletion and clear-all. Screenshot files and their locally recognized OCR text are held in side panel memory only and are not persisted. ZIP text is imported only after the user selects the archive.

Summaries use local extractive heuristics. Screenshot OCR uses the bundled English Tesseract model. The extension does not send records or images to any server and does not use API keys. No external AI provider permission is requested.
