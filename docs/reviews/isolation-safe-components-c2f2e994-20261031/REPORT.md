# Isolation — בדיקות נפרדות ללא גישה לשרת החי

נבדק ב־31.10.2026. **זה אינו מעבר של שער Isolation המלא ואינו ריצת GitHub Actions.**

ענף: `gpt/2029-ci1185-acceptance-reconcile-20261031`  
SHA מקומי ומרוחק מאומת: `c2f2e9948dd119c96b69e377b33be2eb2a886efb`  
`origin/main` נשאר `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. המקור נשאר נקי, ללא שינוי קבצים, קומיט, push, מיזוג או פריסה. לא שונו בדיקות, הגנות, הרשאות או Feature Flags. אין פריוויו חדש.

## תוצאות

- כל **38 שלבי המקור/יחידה/אריזה/בנייה** שאינם דורשים את בדיקות הדפדפן המלאות או A3 החי עברו. אלה שלבי workflow, לא 38 מקרי בדיקה ייחודיים.
- בין הקבוצות: One Tree — 78; AI service headers — 5; Raziel quota trace — 14; Research Path — 6; public feed/World/Companion — 30; Raziel consumer — 3; World convergence — 23. לכולן 0 כשלים ו־0 דילוגים. One Tree רץ שוב כחלק מ־prebuild; אין לספור את החזרה כמקרים נוספים.
- בדיקות A3 המשלימות הקיימות `test/g3-client-correlation.test.mjs` + `test/research-run-trace-finish.test.mjs`: **29 עברו, 0 כשלו, 0 דולגו**. ה־handler וה־composer האמיתיים רצים בחלקן, אך התעבורה והאחסון הם מדומים בזיכרון. נבדקים קשר interaction/trace, שמירת עדות, גבולות הרשאה, זהות מבקר, כשלי finish ואי־החזרת Result כשסיום העקבה נכשל. זו אינה הוכחת HTTP/JWT/RLS/Postgres אמיתית.
- מתוך `tests/world2029-release.spec.cjs` הורצה בנפרד הבדיקה `private researcher corpus stays gated for non-admin 2029 sessions`: **1 עברה, 0 כשלים, 0 דילוגים**, בדפדפן עם session אנונימי וללא רשת. זו הוכחת חסימת המסך במצב הזה בלבד, לא בדיקת משתמש מחובר או כלל ה־RLS.
- בנייה עברה עם חסם Legacy המקורי ו־One Tree. גרף המקור, גרף הבנייה וה־HTML המבודד עברו. אזהרות הבנייה הקיימות על גודל chunks ו־dynamic imports נשארו; לא שונו ספים.
- `research-run` נארז מ־29 קבצי מקור שנבדקו מול Git HEAD, ללא browser SDK ועם `verify_jwt=true`. לא בוצעה פריסה.

## בידוד ואמינות ההרצה

נוצר עותק Git רדוד נפרד מהקומיט המדויק, עם אובייקטי Git אמיתיים לצורך חסם provenance. הבדיקות וקובצי המקור נשארו כפי שנמסרו. התלויות הועתקו מההתקנה הקיימת; `npm ci` והורדות browser אינן מוצגות כשלבים שנבדקו מחדש. עבור האריזה נעשה שימוש במסלול הבידוד שכבר קיים ב־SHA, שבודק את גרסת esbuild המוצמדת (0.28.2).

ההרצות בוצעו ב־Docker `--network none`, עם ממשק loopback בלבד, root filesystem לקריאה בלבד, כל capabilities הוסרו, `no-new-privileges`, ללא Docker socket וללא התקנת מפתחות Production/service-role. כתובות ה־Supabase הציבוריות הקיימות בקוד לא יכלו להגיע לרשת. ניתנו כתיבות מקומיות רק לעותק הבדיקה/תוצרים ול־tmpfs. רכיבי בדיקה המדמים כתיבות עושים זאת בזיכרון או בקבצים מקומיים. שתי רשומות התיאום הפסיביות BEFORE/AFTER הן רישום המשימה בלבד; לא נכתבו נתוני מוצר חיים.

הסביבה הסופית: `node:24.21.0-trixie-slim`, Node 24.21.0 — תואם `.nvmrc`. בדיקת הדפדפן: Playwright 1.55.0 ו־Chromium 154 מותקן, עם נתיב executable מפורש; ללא retry. דגל ה־fixture שכבר קיים ב־World הופעל בתוך תהליך הבדיקה בלבד. אין כאן שינוי הגנה חיה.

נשמרו גם ניסיונות התשתית הראשונים: תמונת Bookworm לא התאימה ל־glibc של כלי Git המקומי ולכן האריזה נכשלה; הסביבה תוקנה וכל 39 השלבים (38+משלימה) הורצו מחדש ועברו. ניסיון הדפדפן הראשון לא בחר בדיקה בגלל עיגון שגוי של grep; לאחר תיקון בחירת השם הורצה הבדיקה המקורית ועברה. לא שונתה אף טענת בדיקה ולא סומנה הצלחה עבור ניסיונות אלה.

אימות Docker מסונן: [container-attestation.json](container-attestation.json). תוצאות מכונה: [summary.json](summary.json), [results.json](results-trixie/results.json), [browser-result.json](results-trixie/browser-result.json). כל הקונטיינרים של המשימה סיימו; לא נשאר שרת בדיקה של המשימה בריצה. העותק והתוצרים נשארו מקומית תחת `/tmp/ci1185-safe-isolation-c2f2e994/`; לא הועלו ל־GitHub.

## מה נשאר פתוח

| רכיב | מצב | הסיבה והצעד הבא |
|---|---|---|
| A3 החי — `scripts/test-a3-client-correlation-live.mjs` | לא הורץ | מייבא את הלקוח המקובע ל־Supabase החי מ־`src/lib/supabase.js`, ומפעיל `research-run`. ה־handler כותב `op_trace_begin_v1`, `op_trace_record_span_v1`, `op_trace_finish_v1` עם service role. גם קריאה אורחת לשירות היא כתיבה חיה. |
| Entry browser המלא | לא הורץ | נשען על Post Bennett אמיתי, חישוב RPC ותוכן; Storage guard אינו חוסם כלל כתיבות/Edge. נדרשים שירותים ונתוני בדיקה מקומיים או fixtures מלאים עם חסימת כל egress. אין להעבירו מול Production רק משום ששמו acceptance. |
| World browser המלא | לא הורץ | נשען ברובו על קטלוג, מקורות ו־RPC חיים. ה־fixture הקיים מכסה flags ומקור מסוים בלבד; guard הטלמטריה מכסה רשימה מוגבלת. בדיקת הקורפוס הפרטי בלבד הורצה בנפרד. |
| Isolation workflow מלא ב־GitHub | לא הורץ / לא עבר | ה־workflow בקומיט הזה כולל A3 חי. אין תוצאה ירוקה מלאה חדשה ואין שינוי היסטוריית תוצאות GitHub. |

## האם A3 אמיתי מבודד אפשרי

**אפשרי מבחינת התשתית, אך אינו מוכן להרצה מלאה כפי שהקוד ב־SHA הזה מוגדר.** Docker מקומי זמין; אין כאן Supabase CLI מותקן, אין `supabase/config.toml` בקומיט ואין stack מקומי של Auth/PostgREST/Edge/Postgres. PostgreSQL לבדו או ה־VM עם Maps אינם תחליף ל־stack הזה. לא נוצרו ולא נבדקו כעת סכמות Operational Trace במסד אמיתי.

נדרשים:

1. stack מקומי/חד־פעמי ב־Docker network פנימי ללא יציאה לשרת החי: PostgreSQL, Auth, PostgREST, gateway ו־Edge runtime. ה־runner והשירותים מתקשרים רק ברשת הפנימית. אין proxy חיצוני, Docker socket, נתוני משתמשים חיים או מפתחות ייצור.
2. מפתחות JWT מקומיים נפרדים ל־anon ול־service role, וה־gateway חייב להמשיך לאמת JWT. **אין לכבות `verify_jwt`, RLS, capability gate או חסמים כדי להפעיל את הבדיקה.** ה־handler שומר service role רק ל־gate/trace ואת JWT הקורא ל־research RPCs.
3. שרשרת הסכמה וה־fixtures הקנונית התואמת ל־SHA: לפחות `20260922191500_operational_trace_runtime_v1.sql` ותלויות `ai_token_log`, `api_pricing`, roles/Auth/admin predicate; וכן `20260922194500_server_capability_execution_gate_v1.sql` ותלויות `fn_user_entitlement`, `site_flags`, `ai_usage`. עבור public number נדרשים RPCs ונתוני מקור מקומיים של `fn_number_lookup`, `fn_number_dossier`, `fn_number_journey`, `number_neighbors`, וכן טבלאות presentation שה־handler קורא. אין להחליף gate או RPC אמיתי ב־allow-all ולכנות זאת קבלה אמיתית.
4. אריזה של ה־handler הקנוני מה־SHA הזה (כבר עברה) והפעלתו מקומית, עם אותם גבולות caller/service. המסלול שנבדק הוא numeric/numeric_operators דטרמיניסטי, ללא ספק AI.
5. מתאם בדיקה מפורש ללקוח המקומי, עם endpoint allowlist שמסרב לכתובת הייצור. **משתני `SUPABASE_URL` בסביבת הסקריפט הקיים אינם מפנים אותו למקומי**, כי ייבוא הלקוח מקובע. הפניית הלקוח היא עבודה נפרדת שטרם בוצעה; אין כאן שינוי מקור או הגנה.
6. אימות SQL מקומי של `interaction_id` מול `trace_id`, root, spans וסיום, בנוסף לתוצאת HTTP; מקרי שלילה של JWT/role/gate, זהויות לא תקינות וכשלי persistence. הסקריפט החי הנוכחי בודק בעיקר UUID שהוחזר: UUID לבדו אינו מוכיח שהמתאם נשמר במסד. יש לשמור את בדיקות השלילה הקיימות ולהוסיף ראיה אמיתית מקומית, בלי להציג את ההדמיה כקבלת שרת.

## שלבי Isolation שהורצו ללא רשת

| # | שלב מקורי | תוצאה | לוג |
|---|---|---|---|
| 1 | One Tree content contract acceptance | עבר | [01.log](results-trixie/01.log) |
| 2 | Experience Context 2029 acceptance | עבר | [02.log](results-trixie/02.log) |
| 3 | Entry Orientation + Contextual Learn 2029 acceptance | עבר | [03.log](results-trixie/03.log) |
| 4 | Contact Gateway canonical owner acceptance | עבר | [04.log](results-trixie/04.log) |
| 5 | My Workspace 2029 native home acceptance | עבר | [05.log](results-trixie/05.log) |
| 6 | No Black Box operational trace acceptance | עבר | [06.log](results-trixie/06.log) |
| 7 | Web Vitals metric core acceptance | עבר | [07.log](results-trixie/07.log) |
| 8 | Operational Trace Runtime persistence acceptance | עבר | [08.log](results-trixie/08.log) |
| 9 | AI-Analyze early paid paths trace coverage acceptance | עבר | [09.log](results-trixie/09.log) |
| 10 | Replayable Golden No-Black-Box acceptance | עבר | [10.log](results-trixie/10.log) |
| 11 | Server capability execution gate acceptance | עבר | [11.log](results-trixie/11.log) |
| 12 | W2 public Number research runtime acceptance | עבר | [12.log](results-trixie/12.log) |
| 13 | Package W2 research-run Edge transport | עבר | [13.log](results-trixie/13.log) |
| 14 | 2029 server SEO / AI metadata parity | עבר | [14.log](results-trixie/14.log) |
| 15 | Research Path resumability runtime acceptance | עבר | [15.log](results-trixie/15.log) |
| 16 | Home 2029 System Pulse acceptance | עבר | [16.log](results-trixie/16.log) |
| 17 | 2029 cheap route/test/least-privilege hardening | עבר | [17.log](results-trixie/17.log) |
| 18 | Legacy Research containment + unopened Heichal entrypoint acceptance | עבר | [18.log](results-trixie/18.log) |
| 19 | Source isolation regression | עבר | [19.log](results-trixie/19.log) |
| 20 | G4 source-section update / World / Companion public-read acceptance | עבר | [20.log](results-trixie/20.log) |
| 21 | Native System Frame acceptance | עבר | [21.log](results-trixie/21.log) |
| 22 | Raziel server-gated Result Bundle consumer acceptance | עבר | [22.log](results-trixie/22.log) |
| 23 | Canonical 2029 contract wiring acceptance | עבר | [23.log](results-trixie/23.log) |
| 24 | Person identity bridge foundation acceptance | עבר | [24.log](results-trixie/24.log) |
| 25 | Account Person completeness foundation acceptance | עבר | [25.log](results-trixie/25.log) |
| 26 | Person public resolver foundation acceptance | עבר | [26.log](results-trixie/26.log) |
| 27 | People identity projection acceptance | עבר | [27.log](results-trixie/27.log) |
| 28 | Person Profile 2029 projection acceptance | עבר | [28.log](results-trixie/28.log) |
| 29 | People Directory 2029 projection acceptance | עבר | [29.log](results-trixie/29.log) |
| 30 | Native World surface acceptance | עבר | [30.log](results-trixie/30.log) |
| 31 | World Convergence PR591 focused acceptance | עבר | [31.log](results-trixie/31.log) |
| 32 | Native Topic surface acceptance | עבר | [32.log](results-trixie/32.log) |
| 33 | Native Researcher corpus acceptance | עבר | [33.log](results-trixie/33.log) |
| 34 | Native Number preview acceptance | עבר | [34.log](results-trixie/34.log) |
| 35 | Native 2029 Control Plane trace drill-down acceptance | עבר | [35.log](results-trixie/35.log) |
| 36 | Production build | עבר | [36.log](results-trixie/36.log) |
| 37 | Built dependency graph isolation | עבר | [37.log](results-trixie/37.log) |
| 38 | Verify isolated HTML artifact | עבר | [38.log](results-trixie/38.log) |

בדיקת A3 המשלימה: [39.log](results-trixie/39.log). בדיקת הדפדפן הממוקדת: [browser-progress-retry.log](results-trixie/browser-progress-retry.log).
