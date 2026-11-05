# COMMUNITY_TORAH_SINGLE_CANONICAL_PROFILE_20261105 — branch-only handoff

## User decision and durable identity
The user's desired public Community identity is the **new account**
`365fb241-77ed-4a9d-98ab-4e30ab53c093` (registered 2026-11-04).
It is already human-gated and linked to Contributor `1f95f46b-b18b-480b-a2d2-8a9ce90eb194` / exact source `U_QAu9LlY39eZZzLYi` by the previously applied decision `5b028046-3460-474e-9800-ca03f05e4db6`. **Do not replay that SQL.**

An earlier account `793dc271-2194-4110-b5ff-d2422d6f1c85` has the same display name but a **different login email** and Google provider identity; no direct authored Community/Contributor records were found on this earlier account. It is **not** part of the reviewed OpenWeb/source pair. This branch never aliases, disables, deletes, signs out or changes that Auth account.

## Reproduced before
- 12 original historical OpenWeb messages (`author_contributor_id`) and 1 new Community message (`author_user_id`) are stored under two distinct author key namespaces even though canonical database association already exists.
- Status counts at review: 8 approved historical + 1 approved new; 4 historical pending.
- **All 4** historical posts with `images.spot.im/v1/` image links are pending; their `image_url` and `media` fields are blank. Do not automatically approve or erase moderation or overwrite source URLs.
- Public chat readers project out private account/Contributor columns; the exact human-approved source-account mapping is required to create a common visible account key without name matching or broadening access.
- Full Community Person view used `avatar: null` even though the account's original public photo is already stored in `public.users.avatar_url`.

## Proposed implementation on isolated branch
- One exact public-only mapping for approved historical Contributor ID -> current account author key; never infer from equal name, photo or email. All 12 old messages keep the same IDs, text, status, timestamps and provenance. Community archive/replies, author summary, author card and author page join their existing public approved content under one key.
- Exact old `member` / `memberCard` routes replace their key with the canonical account key while retaining other reading/query context. Author links from old messages use the canonical key, and author activity queries include both verified Contributor and account keys.
- The canonical public user avatar is loaded via the existing public `users` reader only for this exact verified link, on the full Person view; existing selected account photo wins.
- A compact gold, touch/keyboard-accessible **היסטוריה אוחדה** seal appears on Community rows, author card, full Person and source-catalog layouts. Its explanation explicitly scopes the seal to admin-approved association of previously published Community history, not formal identity or content truth; pending records remain pending.
- The legacy other Google login remains separate in Auth pending a specific safe identity-ownership review; no second public archive tree is created.

## Validation and release boundary
- Node test fixtures cover exact old/new keys, no match by name, distinct older Google account, public profile URL canonicalization and avatar read, plus existing Community reader tests.
- Static repository review completed; **local Node/Chromium/product-build tests not run in this connector-only execution environment.** Run focused Node tests, public-reading build, and browser guest/member checks (390/1440, day/night, feed, nested replies, author card, full profile, old URL redirect, seal tap/focus, original photo, pending visibility).
- Do not modify the old Google Auth identity, approve pending content, overwrite user-selected photo, alter RLS, merge main or deploy based on this branch-only handoff. Main owner must check actual current main/prod and existing release gates before integration.
