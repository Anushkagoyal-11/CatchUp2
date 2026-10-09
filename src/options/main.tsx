import { createRoot } from "react-dom/client";
import "./style.css";

function Settings() {
  return <main>
    <header><span className="mark">C</span><div><h1>CatchUp settings</h1><p>Local processing and platform access.</p></div></header>
    <section><h2>On-device summaries</h2><p>CatchUp extracts ZIP text, reads screenshots with bundled English OCR, and builds extractive summaries locally. It does not need an API key, does not send messages to a cloud model, and does not request access to unrelated websites.</p></section>
    <section><h2>Current capture sources</h2><p>Slack and WhatsApp Web pages are scanned for rendered message text only. The extension cannot guarantee access to every conversation or message. DOM selectors may stop working when a website changes its layout.</p><p>Supported ZIP text files: TXT, Markdown, CSV, and JSON. Supported screenshots: PNG, JPG, and WebP. Screenshot text is OCR-processed on this device and is not stored as an image.</p></section>
    <section><h2>Data controls</h2><p>Captured messages, imported text, and summaries stay in Chrome extension storage. Use <strong>Delete all</strong> in the side panel to remove stored messages and summaries. Screenshot images and OCR text remain only in the open side panel until it is closed or cleared.</p></section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Settings/>);
