import pathlib,json,shutil,re,hashlib,collections
src=pathlib.Path(__file__).parent
dst=pathlib.Path('/workspace/sod1820-isolation-evidence/docs/reviews/protected-entry-world-63e6882c-20261031')
dst.mkdir(parents=True,exist_ok=True)
summary=json.loads((src/'combined-summary.json').read_text())
shutil.copy2(src/'combined-summary.json',dst/'combined-summary.json')
for name in ['source-manifest.json','rpc-read-inventory.json','target-identity.json']:
    shutil.copy2(src/name,dst/name)
harness=dst/'harness';harness.mkdir(exist_ok=True)
for f in src.iterdir():
    if f.is_file() and f.suffix in ['.cjs','.py','.json'] and f.name!='combined-summary.json':shutil.copy2(f,harness/f.name)
(harness/'tests').mkdir(exist_ok=True)
for f in (src/'tests').iterdir():
    if f.is_file() and f.suffix=='.cjs':shutil.copy2(f,harness/'tests'/f.name)
for folder in ['results-initial-transport-run','results','results-retry-auth','results-remaining','results-focused','results-focused-retry']:
    target=dst/'evidence'/folder;target.mkdir(parents=True,exist_ok=True)
    for f in (src/folder).iterdir():
        if f.is_file() and f.suffix in ['.json','.log','.txt']:shutil.copy2(f,target/f.name)
    if (src/folder/'test-results').exists():
        for f in (src/folder/'test-results').rglob('*'):
            if f.is_file() and f.suffix in ['.json','.md']:
                out=target/'test-results'/f.relative_to(src/folder/'test-results');out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,out)
(dst/'screenshots').mkdir(exist_ok=True)
images=['public-flight-post-entry-390.png','world-current-public-catalog-390.png','world-human-projection-1820-390.png','world-partial-access-1820-390.png','world-sparse-122-390.png','researcher-corpus-gated-390.png','writer-projector-light-390.png','hashmal-projector-light-390.png']
for name in images:
    f=src/'test-results/release-visual'/name
    if f.exists():shutil.copy2(f,dst/'screenshots'/name)
world=summary['world'];counts=summary['worldCounts'];classes=summary['worldClassifications']
rows='\n'.join('| '+str(c['line'])+' | '+c['title']+' | '+c['status']+' | '+c['classification']+' |' for c in world)
passed='\n'.join('- '+c['title'] for c in world if c['status']=='passed')
report=f'''# Protected Preview Entry / World — safe acceptance evidence

נבדק הפריוויו הקיים **63e6882c** באמצעות בדיקות המקור מ־**c2f2e994**. ענף הבדיקות לא זז. מתוך 46 תרחישי World מקוריים: **{counts.get('passed',0)} עברו; {counts.get('failed',0)} נכשלו ו־{counts.get('timedOut',0)} נעצרו בזמן הקצוב**. שני תרחישים משלימים עם מידע ציבורי אמיתי עברו. בדיקות בנט המקוריות נשארו פתוחות בגלל טיוטה שאינה ציבורית. **A3 ושער Isolation המלא נשארו פתוחים.**

מבין 25 תרחישי World שלא עברו, 18 נעצרו בציפיות תצוגה/כפתורים ישנים, שניים תלויים בנושא הציבורי 888 שאינו קיים, אחד דורש בירור חוזה הניווט ההקשרי, שניים דורשים בירור מצב/מידע (314 ומזהה שאינו זמין), אחד נעצר בהמתנת מקור ואחד חרג בסף CLS. לא שינינו בדיקות כדי להציג הצלחה, ולא שונו נתונים חיים, מודלים, הרשאות או הגנות יישום.

## Exact provenance

- Application tested: **63e6882c3b7b4004d337927c7231728a7612d452**, existing protected Preview `dpl_Aa8o4Cr61VawivzJodti8KTsecB2`.
- URL: https://sod1820-26of53pw9-sod1820-s-projects.vercel.app/2029
- Original test source: **c2f2e9948dd119c96b69e377b33be2eb2a886efb**, branch `gpt/2029-ci1185-acceptance-reconcile-20261031`. That local and remote branch was not moved.
- This separate evidence branch is `gpt/2029-isolation-evidence-preview-acceptance-20261031`; its later documentation commit is not the application/test SHA.
- Coordination BEFORE: `885c91d2-b660-46a7-a257-4b4568f58baa`; passive ZURIEL reporting only.
- **A3 and the full Isolation gate remain OPEN. No full GitHub Isolation workflow was dispatched or marked passed.**

## Results

All 46 unique cases from the original World spec were selected across the main and focused executions. Current consolidated outcomes: **{counts}**. An observed CLS failure remains a failure/open item even though a focused repeat passed. Do not sum repeated attempts as unique tests.

Classifications: `{json.dumps(classes,ensure_ascii=False)}`.

The two original Entry cases depend on Bennett's authored post. The first reached an unavailable public Post and failed; the second was skipped by the original serial suite. Dedicated read-only verification confirmed the expected Bennett slug is currently a draft. Both original Entry acceptances remain OPEN; no draft was published/restored and no private draft content was exported. The public `888-yeshua` topic is absent (0 rows; there are 204 other public topic rows at verification time).

Two supplementary, explicitly separate checks passed: public Flight Post entry/orientation at 390px, and current real public World catalog search/expansion from 8 to 24 visible cards. They do not replace the failed original cases and do not manufacture a published Bennett/888 record.

## What passed in the original World suite

{passed}

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

Network summary across recorded attempts: `{json.dumps(summary['network'],ensure_ascii=False)}`.

The original c2f2e994 Isolation report and its 96 hashed evidence files are permanently preserved next door: [report](../isolation-safe-components-c2f2e994-20261031/REPORT.md), [manifest](../isolation-safe-components-c2f2e994-20261031/evidence-manifest.json). These are the actual tested c2f2e994 results, not a new test run on this evidence commit.

## Per-case World outcomes

| Original line | Original case | Status | Classification |
|---|---|---|---|
{rows}

Detailed errors, selected final attempt and every attempt status are in [combined-summary.json](combined-summary.json). Raw reports, sanitized network audits and public error snapshots are under evidence/. Screenshots show only anonymous public/fixture-visible content; no authenticated private account was used.

No app/runtime/test-branch/guard/permission/Production configuration changes, merge or deployment were made. The unchanged Legacy Production lock check passed on the evidence checkout. The gpt/* deployment exclusion remains unchanged, and the evidence branch has no Vercel deployment.
'''
(dst/'README.md').write_text(report)
manifest=[]
for f in sorted(dst.rglob('*')):
    if not f.is_file():continue
    if f.suffix in ['.json','.md','.log','.txt','.cjs','.py']:
        text=f.read_text()
        if re.search(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|_vercel_share=[A-Za-z0-9_-]+',text):raise RuntimeError('Secret-pattern scan failed: '+str(f))
    manifest.append({'file':str(f.relative_to(dst)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(dst/'evidence-manifest.json').write_text(json.dumps({'testSourceSha':summary['testSourceSha'],'runtimeSha':summary['runtimeSha'],'files':manifest},indent=2)+'\n')
print('Preserved',len(manifest),'sanitized files,',sum(x['bytes'] for x in manifest),'bytes')
