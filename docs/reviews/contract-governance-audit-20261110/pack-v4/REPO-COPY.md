# העותק הקריא במאגר של חבילת המסירה v4 — מה שונה מה־ZIP

התיקייה הזו היא העותק הקריא של `SOD1820-contract-governance-pack-20261111-v4.zip`: ‏SHA-256 ‏`604c3f529b0c4d5633c14686d55fb9621bf8403dabf314258966630782d29413`, ‏314 קבצים, נמסר ל־ZURIEL ב־11.11.2026. העותק זהה לחבילה, חוץ מהרשימה למטה. `MANIFEST.sha256` נשאר כפי שהוא, כרשימת התקינות של החבילה המקורית.

## אימות
```
cd docs/reviews/contract-governance-audit-20261110/pack-v4
sha256sum -c --ignore-missing MANIFEST.sha256     # 307 קבצים: OK; 7 חסרים לפי הרשימה למטה
```

## לא נכללו (פלט מסד לא נחוץ, ופרטים אישיים)
| קובץ בחבילה | SHA-256 (MANIFEST) | למה |
|---|---|---|
| `base/codex/37_plan37.txt` | `67f8234463e6de2c695ab9568413bb3973f7b2bf8005a94893fef5e64941ce5d` | העתק מלא של PLAN37 / Doc37 (‏`project_codex.id=37`, ‏618,963 תווים). Doc37 נמצא במסד ואינו קובץ במאגר. העתק כאן היה יוצר מקור מקביל, והוא כולל כתובת מייל של אדם פרטי |
| `base/codex/37_sod1820_reality_stream_os_master_v3_20261016_draft.txt` | `67f8234463e6de2c695ab9568413bb3973f7b2bf8005a94893fef5e64941ce5d` | אותו תוכן, בשם השני של אותה שורה |
| `base/words/unverified_2894.json` | `694dde45162fe8e43d88dddc1f271a744c08f2a5cc2f533316b914b31a813607` | 2,894 ביטויים שמשתמשים שלחו. חלקם כוללים מספרי טלפון ופרטים אישיים |

## הוחלפו בעותק מצונזר (כתובת המייל של בעל המערכת, מגוף קודקס #2)
| המקור בחבילה | SHA-256 של המקור | העותק כאן | SHA-256 של העותק |
|---|---|---|---|
| `base/codex/02_project_overview.txt` | `c391ce4c4ed3fa046d10c8a4a5749a7509ed824c4407dd452914ea90071d14f1` | `base/codex/02_project_overview.REDACTED-review-only.txt` | `6278c6c6a880b0c0d1dca88773179935325e3a34de1771c5f4e30b04f50997ea` |
| `new/codex/02_project_overview.txt` | `7b5c04dde92d3826cd63e2e6d71530eb91f974d49499376e882627d7f528183f` | `new/codex/02_project_overview.REDACTED-review-only.txt` | `190ae1ba3f82d3b81d18de8f580668d62d46fd837bc968bdc88789d5d0fe8460` |
| `sql/22_codex_stale_banners.sql` | `17cfccb1df22108a671c9340d24e9a279fd8912ee54c8fc7b313be58c5859ae6` | `sql/22_codex_stale_banners.REDACTED-review-only.sql.txt` | `90413411e22cfd9c2c3cff49742e78d05f407b5947c155c263dae2cb196f7dad` |
| `sql/27_codex_stale_banners_ROLLBACK.sql` | `46711d380195df6c6c78d7b8d704ed6c8b015a50a9948068555aa4f73b70e8f2` | `sql/27_codex_stale_banners_ROLLBACK.REDACTED-review-only.sql.txt` | `9212c3b09dc70e4c85530903114a2444554ac72690135d239a73af9a81e94054` |

בכל עותק הוחלפה רק המחרוזת של כתובת המייל, ב־`[REDACTED: owner email]`. בשני קובצי ה־SQL נוספו בראש שלוש שורות הערה. **העותקים המצונזרים אינם ניתנים להרצה**, כי בדיקות ה־md5 שבהם כבר לא תואמות לשורה החיה. המקורות להרצה נמצאים רק בחבילה הפרטית (ה־ZIP), וזיהויים לפי ה־SHA-256 שבטבלה.

## נוספו במאגר
* `REPO-COPY.md` — הקובץ הזה.
* `sql/STATUS.md` — הסטטוס בפועל של כל קובץ SQL (APPLIED / NOT APPLIED / NOT EXECUTED).

## הרצת הסימולציות מהעותק הזה
* **רצות כפי שהן:** `sim/run_exec_form_sim.mjs` ו־`sim/run_p0_sim.mjs`. הן צריכות רק את קובצי הבסיס של שש שורות SQL 10 ושל `admin_suggestion_decide`, ואלה כלולים. מריצים: `cd sim && npm ci && node run_exec_form_sim.mjs` (Node 24.21.0).
* **דורשות שחזור מקומי לפני ריצה:** `run_corpus_sim.mjs`, ‏`run_stage2_sim.mjs`, ‏`run_all_sim_v2.mjs`, ‏`run_all_sim_v2_exec.mjs`. אפשר להשתמש בחבילה הפרטית, או ליצור מחדש מהמסד בקריאה בלבד. **לא להכניס את הקבצים שנוצרו למאגר.**
  * PLAN37: ‏`select body from public.project_codex where id=37`. הבסיס ב־11.11: md5 ‏`c06a461d21a661953b297370bca72138`, ‏618,963 תווים. שומרים בשני שמות הקבצים שבטבלה.
  * המילים: `select coalesce(json_agg(json_build_object('id',id,'p',phrase,'v',is_verified,'r',visibility_reason,'t',visibility_tier,'pub',is_published,'s',source,'c',to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS')) order by id), '[]'::json)::text from public.gematria_words where is_verified=false`. החתימה החיה ב־11.11: ‏`09b4e65afbaee2962aea42ca0624df58` (נוסחה ב־`sim/run_corpus_sim.mjs`).
  * קודקס #2 ו־`22_`/`27_`: המקורות רק מהחבילה הפרטית.
* כל הסימולציות מקומיות (PGlite), ואף אחת לא מתחברת למסד החי.
