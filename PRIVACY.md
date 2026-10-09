# Privacy

CatchUp does not access WhatsApp, Slack, or any website. There are no website host permissions or page content scripts. To summarize WhatsApp messages, the user can select a screenshot or ZIP of exported text through the file picker.

Text extracted from ZIP archives stays in `chrome.storage.local`. The side panel provides per-record deletion and clear-all. Screenshot files and their locally recognized OCR text are held in side panel memory only and are not persisted. ZIP text is imported only after the user selects the archive.

Summaries use local extractive heuristics. Screenshot OCR uses the bundled English Tesseract model. The extension does not send records or images to any server and does not use API keys. No external AI provider permission is requested.
