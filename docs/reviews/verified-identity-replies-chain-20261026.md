# Verified identity → personal replies → old community thread

Task: `VERIFIED_IDENTITY_REPLIES_CHAIN_ACCEPTANCE_20261026`.
BEFORE: `1b5427e9-8034-465d-9a93-7a5596752485`.
Base: `7476fce7cec7c75bcb00aa60b2bbb15f11730394`.
Branch: `gpt/2029-identity-replies-chain-acceptance-20261026`.

This is branch-only integration acceptance over the existing Person spine,
`replies_to_me`, My Workspace and the existing community reader. It changes no
product component, RPC, identity operation, permissions or visibility. No new
live identity links, central/main merge, deployment or live migration were made.

## Verified live state, read-only

The six identity links from PR #1170 are present. The live `replies_to_me` still
has its earlier nine-column result and checks only `author_user_id`; the new
Contributor/Person ownership and thread context remain in the unapplied
migration in PR #1169. Connecting identities alone has not deployed the inbox.

A bounded descendant count over the six reviewed identity links found:

| Historical source | Authored messages retained by the earlier link operation | Public incoming replies in its descendant trees |
| --- | ---: | ---: |
| Jasha8 | 186 | 87 |
| Sod1820 | 78 | 24 |
| eli | 8 | 4 |
| Adi Ifrach | 7 | 0 |
| Yosi Viner | 3 | 0 |
| Johel TV | 1 | 0 |
| Total | 283 | 115 |

Incoming replies exclude the account's own native/linked-alias messages and
require approved community origins. These are aggregate history counts, not
delivery notifications or assertions that the live inbox already returns them.
No email addresses, provider payloads or private message text were exported.

PR #1169 and #1170 are still open/draft. Central was checked at
`20bdd98be93f8c7cd6e8dcca628100bded16f460`; main was checked at
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.

## What this slice proves

The existing isolated PostgreSQL 17 test first executes the exact committed
identity maintenance operation. It then applies the actual candidate replies
migration in that same disposable database. The combined test preserves the
earlier 20 identity assertions and adds 35 assertions covering:

- All six distinct account Persons, including four aliases whose existing
  primary dossier must remain unique.
- Native and historical self replies excluded by the same server ownership.
- No duplicate reply when two ancestors belong to the caller or both direct
  Contributor ownership and a Person bridge reach the same identity.
- Cross-account, same-name/unclaimed and pending/hidden/rejected rows excluded.
- Exact root/path through a native continuation inside an old imported thread.
- Older-history cursor, missing principal and denied anonymous execute.
- Private source dossier visibility and the sole primary dossier retained.

Only synthetic accounts/rows are used in this test. It runs without network in
a disposable container and rolls its transaction back. Its SQL response is
optionally exported from the container to a local file, with no live DSN input.

The existing browser test can consume that export. It uses the actual local SQL
results for `replies_to_me` and the exact fixture messages needed for each path;
Auth/HTTP are intercepted fixtures and never contact a real service. It checks
all six accounts at 320/390/1440, old-thread focus, Reload, exact return, and
in-place Auth switching while the next principal's reader response is held.
Prior-account replies must disappear before the new result arrives. Known
identity telemetry is blocked separately; unexpected writes fail the test.

The browser test's original hand-written fixture remains its default mode.
An optional output directory prevents overwriting previous committed evidence.
The old personal-replies SQL runner also now waits for PostgreSQL's final TCP
listener, avoiding a race with the temporary initialization server.

## Reproduce

```bash
TASK_REPLIES_EXPORT=/tmp/verified-replies-browser.json \
  bash scripts/run-verified-openweb-account-links-sql-test.sh
npm run build
TASK_REPLIES_EXPORT=/tmp/verified-replies-browser.json \
  TASK_REPLIES_BROWSER_OUT=/tmp/verified-replies-chain-browser \
  python test/personal-replies-community-2029.browser.py
bash scripts/run-personal-replies-community-sql-test.sh
node --test test/personal-replies-community-2029.test.mjs \
  src/lib/community/communityArchive.test.js \
  src/lib/community/communityWriterLink.test.js
```

## Acceptance and remaining limits

- PostgreSQL: 20 identity + 35 combined + 11 standalone reader assertions pass.
- Focused Node: 19 pass.
- SQL-backed Chromium: 18 account/viewport cases pass; zero page errors,
  unexpected writes or model requests. Exact return and pending-principal
  isolation pass in every case.
- Original browser fixture: three viewport cases pass unchanged in meaning.
- `npm run build`: Legacy and 2029 pass, existing chunk/dynamic-import warnings
  only. Built graph: 117 reachable records, seven eager records, 383,531 bytes
  eager JavaScript gzip; Raziel adapters and Research Plan remain lazy.
- Hard isolation, cheap hardening, System Frame, My Workspace, Legacy Production
  Lock, Python syntax and `git diff --check`: pass.

This minimal synthetic schema executes the two real operations; it does not
reproduce every live RLS policy. The browser proves the built frontend against
those SQL results; it does not prove hosted authenticated acceptance or a real
login. No held response or synthetic JWT reaches a live service.

Visual inspection found an existing community presentation gap: at 320px,
three nested reply indents compress the focused message body to 84px (154px at
390px viewport; 560px at 1440px viewport).
There is no page overflow, but that does not prove comfortable reading width.
The browser records focused body width separately. No CSS/design change is
included; the shared owner is the nested replies rule in
`src/pages/community2029.css`, used by the existing `LiveThread` in
`src/components/community2029/CommunityLive2029.jsx`.

## Central handoff

Review the retained chain once: PR #1169 → PR #1170 → this acceptance slice.
Do not cherry-pick retained ancestors again. The identity maintenance DML is
already applied and must not auto-run on a repository merge.

Next release work remains with the central/database owners: integrate the
candidate, review/test the existing reader migration in development, obtain its
separate live-apply authorization, then verify real authenticated accounts on
the exact hosted Preview. The nested-thread mobile presentation needs its
visual-owner follow-up before calling the whole experience finished.
