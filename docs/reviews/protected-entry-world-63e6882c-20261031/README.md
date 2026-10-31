# Protected Preview Entry / World — safe acceptance evidence

נבדק הפריוויו הקיים **63e6882c** באמצעות בדיקות המקור מ־**c2f2e994**. ענף הבדיקות לא זז. מתוך 46 תרחישי World מקוריים: **21 עברו; 20 נכשלו ו־5 נעצרו בזמן הקצוב**. שני תרחישים משלימים עם מידע ציבורי אמיתי עברו. בדיקות בנט המקוריות נשארו פתוחות בגלל טיוטה שאינה ציבורית. **A3 ושער Isolation המלא נשארו פתוחים.**

מבין 25 תרחישי World שלא עברו, 18 נעצרו בציפיות תצוגה/כפתורים ישנים, שניים תלויים בנושא הציבורי 888 שאינו קיים, אחד דורש בירור חוזה הניווט ההקשרי, שניים דורשים בירור מצב/מידע (314 ומזהה שאינו זמין), אחד נעצר בהמתנת מקור ואחד חרג בסף CLS. לא שינינו בדיקות כדי להציג הצלחה, ולא שונו נתונים חיים, מודלים, הרשאות או הגנות יישום.

## Exact provenance

- Application tested: **63e6882c3b7b4004d337927c7231728a7612d452**, existing protected Preview `dpl_Aa8o4Cr61VawivzJodti8KTsecB2`.
- URL: https://sod1820-26of53pw9-sod1820-s-projects.vercel.app/2029
- Original test source: **c2f2e9948dd119c96b69e377b33be2eb2a886efb**, branch `gpt/2029-ci1185-acceptance-reconcile-20261031`. That local and remote branch was not moved.
- This separate evidence branch is `gpt/2029-isolation-evidence-preview-acceptance-20261031`; its later documentation commit is not the application/test SHA.
- Coordination BEFORE: `885c91d2-b660-46a7-a257-4b4568f58baa`; passive ZURIEL reporting only.
- **A3 and the full Isolation gate remain OPEN. No full GitHub Isolation workflow was dispatched or marked passed.**

## Results

All 46 unique cases from the original World spec were selected across the main and focused executions. Current consolidated outcomes: **{'passed': 21, 'failed': 20, 'timedOut': 5}**. An observed CLS failure remains a failure/open item even though a focused repeat passed. Do not sum repeated attempts as unique tests.

Classifications: `{"PASSED": 21, "CLS_THRESHOLD_FAILED_RETEST_RECORDED": 1, "STALE_UI_EXPECTATION": 18, "EXPECTED_PUBLIC_888_FIXTURE_ABSENT": 2, "CONTEXTUAL_ROUTE_EXPECTATION_REQUIRES_RECONCILIATION": 1, "BEHAVIOR_OR_FIXTURE_REQUIRES_REVIEW": 2, "SOURCE_PROJECTOR_WAIT_OR_BEHAVIOR_OPEN": 1}`.

The two original Entry cases depend on Bennett's authored post. The first reached an unavailable public Post and failed; the second was skipped by the original serial suite. Dedicated read-only verification confirmed the expected Bennett slug is currently a draft. Both original Entry acceptances remain OPEN; no draft was published/restored and no private draft content was exported. The public `888-yeshua` topic is absent (0 rows; there are 204 other public topic rows at verification time).

Two supplementary, explicitly separate checks passed: public Flight Post entry/orientation at 390px, and current real public World catalog search/expansion from 8 to 24 visible cards. They do not replace the failed original cases and do not manufacture a published Bennett/888 record.

## What passed in the original World suite

- Core Web Vitals CLS budget holds on /2029 at 390px
- Core Web Vitals CLS budget holds on /2029/number/1237 at 390px
- Core Web Vitals CLS budget holds on /book/daat-tevunot at 390px
- Core Web Vitals CLS budget holds on /books at 390px
- Core Web Vitals CLS budget holds on /els at 390px
- Core Web Vitals CLS budget holds on /topic/888-yeshua at 390px
- Number 2029 preview opens 1237 with all available methods visible in one wrapped research stage
- Number 2029 596 keeps six methods visible and finds Jerusalem↔Shomrim as a live hidden crossing
- Number 2029 1118 uses canonical Hebrew verse refs and appends the gematria value after the verse
- Number 2029 Miluy switches the whole stage to 878 with language bridges and in-place explain
- Number 2029 878 keeps its general research path but no longer opens the locked Golden Journey
- Golden World 878 journey stays closed while the public Number 878 and full images remain readable
- RICH 1820 opens human-first before raw research detail
- RICH 1820 projects real published media without legacy gallery UI
- RICH 1820 remains useful when research rows are access-filtered
- automatic filters, sorting and explain-why work without exposing admin research controls
- SPARSE live World 122 stays honestly sparse with no fabricated research
- loading and error states are honest and native
- reduced motion preserves the same World meaning and controls
- 320px RTL World survives 200% text zoom without horizontal overflow
- private researcher corpus stays gated for non-admin 2029 sessions

## Open findings and next actions

| Finding | Evidence / limit | Required next step |
|---|---|---|
| Layout stability | `/world` exceeded the unchanged CLS 0.1 budget: **0.2229** in the full run; a subsequent single-worker original test passed. Earlier transport-validation run also recorded the failure. | Keep performance acceptance open; isolate the recorded layout shifts under repeatable font/data timing. A successful repeat does not erase the failed observation. |
| Old UI text and entrypoints | Several assertions wait for `מתחילים ממה שמסקרן אותך.`, `מה אתה רוצה לראות עכשיו?`, `מתחילים במהות`, the former `פעולה` button, or the old `הודעות מקור` filter. Current source/Preview uses the adopted presentation and shared feed. | Review these expectations against current capabilities and approved navigation; retain permission, content, overflow, exact-return and failure checks. No test assertions were changed in this task. |
| Bennett / 888 fixtures | Bennett is a draft; the historical 888 public topic is absent. | Use bounded synthetic fixtures in an isolated acceptance harness, including negative/unavailable cases. Do not publish live records or broaden access to make tests green. The existing G4 fixture at c2f2e994 is prior art, not imported by this task. |
| Medium 314 and remaining semantic failures | Exact case failures and snapshots remain in combined-summary.json and raw reports. | Inspect current anonymous projection and the failed assertion before deciding whether runtime or test setup needs a focused change. No fabricated density/content or relaxed assertions. |
| Topic expression navigation | Original World test expects navigation to `/2029/number/98`; the Preview remains on `/topic/98-ikuv-geula`. Existing c2f2e994 G4 acceptance covers a synthetic 888 Topic's Number navigation/reload/return, which does not establish the precise 98 expression behavior. | Reconcile the 98 expression contract and current drawer/return behavior; this original World case remains failed. No UI or assertion change here. |
| Source projectors | Where the test advanced, writer projection and full Hashmal source were reached, including the original nonempty/private-leak/overflow checks; the complete case can still fail later at the old source filter. Some attempts stopped earlier on readiness/network. | Keep complete source cases open. Use per-case failure phase to avoid misreporting a later obsolete control as loss of the already-read source capability. |
| Access infrastructure | Expired/repeated temporary-share authentication and HTTP 503 blocked some attempts before application use. Those were retried separately with a renewed temporary link, bounded retries only for static-auth 429/502/503/504, then in-memory Vercel cookie reuse. | Raw access failures remain recorded. They are not product failures or successful application acceptance. Any remaining access blocker is listed explicitly. No deployment protection was disabled. |
| Live actions | No login/OTP/account mutation, saved conversation, community action, upload, avatar/claim/follow write, model submission or A3 trace persistence was exercised. | Test only with an isolated backend/fixtures or a separately authorized live task. This task provides no acceptance of these actions. |

## Safety boundary and adapters

Original `entry-learn-2029.spec.cjs` and `world2029-release.spec.cjs` came from c2f2e994. Their assertions, timeouts and retry count stayed unchanged. Two adaptations only: the BASE points to the existing hosted Preview, and a fixture installs independent deny-by-default transport before context use/authentication. Original/adapted hashes and the changes are in source-manifest.json. Supplementary tests are named separately.

Browser: Playwright 1.55.0, Chromium 154.0.8037.57 on Debian 13, host Node 24.19.0. This is local browser execution against hosted runtime, not a GitHub Actions run. The earlier offline Isolation component execution used Node 24.21.0 and remains separately documented.

The existing World pre-cutover fixture is retained: browser-local lock_world/lock_number flags are open and one sanitized group-source response is synthetic. Existing Storage/media placeholders and expected anonymous protected-read denials remain. None changes live flags, rows, RLS or Preview code. Positive fixture-enabled cases do not prove that every capability is publicly enabled by default, nor pixel/video fidelity of real media.

The independent guard blocks all Edge/model calls, auth/product writes, unreviewed RPCs, dynamic Preview endpoints, third-party traffic outside static fonts, and WebSockets. It applies to page and Service Worker network requests using Playwright's service-worker network interception. A real local Service Worker and page both attempted synthetic local POSTs in the preflight; the local sink received zero writes. No production endpoint was used for that probe.

Only inventoried RPCs are callable; their actual HTTP transport is **GET** so PostgREST executes a read-only transaction. Original browser RPC POSTs are fulfilled with that read result. Arguments match the inspected live signature; null arguments are omitted only when the catalog confirms a DEFAULT NULL. Other requests fail closed. Browser `response` logs may therefore say POST although no live POST was transmitted. Public REST GETs remain anonymous; no production service-role key was installed. Vercel cookies/access URLs stayed in process memory and are absent from the repository.

Network summary across recorded attempts: `{"auditFiles": 63, "actualLiveRpcGet": 407, "actualLiveRpcPost": 0, "productWrites": 0, "modelCalls": 0, "blockedEdgeAttempts": [], "transportErrors": 0, "blockedPaths": {"/rest/v1/rpc/canonical_follow_subject": 6}}`.

The original c2f2e994 Isolation report and its 96 hashed evidence files are permanently preserved next door: [report](../isolation-safe-components-c2f2e994-20261031/REPORT.md), [manifest](../isolation-safe-components-c2f2e994-20261031/evidence-manifest.json). These are the actual tested c2f2e994 results, not a new test run on this evidence commit.

## Per-case World outcomes

| Original line | Original case | Status | Classification |
|---|---|---|---|
| 137 | Core Web Vitals CLS budget holds on /2029 at 390px | passed | PASSED |
| 137 | Core Web Vitals CLS budget holds on /2029/number/1237 at 390px | passed | PASSED |
| 137 | Core Web Vitals CLS budget holds on /book/daat-tevunot at 390px | passed | PASSED |
| 137 | Core Web Vitals CLS budget holds on /books at 390px | passed | PASSED |
| 137 | Core Web Vitals CLS budget holds on /els at 390px | passed | PASSED |
| 137 | Core Web Vitals CLS budget holds on /topic/888-yeshua at 390px | passed | PASSED |
| 137 | Core Web Vitals CLS budget holds on /world at 390px | failed | CLS_THRESHOLD_FAILED_RETEST_RECORDED |
| 225 | direct /world opens public composed World with aircraft story, real arrivals and source navigation | failed | STALE_UI_EXPECTATION |
| 254 | public World catalog remains searchable and paginated inside the new composed presentation | failed | EXPECTED_PUBLIC_888_FIXTURE_ABSENT |
| 277 | native canonical Topic 2029 renders 888 with semantic links and SEO identity | failed | EXPECTED_PUBLIC_888_FIXTURE_ABSENT |
| 295 | Topic expression focus opens Number 2029 and survives World + Heichal transitions | failed | CONTEXTUAL_ROUTE_EXPECTATION_REQUIRES_RECONCILIATION |
| 337 | Number 2029 preview opens 1237 with all available methods visible in one wrapped research stage | passed | PASSED |
| 390 | Number 2029 596 keeps six methods visible and finds Jerusalem↔Shomrim as a live hidden crossing | passed | PASSED |
| 431 | Number 2029 1118 uses canonical Hebrew verse refs and appends the gematria value after the verse | passed | PASSED |
| 448 | Number 2029 global drawer reuses the same method-first Core and carries Raziel context | failed | STALE_UI_EXPECTATION |
| 510 | Contextual Number Surface stays one desktop sidecar through focus → preview → back | failed | STALE_UI_EXPECTATION |
| 541 | Number 2029 Miluy switches the whole stage to 878 with language bridges and in-place explain | passed | PASSED |
| 584 | Number 2029 878 keeps its general research path but no longer opens the locked Golden Journey | passed | PASSED |
| 608 | Number 2029 golden visual calibration covers 878, 358 and the 1326 visual target in Page and Drawer | failed | STALE_UI_EXPECTATION |
| 635 | Golden World 878 journey stays closed while the public Number 878 and full images remain readable | passed | PASSED |
| 671 | Public World story and source entry remain usable and overflow-free at 320px | failed | STALE_UI_EXPECTATION |
| 671 | Public World story and source entry remain usable and overflow-free at 360px | failed | STALE_UI_EXPECTATION |
| 671 | Public World story and source entry remain usable and overflow-free at 390px | failed | STALE_UI_EXPECTATION |
| 685 | RICH live World 1820 is truthful and overflow-free at 1440px | failed | STALE_UI_EXPECTATION |
| 685 | RICH live World 1820 is truthful and overflow-free at 320px | failed | STALE_UI_EXPECTATION |
| 685 | RICH live World 1820 is truthful and overflow-free at 360px | failed | STALE_UI_EXPECTATION |
| 685 | RICH live World 1820 is truthful and overflow-free at 390px | failed | STALE_UI_EXPECTATION |
| 696 | RICH 1820 presents one anchor header before profile and exploration lanes | failed | STALE_UI_EXPECTATION |
| 716 | RICH 1820 opens human-first before raw research detail | passed | PASSED |
| 756 | RICH 1820 projects real published media without legacy gallery UI | passed | PASSED |
| 773 | RICH 1820 remains useful when research rows are access-filtered | passed | PASSED |
| 788 | automatic filters, sorting and explain-why work without exposing admin research controls | passed | PASSED |
| 806 | MEDIUM live World 314 remains medium instead of being visually inflated | failed | BEHAVIOR_OR_FIXTURE_REQUIRES_REVIEW |
| 816 | SPARSE live World 122 stays honestly sparse with no fabricated research | passed | PASSED |
| 826 | World uses the shared Command, Inspect, Share and exact-return seams | failed | STALE_UI_EXPECTATION |
| 877 | loading and error states are honest and native | passed | PASSED |
| 901 | unavailable identity is not silently replaced by another anchor | failed | BEHAVIOR_OR_FIXTURE_REQUIRES_REVIEW |
| 910 | reduced motion preserves the same World meaning and controls | passed | PASSED |
| 922 | 320px RTL World survives 200% text zoom without horizontal overflow | passed | PASSED |
| 934 | private researcher corpus stays gated for non-admin 2029 sessions | passed | PASSED |
| 947 | source projector dark 1440: source-first writer and full Hashmal reading | failed | SOURCE_PROJECTOR_WAIT_OR_BEHAVIOR_OPEN |
| 947 | source projector dark 390: source-first writer and full Hashmal reading | timedOut | STALE_UI_EXPECTATION |
| 947 | source projector light 1440: source-first writer and full Hashmal reading | timedOut | STALE_UI_EXPECTATION |
| 947 | source projector light 390: source-first writer and full Hashmal reading | timedOut | STALE_UI_EXPECTATION |
| 947 | source projector parchment 1440: source-first writer and full Hashmal reading | timedOut | STALE_UI_EXPECTATION |
| 947 | source projector parchment 390: source-first writer and full Hashmal reading | timedOut | STALE_UI_EXPECTATION |

Detailed errors, selected final attempt and every attempt status are in [combined-summary.json](combined-summary.json). Raw reports, sanitized network audits and public error snapshots are under evidence/. Screenshots show only anonymous public/fixture-visible content; no authenticated private account was used.

No app/runtime/test-branch/guard/permission/Production configuration changes, merge or deployment were made. The unchanged Legacy Production lock check passed on the evidence checkout. The gpt/* deployment exclusion remains unchanged, and the evidence branch has no Vercel deployment.
