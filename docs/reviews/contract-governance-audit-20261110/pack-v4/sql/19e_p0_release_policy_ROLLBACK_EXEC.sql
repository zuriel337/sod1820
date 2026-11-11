-- SOD1820 · P0 release policy ROLLBACK — EXECUTION FORM of 19_p0_release_policy_ROLLBACK.sql. PROPOSAL ONLY. NOT EXECUTED.
-- Approved content: 19_p0_release_policy_ROLLBACK.sql SHA-256 cbe420f72e2ad43bcf244aee1e49dd363ead9f4d1b499000c2ebc3adc0b0d9c4.
-- Same guards and end state as 19_: codex #9/#4 bodies back to the exact base (md5 + SHA-256 + length), updated_at=now();
-- v4/v18/v8/v6 deactivated and v3/v17/v7/v5 reactivated (the new rows stay as inactive history; nothing is deleted).
-- Additionally refuses unless each base row exists with its base md5, and verifies one active base version per rule.
-- ONE statement (a single DO block). Requires ZURIEL's explicit approval of this exact file for one run.
do $sod_rbe$
declare v_txt text; v_ops text[]; v_pos int; i int; v_tgt text;
begin
  -- A. verify the applied state of all six before any write
  perform 1 from public.project_codex where id=9 for update;
  if (select md5(body) from public.project_codex where id=9) <> '8d87b8459f2fec3c25f9bf7cea443d3b' then raise exception 'rollback codex branches_deploy: body is not the applied version'; end if;
  perform 1 from public.project_codex where id=4 for update;
  if (select md5(body) from public.project_codex where id=4) <> 'f39efab93a4d4bfa851586d4fc4259f5' then raise exception 'rollback codex publishing_conventions: body is not the applied version'; end if;
  perform 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' for update;
  if not exists (select 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version=6 and is_active) then raise exception 'rollback system_suggestions_law: v6 is not the active version'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version=5 and not is_active and md5(description)='9b5c19de501b1985da01ddfc9c646d3c') <> 1 then raise exception 'rollback system_suggestions_law: base v5 row missing or changed'; end if;
  perform 1 from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' for update;
  if not exists (select 1 from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and rule_version=8 and is_active) then raise exception 'rollback foundation_closure_protocol_law: v8 is not the active version'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and rule_version=7 and not is_active and md5(description)='336934e50ca48dba8cb00cf64986b878') <> 1 then raise exception 'rollback foundation_closure_protocol_law: base v7 row missing or changed'; end if;
  perform 1 from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' for update;
  if not exists (select 1 from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and rule_version=18 and is_active) then raise exception 'rollback inter_agent_coordination_law: v18 is not the active version'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and rule_version=17 and not is_active and md5(description)='02d188d1b92e32ea51907d059b18c47f') <> 1 then raise exception 'rollback inter_agent_coordination_law: base v17 row missing or changed'; end if;
  perform 1 from public.nodes where type='rule' and rule_id='deploy_on_request' for update;
  if not exists (select 1 from public.nodes where type='rule' and rule_id='deploy_on_request' and rule_version=4 and is_active) then raise exception 'rollback deploy_on_request: v4 is not the active version'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='deploy_on_request' and rule_version=3 and not is_active and md5(description)='f93e73ce0ad3bc66457e6ff07cdb2322') <> 1 then raise exception 'rollback deploy_on_request: base v3 row missing or changed'; end if;

  -- B. project_codex #9 branches_deploy: restore the exact base body (4 fragments)
  v_tgt := 'rollback codex branches_deploy'; select body into v_txt from public.project_codex where id=9;
  v_ops := array[
    $sod_frag$
# Branches & Deploy — vercel.json re-read at main 932aba4bd (11.11.2026); release policy per ZURIEL 10.11.2026

Canonical owner: `deploy_on_request` (active version).
This codex is an opera$sod_frag$, $sod_frag$
# Branches & Deploy — Live 2026-09-23

Canonical owner: `deploy_on_request v2`.
This codex is an opera$sod_frag$,
    $sod_frag$t law.

## Production
- 2029 is the only active product: Production since 2026-11-04. Legacy was retired on 2026-11-05 and is not a deployment, Preview or rollback target.
- `main` is the release source, not an automatic deployment. A merge or push to `main` does not create a Production deployment: `git.deploymentEnabled=false` in both `vercel.json` roots (repository root and `public-reading-deploy`), and per CLAUDE.md the project's Ignored Build Step skips `main` builds.
- A Production deployment is a separate, manual action for an exact `main` SHA (Vercel MCP, per CLAUDE.md «נוהל פריסה ל-Production מסשן ענן»). Every merge to `main` and every Production deployment, alias change or rollback requires ZURIEL's explicit approval for that specific action. There is no standing authorization.
- Never use production$sod_frag$, $sod_frag$t law.

## Production
- `main` = production.
- Merge/push to `main` may create a production Vercel deployment and must follow the release owner/gates.
- Never use production$sod_frag$,
    $sod_frag$## Development branches
Current `vercel.json` (both roots) sets `git.deploymentEnabled: false` globally. By Vercel's semantics no branch — `main`, `gpt/*`, `claude/*`, `preview/*` or any other — creates a deployment merely by being pushed. (Live Vercel project settings were not re-read in this pass.)

Superseded, kept as history (2026-09-23): the per-branch map (`gpt/g3-topic-golden-slug-rank-foundation-v1` → true; `gpt/*` → false; `claude/*` → false) and the earlier `ignoreCommand` note no longer describe the configuration.

## Preview
A Preview deployment is created only as an explicitly approved, bounded action (CLAUDE.md rule 7: a protected Preview requires ZURIEL's explicit approval), from an exact approved artifact head, never as production (`target=null`). Verify before sharing: source artifact known; Preview target; `READY`; requested route returns HTTP 200. Generate/share a protected Preview URL when Deployment Protection is enabled. Never merge or promote a preview carrier branch.

Historical mechanism (2026-09-23): a `preview/*` carrier branch with an inert marker commit triggered Vercel Git Integration because `preview/*` was outside the blocked namespaces. With the global `deploymentEnabled: false` a push to `preview/*` no longer deploys by itself; the record below is provenance only.

## F11 proof (historical, 2026-09-23)
On 2026-09-23:
- canoni$sod_frag$, $sod_frag$## Development branches
Live `vercel.json` currently uses `git.deploymentEnabled`:
- `gpt/g3-topic-golden-slug-rank-foundation-v1` → true (historical explicit exception)
- `gpt/*` → false
- `claude/*` → false

Therefore normal GPT/CLAUDE development branches intentionally do **not** create Vercel Preview deployments and do not consume deployment quota.

This supersedes the old operational note that `ignoreCommand` is the live non-main mechanism. Live verification on 2026-09-23 found no such active `ignoreCommand`; branch filtering is currently implemented by `git.deploymentEnabled`.

## Authorized Preview lane
Reserved branch namespace: `preview/*`.

Purpose:
- Human Visual Gate / temporary branch preview only.
- Created only when preview/release is authorized by ZURIEL or the active release owner permits it.
- Source must be an exact approved artifact head.
- If branch creation alone does not fire Vercel Git Integration, create one inert carrier/marker commit on the `preview/*` branch to produce a real push event.
- Marker must not modify application behavior.
- Verify Vercel deployment metadata before sharing:
  - Git ref starts with `preview/`;
  - source artifact is known;
  - `target=null` / Preview, never production;
  - deployment reaches `READY`;
  - requested preview route returns HTTP 200.
- Generate/share a protected Preview URL when Deployment Protection is enabled.
- Never merge/promote a preview carrier branch.
- Close/delete preview carrier after Human Visual review when no longer needed.

Why this works:
Vercel `deploymentEnabled` uses minimatch; unspecified branches default to deployment enabled. The current `gpt/*` and `claude/*` rules remain false, while `preview/*` is outside those blocked namespaces.

## F11 proof
On 2026-09-23:
- canoni$sod_frag$,
    $sod_frag$nged.

## Safety
Do not enable Git deployments (globally or per branch) merely to get a Preview. Preview and Production creation remain explicit, bounded, approved actions.$sod_frag$, $sod_frag$nged.

## Safety
Do not broaden `gpt/*` or `claude/*` to true merely to get a Preview.
Use `preview/*` so development remains quota-protected and Preview creation remains an explicit, bounded action.
$sod_frag$
  ];
  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop
    v_pos := strpos(v_txt, v_ops[i]);
    if v_pos = 0 then raise exception 'P0e %: fragment % not found', v_tgt, (i + 1) / 2; end if;
    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception 'P0e %: fragment % not unique', v_tgt, (i + 1) / 2; end if;
    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));
  end loop;
  if md5(v_txt) <> '6cee6559506bba1be4f1e71a86693285' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> 'f4101ac687759b4c9ab51f3f5c70a06da574395989f687e4e3218963352640c8' or char_length(v_txt) <> 2780 then
    raise exception 'P0e %: rebuilt text differs from the base body (md5 %)', v_tgt, md5(v_txt);
  end if;
  update public.project_codex set body=v_txt, updated_at=now() where id=9;

  -- C. project_codex #4 publishing_conventions: restore the exact base body (5 fragments)
  v_tgt := 'rollback codex publishing_conventions'; select body into v_txt from public.project_codex where id=4;
  v_ops := array[
    $sod_frag$e:
- Same Post identity across historical (WordPress/Legacy-era) records and 2029.
- Source witn$sod_frag$, $sod_frag$e:
- Same Post identity in legacy and 2029.
- Source witn$sod_frag$,
    $sod_frag$מקור כדי לכפות צבעי 2029. (תצוגת Legacy אינה קיימת עוד מאז 5.11.2026.)
9. VISUAL ACCEPTANCE: ל$sod_frag$, $sod_frag$מקור כדי לכפות צבעי 2029 או שינוי של תצוגת Legacy.
9. VISUAL ACCEPTANCE: ל$sod_frag$,
    $sod_frag$ינו מתיר פרסום אוטומטי. היעד הוא 2029 — המוצר הפעיל היחיד (Legacy פרש ב-5.11.2026 ואינו יעד פרסום); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג או פריסה.
2. מסלול ChatGPT בבריר$sod_frag$, $sod_frag$ינו מתיר פרסום אוטומטי. מכבדים את היעד שנקבע (Legacy, 2029, או אחר); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג, פריסה או העלאה כפולה לשתי המערכות.
2. מסלול ChatGPT בבריר$sod_frag$,
    $sod_frag$וגה בפועל במובייל/דפדפן ב-2029. DB INSERT/UPDATE לבדו $sod_frag$, $sod_frag$וגה בפועל במובייל/דפדפן וביעד שנתבקש, לרבות Legacy אם הוזכר. DB INSERT/UPDATE לבדו $sod_frag$,
    $sod_frag$לא לכל שערי הפרסום.

—— POST MODIFIED DATE REQUIRED · 27.10.2026 · re-scoped to 2029 on 10.11.2026 · publishing_conventions operational correction ——
כש-ChatGPT או כל סוכן אחר מפרסם פוסט חדש ב-public.posts, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: קוראי 2029 ממיינים לפי modified DESC NULLS LAST (getLatestPostCards ב-src/lib/supabase.js; fetchPostsCatalog2029 ו-fetchPostSearchSuggestions2029 ב-src/lib/research/postsCatalog2029Projection.js), והיעדר modified עלול להוריד פוסט חדש לתחתית הרשימות. (ב-27.10 נכתב הכלל עבור דף הבית של Legacy, fetchHomePosts, שהוסר ב-5.11.2026; הדרישה נשארת בתוקף ב-2029.) modified קובע סדר בלבד ואינו אות ל״עדכון חדש״ (SOD1820_DESIGN_CONTRACT_V2.md §8.1). לאחר כתיבה לוודא שהפוסט מופיע בראש רשימות הפוסטים של 2029, אינו טיוטה/פורום/מוסתר מהבית, ונראה בפועל; לא לשנות קוד, פריסה, P$sod_frag$, $sod_frag$לא לכל שערי הפרסום.

—— LEGACY MODIFIED DATE REQUIRED · 27.10.2026 · publishing_conventions operational correction ——
כש-ChatGPT מפרסם פוסט חדש ב-public.posts לצפייה ב-Legacy או כפרסום משותף, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: ה-Legacy Home fetchHomePosts בגרסה הפעילה ממיין לפי modified DESC NULLS LAST, והיעדר modified עלול להוריד פוסט חדש לתחתית ולהעלימו מ״עדכונים אחרונים״ למרות home_hidden=false. לאחר כתיבה לוודא שהפוסט נכנס ל-32 התוצאות הראשונות, אינו טיוטה/פורום/לא-בבית, ונראה בפיד; לא לשנות קוד, פריסה, P$sod_frag$
  ];
  for i in 1 .. coalesce(array_length(v_ops, 1), 0) by 2 loop
    v_pos := strpos(v_txt, v_ops[i]);
    if v_pos = 0 then raise exception 'P0e %: fragment % not found', v_tgt, (i + 1) / 2; end if;
    if strpos(substr(v_txt, v_pos + 1), v_ops[i]) > 0 then raise exception 'P0e %: fragment % not unique', v_tgt, (i + 1) / 2; end if;
    v_txt := overlay(v_txt placing v_ops[i + 1] from v_pos for char_length(v_ops[i]));
  end loop;
  if md5(v_txt) <> '26b473b72d55c57153c6678543d25094' or encode(sha256(convert_to(v_txt, 'UTF8')), 'hex') <> '53547ce989096d137c869c8bf08ffac7f63d38fbda2367c15b4abeebd473e843' or char_length(v_txt) <> 72651 then
    raise exception 'P0e %: rebuilt text differs from the base body (md5 %)', v_tgt, md5(v_txt);
  end if;
  update public.project_codex set body=v_txt, updated_at=now() where id=4;

  -- D. rules: deactivate the new version, reactivate the base version (same order as 19_)
  update public.nodes set is_active=false where type='rule' and rule_id='system_suggestions_law' and rule_version=6;
  update public.nodes set is_active=true  where type='rule' and rule_id='system_suggestions_law' and rule_version=5;
  update public.nodes set is_active=false where type='rule' and rule_id='foundation_closure_protocol_law' and rule_version=8;
  update public.nodes set is_active=true  where type='rule' and rule_id='foundation_closure_protocol_law' and rule_version=7;
  update public.nodes set is_active=false where type='rule' and rule_id='inter_agent_coordination_law' and rule_version=18;
  update public.nodes set is_active=true  where type='rule' and rule_id='inter_agent_coordination_law' and rule_version=17;
  update public.nodes set is_active=false where type='rule' and rule_id='deploy_on_request' and rule_version=4;
  update public.nodes set is_active=true  where type='rule' and rule_id='deploy_on_request' and rule_version=3;

  -- E. final cross-check
  if (select count(*) from public.nodes where type='rule' and rule_id='deploy_on_request' and is_active and rule_version=3 and md5(description)='f93e73ce0ad3bc66457e6ff07cdb2322') <> 1 or (select count(*) from public.nodes where type='rule' and rule_id='deploy_on_request' and is_active) <> 1 then raise exception 'rollback final: deploy_on_request base v3 not the single active version'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and is_active and rule_version=17 and md5(description)='02d188d1b92e32ea51907d059b18c47f') <> 1 or (select count(*) from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and is_active) <> 1 then raise exception 'rollback final: inter_agent_coordination_law base v17 not the single active version'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and is_active and rule_version=7 and md5(description)='336934e50ca48dba8cb00cf64986b878') <> 1 or (select count(*) from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and is_active) <> 1 then raise exception 'rollback final: foundation_closure_protocol_law base v7 not the single active version'; end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active and rule_version=5 and md5(description)='9b5c19de501b1985da01ddfc9c646d3c') <> 1 or (select count(*) from public.nodes where type='rule' and rule_id='system_suggestions_law' and is_active) <> 1 then raise exception 'rollback final: system_suggestions_law base v5 not the single active version'; end if;
  if (select md5(body) from public.project_codex where id=4) <> '26b473b72d55c57153c6678543d25094' then raise exception 'rollback final: codex publishing_conventions not restored'; end if;
  if (select md5(body) from public.project_codex where id=9) <> '6cee6559506bba1be4f1e71a86693285' then raise exception 'rollback final: codex branches_deploy not restored'; end if;
  raise notice 'P0e rolled back: v3/v17/v7/v5 active again, codex #4/#9 base bodies restored';
end
$sod_rbe$;
