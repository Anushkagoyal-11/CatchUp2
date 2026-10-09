import type { CapturedMessage } from "./shared/types";

const RECORDS_KEY = "capturedMessages";
const MAX_RECORDS = 500;
const MAX_TEXT = 4000;

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
      if (!name || !content || content.length > MAX_TEXT || totalCharacters > 60000) continue;
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

async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, "0")).join("");
}
