# PR1014 + PR1015: bounded Journey consumption

Coordinator: work_log `3993e59c-d8b5-4a49-9f96-d70b1e048ec9`.
Writer ACK: `d1dc5c6b-7bf8-4f8c-baf2-fb94672bad1b`.
Existing Workspace/Research Paths owner; no Source, NumberCore, Posts, ELS UI,
SystemFrame or rail ownership transfer.

## Exact composition

| Dependency | Exact version |
| --- | --- |
| Verified origin/main | `8e939d3b092f267e40d74953b9103711322276d2` |
| PR1014 Journey package | `f76a7b8b1621198dcc5078f170ff94ecd877978e` |
| PR1015 Source package | `95483de55e65f6fa1a09300dfa65ca733fbdcb4e` |
| Local composition merge | `96fbed8323f442e98a9cbc96f0066fb5f83c6422` |
| ELS owner's standalone CI fix | `1800c3d07d36b5e52dee74a95be050dd24e4bb90` |
| Local CI cherry-pick / integration baseline | `f2875c61962c2bd35c79d8be3fbca38f75afbe58` |

Local branch: `codex/journey-source-integration-20261009`. The final tested HEAD
is recorded by the browser receipt and the AFTER memo, avoiding a self-referential
commit ID in this file. The Source package is composed unchanged. Only the ELS
workflow commit is cherry-picked, without its ELS UI parent. No main merge,
push, workflow dispatch or deployment: branch pushes in this repository create
Preview deployments. The reviewable result is a local branch plus git bundle.

## Consumption changes

1. The existing Provider captures a selected Topic image as `returnTo` before
   replacing the active subject with Number. It retains sourceRef, locator,
   existing source identity/reference, and documented contextual explanation.
   Number's mount update merges with the latest Provider snapshot, so the route
   effect and page effect cannot erase that return.
2. Explicit Start adds the existing Topic source reference and chosen Number
   selection to the same Path; ordinary image/method selection does not start a
   Path. Method/result/version and source identity remain separate.
3. A Number trace arriving after explicit selection enriches the unsaved step
   without adding a second choice. Distinct non-null findings or versions are
   not collapsed. Saved revisions remain immutable.
4. Number's source-return action and source-step action re-read the Source
   owner's `fetchTopicSourceContext` through Entity Hub. They require the same
   sourceRef, locator and recorded media identity; missing/changed/denied sources
   fail closed while preserving the Path. Pending reads cannot navigate after
   a route/principal change. Destination Topic re-reads its current envelope.
   The Journey owner restores the selected source's viewport as images load;
   reader interaction cancels restoration immediately. This addresses mobile
   layout shifts without changing Topic or its historical collection.
5. Original images, gallery occurrences/order/captions/credits stay in the
   unchanged `galleryMediaEnvelope`/Topic projections. No copied source payload,
   invented source version, parallel tagging/store or publication change.

## Exact examples

**Captain / India:** Topic `india-axis`, post 5112,
`flydubai-fz1073-363-14000-remzei-geula`.

- `sourceRef`: `post:flydubai-fz1073-363-14000-remzei-geula#source-region-smit-machchhar`
- media: `media:post:5112:source-region-smit-machchhar`
- return: `/topic/india-axis#topic-source-media-post-5112-source-region-smit-machchhar`
- canonical media identity: storage object ending in
  `/gallery/sod1820/posts/fz1073/smit-machchhar-source-20261001.jpg`
- documented connection: the post explicitly calls the captain an Indian
  citizen; injury/rescue remains the photographed source's claim.

**1237 coverage:** shared India image
`5579cca1-ff12-4a9a-87ee-e32e89ca9af3`, WordPress image2742,
gallery70 `גלרית14-6`, original ordering23.

- `sourceRef`: `gallery_images:5579cca1-ff12-4a9a-87ee-e32e89ca9af3`
- return: `/topic/1237#topic-source-5579cca1-ff12-4a9a-87ee-e32e89ca9af3`
- India membership `topic_cards:95945c0d-7b7b-482f-a2f9-a5a097621452#image_ids/3`
- 1237 membership `topic_cards:96885dc7-b6a4-43b1-8d64-b4ceac4e899b#image_ids/4`
- Same image identity, different documented Topic associations. Recorded
  `2021-06-01` derives from the path, not a verified event date.

The browser selects each actual source, follows the existing Topic link to
1237, explicitly chooses `תורת הצופן`, then regular1237 and miluy1692 through
the canonical method reader. This is a reader's chosen research continuation;
it does **not** assert that the captain/photo equals1237 or is the same event.
Stored steps are source → regular expression → miluy expression. On resume,
the miluy choice and precise Topic source return survive.

Hodu duplicate coverage consumes the delivered fixture: images
`8940efb2-8423-4a27-a10a-d3fdd07cf595` (gallery28/order0) and
`4d0b8d36-0801-449b-a0a6-0c7ff543c5b0` (gallery54/order6) are one storage object,
two original placements, never two independent pieces of evidence.

## Reproduction and evidence

Use a disposable local Docker PostgreSQL17 container named
`sod-journey-integration`, with this checkout mounted read-only at `/repo`.
Never point the fixture at Supabase or another existing database.

```sh
docker run -d --name sod-journey-integration \
  -e POSTGRES_PASSWORD=fixture_only \
  -v "$PWD:/repo:ro" public.ecr.aws/docker/library/postgres:17
docker exec sod-journey-integration psql -U postgres -v ON_ERROR_STOP=1 \
  -f /repo/scripts/test-research-sync.sql \
  -f /repo/supabase/migrations/20260907142000_research_path_foundation_v1.sql \
  -f /repo/supabase/migrations/20260913160507_g2_bedrock_research_path_outcome_envelope_v1.sql \
  -f /repo/supabase/migrations/20260922205800_g3_research_path_resumability_runtime_v1.sql
npm run dev -- --host 127.0.0.1 --port 4174
# In another shell, with Playwright installed:
node scripts/test-journey-source-integration.mjs
```

`PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `JOURNEY_ARTIFACTS` select the local test
runner/browser/output only. The harness renders the actual product UI, uses a
synthetic auth session, routes personal RPCs to the actual local SQL functions
under authenticated roles, and permits only anonymous public reads externally.
It blocks telemetry, publication, ingest, AI and every other external write.
This is isolated authenticated acceptance, not a production login certificate.

Receipt: `/workspace/artifacts/journey-source-integration-20261009/browser-receipt.json`.
Screenshots: source, Number/method, saved Path and returned source, at1440px and
390px. The suite additionally exercises expired RPC auth, another principal's
private-path denial, missing source, AI unavailable, and guest878→World→return.
The receipt is the authority for the actual completed cases and final HEAD.

Other gates: Journey/source/sync unit tests, mounted real React Provider tests,
Path runtime contract, both builds, hard-isolation source regression, unchanged
Source browser acceptance, and the ELS workflow's static tests, executable
PostgreSQL tests, browser cutover and SQL compatibility acceptance. These are
local gates on the composed tree, not a claim of a new GitHub Actions run.

## Boundaries remaining with existing owners

| Boundary | Current owner / required work |
| --- | --- |
| Public Path publication/reader | Research Paths/governance; no public-reader authority added here |
| Captain source region inside native Post | Posts; locator exists but visual region is hidden in delivered source acceptance |
| Original gallery exact image return | Legacy Content/Experience; archive opens gallery, not exact image position |
| New World/Projector source composition | Existing World/Projector owners consume this same source/Path contract later |
| Release and combined remote CI | Coordinator after authorization; this local integration does not close G4 or deploy |

No Source/Topic/Posts/ELS UI/rail/NumberCore files change after composition. No
live product rows, source tags, schema, approval or publication states change.
