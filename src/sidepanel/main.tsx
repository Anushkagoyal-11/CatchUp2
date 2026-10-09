import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import JSZip from "jszip";
import { createWorker, OEM } from "tesseract.js";
import type { CapturedMessage } from "../shared/types";
import { makeLocalSummary } from "./local-summary";
import "./style.css";
import "./upload.css";

type Reply<T> = { ok: boolean; items?: T[]; error?: string; summary?: string };
type Screenshot = { file: File; id: string; text?: string; loading: boolean; error?: string };
const ask = <T,>(payload: object) => chrome.runtime.sendMessage(payload) as Promise<Reply<T>>;

function App() {
  const [items, setItems] = useState<CapturedMessage[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [summary, setSummary] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const autoSummaryFingerprint = useRef("");

  const refresh = async () => {
    const [records, saved] = await Promise.all([ask<CapturedMessage>({ type: "GET_ITEMS" }), ask<string>({ type: "GET_SUMMARY" })]);
    setItems(records.items ?? []);
    setSummary(saved.summary ?? "");
  };
  useEffect(() => {
    void refresh();
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => { if (changes.capturedMessages) void refresh(); };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);
  useEffect(() => {
    const whatsapp = items.filter((item) => item.platform === "whatsapp").sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    if (!whatsapp.length) { autoSummaryFingerprint.current = ""; return; }
    const latest = whatsapp[0];
    const conversation = whatsapp.filter((item) => item.conversationName === latest.conversationName && item.sourceUrl === latest.sourceUrl)
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)).slice(-40);
    const fingerprint = conversation.map((item) => `${item.id}:${item.contentHash}`).join("|");
    if (!fingerprint || fingerprint === autoSummaryFingerprint.current) return;
    autoSummaryFingerprint.current = fingerprint;
    const result = `WHATSAPP QUICK CATCH-UP · ${latest.conversationName ?? "current conversation"}\nGenerated locally from visible messages.\n\n${makeLocalSummary(conversation.map((item) => ({ id: item.id, label: item.senderName ?? "WhatsApp message", content: item.content })))}`;
    setSummary(result);
    void ask({ type: "SAVE_SUMMARY", summary: result });
  }, [items]);

  const visible = useMemo(() => items.filter((item) => (filter === "all" || item.conversationName === filter) &&
    `${item.content} ${item.senderName ?? ""} ${item.conversationName ?? ""}`.toLowerCase().includes(query.toLowerCase())), [items, filter, query]);
  const conversations = [...new Set(items.map((item) => item.conversationName).filter((value): value is string => Boolean(value)))];
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const deleteOne = async (id: string) => { await ask({ type: "DELETE_ITEM", id }); setSelected((values) => values.filter((value) => value !== id)); await refresh(); };
  const clear = async () => {
    if (!window.confirm("Delete all captured messages and saved summaries from this browser?")) return;
    await ask({ type: "CLEAR_ALL" }); setSelected([]); setScreenshots([]); await refresh();
  };

  const importZip = async (file?: File) => {
    setImportNotice("");
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setImportNotice("ZIP files must be smaller than 10 MB."); return; }
    setPending(true);
    try {
      const zip = await JSZip.loadAsync(file, { checkCRC32: true });
      const entries = Object.values(zip.files).filter((entry) => !entry.dir);
      if (!entries.length || entries.length > 40) throw new Error("The ZIP must contain 1–40 files.");
      const allowedExtensions = new Set(["txt", "md", "csv", "json"]);
      const supported = entries.filter((entry) => allowedExtensions.has(entry.name.split(".").pop()?.toLowerCase() ?? ""));
      if (!supported.length) throw new Error("No supported text files found. ZIPs can contain .txt, .md, .csv, or .json files.");
      const chunks: Array<{ name: string; content: string }> = [];
      let expandedBytes = 0;
      let totalChars = 0;
      for (const entry of supported) {
        const size = (entry as typeof entry & { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
        expandedBytes += size;
        if (size > 2 * 1024 * 1024 || expandedBytes > 3 * 1024 * 1024) throw new Error("The ZIP contains too much uncompressed data (limit 3 MB total).");
        const body = await entry.async("text");
        const bounded = body.slice(0, Math.max(0, 60000 - totalChars));
        const basename = entry.name.split(/[\\/]/).pop() || "Imported text";
        for (let offset = 0; offset < bounded.length; offset += 3500) {
          chunks.push({ name: `${basename} · part ${Math.floor(offset / 3500) + 1}`, content: bounded.slice(offset, offset + 3500) });
        }
        totalChars += bounded.length;
        if (totalChars >= 60000) break;
      }
      if (!chunks.length) throw new Error("The supported text files were empty.");
      const result = await ask<CapturedMessage>({ type: "IMPORT_TEXT_ITEMS", items: chunks });
      if (!result.ok) throw new Error(result.error || "Could not import ZIP contents.");
      const newIds = await Promise.all(chunks.map(async (chunk) => `import:${await digest(`${chunk.name}\n${chunk.content}`)}`));
      setSelected((current) => [...new Set([...current, ...newIds])]);
      setImportNotice(`Imported ${chunks.length} text excerpt${chunks.length === 1 ? "" : "s"} locally. No API key is needed.`);
      await refresh();
    } catch (error) { setImportNotice(error instanceof Error ? error.message : "Could not read that ZIP file."); }
    finally { setPending(false); }
  };

  const addScreenshots = async (files: FileList | null) => {
    if (!files?.length) return;
    const supportedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    const picked = [...files];
    if (picked.some((file) => !supportedTypes.has(file.type) || file.size > 5 * 1024 * 1024)) {
      setImportNotice("Screenshots must be PNG, JPG, or WebP and no larger than 5 MB each."); return;
    }
    const size = [...screenshots.map((image) => image.file.size), ...picked.map((file) => file.size)].reduce((sum, value) => sum + value, 0);
    if (size > 10 * 1024 * 1024 || screenshots.length + picked.length > 5) {
      setImportNotice("Choose up to 5 screenshots with a combined size under 10 MB."); return;
    }
    setImportNotice("");
    const newImages = picked.map((file) => ({ file, id: `image:${crypto.randomUUID()}`, loading: true }));
    setScreenshots((current) => [...current, ...newImages]);
    setPending(true);
    let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
    try {
      worker = await createWorker("eng", OEM.LSTM_ONLY, {
        workerPath: chrome.runtime.getURL("tesseract/worker.min.js"),
        corePath: chrome.runtime.getURL("tesseract/core/tesseract-core.wasm.js"),
        langPath: chrome.runtime.getURL("tesseract/lang"),
        gzip: true,
        cacheMethod: "none",
        workerBlobURL: false,
      });
      for (const image of newImages) {
        const result = await worker.recognize(image.file);
        const text = result.data.text.trim();
        setScreenshots((current) => current.map((item) => item.id === image.id ? { ...item, text, loading: false, error: text ? undefined : "No text recognized" } : item));
      }
    } catch {
      setScreenshots((current) => current.map((item) => newImages.some((image) => image.id === item.id) ? { ...item, loading: false, error: "Local OCR could not read this image" } : item));
    } finally {
      await worker?.terminate();
      setPending(false);
    }
  };

  const summarize = async () => {
    setPending(true); setNotice("");
    try {
      const chosen = items.filter((item) => selected.includes(item.id));
      const sources = [
        ...chosen.map((item) => ({ id: item.id, label: `${item.platform} · ${item.conversationName ?? "unknown conversation"}`, content: item.content })),
        ...screenshots.filter((image) => image.text?.trim()).map((image) => ({ id: image.id, label: `Screenshot · ${image.file.name}`, content: image.text ?? "" })),
      ];
      if (!sources.length) { setNotice("Select messages, import a ZIP, or add a screenshot with readable text first."); return; }
      const formatted = makeLocalSummary(sources);
      await ask({ type: "SAVE_SUMMARY", summary: formatted }); setSummary(formatted);
    } catch { setNotice("Could not create a local summary."); }
    finally { setPending(false); }
  };

  return <main>
    <header className="topbar"><div className="brand"><span className="mark">C</span><div><strong>CatchUp</strong><small>Private, on-device summaries</small></div></div><button className="icon-button" aria-label="Open settings" title="Settings" onClick={() => chrome.runtime.openOptionsPage()}>⚙</button></header>
    <section className="intro"><div><span className="eyebrow">YOUR CATCH-UP</span><h1>Stay in the loop.</h1><p>Slack and WhatsApp Web messages, ZIP text, and screenshots.</p></div><div className="count"><strong>{items.length}</strong><span>saved</span></div></section>
    <section className="upload-panel"><div className="upload-heading"><strong>Add files to summarize</strong><span>Processed on this device</span></div><div className="upload-actions"><label className="secondary file-button">Add ZIP<input type="file" accept=".zip,application/zip" onChange={(event) => { void importZip(event.target.files?.[0]); event.currentTarget.value = ""; }}/></label><label className="secondary file-button">Add screenshot<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { void addScreenshots(event.target.files); event.currentTarget.value = ""; }}/></label></div>{importNotice && <p className="notice" role="status">{importNotice}</p>}{screenshots.map((image) => <div className="file-chip" key={image.id}><span>{image.file.name} · {image.loading ? "Reading text locally…" : image.error ?? "Text ready"}</span><button className="delete" aria-label={`Remove ${image.file.name}`} onClick={() => setScreenshots((current) => current.filter((item) => item.id !== image.id))}>×</button></div>)}</section>
    <div className="toolbar"><label className="search"><span>⌕</span><input aria-label="Search messages" placeholder="Search captured messages" value={query} onChange={(event) => setQuery(event.target.value)}/></label><select aria-label="Filter conversation" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All conversations</option>{conversations.map((name) => <option key={name}>{name}</option>)}</select></div>
    <div className="selection-row"><span>{selected.length} selected</span><div><button className="text-button" onClick={() => setSelected(visible.map((item) => item.id))}>Select visible</button><button className="text-button" onClick={() => setSelected([])}>Clear selection</button></div></div>
    {!items.length ? <section className="empty"><div className="empty-icon">✳</div><h2>Nothing captured yet</h2><p>Open a Slack or WhatsApp Web conversation. CatchUp saves rendered text locally for review.</p><span>Unread status is not inferred from capture.</span></section> : !visible.length ? <div className="empty compact">No messages match this search.</div> : <section className="list" aria-label="Captured messages">{visible.map((item) => <article className="message" key={item.id}><div className="message-head"><label className="check-label"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} aria-label={`Select message from ${item.senderName ?? "unknown sender"}`}/><span>{platformName(item.platform)}</span></label><button className="delete" aria-label="Delete message" title="Delete message" onClick={() => void deleteOne(item.id)}>×</button></div><div className="meta">{item.conversationName ?? "Unknown conversation"} · {item.senderName ?? "Unknown sender"}<br/>{item.timestamp ? new Date(item.timestamp).toLocaleString() : `${item.accessibilityStatus === "imported_by_user" ? "Imported" : "Captured"} ${new Date(item.capturedAt).toLocaleString()}`}</div><p className="content">{item.content}</p><div className="status"><span className="dot"/>Unread: unknown</div>{item.platform !== "file_import" && <a className="source" href={item.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a>}</article>)}</section>}
    <section className="summary-panel"><div className="section-heading"><div><span className="eyebrow">LOCAL SUMMARY</span><h2>Make sense of your messages</h2></div><span className="ai-tag">No API key</span></div><p className="muted">ZIP extraction, screenshot OCR, and summaries run in this extension on your device. Nothing is uploaded.</p><button className="primary" disabled={pending || (!selected.length && !screenshots.some((image) => image.text))} onClick={() => void summarize()}>{pending ? "Working locally…" : "Create local summary"}</button>{notice && <p className="notice" role="status">{notice}</p>}{summary && <pre className="summary-output">{summary}</pre>}</section>
    <footer><span>On-device processing · Slack + WhatsApp Web</span><button className="text-button danger" onClick={() => void clear()} disabled={!items.length && !summary}>Delete all</button></footer>
  </main>;
}

function platformName(platform: CapturedMessage["platform"]): string {
  return platform === "whatsapp" ? "WhatsApp" : platform === "file_import" ? "ZIP import" : "Slack";
}

async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

createRoot(document.getElementById("root")!).render(<App/>);
