# CatchUp Universal

CatchUp is a Chrome Manifest V3 extension for reviewing accessible communication content in one place. This initial vertical slice supports rendered Slack messages only. It keeps captured text in local Chrome storage, labels unread status as unknown, and never uploads content unless you select messages and confirm the cloud-processing disclosure.

## Build and load

Requires Node.js 20 or newer.

```sh
npm install
npm run typecheck
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the generated `dist/` folder. Click the extension icon to open the side panel. Configure an OpenAI API key in Settings only if you want cloud summaries.

## Current scope

- Slack pages at `app.slack.com`; only rendered message content found in the current DOM is captured.
- Gmail, WhatsApp, Telegram, Discord, Teams, and live-site compatibility have not been implemented or verified.
- No guaranteed unread access. Unread stays unknown.
- No attachments, hidden/virtualized messages, reply/send actions, or remote application backend.
- Captured records are bounded to 500 entries and 4,000 characters per message.
- API keys are stored in Chrome extension storage, which is not a dedicated encrypted secret store.
- Summaries use the OpenAI Chat Completions API after an explicit per-request confirmation. Selected content is transmitted to OpenAI and the resulting summary is stored locally.

## Privacy

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for access and data-handling details.
