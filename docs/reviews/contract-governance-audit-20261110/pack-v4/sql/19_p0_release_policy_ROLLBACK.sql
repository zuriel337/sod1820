-- SOD1820 · P0 release policy ROLLBACK — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and the live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies the result md5.
-- Version bumps follow the existing mechanism: old active row -> is_active=false, new row v+1 with supersedes_version=v
-- (trg_rule_compaction_integrity_guard_v1 validates; governed metadata is carried over). Nothing is deleted.
begin;

-- rollback project_codex #9 branches_deploy: restore the exact base body (md5 6cee6559506bba1be4f1e71a86693285)
do $sod_rb$
begin
  if (select md5(body) from public.project_codex where id=9) <> '8d87b8459f2fec3c25f9bf7cea443d3b' then raise exception 'rollback codex branches_deploy: body is not the applied version'; end if;
  update public.project_codex set body=$sod_txt$
# Branches & Deploy — Live 2026-09-23

Canonical owner: `deploy_on_request v2`.
This codex is an operational projection of the live owner + current `vercel.json`; it is not a second deployment law.

## Production
- `main` = production.
- Merge/push to `main` may create a production Vercel deployment and must follow the release owner/gates.
- Never use production as a workaround for Preview tooling.

## Development branches
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
- canonical F11 app artifact: PR #632 head `a00965851deb98b4601f1e38389a543fea49a850`
- preview branch: `preview/f11-raziel-consumer-a0096585`
- inert trigger commit: `facbb942874307a0114bef40bab60a5d55a88d3e`
- Vercel deployment: `dpl_H5v9KuyiTDWECXFnvyMbog669YHU`
- target: Preview (`null`), not production
- state: READY
- route `/2029/preview/synthesis/1820`: HTTP 200
- production/main unchanged.

## Safety
Do not broaden `gpt/*` or `claude/*` to true merely to get a Preview.
Use `preview/*` so development remains quota-protected and Preview creation remains an explicit, bounded action.
$sod_txt$, updated_at=now() where id=9;
end
$sod_rb$;

-- rollback project_codex #4 publishing_conventions: restore the exact base body (md5 26b473b72d55c57153c6678543d25094)
do $sod_rb$
begin
  if (select md5(body) from public.project_codex where id=4) <> 'f39efab93a4d4bfa851586d4fc4259f5' then raise exception 'rollback codex publishing_conventions: body is not the applied version'; end if;
  update public.project_codex set body=$sod_txt$(מקור: CLAUDE.md — לכבד תמיד)
- פוסט על אירוע שקורה / חדשות / תיעוד בזמן אמת → קטגוריה `תיעוד אירועים`.
- קטגוריות ותגיות: להשתמש בקיימות, לא להמציא כפילויות. לבדוק לפני פרסום: `select distinct unnest(categories) from posts;` / `... unnest(tags) ...`.
- לקשר פוסטים קשורים: בלוק «ראו גם» בתחתית התוכן עם `<a href="/<slug>">`.
- תמונה ראשית: אפשר שימוש חוזר ב-image_url של פוסט קשור (כדי שתופיע גם בדף הבית/רשימות).
- יצירה ידנית: `insert into posts (id, wp_id, ...) overriding system value values (...)` עם id/wp_id מעל ה-max; source='ai' לפוסט שנכתב ב-AI.
- כותב (author): ריק → מוצג "המערכת" (לוגו). קטגוריית `התחזקות` → כותב "מזכה הרבים". מרשם: src/lib/authors.js. הערה: בדף הפוסט תיבת הכותב מוסתרת כשהכותב הוא "המערכת" (ברירת מחדל) — מוצגת רק לכותב אמיתי.
- תווית אימות AI (verified/ai_touched): מפעילים רק כשה-AI אימת ידיעה ממקור מפוקפק — לא לכל פוסט שנכתב ב-AI (כתיבה ב-AI = source='ai' בלבד).

—— הרחבת Content Foundation (26.8.2026 · מאושר ZURIEL · SOD1820_CONTENT_FOUNDATION_CONTRACT.md) ——
- קטגוריית `רמזים חזקים` = בחירת-עריכה ברף-גבוה, לא-מוגבלת-לפי-כותב. Human-Gate = ZURIEL רשאי לשייך אליה גם תוכן של יוצר-חיצוני. [גובר על הנוסח הישן «רמזים חזקים = צוריאל-בלבד» ב-CLAUDE.md — Decision #6.]
- יוצר-חיצוני: author='<שם היוצר>' (מרשם src/lib/authors.js). מדיה-חיצונית (טיקטוק/יוטיוב/ריל) נשמרת עם קרדיט-מקור גלוי בגוף הפוסט (attribution).
- תוספת-מערכת על פוסט-כותב-חיצוני (System Addition, Decision #7): חייבת להיות מובחנת חזותית מדברי-הכותב, ולהישמר בשדה posts.ai_addition הקיים (⛔ אין storage חדש). דוגמה חיה: פוסט 5081 («78=מחל»).
- Taxonomy = 4 צירים אורתוגונליים: Series (תג «מימד חמש») ≠ Category (posts.categories) ≠ Medium (נגזר-מהתוכן) ≠ Representation (קוד-רינדור). מקור-Foundation: SOD1820_CONTENT_FOUNDATION_CONTRACT.md.

—— פרוטוקול פרסום פוסטי המערכת · הרחבה מאושרת 7.9.2026 · v1 ——
בעלות: הרחבת publishing_conventions הקיים, לא פרוטוקול/מאגר/מסלול פרסום מקביל. חל על פוסטי המערכת בכלל, לא רק על סדרת «מימד חמש». מקור ההרחבה: הוראת המשתמש הישירה להעביר את שתי תיבות ההבהרה לסוף הפוסט ולהסיר את שמו מהניסוח הציבורי; מקרה הכיול הוא posts.id=5098/wp_id=37034.

1. קול ציבורי וזהות. פוסט מערכת מדבר בשם «המערכת»/«אנחנו» או בניסוח ענייני, לפי post_system_voice_law. אין להוסיף את שמו האישי של בעל האתר בגוף פוסטי המערכת, בהסבר השיטה, בחתימה או בקרדיט-עריכה כברירת מחדל. לכתוב «לפי שיטת־האחד», ולא לייחס את הניסוח הציבורי אישית לבעל האתר. חריג של חתימה/עדות אישית דורש בקשה מפורשת. האיסור ההיסטורי ב-zuriel_surname_privacy_law הוא על שם המשפחה; אין להציג אותו כאילו כבר אסר במפורש כל אזכור של שם פרטי. ההנחיה הנוכחית מבהירה את התצוגה בפוסטי המערכת. אין להסיר שמות של מושאי המחקר או קרדיט אמיתי של יוצר חיצוני מכוח כלל זה.

2. סדר הקריאה. גוף הפוסט והמסר קודם; אחריו בסוף, לפני «ראו גם» והפניות הסיום, תיבות ההבהרה של הבינה כשהן מובחנות מדברי הפוסט. סעיף המערכת החדשה והקישורים, כשנתבקשו, נשאר בתחתית. הבסיס: ai_disclaimer_law §2 קובע שתוספת הבינה באה אחרי טקסט המקור; post_gematria_box_law קובע שהקורא נכנס קודם לתוכן, והריבוע מחזק את הקריאה ולא פותח אותה. שתי תיבות הבהרה אינן «ריבוע שוויון מאומת»: תנאי שוויון של לפחות שני ביטויים נשאר חל על ריבוע הגימטריה הקנוני בלבד. אין להקדים נספח הסבר בגלל שמו הטכני של שדה או מיקום הרכיב הקיים. עדכון על אירוע חדש הוא סוג תוכן אחר: post_update_on_top ממשיך לחול עליו, ולא על הערות חישוב/עריכה. הודעת גילוי קצרה בראש, אם נדרשת, אינה תחליף לנספח ואינה סיבה להעביר את הנספח למעלה.

3. שמירת הנוסח והמיקוד. לא משכתבים את הסיפור, לא מוסיפים ממצאים שלא נבחרו ולא הופכים בדיקת חישוב לנרטיב חדש. תיקון עובדתי הכרחי מסומן ומקושר להבהרה בסוף. משפט שמפנה ל«ראש הפוסט» חייב להתעדכן כשהתיבה הועברה לסוף. כותרת, slug, מקורות, מדיה ותגיות נשמרים אלא אם נתבקשה עריכתם במפורש; zuriel_focus_law נשאר בעל הסמכות למיקוד.

4. מקור, ניסוח ואמת נפרדים. הקורא רואה סימון ברור לתוספת בינה, אך אין צורך לחשוף את שם בעל האתר כדי לסמן אותה. בתיעוד המקור והגרסאות שומרים בנפרד את מקור הרעיון/הכלל, מי ניסח, מי ערך, מי ביצע שמירה ואיזה אישור ניתן. אישור לפרסם אינו הופך טקסט בינה לטקסט אנושי; שינוי התווית הציבורית אינו מוחק מקור. לא מסיקים מחבר לפי source='ai', הדבקה או ניחוש סגנוני בלבד; מקור היסטורי לא ידוע נשאר לא ידוע. חישוב מאומת ≠ פרשנות מאומתת; ai_touched ≠ verified; אין לכנות פוסט שלם «מאומת» בגלל תוספת בינה. בעל הסמכות: truth_axes_foundation_law והחוזים הקיימים, לא מאגר ייחוס חדש.

5. מקור חיצוני ומימד חמש. Content Foundation Decision #7 נשאר בתוקף: תוספת מערכת על פוסט של יוצר חיצוני מובחנת חזותית ונשמרת ב-posts.ai_addition; שומרים קרדיט מקור. אין להפוך את עריכת המיקום המקומית בפוסט מערכת 5098 להוראת העברה של כל ai_addition לתוכן. dim5_upload_law מוסיף דרישות סדרה/מדיה/תמלול/תרגום/קרדיט מעל פרוטוקול זה; הוא אינו תחליף למוסכמות הפרסום הכלליות.

6. בדיקה לפני סיום. לקרוא את החוקים והפרוטוקול העדכניים לפני עריכה; לשמור צילום-לפני ואחרי ב-post_revisions; לבדוק שאין שם אישי לא-מורשה בניסוח הציבורי, שתיבות הבינה נמצאות פעם אחת ובסוף, שהטקסט המקורי נשמר ושכל הפניה מתאימה למיקומה וליעדה. קישורים גולמיים למערכת בבנייה מותרים לבקשת המשתמש עם ציון שהחיבורים עדיין בתהליך. לבדוק קריאות במובייל ובשני המצבים; אם תצוגת האתר לא נבדקה, לדווח זאת ולא להכריז שנבדקה. אימות DB ≠ אימות דפדפן; פרוטוקול שמור ≠ אכיפה אוטומטית בכל מסלולי השמירה.

מצב יישום 7.9.2026: הפרוטוקול עודכן בקודקס החי; בפוסט 5098 מיושמת הוראת המיקום והניסוח כעריכת תוכן תחומה עם סימון מקור לכל תיבה וגרסאות שמורות. התאמה כללית של רכיב התצוגה העליון וניתוק תג הבינה מתג האימות עדיין דורשים שינוי קוד נפרד. לא נוצרה טבלה, לא שונו חוקים מספריים, ולא הוטמעה אכיפה אוטומטית לכל האתר.


—— POST CATEGORY SEMANTIC GUIDANCE V1 · Human-Gate ZURIEL · 7.9.2026 ——
Purpose: semantic guidance for future Post→One Tree / Explorer / Research projections. This extends existing publishing_conventions only. Category labels are NOT automatic Topic/node/edge promotion. Preserve Foundation→Projection→Experience and Human Gate.

1) `תיעוד אירועים` — broad world/reality documentation bucket: current events, world events, natural events/disasters, time-related occurrences and similar reality-stream material. Treat as a strong Event/Time/Reality evidence source for future extraction, but the category itself is not a single canonical Topic.

2) `רמזים חזקים` — the editorial essence/core of SOD1820. Highest-priority legacy/live research corpus for deep semantic extraction and One Tree connection. It remains an editorial high-bar classification, not an epistemic truth state: Strong Hint != Fact/Canonical. Human Gate remains ZURIEL.

3) `צפונות בתורה` — Torah hidden-pattern/ELS-oriented material. Cross-cutting by nature: may overlap with event documentation and other categories. Future projection should connect source/verse/ELS/result/topic/event where evidenced, without duplicating the ELS engine or assuming every post relation is canonical.

4) `מימד חמש` — a distinct conceptual/series world associated by ZURIEL with Mashiach / "חמישי" / New-H and with ideas that can conflict with conventional religious framing. Important future source of concepts/terms for One Tree. Extract concepts and relations from post content/tags with provenance; do not treat the category label alone as proof of a canonical concept/relation.

5) `סוד האותיות והמספרים` — very high-value corpus for legacy and newer connections between numbers, letters, phrases and concepts. Priority source for Number↔Phrase↔Concept↔Method/Source relation candidates. Deep scan is warranted when Post→One Tree ingestion is authorized.

6) `גלריות גימטריה` — legacy post-embedded gallery category. Often duplicates or partially overlaps images already present in gallery systems, sometimes only a subset (e.g. first images embedded in a post). Duplicate representations may remain, but future model must link equivalent/related images and post/gallery provenance so the same underlying visual evidence is not mistaken for two independent findings. Representation != Placement/Occurrence. Do not delete duplicates merely to normalize appearance.

7) `גימטריות` — older/more mixed bucket for gematria lists/calculations. Valuable but semantically noisier than `סוד האותיות והמספרים`; requires scan/classification rather than automatic graph promotion.

8) `סוד החשמל` — large, high-value corpus expected to contain many concepts and cross-connections useful to One Tree. Requires deep semantic scan before promotion; category membership alone does not authorize node/edge creation.

Operational consequence for Post→One Tree Foundation:
- Rank, Don’t Hide: use these categories as corpus-priority/evidence signals, not truth tiers.
- Posts/content/tags/categories are extraction inputs. Canonical Entity/Topic/Relation promotion remains separate and Human-Gated where required.
- Prefer linking to existing canonical Number/Topic/Person/Source/Book/Year/Event/ELS identities rather than creating parallel post-specific entities.
- For gallery overlap, preserve both representations when useful but record/link provenance/equivalence; never count duplicate representations as independent evidence.
- Future agents should read this block before designing post ingestion/backfill, category-to-topic mapping, or Post→One Tree projection.


—— POST PERSON ROLE GUIDANCE V1 · Human-Gate ZURIEL · 7.9.2026 ——
For Post→One Tree semantic extraction, repeated person tags must be role-routed before identity promotion. Tag recurrence does NOT imply writer/contributor identity.

- `עמיחי רז` — should have a Writer/Contributor page in the future; do not model merely as generic world-person when resolving post authorship/research attribution.
- `ליאור שטרית` — should have a Writer/Contributor page in the future.
- `יניב לוי` — already has an existing writer/contributor identity; reuse it, do not create a duplicate.
- `ציון סיבוני` — already has an existing writer/contributor identity; reuse it, do not create a duplicate.
- `נתניהו` — world leader / Person domain, NOT a SOD1820 writer. Route to canonical Person/Event/World relations as appropriate.
- `טראמפ` — world leader / Person domain, NOT a SOD1820 writer. Route to canonical Person/Event/World relations as appropriate.

Operational rule: Person Role ≠ Tag ≠ Writer. Resolve existing contributor/person identity first; only then propose promotion. Do not create Writer pages for public figures merely because they recur in posts.


—— GOLDEN POST / GEMATRIA RESEARCH PROJECTION V1 · Human-Gate ZURIEL · 8.9.2026 ——

This block extends existing publishing_conventions only. It does not create a post engine, template store, gematria engine, method registry, topic store, or graph. FOUNDATION → PROJECTION → EXPERIENCE.

1) AUTHOR-VERBATIM IRON RULE. When ZURIEL authors the body of a post, his authored text is preserved 100% verbatim in wording and order unless he explicitly asks for editing. No AI-authorship/verification box, disclaimer, badge or machine-written heading may precede or interrupt his authored body. After his authored body ends, a visually distinct box titled «תוספת הבינה המלאכותית» may verify dates, calculations, sources, engine outputs and clearly separated interpretations. AI may not silently rewrite the source text. This Human-Gate decision supersedes older public-placement instructions that put an AI verification box at the top; implementation drift must be reconciled in code separately.

2) CATEGORY RELATION FOR NEW POSTS. `תיעוד אירועים` is the broad event/reality category. `רמזים חזקים` is an editorial research classification inside that world for new content: every newly classified `רמזים חזקים` post must also carry `תיעוד אירועים`; not every `תיעוד אירועים` post is `רמזים חזקים`. Historical category drift is preserved until a separately authorized governed backfill; do not mass-rewrite legacy posts. Strong Hint ≠ Fact/Canonical.

3) GEMATRIA POST CARD / PUBLIC «מפת הגימטריה». This is a reusable projection of the canonical gematria Registry + Method Trace, not the legacy equality-only `sod-gematria-box` and not a new calculator. The card keeps a stable familiar software-like frame in light+dark modes. Core rows are always visible first in this order unless Human Gate changes it: רגיל · גדול · משולש/קדמי · ריבוע · מילוי · מסתתר. Additional methods are contextual and shown only when relevant/selected for the post. Selected values may be visually highlighted.

4) CARD INTERACTION. Recommended tabs: `מילה | חישוב | רמזים`. Tapping a method opens its canonical calculation trace; tapping a number may open a bounded preview and continue to the existing Number/Research Context rather than losing the post. The `רמזים` tab shows only selected relevant convergences/links, not an exhaustive target-fitting dump. Premium may unlock depth, traces, examples and research paths; entitlement changes access/depth, never truth.

5) METHOD/RULE LINKS. Wherever a post uses a gematria method or a System Method, its label should be addressable to the canonical explanation/application history when that projection exists. Post text remains narrative-first; research depth is projected from the one system.

6) GOLDEN STATUS. posts.id=5097 remains the current Golden exemplar for `מימד חמש`. The next Golden design line is `תיעוד אירועים + רמזים חזקים`, to be proven on one bounded post before any corpus-wide backfill.


—— PUBLIC POST VOICE 2029 V1 · Human-Gate ZURIEL · 15.9.2026 ——

Purpose: define the forward public language of SOD1820 posts without changing Truth/Governance semantics. This extends `publishing_conventions` only; it creates no new content system, truth layer or style engine.

1) PUBLIC VOICE = NARRATIVE, WONDER, REDEMPTION HINTS. Public posts should sound like SOD1820 rather than a laboratory report. Prefer natural language such as: `רמזי גאולה`, `פלאי הבורא`, `השגחה`, `סוד`, `חיבור מופלא`, `עוד רמז שמצטרף לתמונה`, `התגלות`, `צופן`, `נקודה שמעוררת התבוננות`, `כאן נפתח חיבור מעניין`, `המספר חוזר במקום מפתיע`, `התמונה מתחברת`. The goal is living, spiritual, curious, accessible prose.

2) RESEARCH LANGUAGE STAYS MOSTLY BEHIND THE SCENES. Terms such as `Research Strength`, `Evidence Independence`, `Candidate`, `Hypothesis`, `Result Bundle`, `epistemic state` and similar internal research/governance vocabulary should not dominate ordinary post prose. They belong in engines, deep inspectors, audit/research projections or a short explanatory note when genuinely decision-relevant. The word `מחקר` is allowed when natural, but is not the default tone of every paragraph, badge or heading.

3) BEAUTIFUL LANGUAGE NEVER UPGRADES TRUTH. `רמז`, `פלא`, `השגחה`, `חיבור` or `התמונה מתחברת` are public narrative language, not automatic proof. When a connection is still open, prefer wording such as `רמז מעניין`, `חיבור שמעורר בדיקה`, `אנחנו עדיין בודקים`, `עוד נקודה שמצטרפת לתמונה` rather than presenting it as established fact. Verified calculations/sources may be stated clearly, but interpretation remains interpretation unless governed otherwise.

4) TWO-LAYER DISCIPLINE. Behind the post, canonical engines, provenance, source locators, Trace, negative results, dependency/evidence classification and Human Gate remain exact and fully preserved. The public post projects that truth-safe substrate in a warm, readable SOD1820 voice instead of exposing backend taxonomy as the storytelling language.

5) AUTHOR TEXT IS NOT RETROFITTED. This guidance applies to new system/AI public copy and future post writing/projections. It does not authorize rewriting ZURIEL-authored text, external-author text or the legacy corpus merely to match the new tone; AUTHOR-VERBATIM and provenance rules remain supreme.

6) CALIBRATION EXAMPLE. Prefer: `ושוב 776 מופיע במקום מפתיע — הפעם מכמה כיוונים שונים, וכל אחד מוסיף עוד חתיכה לפאזל.` Avoid as ordinary narrative: `זוהתה קונברגנציה בעלת Research Strength גבוה משלוש Evidence Groups.` If the underlying support is not yet strong, say so plainly in the same warm language.


—— G2 FINAL COMPACTION ROUTING ADDENDUM · Human-Gate ZURIEL · 15.9.2026 ——
- LEGACY OPERATIONAL RECIPES ARE ON-DEMAND HISTORY, NOT GLOBAL ACTIVE LAW. The detailed historical Dimension Five upload recipe (`dim5_upload_law`) and Or-Geula video pipeline (`orgeula_video_pipeline_law`) remain preserved in inactive rule history and code provenance. Load them only when explicitly maintaining that legacy pipeline; they do not define 2029 publication architecture.
- POST TEMPORAL HISTORY: preserve source-authored content, original publication time, revisions and later updates distinctly. The historical “update-on-top” layout is a legacy presentation choice, not a Foundation invariant. Current temporal/provenance owners govern identity/history; Experience governs layout.
- POST LIST DATE/ORDER and footer copyright/vintage presentation are implementation/content choices under this owner + Experience/Design, not separate global laws.
- `legacy_content_protocol` is an on-demand historical compatibility adapter only for explicitly requested historical WordPress/gallery tasks that still require it. There is no active Legacy product or surface, no normal-startup requirement, and no standing Legacy maintenance.


—— AI-NATIVE POST 2029 STANDARD V1 · Human-Gate ZURIEL · 24.9.2026 ——

Purpose: this is the DEFAULT publication standard for every new 2029 Post. It extends publishing_conventions only. It creates no parallel Post store, AI content system, research graph, renderer truth source, or publication authority. The author/source remains the authored source; AI compiles context around it.

1) SOURCE-CENTERED READING IS THE PRIMARY EXPERIENCE.
The central reading canvas belongs to the authored/source text. Preserve the source wording and authored order verbatim unless ZURIEL explicitly asks for editing. AI research, engine verification, system interpretation, provenance inspectors, timelines, recommendations and contextual prompts must not be interleaved into authored paragraphs in a way that makes them appear to be part of the source. External authors keep explicit attribution. For SOD HASHMAL and similar uploaded source documents, original wording stays source-owned.

2) AI WORKS AROUND THE POST, NOT OVER THE AUTHOR.
Default intake is:
Source → AI Source Map → typed extraction → canonical engine/source verification where applicable → relations to existing One Reality → editorial composition/projection → Post.
The AI may identify sections, entities, numbers, verses, methods, ELS/ciphers, sources, images, themes, temporal context and research opportunities. It may propose section headings/reading anchors and concise contextual summaries. It may not silently rewrite source claims into system facts or turn verification into authorship.

3) RESEARCH SIDECAR / CONTEXT LAYER.
Deep research belongs outside the authored reading stream: contextual side rail, inspector, drawer, expandable card, footnote-like source layer, or other Experience projection. On desktop it may sit beside the reading canvas and change contextually with the active section. On mobile it collapses to a deliberate drawer/card below or on demand; it must not break the source paragraph flow. The sidecar may contain:
- Source Map / what this section connects to;
- canonical Gematria Method Trace and verified calculations;
- Number/World/Topic/Person/Book/Verse/Event links;
- ELS/cipher re-check or evidence state;
- Temporal Lens / העת עכשיו when materially relevant;
- Treasures/curation context;
- Raziel contextual action for the exact section;
- provenance/source locators and negative/failed verification when decision-relevant.
Contextual Prominence + Silence Gate applies: AI should do more work and show less noise.

4) THREE VOICES MUST NEVER BLUR.
Every projected research element resolves visibly to one of:
A. SOURCE SAYS — the author's/source's own claim or wording.
B. SYSTEM VERIFIED — deterministic engine/source verification with method/provenance.
C. SYSTEM INTERPRETATION / RESEARCH — SOD1820 synthesis, hint, connection or open question.
Beautiful public language remains allowed under PUBLIC POST VOICE 2029, but no visual treatment may upgrade B/C into source authorship or established fact.

5) TITLE IDENTITY IS STABLE; THE YEAR MAY BE PART OF THE PUBLIC H1.
ZURIEL prefers the relevant Hebrew year to remain visibly present in the main public title when it helps identify the publication/context. The 2029 rule is therefore not “remove the year”, but “separate semantic title from metadata clutter”.
Recommended display grammar:
H1 core: enduring subject/story
+ a visually distinct Year token/suffix as part of the same H1 presentation.
Example:
"רמזי הגאולה, הבינה המלאכותית וסוד השיר — תשפ״ז"
Secondary source line:
"סוד החשמל · גליון חג הסוכות · ‘תשית לראשו עטרת פז’"
Do not stuff the H1 with full Gregorian dates, issue numbers, source labels, parasha, holiday and every metadata field unless they are themselves part of the subject. The Hebrew year is allowed and preferred as a compact temporal identity cue.
Canonical Post identity and canonical slug must not depend on transient display punctuation or a renderer-specific title composition. A stable semantic title/slug identity may project a public H1 that includes the Hebrew year. If the date/time itself is the researched event or essential claim, a fuller temporal phrase may legitimately be part of the H1.
This rule applies by default to future SOD HASHMAL uploads and all new 2029 posts.

6) ONE SOURCE, MANY PROJECTIONS — NEVER MANY COPIES.
A Post is the editorial/full-context Publication projection, not the sole home of extracted knowledge. The same source/research may project contextually into Home, Global Now/העת עכשיו, Guest Voices, Treasures, Gallery/Media, Number/World, Topic/Event, Heichal, Journey, ELS and Raziel while preserving one source identity and provenance. Do not create multiple posts merely because the source contains multiple research axes. A new separate Post requires its own editorial/publication reason, not merely another extracted section.

7) LIVING PUBLICATION WITHOUT SOURCE MUTATION.
The source text remains stable while surrounding projections may evolve as the system learns:
- new verified relation appears;
- current-year Temporal Lens becomes relevant or later becomes historical;
- a cipher is independently reproduced;
- another source joins the same number/axis;
- a Human-curated Treasure/Gold/Diamond relation becomes relevant.
Those changes belong to live projections/sidecar/pulse, revisions or system additions — not retroactive rewriting of the author's source.

8) GEMATRIA / CIPHER / VISUALS ARE STRUCTURED REPRESENTATIONS.
Verified Gematria should prefer existing canonical structured visual families and Method Trace rather than dead screenshots or manually duplicated numbers. A Gematria Visual may project into Post/Gallery/Treasures/Number/share from the same underlying identity. Source cipher images remain preserved as source visual evidence; system ELS reproduction, verification status and engine output are separate projections beside/below them.

9) RAZIEL IS SECTION-CONTEXTUAL, NOT GENERIC CHAT NOISE.
A Post section may expose a bounded action such as "שאל את רזיאל על החלק הזה". Raziel receives the exact section plus its source identity, linked entities, verified calculations, provenance and current Research Context. It must answer from that context and existing owners rather than inventing a parallel post-analysis memory.

10) EDITORIAL COMPOSER = STRUCTURE, NOT REWRITE.
AI may choose or recommend the reading hierarchy: opening, section ordering, section headings, what deserves prominence, what belongs behind expansion, and what remains silent. For source-owned material, section headings are editorial overlays and must remain distinguishable from original authored headings when that distinction matters. The goal is a coherent human reading journey, not an exhaustive dump of extracted units.

11) DEFAULT MEANS DEFAULT.
For every new 2029 Post request, agents should automatically apply this standard without requiring ZURIEL to repeat it. If a source is supplied, preserve its wording by default. If research is available, place it in sidecar/contextual projections by default. If routine date/issue metadata exists, keep it secondary by default. Deviating from these defaults requires a content-specific reason or an explicit ZURIEL instruction.

12) HUMAN GATE / RELEASE BOUNDARY.
AI may ingest, extract, verify, compose, rank and recommend. It may prepare a publication projection. Canonical truth promotion and publication/release remain governed by existing Truth/Human-Gate/Publishing owners. This standard does not authorize automatic publication, main merge or production deploy.

Calibration source: SOD HASHMAL · גליון חג הסוכות תשפ״ז uploaded 24.9.2026. The calibration proves the intended shape: source wording in the reading center; source/date context secondary; live research in contextual side layers; one source feeding many surfaces through One Reality.


—— POST 2029 READING GEOMETRY ADDENDUM · Human-Gate ZURIEL · 24.9.2026 ——

Extends AI-NATIVE POST 2029 STANDARD V1; does not create another Post template system.

1. DEFAULT POST EXPERIENCE = Source Canvas + Context Spine + Living Margin.
- Source Canvas: authored/source wording and original authored headings remain the primary uninterrupted reading stream.
- Context Spine: thin markers outside the authored text show where meaningful system depth exists.
- Living Margin / Context Rail: bounded contextual intelligence for the current source region. It is not a dashboard and does not contain a second copy of global controls.

2. NO AI SECTIONING OF THE AUTHOR BY DEFAULT. Do not split an external/source-owned article into new visible AI sections merely to organize research. Preserve original headings when present. AI may maintain invisible/semantic reading regions and locators behind the source for Context Rail behavior. New visible editorial headings require a real reading need and must remain distinguishable from source headings.

3. GLOBAL CONTROLS STAY GLOBAL. Raziel, tools, attention, command/action and deep inspectors belong to the System Frame / Bottom Command Island / Panel Host. The Post rail may trigger them with the current Reading Focus but must not duplicate them.

4. THE RAIL SHOWS THE NEXT MEANINGFUL THING, NOT EVERYTHING. Prefer one focal connection and at most a few bounded signals. Examples: current-year relation, one engine-verified Gematria, exact source/verse, a reproduced cipher, one Treasure relation, or one next research action. Silence is valid.

5. READING FOCUS IS CONTEXT, NOT TRUTH. A source-region locator may include post/source id, paragraph/range/anchor, visible source excerpt identifier and projected linked identities. Moving the focus changes what the rail previews; it never rewrites the source or promotes research state.

6. DEEPENING. “פתח בעולם”, “פתח מספר”, “ראה מקור”, “בדוק בצופן” and “שאל את רזיאל” pass the same Reading Focus into the canonical target capability while preserving exact return.

7. HEBREW YEAR IN H1. The already-approved rule remains: the Hebrew year may/preferably appears as a compact public-H1 temporal cue, while issue/holiday/source-edition metadata remains in the source line unless itself the researched subject.

8. GOLDEN CALIBRATION. First Golden calibration for this geometry: SOD HASHMAL · גליון חג הסוכות תשפ״ז. Preserve source wording; no AI-authored segmentation inserted into the article. Context Rail should pivot invisibly as the reader moves through the existing source regions (e.g. תשפ״ז/787, זכריה/AI, שלמה/חשמל, שופר/שיר, source cipher evidence).

This addendum is the default for new 2029 Posts and comparable reading publications unless a source-specific reason justifies another projection.


—— PRE-PUBLICATION STAGING SAFETY · Live finding 24.9.2026 ——

Current public.posts must NOT be treated as a private draft store merely because space='draft', home_hidden=true or tag='טיוטה'. Live role verification during the first Post2029 Reading Golden proved the staged row was SELECT-visible to anon. Therefore:
- unpublished source-owned Golden/Post material stays in the existing private Research Intake/source-root path until Preview/publication authorization;
- do not invent a parallel draft table/store;
- the public posts row is created/restored only at the governed publication/cutover step, unless a future canonical Publishing owner explicitly hardens draft access first;
- renderer code may use the existing admin-gated research intake read path for an admin-only pre-publication Golden, but public Post identity remains posts and public Posts always win when present;
- re-verify live RLS/grants before relying on any future draft-state field for privacy.

This is a release-safety consequence of the current live access model, not a new lifecycle/truth axis.


—— POST 2029 CONTENT MODE · SOURCE-FIRST vs GEMATRIA-FIRST · Human-Gate ZURIEL · 24.9.2026 ——

OWNER CHECK: EXTEND_EXISTING. This is a projection/publishing rule over the existing Post/Reading/Research owners. It creates no second Post renderer family, no local Gematria engine and no separate hint store.

1. SOURCE-FIRST DOCUMENT.
A source-owned document, newsletter, scan/transcription, book/source excerpt or externally authored long-form item whose primary purpose is continuous reading must preserve the reading stream as the dominant experience. SOD HASHMAL / סוד החשמל is the calibration case.

Default presentation:
- source wording/order/headings remain primary;
- verified gematria, hints, cross-links and system discoveries do NOT become intrusive inline cards by default;
- body text may carry only a very quiet affordance when useful (subtle clickable number/phrase/marker, hover/focus/tap state), without changing the authored sentence or inserting visual blocks between source paragraphs;
- desktop depth appears primarily in Living Margin / Context Spine;
- mobile depth appears behind a compact cue such as “✦ N חיבורים כאן” / “123 · N גימטריות”, opening the existing Panel/Bottom Sheet;
- clicking a verified gematria may open the canonical Number capability / Method Trace / related expressions without mutating the source body;
- Silence Gate applies: no useful context = no marker/no rail noise.

2. GEMATRIA-FIRST POST.
A post whose authored/editorial purpose is the gematria itself may render gematria as primary content: equations, canonical Gematria Cards, Method Trace, Gold/Diamond marks, comparisons and related number structures may appear directly in the reading body because they ARE the story rather than side intelligence.

3. SAME TRUTH, DIFFERENT PROMINENCE.
Source-first vs Gematria-first changes presentation prominence only. It does not change calculation authority, verification state, provenance, identity, ranking or Human Gate. All verified calculations still use canonical registered methods/engines. A hint/interpretation never becomes source wording or fact merely because it is visually connected.

4. SOURCE-FIRST DESKTOP.
On desktop a source-first Reading Surface may show, beside the active source region, a bounded Living Margin:
“מה מתחבר כאן” → verified gematria / source link / temporal connection / topic-person-book-event relation / Raziel entry / World deepening.
The rail shows a small bounded set, not the full research dump. Deep detail moves to Panel/World/Number.

5. SOURCE-FIRST MOBILE.
No permanent side rail. The source remains full-width/calm. A tiny edge/bottom cue announces available depth without interrupting the text. Tap opens the same contextual set in the canonical Panel Host. Exact return restores the same source region.

6. INDEX / REGIONS.
Authored source headings define primary Reading Regions. Discovery/hint systems may enrich a region but do not redefine authored section boundaries silently. System-generated sub-grouping may exist as hidden/context metadata and must remain visibly distinct from source-authored structure when shown.



—— MEDIA SOURCE FIDELITY GATE V1 · Human-Gate ZURIEL · 30.9.2026 ——

Owner verdict: EXTEND_EXISTING. This extends publishing_conventions and research_intake_foundation_contract_law §13; it creates no new Media Store, Upload Engine or parallel publication path.

1. ORIGINAL FIRST — source media used as visual evidence, source witness, screenshot evidence, OCR/geometry input, hero image or post evidence must preserve the exact original bytes before any resize, crop, re-encode, compression or thumbnail generation. A derivative is never allowed to become the only surviving source.

2. CHATGPT / AGENT INGEST — when the current agent runtime can hand the exact source file byte-for-byte to the canonical AGENT_MEDIA_UPLOAD_BRIDGE, it may do so directly. When exact preservation cannot be proved in that runtime, Dropbox is the mandatory durable fallback: persist the exact original to Dropbox first, verify file size/identity, then move the same original bytes into canonical Supabase Storage. Never shrink an image merely to make transport easier.

3. STORAGE IDENTITY — Dropbox/WhatsApp/Drive/ChatGPT are ingress/provenance, not canonical media identity. Canonical runtime media remains in the existing Supabase media/gallery storage tree. Preserve source locator/acquired-via provenance where available.

4. DERIVATIVES AFTER ORIGINAL — thumbnails, previews, cards and resized variants may be produced only after the original is durably preserved. If a number/text/detail inside the image is itself evidence, the Post/Gallery evidence view must use the original or a verified readability-preserving derivative, never a low-resolution thumbnail.

5. ACCEPTANCE GATE — before declaring media work complete, verify: exact-source byte size and hash when available; dimensions/MIME; canonical Storage object readability; Post/body reference points to the intended object; and visual acceptance on the rendered surface. DB presence != visual acceptance. Storage upload != visual acceptance.

6. FAIL CLOSED — if the original cannot be preserved, the canonical upload cannot be verified, or the rendered image cannot be visually accepted, do not substitute a degraded derivative and do not report the media task as complete. Record the blocker and keep the publication/draft state unpromoted until repaired.

7. LEGACY POSTS — legacy_content_protocol inherits this gate for all WordPress/Legacy post/gallery maintenance. This rule supersedes any ad-hoc fallback that embeds a downsized data URI or recompressed screenshot as the only post image.

Calibration incident: FZ1073 post 5112. A 709×1536 / 143,659-byte source was temporarily replaced by a 160×347 / 4,382-byte transport derivative. That path is prohibited going forward.


—— UNIVERSAL MEDIA DEFAULTS FROM DIMENSION FIVE GOLDEN · Human-Gate ZURIEL · 5.10.2026 ——

OWNER CHECK: EXTEND_EXISTING. dim5_upload_law v4 is a Golden/legacy calibration source, not a new owner. Universal media semantics promoted here are governed by publishing_conventions + content_translation_law v4 + video_transcription_law + source_video_publish_law + post_og_image_law. No parallel publisher/media/translation system is authorized.

1. VIDEO TRANSLATION IS DEFAULT, NOT OPT-IN.
Every newly published video must preserve one source-language original transcript and carry the canonical translation set he · en · ar · es · fr · ru · pt · de through the existing video-transcribe/video_transcripts owner before the publish preflight can become READY. The source language is preserved as Original and is never guessed. Caller intent may add languages but may not disable or narrow the canonical set. In Hebrew product context, Hebrew is the default human-facing representation; the original remains separately addressable provenance.

2. SOURCE VIDEO + POSTER/IMAGE ARE BOTH REQUIRED REPRESENTATIONS.
Publishing a video means the self-hosted source video itself is present. Transcript, translation, still or card never substitutes for the source video. Every video also receives a canonical raster poster derived from the stored video. That verified poster is the post image_url / card / list / share visual. No video publication is READY while poster/image_url is unresolved.

3. IMAGE POSTS PRESERVE ORIGINAL-FIRST + RASTER PUBLIC REPRESENTATION.
For a visual/image post, preserve the exact source original under the canonical media identity first. The public post image_url is a verified canonical JPG/PNG representation on Supabase Storage. If the exact original is another format, keep it as source and create a raster representation rather than replacing/downgrading the source. Image + audio + text is a valid projection over the same Post identity; it does not create a second post/media identity.

4. NO IMAGELESS VISUAL MEDIA POST.
Video and image posts leave preflight with a concrete canonical image_url (video poster or verified raster image). Text-only posts remain governed by post_og_image_law fallback and may legitimately have no explicit image_url.

5. DIMENSION FIVE-SPECIFIC BEHAVIOR STAYS SERIES-SPECIFIC.
The Series marker posts.tags='מימד חמש', author/home-hidden conventions, DimensionFiveFeed photo swipe/read behavior, spiritual editorial lens and other Series-specific projection behavior are NOT generalized by this addendum. Only universal media/translation semantics are promoted.

6. LEGACY FILE FORMATS ARE NOT THE OWNER.
Old Dim5 VTT filenames, gallery/sod1820/videos paths and exact legacy embed markup are historical implementations. Preserve their semantic intent (source transcript, translated representations, Hebrew-first presentation, source video + poster) through the current 2029 owners rather than recreating legacy storage/layout.

7. ONE IDENTITY / MANY REPRESENTATIONS.
SOURCE ≠ TRANSCRIPT ≠ TRANSLATION ≠ POSTER, but all are representations linked to one media/post identity. Translation or poster generation never changes truth/canonical status and never authorizes publication without the ZURIEL Human Gate.


—— POST → ONE REALITY GRAPH CONTRACT · Human-Gate ZURIEL · 6.10.2026 ——

OWNER CHECK: EXTEND_EXISTING. This extends publishing_conventions and consumes reality_graph_law v8, truth_axes_foundation_law v3, research_intake_foundation_contract_law, content_translation_law v4 and the existing Content Foundation. It creates no Post Tree, Tag Engine, taxonomy store, relation store, entity registry, second graph or schema. Post identity remains one public.posts row; its graph projection reuses the existing Post node / nodes / edges / Research OS.

1. POST IS CONTENT IDENTITY; THE TREE IS SEMANTIC CONTEXT.
A Post is one durable Content Identity identified by posts.id/slug with many representations. Its Post node in One Reality Graph is a projection/address of the same content, not a second Post. Media, transcript, translation, poster, card, feed and full-page are representations and never become duplicate Post identities.

2. FIVE LAYERS MUST NOT BE COLLAPSED.
A new Post is classified/connected through distinct layers:
A) Series / Content Stream — membership such as מימד חמש; where a canonical Series marker exists, use that owner (currently posts.tags contains מימד חמש for Dimension Five).
B) Category / Editorial Topic — posts.categories, e.g. רמזים חזקים, תיעוד אירועים, וידאו.
C) Lightweight Tags / Recall — optional search/navigation/legacy-compat labels. Tags are not ontology, identity, evidence, verification or graph truth.
D) Semantic Entities / Anchors — stable identities in One Reality Graph: Number, exact Expression, Person, Place, Event, Date/Temporal identity, Verse/Book/Source, Sefirah, Concept/Subject and other qualified entity types.
E) Claims / Interpretations / Findings — statements about relationships or meaning. These stay source-attributed and truth-axis typed; they do not become Fact/Canonical merely because a Post says them or because entities are connected.

3. TAGS DO NOT SUBSTITUTE FOR THE GRAPH.
A Number/person/place/sefirah/date/expression mentioned in a Post does not need a duplicate Tag merely to make it discoverable if the canonical entity/relationship is represented in the graph. Existing historical tags are preserved for compatibility/search; no mass deletion or rewrite is authorized. New publishing must not use a growing tag list as a replacement for entity resolution and typed relations. A graph projection may coexist with a useful tag, but the tag never becomes the authority for the semantic relation.

4. RESOLVE BEFORE CREATE — ONE IDENTITY.
Before creating a Number/Person/Place/Event/Date/Sefirah/Concept node, resolve the existing canonical identity first. Reuse existing nodes such as 7, 10, 710, Keter/Chokhmah/Binah/Tiferet and other existing identities. A Post may connect to many existing identities. Do not create a local Post-only copy of an entity.

5. NUMBER != DATE != EXPRESSION != CONCEPT.
Exact semantic identity is preserved. 7, 10 and 710 are three separate Number identities. 7/10 as a calendar/event reference is a Date/Temporal/Event representation, not Number 710. A research interpretation may explicitly relate 7/10 to 710, with source/provenance, but must never merge their identities. Likewise an exact Hebrew Expression is not the Number it calculates to, and a translated Expression does not inherit the source Expression's numeric result without an independent canonical calculation.

6. RELATION STRENGTH IS TYPED.
A mere textual occurrence may justify only a bounded mentions/source-context relation. A stronger relation such as documents/represents/derived_from/converges_on/equality or another domain-owned relation requires the evidence/semantics demanded by its owner. Historical adjacency, same Post membership, same Tag or visual proximity never silently becomes a strong semantic relation.

7. AUTHOR/SOURCE CLAIMS STAY SOURCE CLAIMS.
Predictions, spiritual readings, interpretations and mappings from an external creator are preserved as that creator/source's Claim/Interpretation with exact provenance. Example pattern: a creator may connect 2027, seven lower sefirot and redemption; the Post may faithfully present that reading, but SOD1820 does not silently promote it to Fact/Verified/Canonical. Human Gate and Truth owners govern any promotion.

8. GEMATRIA / NUMERIC RESEARCH USES CANONICAL ENGINES.
If a Post contains a numeric/gematria claim that matters semantically, store the exact Expression + method + result through the canonical Gematria/method owner when verification is required. General-model arithmetic, a Tag containing a number, OCR, translation or author assertion is not authoritative engine verification.

9. VIDEO / MULTILINGUAL REPRESENTATIONS.
For newly published video, preserve source video + one original-language transcript + canonical translations/subtitles + poster through the existing media/translation owners. Translation is a representation, never source evidence. Subtitles should remain switchable/timed over the preserved source; a burned-in-caption social derivative may exist separately but never replaces the original.

10. POST → TREE INTAKE PIPELINE (NEW CONTENT).
Stage A — SOURCE: preserve source/provenance/attribution and original media.
Stage B — REPRESENTATIONS: transcript, translations/subtitles, poster/derivatives through existing owners.
Stage C — POST: compose one Post identity and classify Series + Category + Medium/Representation.
Stage D — RESOLVE: extract candidate Numbers/Expressions/People/Places/Events/Dates/Verses/Books/Sefirot/Concepts and resolve existing canonical identities first.
Stage E — VERIFY: route gematria/numeric/method-dependent claims through canonical engines; preserve honest not_tested/mismatch/unknown states.
Stage F — RELATE: create only semantically justified typed relation candidates; mere mentions remain weak/explicit.
Stage G — CLAIM: preserve interpretive/source-authored statements as Claim/Interpretation with provenance.
Stage H — HUMAN GATE: only ZURIEL/Human Gate may approve/canonicalize governed research meaning or editorial high-tier curation.
Stage I — PROJECT: World / Number / Post / Journey / Raziel / Search consume the same identities and relations; no copy of the knowledge per surface.

11. BACKFILL STRATEGY — FOUNDATION FIRST, NO MASS MIGRATION.
Phase 1: apply this contract to all NEW Posts.
Phase 2: calibrate with two Golden cases: FZ1073 aircraft Post and the 7/10 · 7 lower sefirot · 2027 Dimension Five continuation to the Dead Sea/Tiferet creator.
Phase 3: backfill high-value/current/Gold Posts first, resolving numeric/entity tag overload into explicit graph context while preserving historical tags.
Phase 4: migrate older corpus progressively when touched or when decision/retrieval value justifies it. No blind all-posts rewrite.
Phase 5: once graph consumption is proven, search/index/UI may increasingly derive entity discovery from the graph; legacy tags remain compatibility metadata until an explicit separate retirement decision.

12. ACCEPTANCE GATES.
PASS requires: one Post identity; no duplicate semantic nodes; Series/Category/Tag roles remain distinct; exact source preserved; translations do not overwrite source; Number/Date/Expression distinctions preserved; calculation authority comes from canonical engines; strong relations have provenance/evidence; source interpretations remain attributed; Human Gate controls canonical promotion; all projections consume one tree.
FAIL if: every mentioned term is turned into a Tag instead of graph context; a Tag is treated as proof; 7/10 is merged with 710; translation inherits gematria; the Post creates a private/local ontology; AI silently canonicalizes a claim; or the same semantic identity is duplicated for another surface.

CALIBRATION NOTE.
The live graph already supports Post↔Number links through existing nodes + edges using mentions/documents patterns. This contract standardizes their use for future Posts; it does not authorize bulk graph mutation by itself.




—— POST KIT 2029 V1 · Human-Gate ZURIEL · 6.10.2026 — ONE POST / ONE TREE / SMART FOLLOW ——
Purpose: reusable Post 2029 projection kit. EXTEND_EXISTING only. This is not a new Post engine, graph, tracking system, media store, renderer family or truth store.

Owners consumed:
- publishing_conventions / Post → One Reality Graph contract
- reality_graph_law v8
- truth_axes_foundation_law v3
- experience_governance_foundation_v1_law v8
- SOD1820_DESIGN_CONTRACT_V1 Contextual Sidecar / Spatial Method Stage
- content_translation_law v4 + video_transcription_law
- subscription_funnel_law v19 + existing WatchButton / resolve_topics / notification_prefs / dispatcher
- canonical Post2029Page / SystemFrame2029 / SurfaceContextRail2029 / Research Context.

1. ONE CONTENT IDENTITY. The Post row remains the content identity. /post/:slug in 2029 is a projection of that same Post, not a second Post. Source body/media/provenance stay intact; 2029 may reorganize presentation without duplicating semantic content.

2. HERO / ORIENTATION. Post 2029 opens with source/creator, title, short deck, date/category/series context and a bounded set of primary anchors. Numeric/semantic anchors are entry points into canonical inspectors; hero prominence is editorial/navigation only and never upgrades truth.

3. SOURCE MEDIA + LANGUAGE. Source video/image remains provenance-protected. Poster and timed captions/transcripts are representations of the same media identity. Language switching consumes canonical transcript/translation rows; do not hard-code one VTT track per legacy post as the final 2029 model. Original-language witness remains authoritative.

4. STORY FIRST. The original post/source narrative stays readable in the center. System additions, verification notes and contextual interpretation remain visibly separate from the source. Author-verbatim and external-creator attribution rules remain active.

5. LIVING CONTEXT RAIL. Desktop uses the one shared left Context Rail; mobile uses the same state as Bottom Context Sheet. REST shows where the reader is inside the Post and 5–7 best outward connections. FOCUS reuses the same rail for the selected Number/Expression/Event/Person/Sefirah/etc. EXPLORE opens Number/World/Heichal/Journey/Raziel with exact return continuity. Do not create a second Post rail.

6. CONNECTIONS ARE GRAPH RELATIONS, NOT SMART TAGS. Series/Category/legacy Tags remain navigation/compatibility inputs. Post connections come from typed One Reality Graph relations with provenance/reason. Weak occurrence remains mentions; stronger semantic links require their owning evidence/engine/human gate. The UI may explain “למה זה מתחבר”.

7. CHAIN + BRANCHES. A Post may expose a primary narrative spine (previous → here → next) plus bounded side branches. Do not force all related posts into one linear sequence. For the current 7.10 / ten-sefirot calibration, working spine is: Post 233 Oct-7 Hub → Post 149 seventh-to-tenth bridge → Post 5116 Dimension Five 2027/ten-sefirot continuation → Post 5109 Dead Sea/Tiferet thematic depth; Post 87 (710/hidden) and Post 108 (878/world-upside-down/360) are side branches. This chain is a curated projection pointer, not automatic truth promotion.

8. GOLD / SELECTED DISCOVERY. High-value convergences may be projected as bounded GOLD editorial discoveries only when their exact operands/method traces/provenance are preserved. GOLD != Fact/Canonical. Numeric equality must come from canonical registered engines; source interpretation remains attributed.

9. SMART FOLLOW REUSES THE ONE FOLLOW ENGINE. No post-specific follow store or notification system. The Post Kit exposes follow choices over canonical follow identities supported by subscription_funnel_law. Today number/category/author/channel identities already resolve through resolve_topics; future Event/Concept/Series/Chain follow must extend that same resolver/dispatcher rather than invent another engine. Follow intent != external channel consent.

10. FOLLOW UX. The reader follows the thing they care about, not merely the current HTML page: e.g. Number 710, a creator/author, a category/series, and—when admitted by the existing resolver contract—a stable Event/Concept/Chain identity. Personal Area / Attention should surface only meaningful new items relevant to followed identities. Ranking/relevance may prioritize delivery, but never promotes truth. Raziel may explain why an update is relevant from the same Research Context; it does not create follow identity or publish on its own.

11. PERSONAL AREA CONTINUITY. Save / Add to Research / Follow remain distinct actions. The unified System Frame carries current context and exact return. “אני עוקב” in the Personal/Attention projection is the destination for follow state and relevant updates once fully wired; do not duplicate state inside the Post renderer.

12. PERFORMANCE / MOBILE. One rich contextual renderer active at a time. Post body remains cheap/readable. Deep trace, spatial method visualization, graph detail and Raziel load on explicit focus/depth. Mobile gets Bottom Context Sheet and unified bottom context/command surface, not compressed desktop chrome.

13. CURRENT DIM5 GOLDEN CALIBRATION. Post 5116 (seventh-to-tenth-sefirot-2027) is the current media-rich calibration input: source video + poster + Hebrew original transcript + canonical translations he/en/ar/es/fr/ru/pt/de. Legacy body currently embeds he.vtt only; this is presentation DRIFT to be solved by the shared 2029 language/media renderer, not by multiplying per-post HTML tracks.

Acceptance:
- Same Post identity in legacy and 2029.
- Source witness/media preserved.
- 2029 renderer consumes canonical translations and graph identities.
- Left rail/mobile sheet explain bounded typed connections.
- Main chain and side branches remain distinct.
- Save/Research/Follow remain distinct.
- Follow reuses subscription_funnel_law + resolve_topics/dispatcher.
- No parallel Post/Graph/Tracking/Notification/Translation system.
- Truth/provenance states remain separate from visual prominence and follow popularity.


—— SMART FOLLOW DISCOVERY UX V1 · Human-Gate ZURIEL · 6.10.2026 ——
This extends POST KIT 2029 + subscription_funnel_law v19 only. No new Follow engine/store.
1. The user should not have to understand graph identity. Follow discovery is recommendation-led.
2. Default suggestion order: Writer/Creator; actual Editorial Category/Series on the current post (e.g. מימד חמש, תיעוד אירועים, רמזים חזקים, סוד החשמל); then a central supported Topic/Number. Event/Concept/Chain only after those types are admitted into the existing resolve_topics/dispatcher contract.
3. Automatic recommendation is never automatic subscription. Explicit user action is required.
4. Raziel consumes the same Research Context and may proactively explain/suggest relevant follows, but does not invent identities, bypass consent, canonicalize, or dispatch notifications itself.
5. Post-specific relevance only: Dimension Five should normally offer Creator + מימד חמש first; event/strong-hint posts may offer תיעוד אירועים + רמזים חזקים when actually present; Sod Hashmal posts may offer סוד החשמל. Do not offer unrelated global categories.
6. Follow state remains in existing notification_prefs / FollowingPanel / dispatcher. Personal Area should display human labels and why an update appeared.
7. Prefer 2–4 relevant suggestions, ranked by content role and current reading focus. Popularity never upgrades truth.


—— FAST IMAGE DELIVERY V2 · ZURIEL 12.10.2026 · EXTEND_EXISTING ——
חובת מערכת בחוזה הפרסום והמדיה לכל העלאה, ייבוא, החלפה ופרסום, ידניים ואוטומטיים. אותה זהות מדיה בשלושה ייצוגים: מקור מדויק שמור; תמונת קריאה חדה בתוך הפוסט; תמונה קטנה וקלה לרשימות ולדף הבית. אין ליצור זהות/מאגר/מסלול פרסום נוסף.
thumb_url: רוחב עד480px, יעד60KB, תקרה100,000bytes. image_url: תמונת קריאה עד1600px (ללא הגדלת מקור), איכות מותאמת לקריאות אותיות ומספרים, יעד350KB ותקרה600,000bytes. JPEG איכות85–92; PNG מוצדק בלבד במסגרת המשקל. יחס התמונה נשמר. תמונת קריאה אינה נחתכת או מוכהית כשהיא מכילה טקסט; משתמשים בתצוגת הכרטיס השלמה הקיימת. אין להחיל תקציב תמונה קטנה על תמונת הקריאה.
המקור המדויק נשמר בנפרד באחסון הקנוני ובגיבוי המאושר, ואינו מוחלף בנגזרת. מקור/קריאה/תמונה קטנה הם ייצוגים של אותה זהות מדיה, עם קריאה חוזרת מהאחסון ומשקל/MIME מאומתים. נגזרות באותה תיקיית מדיה; שם סטנדרטי derivatives/reading.jpg ו-derivatives/preview.jpg. נשמרת תמיכה בנגזרות המאומתות הקיימות cover-fast-v1.jpg/reading-v2.jpg ו-thumb-fast-v1.jpg.
רשימות וכרטיסי הבית צורכים thumb_url; image_url בתוך פוסט. מקור/תמונה חדה נפתחים במכוון להגדלה דרך המנגנון הקיים. תמונות מחוץ למסך נטענות עצלות; תמונה ראשית גלויה יכולה להיטען מיד. OG נשאר JPG/PNG מאומת לפי post_og_image_law.
אכיפה בשמירת posts: כל INSERT עם image_url או שינוי image_url/thumb_url מחייב זוג ייצוגים שונים באותה תיקיית מדיה קנונית, קיימים באחסון ועם MIME/משקל במסגרת התקציב. sys_save_post/admin_save_post/כתיבה ישירה כפופים לאותה בדיקת שמירה; כש-thumb_url לא נמסר, מותר לחבר רק נגזרת קיימת מאומתת באותה תיקייה. חסר/כבד/סוג לא תקין חוסם את השמירה ומשאיר את הפרסום התקין הקודם. אין fallback שקט למקור כבד. פוסט טקסט ללא תמונה מותר; עריכת טקסט בלבד בפוסט היסטורי אינה מחייבת הסבת מדיה ישנה.
מידות וקריאות חזותית נבדקות בעת יצירת הנגזרות; בדיקת האחסון במסד אוכפת זמינות/MIME/משקל, ואינה טוענת למדוד קריאות חזותית. כלל שמור אינו הוכחת פריסה: מצב יישום וראיות נרשמים ביומן בלבד.

—— POST IMAGE SUBJECT POLICY V1 · Human-Gate ZURIEL · 18.10.2026 · EXTEND_EXISTING ——
הוראת המשתמש: ״אני לא רוצה תמונות של נשים ... אם יש תמונה של אישה לייצר תמונה חדשה״.
1. בתמונות הנבחרות לפרסום באתר — לרבות תמונת שער, תמונה בגוף הפוסט, תמונה קטנה, כרטיס שיתוף ופוסטר של סרטון — אין להציג נשים. הכלל חל על צילום, פריים מסרטון וגם תמונה שנוצרה בבינה מלאכותית.
2. לפני שמירה או פרסום בודקים את התמונה בפועל. כאשר בתמונת המקור מופיעה אישה, אין לבחור בה לפרסום ואין להשתמש בה כ-fallback; יוצרים תמונה חדשה ללא נשים, התואמת לנושא התוכן.
3. תמונה חדשה שנוצרה לצורך ההחלפה מסומנת כהמחשה/תמונה שנוצרה בבינה מלאכותית. היא אינה צילום האירוע, אינה ראיית מקור ואינה משנה את מקור הטקסט או את קרדיט היוצר. אין לשנות את זהות היוצר או את הטקסט המקורי כדי להתאים אותם לתמונה.
4. ההחלפה עוברת במסלול המדיה הקנוני ובכפוף ל-FAST IMAGE DELIVERY V2 ול-post_og_image_law: מקור, נגזרת קריאה ונגזרת קטנה של אותה זהות מדיה; בדיקת תצוגה ומשקל. תמונת המקור נשמרת רק לפי הרשאות ושימור המקור הקיימים, בלי להציג אותה במקום התמונה החלופית.
5. הוספת כלל זה אינה אישור לפרסום טיוטה, להפעלה מחדש של פוסט שהוסר או לשינוי גורף בארכיון. הפוסט הנוכחי 5120 נשאר מוסתר; תמונת האישה הוסרה מהפניות המדיה שלו.
מצב יישום: הנחיית פרסום מחייבת נשמרה בחוזה הקיים; אין בכך טענה שקיימת אכיפה אוטומטית של זיהוי תמונות בכל מסלולי המערכת. אכיפה אוטומטית, אם נדרשת, היא משימת מימוש נפרדת באותו owner — ללא מנגנון פרסום מקביל.


—— AUTHOR COLOR HIERARCHY PRESERVATION / THREE PRESETS V1 · Human-Gate ZURIEL · 18.10.2026 · EXTEND_EXISTING ——
החלטת מוצר מאושרת: ״הפוסטים הישנים צריכים לשמור על ההיררכיה לפי הצבעים שעשיתי אבל לפי השלושה מצבים״. תחולה: תצוגת פוסטים ב-2029, כולל מקורות WordPress היסטוריים, באותם owners קיימים.

1. CONTENT / EDITORIAL OWNER — publishing_conventions: שומרים את בחירת הכותב אילו מילים, ביטויים, ספרות, מספרים, שורות גימטריה וקטעים הודגשו, את סדרם, גבולותיהם, משקלם, הדגשת שורה שלמה לעומת תת-ביטוי ואת ההשתייכות לקבוצות צבע. אין לשטח את הכול לצבע טקסט אחיד, למחוק צבעים או להבליט רק כותרות ומסגרות.
2. ORIGINAL PRESERVED: נוסח המקור וסימוני העריכה המקוריים נשמרים כראיית מקור. ההתאמה מתרחשת בשכבת תצוגה; אין החלפת hex גורפת בתוך posts.content, אין שינוי כתיב/מספר/חישוב/שיוך מקור, ואין שכתוב אוטומטי של הארכיון.
3. THREE-PRESET PROJECTION OWNER — SOD1820_DESIGN_CONTRACT_V2.md + canonical_colors_law / palette.js: אותו מקור ואותה היררכיה מוצגים ביום, בקלף ובלילה. הגוון מותאם לרקע ולניגודיות: למשל משפחת צהוב/זהב בהירה בלילה וכהה ביום/קלף; קבוצת ירוק מקורית נשארת מובחנת. אין חובה לשמר קוד צבע זהה אם הוא פוגע בקריאות; חובה לשמר את תפקיד ההדגשה וההבחנה בין קבוצות. מיפוי מדויק יכויל בפיילוט חזותי בשלושת המצבים, לא ייחשב מאושר מכוח דוגמה מילולית בלבד.
4. SOURCE-LOCAL GROUPING: צבע זהה יכול לקשור ביטוי ומספר באותו מקור או יחידת מקור. אין להסיק מצבע זהה בפוסטים שונים קשר סמנטי, שוויון מספרי, זהות או היררכיה עולמית; לא נמצאה משמעות אוניברסלית קבועה לכל צבע בארכיון. גבולות הקבוצה נשמרים לפי המקור ולא לפי מילות מפתח אוטומטיות.
5. GEMATRIA LINES: שורת גימטריה מובחנת וקריאה; נשמרת בחירת הכותב בין הדגשת כל השורה לבין ביטוי/תוצאה/ספרה נבחרים. אין להסתפק בכרטיס חישוב צדדי תוך מחיקת ההדגשות בגוף הסיפור. מספרים וביטויים נשארים טקסט נגיש ולא תמונה; כשקיים חיבור אינטראקטיבי משתמשים ב-Number/Expression owner הקיים עם הקשר וחזרה מדויקת.
6. FIRST CENTRAL SUBJECT IN NEW EDITORIAL CONTENT: בפוסט חדש או בעריכה שאושרה, ההופעה הראשונה של הנושא המרכזי בתוך טקסט הקריאה מקבלת הדגשה ברורה — למשל ״צרפת״, גם אם היא כבר בכותרת. אין להדגיש כל הופעה או כל שם אוטומטית, ואין להחיל כלל זה רטרואקטיבית על מקור היסטורי ללא אישור עריכה נפרד. הדגשה אינה יוצרת Topic/Entity/קישור גרף; קישור מוצג רק לזהות קיימת ומאומתת לפי owner המתאים.
7. EDITORIAL EMPHASIS != STATUS / VERIFICATION: צבעי ההדגשה של הכותב נפרדים מצבעי פעולה/סטטוס/אימות של המערכת. ירוק אינו אישור חישוב, אדום אינו שגיאה וזהב אינו עובדה/איכות/Canonical. שומרים את הנוסח, השיטה והראיות תחת בעלי הסמכות הקיימים.
8. ONE SHARED IMPLEMENTATION: ההגדרה החזותית שייכת לחוזה Design V2 ולפלטה הקנונית; רכיב הפוסט המשותף צורך אותה. אין theme store נוסף, palette נפרדת לכל פוסט, CSS חדש במקור כדי לכפות צבעי 2029 או שינוי של תצוגת Legacy.
9. VISUAL ACCEPTANCE: לפני מימוש גורף נדרש פיילוט תחום על פוסט קצר, פוסט ארוך ופוסט גימטריה עם סימוני מקור אמיתיים. לבדוק יום/קלף/לילה, מובייל/מחשב, קריאות של כל תו מסומן, גבולות תת-ביטוי, סדר RTL, קבוצות נבדלות, מיקוד מקלדת וחזרה. חישוב ניגודיות או הדמיה מקומית לבדם אינם אישור תצוגת האתר.
10. STATUS / RELEASE BOUNDARY: ההחלטה נשמרה בחוזה הפרסום ומופנית לבעלי עיצוב V2/פלטה/פוסט הקיימים. מימוש בקוד, סנכרון סעיף ההצגה לקובץ Design V2 ובדיקות דפדפן עדיין נדרשים. אין בשמירת ההחלטה אישור למיזוג, פריסה, שינוי אתר חי, שינוי פריוויו מאוחד, backfill או הפעלת סוכנים.

ראיות לסקירת המקור: סריקת סימוני HTML ב-383 פוסטי WordPress בקטגוריות תיעוד אירועים/רמזים חזקים ללא סוד החשמל; קריאת תוכן מדגמית ב-posts.id=254,266,1126,1410,1487. הספירות אינן אימות שכל פריט נכתב ידנית ואינן אימות טענות הגימטריה; הסקירה עסקה במבנה ובהדגשות בלבד.

—— CHATGPT DEFAULT DROPBOX PUBLISH FLOW V1 · Human-Gate ZURIEL · 26.10.2026 · EXTEND_EXISTING ——
החלטת בעל האתר: כשאומרים ל-ChatGPT ״תעלה״ / ״תפרסם״ / ״שים באתר״ פוסט, סרטון או תמונה, אין לבקש בכל פעם הוראה נפרדת ״דרך Dropbox״ או ״תעלה את התמונה״. מסלול המדיה הקנוני הוא חלק מובנה מהבקשה. זהו חידוד של publishing_conventions הקיים, MEDIA SOURCE FIDELITY GATE, UNIVERSAL MEDIA DEFAULTS, AGENT_MEDIA_UPLOAD_BRIDGE, FAST IMAGE DELIVERY V2, source_video_publish_law ו-post_og_image_law; אין ליצור חוזה, אחסון, סוכן או מו״ל מקביל.

1. טריגר וסמכות: הוראה מפורשת לפרסם/להעלות לאתר מתירה לבצע את שלבי פרסום המדיה הנדרשים ללא שאלות חוזרות על העברת הקובץ ותמונת שער. שיתוף קישור/קובץ ללא הוראת פרסום אינו מתיר פרסום אוטומטי. מכבדים את היעד שנקבע (Legacy, 2029, או אחר); הוראת פרסום אינה אישור לשינוי קוד/ענפי Preview, מיזוג, פריסה או העלאה כפולה לשתי המערכות.
2. מסלול ChatGPT בברירת מחדל: בדוק תחילה תוכן כפול ונתיב הפרסום הפעיל. שמור את קובץ המדיה המקורי, ללא שינוי ביטים, תחילה ב-Dropbox כמקור גיבוי קבוע כאשר חיבור Dropbox זמין; אמת שההעלאה הושלמה ושמור שם קובץ ייחודי לפי מזהה פוסט/תאריך. אחרי האישור העבר דרך מנגנון agent-upload/AGENT_MEDIA_UPLOAD_BRIDGE הקיים עם כרטיס הרשאה תחום אל canonical Supabase Storage (media/gallery לפי חוזה), וקבל Receipt מאומת. Dropbox הוא שער כניסה וגיבוי, לא כתובת הוידאו/התמונה הציבורית; אסור לסמוך על לינק שיתוף פרטי או קישור זמני כספק המדיה באתר. אם גישה/הרשאה/קובץ חסרים — דווח חסימה ברורה, אל תמציא הצלחה או תעקוף מנגנוני אבטחה.
3. מדיה ותמונה בלי לבקש שוב: לסרטון — שמור וידאו MP4 מקורי וצור poster קנוני ממקור הסרטון לפי חוזה הפרסום, וכן נגזרות קריאה ותמונה קטנה ממוטבות, עם MIME/משקל/זהות תקינים. ניתן להכין בנוסף תמונת שער מעוצבת/AI לפי בקשת המשתמש או בהתאם לתוכן, בסגנון המותג, תוך ציון ״אילוסטרציה״; אילוסטרציה אינה עדות מצולמת או תחליף ל-poster קנוני כשזה נדרש. אין תמונות נשים בפרסומים לפי כלל POST IMAGE SUBJECT POLICY. לדימוי מקורי שומרים תמיד מקור מלא לפני יצירת נגזרות; לעולם אין לשמור רק thumbnail.
4. פרסום והקשר: חבר את video src, poster/image_url ו-thumb_url לכתובות הציבוריות הקבועות ב-Supabase, באותה זהות Post/Media; שמור קרדיט מקור וקישור יוצר, תאריך ותגיות/קטגוריות קיימות בלי ליצור כפילויות. דרישות תמלול ותרגומים, Human Gate והבחנה עובדה/ייחוס/רמז נשארות מחייבות; אין לדווח READY כשה-preflight הקנוני חסר.
5. אימות וסיום: בצע קריאת-חזרה לחשבונית אחסון, בדיקת קיום קובץ מקור ונגזרות, בדיקת שדות והפניות הפוסט; בדוק תצוגה בפועל במובייל/דפדפן וביעד שנתבקש, לרבות Legacy אם הוזכר. DB INSERT/UPDATE לבדו אינו הוכחת פרסום חי או נראות. דווח באופן מפורד מה בוצע, מה אומת ומה עדיין חסום, עם קישור לצפייה רק אם אומת. אל תכפה שינוי ב-Production או בפריוויו כדי לעקוף חסימה.
6. תחולה: זוהי ברירת מחדל תפעולית לפרסומי SOD1820 דרך ChatGPT כאשר הכלים והרשאות המדיה זמינים, ולא שינוי בכללי המערכת הפנימיים של ChatGPT או הבטחה שכל סשן/סוכן יקרא מסמך זה אוטומטית. כל סוכן שמבצע פרסום בפרויקט צריך לקרוא את publishing_conventions לפני הפעולה.

מקרה כיול: posts.id=5125, ״הרב כדורי — הגאולה בתשפ״ז״, מקור Dropbox → agent-upload → Supabase; שמירת המקור, נגזרות ותיקון הפוסט נבדקו ב-DB/Storage. תצוגת האתר/Legacy לא אומתה כחלק ממקרה הכיול, ואסור להציג מקרה זה כהוכחת READY מלא לכל שערי הפרסום.

—— LEGACY MODIFIED DATE REQUIRED · 27.10.2026 · publishing_conventions operational correction ——
כש-ChatGPT מפרסם פוסט חדש ב-public.posts לצפייה ב-Legacy או כפרסום משותף, חובה להגדיר posts.modified לתאריך הפרסום (לרוב זהה ל-posts.date; בעריכה בפועל לפי updated time) כבר ב-INSERT. אין להסתפק ב-date/created_at בלבד: ה-Legacy Home fetchHomePosts בגרסה הפעילה ממיין לפי modified DESC NULLS LAST, והיעדר modified עלול להוריד פוסט חדש לתחתית ולהעלימו מ״עדכונים אחרונים״ למרות home_hidden=false. לאחר כתיבה לוודא שהפוסט נכנס ל-32 התוצאות הראשונות, אינו טיוטה/פורום/לא-בבית, ונראה בפיד; לא לשנות קוד, פריסה, Preview או שדות לא קשורים לשם עקיפת התקלה. בדיקת DB/מיון אינה תחליף לבדיקת תצוגה בדפדפן. כיול: posts.id=5126 (27.10.2026), תוקן modified=NULL ל-date, עלה ממקום 1295 למקום 1 במיון הרשימה. 


—— DIM5 EDITORIAL COVER VS SOURCE POSTER · 31.10.2026 · user-requested correction · VISUAL-DIM5-20261031-V1 ——
STATUS: user requested canonical contract correction after comparing historical Dimension Five cards with Post 5130. This is an additive refinement of publishing_conventions, not reactivation of historical dim5_upload_law or a new publisher/asset store. The old Source Video First, translation, verification, provenance and publication owners remain unchanged.

1. TWO DISTINCT VISUAL REPRESENTATIONS (mandatory for newly published Dimension Five video posts):
   (a) SOURCE-DERIVED PLAYER POSTER: a verified raster frame from the preserved original video, attached to the player/poster representation. This is evidence of what the video looks like; it is not by default the editorial cover.
   (b) DIMENSION FIVE EDITORIAL COVER CARD: one distinct JPG/PNG image interpreting the *central message of that exact post* through visual symbolism, and aligned with the established series card language. This is the default posts.image_url for the card/list/reading presentation; posts.thumb_url is a light derivative of the same card, not an unrelated screenshot. The original video, player still and editorial card all belong to ONE media/post identity. Do not duplicate the Post.
   This series-specific exception supersedes only the sentence in UNIVERSAL MEDIA DEFAULTS (5.10.2026) §2 requiring that the source-derived poster itself become image_url/card/list/share. The source-derived player poster remains REQUIRED. The editorial series card becomes image_url/thumbnail only after visual verification; no original replacement.

2. ESTABLISHED VISUAL CALIBRATION: existing distinct thematic SOD1820 cards are verified by Post image_url provenance in posts 5065 (divine-timing.png), 5066 (real-code-of-reality.png), 5090 (universe-tests-you.png), 5093, 5096, 5097, 5102 and 5105. For a recurring-topic post such as 5130, use the editorial motif of 5090 as a contextual style reference, not its exact pixels or an identical repeated image. Not all historical posts have an editorial card (e.g. newer 5129); the corrective target is the established approved series treatment, not a claim that every old asset matched it.

3. IMAGE COMPOSITION: prioritize an original thematic scene/metaphor reflecting the video (for Post 5130: threshold before breakthrough, old patterns/temptation vs deliberate choice, contrast of shadow and light). A plain crop of the speaker, a talking-head frame, a generic social-video thumbnail or a thumbnail with the creator's face as the principal motif is NOT the default editorial card. A source portrait may still be shown in the source video/secondary source image when relevant, or selected explicitly by ZURIEL. Artistic direction should be cinematic, meaningful, visually legible and coherent with the established series; design must not imply that the symbolic art is a photographed event, quote or source evidence. Do not add women's imagery or invent source text, logos, dates, people or author identities. Hebrew typography only when exact and visually verified; the canonical UI category badge stays OUTSIDE the image.

4. PREPUBLICATION GATE: original MP4 SHA/bytes verified; source poster verified; editorial card independently rendered and visually inspected; image_url canonical public JPG/PNG on Supabase Storage; thumb_url verified derivative; mobile card and desktop list/OG clear; no dramatic misrepresentation of the speaker; proper source credit; compare with at least two previously published distinct Dimension Five cards. The standard canonical /api/card /api/og sharing owner remains the only share owner (no parallel OG engine). If the editorial card is missing, status COVER_CARD_PENDING / VISUAL_ACCEPTANCE_PENDING, not FULLY_COMPLETE. User may explicitly approve the source still instead, recorded for that Post.

5. REMEDIATION: Post 5130 used a speaker crop as image_url and thumbnail even though historical cards were thematic; mark its cover treatment as NOT MATCHING THE ESTABLISHED DIM5 STYLE, while keeping the publicly released Post, MP4, canonical transcripts and existing player poster intact. Prepare a unique thematic editorial card, then update image_url/thumb_url under the existing media upload / revision / visual acceptance gates. No automatic mass replacement of other Posts, no reuse of another Post's exact artwork, no code/schema/RLS/deployment change through this contract edit.
—— END DIM5 EDITORIAL COVER CORRECTION ——


—— GALLERY DATE ROUTING / CHATGPT FIXED UPLOAD · 02.11.2026 · APPROVED ZURIEL ——
מרחיב את המסלול הקיים, ללא מערכת העלאה נוספת. פקודת ״תעלה לגלריה״ מסמיכה לבצע את המסלול הקיים ולבחור שם קובץ תחום; אין לשאול שוב על עצם ההעלאה. בחירת נמען/ערוץ חיצוני נפרדת.
מסלול: קובץ מלא שאושר → Dropbox → download_link חד-פעמי → agent_upload_ticket_issue מוגבל לנתיב/MIME/משקל/SHA → agent-upload?mode=url → receipt עם readback SHA/size/MIME → שיוך gallery_images לגלריה קיימת → קריאת חזרה ואימות חזותי. Dropbox הוא מקור העברה וגיבוי, לא image_url ציבורי. אין לעקוף חסימת כלי או הרשאה.
אחסון חדש נשאר media/sod1820/agent/2029/image/YYYY/MM/<asset-id>/; מקור מדיה ונגזרות נפרדים. תאריך נתיב פיזי הוא תאריך קליטת המדיה; אין לבלבל עם תאריך האירוע. כשקיים תאריך אירוע מפורש הוא נשמר כתאריך אירוע; בידיעה על תוכנית עתידית נשמר תאריך פרסום הידיעה כתאריך התיעוד, והמועד העתידי בנפרד עם planned. אם אין תאריך, לא ממציאים: שומרים זמן קליטה והיעדר תאריך אירוע. תאריך אינו יוצר גלריה חדשה אוטומטית: יש להתאים גם לנושא ולעוגן ולגלריית ההמשך הפעילה. בהיעדר שיוך קיים, להגדיר שיוך תחום בחוזה ובמנגנון הקיים, לא להקים העלאה מקבילה.
מקרה כיול: חדשות הרכבת 02.11.2026 → גלרית דוד24 id=3ee0ec23-04f3-468b-a7b5-67087d41681a, WP105, כהמשך לגלריות14–45. התמונה id=7bccbdee-f8ad-4d97-9c5b-03ca07ee426e היא עיבוד AI שאושר מפורשות, אינו צילום מקור בלתי-מעובד; ייחוס זה נשמר. ההדגשות הקבועות והקישורים מוגדרים במסמך37 A.2. העתיד: צילום מקור נשמר לפני עיבוד; אין להשתמש ב-imagegen כדי לשחזר טקסט מקור כתיעוד בלתי-מעובד.


הרחבה מאושרת NOW-CENTRAL-HANDOFF-20261103: פירוט קנוני במסמך37 באותו סעיף. עכשיו מייצג את כל פרסומי האתר והסדרות בשפה קומפקטית אחידה של2029, כולל צבי ציבורי בתקופת הביניים. שם הסדרה מסרים; אור הגאולה מקור בתוכה. פוסט+וידאו באותו פרסום אינם שתי התראות; יעדי מקור מדויקים. אין העתקת בלוקיLegacy. לשמר היררכיית הבית שכבר תוקנה. שינוי חוזה בלבד.

HOME-UPDATES-VISUAL-20261103: החלטת צוריאל המאוחרת במסמך37 מחליפה מוצר הרשמת פתיחה נפרד בהרשמת ״עדכוני האתר״ אחת, תוך שימור היקף הסכמות קודמות. נדרשת התאמת חוזה ומנגנון הדיוור הקיים בידי הסשן המרכזי; לא הוחל שינוי מנויים או משלוח.

—— HISTORICAL POSTS — GLOBAL VISUAL REDESIGN / COLOR SEMANTICS · HUMAN-GATE ZURIEL · 10.11.2026 ——

כאשר מבצעים עיצוב גורף לפוסטים היסטוריים/ישנים במערכת 2029, אין לשמר באופן עיוור את מעטפת הצבע הישנה ואין למחוק את משמעות הצבעים המקוריים.
1. PRESERVE YELLOW GEMATRIA SEMANTICS: צבעי הצהוב וההדגשות הצהובות שצוריאל הגדיר עבור גימטריות, מספרים, קישורים או סימוני משמעות נשמרים כסמנטיקה ותוכן. אין להסירם, להחליפם בצבע דקורטיבי שרירותי או לאחד אותם לטקסט רגיל.
2. MAP TO THE CURRENT THREE COLOR MODES: ממפים כל תפקיד צבע קיים לצבע נגיש ומתאים בכל אחת משלוש ערכות המערכת הנוכחיות — יום, קלף ולילה. שומרים על ההבחנה וההיררכיה של ההדגשה הצהובה, גם אם ערך הצבע המדויק משתנה בין הערכות. אין להניח שצהוב זהה עובד על כל רקע.
3. SEMANTIC ROLE BEFORE HEX VALUE: משמרים את תפקיד הצבע (למשל גימטריה, קישור מספרי, הדגשת ראיה או טקסט רגיל) וממפים אותו דרך טוקנים/מחלקות העיצוב הקנוניים; לא מקבעים צבעים inline ולא יוצרים מערכת צבעים מקבילה לפוסטים.
4. APPLY CURRENT POST LAWS AFTER MAPPING: לאחר מיפוי הצבעים, מחילים על הפוסטים את חוזי הפוסטים הפעילים של 2029 — טיפוגרפיה, קישורים, רכיבי גימטריה, קריאות, נגישות, מדיה, תצוגת יום/קלף/לילה ואימות חזותי. יש לבדוק כל תבנית/משפחת פוסטים בכל שלוש הערכות לפני החלה גורפת.
5. NO BLIND LEGACY DARK LOCK: כלל הנעילה לכהה שתועד בפרוטוקול WordPress ההיסטורי אינו ברירת מחדל לעיצוב הגורף החדש. הוא נשאר ראיית תאימות היסטורית בלבד; פוסט שעובר התאמה למערכת 2029 צריך לתמוך בשלוש הערכות לפי החוזים הפעילים, בלי לפגוע בצבעי המקור הסמנטיים.
6. SOURCE AND EVIDENCE PRESERVATION: שינוי עיצוב אינו משנה את נוסח המקור, זהות הפוסט, קרדיט, תאריך, קישורים או משמעות הראיות. אין לשנות תוכן כדי להתאים אותו לצבע; משנים את מיפוי הייצוג.
7. BATCH ACCEPTANCE: לפני החלה גורפת, בודקים מדגם מייצג של פוסטים ישנים — כולל גימטריות צהובות, קישורים מספריים, תמונות/צילומי מסך, קרוסלות ותוכן מעורב — בכל שלוש הערכות. כשל בקריאות או באובדן משמעות צבע עוצר את ההחלה לאותה משפחה עד תיקון.

SCOPE: זהו כלל תכנון וקבלה לעיצוב גורף עתידי של פוסטים היסטוריים בתוך 2029. הוא אינו מפעיל מערכת Legacy, אינו מחייב תחזוקה של WordPress ואינו מאשר שינוי קוד או פריסה בפני עצמו. מימוש צבעים וטוקנים נשאר תחת בעלות Design/Experience; מוסכמות פרסום מגדירות את סמנטיקת הפוסט ואת תנאי הקבלה.
$sod_txt$, updated_at=now() where id=4;
end
$sod_rb$;

-- rollback system_suggestions_law: v6 → v5 (no row is deleted; v6 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='system_suggestions_law' and rule_version=6 and is_active) then
    raise exception 'rollback system_suggestions_law: v6 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='system_suggestions_law' and rule_version=6;
  update public.nodes set is_active=true  where type='rule' and rule_id='system_suggestions_law' and rule_version=5;
end
$sod_rb$;

-- rollback foundation_closure_protocol_law: v8 → v7 (no row is deleted; v8 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='foundation_closure_protocol_law' and rule_version=8 and is_active) then
    raise exception 'rollback foundation_closure_protocol_law: v8 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='foundation_closure_protocol_law' and rule_version=8;
  update public.nodes set is_active=true  where type='rule' and rule_id='foundation_closure_protocol_law' and rule_version=7;
end
$sod_rb$;

-- rollback inter_agent_coordination_law: v18 → v17 (no row is deleted; v18 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='inter_agent_coordination_law' and rule_version=18 and is_active) then
    raise exception 'rollback inter_agent_coordination_law: v18 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='inter_agent_coordination_law' and rule_version=18;
  update public.nodes set is_active=true  where type='rule' and rule_id='inter_agent_coordination_law' and rule_version=17;
end
$sod_rb$;

-- rollback deploy_on_request: v4 → v3 (no row is deleted; v4 stays as an inactive row)
do $sod_rb$
begin
  if not exists (select 1 from public.nodes where type='rule' and rule_id='deploy_on_request' and rule_version=4 and is_active) then
    raise exception 'rollback deploy_on_request: v4 is not the active version'; end if;
  update public.nodes set is_active=false where type='rule' and rule_id='deploy_on_request' and rule_version=4;
  update public.nodes set is_active=true  where type='rule' and rule_id='deploy_on_request' and rule_version=3;
end
$sod_rb$;

commit;
