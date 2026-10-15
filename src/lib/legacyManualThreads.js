// Presentation adapter for already-public, manually curated correspondence.
// It reads the existing text carrier only; it grants no email or publication permission.
export function parseLegacyManualThread(update) {
  if (update?.source !== "admin" || typeof update.text !== "string") return null;
  const text = update.text.replace(/\r\n?/g, "\n").trim();
  const marker = "\n\nדברי הכותבים מתוך ההתכתבות\n\n";
  const at = text.indexOf(marker);
  if (at < 1) return null;
  const title = text.slice(0, at).trim();
  if (title.includes("\n")) return null;
  const parts = text.slice(at + marker.length).split(/\n\n─{5,}\n\n/);
  const messages = [];
  for (const part of parts) {
    const match = part.match(/^([^\n]+) · (\d{2}\.\d{2}\.\d{4})(?: · (\d{2}:\d{2}))?\n([\s\S]+)$/);
    if (!match || !match[4].trim()) return null; // malformed source stays readable as ordinary text
    messages.push({ author: match[1], date: match[2], time: match[3] || "", body: match[4] });
  }
  return messages.length ? { title, messages, count: messages.length } : null;
}
