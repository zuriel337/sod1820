# BOT_READ_NO_SIDE_EFFECT_V1 — Reading is free, side effects are earned

**Task key:** `BOT_READ_NO_SIDE_EFFECT_V1`
**Lineage:** continues `docs/bot-resilient-experience-projection-v1.md` (audit) — `work_log` AFTER `51bcdd62`, ACK `ccdc8f8c`.
**OWNER CHECK:** `EXTEND_EXISTING` — no new Contract/Law/System/Store/Engine/Registry/owner-UI.
**Baseline:** `origin/main = b32ce03dcdf1b285fca2c96f587624f2a924bcc2`
**Release state:** BRANCH ONLY — NOT MERGED · NOT DEPLOYED · NOT LIVE.
**Date:** 2026-09-09

---

## 1. The invariant

> **A bot may READ any public content. The act of reading may not produce a side effect** —
> no activity, no prominence, no recommendation, no journey, no attribution, no progression.
> **The human experience is unchanged, in full.**

This is the implementation of `LOOP-A1` from the audit, widened per ZURIEL's instruction from
"prominence" to *every* side effect that the mere act of reading can trigger.

## 2. The rule that decides which sinks are gated

The repo already had **three deliberate, different bot policies**, and they were not
inconsistent — they were three correct answers to three different situations:

| Sink | Existing policy | Why |
|---|---|---|
| `emit()` → `events` | passes `p_is_bot`; `ingest_event` **drops** the row server-side | the table has `is_bot`, and the owner chose to drop |
| `trackVisit()` → `site_visits` | **marks** (`p_is_bot`), never skips | the table has `is_bot`, and the owner chose the two-meter model: "including bots" vs "humans only" |
| `engagement.js` | hard-gates on `isBot()` with an injectable `isBotFn` | no verdict could be carried |

What was missing was the fourth situation. So the rule this slice implements is a
generalisation of what was already there, not a new idea:

> **A side-effect write that CANNOT carry a bot verdict must not be produced by a bot.
> A write that CAN carry one keeps its existing, owner-decided policy.**

`page_views`, `search_log`, `visitor_events` and the Meta CAPI PageView have **no `is_bot`
column and no place to put one**. Marking is impossible there; the only honest option is not
to write. That is why exactly those four are gated and the others are deliberately untouched.

## 3. What changed

### 3.1 One owner for the bot verdict — `src/lib/botVerdict.js` (new file, moved code)

`isBot()` was moved **character-for-character** out of `src/lib/events.js` into a new
zero-dependency module. Verified: the implementation is character-identical to
`origin/main:src/lib/events.js` (11 non-blank lines, no logic drift).

`events.js` now **re-exports** it, so every existing importer — `journeyGuard.js`,
`engagement.js`, `visits.js` — is completely unchanged.

**Why the move was necessary:** the sinks that need the verdict (`logView`/`logSearch` in
`supabase.js`) sit *below* `events.js` in the import graph — `events.js` imports
`supabase.js`. Importing back would create an ESM cycle, and under a cycle `isBot` can be
`undefined` at call time with some bundlers. The new file therefore **must stay import-free**,
and a guard test enforces that.

This mirrors a pattern the repo already documents: `src/lib/visitorId.js` is the single owner
of `sod_vid` and `tracking.js` merely re-exports it — *"consumption, not ownership."*

`botVerdict.js` also carries the gate itself:

```js
export function sideEffectAllowed(sink) {
  let bot = false;
  try { bot = isBot(); } catch { bot = false; }   // uncertainty → treat as human
  if (bot) { noteSuppressed(sink); return false; }
  return true;
}
```

The name is deliberate. Call sites read as the **rule** ("may this read cause a side effect?"),
not as the **detection** ("is this a bot?").

**It fails open to the human.** If the verdict cannot be computed at all, the visitor is
treated as a person. A broken cookie or a missing `navigator` must never silently stop
counting real people — under-counting humans is a worse failure than counting one bot.

### 3.2 Four sinks gated

| File | Function | Sink | What stops for bots |
|---|---|---|---|
| `src/lib/supabase.js` | `logView()` | `page_views` | view counting |
| `src/lib/supabase.js` | `logSearch()` | `search_log` + `research_items` | Hot Numbers, the heat map, **and personal research-tree progression** |
| `src/lib/tracking.js` | `track()` | `visitor_events` (+ the `events` dual-write) | section activity, **arrival attribution**, arrival source, stream entry, image clicks |
| `src/lib/marketing.js` | `trackMarketingPageview()` | Meta Pixel + CAPI | remarketing/lookalike audience building |

`track()` is the leverage point: `captureArrival()`, `captureArrivalSource()`,
`trackStreamEntry()` and `trackImageClick()` all funnel through it, so one gate closes the
whole read-triggered attribution surface rather than four scattered ones.

### 3.3 One measurement deliberately preserved

`journeyGuard.js` recorded its bot blocks *through* `logView` — which this slice just gated,
so that record would have gone silent and an existing signal would have vanished. The signal
is kept in the one diagnostic channel that writes nothing to the DB
(`noteSuppressed("journey_ai_bot_blocked")`), and the original `logView` call is **left in
place** (a no-op for bots) so that if the policy is ever reversed, the historical measurement
returns on its own without editing that file again.

## 4. What was deliberately NOT changed, and why

- **`trackVisit()` / `site_visits`** — has `is_bot`; the owner's policy is *mark, don't skip*.
  Suppressing it would silently break the "including bots" meter. **Not a bug; a decision.**
- **`emit()` / `events` / `ingest_event` / `traffic_intelligence_law`** — the ANALYTICS owner's.
  Already guarded. Untouched. This slice introduces **no** new telemetry field, subtype or
  read-model, and changes no analytics semantics.
- **GA4 (`analytics.js`)** — the analytics owner's surface; GA has native bot filtering. The
  Meta gate does not touch it: `trackMarketingPageview()` sends only Pixel/CAPI (GA4's
  `page_view` lives in `analytics.js`, and Google Ads counts via its `config`).
- **`ShareActions.jsx` / `share.js` / `propagation.js` / `shareObject.js` / `shareTelemetry.js`** —
  the SHARE workstream's, currently carrying W1 Slice 2 on another branch (`4613b122`).
  Also conceptually out of scope: **a share is a click, not a read.**
- **`middleware.js`, `robots.txt`, `api/sitemap.js`** — edge and indexability policy unchanged.
- **Phrase-page indexability** (Part B of the audit candidate) — still blocked on Human-Gate
  question D2 (the admission threshold). Not smuggled in here.

## 5. Verification

| Check | Result |
|---|---|
| `npm run build` | **PASS** (19.8s) |
| `test/bot-read-no-side-effect.test.mjs` (new) | **PASS** — 8 behavioural groups |
| `test/bot-read-sink-guard.test.mjs` (new) | **PASS** — 7 architectural guards |
| Full suite on this branch | 14 pass / 6 fail |
| Full suite on **pristine `origin/main`** | 12 pass / 6 fail — **the identical 6 files** |
| **New test failures introduced** | **ZERO** |
| `node scripts/check-observability-seo-gate.mjs` (CI gate) | **PASS** — no new gaps, baseline unchanged |
| `isBot()` move | **character-identical** to `origin/main` |
| Existing executable lines modified | **ZERO** — the diff is additions plus one verbatim move |

### End-to-end proof at the real sinks

A temporary harness (not committed) drove the **real** `logView` / `logSearch` / `track`
bodies with a stubbed Supabase client and counted what actually reached the wire:

```
HUMAN (vb=browser)                 →  4 DB writes  page_views.insert, search_log.insert,
                                                   visitor_events.insert, visitor_events.insert
BOT (vb=goodbot, Googlebot UA)     →  0 DB writes  (none)
BOT (no edge cookie, ClaudeBot UA) →  0 DB writes  (none)
```

The fourth human write is the `propagation`/`arrival` event — i.e. **attribution is proven to
survive for humans and to be silenced for bots**, which was the specific requirement.

### False-positive discipline

The behavioural test asserts on **real UA strings observed on this site** in the last 14 days
(`crawl_daily`): Googlebot, Bingbot, ClaudeBot, GPTBot, Baiduspider, facebookexternalhit,
PerplexityBot, HeadlessChrome — all classified as bots; and four real human UAs (iOS Safari,
Windows/macOS/Android Chrome) — none suppressed. It also asserts the edge verdict **outranks
the UA in both directions**: `vb=browser` beats a Googlebot UA (a human whose UA looks odd is
never silenced) and `vb=goodbot` beats an iPhone UA (a headless bot faking a human UA is still
caught).

## 6. What this does NOT claim

- It does **not** stop bots from reading. Nothing was hidden, blocked or cloaked; **same truth
  for everyone** — the audit's invariant I1 holds.
- It does **not** fix the phrase-page indexability gap (audit §5.3 / D3).
- It does **not** close `LOOP-S1` — share anchors still lack `rel="nofollow"`. That is
  `ShareActions.jsx`, owned by the SHARE workstream, handed off in `work_log` `47330c73`.
- It does **not** retroactively clean `search_log`. The 79,327 historical rows are unchanged;
  this is **forward-only**, and no history is rewritten. Whether any backfill or
  reinterpretation is warranted is an ANALYTICS-owner question, not mine.
- A bot that spoofs both `navigator.webdriver` and its UA **and** is classified `browser` at
  the edge will still pass. The edge verdict is the strong layer; this is the same honest
  limitation `journeyGuard.js` already documents.

## 7. Files

**Added:** `src/lib/botVerdict.js` · `test/bot-read-no-side-effect.test.mjs` ·
`test/bot-read-sink-guard.test.mjs` · this document.

**Modified (additions only):** `src/lib/events.js` (isBot moved out, re-exported) ·
`src/lib/supabase.js` (2 gates) · `src/lib/tracking.js` (1 gate) · `src/lib/marketing.js`
(1 gate) · `src/lib/journeyGuard.js` (preserve one measurement).

**Product-code delta: 9 added lines of logic, 4 imports, and one verbatim move.**
