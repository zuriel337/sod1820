// Pure selection for the calculator's "equals" preview — no network, no Supabase import.
// Input rows are already verified same-method matches (see collectVerifiedLookupMatches).
// Truth boundary: this is "same value in the same method" only. It is not interpretation, not a
// relation claim and not independent evidence; anagrams of the typed expression are excluded because
// under order-insensitive methods they are equal by construction, not discoveries.

const FINAL_TO_REGULAR = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

export function hebrewLetterKey(text) {
  return String(text ?? "")
    .replace(/[^א-ת]/g, "")
    .replace(/[ךםןףץ]/g, (ch) => FINAL_TO_REGULAR[ch] || ch)
    .split("")
    .sort()
    .join("");
}

const wordCount = (text) => String(text ?? "").trim().split(/\s+/).filter(Boolean).length;

export function pickEqualsPreview(matches, { expression, limit = 3 } = {}) {
  const typed = String(expression ?? "").trim();
  const typedKey = hebrewLetterKey(typed);
  const candidates = (Array.isArray(matches) ? matches : []).filter((item) => {
    if (!item?.phrase || item.current || item.phrase === typed) return false;
    return !(typedKey && hebrewLetterKey(item.phrase) === typedKey);
  });
  const rank = (item) => (item.leadRank != null && Number.isFinite(Number(item.leadRank)) ? Number(item.leadRank) : 999999);
  const sorted = [...candidates].sort((a, b) => (
    rank(a) - rank(b)
    || wordCount(b.phrase) - wordCount(a.phrase)
    || String(a.phrase).localeCompare(String(b.phrase), "he")
  ));
  const max = Math.max(0, Number(limit) || 0);
  return { items: sorted.slice(0, max), total: sorted.length };
}
