import type { CapturePayload } from "../shared/types";

const MAX_SCAN = 80;
let timer: number | undefined;
let lastUrl = location.href;

function scan(): CapturePayload[] {
  const nodes = [...document.querySelectorAll<HTMLElement>('[data-qa="message_container"]')].slice(-MAX_SCAN);
  const conversationName = document.querySelector<HTMLElement>('[data-qa="channel_name"]')?.innerText?.trim() || null;
  return nodes.flatMap((node) => {
    const content = node.querySelector<HTMLElement>('[data-qa="message_content"]')?.innerText?.trim().slice(0, 4000);
    if (!content) return [];
    const author = node.querySelector<HTMLElement>('[data-qa="message_sender_name"]')?.innerText?.trim() || null;
    const timeNode = node.querySelector<HTMLTimeElement>("time[datetime]");
    const timestamp = timeNode?.dateTime && !Number.isNaN(Date.parse(timeNode.dateTime)) ? new Date(timeNode.dateTime).toISOString() : null;
    const id = node.getAttribute("data-message-id") || node.querySelector<HTMLElement>("[data-message-id]")?.getAttribute("data-message-id") ||
      [location.pathname, author ?? "", timestamp ?? "", content].join("|").slice(0, 280);
    return [{
      id: `slack:${id}`,
      platform: "slack" as const,
      conversationId: null,
      conversationName,
      senderId: null,
      senderName: author,
      timestamp,
      direction: "unknown" as const,
      content,
      contentType: "text" as const,
      sourceUrl: `${location.origin}${location.pathname}`,
    }];
  });
}

function capture() {
  if (location.origin !== "https://app.slack.com") return;
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
