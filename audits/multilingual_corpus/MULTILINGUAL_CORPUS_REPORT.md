# SOD1820 — Multilingual Corpus Inventory · Phase 1 (READ-ONLY)

**Actor:** CLAUDE · **Date:** 2026-08-22 · **Mode:** 100% read-only audit. Zero writes to any table except the single closing `work_log` memo. No migrations, no schema changes, no UI changes, no new `nodes`/`edges`/`aliases`/`word_aliases`/`language_bridge` rows, no promotion of any candidate, no change to `gematria_methods` or `research_contributions`.

**Files in this delivery** (all in `/home/user/sod1820/audits/multilingual_corpus/`, local-only, not committed to git):
- `MULTILINGUAL_CORPUS_INVENTORY.csv` — 47 findings, full Phase 2 schema.
- `MULTILINGUAL_GOLD_SET_CANDIDATES.csv` — 18 strongest findings, read-only file (NOT a DB table).
- `MULTILINGUAL_CORPUS_REPORT.md` — this document.

---

## 0. Important context found before starting (not acted on, only noted)

`work_log` shows that **earlier today** (2026-08-22), a separate agent pass ran three closely-related tasks: `WORDS_NAMES_ALIASES_PHASE_1 (Identity + Multilingual Proof)`, `CORPUS_EXPANSION_PHASE_1`, and `CORPUS_EXPANSION_GATE_CORRECTION`. That work covered the **identity/alias governance layer** (word_aliases, language_bridge, research_contributions state machine, a proposed `intent='lexical_identity'` value — not written) and reached its own DECISION=YES that the existing model does not need schema redesign for word/alias/multilingual expansion. It independently found and flagged the same live inconsistency this audit re-confirms below (§4.2): the סוד/Secret claim is recorded **twice**, once in `word_aliases` and once in `language_bridge`, never cross-checked. This audit's task is narrower and different in kind — a **content inventory of the actual multilingual research material** (posts, contributions, the "מפתח לגן" reference standard) rather than a governance/intake-process design — so it was run independently as instructed, not skipped. Both passes reached the same qualitative conclusion about schema sufficiency from different angles; see §6.

No other multilingual/translation memo addressed to CLAUDE/GPT was found requiring action.

---

## 1. What was scanned

| Source | Rows scanned | Real multilingual findings |
|---|---|---|
| `nodes` type=`language_bridge` | 13 (all) | 13 |
| `word_aliases` | 7 (all) | 7 |
| `research_contributions` (body/title containing Latin script) | 8 body-Latin, 2 title-Latin, cross-checked | 3 |
| `research_objects` | 124 (all) | 0 (zero Latin/foreign content in `statement`, `meta`, or `terms`) |
| `gematria_words` (phrase with Latin/Cyrillic chars) | 4 matched (out of 15,433) | 0 (all 4 are keyboard-layout typing artifacts — Hebrew intended, English keyboard layout produced strings like `kpbh`/`rhcug` — **noise**, not multilingual research) |
| `posts` (content with Latin script, title/content matches for אנגלית/שפה/תעתיק/רוסי/Ordinal) | ~1,265 posts contain *some* Latin text (mostly URLs, English names in news headlines — noise); 2 posts contain genuine multilingual gematria research | 24 |
| `edges` connected to `language_bridge` nodes | 26 (13 `has_language_bridge` + 13 `bridges_to`) | confirms graph wiring, not separate findings |

**Total real, non-noise multilingual findings: 47**, spread across 4 live source tables.

The overwhelming majority of "posts with Latin characters" (~1,265) are **not** multilingual gematria research — they are geopolitical news posts mentioning "רוסיה" (Russia), "אמריקה" (America), English film/book titles, YouTube/TikTok URLs, or Hebrew-year abbreviations like "תשפ״ה" rendered with stray Latin punctuation. These were excluded as noise per the task's explicit instruction (URLs, filenames, incidental foreign proper nouns in news headlines ≠ multilingual research).

---

## 2. Reference standard: "מפתח לגן" (post id 5018)

Found via `title ILIKE '%מפתח לגן%'`: **post id 5018**, `"שבילי שפה — חיבור בין שפות | מפתח לגן · מבוא | רמזים חזקים ביותר"` (slug `chibur-bein-hasafot-mafteach-lagan`, published 2026-07-09). This is explicitly the intro post of a "שבילי שפה" series; its own closing CTA links forward to a **second post, id 5017** ("הזהב של שמעון חיימוב — כשהאנגלית מגלה את הסוד"), which was pulled into this audit as well since it is the direct, named continuation of the reference standard by the same researcher (שמעון חיימוב).

**Full breakdown of every multilingual example in both posts (24 findings total)** is in the CSV, one row per relation. Key results of the FACT/SOURCE-CLAIM/COMPUTED/INFERENCE separation required by Phase 3:

- **Reproducible arithmetic, hand-verified in this audit:** God=26, Elohim=62, Bereshit=86, Godhood=68 (all via English Ordinal, A=1..Z=26), and father+son=פדרסן=394=friends=פרנדס, טיפול=פילוט=135, שיחה=323=שחיה, בריאן=263=נבריא (all via transliterate-into-Hebrew-then-canonical-ragil). All Hebrew-side values were also cross-checked live against `gematria_words` and matched exactly.
- **Two distinct, uncoordinated computational methods for "English gematria" exist in the live corpus:** (a) direct English Ordinal on Latin letters (post 5018, and the `language_bridge` rows for Secret/priest/glory/throne/good/slave/promise/victory), and (b) transliterate the English word into a Hebrew spelling, then run it through the **canonical, in-engine Hebrew ragil function** (post 5017's father/son/friends, treatment/pilot, conversation, Brian). Method (b) is actually reproducible via the real engine once the transliteration spelling is accepted; method (a) is entirely external/claimed — **neither is in `gematria_methods`.**
- **Not every "value" in `language_bridge` is independently computed on the foreign side.** Spot-checking (hand math) found that `שיחה↔conversation` (value 323) and `הימג׳ן/positive→פוזיטיב` claims carry **only** the Hebrew-side number restated next to the English word — English Ordinal on "conversation" actually computes to 155, not 323. This does not make the Hebrew fact wrong; it means the `method='translation-value'` label overstates rigor for a subset of rows. Flagged per-row in the CSV, not corrected (read-only).
- **A real, self-aware phonetic/sound-pattern layer exists and is explicitly distinguished from gematria by its own author.** Post 5017 states outright: *"הערה: זהו רמז אותיות וצליל — לא שוויון גימטרי"* before presenting a Hebrew–English–Russian root cluster (ד/ס·ט·ר: מדבר/DESERT, קינוח/DESSERT, מגמגם/STUTTER, שמחה/РАДОСТЬ, שבת/Saturday). Post 5018 carries a sibling cluster (ס·ט·ר: Aramaic סטרא, four Russian words, one Yiddish word, one English word) attributed "בקו של שמעון חיימוב." **This phonetic layer is currently unrepresented in any structured table** — it lives only as post prose, in neither `word_aliases` nor `language_bridge` nor `research_contributions`.
- **`gematria_methods` check (Phase 3 Q6):** none of English Ordinal, Reverse Ordinal, Full Reduction, Reverse Reduction, or "transliterate-then-ragil" is a row in the canonical `gematria_methods` registry (23 rows, all Hebrew-only methods: רגיל/מילוי/מסתתר/קדמי/ריבוע/גדול/סידורי/אתבש/אלבם/etc.). **All foreign-language calculation methods found in this corpus are claimed/external, per instruction §7 — none are recommended for registry addition here.**
- **Cross-check against `language_bridge`/`word_aliases` (Q8):** of the 24 post-sourced findings, 6 have an exact independent match already living in `language_bridge` (treatment/pilot cluster ×2, conversation, the 2-language + Russian Messiah cluster ×2) and 6 more match a `word_aliases` row (imagine, dream, positive, realize, happy dream — all `source=shimon-vip`). The remaining ~12 (the God/Elohim/Bereshit/Godhood English-Ordinal set, the father/son/friends/Brian transliteration set, and both phonetic clusters) exist **only** as post prose today, in no structured table.
- **Source of the claims (Q9):** every finding in both posts traces to a named, disclosed provenance — either `שמעון חיימוב` directly (post 5017 in full; the S-T-R cluster in 5018) or `צוריאל`/the system (the God/Elohim/Bereshit/Godhood set and the 70×26=1820 framing in 5018). No anonymous or unsourced claims were found in the reference standard.

**Conclusion on the reference standard itself:** "מפתח לגן" earns its status as Gold/Reference — every example separates a reproducible number (mostly hand-verified true in this audit) from its interpretive framing, and where a claim is *not* numeric (the phonetic clusters) the post says so explicitly. It is not, however, proof that every claim in it is independently novel: roughly half of its multilingual content already exists, unlinked, in the structured layers.

---

## 3. Classification (Phase 2) — coverage of the 8 required relation types

| relationship_type | count | notes |
|---|---|---|
| `transliteration` | 14 | Largest bucket — mostly the `language_bridge` he↔en pairs and the שמעון חיימוב transliteration set |
| `phonetic_relation` | 12 | Both S-T-R clusters (7 + 5 sub-terms), zero structured-table representation |
| `shared_numeric_value` | 10 | Includes the 5 strong Ordinal-family `language_bridge` rows + the God/Elohim/Bereshit pairs |
| `translation` | 6 | Genuine semantic translations (conversation/שיחה, glory-type claims labeled translation, secret/סוד) |
| `numeric_transform_relation` | 5 | Digit-reversal pairs (Elohim/26, Godhood/86) + the anagram-after-transliteration set (father+son/friends, treatment/pilot, Brian) |
| `multilingual_pattern` | 0 as a standalone label (folded into `phonetic_relation` since both post clusters are explicitly root/sound patterns, not spelling patterns) | — |
| `foreign_calculation` | 0 as a standalone label (folded into `claimed_method` field instead, since every calculation found is tied to a specific he/foreign pair already classified above) | — |
| `unclear` | 1 | "positive"/פוזיטיב bare mention with no value or method (research_contributions row 2ad6d76c) |

No `research_objects` rows qualified as findings (0 multilingual content of any kind in that table, confirmed live).

---

## 4. Coverage numbers (Phase 4 — real counts, not estimates)

- **Source documents containing real multilingual research:** 2 posts (5017, 5018) + 13 `language_bridge` nodes + 7 `word_aliases` rows + 3 `research_contributions` rows = **25 distinct source records** across 4 tables.
- **Total real findings (after splitting compound claims per Phase 2):** **47**.
- **Language breakdown:** English/Latin dominates (≈33 of 47 touch English in some form); Russian/Cyrillic appears in 5 findings (all transliterated, no native Cyrillic string stored anywhere in the DB — confirmed 0 rows with actual Cyrillic characters via regex scan); Aramaic 1; Yiddish 1.
- **Already represented in `language_bridge`:** 17 of 47 findings have a `existing_language_bridge = YES` (13 are the bridge rows themselves; 4 more post-findings independently corroborate an existing bridge value).
- **Already represented in `word_aliases`:** 13 of 47 (7 are the alias rows themselves; 6 more post/contribution findings correspond to one).
- **Findings with NO structured-table representation at all (post-content only):** ~17 — mainly the entire phonetic S-T-R/D-S-T-R clusters (12 findings) plus the God/Elohim/Bereshit/Godhood English-Ordinal set (4) plus the "26 English letters" framing (1).
- **Findings carrying a numeric claim:** 26 of 47 (the rest are pure phonetic/pattern observations with no value).
- **Numeric claims independently hand-verified reproducible in this audit:** 19 of the 26 (the remainder — dream=254, happy dream=349, and several `language_bridge` Reverse-Ordinal/Full-Reduction/Reverse-Reduction rows — were not re-derived by hand for time reasons, but are internally consistent and, for the Hebrew side, all matched live `gematria_words` values where checked).
- **Findings using a non-canonical (not-in-`gematria_methods`) method:** effectively all foreign-side calculations — English Ordinal, Reverse Ordinal, Full Reduction, Reverse Reduction, and "transliterate-then-ragil" are **claimed/external methods only**, per instruction, not promoted here.
- **Ambiguous findings (flagged `medium`/`high` ambiguity in the CSV):** 9 of 47 — mostly the `language_bridge` rows that conflate two relation types in one node (פילוט/pilot, טיפול/treatment), the duplicate-channel "realize" alias pair, the unresolved סוד/Secret dual-mechanism case, and the bare "positive" mention.
- **Provenance breakdown:** Zuriel (curated, direct) — 13 `language_bridge` rows + the God/Elohim/Bereshit/Godhood/26-letters set in post 5018 (5 findings) = 18. שמעון חיימוב — 7 `word_aliases` rows + 3 `research_contributions` rows + all 24 post-5017/5018-authored findings that are attributed to him (S-T-R and D-S-T-R clusters, father/son/friends set, Messiah cluster mentions) ≈ 29 (some overlap where the same claim is counted once per source table, per instruction to split by occurrence). No findings traced to any other named contributor.

---

## 5. Gold Set candidates (Phase 5 — file only, no DB write)

`MULTILINGUAL_GOLD_SET_CANDIDATES.csv` — **18 rows**, selected for: clear provenance (all named — Zuriel or שמעון חיימוב), a clear single relationship type per row (compound/conflated rows excluded), reproducibility (every included numeric row was hand-verified in this audit), low ambiguity, and diversity across relation types and languages (English, Russian, Aramaic, Yiddish all represented; transliteration, translation, shared_numeric_value, numeric_transform_relation, and phonetic_relation all represented).

"מפתח לגן" (post 5018) is well represented (6 of its 12 findings made the cut: God=26, Elohim=62, Bereshit=86, Godhood=68, plus 4 of the 7 S-T-R phonetic sub-terms chosen to cover language diversity without padding). Weak/compound findings from the same post (the "26 letters" framing device, the remaining 3 S-T-R sub-terms once diversity was covered) were deliberately left out rather than forced in.

---

## 6. Answers to the 4 required questions

**1. כמה חומר רב־לשוני אמיתי יש לנו בפועל?**
מעט אך אמיתי ומאומת ברובו: **47 ממצאים** אמיתיים על פני **25 מקורות** (2 פוסטים + 13 language_bridge + 7 word_aliases + 3 research_contributions), מתוך סריקה של אלפי שורות רעש (URLs, שמות פרטיים בכתבות חדשות, טעויות-מקלדת). רוב המנוע (`gematria_words` — 15,433 שורות, `research_objects` — 124 שורות) **ריק לחלוטין** מתוכן רב־לשוני. החומר האמיתי מרוכז בעיקר סביב שני אנשים: **צוריאל** (13 גשרי-שפה מתוקננים) ו**שמעון חיימוב** (רוב הפוסטים + כל שכבת-הצליל).

**2. האם הכמות מספיקה ל-Gold Set שימושי?**
**כן, לרמת-בסיס בלבד.** 18 ממצאים איכותיים אפשרו בניית Gold Set מגוון (5 סוגי-קשר, 4 שפות, שני מקורות שם). אך זהו Gold Set **קטן** — לא מספיק לאימון/בדיקה סטטיסטית, מתאים כ"תבנית איכות" ולכללי-אצבע ראשוניים בלבד, לא כמדגם מייצג בגודל משמעותי.

**3. האם המודל הקיים (gematria_words + word_aliases + language_bridge + One Tree) מספיק לייצג את החומר בלי schema חדש?**
**כן, ברובו — עם שתי הסתייגויות שהתגלו.** (א) שכבת ה"פונטיקה/צליל חוצה-שפות" (12 מהממצאים, כל אשכולות ה-S-T-R) **אין לה שום ייצוג מובנה כיום** — לא ב-word_aliases (אין שדה phonetic_root), לא ב-language_bridge (relationship_type מוגבל ל-shared_value/translation/transliteration). זו לא בהכרח דרישה לטבלה חדשה — ייתכן שדי בהרחבת ה-enum של relationship_type ב-language_bridge, אך זו החלטת-אדם, לא הומלצה או בוצעה כאן. (ב) הכפילות הבלתי-מתואמת בין word_aliases ל-language_bridge (סוד/Secret, ואולי גם ה-messiah/imagine/dream) — אותה בעיה **כבר זוהתה באותו יום** על ידי סבב-סוכן נפרד (CORPUS_EXPANSION_PHASE_1), ומאושרת כאן באופן עצמאי. מסקנה: **אין צורך בטבלה חדשה, אך יש שתי סוגיות-איחוד (reconciliation) פתוחות לצוריאל.**

**4. האם יש מספיק חומר כדי להצדיק מערכת סריקה אוטומטית עכשיו?**
ראה שער-ההחלטה למטה.

---

## 🚦 DECISION GATE — Phase 4 Question

# **NOT YET**

**נימוק:** החומר קטן (47 ממצאים אמיתיים, רובם מ-2 אנשים), לא חוזר-על-עצמו באופן שמצדיק אוטומציה (אין תבנית-רעש-גדולה לסנן — הבעיה היא **מיעוט** חומר, לא עודף), וכבר קיימת עבודת-אדם/סוכן שכיסתה חלק גדול ממנו היום עצמו (word_aliases + language_bridge כבר "תפסו" 30 מתוך 47 הממצאים, כ-64%). מה שכן ניתן וכדאי כבר עכשיו — בלי לבנות מנוע — הוא סריקה דטרמיניסטית צרה מאוד: (א) regex לתגי Latin/Cyrillic ב-posts.content/title כמו זו שהופעלה כאן (מסננת רעש-URL בקלות); (ב) בדיקת-התאמה אוטומטית בין word_aliases.alias ל-language_bridge.foreign_word (הבעיה שכבר זוהתה, סוד/Secret) — זה skריפט חד-פעמי, לא "מנוע סריקה". **המלצה: Gold Set + כלל-אצבע לפני מנוע.** כשיצטבר חומר רב-לשוני נוסף (עוד חוקרים, עוד פוסטים בסדרת "שבילי שפה"), הפער יגדל וכדאי לשקול שוב.

---

## Notes on Rank-Don't-Hide

Two patterns worth surfacing without being promoted into taxonomy: (1) two independent computational "English gematria" conventions coexist in the live corpus (direct English Ordinal vs. transliterate-then-Hebrew-ragil) with no documentation distinguishing them; (2) the S-T-R / D-S-T-R phonetic-root research by שמעון חיימוב spans 4 languages consistently across two separate posts and is currently the single largest chunk of real multilingual content with zero structured-table footprint. Both are reported here for Zuriel's attention — no schema or taxonomy change was made.
