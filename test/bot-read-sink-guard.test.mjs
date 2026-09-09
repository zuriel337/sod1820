// BOT_READ_NO_SIDE_EFFECT_V1 — architectural guard.
//
// The behavioural test proves the gate works. This one proves the gate is actually
// WIRED to every sink that needs it, and that the sinks deliberately left alone are
// still left alone. Without this, a future edit can quietly reopen a write path and
// every behavioural test still passes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

const supabase = read("src/lib/supabase.js");
const tracking = read("src/lib/tracking.js");
const marketing = read("src/lib/marketing.js");
const events = read("src/lib/events.js");
const verdict = read("src/lib/botVerdict.js");
const visits = read("src/lib/visits.js");

// ── 1. One owner for the bot verdict. botVerdict.js must stay import-free, or the
//      supabase.js ↔ events.js cycle it exists to avoid comes straight back.
assert.ok(!/^\s*import\s/m.test(verdict),
  "botVerdict.js must have ZERO imports — it is the cycle-free primitive");
assert.ok(/export\s*\{\s*isBot\s*\}\s*from\s*["']\.\/botVerdict\.js["']/.test(events),
  "events.js must RE-EXPORT isBot from botVerdict.js (one source of truth, existing importers unchanged)");
assert.ok(!/^\s*(export\s+)?function\s+isBot\s*\(/m.test(events),
  "events.js must not define a second isBot — re-export only");
// exactly one regex definition of the bot UA list in src/
assert.equal((verdict.match(/const BOT_UA\s*=/g) || []).length, 1);
assert.ok(!/const BOT_UA\s*=/.test(events),
  "the bot UA list must not be duplicated back into events.js");

// ── 2. Every unclassified sink is gated. These four tables/endpoints have NO
//      is_bot column, so marking is impossible and suppression is the only option.
const GATED = [
  ["src/lib/supabase.js", supabase, "logView", "page_views"],
  ["src/lib/supabase.js", supabase, "logSearch", "search_log"],
  ["src/lib/tracking.js", tracking, "track", "visitor_events"],
  ["src/lib/marketing.js", marketing, "trackMarketingPageview", "meta_capi_pageview"],
];
for (const [file, src, fn, sink] of GATED) {
  const start = src.indexOf(`function ${fn}(`);
  assert.ok(start > -1, `${file}: ${fn}() not found`);
  const head = src.slice(start, start + 1400);
  assert.ok(head.includes(`sideEffectAllowed("${sink}")`),
    `${file}: ${fn}() must gate on sideEffectAllowed("${sink}") before writing`);
  assert.ok(/import \{[^}]*sideEffectAllowed[^}]*\} from "\.\/botVerdict\.js"/.test(src),
    `${file}: must import the gate from the canonical primitive`);
}

// ── 3. The gate must run BEFORE the write, not after it. (A gate placed below the
//      insert would pass test 2 and still write every bot row.)
for (const [file, src, fn, sink] of GATED) {
  const start = src.indexOf(`function ${fn}(`);
  const body = src.slice(start, start + 3000);
  const gateAt = body.indexOf(`sideEffectAllowed("${sink}")`);
  const writeAt = Math.min(...[
    body.indexOf(".insert("), body.indexOf(".rpc("), body.indexOf("sendCAPI("), body.indexOf("window.fbq"),
  ].filter(i => i > -1).concat([Infinity]));
  assert.ok(writeAt !== Infinity, `${file}: ${fn}() — no write found to order against`);
  assert.ok(gateAt > -1 && gateAt < writeAt,
    `${file}: ${fn}() — the gate must precede the first write (gate@${gateAt}, write@${writeAt})`);
}

// ── 4. Sinks deliberately NOT changed, each for a stated reason. If a later slice
//      wants to change one of these, it must consciously edit this test first.
assert.ok(/p_is_bot:\s*bot/.test(visits),
  "trackVisit()/site_visits must keep MARKING bots (it has an is_bot column and a two-meter policy) — not skipping");
assert.ok(!/sideEffectAllowed/.test(visits),
  "visits.js must not be gated: suppressing it would silently break the «including bots» meter");
assert.ok(/p_is_bot:\s*isBot\(\)/.test(events),
  "emit()/events must keep passing p_is_bot — ingest_event already drops bot rows server-side");

// ── 5. GA4 stays with the analytics owner and is untouched by this slice.
const analytics = read("src/lib/analytics.js");
assert.ok(!/sideEffectAllowed|botVerdict/.test(analytics),
  "analytics.js (GA4) is the analytics owner's surface and must not be gated here");

// ── 6. The share production path is the SHARE workstream's. A share is a CLICK,
//      not a read, so this slice must not have reached into it.
for (const p of ["src/components/ShareActions.jsx", "src/lib/share.js", "src/lib/propagation.js"]) {
  let src; try { src = read(p); } catch { continue; }
  assert.ok(!/sideEffectAllowed|botVerdict/.test(src),
    `${p} belongs to the SHARE workstream and must not be edited by this slice`);
}

// ── 7. No second gate. The whole point is one predicate, one owner.
const stray = [supabase, tracking, marketing, events]
  .join("\n")
  .match(/function\s+sideEffectAllowed\s*\(/g);
assert.equal(stray, null, "sideEffectAllowed must be defined only in botVerdict.js");

console.log("bot-read-sink-guard: PASS");
