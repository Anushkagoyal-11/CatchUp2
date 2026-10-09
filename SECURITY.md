# Security notes

- Manifest V3 with only `storage` and `sidePanel` extension permissions.
- Host access is limited to Slack's web app and the OpenAI API endpoint used for explicit summaries.
- Runtime capture messages are checked against the Slack sender origin and bounded record shape, count, and text length.
- Captured text is rendered as text, not HTML.
- Message content is untrusted. The summarization prompt explicitly tells the model not to follow content instructions; returned JSON shape and source IDs are checked before display.
- No remote scripts, dynamic code execution, cookies, or automatic AI uploads.

Known limitation: extension storage is not an encrypted secret vault. The Slack DOM selectors are heuristic and may stop matching after site changes. Real-site compatibility has not yet been verified.
