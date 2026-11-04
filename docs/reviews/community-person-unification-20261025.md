# Community authors and public writer Person family — integration candidate

Task: `COMMUNITY_WRITER_PERSON_UNIFICATION_20261025` · GPT technical lane · branch only.

Base: `d6282d4408c704a626e812bd3b10ea96693f4688` on
`gpt/2029-central-writer-world-focus-20261025`.
Continuation: `gpt/community-person-unification-20261025`.
The complete handoff range is `d6282d44..gpt/community-person-unification-20261025`.
Main remains `8642f7c93c9b653b7a42faaa2809362f3cd280e0`; it was not merged or changed.

BEFORE records: `c3a7a6ca-12db-471a-9da1-9e5232c7212c` and scope refinement
`151610c3-0a19-4472-8244-18d184648800`. The latter keeps the parent community pages
unchanged and uses the existing CommunityLive member branch, preserving its controller state.

## Released prerequisites integrated above the current central base

| Released source patch | Equivalent commit here |
| --- | --- |
| `31e09d9628325bcd3aa8d5a4294772243759755e` | `b2afc2b9202da9599f4bd78955689901732c2eb4` |
| `cab54f6ebb0a38ba685945188d8752fe2e10aa7e` | `99e0aaebaa7baba850a159f01df2d7fee3cb30bb` |
| `ae1e674f4` (Claude design) | `2bd7b62efb8252ae6ca99c14cfdb4ce7b210fe5f` |
| `93a9b5f4f9baf38bb1775d4785e6e8bb556f83b3` (Claude evidence) | `d0484cc2e2be783d13097efa417ae10598d196ee` |

All four applied cleanly. Claude authorship and the delivered medallion/layout/CSS are retained;
GPT did not redesign them. The base already includes `47a70cbe` as `08134b49` and `dd3bdf8d`
as `d6282d44`. Do not apply those, or `85e2f966`/`20f24ea5`, again. Integrate the complete
continuation range, accounting for already equivalent patches, rather than its final patch alone.

## Resulting behavior

- Existing community `member=<source UUID or user:account UUID>` URLs now render the same
  public Person-family template and identity medallion as public writer pages. There is no new
  Person URL, store, resolver, identity record or visual profile implementation.
- The short author card remains. Its full-page button opens the shared family in the message
  context. A unique eligible public writer dossier reuses the canonical writer loader, including
  Tzvi's SOURCE_LIBRARY catalogue. An owned private archive source is not treated as a second
  eligible public dossier. Multiple eligible public dossiers remain ambiguous.
- Without a public dossier, only an anonymous-visible message author credit is projected. No
  messages means no public page. Private dossier biography, role, portrait and identity aliases
  are not used. The embedded activity deliberately does not render joined dossier avatars;
  approved public writer portraits still come from the existing writer loader.
- The source-only view retains the existing all/chat/non-chat activity filters through the shared
  tabs. Messages and replies keep their native IDs, bodies, imported likes, current ReactionBar,
  native contribution links and reply targets. Newest/oldest, reload and incremental loading use
  the existing author reader. Nothing is copied into another corpus.
- The first author activity page contains at most 20 rows. Its result seeds the embedded reader;
  there is no second read for each card. A cold member entry skips the redundant global chat feed.
- Opening a member page keeps CommunityLive mounted. Draft, reply context and loaded feed stay
  in memory. Native Reply returns to the existing composer. Returning restores the captured feed
  scroll anchor. The existing owner link targets `/2029/me/profile`; source claims retain the
  existing verified claim flow. Viewing executes neither claim nor identity writes.
- Explicit chat totals may enter the Person projection. Non-chat activity is labelled
  **פריטי פעילות**, never messages. A missing or nonnumeric PostgREST count remains `null`, with
  pagination continuing until a short page; it does not become zero or suppress remaining items.
- Likes use the existing verified public summary or an existing public source-profile baseline.
  The latter is labelled **לייקים בפרופיל המקור**, with its provenance in the path panel. It is
  not recalculated from the current page or presented as research standing.
- Direct writer entry retains its existing lazy community section and catalogue default. Opening
  from chat selects the community section. Tzvi retains 20 recent publications, full pagination,
  paired media, five native posts, explicit topics and exact World links/return context.

## Verification on this continuation

- `npm run build`: Legacy and 2029 passed, including the Production lock precheck.
- 18 Node test files passed across contributor2029, community, writer personal adapters and the
  Person/Directory projections. New coverage includes typed keys, public-only fallback, measured
  versus unknown counts/likes, unresolved account identity and unique eligible writer resolution.
- Production lock, World surface acceptance, cheap route/hardening and public language checks passed.
- `git diff --check` passed.
- Existing cold-entry card browser regression: 8 route/viewport/theme combinations passed.
- Existing personal-chain browser regression, interaction flows without repeat captures: 10 flows
  passed. Includes explicit photo consent/revoke, existing inbox, failure-preserved drafts,
  account-switch masking, no creation on view, and unlinked/ambiguous/error/guest guards.
- New unification browser suite: 16 cases passed, including the nine 320/390/1440 × day/parchment/night
  combinations, native reply/draft preservation, unknown-count pagination through exhaustion,
  existing self-editor link, writer/account/Tzvi keys and private-source rejection. Zero page errors
  and unexpected writes. 137 existing identity/telemetry attempts were intercepted and blocked,
  including the existing AuthContext research-lead claim in the synthetic signed-in case.
- Existing routes regression passed: nine captures and two exact World source round trips
  (paired image/text and text), preserving reload, focus and the writer return context.
- Existing actions regression passed: nine viewport/theme captures and member, owner and failed-send
  flows; zero page errors and live writes. Every synthetic request is intercepted.

### Actual anonymous data, local built App2029

Six additional cases passed with live anonymous reads, `/api/*` returning unavailable and telemetry
blocked. No page errors, unexpected writes, research-object reads or unsafe Person RPC calls.
These are local browser checks, not proof of a hosted Preview flow or an authenticated live session.

| Case | Viewport/theme | Observed public result | Person-ready time |
| --- | --- | --- | --- |
| Emily | 390/night | 1,249 messages, first 20; historical profile likes 22,900 | 7,197 ms cold |
| Emily | 320/day | same native messages, first 20 | 2,078 ms proxy cache |
| Emily | 1440/parchment | same native messages, first 20 | 2,709 ms proxy cache |
| Yaniv | 390/day | 2 non-chat activity rows; 7 posts, 30 cipher records, 32 contribution rows | 7,920 ms |
| Tzvi | 390/parchment | 1,058 catalogue publications including 5 posts; recent section renders 20 | 9,267 ms |
| Sod1820 source key | 390/night | existing public dossier reused; 40 messages/replies, summary likes 318 | 8,294 ms |

Measurements include the local browser, shared frame, real network proxy and other frame reads;
they are not production latency benchmarks. Emily's 390 case read 162,504 bytes across 16 requests
including the shared frame; Tzvi's case read 1,113,656 bytes across 23 requests. No full research load
was introduced. Screenshots and the detailed result JSON are available in the session artifact
directory `/workspace/artifacts/community-person-unification-20261025/`.

## Dependencies and explicit limits

1. Person binding remains `unresolved` and `personRef` remains null. Only existing exact account/source
   bindings are reused. `yanivhe` is still unproven and is not linked to Yaniv Levi. No name/email guess
   or blanket restoration of the 573 unresolved research rows is authorized by this change.
2. The identity medallion is the released Claude candidate. Shared night palette semantics and the
   embedded activity body font need a separate Claude/global design correction. The earlier audit
   found gold action roles and a 16px body override at `publicContributor2029.css`; those are not
   silently declared compliant or fixed by this technical integration.
3. R0–R7, research standing, active days, complete historical tenure and last-seen privacy are not
   implemented here. No XP/count/like conversion or artificial rank is introduced. Private personal
   progress still uses its existing legacy rank component.
4. Direct writer-page medallions retain their existing lazy measurement coverage; the chat-entry
   projection can show the bounded chat total/summary. This is shared presentation, not a completed
   canonical Person resolver or all-domain measurement engine.
5. Source-only pages do not acquire a writer's owner/DM/follow/studio capability. Those actions remain
   with the existing eligible public dossier and authenticated personal-area endpoints.
6. Ariel's private findings remain excluded. A public zero is only a public-reader result, not a
   claim of zero lifetime contribution. No visibility, RLS, source rows, publication state or kind
   was changed. Tzvi's role label still follows `contributors.kind`.
7. Hosted Preview metadata/protection and its exact SHA are reported in the AFTER record. No
   authentication bypass, share token, alias, Production action or protection-setting change is part
   of this task. Existing Vercel sign-in may be needed to open the Preview.

## Changed paths and delivery

New technical paths: `communityPersonNavigation.js` and its test; `loadCommunityPerson2029.js` and
its test; `test/community-person-unification-2029.browser.py`; this review.
Edited technical paths: CommunityLive2029, ContributorCommunityActivity2029, PublicContributor2029Page,
PublicSourceCatalog2029 (props only), their three existing models/projection, presentation labels,
communityArchive and its test, communityWriterLink and its test. The four prerequisite commits also
carry their originally released visual, projection, fixture and evidence paths.

For the exhaustive path list, use `git diff --name-status d6282d44..gpt/community-person-unification-20261025`.
Only the isolated continuation branch is pushed/deployed to Preview. Ownership is released in the
passive AFTER record to ZURIEL. No further phase starts before central integration is confirmed.
