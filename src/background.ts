import type { CapturePayload, CapturedMessage } from "./shared/types";

const RECORDS_KEY = "capturedMessages";
const MAX_RECORDS = 500;
const MAX_TEXT = 4000;
const allowedOrigin = "https://app.slack.com";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
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
    if (senderOrigin !== allowedOrigin || !Array.isArray(request.items) || request.items.length > 100) return { ok: false, error: "Capture source was not allowed." };
    const data = await chrome.storage.local.get(RECORDS_KEY);
    const current = Array.isArray(data[RECORDS_KEY]) ? data[RECORDS_KEY] as CapturedMessage[] : [];
    const byId = new Map(current.map((item) => [item.id, item]));
    for (const input of request.items) {
      if (!isCapturePayload(input)) continue;
      const capturedAt = new Date().toISOString();
      const content = input.content.trim().slice(0, MAX_TEXT);
      if (!content) continue;
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
        contentHash: await digest(content),
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
  if (request.type === "GET_SETTINGS") return { ok: true, settings: await chrome.storage.local.get(["apiKey", "model"]) };
  if (request.type === "SAVE_SETTINGS") {
    if (!request || !("settings" in message) || typeof (message as { settings?: unknown }).settings !== "object") return { ok: false, error: "Invalid settings." };
    const settings = (message as { settings: Record<string, unknown> }).settings;
    const clean: Record<string, string> = {};
    if (typeof settings.apiKey === "string" && settings.apiKey.length <= 256) clean.apiKey = settings.apiKey.trim();
    if (typeof settings.model === "string" && settings.model.length <= 100) clean.model = settings.model.trim();
    await chrome.storage.local.set(clean);
    return { ok: true };
  }
  if (request.type === "SAVE_SUMMARY" && "summary" in message && typeof (message as { summary?: unknown }).summary === "string") {
    await chrome.storage.local.set({ savedSummary: (message as { summary: string }).summary.slice(0, 12000) });
    return { ok: true };
  }
  if (request.type === "GET_SUMMARY") return { ok: true, summary: (await chrome.storage.local.get("savedSummary")).savedSummary ?? "" };
  return { ok: false, error: "Unknown request." };
}

function isCapturePayload(value: unknown): value is CapturePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CapturePayload>;
  const optionalString = (x: unknown, max: number) => x === null || x === undefined || (typeof x === "string" && x.length <= max);
  return v.platform === "slack" && typeof v.id === "string" && v.id.length > 0 && v.id.length <= 300 && typeof v.content === "string" &&
    (v.direction === "incoming" || v.direction === "outgoing" || v.direction === "unknown") &&
    typeof v.sourceUrl === "string" && v.sourceUrl.length <= 2048 && v.sourceUrl.startsWith(`${allowedOrigin}/`) &&
    optionalString(v.conversationName, 300) && optionalString(v.senderName, 300) && optionalString(v.senderId, 300) &&
    optionalString(v.timestamp, 100) && optionalString(v.conversationId, 300);
}

async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, "0")).join("");
}
