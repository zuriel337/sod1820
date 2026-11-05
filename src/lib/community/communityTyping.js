// "Someone is typing": ephemeral broadcast only. Nothing is stored. A signed-in
// member sends the public display name they already show in the community; a
// guest sends nothing and appears as "אנונימי". Each tab has a random key.
export const TYPING_TTL_MS = 6000;
export const TYPING_SEND_EVERY_MS = 3000;
export const TYPING_MAX_KEYS = 50;
export const TYPING_NAME_MAX = 40;

export function cleanTypingName(value) {
  if (typeof value !== "string") return null;
  const name = value.replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, "").replace(/\s+/g, " ").trim().slice(0, TYPING_NAME_MAX);
  return name || null;
}

export function createTypingTracker() {
  const seen = new Map();
  const prune = now => { for (const [key, entry] of seen) if (entry.until <= now) seen.delete(key); };
  return {
    mark(key, name = null, now = Date.now()) {
      if (typeof key !== "string" || key.length < 8 || key.length > 64) return;
      prune(now);
      if (!seen.has(key) && seen.size >= TYPING_MAX_KEYS) return;
      seen.set(key, { until: now + TYPING_TTL_MS, name: cleanTypingName(name) });
    },
    // One entry per person: the same name in several tabs counts once; every
    // anonymous tab is a separate anonymous person.
    people(now = Date.now()) {
      prune(now);
      const names = new Set(); let anonymous = 0;
      for (const { name } of seen.values()) { if (name) names.add(name); else anonymous++; }
      return { names: [...names], anonymous };
    },
    count(now = Date.now()) { const { names, anonymous } = this.people(now); return names.length + anonymous; },
    clear() { seen.clear(); },
  };
}
export function shouldSendTyping(lastSentAt, now = Date.now()) { return !lastSentAt || now - lastSentAt >= TYPING_SEND_EVERY_MS; }
export function typingLabel(people) {
  const names = people?.names || [], anonymous = people?.anonymous || 0, total = names.length + anonymous;
  if (!total) return "";
  const anonymousText = anonymous === 1 ? "אנונימי" : `${anonymous} אנונימיים`;
  if (total === 1) return `${names[0] || anonymousText} מקליד…`;
  const shown = names.slice(0, 2);
  if (shown.length < 2 && anonymous) shown.push(anonymousText);
  const covered = shown.reduce((sum, item) => sum + (item === anonymousText ? anonymous : 1), 0);
  const rest = total - covered;
  return `${shown.join(", ")}${rest ? ` ועוד ${rest}` : ""} מקלידים…`;
}
