# Post 5107 — full unit inventory (verbatim) · audit 2026-11-14

> **AUDIT ONLY — NO EDIT, NO DELETION, NO MERGE, NO PUBLICATION.** Task `ELECTIONS_5107_UNIT_PERMALINK_AND_DEDUP_AUDIT_20261114` (work_log `2e9f8239-0aef-495c-a7ce-5ab3ca20ee20`). Read-only DB and repository reads.

## 0. Source version read (live revalidation)

- Repository `zuriel337/sod1820`: `origin/main` = `4c9630db48958417796948b32031f06eb22ed3f1` · prototype branch `ccr-b8e8ab12-9hoamu` = `069f857c998dc74d376a6a0b8415a991717d1b50`.
- Live row `public.posts` id **5107** · slug `sharshar-elections-redemption-hints-draft` · source `ai` · `date` 2026-09-30T08:55:06Z · `modified` **2026-11-10T16:56:00.412935Z** · body length **22010** chars.
- md5 of the body I read (public anon REST read) = **`a10ea4de28ac262ec5d14e0262db9b13`** = md5 of `post_revisions` id **266** (saved 2026-11-11T06:46:17Z, length 22010). So the current public body IS revision 266 (it is newer than `posts.modified`, which still shows revision 265's time — see DEDUP_MATRIX R-1).
- `post_revisions`: **20** rows (ids 152, 153, 183, 184, 185, 190, 195, 200, 205, 206, 257–266) = HISTORICAL versions, not 20 current units.
- Exact source file: `SOURCE_posts5107_rev266_22010.html` (byte-exact, same folder).

## 1. Map of the stored HTML (character offsets in the 22,010-char body)

| # | segment | offset | chars | kind |
|---|---|---|---|---|
| 0 | S0 wrapper open | 0–75 | 75 | structure |
| 1 | A video section | 75–6717 | 6642 | UNSEGMENTED block (no id) |
| 2 | B main section — original body before the first unit | 6749–10676 | 3927 | ORIGINAL prose |
| 3 | U-3 sharshar-shoes-66 | 10676–13096 | 2420 | proven unit |
| 4 | U-4 sharshar-knesset-source | 13096–13705 | 609 | proven unit |
| 5 | U-5 sharshar-monthly-help-requests | 13705–14458 | 753 | proven unit |
| 6 | U-2 election-turnout-777-news-signal | 14458–16971 | 2513 | proven unit |
| 7 | U-6 netanyahu-77-mazal | 16971–19253 | 2282 | proven unit |
| 8 | B main section — closing note | 19253–19842 | 589 | ORIGINAL prose |
| 9 | U-1 knesset-sworn-1234-1011 (a sibling AFTER the main section) | 19842–22003 | 2161 | proven unit |
| 10 | S1 wrapper close | 22003–22010 | 7 | structure |

Stored order is NOT display order: the Post page shows the proven units newest-first above the story (placeProvenUpdatesFirst); `knesset-sworn-1234-1011` is stored last but is the newest unit.

## 2. Summary table (also posted to ZURIEL in chat)

| # | unit id | title | added (Jerusalem) / basis | live / preview | HTML chars | text chars | media | dedup group |
|---|---|---|---|---|---|---|---|---|
| 1 | `knesset-sworn-1234-1011` | ממשלת משיח בן דוד = 1234 · והיום 10.11 = 1011 | Asia/Jerusalem 17:39:37 · snapshot_interval | live | 2161 | 464 | 0 media / 0 links | D-2 (copy in code, drifted) · D-6 (boilerplate) |
| 2 | `election-turnout-777-news-signal` | ציר השבע — 77.7% כפי שפורסם בחדשות | Asia/Jerusalem 12:25:40 · snapshot_interval | live | 2513 | 1613 | 0 media / 4 links | D-4 (77-cluster, semantic) |
| 3 | `sharshar-shoes-66` | שרשר מציג נעליים — בן דוד = 66 | Asia/Jerusalem 16:52:58 · exact_pair | live | 2420 | 1002 | 1 media / 1 links | D-5 (equal-instant batch) |
| 4 | `sharshar-knesset-source` | ״הגעתי לכנסת ישראל לשרת את עם ישראל״ | Asia/Jerusalem 16:52:58 · exact_pair (same pair as U-3) | live | 609 | 288 | 0 media / 1 links | D-5 |
| 5 | `sharshar-monthly-help-requests` | שרשר מספר על אלפי בקשות לעזרה בכל חודש | Asia/Jerusalem 16:52:58 · exact_pair (same pair as U-3) | live | 753 | 371 | 0 media / 1 links | D-5 |
| 6 | `netanyahu-77-mazal` | נתניהו בן 77 — מזל ופרשת בראשית | Asia/Jerusalem 2026-10-11 02:19:35 · exact_pair | live | 2282 | 1076 | 0 media / 5 links | D-4 |
| 7 | `yamin-smol-2026-5787-1237-1158` | זה לעומת זה עשה האלוהים — ימין ושמאול תפרצי (רמזי הבחירות תשפ״ז) | no public addition (prototype, approved 12.11.2026) · none | **preview-only** (VITE_REALITY_MAP_PREVIEW; not in posts.content) | — | 3312 | 2 private images (not shown) / 3 sources | D-1 (1237 cluster), D-7 (UI) |
| – | (none — no anchor) | A-video-section | unsegmented — see note | live | 6642 | 1173 | 1 media / 0 links | D-3 / D-6 |
| – | (none — original body) | B-original-body-before-units | unsegmented — see note | live | 3927 | 611 | 0 media / 1 links | D-3 / D-6 |
| – | (none — original tail) | B-tail-after-units | unsegmented — see note | live | 589 | 247 | 0 media / 1 links | D-3 / D-6 |

## 3. The units — EXACT verbatim text (display order). Sanitized HTML of each is in §6.

### U-1 · `knesset-sworn-1234-1011`

- **Owning post:** posts:5107 · fragment `posts:5107#knesset-sworn-1234-1011` · anchor = section `id="knesset-sworn-1234-1011"` (offset 19842–22003)
- **Status:** LIVE · public posts.content (rev 266)
- **Proven added at:** 2026-11-10T15:39:37.816125Z (Asia/Jerusalem 17:39:37) · **timeBasis:** snapshot_interval — absent in revision 263 (15:21:21Z), present in 264 (15:39:37Z); both ends on the same Jerusalem day · **revisions:** 263 → 264
- **CORRECTION (2026-11-15, after reading the revision trigger `trg_snapshot_post_revision`):** the two lines "1437" and "משיח י-הוה — משולש = 1437" are NOT a post-proof change. `post_revisions` rows are **pre-write snapshots (BEFORE UPDATE, content = OLD, created_at = the update time, throttled to one per 10 minutes)**. Revision 265 (OLD at the update stamped 2026-11-10T16:56:00.412935Z) lacks the two lines; revision 266 (OLD at the 2026-11-11T06:46:17Z update) has them; `posts.modified` = 16:56:00.412935Z = the last update. So the lines were added by that update — **2026-11-10T16:56:00.412935Z (18:56:00 Asia/Jerusalem), the same Jerusalem day as the unit** (not invented: derived from the version history). The 06:46:17 update was the later session's edit that was reverted exactly (work_log `471240c0`). See DEDUP_MATRIX R-1 (corrected).
- **Event date (separate axis):** 2026-11-10 (the day the 26th Knesset was sworn in; stated in the unit)
- **Author / claimant:** Unattributed site/owner voice (no writer or source cited inside the unit). The Home pin comments call it "the owner's message (ZURIEL 11.11.2026)".
- **Sources / embedded media (true refs):** No external source cited.
- **Method of the numeric claims:** 1234 and 1011 are regular-method phrase values; 1011 also reads the DATE 10.11.2026 as a number (arithmetic reading, not a letter calculation); 1437 = "משולש" (triangular, method key קדמי).
- **Engine verification:** RE-VERIFIED 2026-11-14 (read-only fn_method_value / fn_method_profile): ממשלת משיח בן דוד 1234 ✓ · התגלות השכינה 1234 ✓ · המשיח פועל במעשים 1011 ✓ · הגאלה תבא בהיסח הדעת 1011 ✓ · קץ זוהמת הנחש 1011 ✓ · משיח י-הוה משולש 1437 ✓. The date line 10.11.2026 = 1011 is a date reading and has no engine row.
- **Links inside:** —
- **Media inside:** —
- **Current routes / projections:** PROJECTION_ONLY in Now (event feed via publicProvenPostSourceUpdates) AND a DUPLICATED PAYLOAD in code: homeFeaturedPost2029.js (`highlights`, `statement`, pin 11.11.2026, band 10.11 +3 days) holds a hand-copied version of this unit (see DEDUP_MATRIX D-2: the copy has drifted).

**Verbatim text (links shown as `text ⟨href⟩`):**

```text
ממשלת משיח בן דוד = 1234 · והיום 10.11 = 1011

1234

ממשלת משיח בן דוד = 1234

התגלות השכינה = 1234

1437

משיח י-הוה — משולש = 1437

1011

10.11.2026 — יום השבעת הכנסת ה־26 = 1011

המשיח פועל במעשים = 1011

הגאלה תבא בהיסח הדעת = 1011

קץ זוהמת הנחש = 1011

מה שאנחנו רואים בעיניים — הכול פעולות של הבורא, שפועל דרך כל המציאות. אין כאן שום ימין ושום שמאל. הכול — אין עוד מלבדו.

החיבורים והרמזים הם התבוננות במספרים ובאירועים — וכל אחד מוזמן להתבונן ולשפוט בעצמו.
```

### U-2 · `election-turnout-777-news-signal`

- **Owning post:** posts:5107 · fragment `posts:5107#election-turnout-777-news-signal` · anchor = section `id="election-turnout-777-news-signal"` (offset 14458–16971)
- **Status:** LIVE · public posts.content (rev 266)
- **Proven added at:** 2026-11-10T10:25:40.166190Z (Asia/Jerusalem 12:25:40) · **timeBasis:** snapshot_interval — absent in revision 261 (10:14:26Z), present in 262 (10:25:40Z); same Jerusalem day · **revisions:** 261 → 262
- **Event date (separate axis):** 2026-10-27 (77.7% reported 22:00; final 77.9% on 2026-10-30, both stated in the unit)
- **Author / claimant:** Editorial voice + a COMMUNITY CONTRIBUTION: "התרומה … מאת Jasha8" (named inside the unit); numbers quoted from news reports.
- **Sources / embedded media (true refs):** Times of Israel liveblog (27.10 23:14), Times of Israel final results (30.10), Knesset results page, community /community/chat (Jasha8).
- **Method of the numeric claims:** Arithmetic/fact reporting (77.7%, 5,695,682 voters; 77.9%, 5,716,665). The "seven sequence" (77.7%, age 77, date 27) is a reading, not a gematria calculation.
- **Engine verification:** No gematria claim to verify in this unit. The turnout figures are quoted from the cited news reports and were NOT re-checked against them in this audit.
- **Links inside:** https://www.timesofisrael.com/liveblog_entry/near-final-election-turnout-at-77-7-highest-since-1999/, https://www.timesofisrael.com/liveblog_entry/central-elections-committee-publishes-final-election-results-knesset-to-be-sworn-in-nov-10/, https://main.knesset.gov.il/EN/mk/Pages/ElectionsResults26.aspx, /community/chat
- **Media inside:** —
- **Current routes / projections:** PROJECTION_ONLY in Now (event feed). No hard-coded copy found in code. Cross-reference: forward-refers to U-3 ("מובאים בהמשך").

**Verbatim text (links shown as `text ⟨href⟩`):**

```text
ציר השבע — 77.7% כפי שפורסם בחדשות

77.7%

ב־27 באוקטובר 2026, בשעה 22:00, דווח כי שיעור ההצבעה בבחירות לכנסת ה־26 הגיע ל־77.7% — 5,695,682 מצביעים. זה היה הנתון שפורסם באותו רגע, והוא הוגדר בדיווח כנתון כמעט סופי, משום שבקלפיות שבהן עדיין המתינו בתור נמשכה ההצבעה גם לאחר השעה 22:00.

ב־30 באוקטובר פורסם הנתון הסופי: 77.9% — 5,716,665 מצביעים.

שני הנתונים נשארים בתיעוד: 77.7% הוא המספר שפורסם בחדשות בזמן אמת; 77.9% הוא הנתון הסופי לאחר השלמת הספירה.

לפי עקרון התיעוד של SOD1820, עדכון מאוחר אינו מוחק את המספר שהופיע בדיווח המקורי. אנחנו מתעדים כל מספר כפי שהתפרסם, יחד עם מועד הפרסום וההקשר שלו. בקריאה שלנו, הבורא מדבר דרך המציאות וגם דרך החדשות; לכן עצם הופעתו של 77.7% בדיווח בזמן אמת היא חלק מרצף הרמזים שאותו אנחנו בוחנים — בלי לטעון שזהו הנתון הסופי.

החיבור מצטרף ליום הבחירות, 27 באוקטובר — ט״ז בחשוון שהפך לי״ז בחשוון עם רדת הערב — ולכך שב־21 באוקטובר מלאו לבנימין נתניהו 77 שנים לפי תאריך לידתו הלועזי.

התרומה שנעצה את החיבור בקהילת סוד 1820, מאת Jasha8, הצביעה על רצף השבע: 77.7%, גילו של נתניהו — 77, התאריך 27, וימי ט״ז–י״ז בחשוון. הפסוק מבראשית ד׳, כ״ד — ״ולמך שבעים ושבעה״ — והחיבור למילה מזל = 77 מובאים בהמשך.

מקורות: הדיווח בזמן אמת על 77.7% — 27.10.2026, 23:14 ⟨https://www.timesofisrael.com/liveblog_entry/near-final-election-turnout-at-77-7-highest-since-1999/⟩ · פרסום התוצאות הסופיות ו־77.9% — 30.10.2026 ⟨https://www.timesofisrael.com/liveblog_entry/central-elections-committee-publishes-final-election-results-knesset-to-be-sworn-in-nov-10/⟩ · תוצאות הבחירות — אתר הכנסת ⟨https://main.knesset.gov.il/EN/mk/Pages/ElectionsResults26.aspx⟩ · הקהילה — תרומת Jasha8 ⟨/community/chat⟩.
```

### U-3 · `sharshar-shoes-66`

- **Owning post:** posts:5107 · fragment `posts:5107#sharshar-shoes-66` · anchor = section `id="sharshar-shoes-66"` (offset 10676–13096)
- **Status:** LIVE · public posts.content (rev 266)
- **Proven added at:** 2026-10-12T13:52:58.270789Z (Asia/Jerusalem 16:52:58) · **timeBasis:** exact_pair — BEFORE/AFTER snapshot pair at the same instant (rev 205 → 206) · **revisions:** 205 → 206
- **Event date (separate axis):** — (the text states the source was checked on 29.9.2026)
- **Author / claimant:** Source claimant: שרשר (the candidate) — his spoken line "יש לי שישים ושש זוגות"; editorial connections (בן דוד = 66, נדיב = 66, verses).
- **Sources / embedded media (true refs):** TikTok video https://vt.tiktok.com/ZSqPf4qb4/ (around 00:02) + the embedded MP4 (Supabase storage …/sod1820/agent/sharshar-66-shoes-7677719742953671953.mp4). Verses: Psalms 60/108, Ruth 4, Song of Songs 7:2.
- **Method of the numeric claims:** Regular method: בן דוד = 66, נדיב = 66.
- **Engine verification:** RE-VERIFIED 2026-11-14: בן דוד 66 ✓ · נדיב 66 ✓.
- **Links inside:** https://vt.tiktok.com/ZSqPf4qb4/
- **Media inside:** https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/agent/sharshar-66-shoes-7677719742953671953.mp4
- **Current routes / projections:** PROJECTION_ONLY in Now (one event). The three 2026-10-12 units share ONE instant (same revision pair) — a "synthetic equal date" caused by one batch save, not three separate additions.

**Verbatim text (links shown as `text ⟨href⟩`):**

```text
שרשר מציג נעליים — בן דוד = 66

66

בן דוד = 66

״יש לי שישים ושש זוגות״

 [וידאו: https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/agent/sharshar-66-shoes-7677719742953671953.mp4]

״על אדום אשליך נעלי״

תהלים ס׳ · מכתם לדוד

״על הגאלה ועל התמורה... שלף איש נעלו״

רות ד׳ · ובהמשך אותו פרק: ״וישי הוליד את דוד״

בסרטון שרשר מציג את הנעליים שלו ואומר: ״יש לי שישים ושש זוגות״. האמירה הזאת מצטרפת לחיבור המספרי בן דוד = 66.

עוד רמז מצטרף מן הפסוק: ״מַה יָּפוּ פְעָמַיִךְ בַּנְּעָלִים בַּת נָדִיב״ — שיר השירים ז׳, ב׳. גם נדיב = 66 בגימטריה רגילה. בפסוק נפגשים הנעליים והמספר שכבר הופיע בסרטון.

״על אדום אשליך נעלי״ מופיע גם בתהלים ק״ח, י׳; הפרק פותח ״שיר מזמור לדוד״. ברות ד׳ הנעל מופיעה במעשה הגאולה והתמורה, ואותו פרק מסתיים ״וישי הוליד את דוד״. החיבורים האלה מוצגים כרמזים להתבוננות.

מקור הסרטון: שרשר — 66 זוגות נעליים ⟨https://vt.tiktok.com/ZSqPf4qb4/⟩. האמירה מופיעה סביב 00:02 בסרטון. המקור והחיבורים נבדקו ב־29.9.2026; התוספת לפוסט נשמרת כעדכון חדש במועד הוספתה.
```

### U-4 · `sharshar-knesset-source`

- **Owning post:** posts:5107 · fragment `posts:5107#sharshar-knesset-source` · anchor = section `id="sharshar-knesset-source"` (offset 13096–13705)
- **Status:** LIVE · public posts.content (rev 266)
- **Proven added at:** 2026-10-12T13:52:58.270789Z (Asia/Jerusalem 16:52:58) · **timeBasis:** exact_pair (same pair as U-3) · **revisions:** 205 → 206
- **Event date (separate axis):** —
- **Author / claimant:** Source claimant: שרשר (spoken quote).
- **Sources / embedded media (true refs):** TikTok https://vt.tiktok.com/ZSqhcMmRs/ (around 00:25–00:30).
- **Method of the numeric claims:** None — a quotation unit; the unit itself says the number 26 is not stated in the clip.
- **Engine verification:** n/a (no calculation).
- **Links inside:** https://vt.tiktok.com/ZSqhcMmRs/
- **Media inside:** —
- **Current routes / projections:** PROJECTION_ONLY in Now. Equal-time batch with U-3 and U-5.

**Verbatim text (links shown as `text ⟨href⟩`):**

```text
״הגעתי לכנסת ישראל לשרת את עם ישראל״

בסרטון נוסף שרשר אומר: ״ועכשיו אני הגעתי לכנסת ישראל לשרת את עם ישראל״. זהו קטע נוסף מתוך דבריו, לצד סיפור הבחירות.

לסרטון המקורי ⟨https://vt.tiktok.com/ZSqhcMmRs/⟩ · האמירה מופיעה סביב 00:25–00:30. היא מובאת כדברי שרשר; המספר 26 אינו נאמר בקטע הזה.
```

### U-5 · `sharshar-monthly-help-requests`

- **Owning post:** posts:5107 · fragment `posts:5107#sharshar-monthly-help-requests` · anchor = section `id="sharshar-monthly-help-requests"` (offset 13705–14458)
- **Status:** LIVE · public posts.content (rev 266)
- **Proven added at:** 2026-10-12T13:52:58.270789Z (Asia/Jerusalem 16:52:58) · **timeBasis:** exact_pair (same pair as U-3) · **revisions:** 205 → 206
- **Event date (separate axis):** —
- **Author / claimant:** Source claimant: שרשר (spoken quote; the unit states it is his claim, not a verified figure).
- **Sources / embedded media (true refs):** TikTok https://vt.tiktok.com/ZSqx4aPKr/ (around 02:08–02:11); transcript checked 29.9.2026.
- **Method of the numeric claims:** None — quotation; 5,000–6,000 is quoted, not verified.
- **Engine verification:** n/a.
- **Links inside:** https://vt.tiktok.com/ZSqx4aPKr/
- **Media inside:** —
- **Current routes / projections:** PROJECTION_ONLY in Now. Equal-time batch with U-3 and U-4.

**Verbatim text (links shown as `text ⟨href⟩`):**

```text
שרשר מספר על אלפי בקשות לעזרה בכל חודש

בסרטון שבו הוא מספר על החשיפה שלו, שרשר אומר: ״עליי מגיע חמשת אלפים, ששת אלפים בקשות כל חודש לעזרה כספית, כי הם לא רואים את העם״.

המספר שנאמר במקור הוא 5,000–6,000. אנחנו מביאים כאן את דבריו, ולא נתון שנבדק על מספר הבקשות בפועל.

לדבריו בסרטון המקורי ⟨https://vt.tiktok.com/ZSqx4aPKr/⟩ · סביב 02:08–02:11. התמלול נבדק ב־29.9.2026.
```

### U-6 · `netanyahu-77-mazal`

- **Owning post:** posts:5107 · fragment `posts:5107#netanyahu-77-mazal` · anchor = section `id="netanyahu-77-mazal"` (offset 16971–19253)
- **Status:** LIVE · public posts.content (rev 266)
- **Proven added at:** 2026-10-10T23:19:35.974936Z (Asia/Jerusalem 2026-10-11 02:19:35) · **timeBasis:** exact_pair — revision pair 183 → 184 at the same instant (the entry notes the later cover-only snapshots are NOT used) · **revisions:** 183 → 184
- **Event date (separate axis):** 2026-10-09 (Hebrew 77th birthday, stated in the unit); Gregorian 21.10.2026
- **Author / claimant:** Editorial voice ("תוספת מחברת שפורסמה בפוסט").
- **Sources / embedded media (true refs):** Knesset TV (date of birth), Chabad daily study 9.10.2026, Hebcal (parashat Bereshit). Verse Genesis 4:24.
- **Method of the numeric claims:** Regular method: מזל = 77 (the unit spells it out: מ׳ 40 + ז׳ 7 + ל׳ 30).
- **Engine verification:** RE-VERIFIED 2026-11-14: מזל 77 ✓. The verse "ולמך שבעים ושבעה" is quoted; its own regular value (901) is not claimed.
- **Links inside:** /number/77, /number/77, https://www.knesset.tv/knesset-members/benjamin-netanyahu/, https://www.chabad.org/dailystudy/torahreading.asp?tDate=10%2F9%2F2026, https://www.hebcal.com/sedrot/bereshit-20261010?i=on
- **Media inside:** —
- **Current routes / projections:** PROJECTION_ONLY in Now. Pair is a UTC date 2026-10-10 vs a Jerusalem date 2026-10-11 (just after midnight) — the registered `date` is "2026-10-10".

**Verbatim text (links shown as `text ⟨href⟩`):**

```text
נתניהו בן 77 — מזל ופרשת בראשית

מזל = 77 ⟨/number/77⟩

בגימטריה רגילה: מ׳ (40) + ז׳ (7) + ל׳ (30) = 77 ⟨/number/77⟩.

בנימין נתניהו נולד בכ״ח בתשרי תש״י, 21 באוקטובר 1949. יום הולדתו העברי ה־77, כ״ח בתשרי תשפ״ז, חל ביום שישי, 9 באוקטובר 2026 — בשבוע של פרשת בראשית.

בשיעור החומש היומי של אותו יום, שישי של בראשית לפי חלוקת חב״ד, מופיע הפסוק:

״כִּי שִׁבְעָתַיִם יֻקַּם קָיִן, וְלֶמֶךְ שִׁבְעִים וְשִׁבְעָה״

בראשית ד׳, כ״ד — הפסוק השני בעליית שישי בחלוקה זו.

כך נפגשים כאן שלושה אזכורים של אותו מספר: יום ההולדת ה־77, ״ולמך שבעים ושבעה״, והמילה מזל בגימטריה. עוד חיבור שמעורר התבוננות בתוך רמזי הבחירות.

ההתאמה היא ליום ההולדת העברי; יום הולדתו הלועזי ה־77 חל ב־21 באוקטובר 2026. בחלוקות אחרות של העליות הפסוק נכלל בחמישי. החיבור מוצג כרמז להתבוננות, ולא כתחזית לתוצאות הבחירות.

מקורות: תאריך הלידה — ערוץ כנסת ⟨https://www.knesset.tv/knesset-members/benjamin-netanyahu/⟩ · שיעור החומש ל־9.10.2026 — חב״ד ⟨https://www.chabad.org/dailystudy/torahreading.asp?tDate=10%2F9%2F2026⟩ · פרשת בראשית וחלוקות העליות — Hebcal ⟨https://www.hebcal.com/sedrot/bereshit-20261010?i=on⟩.
```

### U-7 · `yamin-smol-2026-5787-1237-1158` — PREVIEW-ONLY authored unit (approved by ZURIEL 12.11.2026)

- **Owning post:** posts:5107 (placed by the Preview builder; NOT in `posts.content`) · code: `src/lib/research/postPreviewUnits2029.js` (`YAMIN_SMOL_APPROVED_TEXT`), DOM by `postPreviewUnitDom2029.js`.
- **Status:** PREVIEW ONLY — rendered only when `VITE_REALITY_MAP_PREVIEW` is true (protected Preview of branch `ccr-b8e8ab12-9hoamu`); absent from every other build. Local body-editor drafts are per-browser and are not publication.
- **Time:** no proven public addition exists. Prototype approval 2026-11-12; never infer an "added" date.
- **Author / claimant:** editorial voice for the 2026 and 5787 findings and the 1158 section; **Yaniv Levi** and **Yitzhak Shachar Kandro** as named source blocks (their words are locked); the phrase block "ולצידם מצטרף גם הביטוי" is presented as an unattributed interpretive phrase (see DEDUP_MATRIX A-1: its text is Yaniv's public message).
- **Sources (true refs):** `channel_updates:6d40048f-b429-4208-bb34-ad36ff4ba907` (Yaniv, 16.10.2026), `channel_updates:8d30aba8-e510-443b-9de0-456df8875a22` (Shachar, 10.11.2026, group gilui-yomi) read only through the PUBLIC reader `world_group_source_arrivals_v2`. Two private-inbox images `channel_updates:94cab26c-02cb-4eb3-ae32-61fee950dfea`, `channel_updates:9fd28f82-5619-4161-9840-c957842d99fd` are NOT displayed (awaiting publication approval).
- **Methods / engine:** 2026 = מילוי of "ימין ושמאול תפרצי" ✓ (re-verified, and the canonical trace shows 226 + 669 + 1131); 5787 = ריבוע of "תפרצי בתשפז" ✓ (3110 + 2677); 1237 = אותיות אחרי (Yaniv) ✓, regular for "גדעון איזנקוט ראש הממשלה" ✓ and "השמאל גנבו הבחירות מיד הימין" ✓; 1237 for "התחלה חדשה" in מסתתר ✗ (engine 1429 — recorded, not hidden); 1158: sum of the four party-acronym values 312 + 500 + 36 + 310 ✓ and "שש מאות אלף" regular = 1158 ✓. NOTE: the engine regular value of the phrase "ארבע המפלגות הערביות" itself is 1530, so "ארבע המפלגות הערביות = … = 1158" in the approved text means the SUM of the acronym values (see DEDUP_MATRIX A-3).
- **Projections:** share card `/api/card?v=unit`, OG via `?unit=` (Preview branch only), Now main-message flow (local-only). It reuses Now/Series by reference and is not duplicated into them.

**Verbatim approved text (3,315 chars, exactly as delivered):**

```text
✦ זה לעומת זה עשה האלוהים ✦

ימין ושמאול תפרצי — רמזי הבחירות תשפ״ז

2026 · 5787 · 1237 · 1158

מפת המציאות | עוד גילוי שמצטרף לסיפור הבחירות

---

✨ ימין ושמאול תפרצי — והמספרים מתחילים לדבר

בספר ישעיהו (נ״ד, ג׳) נאמר:

״כִּי יָמִין וּשְׂמֹאול תִּפְרֹצִי״

והנה חיבור מופלא!

כאשר בודקים את הביטוי ״ימין ושמאול תפרצי״, מתקבל במילוי:

2026

שנת הבחירות!

אבל כאן הרמז אינו נעצר.

נצרף למילה ״תפרצי״ את השנה העברית:

תפרצי בתשפז

ובשיטת הריבוע מתקבל:

5787

שנת תשפ״ז!

שני חיבורים, שתי שיטות, ושתי השנים נפגשות סביב אותו פסוק.

2026 — במילוי

5787 — בריבוע

וכאן נפתח עוד שער בתמונה.

---

👑 1237 — המספר שחוזר מכמה כיוונים

יניב לוי הביא רמז יפה מן הפסוק:

״לָמָּה זֶּה תִּשְׁאַל לִשְׁמִי וְהוּא פֶלִאי״

בשיטת אותיות אחרי מתקבל:

1237

יניב הצביע גם על הפסוק בזכריה:

״יוֹם אֶחָד הוּא יִוָּדַע לַיהוָה״

בגימטריה גדולה:

787 = תשפ״ז

והנה שוב, שנת תשפ״ז מצטרפת לחיבורים!

גם יצחק שחר קנדרו הביא רמזים סביב הכנסת והמספר 1237:

גדעון איזנקוט ראש הממשלה = 1237

רוסיה איראן סין ארהב = 1237 — מסתתר

התחלה חדשה = 1237 — מסתתר

אלה חיבורים שהביא שחר, וכל אחד מהם פותח כיוון נוסף להתבוננות.

ולצידם מצטרף גם הביטוי:

״השמאל גנבו הבחירות מיד הימין״ = 1237

בגימטריה רגילה.

זהו ניסוח פרשני שהועלה בתוך רצף הרמזים, ולא קביעה על תוצאות הבחירות.

וכך המספר 1237 מופיע שוב — הפעם בין הפסוקים, השנה, הכנסת והביטויים הפוליטיים.

---

✦ סוד 1158 — ארבע המפלגות ושישים ריבוא

וכאן מתגלה עוד חיבור מעניין.

ניקח את ראשי התיבות של ארבע המפלגות הערביות:

המפלגה| גימטריה רגילה
חד״ש| 312
תע״ל| 500
בל״ד| 36
רע״ם| 310
יחד| 1158

אבל שימו לב מה מתקבל בביטוי:

שש מאות אלף

שש = 600

מאות = 447

אלף = 111

600 + 447 + 111 = 1158

ארבע המפלגות הערביות = שש מאות אלף = 1158

איזה חיבור מספרי!

ושש מאות אלף — הרי הם שישים ריבוא, מספר המזוהה במסורת עם כלל נשמות ישראל.

---

📜 ״גם את זה לעומת זה עשה האלוהים״

בקהלת (ז׳, י״ד) נאמר:

״גַּם אֶת זֶה לְעֻמַּת זֶה עָשָׂה הָאֱלֹהִים״

והנה בתוך שנת בחירות, כשכל כך הרבה מדובר על ימין ושמאל, מתגלה לפנינו חיבור נוסף.

מן הצד האחד — ארבע מפלגות שהאותיות בשמותיהן מצטרפות ל־1158.

ומן הצד השני — ״שש מאות אלף״, באותו הערך בדיוק.

ומהו הסוד של שישים ריבוא?

בעל הסולם, במאמרו ״ששים רבוא נשמות״, כותב:

«״שבאמת אין בעולם יותר מנשמה אחת״»

נשמה אחת, המתגלית בריבוי נשמות.

ומכאן עולה רמז יפה לאחדות ישראל.

אולי דווקא בשעה שהימין והשמאל נראים רחוקים כל כך זה מזה, הפסוק מזכיר לנו את הסוד הפנימי:

״ימין ושמאול תפרצי״

לא להישאר בתוך גבולות הפירוד, אלא לפרוץ אותם ולהתחבר.

לא לחפש את התיקון רק במחנה שמנגד, אלא לגלות את כוח האחדות שבתוכנו.

---

👑 המסר — מן הפירוד אל האחדות

התמונה הולכת ומתחברת:

2026 — ימין ושמאול תפרצי, במילוי.

5787 — תפרצי בתשפז, בריבוע.

1237 — הפסוקים והחיבורים שמצטרפים לציר הבחירות.

1158 — ארבע המפלגות הערביות מול שש מאות אלף.

ארבעה מספרים, ארבעה שערים, ורעיון אחד שמתגלה מביניהם.

שישים ריבוא נשמות — נשמה אחת.

ייתכן שזהו המסר העמוק שמסתתר מאחורי כל החיבורים הללו:

גם בתוך עולם של מחלוקות, כוחות מנוגדים ופירוד, אפשר לגלות את האחדות.

כי הגאולה אינה רק דבר שממתינים לו.

היא מתגלה גם ברגע שבו אנו לומדים להתחבר.

✨ ימין ושמאול תפרצי — מן הפירוד אל האחדות ✨

---

מקורות והמשך הגילוי: ישעיהו נ״ד, ג׳ · קהלת ז׳, י״ד · זכריה י״ד, ז׳ · בעל הסולם, ״ששים רבוא נשמות״ · דברי יניב לוי ויצחק שחר קנדרו · חישובי הגימטריה ב־SOD1820.

הביטויים והציטוטים שומרים על ייחוסם למקורותיהם. החיבורים המספריים מוצגים לפי שיטות החישוב, והמשמעות הרוחנית היא דרך ההתבוננות המוצעת כאן.
```

## 4. Material that belongs to the ORIGINAL unsegmented Post body (not independent anchored units)

These are NOT units: they have no stable id, no proven added time, and are not shown with an "added" date. Treating them as units would be an inference.

### A-video-section — ממשלת אייזנקוט מושבעת — הרוב לגוש השינוי: 67 חברי כנסת (video block: "המסר", on-screen numbers, number connections)

- **Offset:** 75–6717 (6642 HTML chars) · **Note:** NOT a registered unit. Added between revision 257 (2026-11-08 18:48:37 Jerusalem) and 258 (20:31:57 Jerusalem) — same Jerusalem day (snapshot interval evidence only; NOT registered in PROVEN_POST_SOURCE_UPDATES, so the Post shows no "added" date for it). The Home feature constant `at: 2026-11-08T06:18+02:00` is the clip RECORDING time on the phone screen, never the addition time.
- **Author / claimant:** Editorial reading of a video by שרשר (the clip is his); the on-screen numbers are the platform's counters.
- **Media / links:** MP4 /media/posts/2026-11-sharshar-crown/sharshar-crown.mp4 (credit "שרשר המלך"); poster …-poster.jpg is referenced from code (homeFeaturedPost2029.js), not in the post HTML.
- **Projections / copies:** A hand-copied DUPLICATE PAYLOAD of this block lives in homeFeaturedPost2029.js (headline, `message`, `connections`, `numbers`, `note`) — drift found (DEDUP_MATRIX D-3). Also the screen numbers (1,437 likes etc.) are READ from video frames by the editor, not engine results.

**Verbatim text:**

```text
[וידאו: /media/posts/2026-11-sharshar-crown/sharshar-crown.mp4]הדפדפן אינו תומך בווידאו.מקור הסרטון: שרשר המלך

ממשלת אייזנקוט מושבעת — הרוב לגוש השינוי: 67 חברי כנסת

המסר

בקריאה המספרית המוצגת כאן, 46 משויך לגוש הימין ו־67 לגוש השינוי. אלה מספרים המשמשים בסיס להתבוננות ולחיבורים שבהמשך, ולא תיאור של חלוקת המנדטים הרשמית.

46 הוא היפוך של 64, דין. וכשהופכים את המבט, מה שנראה דין מתגלה כרחמים — וזה סוד הבינה, 67.

מאחורי שני הגושים עומד כוח אחד: הבורא. כך גם משתקף בשרשר = 1000 — אין בעולם אלא כוח אחד.

הבורא מדבר דרך כל המציאות. התיעוד הזה הוא חלק מעץ המציאות שנבנה בימים אלה — מערכת המחברת בין אירועים, מקורות, מספרים ורמזים. החיבורים המוצגים כאן הם חלק מתהליך הגילוי והם עשויים להתפתח ככל שיתגלו עוד חיבורים.

המספרים שמופיעים על המסך בסרטון

14
לוגו ערוץ 14 ברקע

1,437
לייקים

140
תגובות

396
שיתופים

78
שמירות

6:18
שעת ההקלטה

14
סוללה בהקלטה

חיבורים במספרים — חישוב מאומת במנוע (שיטה רגילה)

618
משיח צדקינו = 618

396
הישועה = 396 · דויד בן ישי = 396

14
דוד = 14

78
מחל = 78

87
פ״ז = 87 — מניין השנה תשפ״ז

1000
שרשר = 1000

67
בינה = 67

64
דין = 64 — וההיפוך שלו 46

החיבורים והרמזים הם התבוננות במספרים ובאירועים — וכל אחד מוזמן להתבונן ולשפוט בעצמו.
```

### B-original-body-before-units — רמזי הבחירות לכנסת ה־26 (opening: 26 · 27.10.2026 · 2710/271 · 2701 · 1820 · 631 · candidate note)

- **Offset:** 6749–10676 (3927 HTML chars) · **Note:** ORIGINAL unsegmented Post prose (present since the first revisions; the Post `date` is 2026-09-30). Not a unit; no "added" date applies.
- **Author / claimant:** Editorial voice; "קצת מידע על המתמודד שרשר" is a descriptive paragraph about the candidate.
- **Media / links:** No media inside; one internal link /post/bennett-melach-631-78 (a different Post, 5113, which has its own proven units).
- **Projections / copies:** None found.

**Verbatim text:**

```text
רמזי הבחירות לכנסת ה־26

הבחירות לכנסת ה־26

26

יהוה = 26

27.10.2026

ט״ז בחשוון תשפ״ז

2710

271

הריון = 271

חכמה = 271

משולש

2701

בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ

בראשית א׳, א׳ = 2701

המספר שמלווה את האתר

1820

עופר וינטר

מילוי = 1820

631

הבחירות = 631

מלך ישראל = 631

עופר וינטר = 631

נפתלי בנט = 631 ⟨/post/bennett-melach-631-78⟩

נס נתניהו = 631

קצת מידע על המתמודד שרשר = 1000 שהגימטריה שלו אלף והפתק שלו נקרא 'צדק' משיח נקרא משיח צדקנו כמובן שהוא לא משיח הוא חלק מכוח המשיח שמשתקף בתוך המציאות אנחנו נראה לכם רק סרטון אחד מתוך כמה ויש עוד הרבה רמזים שיוצאים ממנו
```

### B-tail-after-units — Closing note of the main section + election-timeline link

- **Offset:** 19253–19842 (589 HTML chars) · **Note:** ORIGINAL unsegmented closing text of the main section (the section ends AFTER the five units it contains).
- **Author / claimant:** Editorial voice.
- **Media / links:** gov.il election timeline link.
- **Projections / copies:** None found.

**Verbatim text:**

```text
המספרים והחישובים מוצגים כפי שהם. החיבורים והרמזים הם קריאה במספרים, בתאריכים ובאירועים — וכל אחד מוזמן להתבונן ולשפוט בעצמו.

מועד הבחירות: ועדת הבחירות המרכזית לכנסת ה־26 ⟨https://www.gov.il/he/departments/dynamiccollectors/election-timeline26⟩.
```

## 5. Sources read (public readers only)

- `world_group_source_arrivals_v2` rows used (public reader): Yaniv Levi `60ee7dd1…` (2026-11-12 12:32:40Z), `9ae687a5…` (12:33:25Z); Tzvi Opoc `ca295f40…`; Shachar Kandro `8d30aba8…` (2026-11-10 22:41:49Z). Full text of the 1237-cluster arrivals is in DEDUP_MATRIX §3.
- Code read: `postSourceUpdates2029.js`, `postPreviewUnits2029.js`, `postPreviewUnitDom2029.js`, `postUnitModel2029.js`, `postUnitBody2029.js`, `homeFeaturedPost2029.js`, `publicPostUrls.js`, `api/og.js`.

## 6. Appendix — exact sanitized HTML of each unit (as stored in posts.content rev 266)

Whole body: `SOURCE_posts5107_rev266_22010.html`.

### U-1 · knesset-sworn-1234-1011 (offset 19842–22003)

```html
<section id="knesset-sworn-1234-1011" aria-labelledby="knesset-sworn-title" dir="rtl" style="max-width:760px;margin:44px auto;line-height:1.85;text-align:center">
<hr style="opacity:.22;margin:34px auto;max-width:660px">
<h2 id="knesset-sworn-title" style="text-align:center!important">ממשלת משיח בן דוד = 1234 · והיום 10.11 = 1011</h2>
<p style="text-align:center!important;font-size:clamp(2.4rem,10vw,4.5rem);line-height:1;margin:22px 0 6px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="1234">1234</span></p>
<p style="text-align:center!important;font-size:1.08rem;margin:4px 0;font-weight:700">ממשלת משיח בן דוד = 1234</p>
<p style="text-align:center!important;font-size:1.08rem;margin:4px 0 22px;font-weight:700">התגלות השכינה = 1234</p>
<p style="text-align:center!important;font-size:clamp(2.4rem,10vw,4.5rem);line-height:1;margin:22px 0 6px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="1437">1437</span></p>
<p style="text-align:center!important;font-size:1.08rem;margin:4px 0 22px;font-weight:700">משיח י-הוה — משולש = 1437</p>
<p style="text-align:center!important;font-size:clamp(2.4rem,10vw,4.5rem);line-height:1;margin:22px 0 6px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="1011">1011</span></p>
<p style="text-align:center!important;font-size:1.08rem;margin:4px 0;font-weight:700">10.11.2026 — יום השבעת הכנסת ה־26 = 1011</p>
<p style="text-align:center!important;font-size:1.08rem;margin:4px 0;font-weight:700">המשיח פועל במעשים = 1011</p>
<p style="text-align:center!important;font-size:1.08rem;margin:4px 0;font-weight:700">הגאלה תבא בהיסח הדעת = 1011</p>
<p style="text-align:center!important;font-size:1.08rem;margin:4px 0 22px;font-weight:700">קץ זוהמת הנחש = 1011</p>
<p style="text-align:center!important;font-size:1.15rem;font-weight:800;margin:18px auto;max-width:640px">מה שאנחנו רואים בעיניים — הכול פעולות של הבורא, שפועל דרך כל המציאות. אין כאן שום ימין ושום שמאל. הכול — אין עוד מלבדו.</p>
<p style="text-align:center!important;font-size:.95rem;opacity:.8;margin:10px auto 0;max-width:640px">החיבורים והרמזים הם התבוננות במספרים ובאירועים — וכל אחד מוזמן להתבונן ולשפוט בעצמו.</p>
</section>
```

### U-2 · election-turnout-777-news-signal (offset 14458–16971)

```html
<section id="election-turnout-777-news-signal" dir="rtl" style="max-width:760px;margin:44px auto;line-height:1.85;text-align:center">
<hr style="opacity:.22;margin:34px auto;max-width:660px">
<h2 style="text-align:center!important">ציר השבע — 77.7% כפי שפורסם בחדשות</h2>
<p style="text-align:center!important;font-size:clamp(2.4rem,10vw,4.5rem);font-weight:900;color:var(--gold,#e8c840);margin:16px 0">77.7%</p>
<p style="text-align:center!important">ב־27 באוקטובר 2026, בשעה 22:00, דווח כי שיעור ההצבעה בבחירות לכנסת ה־26 הגיע ל־77.7% — 5,695,682 מצביעים. זה היה הנתון שפורסם באותו רגע, והוא הוגדר בדיווח כנתון כמעט סופי, משום שבקלפיות שבהן עדיין המתינו בתור נמשכה ההצבעה גם לאחר השעה 22:00.</p>
<p style="text-align:center!important">ב־30 באוקטובר פורסם הנתון הסופי: 77.9% — 5,716,665 מצביעים.</p>
<p style="text-align:center!important;font-weight:800">שני הנתונים נשארים בתיעוד: 77.7% הוא המספר שפורסם בחדשות בזמן אמת; 77.9% הוא הנתון הסופי לאחר השלמת הספירה.</p>
<p style="text-align:center!important">לפי עקרון התיעוד של SOD1820, עדכון מאוחר אינו מוחק את המספר שהופיע בדיווח המקורי. אנחנו מתעדים כל מספר כפי שהתפרסם, יחד עם מועד הפרסום וההקשר שלו. בקריאה שלנו, הבורא מדבר דרך המציאות וגם דרך החדשות; לכן עצם הופעתו של 77.7% בדיווח בזמן אמת היא חלק מרצף הרמזים שאותו אנחנו בוחנים — בלי לטעון שזהו הנתון הסופי.</p>
<p style="text-align:center!important">החיבור מצטרף ליום הבחירות, 27 באוקטובר — ט״ז בחשוון שהפך לי״ז בחשוון עם רדת הערב — ולכך שב־21 באוקטובר מלאו לבנימין נתניהו 77 שנים לפי תאריך לידתו הלועזי.</p>
<p style="text-align:center!important">התרומה שנעצה את החיבור בקהילת סוד 1820, מאת Jasha8, הצביעה על רצף השבע: 77.7%, גילו של נתניהו — 77, התאריך 27, וימי ט״ז–י״ז בחשוון. הפסוק מבראשית ד׳, כ״ד — ״ולמך שבעים ושבעה״ — והחיבור למילה מזל = 77 מובאים בהמשך.</p>
<p style="text-align:center!important;font-size:.9rem;line-height:1.8">מקורות: <a href="https://www.timesofisrael.com/liveblog_entry/near-final-election-turnout-at-77-7-highest-since-1999/" target="_blank" rel="noopener noreferrer">הדיווח בזמן אמת על 77.7% — 27.10.2026, 23:14</a> · <a href="https://www.timesofisrael.com/liveblog_entry/central-elections-committee-publishes-final-election-results-knesset-to-be-sworn-in-nov-10/" target="_blank" rel="noopener noreferrer">פרסום התוצאות הסופיות ו־77.9% — 30.10.2026</a> · <a href="https://main.knesset.gov.il/EN/mk/Pages/ElectionsResults26.aspx" target="_blank" rel="noopener noreferrer">תוצאות הבחירות — אתר הכנסת</a> · <a href="/community/chat">הקהילה — תרומת Jasha8</a>.</p>
</section>


```

### U-3 · sharshar-shoes-66 (offset 10676–13096)

```html
<section id="sharshar-shoes-66" aria-labelledby="sharshar-shoes-title">
<h2 style="text-align:center!important;" id="sharshar-shoes-title">שרשר מציג נעליים — בן דוד = 66</h2>
<p style="text-align:center!important;font-size:clamp(3.2rem,13vw,6.4rem);line-height:.92;margin:0 0 16px;font-weight:900;color:var(--gold,#e8c840)">66</p>
<p style="text-align:center!important;font-size:clamp(1.55rem,5.2vw,2.5rem);margin:0 0 8px;font-weight:900">בן דוד = 66</p>
<p style="text-align:center!important;font-size:clamp(1.25rem,4.7vw,2rem);margin:12px 0 22px;font-weight:750">״יש לי שישים ושש זוגות״</p>

<video controls="" playsinline="" style="display:block;width:min(100%,420px);margin:0 auto 22px;border-radius:18px" preload="none" data-sod-egress-guard="passive">
  <source src="https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/agent/sharshar-66-shoes-7677719742953671953.mp4" type="video/mp4">
</video>

<p style="text-align:center!important;font-size:clamp(1.25rem,4.6vw,1.9rem);margin:22px auto 8px;font-weight:800">״על אדום אשליך נעלי״</p>
<p style="text-align:center!important;font-size:.96rem;opacity:.72;margin:0">תהלים ס׳ · מכתם לדוד</p>

<p style="text-align:center!important;font-size:clamp(1.15rem,4.4vw,1.75rem);margin:28px auto 6px;font-weight:800;max-width:760px">״על הגאלה ועל התמורה... שלף איש נעלו״</p>
<p style="text-align:center!important;font-size:.96rem;opacity:.72;margin:0">רות ד׳ · ובהמשך אותו פרק: ״וישי הוליד את דוד״</p>

<p style="text-align:center!important;">בסרטון שרשר מציג את הנעליים שלו ואומר: ״יש לי שישים ושש זוגות״. האמירה הזאת מצטרפת לחיבור המספרי <strong>בן דוד = 66</strong>.</p>
<p style="text-align:center!important;">עוד רמז מצטרף מן הפסוק: ״מַה יָּפוּ פְעָמַיִךְ בַּנְּעָלִים בַּת נָדִיב״ — שיר השירים ז׳, ב׳. גם <strong>נדיב = 66</strong> בגימטריה רגילה. בפסוק נפגשים הנעליים והמספר שכבר הופיע בסרטון.</p>
<p style="text-align:center!important;">״על אדום אשליך נעלי״ מופיע גם בתהלים ק״ח, י׳; הפרק פותח ״שיר מזמור לדוד״. ברות ד׳ הנעל מופיעה במעשה הגאולה והתמורה, ואותו פרק מסתיים ״וישי הוליד את דוד״. החיבורים האלה מוצגים כרמזים להתבוננות.</p>
<p style="text-align:center!important;"><small>מקור הסרטון: <a href="https://vt.tiktok.com/ZSqPf4qb4/" target="_blank" rel="noopener noreferrer">שרשר — 66 זוגות נעליים</a>. האמירה מופיעה סביב 00:02 בסרטון. המקור והחיבורים נבדקו ב־29.9.2026; התוספת לפוסט נשמרת כעדכון חדש במועד הוספתה.</small></p>
</section>

```

### U-4 · sharshar-knesset-source (offset 13096–13705)

```html
<section id="sharshar-knesset-source" aria-labelledby="sharshar-knesset-title">
<h2 style="text-align:center!important;" id="sharshar-knesset-title">״הגעתי לכנסת ישראל לשרת את עם ישראל״</h2>
<p style="text-align:center!important;">בסרטון נוסף שרשר אומר: ״ועכשיו אני הגעתי לכנסת ישראל לשרת את עם ישראל״. זהו קטע נוסף מתוך דבריו, לצד סיפור הבחירות.</p>
<p style="text-align:center!important;"><small><a href="https://vt.tiktok.com/ZSqhcMmRs/" target="_blank" rel="noopener noreferrer">לסרטון המקורי</a> · האמירה מופיעה סביב 00:25–00:30. היא מובאת כדברי שרשר; המספר 26 אינו נאמר בקטע הזה.</small></p>
</section>

```

### U-5 · sharshar-monthly-help-requests (offset 13705–14458)

```html
<section id="sharshar-monthly-help-requests" aria-labelledby="sharshar-help-title">
<h2 style="text-align:center!important;" id="sharshar-help-title">שרשר מספר על אלפי בקשות לעזרה בכל חודש</h2>
<p style="text-align:center!important;">בסרטון שבו הוא מספר על החשיפה שלו, שרשר אומר: ״עליי מגיע חמשת אלפים, ששת אלפים בקשות כל חודש לעזרה כספית, כי הם לא רואים את העם״.</p>
<p style="text-align:center!important;">המספר שנאמר במקור הוא <strong>5,000–6,000</strong>. אנחנו מביאים כאן את דבריו, ולא נתון שנבדק על מספר הבקשות בפועל.</p>
<p style="text-align:center!important;"><small><a href="https://vt.tiktok.com/ZSqx4aPKr/" target="_blank" rel="noopener noreferrer">לדבריו בסרטון המקורי</a> · סביב 02:08–02:11. התמלול נבדק ב־29.9.2026.</small></p>
</section>

```

### U-6 · netanyahu-77-mazal (offset 16971–19253)

```html
<section id="netanyahu-77-mazal" aria-labelledby="netanyahu-77-title" dir="rtl" style="max-width:760px;margin:44px auto;line-height:1.85">
<hr style="opacity:.22;margin:34px auto;max-width:660px">
<h2 style="text-align:center!important;" id="netanyahu-77-title" style="font-size:clamp(1.6rem,5vw,2.6rem);line-height:1.3">נתניהו בן 77 — מזל ופרשת בראשית</h2>
<p style="text-align:center!important;font-size:clamp(2.4rem,10vw,4.5rem);font-weight:900;color:var(--gold,#e8c840);margin:16px 0"><a href="/number/77" style="color:inherit">מזל = 77</a></p>
<p style="text-align:center!important;">בגימטריה רגילה: מ׳ (40) + ז׳ (7) + ל׳ (30) = <a href="/number/77">77</a>.</p>
<p style="text-align:center!important;">בנימין נתניהו נולד בכ״ח בתשרי תש״י, 21 באוקטובר 1949. יום הולדתו העברי ה־77, כ״ח בתשרי תשפ״ז, חל ביום שישי, 9 באוקטובר 2026 — בשבוע של פרשת בראשית.</p>
<p style="text-align:center!important;">בשיעור החומש היומי של אותו יום, <strong>שישי של בראשית לפי חלוקת חב״ד</strong>, מופיע הפסוק:</p>
<blockquote style="text-align:center!important;font-size:clamp(1.3rem,4.5vw,2rem);font-weight:800;border:0;margin:20px 0">״כִּי שִׁבְעָתַיִם יֻקַּם קָיִן, וְלֶמֶךְ שִׁבְעִים וְשִׁבְעָה״</blockquote>
<p style="text-align:center!important;">בראשית ד׳, כ״ד — הפסוק השני בעליית שישי בחלוקה זו.</p>
<p style="text-align:center!important;">כך נפגשים כאן שלושה אזכורים של אותו מספר: יום ההולדת ה־77, ״ולמך שבעים ושבעה״, והמילה <strong>מזל</strong> בגימטריה. עוד חיבור שמעורר התבוננות בתוך רמזי הבחירות.</p>
<p style="text-align:center!important;font-size:.95rem;opacity:.8">ההתאמה היא ליום ההולדת העברי; יום הולדתו הלועזי ה־77 חל ב־21 באוקטובר 2026. בחלוקות אחרות של העליות הפסוק נכלל בחמישי. החיבור מוצג כרמז להתבוננות, ולא כתחזית לתוצאות הבחירות.</p>
<p style="text-align:center!important;font-size:.9rem;line-height:1.8">מקורות: <a href="https://www.knesset.tv/knesset-members/benjamin-netanyahu/" target="_blank" rel="noopener noreferrer">תאריך הלידה — ערוץ כנסת</a> · <a href="https://www.chabad.org/dailystudy/torahreading.asp?tDate=10%2F9%2F2026" target="_blank" rel="noopener noreferrer">שיעור החומש ל־9.10.2026 — חב״ד</a> · <a href="https://www.hebcal.com/sedrot/bereshit-20261010?i=on" target="_blank" rel="noopener noreferrer">פרשת בראשית וחלוקות העליות — Hebcal</a>.</p>
</section>
```

### A-video-section (offset 75–6717)

```html
<section dir="rtl" style="text-align:center;max-width:920px;margin:0 auto;padding:10px 0 28px;line-height:1.65">
<figure style="margin:0 auto 20px;max-width:420px"><video controls playsinline preload="metadata" poster="/media/posts/2026-11-sharshar-crown/sharshar-crown-poster.jpg" style="display:block;width:100%;aspect-ratio:480/800;object-fit:contain;background:#111;border-radius:12px" aria-label="ממשלת אייזנקוט מושבעת — הרוב לגוש השינוי: 67 חברי כנסת"><source src="/media/posts/2026-11-sharshar-crown/sharshar-crown.mp4" type="video/mp4">הדפדפן אינו תומך בווידאו.</video><figcaption style="text-align:center!important;opacity:.72;font-size:.85em">מקור הסרטון: שרשר המלך</figcaption></figure>
<h2 style="text-align:center!important;font-size:clamp(1.5rem,5.5vw,2.4rem);line-height:1.2;margin:6px 0 16px;font-weight:900">ממשלת אייזנקוט מושבעת — הרוב לגוש השינוי: 67 חברי כנסת</h2>
<p style="text-align:center!important;font-size:1rem;font-weight:800;margin:0 0 8px;color:var(--gold,#e8c840)">המסר</p>
<p style="text-align:center!important;font-size:1rem;font-weight:600;margin:0 0 10px">בקריאה המספרית המוצגת כאן, 46 משויך לגוש הימין ו־67 לגוש השינוי. אלה מספרים המשמשים בסיס להתבוננות ולחיבורים שבהמשך, ולא תיאור של חלוקת המנדטים הרשמית.</p>
<p style="text-align:center!important;font-size:1rem;font-weight:600;margin:0 0 10px">46 הוא היפוך של 64, דין. וכשהופכים את המבט, מה שנראה דין מתגלה כרחמים — וזה סוד הבינה, 67.</p>
<p style="text-align:center!important;font-size:1rem;font-weight:600;margin:0 0 18px">מאחורי שני הגושים עומד כוח אחד: הבורא. כך גם משתקף בשרשר = 1000 — אין בעולם אלא כוח אחד.</p>
<p style="text-align:center!important;font-size:.95rem;opacity:.8;margin:0 auto 6px;max-width:640px">הבורא מדבר דרך כל המציאות. התיעוד הזה הוא חלק מעץ המציאות שנבנה בימים אלה — מערכת המחברת בין אירועים, מקורות, מספרים ורמזים. החיבורים המוצגים כאן הם חלק מתהליך הגילוי והם עשויים להתפתח ככל שיתגלו עוד חיבורים.</p>
<hr style="opacity:.22;margin:34px auto;max-width:660px">
<p style="text-align:center!important;font-size:1rem;font-weight:800;margin:0 0 4px;color:var(--gold,#e8c840)">המספרים שמופיעים על המסך בסרטון</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="14">14</span></p><p style="text-align:center!important;font-size:1rem;margin:0;font-weight:700">לוגו ערוץ 14 ברקע</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="1437">1,437</span></p><p style="text-align:center!important;font-size:1rem;margin:0;font-weight:700">לייקים</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="140">140</span></p><p style="text-align:center!important;font-size:1rem;margin:0;font-weight:700">תגובות</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="396">396</span></p><p style="text-align:center!important;font-size:1rem;margin:0;font-weight:700">שיתופים</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="78">78</span></p><p style="text-align:center!important;font-size:1rem;margin:0;font-weight:700">שמירות</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="618">6:18</span></p><p style="text-align:center!important;font-size:1rem;margin:0;font-weight:700">שעת ההקלטה</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="14">14</span></p><p style="text-align:center!important;font-size:1rem;margin:0;font-weight:700">סוללה בהקלטה</p>
<hr style="opacity:.22;margin:34px auto;max-width:660px">
<p style="text-align:center!important;font-size:1rem;font-weight:800;margin:0 0 4px;color:var(--gold,#e8c840)">חיבורים במספרים — חישוב מאומת במנוע (שיטה רגילה)</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)">618</p><p style="text-align:center!important;font-size:1.08rem;margin:0;font-weight:700">משיח צדקינו = 618</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="396">396</span></p><p style="text-align:center!important;font-size:1.08rem;margin:0;font-weight:700">הישועה = 396 · דויד בן ישי = 396</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="14">14</span></p><p style="text-align:center!important;font-size:1.08rem;margin:0;font-weight:700">דוד = 14</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)"><span data-gem="78">78</span></p><p style="text-align:center!important;font-size:1.08rem;margin:0;font-weight:700">מחל = 78</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)">87</p><p style="text-align:center!important;font-size:1.08rem;margin:0;font-weight:700">פ״ז = 87 — מניין השנה תשפ״ז</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)">1000</p><p style="text-align:center!important;font-size:1.08rem;margin:0;font-weight:700">שרשר = 1000</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)">67</p><p style="text-align:center!important;font-size:1.08rem;margin:0;font-weight:700">בינה = 67</p>
<p style="text-align:center!important;font-size:clamp(2.2rem,9vw,4.2rem);line-height:.95;margin:16px 0 2px;font-weight:900;color:var(--gold,#e8c840)">64</p><p style="text-align:center!important;font-size:1.08rem;margin:0;font-weight:700">דין = 64 — וההיפוך שלו 46</p>
<p style="text-align:center!important;font-size:.9rem;opacity:.72;margin:26px 0 0">החיבורים והרמזים הם התבוננות במספרים ובאירועים — וכל אחד מוזמן להתבונן ולשפוט בעצמו.</p>
</section>
```

### B-original-body-before-units (offset 6749–10676)

```html
<section dir="rtl" style="text-align:center;max-width:920px;margin:0 auto;padding:10px 0 32px;line-height:1.65">

<p style="text-align:center!important;font-size:1rem;opacity:.82;margin:0 0 8px">רמזי הבחירות לכנסת ה־26</p>
<h1 style="text-align:center!important;font-size:clamp(1.9rem,7vw,4rem);line-height:1.05;margin:6px 0 10px;font-weight:900">הבחירות לכנסת ה־26</h1>

<p style="text-align:center!important;font-size:clamp(3.1rem,12.5vw,6.3rem);line-height:.95;margin:28px 0 4px;font-weight:900;color:var(--gold,#e8c840)">26</p>
<p style="text-align:center!important;font-size:clamp(1.35rem,4.5vw,2.1rem);margin:0 0 34px;font-weight:800">יהוה = 26</p>

<hr style="opacity:.22;margin:34px auto;max-width:660px">

<p style="text-align:center!important;font-size:clamp(1.9rem,7.8vw,3.8rem);line-height:1;margin:0;font-weight:900">27.10.2026</p>
<p style="text-align:center!important;font-size:1rem;opacity:.76;margin:10px 0 6px">ט״ז בחשוון תשפ״ז</p>

<p style="text-align:center!important;font-size:clamp(3rem,12vw,6rem);line-height:.95;margin:34px 0 4px;font-weight:900;color:var(--gold,#e8c840)">2710</p>

<p style="text-align:center!important;font-size:clamp(3rem,12vw,6rem);line-height:.95;margin:38px 0 8px;font-weight:900;color:var(--gold,#e8c840)">271</p>
<p style="text-align:center!important;font-size:clamp(1.45rem,5.2vw,2.4rem);margin:5px 0;font-weight:850">הריון = 271</p>
<p style="text-align:center!important;font-size:clamp(1.45rem,5.2vw,2.4rem);margin:5px 0;font-weight:850">חכמה = 271</p>
<p style="text-align:center!important;font-size:.92rem;opacity:.68;margin:2px 0 30px">משולש</p>

<p style="text-align:center!important;font-size:clamp(3rem,12vw,6rem);line-height:.95;margin:42px 0 12px;font-weight:900;color:var(--gold,#e8c840)">2701</p>
<blockquote style="text-align:center!important;font-size:clamp(1.45rem,5.5vw,2.5rem);line-height:1.65;margin:0 auto;max-width:760px;font-weight:800;border:0;padding:0">
בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ
</blockquote>
<p style="text-align:center!important;font-size:.95rem;opacity:.7;margin:8px 0 4px">בראשית א׳, א׳ = 2701</p>

<hr style="opacity:.22;margin:46px auto;max-width:660px">

<p style="text-align:center!important;font-size:1rem;opacity:.72;margin:0">המספר שמלווה את האתר</p>
<p style="text-align:center!important;font-size:clamp(3.2rem,13vw,6.4rem);line-height:.92;margin:12px 0 10px;font-weight:900;color:var(--gold,#e8c840)">1820</p>
<p style="text-align:center!important;font-size:clamp(1.5rem,5.2vw,2.4rem);margin:0;font-weight:900">עופר וינטר</p>
<p style="text-align:center!important;font-size:1rem;opacity:.76;margin:4px 0 0">מילוי = 1820</p>

<hr style="opacity:.22;margin:46px auto;max-width:660px">

<p style="text-align:center!important;font-size:clamp(3.2rem,13vw,6.4rem);line-height:.92;margin:0 0 20px;font-weight:900;color:var(--gold,#e8c840)">631</p>
<p style="text-align:center!important;font-size:clamp(1.35rem,4.8vw,2.1rem);margin:7px 0;font-weight:850">הבחירות = 631</p>
<p style="text-align:center!important;font-size:clamp(1.35rem,4.8vw,2.1rem);margin:7px 0;font-weight:850">מלך ישראל = 631</p>
<p style="text-align:center!important;font-size:clamp(1.35rem,4.8vw,2.1rem);margin:7px 0;font-weight:850">עופר וינטר = 631</p>
<p style="text-align:center!important;font-size:clamp(1.35rem,4.8vw,2.1rem);margin:7px 0;font-weight:850"><a href="/post/bennett-melach-631-78" style="color:inherit;text-decoration:underline;text-decoration-color:var(--gold,#e8c840);text-underline-offset:4px">נפתלי בנט = 631</a></p>
<p style="text-align:center!important;font-size:clamp(1.35rem,4.8vw,2.1rem);margin:7px 0;font-weight:850">נס נתניהו = 631</p>

קצת מידע על המתמודד שרשר = 1000 שהגימטריה שלו אלף והפתק שלו נקרא 'צדק' משיח נקרא משיח צדקנו כמובן שהוא לא משיח הוא חלק מכוח המשיח שמשתקף בתוך המציאות אנחנו נראה לכם רק סרטון אחד מתוך כמה ויש עוד הרבה רמזים שיוצאים ממנו<hr style="opacity:.22;margin:46px auto;max-width:660px">


```

### B-tail-after-units (offset 19253–19842)

```html


<hr style="opacity:.22;margin:48px auto 28px;max-width:660px">

<p style="text-align:center!important;font-size:1rem;line-height:1.9;opacity:.8;max-width:760px;margin:0 auto">
המספרים והחישובים מוצגים כפי שהם. החיבורים והרמזים הם קריאה במספרים, בתאריכים ובאירועים — וכל אחד מוזמן להתבונן ולשפוט בעצמו.
</p>
<p style="text-align:center!important;font-size:.86rem;opacity:.62;margin:12px auto 0">
מועד הבחירות: <a href="https://www.gov.il/he/departments/dynamiccollectors/election-timeline26" target="_blank" rel="noopener noreferrer">ועדת הבחירות המרכזית לכנסת ה־26</a>.
</p>

</section>

```

