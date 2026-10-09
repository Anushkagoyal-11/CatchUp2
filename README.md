# CatchUp Universal

CatchUp is a Chrome Manifest V3 extension for catching up on rendered Slack and WhatsApp Web messages, imported text, and screenshots. Summaries use local extractive text matching; screenshot OCR and ZIP extraction also run in the extension. No API key, cloud account, or message upload is used.

## Build and load

Requires Node.js 20 or newer.

```sh
npm ci
npm run typecheck
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the generated `dist/` folder. Open a Slack or WhatsApp Web conversation, then open CatchUp from the extension toolbar. It captures text exposed in the rendered page. Select records and choose **Create local summary**.

## Import a ZIP or screenshot

- ZIPs can contain `.txt`, `.md`, `.csv`, or `.json` files. Text is extracted in the side panel and stored locally as selectable excerpts. Archive size is capped at 10 MB, supported entries at 40, and extracted text at 60,000 characters.
- Screenshots can be PNG, JPG, or WebP. English OCR runs locally using the bundled Tesseract engine and language data. Images and OCR text are kept in the side panel memory only; they are not uploaded or persisted.
- Local summaries identify likely key sentences, action wording, and decision wording. They are extractive heuristics, not an AI model, and can miss context.

## Current scope and limitations

- Slack pages at `app.slack.com` and WhatsApp Web at `web.whatsapp.com`; only rendered message text in the current DOM is inspected.
- Live-site compatibility and screenshot OCR have not yet been manually verified against real accounts/images.
- WhatsApp timestamps are left blank unless a reliable source format is added. Unread status remains unknown.
- Other platform adapters, attachments, hidden/virtualized messages, replies, and message sending are not supported.
- Captured and imported records are bounded to 500 entries and 4,000 characters per record.
- No API keys or cloud AI integration are included. No host access is requested for an AI provider.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for details.
