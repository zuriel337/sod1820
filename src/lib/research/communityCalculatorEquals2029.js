// "למי אתם שווים?" — the result a visitor wants to send on (ZURIEL 20.11.2026): the name, its regular value and the published phrases that
// share it. Pure wording and selection only. The phrases are the calculator's own existing list (verified, published, ranked by the existing
// rankBySurprise); nothing is calculated, read or counted here, and no AI is involved.
const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();

export const COMMUNITY_EQUALS_LIMIT = 3;

// The few phrases shown large; the rest stay in the existing "נפגשים באותו מספר" list, without repeating these.
export function communityEqualsSelection(phrases, name, limit = COMMUNITY_EQUALS_LIMIT) {
  const own = clean(name), seen = new Set(), all = [];
  for (const row of Array.isArray(phrases) ? phrases : []) {
    const phrase = clean(row?.phrase);
    if (!phrase || phrase === own || seen.has(phrase)) continue;
    seen.add(phrase); all.push({ ...row, phrase });
  }
  return { top: all.slice(0, limit), rest: all.slice(limit) };
}

// What goes out in a share: the name the visitor typed, its regular value, one published phrase of the same value and an invitation.
// An equality is stated only for the regular method, the one the phrase list is read by.
export function communityEqualsShareText({ name, value, phrase } = {}) {
  const expression = clean(name), peer = clean(phrase);
  if (!expression || !Number.isSafeInteger(Number(value)) || Number(value) < 1) return "";
  return `«${expression}» = ${Number(value)} בגימטריה${peer ? `, כמו «${peer}»` : ""}. ומה השם שלכם שווה?`;
}
