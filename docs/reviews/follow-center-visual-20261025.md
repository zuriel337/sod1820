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
| Compact writer follow, distinct from share | Specimen row (follow vs share); real build reuses the existing `WatchButton`, no second implementation |
| Guest vs registered | Guest: "אימות זהות" is the only next step, no channel chosen. Registered: channels are separate choices |
| Four separate states | Follow · Identity · Channel · Delivery strip; delivery is never claimed |
| Follow / relevance / Raziel | Three labelled inputs; only explicit follow is active, the others read "עוד לא פעיל" |
| Truthful capability | Email, WhatsApp and Push show "לא זמין עדיין"/note from the existing channel metadata; Push becomes "אפשר להפעיל" only when the device reports it. No working switch is manufactured |
| Truthful states | loading ≠ empty; a failed read says "זה לא אומר שאין כלום" with retry; partial read keeps the other section; unfollow shows pending and an unconfirmed failure leaves the row; confirmed removes it |
| Record time | Bilingual Hebrew + Gregorian date (relative time is Home-only per the record-time rule; the old panel used relative time) |
| 2029 icons | Subject kinds and channels use the `NavigationIcon2029` catalogue (personal, number, layers, signal, discovery, posts, conversation, check); no emoji. There is no bell or mail icon in the catalogue, so email uses `posts` and device Push uses `signal`; a dedicated icon would be a catalogue extension for ZURIEL to approve |
| Colour roles | Colour carries meaning through the Design V2 roles, not decoration: writer = Brand gold identity ornament, number = action/indigo, category = secondary violet, source/channel/discovery = cyan, section tops = action / violet / cyan, selected and followed = accent tint, identity tile = Crown gold + sapphire. Icons follow the contract (`currentColor`, theme text by default); colour is applied by the consumer. Icon colours are asserted at 3:1 or more and headings at 4.5:1 in all presets |
| Design V2 | 18px reading, 16px UI, 14px metadata floor, 44px targets, three presets, accent text role, focus ring, reduced motion |

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
