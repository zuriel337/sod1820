# SOD1820 2029 — סריקת עומק עצמאית לעץ התוכן האחד
**סוג:** Architecture & Content Audit · READ ONLY · סוקר עצמאי (CLAUDE)
**תאריך:** 2026-10-18 · **Base:** `origin/main` = `6ef3ec2d6c139cd06af628b20ac2d5c3fb776a70` (זהה ל-HEAD המקומי; עץ עבודה נקי לפני הדוח)
**Supabase:** `linswmnnkjxvweumprav` (Production, קריאה בלבד)
**נמען:** ZURIEL. אין מסירה ל-GPT, אין המתנה ל-ACK (inter_agent_coordination_law v17).
**שורת יומן:** `work_log.id=53e4e11d-d74c-418f-abd3-3c7934db66b0` (`task_key=CLAUDE_CONTENT_TREE_READONLY_AUDIT_20261018`, AFTER פסיבי ל-ZURIEL).
**סטטוס מסמך זה:** קובץ מקומי לא-מנוסב, לא נדחף, לא נוגע במסמך 37. הממצאים ממופים בסוף (נספח ג׳) לשורות מועמדות לפרק 34.

תוויות ראיה: **VERIFIED** (נבדק חי/בקוד בסשן זה) · **PARTIAL** (נבדק חלקית) · **PROPOSED** (המלצה/כיוון, לא מומש) · **UNKNOWN** (לא ניתן לאמת בסביבה זו).

---

## 0. היקף כיסוי ומגבלות (חובה לקרוא)

**נקראו:** `CLAUDE.md` · `SOD1820_MASTER_OWNER_INDEX.md` · `SOD1820_MASTER_ROADMAP.md` (v6.12) · `docs/sod1820-product-map-2027-v1.md` · `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` · `docs/2029-unified-control-center-architecture-freeze-v1.md` · `project_codex.id=37` (slug `sod1820_reality_stream_os_master_v3_20261016_draft`, 83,417 תווים, עודכן 18.10 02:39 UTC) — פרקים 20–21 ו-29–34 במלואם · 7 רשומות `work_log_current` של `SOD1820_CONTENT_DISCOVERY_PILOT_20261018` (2 נקראו לעומק, 5 ברמת כותרת/סטטוס) · `SOD1820_DESIGN_CONTRACT_V2.md` **חלקית בלבד** (§8, §8.1, §11.8, §12, "Shared content color/action"; לא נקראו §§1–7, 9–10, 11.1–11.7, נספחי האייקונים).

**לא נגיש / לא נקרא — לא הונח שנבדק:**
- הענף `gpt/content-discovery-pilot-20261018` — **אינו קיים ב-origin** (`git ls-remote` ריק; עקבי עם פרק 34.1 "לא הועלה למאגר המרוחק"). `docs/content-discovery-pilot-20261018.md` לא קיים ב-main. **UNKNOWN**: תוכן הקוד/הדוח של הפיילוט, 38 הבדיקות, והקומיטים `d448876a`/`d47b45e1`/`d846ca23`. רשומות ה-work_log מציינות ספירות בדיקות שונות (27 מול 38, ראו פרק 34.1) — כנראה קומיטים עוקבים; **UNKNOWN**.
- `AGENT_HANDOFF.md`, `SOD1820_MASTER_STATE.md`, `docs/media-posts-gallery-foundation-closure-delta.md`, `docs/SCHEMA_content_layer.md`, `audits/identity_unification_v1` — לא נקראו (החלטה מכוונת: מעבר לתקציב L2, אין סיבה לחשוד שישנו מסקנה). **UNKNOWN** אם הם מחזיקים ראיות סותרות.
- לא בוצעו בדיקות HTTP/דפדפן/Playwright מול Production; אין הוכחת "המסלול דרך Data API מקצה לקצה" — אך הוכחת DB-level נעשתה ב-`SET LOCAL ROLE anon` בטרנזקציה `READ ONLY` שבוטלה (rollback).

**שיטה:** ~75 שאילתות SELECT תחומות (ספירות, התפלגויות, מדגם נקודתי לפי id), קריאת הגדרות פונקציות ו-policies מ-`pg_catalog`, הרצת `convergence_meter(n)` (פונקציית STABLE לקריאה בלבד) על 7 מספרים, ו-grep/ניתוח בקוד `origin/main`. **לא** נקראו גופי הודעות פרטיים, לא הועתקו גופי טקסט, לא הורצו OCR/AI/סריקות כבדות. גופי פוסטים ציבוריים נקראו רק לצורך ספירת כותרות/מקטעים ובדיקת שוויון (hash). **אין INSERT/UPDATE/DELETE/DDL, אין שינוי קוד/ענף/PR.**

**דריפט שנמצא מול פרק 31 (נכון ל-18.10):** המספרים של פוסטים/תגיות/גלריות/צרפת הוכפלו ואומתו (ראו §3). ממצאי צבי עלו: `OPOC1 OPOC1` approved 202→**237**, candidate 161→**169** (צבי/OPOC1 הוסיף חומר בין הסריקה לדוח זה — DRIFT חי, לא טעות).

---

## 1. תמונת מצב — בנוי / ממופה / חסר / קיים-אך-לא-מחובר

### 1.1 מה בנוי ופועל (VERIFIED)
| רכיב | ראיה |
|---|---|
| זהות פוסט אחת (`posts.id`/`slug`) + 1,305 פוסטים; `post_revisions` (208 גרסאות ל-100 פוסטים) | `posts`, `post_revisions` |
| Reality Graph: 6,644 `nodes` (6,190 פעילים שאינם חוקים), 7,262 `edges` ב-25 סוגי `relation_type` | `nodes`,`edges` |
| שכבת וידאו מאוחדת לקריאה: `video_media_assets_v1` (2,278 נכסים) / `video_media_placements_v1` (2,351 הופעות: post 2,196 · channel_update 149 · home_video 6) | views חיים |
| `video_transcripts` רב-לשוני עם `is_original` ו-unique index אחד-מקור-לכל `video_key` | `video_transcripts_one_original_per_key_uidx` |
| `research_objects` (2,260) עם `source_ref` בכל השורות, `research_object_revisions` (5,602) | מבנה זהות מקור-נייטיב קיים |
| `contributors` (2,327) כולל `wa_names[]`, `trusted`, `dossier_settings` | זהות כתב קיימת למי שנוצרה לו שורה |
| מסלול שמירת מקור-נייטיב ל-`video_semantic_map` (RPC `research_video_semantic_map_save_v1`, service_role בלבד) + קורא `videoSemanticMap.js` | קוד + DB |
| `channel_ingest_sources` (5 ערוצים) + `channel_updates` (2,483) | `intake_mode` לכל ערוץ |
| אינדקסי איתור: `posts_content_trgm_idx`, `posts_title_trgm_idx`, `posts_fts_simple_idx`, `idx_gi_desc_trgm`, GIN על `gallery_images.all_values/ocr_numbers/tags` | `pg_indexes` |

### 1.2 מה ממופה אך חלקי (PARTIAL)
- סדרה/נושא/מדיה: מופרדים בחוזה (Content Foundation §1) אך ממומשים כשלושה קוראים שונים (ראו חסם 5).
- פיילוט תוכן: קיים מקומית בלבד (**UNKNOWN** לתוכן), אין קורא חי.
- מפת סרטון סמנטית: **5 רשומות בלבד**, כולן `private/candidate`, 3 מהן `or-geula` (partial), 1 `scene_order_only_no_exact_timecodes`.
- תמלולים: 10 סרטונים (55 שורות שפה) מול 2,278 נכסי וידאו (≈0.4%).

### 1.3 מה חסר (VERIFIED כחסר)
1. **שכבת יחידת-מקור יציבה** (מקטע/כותרת/דקה/עמוד) — אין טבלה/עמודה/מזהה; ראו חסם 2.
2. **מזהה גרף לפוסט שאין לו `wp_id`** — סכמת `identity_key='wp:<wp_id>'`; 15 פוסטים (5001–5119) ללא `wp_id`, כולל 5107, 5113, 5118, 5119.
3. **זהות כותב/ערוץ/סדרה** כאובייקט — `posts.author` טקסט חופשי; אין FK; אין קשת quote "authored_by/series_of/part_of" באוצר היחסים (25 סוגים).
4. **קשר 5112↔5116** — אין קשת, אין קישור בטקסט (ראו מקרה 5).
5. **קישור גלריה↔פוסט** — `gallery_images.related_post_id` ריק בכל 2,562 השורות.
6. **קידום `research_objects` לגרף** — `promoted_node_id` null בכל 2,260.

### 1.4 קיים אך לא מחובר
- `contributors.wa_names` (כינויי צבי) — נקרא אך לא משמש לשליפה בדף הכתב (פרק 31.1; אומת בקוד לפי דיווח בפרק, לא נבדק מחדש שורה-שורה — **PARTIAL**).
- `video_media_placements_v1.series_keys` — מכיל `mah-kore-habora`, `or-geula`, `dimension-five`, `cipher`, `torat-haremez`; אינו מחובר לשום ישות סדרה בגרף.
- `post_revisions` (עם categories/tags) — מחזיק את הראיה למה שהשתנה, אבל "יחידה שהשתנתה" מחוברת רק דרך קבוע JS מקודד (חסם 2).
- `topic_cards.meter_score`, `quality`, `node_id` — קיימים; `ConvergenceRatings2029` צורך אותם; לא מחוברים לפוסט/גלריה.

---

## 2. מטריצת משפחות: מקור → זהות → יחידה → קשר → קורא → הרשאה → תצוגות

| # | משפחה | מקור האמת | מזהה קנוני | יחידה/מקטע | קשר בגרף | קורא פעיל | הרשאה (anon DB) | תצוגות | כמות |
|---|---|---|---|---|---|---|---|---|---|
| 1 | פוסטים/מאמרים | `posts` | `posts.id`+`slug`; גרף `wp:<wp_id>` | **אין** (HTML; `data-source-heading` ב-5114/5118 ללא id; 2 פוסטים עם מפת קבוע JS) | 312/1,305 עם צומת; `post→entity mentions` 414; `post→number documents` 55 | `getPostsFromSupabase`, `getPostBySlug` (`select *`) , `post2029ReadingProjection` | `posts_anon_read = true` + SELECT על כל 42 עמודות. **כולל 9 טיוטות** | Posts2029, Post2029, World, Home | 1,305 · 24 `home_hidden` · 16 ללא `image_url` · 58 ללא thumb |
| 2 | גלריות/תמונות/OCR | `galleries`+`gallery_images` | `gallery_images.id` (uuid); גרף: 2,478 צמתי `image` **ללא identity_key**; `mediaIdentity()` בקוד = `media:gallery_image:<uuid>` | תמונה=יחידה; אין מקטע בתוך תמונה | `post_gematria_links` (583, wp-keyed); `related_post_id` ריק | `galleryMediaEnvelope.js`, `gallery_image_tree` | `gi_anon_sel=true` על כל 36 עמודות כולל `ocr_text`,`min_tier`,`published`,`curator_hidden` | World, Number, Topic | 2,562 · 104 גלריות · 2,546 עם `occurred_at` |
| 3 | וידאו/הופעות/תמלולים | נכס: `video_media_assets_v1` (view); תמלול: `video_transcripts`; מפה: `research_objects.meta.ext.video_semantic_map` | `asset_key` (`url:`/yt) — מזהה נגזר מכתובת | מקטע זמן **רק** ב-5 מפות פרטיות | הופעות ב-3 סוגי מקור | `videoSemanticMap.js`, placements view | `video_transcripts_read` (published) — אך אין grant ל-anon בפועל; views לפי הגדרה | ספריית וידאו, Post | 2,278 נכסים · 52 כפולים · 1,377 `has_unresolved_placement` · 1,379 `needs_review` |
| 4 | כותבים/יוצרים/ערוצים/סדרות/מקורות | `contributors` (2,327, מהם 2,297 `external`), `channel_ingest_sources`, `stories`, `home_videos`, מחרוזות | `contributors.id/slug`; ערוץ=`channel` טקסט; סדרה=טוקן ב-`tags` + `series_keys` | — | ישות `אור הגאולה` קיימת כ-`gw:` (מילת גימטריה!) | קוראים נפרדים לכל אחד | `contributors`: אין grant ל-anon (נגיש רק דרך RPC/שרת) | דף כתב, Posts | 892 פוסטים (68%) ללא כותב; 303 "מזכה הרבים" ללא זהות |
| 5 | הודעות WhatsApp/ערוצים | `channel_updates` + `wa_msg_ext` | `channel_updates.id` + `ext_msg_id` (1,534/1,566 בערוץ הראשי) | הודעה=יחידה; אין מקטע | `research_objects.source_ref='channel_updates:<uuid>'` 1,713 | `worldGroupSource.js`, `researcherCorpusProjection.js` | `cu_public_read`: `status='live'` בלבד (1,908 גלויות ל-anon). **`group_source_intake_public` אינו תנאי RLS** | World, Home Updates | 2,483 · ~400 `private` |
| 6 | גימטריות/מספרים/התכנסויות/ממצאים | `nodes(number)`, `convergences`, `topic_cards`, `research_objects`, `relation_evidence` | `nodes.id`; `topic_cards.slug`; `tc:<uuid>` | — | `converges_on` 174, `equals` 392 | `convergence_meter`, `topic_cards_public` (view SECURITY DEFINER) | `topic_cards_public_read` (approved ∧ not `_do_not_publish`); `relation_evidence_public_read = true` | Number, Topic, World | 2,159 number · 8,917 convergences · 205 public cards |
| 7 | ספרים/פסוקים/ELS | `nodes(book)` 31 (7 פעילים), `tanach_verses`, `torah_stream`, `els_records` | `book:<slug>`; `els_records.slug` | פסוק/מיקום | — | `canonicalEls.js`, `els_search_page_v1` | `public_read_published_els` ∪ **`public_read_self_published_els (self_published=true)`** | ELS, Heichal | 130 (34+9 פורסמו) |
| 8 | קהילה/תגובות | `comments` (1,084 WP), `research_contributions` (41,472) | `wp_id` / uuid | — | `contribution_links` | Community2029 | `rc_public_read`: `status='approved'` → **25,612 גלויות ל-anon** (25,524 `openweb`, 34 `whatsapp_group`) | Community | — |

**הערה על "כל משפחה":** עמודות "מיקום מקור", "כפילויות" ו"חוסרים" פורטו לכל משפחה בחסמים (§4) ובמקרי המבחן (§3).

---

## 3. מטריצת מקרי מבחן

> לכל מקרה: מה קיים (VERIFIED אלא אם צוין), מה חסר, מה פועל, מה נדרש. מזהים טכניים בלבד.

### מקרה 1 — סוד החשמל · פוסטים 5114, 5118
| פריט | ממצא | סטטוס |
|---|---|---|
| 5114 | `source='source_document'`, `author/authors='סוד החשמל'`, categories=`[סוד החשמל]`, 49,243 תווים, **3** כותרות `h2` עם `data-source-heading="true"`, **ללא `id`**; צומת גרף `wp:37045` עם **0 קשתות**; 5 גרסאות (1–12.10) | VERIFIED |
| 5118 | `wp_id` null → **אין צומת**; אין `image_url`/`thumb_url`; **2** מאמרים; 4 גרסאות (15.10) | VERIFIED |
| כפילות | hash על טקסט מנורמל: מאמר 1 של 5114 ≡ מאמר 2 של 5118 (23,904 תווים, זהה); מאמר 3 של 5114 ≈ מאמר 1 של 5118 (14,877 מול 14,879 תווים, hash שונה). **5118 מפרסם מחדש 2 מתוך 3 המאמרים של 5114** | VERIFIED |
| זהות "סוד החשמל" | אין שורת `contributors` (רק מקור-דוא״ל פרטי בשם דומה); קטגוריה `סוד החשמל` ב-125 פוסטים; `author` ב-7; ערוץ `sod-hachashmal` 10 עדכונים (3.7); 9 `research_objects` ממקור "גליון ראש השנה" | VERIFIED |
| חסר | ישות גיליון → מאמר → יחידה עם מזהה יציב; יחס "אותו טקסט" בין 5114#1 ל-5118#2 ללא ספירה כפולה כראיה; דף מקור אחד (פרק 30.2) | — |
| פועל כיום | קריאה כפוסט שלם; גרסאות ב-`post_revisions`; קטגוריה לסינון | — |
| נדרש | מזהה מקטע נייטיב (לפי `research_object_identity_invariant_law`) שמרכיב את `data-source-heading` לעוגן; דדופליקציה לפי hash; ישות "משפחת מקור" אחת | PROPOSED |

### מקרה 2 — מימד חמש / הצופן בסרטים · פוסטים 5003, 5004
| פריט | ממצא | סטטוס |
|---|---|---|
| 5003/5004 | `wp_id` 36945/36946; `source='ai'`; categories=`[מימד חמש, הצופן בסרטים]`; tags כוללים `מימד חמש` (ו-`מטריקס`/`משחקי הדיונון` בהתאמה); **אין מדיית וידאו** (0 `<video>`, אינם ב-`video_media_placements_v1`) — פוסטי תמונה+טקסט; **אין צומת גרף** | VERIFIED |
| סדרה מול נושא | הפרדה מאושרת (18.10): סדרה=מימד חמש, נושא=הצופן בסרטים, יצירה=מטריקס/דיונון. **במסד שני התפקידים בתוך אותו מערך `categories`**; `הצופן בסרטים` מופיע **רק** ב-categories (2 פוסטים), 0 ב-tags, אין ישות/נושא בגרף (קיים רק `theme:culture-cipher` "צופן בתרבות" — שימור/התאמה **UNKNOWN**); אין צומת ליצירות | VERIFIED |
| מימד חמש בכלל | 41 פוסטים (tag 39 · category 41 · 2 קטגוריה-בלבד). מתוכם **31 עם וידאו ו-10 בלי** (כולל 5003/5004). `series_keys=dimension-five` מופק מ-**categories** ב-view החי; החוזה (Content Foundation §5) קובע **tags**. כרגע מתיישר (0 tag-only) | VERIFIED |
| נדרש | להכריע אם 10 פוסטי-תמונה הם "סדרת סרטונים" (הבהרת המשתמש: סדרת סרטוני תודעה) או חברות עריכתית מפורשת; לא למחוק את שני השיוכים; יחידה שלישית "יצירה" כישות-מקור | PROPOSED |

### מקרה 3 — אלון לוי / מה קורה הבורא · פוסט 5119
| פריט | ממצא | סטטוס |
|---|---|---|
| 5119 | `wp_id` null; `author='אלון לוי'`, `source='ai'`; categories `[תיעוד אירועים, וידאו]`; tags כוללים `מה קורה הבורא`; **נכס וידאו אחד** (`series_keys=[mah-kore-habora]`, `speaker='אלון לוי'`) מתארח ב-`d2ol7oe51mr4n9.cloudfront.net` (CDN חיצוני, לא Supabase/YouTube) ; **אין תמונת תצוגה/thumb**; אין צומת גרף | VERIFIED |
| שלושה אירועים | הטקסט מכיל אותם בתוך בלוק `h3` ראשון ("בדיקת האירועים בחדשות", שורות מתוארכות 12.10/14.10…) — **לא שלוש יחידות נפרדות** ואין מזהי אירוע; `post_gematria_links` אין ל-5119 | VERIFIED |
| אלון בכלל | 11 פוסטים עם `author='אלון לוי'`, כולם עם וידאו; רק **6** מתויגים `מה קורה הבורא` ונמצאים ב-`mah-kore-habora`; 5 מוקדמים (54, 5021, 5035, 5042, 5069) לא בסדרה — **עקבי** עם "לא שיוך גורף". 0 פוסטים שלו ב"מימד חמש" | VERIFIED |
| זהות | אין שורת `contributors` ל"אלון לוי"/"מה קורה הבורא"; אין ישות סדרה | VERIFIED |
| נדרש | ישות יוצר + ישות סדרה (שקשורות ל-`series_keys`), שלוש יחידות-אירוע מתוך מקור אחד עם `locator`; הגירת סרטון ל-storage קנוני או סימון תלות חיצונית | PROPOSED |

### מקרה 4 — הבחירות והמלח · 5107, 5113
| פריט | ממצא | סטטוס |
|---|---|---|
| 5107 | `slug=sharshar-elections-redemption-hints-draft`, **לא מתויג `טיוטה`** (פורסם; ה-slug מכיל "draft"), מקושר בקוד ההקרנה (`post2029ReadingProjection.js:495`, תווית `post:5107`); `wp_id` null; 8 `id` בגוף; וידאו אחד (selfhost); 10 גרסאות | VERIFIED |
| 5113 | **מתויג `טיוטה` ו-`2029-golden-only`**, 12,177 תווים, 9 `h2`, 20 `id`; אין תמונה; 6 גרסאות; **נגיש ל-anon ב-DB** | VERIFIED |
| מקטעים | רק כאן קיימים מזהי מקטע (`bennett-israel-78` וכו') — אך ה"הוכחה" שהם עודכנו נמצאת ב-**קבוע JS** `PROVEN_POST_SOURCE_UPDATES` (מפתח לפי post id: 5113, 5107) עם `beforeRevision/afterRevision` | VERIFIED |
| פרטיות | "טיוטה" = תג בלבד; כל קורא מממש מסנן משלו (`worldSourceCorpus.js`, `homeUpdates.js`, `api/sitemap.js`, `supabase.js`); `getPostBySlug` ללא סינון; הסתרה בהצגה בלבד | VERIFIED |
| נדרש | מקור מקטעים ב-DB (לא קבוע בקוד); מצב פרסום כעמודה/מדיניות RLS | PROPOSED |

### מקרה 5 — טיסה 1073 · 5112 וחיבורים ל-5116
| פריט | ממצא | סטטוס |
|---|---|---|
| 5112 | `wp_id=37044`, צומת `wp:37044`, **28 קשתות `documents`→number**; 59 תגיות; 2 סרטונים (selfhost); 28 גרסאות; מתויג `2029-golden` (לא `טיוטה`); 24 `research_objects` (public_candidate/approved) | VERIFIED |
| 5116 | `wp_id=37047`, צומת קיים, **0 קשתות**; סדרה `dimension-five`; דובר "מדריך לריפוי 10 הספירות" (`author`, אין `contributors`); נכס וידאו אחד | VERIFIED |
| קשר 5112↔5116 | **אין קשת**; **אין קישור/slug** באף כיוון; 5112 אינו מזכיר "עשר הספירות"; 5116 מצהיר שהוא מתחבר ל"פוסט 7.10" ולא ל-5112; אף `research_object` אינו מציין 5116. צמתי המספרים 363/1331/1073/10/7/3 **קיימים** (6 קשתות יוצאות מ-363/1331) | VERIFIED |
| מסקנה | החיבור (7 מידות+3 מוחין→10 ספירות=1331 ; משיח 1331 ; המשיח=363) הוא **PROPOSED** בלבד (עקבי עם פרק 21). אסור להציגו כקשר מאושר | — |
| מד | `convergence_meter(1073)=11`, `363=67` — מד זה אינו מודד חוזק אירוע (חסם 7) | VERIFIED |

### מקרה 6 — הכותל / 1820 / 424 · פוסט 5009
| פריט | ממצא | סטטוס |
|---|---|---|
| 5009 | "עטרת תפארתכם = 1820"; `wp_id=36951`, `source='ai'`; תמונה אחת מ-`gallery/sod1820/broadcasts`; **אינו מזכיר "כותל" ואינו מזכיר 424**; tags `[1820, סוד 1820, גאולה]`; אין צומת גרף | VERIFIED |
| תצלומים היסטוריים | 11 תמונות גלריה מזכירות "כותל"; **הכי מוקדמת לפי `occurred_at`: 2017**; 0 לפני 2000; 1 עם 1820 ו-2 עם 424. **אין תמונה "היסטורית" (טרום-2013)** — ייתכן שהתאריך מיובא (ראו חסם 8) | VERIFIED |
| ביטויים/מקורות | 42 פוסטים מזכירים "כותל"; 122 פוסטים מכילים 1820 ו-424 בגוף; 12 עדכוני ערוץ; צמתי number ל-424, 1820 קיימים; מד: 424=100, 1820=89 | VERIFIED |
| חסר | שום קישור 5009↔תצלומי הכותל↔424; `related_post_id` ריק; הטענה "5009 קשור לכותל" אינה נתמכת בפוסט עצמו | — |

### מקרה 7 — צבי · הודעה שאינה פוסט, כינויים, צרפת
| פריט | ממצא | סטטוס |
|---|---|---|
| זהות | `contributors.slug='tzvi-opoc'` (`trusted`, `dossier=public`), `wa_names=[OPOC1 OPOC1, צבי (OPOC1), צבי]` | VERIFIED |
| הודעות | `channel_updates` עם `contributor_id` שלו: **562 live · 202 private · 9 off**. הציבוריות נקבעת ע״י `status='live'` בלבד | VERIFIED |
| מחקר | `research_objects` לפי `contributor` (טקסט): 991 `צבי (OPOC)` approved/private + 237 `OPOC1 OPOC1` approved/private + 169 candidate/private (**כולם `private`**, `promoted_node_id` null) | VERIFIED |
| אישור קבוע | trigger `trg_00_zvi_standing_approve_research_object` מאשר אוטומטית לפי **UUID מקודד** (`c66f0464-…`) או `credit='צבי (OPOC)'` — אינו נשען על `contributors.trusted`/`wa_names` (גנרי ל-0 כותבים נוספים) | VERIFIED |
| צרפת | התאמות מחרוזת: 9 פוסטים עם תג מדויק · 36 עם המחרוזת בכותרת/גוף (**30 בלי תג**) · 29 תמונות גלריה (27 מהן published ∧ ¬hidden) · 5 עדכוני ערוץ (3 live, 1 private) · 3 `research_objects` (**private**) · 11 תגובות מפורסמות · 0 תמלולים · 0 `els_records` · 0 `topic_cards` · 3 צמתים פעילים (כותרות) · אין עוגן "צרפת" | VERIFIED (חוזר על פרק 31.1) |
| פער קורא | דף הכתב מסנן לפי `display_name` בלבד (מחמיץ 3 ממצאי צרפת תחת הכינוי) ומוגבל ל-1,000 שורות — מדווח בפרק 31.1 | PARTIAL (לא נבדק מחדש בקוד) |
| אינדקס | אין trgm/FTS על `gallery_images.ocr_text`, `channel_updates.text`, `research_objects.statement`; חיפוש "צרפת" חוצה-מקורות **לא קיים כנקודת שרת** | VERIFIED |
| פרטיות | `source_ref` של 69 שורות מחקר = מזהי WhatsApp בפורמט טלפון (`…@c.us`) — PII בשדה מזהה (לא מועתק לכאן) | VERIFIED |

### מקרה 8 — מספר 45 · תמונות היסטוריות, תאריכי כותרת, עדכוני מקור
| פריט | ממצא | סטטוס |
|---|---|---|
| גלריות | "רמזים 45 תשעט" (49 תמונות, `time_news`) ו-"רמזים במספר 45 עז - עח" (88 מוצהר, 85 בפועל) — **133 מתוך 134 התמונות `occurred_at` ביום 1 בחודש**; טווח 2013-11→2019-08; 0 `stream_at` | VERIFIED |
| דיוק תאריך | בכל הטבלה 2,185/2,546 (86%) ביום 1; 176 ב-1.1; **אין שדה דיוק/תפקיד תאריך**; שנה עברית בכותרת (תשעט, עז–עח) לא מפוענחת | VERIFIED |
| 45 בנתונים | `primary_value=45`: 43 שורות (42 URL ייחודי, 36 גלויות); `all_values∋45`: 439; `ocr_numbers∋45`: 436; `related_values`: 0. מד `convergence_meter(45)=78` | VERIFIED |
| כפילות/ניפוח | 167 קבוצות URL זהות (361 שורות); 72 קבוצות (שם,ערך) כפולות (430 שורות, הקבוצה הגדולה 77); צמתי `image` בגרף עם שם זהה חוזר (למשל 15× אותו קובץ) | VERIFIED |
| עדכוני מקור | אין שורת "נוספו N תמונות ב-תאריך"; `source` בתמונות: `hugeit_migration` 2,152 · `manual` 356 · `update` 37 · **14× `pilot:zvi:channel_updates:*`** · `cipher` 1 | VERIFIED |
| נדרש | תפקיד+דיוק תאריך (`month_only`) לפני כל Time-Flow (עקבי עם פרק 29.2); יחידת "מקבץ" נפרדת מהתמונה | PROPOSED |

### מקרה 9 — אור הגאולה · מקור סרטונים שאינו כותב
| פריט | ממצא | סטטוס |
|---|---|---|
| ערוץ | `channel_ingest_sources` (`or-geula`, `admin_only`, `intake_mode='story_first_selective'`) ; `channel_updates`: 192 (live 190) , 161 עם תמונה | VERIFIED |
| קרדיט | `credit='אור הגאולה'` ברוב המכריע של 192 (לפחות 165 שנספרו בדגימת ה-top-10); `speaker` טקסט חופשי עם **רעש ניתוח** (כולל שברי משפט כ"דובר"); אין `contributor_id` באף שורה | VERIFIED |
| גרף | ישות "אור הגאולה" קיימת כ-`gw:<uuid>` (ישות-מילה/גימטריה) — **לא** כמקור/ערוץ; אין שורת `contributors`; `series_keys` כולל `or-geula` | VERIFIED |
| מפות | 3 מפות `video:or-geula:*` (partial/private/candidate) | VERIFIED |
| נדרש | ישות ערוץ-מקור נפרדת מ"כותב"; `speaker` ללא ייחוס אוטומטי; שלוש המפות לא ציבוריות | PROPOSED |

---

## 4. עשרת החסמים המשמעותיים ביותר

| # | עדיפות | חסם | ראיה | בעל אחריות קיים | המלצת תיקון (לא לבצע כעת) |
|---|---|---|---|---|---|
| 1 | **P0** | **חשיפת שורות לא-ציבוריות ל-anon ב-DB** | `SET LOCAL ROLE anon` (rollback): `posts` 1,305 (מתוכן 9 טיוטות) · `gallery_images` 2,562 (**318 לא-published, 63 hidden, 14 עם `min_tier>0`**) · `els_records` 130 (**87 לא-ציבוריים**: hidden/pending/draft דרך `self_published=true`) · `research_contributions` 25,612 · `channel_updates` 1,908 (**live — מכוון**, ראו הערת `group_source_intake_public` בהמשך). 14 שורות `gallery_images` נושאות `source='pilot:zvi:channel_updates:*'` עם `ocr_text`; **5 מהן מקושרות להודעות במצב `off`** (הוסרו). `has_column_privilege(anon, ocr_text/min_tier)=true` | Security Hardening plan (Pre-Cutover Security Gate) · Media owner · `truth_axes_foundation_law` · Person Foundation | מדיניות RLS תלוית-סטטוס (`published=1 ∧ ¬curator_hidden ∧ min_tier=0`), הסרת `self_published` כעוקף, מדיניות `posts` שמוציאה `טיוטה/פורום`, סינון `rc_public_read` לפי origin. **אין תיקון בלי החלטה — security weakening/strengthening Human-Gated** |
| 2 | **P0** | **אין זהות יחידת-מקור יציבה** | 5114/5118: `data-source-heading` ללא id ; `PROVEN_POST_SOURCE_UPDATES` קבוע JS ל-2 פוסטים; אין טבלה/עמודה/locator; `research_objects.source_ref` כן קיים (2,260) אך אינו מפנה למקטע פוסט | `research_object_identity_invariant_law` v2 · Research Intake v13 · `publishing_conventions` | להרחיב את קורא ה-fragment (G4 outstanding adapter, פרק 11.8) כך שמזהה מקטע = `(post.id, locator מקורי)`; ללא טבלה חדשה: שימוש ב-`research_objects`+`source_ref` |
| 3 | **P0** | **כיסוי זהות פוסט→גרף ושימוש בסכימת `wp:` בלבד** | 312/1,305 פוסטים עם צומת (24%); 978 פוסטי WP בלי צומת ; 15 פוסטים ללא `wp_id` אינם ניתנים למפתוח; 113 צמתי `event` הם **תאומים** של 113 פוסטי WP (אותו `identity_key='wp:N'` בשני צמתים, סוג שונה) + 113 קשתות `post→event documents` ; 5107/5113/5118/5119/5003/5004/5009 ללא צומת | `reality_graph_law` v8 · `research_object_identity_invariant_law` | מפתח `post:<posts.id>` נוסף/חלופי; הפרדה פוסט≠אירוע; אין Backfill גורף — רק הפריטים שה-Golden צורך (פרק 18/Roadmap) |
| 4 | **P1** | **זהות כותב/יוצר/ערוץ/סדרה כטקסט חופשי** | 892 פוסטים (68%) בלי `author`; "מזכה הרבים" 303 ו"אלון לוי" 11 ו"סוד החשמל" 7 ו"הרב ווינטרוב" 6 ללא `contributors`; `speaker` של אור הגאולה כולל רעש; ישות "אור הגאולה" = `gw:` | `writer_material_home_law` v6 · `person_foundation_contract_law` v6 | זהות מוכחת → `contributor_id`/ישות ערוץ; alias אינו הוכחת שולח (פרק 31.3). מיפוי לפי טבלת "מקור+מזהה→תפקיד→זהות יעד" (פרק 31.3) |
| 5 | **P1** | **הפרדת סדרה/נושא/מדיה — שלושה קוראים שונים** | חוזה: Series=tags ; view חי: `dimension-five` מ-categories; `הצופן בסרטים` רק ב-categories ; קטגוריה `וידאו`: 229 פוסטים, אך 504 פוסטים עם מדיית וידאו (**284 בלי הקטגוריה**, 9 עם הקטגוריה בלי מדיה); 39 קטגוריות מערבבות מקור (`סוד החשמל` 125), מדיה (`וידאו` 229), נושא (`ארה"ב`), סוג (`הרצאות`), סדרה (`מימד חמש`) | Content Foundation · `reality_graph_law` · `publishing_conventions` | להשלים את טבלת הכרעת-תפקידים (פרק 30.3) ולהחיל על קורא אחד; לא להסיר categories לפני תיקון ה-view |
| 6 | **P1** | **חיפוש/כינויים/תמלולים חוצי-מקור** | אין נקודת חיפוש שרת מאוחדת; trgm רק על posts ו-`gallery_images.description`; אין אינדקס על OCR/הודעות/מחקר; תמלולים ל-10 סרטונים; דף כתב מסנן לפי `display_name` + 1,000 שורות; smart-search ישן מחזיר 410 | Research Strategy v17 · explorerFacets · Intake | RPC/אינדקס נגזר מורשה עם pagination, "סיבת התאמה" (מוזכר/שויך/קשר מחקרי), ללא תיקון נתונים; הוכחת `EXPLAIN ANALYZE` לפני אינדקס (פרק 29.5) |
| 7 | **P1** | **המד: ערבוב, ניפוח ודריפט** | ראו §6 | `research_gold_hints_law` · `cross_vs_convergence_criteria` v4 · Truth Axes | קריאה בלבד: הפרדה מוצהרת של שלושת החוזים ; אין שינוי ציונים |
| 8 | **P1** | **תאריך ודיוק + זהות תמונה** | 86% `occurred_at` ביום 1; אין שדה דיוק; 167 קבוצות URL כפולות ; 2,478 צמתי `image` בלי `identity_key`; `related_post_id` ריק; `galleries.img_count` ≠ בפועל (88 מול 85) | Media owner · `truth_axes_foundation_law` (time context) | תפקיד+דיוק תאריך כמטא נגזר מהכותרת (פרק 29.2); דדופ לפי URL לפני ספירה |
| 9 | **P1** | **שכבת הווידאו: תלות חיצונית וכיסוי** | 2,278 נכסים: **1,374 Google Drive** , 412 YouTube, 408 Supabase, 30+ בדומיינים חיצוניים שסווגו `selfhost` (dropbox, akamai, cloudfront…); 1,379 `needs_review`; 52 כפולים; מקטעי זמן ב-5 מפות פרטיות בלבד | Media/Video owner · `video_media_assets_v1` | סימון תלות חיצונית בלבד עד החלטה; אין הורדה/העתקה; הגדרת "אמין להצגה" לפני ספריית "כל הסרטונים" |
| 10 | **P2** | **ממשל קליטה ופרסום: טיוטה-כתג, אישור קבוע מקודד, אכיפת תמונה** | "טיוטה" כתג ומסונן בכל קורא ; slug עם "draft" בפוסט ציבורי (5107) ; trigger אישור צבי עם UUID מקודד ; 16 פוסטים בלי תמונה, כולל **5113, 5118, 5119** (חדשים) — הכלל המחמיר (פרק 30.4) טרם נאכף ; `research_objects.source` 130+ ערכי טקסט חופשי ; PII ב-`source_ref` ; `promoted_node_id` null ב-100% | `publishing_conventions` · `writer_material_home_law` · Security | אכיפה בנתיב השמירה המשותף (פרק 34.2 שורת פרסום); החלפת UUID מקודד בקריאה ל-`contributors.trusted`; רדקציית JID |

---

## 5. פערי אמת ופרטיות — מה אסור להסיק או לפרסם אוטומטית

**אסור להסיק (VERIFIED כסיכון בנתונים):**
1. **5112↔5116 כקשר מאושר** — אין קשת ואין אזכור; חיבור 1331/363 הוא הצעה (פרק 21).
2. **שיוך 5003/5004 לסדרת "וידאו" או לאלון** — אין וידאו ; מימד חמש≠אלון (0 חפיפה).
3. **חברות בסדרה מ-category/tag/author** — 5 פוסטי אלון אינם בסדרה; 10 פוסטי מימד חמש בלי וידאו.
4. **תאריך תמונה = תאריך אירוע** — 86% חודש-בלבד.
5. **"נוספו N תמונות" = N אירועים** — אין יחידת מקבץ.
6. **5118 כמקור עצמאי ל-5114** — טקסט זהה/כמעט זהה; ספירה כפולה כראיה.
7. **"אור הגאולה" או "סוד החשמל" כאדם/כותב** — מקור/ערוץ ; `speaker` רועש.
8. **alias/`approved` כהרשאת פרסום** — 237+991 `approved/private` ; `approved` אינו ציבורי ; `rc_public_read` דווקא כן משתמש ב-`approved` בלבד (ראו חסם 1).
9. **דמיון מספרי/תג/ערך משותף כקשר** — 116 תגיות מספריות; 22 תגיות עם "=" (למשל "45 = גאולה").
10. **meter=100 כוודאות** — 424=100 ; 1073=11 למרות פוסט Golden.

**אסור לפרסם/לחשוף אוטומטית:**
- 9 פוסטים מתויגים `טיוטה` (ids: 103, 5017, 5040, 5043, 5053, 5063, 5088, 5101, 5113) — כרגע נגישים ב-DB ל-anon.
- 63 תמונות `curator_hidden`, 318 `published≠1`, 14 `min_tier=5` + OCR שלהן; במיוחד 5 שנגזרו מהודעות `off`.
- 87 רשומות ELS לא-ציבוריות.
- 3 ממצאי צרפת של צבי (`private`) ; 276 עדכוני `torat-haremez` private (90 מהם `group_source_intake_public=true`, אך הדגל אינו תנאי RLS) ; 34 `research_contributions` מ-`whatsapp_group` approved שגלויות ל-anon.
- `research_objects` (2,044 private) — **אין grant ל-anon** (VERIFIED, `has_table_privilege=false`) ; `contributors`, `video_transcripts`, `post_revisions`, `wa_msg_ext` — אין grant (VERIFIED).
- חומר משפחתי/אישי: 12 `family_input` + 7 `wa-raziel` private + 2 `user_supplied_private_name_research` + 1 `user_personal_research` + 1 `user_provided_image` — כולם `private/candidate` ; 81 `wa-raziel` הם `public_candidate/candidate` (אינם מוצגים: `ro_dossier_read` דורש `writer_dossier.visible=true`, ויש 0 כאלה — VERIFIED).

**Advisors (Supabase, security):** 2 views `SECURITY DEFINER` ברמת ERROR (`redirect_map`, `topic_cards_public`) ; 284 פונקציות SECURITY DEFINER מורצות ע״י anon ; 140 ללא search_path נעול ; 162 טבלאות RLS ללא policy (deny-all — תקין). לא נבדק פירוט כל הפונקציות.

---

## 6. המדדים והמד החכם

### 6.1 מה כל מד מודד היום (VERIFIED, קוד `convergence_meter(p_n)` נקרא במלואו)
| מנגנון | מודד | אינו מודד | בעיה |
|---|---|---|---|
| `convergence_meter(n)` → `score = round(fired/9·100)` | 9 שכבות בינאריות שוות משקל (1/9 כל אחת): ≥2 ישויות עם ערך n · ≥3 שיטות עצמאיות (ממשל ראיות) · אשכול באותו עולם · ישות זהב/כסף · **≥3 תמונות גלריה עם `primary_value=n`** · **≥1 קשת בין צמתי הישויות** · ישות מחדשות · **כרטיס topic מאושר קיים** · **עוגן קדוש (רשימה מקודדת של 24 מספרים בגוף הפונקציה)** | עדכניות, איכות מקור, עצמאות מקורות, חוזק אירוע, זמן | ערבוב חישוב (1–3), אצירה (4,8,9), נפח מדיה (5), צפיפות גרף (6) |
| `topic_cards.meter_score` | snapshot ישן של הציון (13–95, ממוצע 58; 4–6 NULL) | — | יכול לסטות מהחי (פרק 29.6) |
| `topic_cards.quality` | דירוג עריכתי "0–10" לפי `ratings2029.js` | — | 176/215 = 0 ; **1 ערך 88 (מחוץ לטווח, מוצג `invalid`)** ; מדגם: 215 כרטיסים |
| `convergences.score` | ציון אירוע התכנסות (מקס **197**) | — | טווח שונה מ-0–100 ; `status='new'` בכל 8,917 |
| `posts.convergence_score` | — | — | 2/1,305 >0 (מקס 4) — בפועל לא בשימוש |
| `gallery_images.importance` | ערך אצירה? (0–30) | — | 2,462 ברירת-מחדל 3 ; סולמות 1–6,10,20,30 ; `treasure` true ב-3 ; `is_revelation_anchor` false בכולן |
| זהב/יהלום (`golden_entity_law`) | אצירה ידנית של ישות ב-`nodes.metadata.tier` | חוזק | נצרך ע״י המד כשכבה (חסם: מתערבב) |

### 6.2 סיכוני ספירה כפולה וניפוח (VERIFIED)
- **תמונות מוסתרות נספרות:** `select count(*) from gallery_images where primary_value = p_n` — בלי `published/curator_hidden/min_tier`. מספר 1820: 23 שורות מול 17 גלויות; 424: 11 מול 9 ; 45: 43 מול 36.
- **כפילויות תמונה:** 167 קבוצות URL זהות (361 שורות).
- **קשתות רכות:** הקשתות הנספרות בשכבה 6 כוללות `mentions`/`related` (הרוב המכריע מ-7,262 הקשתות) — ללא הבחנת סוג יחס.
- **רשימת עוגנים מקודדת** בגוף פונקציית SQL — החלטת עורך שעטופה בלוגיקת חישוב.
- **דגימות חיות:** 45=78 · 424=100 · 1820=89 · 363=67 · 631=44 · 78=44 · 1073=11 (קיים פוסט Golden על 1073 ו-631) — המד מייצג **נוכחות באינדקס**, לא עוצמת אירוע.

### 6.3 המלצה כיצד המד החכם המשותף יצרוך מידע (PROPOSED — עקבי עם פרק 29.4)
קריאה בלבד מ-`topic_cards`/`convergence_meter`/`nodes.metadata.tier` כצירים נפרדים `{strength, quality, curation}`; **להוסיף ציר רביעי שאינו ציון**: `independence` (`distinct_sources`, `independent_paths`, `provenance_coverage`) כפי שפרק 21.4 דורש. תנאי כניסה: (1) סגירת חסם 1 (אין תמונות מוסתרות בספירה), (2) יחידות מקור יציבות (חסם 2), (3) דדופ תמונות. לפני כן אסור לצרוך `meter_score` כמחוון אירוע.

---

## 7. סדר עבודה מומלץ

### 7.1 מה אפשר להשלים עכשיו בקריאה בלבד (ללא מגע בסשן המהירות/G4)
1. **מניית חשיפה מלאה לפי טבלה** (ספירות + ids בלבד): להמשיך את `SET LOCAL ROLE anon` על שאר טבלאות הקריאה (`stories`, `home_videos`, `shiurim_audio`, `post_qa`, `post_gematria_links`, `relation_evidence`, `theme_links`, `gallery_posts`): **UNKNOWN** — לא נבדקו בדוח זה.
2. **טבלת תפקידי שמות** (פרק 31.3) בקריאה: 1,950 תגיות + 39 קטגוריות + 19 ערכי `author` → תפקיד נוכחי (נושא/סדרה/מדיה/מקור/כותב/ביטוי) — כקובץ מקומי; ללא כתיבה.
3. **דדופליקציה מוכחת לקריאה**: רשימת קבוצות (URL, שם+ערך, hash-מקטע) כראיה לבעלים.
4. **מיפוי בעלי הקוראים** לכל סדרה/טיוטה/שם (כמה מימושי "טיוטה" קיימים בקוד) — grep בלבד.
5. **ניתוח EXPLAIN** (קריאה בלבד) לחיפוש צרפת על `ocr_text`/`channel_updates.text`/`research_objects` — הערכת עלות ללא אינדקס.
6. הכנת רשימת מזהי מקרי המבחן למסך מנהל ראשון (§8).

### 7.2 מה צריך להמתין לסיום G4 / תיאום בעלים
- כל תיקון RLS/הרשאות (חסם 1) — **Pre-Cutover Security Gate**, החלטת Human Gate; לא בסשן זה.
- מזהי מקטע + קורא fragment (חסם 2) — הוא ה-outstanding G4 owner-adapter; להתאם עם כותבי PR #1039/#1044.
- מפתח גרף ל-posts ללא `wp_id` (חסם 3) — דורש החלטת `reality_graph_law` על אוצר היחסים (Roadmap: gap חוזה→DB).
- אכיפת תמונה/פרסום (חסם 10) — מסלול Claude/GPT משותף.
- כל הרחבת מד (חסם 7).
- מיגרציות, RLS, אינדקסים, backfill — הכל Human-Gated, ובנפרד מעבודת המהירות (wave4 integration פעיל: `gpt/perf-unified-wave4-*`).

### 7.3 מצב G4 / התנגשויות (VERIFIED)
`work_log_current` ל-18.10: עבודת המהירות (wave4) **כולה branch-only**, בעלות משוחררת בכל השורות שנבדקו, עם `gpt/perf-unified-wave4-20261018` כענף אינטגרציה. `origin/main`=`6ef3ec2d` ללא מיזוג חדש. פיילוט התוכן: `AFTER_LOCAL_COMMITTED_TESTED_REMOTE_APPROVAL_BLOCKED`. אין כותב פעיל על `audits/content-tree-readonly-audit-20261018/`. **לא נגעתי** בקבצי המוצר, בענפים או בטבלאות.

---

## 8. מבחני קבלה

### 8.1 תצוגת מנהל ראשונה (admin-only; קריאה בלבד)
1. **כיסוי:** מציג ספירות לפי משפחה (§2) מתוך שאילתות מוגבלות ; כל כרטיס מציין "כיסוי: N מתוך M" ו"לא נסרק" — אפס מוצג רק כמדוד.
2. **מקרי הבחינה** (5114, 5118, 5003, 5004, 5119, 5107, 5113, 5112, 5116, 5009, צבי, 45, אור הגאולה) נפתחים עם זהות, מקור, מיקום, הרשאה, יחידות.
3. **5114/5118:** המסך מסמן את זוג המאמרים הזהים כ-"אותו טקסט" ואינו סופר ראיה כפולה.
4. **5003/5004:** סדרה=מימד חמש ונושא=הצופן בסרטים מוצגים כשני תפקידים נפרדים ; סוג מדיה לא "וידאו".
5. **5119:** שלושה אירועים מוצגים כיחידות נפרדות מאותו מקור וידאו ; סימון תלות CDN חיצוני.
6. **5112↔5116:** מוצג כ"הצעת קשר" בלבד.
7. **פרטיות:** עבור משתמש לא-מנהל, אפס טיוטות, אפס תמונות מוסתרות/`min_tier`, אפס `private` בכותרת/קטע/ספירה/השלמה/מסנן ; ביטול הרשאה מסיר גם בפתיחה חוזרת (פרק 34.2 שורה "הרשאות").
8. **צרפת:** פוסט ללא תג עם "צרפת" מופיע ; חומר צבי בשם ישן וראשי ; אותו מקור מצוטט פעמיים מקובץ ; חומר פרטי נעדר ; כל תוצאה עם סיבת התאמה.
9. **45:** מקבץ "נוספו N תמונות" מציג `source_update_at`/`month_only` ולא "קרה היום".
10. **ביצועים:** אין קריאת `convergence_meter` לכל כרטיס, אין N+1 יחידות, אין סריקת OCR/AI; מדידת p50/p95 ו-bytes.
11. **אפס כתיבה:** הבדיקה אינה יוצרת נתוני ייצור (פרק 29.7/34.3).

### 8.2 חיבור לעולם ולמד החכם
1. אותו פריט נפתח מפוסט/עולם/מספר/חיפוש/סדרה/כתב/גלריה/וידאו עם אותה זהות ו-`source_ref`+`locator`, חזרה מדויקת אחרי רענון ו-auth-expiry (Roadmap).
2. קשר "ישיר" מוצג רק עם `relation_kind` + `why_connected` + `source_ref`; קשר "משני" עם תחנת ביניים; "רחוק" לפי דרישה.
3. המד מציג `paths_found` מול `independent_paths` מול `distinct_sources` בנפרד ; 10 צילומים של אותה עדות ≠ 10 מקורות (פרק 29.8).
4. תגית/אזכור/תרגום/OCR לא מעלים ציון ; הפרדה: strength / quality / curation.
5. שרשרת מלאה (פרק 34.3) על נתוני בדיקה מבודדים: שינוי שיוך → רשימה/ספרייה/חיפוש/חלונית מעודכנים, מעקב נשמר, התראה אחת לכל היותר, קישור ישן עובד, מעבר לפרטי חוסם גם לאחר חימום מטמון.
6. אין PASS על סמך מסמך/פונקציה/בדיקת יחידה בלבד.

---

## נספח א׳ — סיכום החלטות מוצעות (להכרעת ZURIEL)
1. **להכריז P0**: חשיפת anon לשורות לא-ציבוריות (חסם 1) כתנאי ל-Pre-Cutover Security Gate — לפני כל הרחבת קורא או תצוגת מנהל.
2. **לא ליצור** מערכת מקטעים חדשה: להרחיב `research_objects`+`source_ref` + קורא fragment קיים.
3. **להכריע** האם 10 פוסטי מימד חמש בלי וידאו הם חברות סדרה עריכתית.
4. **להכריע** מי הבעלים של "כותב/ערוץ/סדרה" כישויות (מוצע: `writer_material_home_law`).
5. **לאשר** שה-meter נשאר ציר "חוזק ביטוי", ושמד חכם חדש מציג עצמאות מקורות כציר נפרד.

## נספח ב׳ — שאילתות/קבצים תומכים (מקוצר)
- RLS/grants: `pg_policies` (posts, gallery_images, els_records, research_objects, channel_updates, research_contributions, galleries, comments, …) ; `has_table_privilege`/`has_column_privilege('anon', …)` ; `SET LOCAL ROLE anon` ב-`BEGIN READ ONLY … ROLLBACK`.
- זהות/גרף: `nodes` (לפי type/identity_key), `edges` (relation_type), join post↔wp_id↔node.
- מקטעים: פיצול `content` לפי `<h2`, hash `md5` על טקסט מנורמל (5114/5118).
- וידאו: `video_media_assets_v1`, `video_media_placements_v1`, `video_transcripts`, `research_objects.meta.ext ? 'video_semantic_map'`.
- מד: `pg_get_functiondef('convergence_meter')` ; קריאות `convergence_meter(n)` ל-45/424/1820/1073/363/631/78 ; `topic_cards` ; `convergences`.
- קוד: `src/lib/research/postSourceUpdates2029.js` (קבוע `PROVEN_POST_SOURCE_UPDATES`), `src/lib/supabase.js:34,523` (`getPostBySlug` ללא סינון טיוטה), `src/lib/research/worldSourceCorpus.js:10`, `api/sitemap.js:25`, `src/lib/ratings2029.js`, `src/lib/research/videoSemanticMap.js`, `src/lib/research/galleryMediaEnvelope.js`.
- ENTRY: `get_advisors(security)` (2 ERROR, 284 anon-SECURITY DEFINER).

## נספח ג׳ — שורות מועמדות לפרק 34 (לא נכתב למסמך 37)
| שורת חיבור | תוספת מוצעת (ראיה) |
|---|---|
| זהות מקור/יוצר/סדרה/נושא | חסם 3–5: כיסוי צמתי פוסט 24%, `wp:` בלבד, כותבים טקסט חופשי |
| קליטת כתבים ומקורות | חסם 6 + מקרה 7: `wa_names` לא בשימוש בשליפה, 237/169 דריפט |
| הרשאות ופרסום | חסם 1: מספרי חשיפה ב-`anon` |
| פרסום ותמונות | חסם 10: 5113/5118/5119 בלי תמונה |
| מדדים והמד החכם | §6: 9 שכבות, ספירת תמונות מוסתרות, quality=88 |
| **הערת פורמט למסמך 37** | פרק 34 נכתב עם רצפי `\n` **ליטרליים** (backslash-n) במקום שורות חדשות — כותרת `## 34.` אינה מפוענחת כסעיף ; יש לתקן בעת הרכוז (VERIFIED בשליפה) |
