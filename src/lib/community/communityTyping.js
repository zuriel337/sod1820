// "Someone is typing": ephemeral broadcast only. Nothing is stored and no text,
// name or account is sent; each tab uses a random key that exists in memory.
export const TYPING_TTL_MS = 6000;
export const TYPING_SEND_EVERY_MS = 3000;
export const TYPING_MAX_KEYS = 50;

export function createTypingTracker() {
  const seen = new Map();
  const prune = now => { for (const [key, until] of seen) if (until <= now) seen.delete(key); };
  return {
    mark(key, now = Date.now()) {
      if (typeof key !== "string" || key.length < 8 || key.length > 64) return;
      prune(now);
      if (!seen.has(key) && seen.size >= TYPING_MAX_KEYS) return;
      seen.set(key, now + TYPING_TTL_MS);
    },
    count(now = Date.now()) { prune(now); return seen.size; },
    clear() { seen.clear(); },
  };
}
export function shouldSendTyping(lastSentAt, now = Date.now()) { return !lastSentAt || now - lastSentAt >= TYPING_SEND_EVERY_MS; }
export function typingLabel(count) {
  if (!(count > 0)) return "";
  return count === 1 ? "מישהו מקליד…" : `${count} מקלידים…`;
}
