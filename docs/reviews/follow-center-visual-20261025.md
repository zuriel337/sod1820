# Follow center 2029 — visual candidate (synthetic fixtures)

Status: IMPLEMENTED / TESTED LOCALLY / BRANCH ONLY. A visual candidate for ZURIEL's acceptance, not a wired feature and not a release.

- Branch `claude/follow-center-visual-20261025` from central `1baf950477e6357dc1f89d87d47db15fd457fb23` (PR #1155 merged). `origin/main` untouched.
- Source: brief `56b041a8` and `docs/reviews/follow-center-consent-foundation-20261025.md` (branch `gpt/follow-center-consent-foundation-20261025`, not merged here). BEFORE `55efa2c5-f988-4028-9ab7-e589937f6419`.
- Authorities: `subscription_funnel_law` v19, Person Foundation v6, Design V2, Owner Index line 71 (presentation = Claude).

## What the candidate shows

One personal update center, as a presentational component over a view model (`src/components/followCenter2029/`). It has no store, sender,
preference writer or second follow button. Entry stays `/2029/me/notifications`; nothing in `UserCenter.jsx`, `WriterPersonal2029Page.jsx`
or `WatchButton` was edited, so the three old stacked panels still render there until GPT wires this view.

| Brief requirement | In the candidate |
| --- | --- |
| One update center | "מה חדש" (updates), "במעקב שלי" (followed, grouped by type), "איך לעדכן אותי" (channels) |
| Why received | One line from `source_topic` only; no source topic = no reason line. Never invented |
| Canonical target and return | "לצפייה בתוכן" carries `returnTo`; only internal paths are linked |
| Followed writers | Link only when the existing resolver supplies one; otherwise an explicit "no single verified public page" note, no guessed link |
| Compact writer follow, distinct from share | The preview renders the real `WatchButton` and `ShareActions` (`force`, because the floating-share placement law hides the inline block on 2029 pages); only their follow reads and `watch_toggle` are answered with fixtures while the flag-gated page is mounted, and the originals are restored on unmount |
| Guest vs registered | Guest: "אימות זהות" is the only next step, no channel chosen. Registered: channels are separate choices |
| Four separate states | Follow · Identity · Channel · Delivery strip; delivery is never claimed |
| Follow / relevance / Raziel | Three labelled inputs; only explicit follow is active, the others read "עוד לא פעיל" |
| Truthful capability | Email, WhatsApp and Push show "לא זמין עדיין"/note from the existing channel metadata; Push becomes "אפשר להפעיל" only when the device reports it. No working switch is manufactured |
| Truthful states | loading ≠ empty; a failed read says "זה לא אומר שאין כלום" with retry; partial read keeps the other section; unfollow shows pending and an unconfirmed failure leaves the row; confirmed removes it |
| Record time | Bilingual Hebrew + Gregorian date (relative time is Home-only per the record-time rule; the old panel used relative time) |
| 2029 icons | Subject kinds and channels use the `NavigationIcon2029` catalogue (personal, number, layers, signal, discovery, posts, conversation, check); no emoji. There is no bell or mail icon in the catalogue, so email uses `posts` and device Push uses `signal`; a dedicated icon would be a catalogue extension for ZURIEL to approve |
| Colour (shared, contract of 25.10.2026) | Colour is resolved once in `src/lib/palette.js` (`resolveTreatment` / `treatmentVars`): semantic purpose (ordinary, action, discovery, secondary, identity) x state (active, unavailable, disabled, loading, unknown) -> foreground, surface, border and line roles of the preset; unavailable/disabled/loading/unknown always win over an active accent. The shared `IconTile2029` consumes it over `NavigationIcon2029` geometry. Follow Center passes purpose and state only: no glyph-name or subject-kind colour table remains (writer and category are not coloured by kind; every followed subject uses the one action treatment). Identity tile = bounded Crown ornament |
| Design V2 | 18px reading, 16px UI, 14px metadata floor, 44px targets, three presets, accent text role, focus ring, reduced motion |

## Shared implementation (adopted Design V2 section, 25.10.2026)

Branch `claude/follow-center-shared-color-20261025` = contract commit `197cbab98` + released source `6144e4b9c` merged once. BEFORE `4bc0ee5a-3a90-4b38-b2b2-5618d8f9f682`.
Tests: `test/icon-treatment-2029.test.mjs` asserts the owner-resolved role per preset, every purpose x state (same purpose active vs unavailable), that glyph or kind inputs do not change the result, and that no consumer stylesheet maps glyph names to colour. The browser test asserts followed subjects share one treatment whatever their kind, the three channels are `unavailable` and use the muted role, the same `signal` glyph is active as a followed stream and unavailable as Push, Push becomes active only when the device reports it, and the real `WatchButton` reaches its confirmed state and `ShareActions` renders its channels with no real write.

**Findings, not changed (Legacy is not mass-restyled):** the canonical `WatchButton` still renders 11.5px and 13.5px text and an emoji bell, i.e. below the Design V2 floors and not a 2029 icon (measured in all presets, widths 320/390/1440; targets are 44px). A 2029 presentation pass for `WatchButton` is a separate decision. `ShareActions` hides itself on 2029 pages by the share placement law, so the preview forces it. No existing writer/community/personal consumer was migrated to `IconTile2029` yet; their existing browser tests were re-run unchanged and still pass.

## Preview and fixtures

Route `/2029/preview/follow-center` exists only in a build with `VITE_FOLLOW_CENTER_PREVIEW=true` (absent from the default build, which I verified).
Every record is a SYNTHETIC fixture and the page states so. It reads and writes nothing. A state switcher shows: registered, guest, first load,
known empty, partial read, unavailable reads, device Push available. The unfollow demo fails once (unconfirmed) and succeeds on retry; it is a simulation.

## Verification (own run)

- `test/follow-center-model-2029.test.mjs`: failed/loading reads are never empty; empty is a ready state; why only from `source_topic`; unsafe links dropped; bilingual time; unresolved writer links not guessed; capability and lifecycle rules.
- `test/follow-center-visual-2029.browser.py` (43 cases, 0 errors, 0 unexpected writes): 7 states, registered and guest in 320/390/1440 × day/parchment/night, others at 390 and dark/1440. Asserts no overflow, no text under 14px, every control at least 44px, 18px body, 16px names, contrast at least 4.5:1 for action text, keyboard reach with a visible focus ring, state truthfulness, the unfollow pending/failed/confirmed flow, mark-all-read, reduced motion.
- `npm run build` (Legacy + 2029), Legacy Production lock, `git diff --check`.
- Captures: `follow-center-visual-evidence-20261025/` (390 and 1440).

## Gaps and limits

1. Not wired: no real reader, mutation, principal scoping or consent path. GPT wires after acceptance. The model's input shape mirrors what the existing owners return (`user_notifications`, notification prefs topics, `publicWriterFollowLinks`, channel metadata).
2. No hosted Preview was verified for the final SHA (this session has no deployment visibility). The Preview needs `VITE_FOLLOW_CENTER_PREVIEW=true`; ask GPT to set it for the Preview deployment only, never for Production.
3. The consent fix on the old save path (PR #1157) is separate and not in this base; the old `mergeChannelsForSave` implicit email default is still present here and is not touched.
4. Writer-page specimen is static. Digest/email/WhatsApp, relevance and Raziel producers are shown as not active, not designed as live features.
5. Subscription and credits remain open: no slot reserved, nothing built.

## WatchButton 2029 presentation and canonical controls (branch `claude/follow-center-2029-controls-20261025`)

Base: PR #1159 head `863d27572` (contains the shared treatment `86977fabd`). BEFORE `b77ee2e4-17bf-41ff-8792-7cc64677cbe5`.
`WatchButton` gains `variant="2029"` through its existing variant seam. State, IO (`followIO`), scope and strict-state logic are shared
and untouched; the default and the other variants render exactly as before. The new view (`followCenter2029/WatchControl2029.jsx`) uses
the Design V2 floors (16px UI, 14px support text, 44px targets), `NavigationIcon2029` instead of emoji, colour only through the shared
treatment, and visible text for unknown/loading/confirmed. A guest gets the identity step only; browser push is a separate offer for a signed-in
user; nothing activates a channel. The writer-page follow control and the Follow Center preview consume it. `ShareActions` stays in its
allowed placement (no `force`): on 2029 pages the floating widget owns sharing, so the inline block correctly hides itself.
Tests: `test/watch-button-2029.test.mjs` (seam, no emoji, no IO in the view, floors), follow-center browser test (43 cases; the real control meets the floors
in all presets and widths; unknown state is gated with a visible message; confirmed state; no real write), and the existing writer visual family,
actions, follow-safety and community-person browser tests re-run unchanged and passing.
Not changed: other `WatchButton` call sites still use their existing variants (not migrated); no data wiring.

## Typography, hierarchy and the real identity slot (branch `claude/follow-center-presentation-20261025`)

Base: PR #1159 head `baeec829d` (controller predicates `confirmed` / `identityRequired`, scope guards and fixture I/O untouched). BEFORE `56f3d527-b6e7-4d7b-b434-fc2b1395728d`.

- **Type (Design V2 5.1/5.3):** every literal font size in the Follow Center and the WatchButton 2029 view now uses the canonical `--s29-type-*` tokens. Supporting sentences and status copy use the small token (16px, so at least 15px on desktop); the 14px micro token remains only for short tertiary labels (eyebrow, timestamp, state label, chip, group label). UI labels 16, body 18. The browser test reads computed styles at 1440 (support at least 15, UI at least 16, body at least 18, micro only on the allow-listed labels) and 320/390 (at least 14, targets 44px) in all presets.
- **Hierarchy:** rows sit on the soft surface without a second outline; outlines remain for selection, state, failure and unavailability (dashed). No new colours, roles or glyph taxonomy.
- **Identity slot audit (actual `EmailVerify`, OTP endpoint answered synthetically, every other request blocked):** measured on the base: inputs and buttons 41-43px high and 15px, support text 12-13px, error colour fixed, and contrast of 1.6:1 on the light presets because the component uses Legacy dark-theme colours inline. The component is unchanged; its sizes, colours and targets are scoped to the Design V2 floors and the preset roles by wrapper CSS inside the 2029 watch card only. Result in all presets at 390/1440 across the email, code and empty-code error steps: 0 problems (`test/follow-identity-slot-2029.browser.py --strict`). The Legacy callers of `EmailVerify` are not changed, so the same component still fails those floors outside this card; that is a separate decision.
- Regressions: the six actual-component state cases from `watch-button-2029-state.browser.py` pass; the 43-case Follow Center matrix, writer visual family and community-person tests pass.
