# Security notes

- Manifest V3 requests only `storage` and `sidePanel` permissions. It has no host permissions and no content scripts.
- ZIP imports are user-initiated, size-bounded, and limited to plain text, Markdown, CSV, and JSON entries. Extracted text is rendered as text.
- Screenshot OCR runs with packaged extension code, WASM, and English trained data. No remote worker script or OCR service is used.
- Imported records are bounded by item count and text length.
- Captured content is untrusted input. The local summarizer only selects original sentences and does not execute instructions or perform actions.
- No API keys, cloud AI requests, remote scripts, dynamic code execution, cookies, or automatic uploads.

Known limitation: local extractive summaries are heuristic. Screenshot OCR quality has not been manually validated against real images.
