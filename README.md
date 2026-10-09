# CatchUp Universal

CatchUp is a Chrome Manifest V3 extension for summarizing user-selected chat text and screenshots. Summaries use local extractive text matching; screenshot OCR and ZIP extraction also run in the extension. It requests no access to WhatsApp or other websites, needs no API key, and makes no message uploads.

## Build and load

Requires Node.js 20 or newer.

```sh
npm ci
npm run typecheck
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the generated `dist/` folder. Open CatchUp from the extension toolbar, add a ZIP or screenshot of the chat text, then choose **Create local summary**.

## Import a ZIP or screenshot

- ZIPs can contain `.txt`, `.md`, `.csv`, or `.json` files. Text is extracted in the side panel and stored locally as selectable excerpts. Archive size is capped at 10 MB, supported entries at 40, and extracted text at 60,000 characters.
- Screenshots can be PNG, JPG, or WebP. English OCR runs locally using the bundled Tesseract engine and language data. Images and OCR text are kept in the side panel memory only; they are not uploaded or persisted.
- Local summaries identify likely key sentences, action wording, and decision wording. They are extractive heuristics, not an AI model, and can miss context.

## Current scope and limitations

- WhatsApp Web and other tabs are not read. To summarize WhatsApp messages, provide a screenshot or an archive containing text you exported.
- Screenshot OCR has not yet been manually checked against sample images.
- No automatic chat capture, attachments, hidden/virtualized messages, replies, or message sending.
- Captured and imported records are bounded to 500 entries and 4,000 characters per record.
- No API keys or cloud AI integration are included. The manifest contains no website host permissions or content scripts.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for details.
