import type { CapturePayload } from "../shared/types";

const MAX_SCAN = 80;
let timer: number | undefined;
let lastUrl = location.href;

function scan(): CapturePayload[] {
  const nodes = [...document.querySelectorAll<HTMLElement>(".message-in, .message-out")].slice(-MAX_SCAN);
  const conversationName = document.querySelector<HTMLElement>('header span[title]')?.getAttribute("title")?.trim() ||
    document.querySelector<HTMLElement>('header span[dir="auto"]')?.innerText?.trim() || null;

  return nodes.flatMap((node) => {
    const contentNodes = [...node.querySelectorAll<HTMLElement>("span.selectable-text")];
    const content = contentNodes.map((part) => part.innerText.trim()).filter(Boolean).join("\n").slice(0, 4000);
    if (!content) return [];

    const preamble = node.querySelector<HTMLElement>("[data-pre-plain-text]")?.getAttribute("data-pre-plain-text") ?? "";
    const senderMatch = preamble.match(/^\[[^\]]+\]\s*(.*?):\s*$/);
    const outgoing = node.classList.contains("message-out");
    const sourceId = node.getAttribute("data-id") || node.querySelector<HTMLElement>("[data-id]")?.getAttribute("data-id");
    const id = sourceId || [location.pathname, preamble, content].join("|").slice(0, 280);

    return [{
      id: `whatsapp:${id}`,
      platform: "whatsapp" as const,
      conversationId: null,
      conversationName,
      senderId: null,
      senderName: outgoing ? "You" : senderMatch?.[1]?.trim() || null,
      timestamp: null,
      direction: outgoing ? "outgoing" as const : "incoming" as const,
      content,
      contentType: "text" as const,
      sourceUrl: `${location.origin}${location.pathname}`,
    }];
  });
}

function capture() {
  if (location.origin !== "https://web.whatsapp.com") return;
  const items = scan();
  if (items.length) chrome.runtime.sendMessage({ type: "CAPTURE_ITEMS", items }, () => void chrome.runtime.lastError);
}

function scheduleCapture() {
  window.clearTimeout(timer);
  timer = window.setTimeout(capture, 700);
}

new MutationObserver(scheduleCapture).observe(document.documentElement, { childList: true, subtree: true });
window.setInterval(() => {
  if (lastUrl !== location.href) { lastUrl = location.href; scheduleCapture(); }
}, 1500);
scheduleCapture();
