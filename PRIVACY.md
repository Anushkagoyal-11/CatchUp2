# Privacy

CatchUp currently has a single Slack DOM adapter. It reads message text, visible sender/conversation labels, and an exposed timestamp from accessible rendered nodes on `https://app.slack.com/`. It does not read cookies, credentials, raw HTML, or unrelated sites. The app cannot guarantee that it sees every message or unread item.

Captured records, settings, and summaries are stored in `chrome.storage.local` on this browser. The side panel offers per-message deletion and clear-all. A saved API key can be removed separately in Settings.

Cloud summarization is optional. A user must select records and confirm a disclosure before a request. The selected message text and associated labels, timestamps, and IDs are sent to OpenAI over HTTPS using the configured key. No request is sent during capture. CatchUp does not log message content or API keys. The extension stores returned summaries locally.

The API key is stored in Chrome extension storage, not in a dedicated encrypted secrets manager. Use a revocable key and remove it from Settings when no longer needed.
