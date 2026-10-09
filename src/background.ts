import type { CapturePayload, CapturedMessage } from "./shared/types";

const RECORDS_KEY = "capturedMessages";
const MAX_RECORDS = 500;
const MAX_TEXT = 4000;
const allowedOrigins: Record<string, string> = { slack: "https://app.slack.com", whatsapp: "https://web.whatsapp.com" };

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
  chrome.storage.local.remove(["apiKey", "model"]).catch(() => undefined);
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  void handleMessage(message, sender).then(sendResponse).catch(() => sendResponse({ ok: false, error: "Could not save captured content." }));
  return true;
});

async function handleMessage(message: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
  if (!message || typeof message !== "object" || !("type" in message)) return { ok: false, error: "Invalid request." };
  const request = message as { type: string; items?: unknown[]; id?: string };
  if (request.type === "GET_ITEMS") {
    const data = await chrome.storage.local.get(RECORDS_KEY);
    return { ok: true, items: Array.isArray(data[RECORDS_KEY]) ? data[RECORDS_KEY] : [] };
  }
  if (request.type === "CAPTURE_ITEMS") {
    let senderOrigin = "";
    try { senderOrigin = new URL(sender.url ?? "").origin; } catch { /* Missing sender URL is rejected below. */ }
    if (!Object.values(allowedOrigins).includes(senderOrigin) || !Array.isArray(request.items) || request.items.length > 100) return { ok: false, error: "Capture source was not allowed." };
    const data = await chrome.storage.local.get(RECORDS_KEY);
    const current = Array.isArray(data[RECORDS_KEY]) ? data[RECORDS_KEY] as CapturedMessage[] : [];
    const byId = new Map(current.map((item) => [item.id, item]));
    let changed = false;
    for (const input of request.items) {
      if (!isCapturePayload(input, senderOrigin)) continue;
      const capturedAt = new Date().toISOString();
      const content = input.content.trim().slice(0, MAX_TEXT);
      if (!content) continue;
      const contentHash = await digest(content);
      const previous = byId.get(input.id);
      if (previous?.contentHash === contentHash) continue;
      const record: CapturedMessage = {
        ...input,
        content,
        schemaVersion: 1,
        capturedAt,
        accessibilityStatus: "captured_from_accessible_dom",
        unreadStatus: "unknown",
        unreadEvidence: [],
        unreadConfidence: null,
        extractionMethod: "dom",
        contentHash,
      };
      byId.set(record.id, record);
      changed = true;
    }
    const items = [...byId.values()].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)).slice(0, MAX_RECORDS);
    if (changed) await chrome.storage.local.set({ [RECORDS_KEY]: items });
    return { ok: true, items };
  }
  if (request.type === "IMPORT_TEXT_ITEMS") {
    if (sender.id !== chrome.runtime.id || !Array.isArray(request.items) || request.items.length > 60) return { ok: false, error: "File import request was not allowed." };
    const data = await chrome.storage.local.get(RECORDS_KEY);
    const current = Array.isArray(data[RECORDS_KEY]) ? data[RECORDS_KEY] as CapturedMessage[] : [];
    const byId = new Map(current.map((item) => [item.id, item]));
    let totalCharacters = 0;
    for (const raw of request.items) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as { name?: unknown; content?: unknown };
      if (typeof item.name !== "string" || typeof item.content !== "string") continue;
      const name = item.name.replace(/[\\/]/g, "_").slice(0, 180);
      const content = item.content.trim();
      totalCharacters += content.length;
      if (!name || !content || content.length > 4000 || totalCharacters > 60000) continue;
      const contentHash = await digest(content);
      const record: CapturedMessage = {
        schemaVersion: 1,
        id: `import:${await digest(`${name}\n${content}`)}`,
        platform: "file_import",
        conversationId: null,
        conversationName: name,
        senderId: null,
        senderName: "Imported text",
        timestamp: null,
        capturedAt: new Date().toISOString(),
        content,
        contentType: "text",
        direction: "unknown",
        accessibilityStatus: "imported_by_user",
        unreadStatus: "unknown",
        unreadEvidence: [],
        unreadConfidence: null,
        extractionMethod: "file_import",
        sourceUrl: chrome.runtime.getURL("sidepanel.html"),
        contentHash,
      };
      byId.set(record.id, record);
    }
    const items = [...byId.values()].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)).slice(0, MAX_RECORDS);
    await chrome.storage.local.set({ [RECORDS_KEY]: items });
    return { ok: true, items };
  }
  if (request.type === "DELETE_ITEM" && typeof request.id === "string") {
    const data = await chrome.storage.local.get(RECORDS_KEY);
    const items = (Array.isArray(data[RECORDS_KEY]) ? data[RECORDS_KEY] as CapturedMessage[] : []).filter((item) => item.id !== request.id);
    await chrome.storage.local.set({ [RECORDS_KEY]: items });
    return { ok: true, items };
  }
  if (request.type === "CLEAR_ALL") {
    await chrome.storage.local.remove([RECORDS_KEY, "savedSummary"]);
    return { ok: true, items: [] };
  }
  if (request.type === "SAVE_SUMMARY" && "summary" in message && typeof (message as { summary?: unknown }).summary === "string") {
    await chrome.storage.local.set({ savedSummary: (message as { summary: string }).summary.slice(0, 12000) });
    return { ok: true };
  }
  if (request.type === "GET_SUMMARY") return { ok: true, summary: (await chrome.storage.local.get("savedSummary")).savedSummary ?? "" };
  return { ok: false, error: "Unknown request." };
}

function isCapturePayload(value: unknown, senderOrigin: string): value is CapturePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CapturePayload>;
  const optionalString = (x: unknown, max: number) => x === null || x === undefined || (typeof x === "string" && x.length <= max);
  const expectedOrigin = typeof v.platform === "string" ? allowedOrigins[v.platform] : undefined;
  return Boolean(expectedOrigin && expectedOrigin === senderOrigin) && typeof v.id === "string" && v.id.length > 0 && v.id.length <= 300 && typeof v.content === "string" &&
    (v.direction === "incoming" || v.direction === "outgoing" || v.direction === "unknown") &&
    typeof v.sourceUrl === "string" && v.sourceUrl.length <= 2048 && v.sourceUrl.startsWith(`${senderOrigin}/`) &&
    optionalString(v.conversationName, 300) && optionalString(v.senderName, 300) && optionalString(v.senderId, 300) &&
    optionalString(v.timestamp, 100) && optionalString(v.conversationId, 300);
}

async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, "0")).join("");
}
