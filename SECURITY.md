# Security notes

- Manifest V3 requests only `storage` and `sidePanel` permissions. Host access is limited to Slack and WhatsApp Web.
- ZIP imports are user-initiated, size-bounded, and limited to plain text, Markdown, CSV, and JSON entries. Extracted text is rendered as text.
- Screenshot OCR runs with packaged extension code, WASM, and English trained data. No remote worker script or OCR service is used.
- Runtime capture messages are checked against the source origin and bounded record shape, count, and text length.
- Captured content is untrusted input. The local summarizer only selects original sentences and does not execute instructions or perform actions.
- No API keys, cloud AI requests, remote scripts, dynamic code execution, cookies, or automatic uploads.

Known limitation: website DOM selectors and local extractive summaries are heuristic. Live-site compatibility and OCR quality have not been manually validated against real content.
