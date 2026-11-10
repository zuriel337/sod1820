# localStorage writers — audit (10.11.2026, base `1f0867ff`)

Read-only audit of every `setItem` in `src/` (grep of the tree at the base). **Nothing was deleted or migrated.** No cipher, draft, saved
research item, identity or permission is touched by this branch.

## Result in one paragraph
Every writer except the research sync runtime is **bounded** (fixed key, or one key per user/day/principal) and **guarded** (a thrown
quota/security error is caught and ignored). One writer is **unbounded**: the research sync runtime creates a new durable pending
journal `…:pending:<id>` on each page load of a signed-in passive user and copies the previous queue into it, so both the key count and
the size of each key grow per visit. That is the strongest candidate for what fills a long-lived browser. It is a **candidate**, measured
in a test harness, **not proven on the owner's device** (the Chrome site-settings size was not provided).

## Writers
| Writer (file) | Keys | Growth | Guarded | Notes |
|---|---|---|---|---|
| Supabase Auth session / PKCE verifier (`publicReadingAuthSession.js`, SDK) | `sb-…-auth-token`, `…-code-verifier` | fixed (2) | **now yes** (resilient storage) | **was the failing path**: unguarded, written before any request |
| Research sync runtime (`research/researchSyncRuntime.js:111-115, 239`) | `<key>`, `<key>:pending:<id>`, `<key>:conflict:<id>` | **unbounded**: +1 journal per page load, each copying the queue (quadratic) | yes (writes) | measured 1→5→9 journals over 4 loads, per-key size 64→2619 chars; 413 snapshot reads vs 0 `apply_ops` in 24 h on production |
| ELS / Tzofen (`TzofenEmbed.jsx`) | `sod_dossier_prompted_v1` + engine keys owned by the embed | fixed | yes | the embed's own caches are outside `src/`; cloud ELS data is 14 rows / ~8 KB |
| Daily visit marker (`AuthContext.jsx:92`) | `ua_visit_<uid>_<date>` | 1 per user per day, never removed (~40 bytes) | yes | bounded by time, negligible (~15 KB per year) |
| Visitor / session ids (`identity.js`, `visitorId.js`, `supabase.js`) | `sod_visitor_id`, `sod_key`, sid + timestamp | fixed | yes | |
| Acquisition (`tracking.js`) | `ACQ_FIRST`, `ACQ_LAST`, `sod_app_installed` | fixed | yes | |
| Referrals (`propagation.js`) | `sod_ref` | fixed | yes | |
| Community (`communityDraft.js`, `communityGuestPost.js`, `communityGuestApi.js`, `communityReadingPosition.js`) | one key per principal | bounded per principal | yes | drafts: not touched |
| Hints (`hints.js`) | one array key | bounded by array | yes | |
| UI preferences (`themePreset2029`, `SystemFrame2029`, `entryLearn2029`, `homeMotion2029`, `HomeHeroMotion2029`, `installOffer2029`, `useGuestNewsletterInvite2029`, `EarlyAccess2029Page`, `Kingdom2029Page`) | one key each | fixed | yes | |
| Recovery guard (`appRecovery2029.js`) | one key | fixed | yes | |
| OAuth preview return (`oauthReturn.js`) | one key | fixed | **now yes** at its only call site (`auth.js`) | was unguarded |

## Why this is not fixed here
Reclaiming the redundant journals (same queue as a newer journal, or already flushed) is lossless in principle and was prototyped, but the
approved contract test *"duplicated tabs own distinct durable pending journals"* requires each tab's journal to stay distinct and durable.
Collecting them contradicts that approved contract, so **it was reverted and nothing was implemented**. Decision needed from ZURIEL:
amend the contract (e.g. one journal per tab *that has a write intent*, reuse the previous journal for passive loads) or keep it and bound
the growth another way. Until then the sign-in no longer depends on it: a full store only means the session is kept for the tab.

## What the product now shows
When localStorage cannot be written the sign-in screen offers a collapsible report: total size and the largest key *shapes* with counts
(`…:pending:<…> ×N`). Names and sizes only; identifiers are masked; values are never read into the report.
