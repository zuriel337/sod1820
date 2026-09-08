# RESIDUAL LEGACY POST CORPUS — DEEP LOSSLESS EXTRACTION V1 — FINDINGS

READ-ONLY. Branch `claude/residual-legacy-post-extraction-m8db2m`.
Live sources: Supabase `linswmnnkjxvweumprav` + `origin/main` @ `7ad3958fc8449e4ebce7f0e38c71f3f771388784`.
work_log: BEFORE `2ef65f71-e596-4dc6-b1b4-1da6aeae59c8` · CHECKPOINT 1 `3df78a08-cff3-48a8-a5ec-67dd484479d7`.

**Nothing here is canonical. Nothing was promoted. No product data was written.**

---

## 1. Exact residual corpus manifest

Full manifest: `00_MANIFEST.md`. Set arithmetic proven twice by independent paths
(SQL aggregate; full PostgREST pull of all 1177 `source='wordpress'` rows re-partitioned locally).

| quantity | value |
|---|---|
| `posts` total | 1287 |
| `source='wordpress'` | 1177 |
| EXCLUDED `רמזים חזקים` / `סוד האותיות והמספרים` / `גלריות גימטריה` (unique union) | 233 |
| **RESIDUAL UNIQUE** | **944** |

The already-closed corpus reproduces from live data: `סוד האותיות והמספרים`(104) − overlap with
Strong Hints(36) = **68**, exactly the published 68/68 denominator. Residual posts with no
category: **0**. With empty content: **0**.

Text volume after strict HTML strip: **4,961,848 ch**. Bands: A_tiny(<600) 518 · B_small 168 ·
C_medium 124 · D_large(>8000) 134 — the 134 large posts hold 4.08M of the 4.96M chars.

## 2. Coverage — denominator and exact completion

**The denominator is 944 and it is fixed.**

| pass | posts | status |
|---|---|---|
| structural (text extracted, normalised, indexed, claim-mined, engine-verified, lineage-hashed) | **944 / 944** | complete |
| close-read (read in full or dense-extract, findings typed by hand) | **24 / 944** | **2.5%** |

Close-read set: 1794, 1074, 250, 1375, 1348, 1313, 1420, 977, 298, 123, 133, 44, 8, 1295, 35, 28,
102, 182, 1322, 197, 86, 68, 1302, 1301 — plus the full old/new diff of 1079.

**RESIDUAL LEGACY POST CORPUS = 24/944 CLOSE-READ. NOT COMPLETE.** The word "complete" is not used
of this corpus anywhere in this document.

## 3. Category overlap map

In `00_MANIFEST.md` §3. Headline: `תיעוד אירועים` is already ~35% absorbed by the excluded corpora
(265 residual of 406); `עלוני גאולה`(113), `כללי`(43) and `מימד חמש`(3) lose **zero** — wholly
uncovered before this pass.

## 4. Source / update lineage map

- **123 posts are accretive update-logs** carrying **308** dated `עדכון <date>` segments
  (post 298: 18 segments spanning 2021–2024; 1147: 15; 133: 12). Each segment is its own research
  unit with its own date and often its own contributor. A post is a CONTAINER, never a finding.
- **7 posts embed verbatim timestamped chat transcripts** (23 stamped messages). Senders: `zuriel` 13,
  **`null` 7**, `עמיחי` 2, `ציון סיבוני` 1. The 7 `null` senders are a **provenance loss in the
  import pipeline**, not an anonymous contributor.
- **Post 1794 (wp 503) is not an article** — it is the complete index of the `סוד החשמל` audio-lesson
  corpus: **1200 distinct numbered lessons** (range 2–1279, 78 numbering gaps, 2 duplicate numbers),
  each with a one-line topic. Preserved verbatim in `10_sod_hachashmal_lesson_index.tsv`.
  This is 1200 previously unmodelled SOURCE identities and the largest single find of the pass.

## 5. Typed research findings

Detail in `20_numeric_claim_ledger.tsv` (2864 rows), `25_system_law_applications.tsv` (152),
`40_contributors_and_sources.md`, `50_copy_lineage.md`.

**Structured gematria tables recovered.** 37 residual posts carry HTML tables; 14 yield
**566 (value, phrase) rows, 507 distinct**, sourced from a shared public Google Sheet whose iframe
is still embedded in post 1375. Top values: 776 (128 rows), **1820 (37)**, 1335 (29), 5776 (27),
396 (19), 1692 (16), 1331/1202 (14 each).
⚠️ A naive HTML strip splits these cells and turns the corpus into orphan numbers. My first pass did
exactly that and was corrected. These 37 posts must always be read cell-paired.

## 6. Gematria / method findings

**2864 numeric claims** extracted and every phrase run through the LIVE canonical engine
(`gematria_api` + all 20 registered method functions, via public RPC). **Never computed from memory.**

| class | n | % |
|---|---|---|
| ENGINE_MATCH | 1579 | 55.1% |
| NOT_ENGINE_REPRODUCED | 963 | 33.6% |
| SOURCE_NATIVE_VARIANT | 154 | 5.4% |
| SYSTEM_LAW_APPLICATION | 152 | 5.3% |
| NEAR_MISS ≤3 | 16 | 0.6% |

**Historical operators are preserved explicitly and never silently applied**: `+כולל`, `-1`,
`+אותיות`, `+מילים`, `+אותיות+כולל`, `+מילים+כולל`, and the plural forms `שתי הכוללים`,
`3 כוללים` (posts 35, 976, 1015, 1794).

**Composites observed that the registry does not carry**: `רגיל + אתבש` (post 35),
`גדול + מילוי` (post 1295), `מילוי בלבד רגיל` used as a compound label (posts 44, 8).

**Techniques named by the sources but absent from `gematria_methods`:**
`ניקוד האותיות` · `אור חוזר (למפרע)` · `הפיכת מספרים לאותיות` · `גימטריה קטנה` · `צורת האותיות` ·
and via רמ"ק: `תוכי תיבות`, `ראשי/סופי פסוקים`. Source: posts 977 + 1420.

### 6a. Method-doctrine document (route to method-lifecycle as SOURCE_ATTESTED)

Posts **977** (wp22525) and **1420** (wp25651), both **ציון דוד סיבוני**, are an explicit source-native
taxonomy of תורת הרמז with a full classical bibliography: זהר חדש · רמב"ם *אגרת לחכמי פרובנס* ·
רמ"ק *פרדס רימונים* · הגר"א · רמב"ן *מאמר הגאולה* · תקו"ז קכ · *פענח רזא* · שיחות מוהר"ן רג ·
המאירי · רבינו בחיי · חתם סופר *תורת משה*.

Engine-verified from that document (all ENGINE_MATCH):
`רמז=247` · `פלא=111` · `247+111=358=נחש=משיח` · `גנת=453=מלך המשיח` ·
`"כי לא דבר רק הוא מכם"=679=גימטריאות` · `חכם=68=הכל אחד=חיים` · `חיים(גדול)=628=אורייתא`.

### 6b. A source-native reading rule that changes how its claims must be read

Post **250** states in the source: **«בגימטריאות לא משגיחים על + -1»** — his equalities are ±1
tolerant **by doctrine**. Two claims in the doctrine document land exactly there:
`מסתתר(גימטריאות)` engine **857** vs claimed **858** = `קדש קדשים`; and
`רמז+נחש+סטת = 1074` vs `שיר השירים` engine **1075**.
Under his stated rule these are valid; under the engine they are not. Recorded as
SOURCE_NATIVE_VARIANT-by-declared-tolerance. **The engine must not adopt this tolerance.**

### 6c. A method-identity divergence from canonical rule

Post 250 fixes finals at `ך=500 ם=600 ן=700 ף=800 ץ=900` and computes accordingly; post 1295 states
it outright («בגימטריה גדול – הופכים את ה נון סופית ל 700»). Canonical
`method_hierarchy_ragil_foundation` holds that finals in רגיל stay רגיל. So a named source's default
is `גדול` where the canonical default is `רגיל`. **Recorded, not resolved, not promoted** — this is a
Human-Gate question about per-source method defaults, not an error to correct.

## 7. System-law applications (METHOD ≠ SYSTEM LAW)

152 claims are **transforms of an already-known number**, not calculations of a phrase. Full list in
`25_system_law_applications.tsv`. Families observed:

| transform | evidence |
|---|---|
| millennium prefix (+5000) | `תשע"ו=776 → 5776`, `התשע"ה → 5775` |
| decimal scaling (×10) | `1237×10=12370` (post 250) |
| zero-law / צמצום (zero-drop) | `520 → 52` (post 8) |
| digit-sum reduction | `464 → 4+6+4 = 14` (post 28); `3+9+6=18 → 9` |
| אור חוזר / למפרע (reversal) | `318 → 813` (posts 250, 1420) |
| spelled-numeral identity | `חמשת אלפים שבע מאות שבעים ושש = 5776` |
| multiplication | `106×4=424`, `106×3=318` (post 123) |

### 7a. חוק השעון — the Clock Law, recovered in full

Posts **1302** (wp5956) and **1301** (wp6025), contributor **ינון**, 2015. 74 occurrences of `12:37`
across 6 posts (1235, 1295, 1301, 1302, 1429, 1582). The complete arithmetic:

- 6 creation-days = 6000 years; each day = night(500y) + day(500y).
- Friday daytime opens at ה'ת"ק (5500) = **06:00**; 12:00 opens at ה'תש"נ (5750).
- 250 remaining years ÷ 6 hours = **41⅔ years/hour** = 41y 8m; ÷60 = **0.69444 y/minute** = 8m 10d.
- `0.694444 × 36 = 25` → **12:36 opens exactly at Rosh Hashana ה'תשע"ה (5775)**.
- Minute 37 opens י' אייר; minute 38 opens כ' טבת ה'תשע"ו.
- Independent Zohar derivation of the same time from «שישה קמצים וחצי» + «מידה של אדם» → ~12:37.

**The clock→number bridge, engine-verified here:**
`12:36 ↔ משיח = 1236` — engine: `ragil 358 + מילוי 878 = 1236` ✔
`12:37 ↔ התגלות(מסתתר) = 1237` ✔ · `שער נון התשעו(מסתתר) = 1237` ✔ · `עלות השחר(מסתתר) = 1237` ✔

This is a fully specified system law with a stated time↔value conversion. It is **not** a gematria
method and must never be stored as one.

**Two source-internal date errors** in post 1301, recorded not corrected: «גירוש ספרד … 1942»
(should be 1492) and «בשנת 1940 עבר הבעל-שם-טוב למזיבוז» (should be ~1740).

## 8. Event / date / time map

Raw representation preserved throughout — no punctuation, zero, century or year-digit normalisation,
and no backwards fitting.

| layer | posts | instances |
|---|---|---|
| Gregorian d.m.y | 102 | 309 |
| clock times HH:MM | 69 | 320 |
| Hebrew day+month | 362 | 3060 |
| Hebrew year tokens | 436 | 4393 |
| CE year | 247 | 811 |
| «בשעה N» | 30 | 59 |
| «N דקות» | 34 | 53 |

Repeated-digit times recur as research objects in their own right: `12:37`, `08:08`, `06:06`,
`11:11`, `14:14`. Anchor dates carried with full context: נתניהו born כ"ח תשרי ה'תש"י (21/10/49);
לפיד י"ח מרחשון תשכ"ד (5/11/63); Balfour ה' כסלו (29/11), 105th year at time of writing.

## 9. ELS / cipher / source map

Routed to the existing ELS/cipher owners (`els_single_engine_law`); **no parallel engine or store
was built or proposed.**

- `דילוג` appears in 46 residual posts; 20 distinct explicit numeric skips, incl. **1820**, 10101,
  5784, 5776, 7790, 13533, 974 («צופן פלאי בדילוג תתקע"ד», lesson 751).
- Post 1368 (2015): «צופן יחיד בתורה של זמן הגאולה **בדילוג 1820**», attributed to **יניב לוי**
  (film "המקדש"). Uniqueness claim — **NOT verified**: the searched domain is not specified in the
  source, and matrix co-location ≠ contiguous ELS. Left as SOURCE CLAIM.
- The lesson index itself is a cipher-findings register: **9 `נוטריקון יחיד/כמעט יחיד`**,
  **4 `סינון יחיד`**, **1 `דילוג יחיד`**, 16 `צופן`, 29 uniqueness-of-place claims.
  Every one is a uniqueness claim over an unstated domain → all remain SOURCE CLAIM.

## 10. Contributors / authors

`40_contributors_and_sources.md`. **A named legacy contributor layer exists inside the post bodies
and is almost entirely absent from `contributors` (30 rows).** The dominant in-body pattern is an
*addition*: «והוסיף הרה"ג ר' X שליט"א ש…» — a distinct research unit contributed by a named person
inside a post published by someone else.

Present in `contributors`: ציון סיבוני (42 in-text), אברהם הירש (5), יניב לוי, סלי מור, אריאל.
**Absent**: דוד ויצמן שליט"א (the single dominant voice, 27+ distinct attribution strings) ·
שלום יהודה גראס (25) · אברהם אגשי (23) · שמואל בורנשטיין (20) · יצחק גנזבורג (15) ·
יוסף שינברגר (10) · אליהו נחמני (8) · יוסף מאיר סופר (8) · מנחם ברהום (7) · גלזרסון (6) ·
אברהם ישעיהו טרופ (6) · יעקב מטר (6) · אברהם יצחק וינברג (4). Also as bylines: עמיחי (15),
אבני רונן (6), עמירם טובי (4), שמואל רבר (4), ינון, שיבולת, יניב לוי, אורן עברון.

## 11. Copy-lineage / independent-evidence map

`50_copy_lineage.md`. 2552 repeated 15-gram shingles; 143 post-pairs sharing ≥4; 12 components over
93 posts. The largest (**70 posts, 2014-11-16 → 2026-03-25**, 48 of them `סוד החשמל`) is **not a
copied document** — it is a **CITATION-REUSE COMMUNITY** joined transitively around the same
classical quotations (ילקוט ישעיהו תצט / פסיקתא «מלך פרס מתגרה במלך ערבי», מלאכי ג:א,
ילקוט בראשית מג on ישמעאל, אריז"ל ליקוטים בלק ע' רכח).

**Type 1 — SAME SOURCE / SAME TEXT. Repeated citation is NOT independent corroboration.**
Counting these 70 posts as 70 witnesses to any claim would be a category error.

## 12. Contradictions

1. **Torah verse count.** Post 250 states 5844 (noting a variant 5845). The canonical in-repo ELS
   corpus (`tools/els/data/tk-meta.json`) says **5846**. Unresolved; edition-dependent.
2. **Corpus-statistic claims do not reproduce.** 72 letter/verse-counting claims across 27 posts were
   tested against the canonical corpus. `ויקרא: ל = 3087` reproduces **exactly**. The rest land
   consistently 0.3–6% low: `ויקרא ג` claim 387 / engine 383; `תהלים ץ סופית` claim 249 / engine 245;
   `ק"ץ contiguous in Torah` claim 167 / engine 145; `סנון ישראל בתנ"ך` claim 2808 / engine 2646.
   Cause undetermined — most likely a different textual edition. **Not target-fitted.**
3. **Method default divergence** — §6c above (source `גדול` vs canonical `רגיל` for finals).
4. **Declared ±1 tolerance** — §6b above.
5. Two source-internal date errors in post 1301 (§7a).

## 13. Unresolved

- The exact operational definition of `סנון אותיות` (§16).
- The searched domain behind every `יחיד בתנ"ך` / `יחיד בתורה` uniqueness claim.
- Which textual edition the corpus-statistic claims are computed against.
- 963 claims (33.6%) that no registered method or justified operator reproduces. A large share are
  extraction-boundary artefacts of multi-word capture; the residue needs per-claim close-reading.
- The 7 `null` message senders.

## 14. Existing research families ENRICHED (not duplicated)

Everything below extends an existing owner. **No new object was created.**

| family | how the residual corpus enriches it |
|---|---|
| **1820** | 37 table rows claiming 1820; `בראשית במילוי = 1820` (post 123); `המילוי של סערות תימן = 1820` (post 28); ELS skip 1820 (post 1368); `שכינה = רגיל 385 + משולש 1438 = 1820` |
| **604** | `תדר = 604` (ragil, ENGINE_MATCH) ↔ `משיח בן דוד = 604` (מסתתר, ENGINE_MATCH) — a clean engine-verified bridge; relates directly to the gallery session's open HG-2 |
| **1237 / 1202 / 424 / 776** | large new loci sets; 1237 is the Clock-Law minute (§7a) |
| **37 / 73 / 137 / 271** (Wisdom/Pregnancy/Wonder/Speech, object `b83f7e39`; `posts:127#חכמה-הריון-271`) | post 298 is a multi-year update-log built entirely on `חכמה=73 / יחידה=37 / קבלה=137 / הריון=271` |
| **דוד / דויד / 14 / 24 / ביבי** | `ביבי = 24 = דויד`; `ביבי` as ר"ת «בגפו יבוא בגפו יצא» (post 35); `בנימין נתניהו = 683` across many loci |
| **1000 family** | `תהילה על תהילה = 1000 = משיח בן דויד + משיח בן יוסף` (post 44) |
| **2701** | post 298 «סודות הפסוק הראשון 2701»; already held by object at `wordpress/posts:904` |

New small families surfaced: **16** (`עץ=זוג=בבואה`), **67** (`יבנה=בינה`), **303/404**,
**תדר/Hz** (a genuine cross-domain relation: gematria value ↔ physical frequency, posts 8/10/28/68).

## 15. Genuinely new HUMAN-GATE candidates

Recorded only. **Nothing saved, nothing promoted.**

- **HG-R1 — `סנון אותיות` as a procedure family** distinct from ELS. See §16.
- **HG-R2 — the 1200-lesson `סוד החשמל` index** as 1200 SOURCE identities.
- **HG-R3 — the 507 distinct table (value,phrase) rows**, incl. 37 claiming 1820, as source-attested
  claims with provenance to a named shared sheet.
- **HG-R4 — the legacy rabbinic contributor layer** (§10) for `person_foundation_contract_law`.
- **HG-R5 — post 1079 recovery**: 79 claim-strings that survive only in `content_old`
  (`31_post1079_claims_recoverable_from_content_old.txt`).
- **HG-R6 — the Clock Law (§7a)** as a formal system-law identity with a time↔value conversion.
- **HG-R7 — the ציון סיבוני ±1 tolerance and finals-default divergence** (§6b, §6c) as
  *per-source method-profile* metadata.

## 16. Unknown-unknowns

### `סנון אותיות` / `שיטת המסננת` — a named procedure the registry does not have

91 instances across 20 residual posts, plus 20 lessons in the index. **Not ELS.**

**Source definition** (post 122, attributed to הרה"ג ר' דוד ויצמן שליט"א):
> «אם נסנן את כל אותיות התורה ונשאיר רק אותיות משי"ח, נקבל 606 סנונים»

Sieve the corpus keeping only the letters of a target set, then count occurrences of the target
sequence in the sieved stream. Documented variants: `ישר והפוך` · `סנון יחיד` (uniqueness) ·
ordinal-from-start/from-end («הסנון ה-199 מההתחלה הוא ה-424 מהסוף») · domain scoping
(תורה / תורה+יהושע / תנ"ך) · gematria of the sieved letters.

**Provenance of the method itself is datable.** The lesson index carries **5 explicit
«שיטת רמז חדשה» announcements** — four method families the registry does not hold:

| lesson | new method announced |
|---|---|
| 1026 (video, ערב ר"ח כסלו תשפ"ג, קבר דוד המלך) | **סוד המסננת** — the sieve, first announcement |
| 1037 | סוד המסננת (continued) |
| 1109 | **צפיפות אותיות** — letter density in the Torah |
| 998 | **ספירת אותיות התורה** — Torah letter counting |
| 816 | **טעמי התורה** — a method over the cantillation marks |

**Independent reconstruction attempt** against the canonical in-repo corpus
(`tools/els/data/tk-letters.txt`, 1,204,583 letters, Torah 304,805):

| claim | source | engine (fwd / rev / sum) | verdict |
|---|---|---|---|
| `שירה` Torah = 622 | post 122 | 229 / 390 / **619** | close, not exact |
| `תלאה` Tanakh fwd 973 · rev 1144 · sum 2117 | post 122 | 971 / 1139 / **2110** | within 0.3%, not exact |
| `משיח` Torah = 606 | post 122 | 194 / 180 / 374 | **no** |
| `יחמץ` Tanakh = 784 | post 122 | 231 / 255 / 486 | **no** |
| `אפס` Torah fwd+rev = 924 | posts 124, 186 | 214 / 619 / 833 | **no** |

A finals-sensitive variant was tested and rejected. Note: `tk-vtext.txt` carries the parasha markers
פ/ס as letters (1464 of them) while `tk-letters.txt` correctly excludes them — an earlier apparent
"exact match" of 622 collapsed to 619 once that was controlled for, which is exactly why it is
reported here as *close, not exact*.

**VERDICT: `PROCEDURE_MULTI_STEP` / `NOT_ENGINE_REPRODUCED`.** The family is real, named, dated and
attributed; the exact operational definition is undetermined. **No target-fitting was performed and
none should be.** Do not activate a method on this basis.

Other unknown-unknowns: the `תדר`/Hz cross-domain relation; the `סוד X – Y = N מסתתר` composite-chain
notation (post 44/123, an idiosyncratic concatenation operator); `אותיות גדולות` counting
(«בכל התורה יש 10 אותיות גדולות: ליד"ה ב"ן רוג"ע», lesson 1238); Torah structural statistics as a
claim class (middle word = «יסוד», middle sealed-parasha = #190 = ק"ץ, lesson 1086/1100).

## 17. MUST FOUNDATION NOW

**One item only.**

**A versioned corpus identity for scan-type claims.** `סנון`, `דילוג`, `נוטריקון`, letter counts and
verse positions are all assertions *about a specific text*. Today a scan claim can be stored with no
statement of which edition, which finals policy, whether parasha markers count, or how ketiv/qere is
handled — and §12.2 shows that this is not hypothetical: the same claim class lands 0.3–6% off, and a
"match" flipped to a "near-match" purely from the פ/ס question. Without a corpus-identity field,
**none of the 72 corpus-statistic claims can ever be settled, and any that were promoted would be
unfalsifiable.** Deferring this predictably breaks provenance and forces migration later.

This is an **extension of existing owners** (`engine_governance_registry_authority_law` +
`els_single_engine_law`), not a new store.

## 18. EXTENSION POINT NOW

- **Method-application type** on the claim record: `METHOD` vs `SYSTEM_LAW` vs `PROCEDURE`. The data
  demands it (152 system-law claims already extracted) and it is one field on an existing owner.
- **Per-source method profile** (`person_foundation_contract_law` × `canonical_methods_registry_law`):
  default finals policy, declared tolerance. §6b/§6c show two named sources whose claims are
  unreadable without it.
- **Operator vocabulary** as first-class data: `+כולל`, `+אותיות`, `+מילים`, plural kollels,
  `רגיל+אתבש`, `גדול+מילוי` — currently free text.
- **Segment-level source_ref** for the 308 `עדכון` segments and the 23 chat messages.

## 19. LATER

Registering `סנון`/`צפיפות אותיות`/`ספירת אותיות`/`טעמי התורה` as executable methods (blocked on §17
and on a Human-Gate decision); ingesting the 1200 lesson identities; recovering post 1079;
promoting any of the 507 table rows; a uniqueness-verification service for `יחיד בתנ"ך` claims.

## 20. FOUNDATION VERDICT

**FOUNDATION NOT SUFFICIENT** — by exactly one item: §17, corpus identity for scan-type claims.

Everything else found in this pass is absorbed by existing owners without change. The OWNER CHECK is
**EXTEND_EXISTING**; no new owner was needed, proposed, or created.

## 21. EXACT NEXT ACTION

Continue the close-read in the fixed density order from the manifest, at the exact next range:
**P1 remaining — the 38 unread posts of the 61-post P1 band** (23 of P1 are close-read; post 1302 was read out of band), in this order:
`1368, 247, 119, 1650, 1345, 1255, 1173, 976, 1331, 1311, 98, 1154, 1390, 1186, 122, 60, 52, 209,
1185, 1333, 281, 1323, 1545, 62, 207, 1387, 10, 178, 55, 1015, 1132, 1211, 1117, 1159, 64, 284,
1157, 1371` — then P2 (112), P3 (115), P4 (656).

## 22. WHAT NOT TO DO NEXT

- Do **not** register or activate `סנון`/`מסננת`/`צפיפות אותיות`/`ספירת אותיות`/`טעמי התורה`.
  Source-attested ≠ reconstructed ≠ verified.
- Do **not** adopt the ±1 tolerance into the engine, and do not "fix" the 857/858 and 1074/1075
  cases in either direction.
- Do **not** flip any source's finals default, or normalise `גדול`↔`רגיל` across sources.
- Do **not** write back post 1079 from `content_old`, and do not touch `content_old` anywhere.
- Do **not** treat the 70-post lineage community as 70 independent witnesses.
- Do **not** promote any of the 507 table rows, the 37 rows claiming 1820 included, to
  `nodes`/`edges`/`topic_cards`.
- Do **not** re-scan `רמזים חזקים`, the 68/68 `סוד האותיות והמספרים` corpus, or
  `גלריות גימטריה` — they are owned by the parallel sessions.
- Do **not** say "complete" of this corpus before 944/944 is actually close-read.
- Do **not** propagate the personal phone number found in post 250 body text.
