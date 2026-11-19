// What a share-card request may ask for, and how long its answer may be kept (ZURIEL 18.11.2026, branch only).
//
// /api/card is a pure function of its query string, drawn by api/card.js from these keys only:
//   n w t sub cap sig v nums format k   (searchParams.get: the FIRST value of a repeated key counts, as it always did; k = kind of card)
// Every producer found — the builders on main (api/og.js, src/lib/thumbResolve.js, src/lib/research/postPreviewUnits2029.js,
// src/lib/research/worldFindingShare.js, src/pages/CommunityCalculatorPage.jsx), every card address added in git history, and the card
// addresses stored in the database (posts, insights, els_records, stories, hint_sets, share_events, visitor_events: only w/sub/cap/sig) — uses
// no other key. Request query strings themselves are not in the logs available to us.
//
// Compatibility first: any other parameter is IGNORED (the picture is the same as without it), never refused, so an old or decorated link
// keeps its image. Values are not refused either: an unknown sig/v/format value draws the default card, exactly as before. The only refusal
// is size: a query over CARD_QUERY_MAX or one text value over CARD_RAW_TEXT_MAX characters (the longest post title is 375 characters, the
// longest published phrase 200; the renderer trims every text to 240 drawable characters anyway). That answer is a tiny 400, no-store,
// before any font, logo, database or render work.
//
// Cache classes (the successful canonical GET only; refusals and errors stay no-store, as before):
//   - "query": the card draws only what its query says (a title, a word, an expression with its value, a unit with its numbers). The same
//     address gives the same picture for as long as the renderer is the same: 7 days at the CDN (+1 day stale while revalidating).
//   - "number": n alone (no w/sub, not a unit) also reads the published phrases equal to n (api/card.js topPhrases): 1 hour, unchanged.
// See docs/reviews/share-card-bignum-20261118/API_CARD_ROOT_CAUSE.md for template/brand changes, removal and privacy.

export const CARD_IMAGE_KEYS = Object.freeze(['n', 'w', 't', 'sub', 'cap', 'sig', 'v', 'nums', 'format', 'k']);
const TEXT_KEYS = ['w', 't', 'sub', 'cap'];
export const CARD_RAW_TEXT_MAX = 2000;
export const CARD_QUERY_MAX = 8192;

export const CARD_CACHE = Object.freeze({
  query: 'public, s-maxage=604800, stale-while-revalidate=86400',
  number: 'public, s-maxage=3600, stale-while-revalidate=86400',
});

/** → { ok: true, cacheClass: "query" | "number", ignored: [keys] } or { ok: false, reason } for an oversized request. */
export function cardRequestPolicy(url) {
  const u = url instanceof URL ? url : new URL(url);
  if (u.search.length > CARD_QUERY_MAX) return { ok: false, reason: 'query too long' };
  const p = u.searchParams;
  for (const key of TEXT_KEYS) {
    const value = p.get(key);
    if (value != null && value.length > CARD_RAW_TEXT_MAX) return { ok: false, reason: `${key} too long` };
  }
  const ignored = [...new Set([...p.keys()].filter((key) => !CARD_IMAGE_KEYS.includes(key)))];
  // Same test as the renderer: a number card is n made of digits, with no w and no sub, and not a unit.
  const numberCard = /^\d+$/.test(p.get('n') || '') && !p.get('w') && !p.get('sub') && p.get('v') !== 'unit';
  return { ok: true, cacheClass: numberCard ? 'number' : 'query', ignored };
}
