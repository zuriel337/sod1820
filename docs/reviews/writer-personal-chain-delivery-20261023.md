# Writer pages and personal-area connections — 23 October 2026

Correction: the existing community already supplies author activity and per-message likes/reactions. Their writer-page integration was missed in this stage and is repaired in [the community reuse follow-up](writer-community-reuse-repair-20261023.md). The reported hosted Preview error remains separately open; this stage's local browser/HTTP checks are not a hosted browser pass.

Branch: `claude/2029-writer-personal-chain-20261023`. Integration base: `d623215d2fa9c7ce5114b1fad8979f19d41758de`. Verified implementation commit: `3ed53f0c33aa9da0d6be0ca8ef39eca9d4907a80`. The delivery report is a subsequent documentation-only commit. Required World reader ancestor `cfa786c186b449c6a616566724666937d415d508` is preserved. Verified remote main: `e73687221aa2ab639930643e5cc8c99666adce88`.

This completes the six personal modules connected to the public writer page, following the [Legacy parity review](writer-legacy-parity-and-identity-seal-20261023.md), [identity/actions delivery](writer-identity-actions-delivery-20261023.md) and [reading/curation delivery](writer-reading-curation-delivery-20261023.md). Other personal modules remain under their existing owners.

## Delivered connections

| Entry | Result |
| --- | --- |
| `/community/researcher/me` | Authenticated read resolves the account's unique existing contributor to its canonical slug/code URL. Viewing creates no identity. Unsupported/private query parameters are discarded. Guest, missing, unavailable and ambiguous bindings remain distinct. |
| `/2029/me/public-page` | Native personal home and visitor preview. A person without a writer page may explicitly create one after entering a public name/bio and checking consent. Existing bindings cannot be replaced. New-name collision preflight protects existing author attribution. |
| `/2029/me/page-editor` | Existing shared `PageEditor` and `update_my_page_config`, preserving native highlights/links/settings. Public introduction and source selections continue through the preceding stage's existing owner controls. Failed reads block writes. |
| `/2029/me/profile` | Existing shared `ProfileSettings`, account-scoped drafts and acknowledgment validation. Public portrait publication is a separate explicit choice; the server reads the caller's actual account photo. The approved URL is stored in existing `dossier_settings.public_avatar`; a later account-photo change requires fresh approval. Opt-out overrides a legacy public avatar. |
| `/2029/me/messages` | Existing `MessagesHub`, `dm_inbox`, `dm_thread`, `dm_send` and replies. A writer/conversation deep link resolves only against the caller's existing inbox. Exact writer return is retained. An uncertain send preserves the draft and shows an error. No automatic sends or retries. |
| `/2029/me/notifications` | Existing notifications, follow preferences and device channel controls. Author links resolve only from an exact, unique public contributor name; no guessed slug. Failed unfollow does not remove the row. DM notifications open the native conversation. |
| `/2029/me/progress` | Same canonical five-level rank and identity medallion, plus caller-only existing XP/credits/streak/tier. Missing statistics say unavailable. No new rank calculation, zero substitution or research-strength inference. |

The existing frame routes these six modules to 2029 while retaining the same Auth/Research providers. The page has no second drawer, inbox, profile editor, research store or writer corpus. Guest access opens the existing login flow. Private documents and the self API are noindex; self responses are `private, no-store`.

The public page retains the approved public photo/initial 3D medallion, source-native writings, gallery, community writing, follow/share, messaging, membership dates, selected source pointers and existing reading library/history/context. The public medallion's five lights show the existing activity rank, not truth or finding strength. Tzvi's actual registration remains 16 July 2026: less than a year in the community at this delivery date.

## Verification

- **90 contained Node cases pass**: 43 public writer/rank/actions/reading/catalogue cases, 11 private identity/consent/portrait/conversation/return/name-collision cases, 33 existing Research sync cases, 3 date-display cases. Each file also ran directly so the contained case count does not confuse test files with assertions.
- `npm run build` passes for both Legacy and 2029; `npm run build:2029` passes independently. Existing shared dynamic-import warnings remain. `git diff --check` passes. The historical `scripts/test-legacy-production-lock.mjs` is absent at this base; no result is claimed for it.
- Native built App2029 + actual existing providers/frame: **54 viewport/theme/module combinations** (six modules × 320/390/1440 × day/parchment/night), no horizontal overflow or runtime errors. Ten functional flows cover canonical self resolution, preserved page configuration, portrait publish/public projection/revoke, visitor preview, own-inbox deep link, failed and confirmed send, replies, failed and confirmed unfollow, DM notification, profile save acknowledgment, account-switch privacy, explicit creation/consent, guest, ambiguous and unavailable states/retry.
- Existing `WatchButton`: normal/mini/checkbox/gate variants tested for unknown-state gating, failed acknowledgment, visible error, rollback/re-read and confirmed retry. No email/push activation occurs as a side effect.
- Public built-router regression: nine viewport/theme combinations, 20 recent cards, exact paired-image/text World occurrence → reload → back, canonical numeric-code route, native saved-library continuation and existing Legacy editor handoff.
- Public actions regression: nine viewport/theme combinations; guest/member/owner, medallion keyboard interaction, studio gallery/link, explicit source feature/unfeature and introduction save, follow/message and uncertain-send behavior. Loader regression confirms anonymous content requests and private-marker exclusion for guest and simulated administrator, with automatic-profile noindex retained. Rank regression retains nine viewport/theme captures and unavailable/loading/unlinked/not-found states.
- All authenticated writes in tests are synthetic HTTP fixtures. Implementation and verification sent no real messages, changed no product records, and made no schema/RLS/site-flag changes. Live checks use anonymous/read-only readers. Coordination records are separate authorized work-log writes.

Local evidence: `work/evidence/writer-personal/results.json` and 54 screenshots, `work/evidence/writer-follow/results.json`, writer routes/actions, rank evidence and logs. Hosted HTTP and local browser evidence are separate; the existing hosted bot middleware previously rejected automated Chromium. It was not weakened or bypassed.

## Performance and exact source examples

One traced live anonymous public-page read at **2026-10-23T03:53:55Z** took **4,270 ms**, with **1,053** catalogue publications, **20** recent items, **22** paired-media publications and **8 GET requests**. There were **zero full-research requests**; research remains deferred to an exact World occurrence. This is one server-side read over the session network proxy, not a browser paint percentile. Catalogue card rendering stays paginated/lazy; the initial canonical catalogue itself is still read as required.

- Image and text: `/world?view=sources&source=tzvi-opoc&sourceRef=channel_updates%3A9ec09e85-37eb-48a9-a73f-5299061a0f79#source-occurrence-9ec09e85-37eb-48a9-a73f-5299061a0f79`
- Text: `/world?view=sources&source=tzvi-opoc&sourceRef=channel_updates%3A0fa955f9-3c3e-4816-90a0-ca0e5fc8a88a#source-occurrence-0fa955f9-3c3e-4816-90a0-ca0e5fc8a88a`

## Ownership, commits and files

Actual Claude specialist commits `ec755cbd` and `60999be3` were integrated as `333d82af` and `66ad8e40`. They own the controlled personal views/CSS, bounded existing-frame routing/progress action and shared WatchButton acknowledgment/state safety. GPT integrated capability/data/access/routing in `0c5d2124`; browser-derived fixes and tests are in `3ed53f0c`.

Changed implementation/test files:

```text
api/contributor-self.js
src/App2029.jsx
src/components/ProfileSettings.jsx
src/components/WatchButton.jsx
src/components/contributor2029/ContributorActionsController2029.jsx
src/components/contributor2029/ContributorReadingController2029.jsx
src/components/contributor2029/WriterPersonalViews2029.jsx
src/components/contributor2029/loadPublicContributor2029.js
src/components/contributor2029/publicContributor2029Model.js
src/components/contributor2029/writerPersonalViews2029.css
src/components/experience2029/SystemFrame2029.jsx
src/components/userCenter/UserCenter.jsx
src/lib/commandCenter.js
src/lib/notifications.js
src/lib/userCenter/writerPersonal2029.js
src/lib/userCenter/writerPersonal2029.test.js
src/pages/WriterPersonal2029Page.jsx
test/fixtures/writer-follow-safety-2029.jsx
test/public-contributor-actions-2029.browser.py
test/public-contributor-routes-2029.browser.py
test/writer-follow-safety-2029.browser.py
test/writer-personal-chain-2029.browser.py
vercel.json
```

No provider/Auth, World, Home, Post, Number, Researcher2029Page, menu, DB, RLS or site_flags edits.

## Confirmed boundaries and next owner work

Independent Claude read-only security challenge `WRITER_PERSONAL_CHAIN_SECURITY_20261023` reviewed the implementation and live RPC/RLS definitions: **no security blocker found**. The public-name collision recommendation is addressed for this new creation API with a case-insensitive literal-name preflight. This is not a global uniqueness migration or a replacement for the existing name-based attribution engine.

The existing contributor creation RPC lacks an atomic `UNIQUE(user_id)`/creation lock; concurrent creation in separate requests can still produce ambiguous bindings. Existing display-name attribution and direct dossier RPC access also predate this branch. Correcting those guarantees requires their DB/domain owners, outside this no-DB-change task. Existing anonymous column/RPC grants remain unchanged; this branch's public DTO privacy is not a claim of new database-level column restrictions.

Public last connection and community likes/replies totals still have no approved public reader. They are not shown as invented values or derived from private activity/source volume. Recommended next work is an owner-approved community reaction aggregate reader and an explicit public-presence choice before exposing last connection. Other personal modules (billing, WhatsApp/Raziel, private life journey and administration) retain their existing destinations and were not silently migrated.

Release state: **IMPLEMENTED / TESTED / BRANCH ONLY**. Preview-only publication is authorized; its exact deployment URL and SHA are recorded in the final passive delivery and user message. No merge, main push or Production deployment.
