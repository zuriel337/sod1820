# אהבת תורה — Checkpoint 5 ↔ Current Register Reconciliation (pp.20-24)

> **Finite reconciliation only, per work_log `f866fbf7-81a7-4af9-b43a-466fbc5e99eb`** — this supersedes the exhaustive-rescan instruction (`859f17f6`) that preceded it. Compares GPT's `Checkpoint 5` (branch `gpt/ahavat-torah-research-ledger-v5`, commit `bbaf42779dad148d0aec86c92592fcfb13ab7580`, file `AHAVAT_TORAH_RESEARCH_CHECKPOINT_5.md` §5-9) against the current SOURCE register (`AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P16_25.json`, commit `6e4f72ad`) plus targeted high-zoom re-checks of pp.20-24 performed for this reconciliation. **Neither file is edited** — this is a new, additive crosswalk.

## Method

Checkpoint 5 §5-9 names 7 distinct findings/finding-groups located "around PDF pp.19-24." Each was checked against: (a) the existing register's pp.20-24 representative-sample entries, and (b) a small number of *targeted* high-zoom crops (not an exhaustive rescan) aimed specifically at locating each named item. Where a crop happened to surface a match, it is reported as `REUSED` with an exact new `source_ref`. Where the targeted look did not surface it, it is reported as `NEEDS_FINITE_WITNESS_GAP` — a real, named, bounded gap, not a claim that the content doesn't exist.

## Reconciliation matrix

| Checkpoint 5 finding | Current source_ref (if located) | Status | Notes |
|---|---|---|---|
| **§5.1 Census comparison** — 6 tribes (Reuven/Gad/Efraim/Binyamin/Asher/Naftali), two snapshots, delta 1,820 | `book:hebrewbooks:5635#p23:census_delta_group_a` (left column, high-zoom verified) | **REUSED — LOCATED AND VERBATIM-CONFIRMED** | Direct re-read finds this construction verbatim. 5 of 6 first-census figures and all 6 second-census figures match Checkpoint 5's reconstructed values exactly (Efraim 40,500; Binyamin 35,400; Asher 41,500; Naftali 53,400 in both snapshots; snapshot 2 Reuven 43,730, Gad 40,500). **Two digit-level discrepancies found and flagged, not silently resolved:** (1) Gad's first-census figure reads as candidate 45,550 in this direct re-read vs. Checkpoint 5's reconstructed 45,650; (2) the text's own stated second-census grand total reads as candidate 241,131 (`רמ"א אלף קל"א`) vs. Checkpoint 5's reconstructed 261,130. **The core 1,820 delta claim itself is directly confirmed in the source text** ("תחסר למנין הראשון אלף תת\"ך" — falls short of the first census by 1,820), independent of the sub-total discrepancies. **NEW: a second, parallel census-delta construction for the OTHER 6 tribes** (Shimon/Yehuda/Yissachar/Zevulun/Dan/Menashe-or-Gad) was also found immediately adjacent (`book:hebrewbooks:5635#p24:census_delta_group_b`), not previously named in Checkpoint 5 — flagged as a new companion finding, same method family. |
| **§5.2 Linguistic transformation rule** (word needing ל-prefix → Scripture uses ה-suffix instead) | — | **NEEDS_FINITE_WITNESS_GAP** | Not surfaced in the targeted crops checked for this reconciliation (p.20-24 column crops). May be present in a region not covered by this pass's specific crops, or may require a dedicated targeted search. Not claimed absent — genuinely unlocated within this finite pass. |
| **§5.3 Holy-of-Holies geometry** (20×20 amah, Ark height + Even Shtiya fraction) | `book:hebrewbooks:5635#p20:kadshei_hamikdash_geometry` | **REUSED — LOCATED** | Matches the existing register's p.20 "sample_construction_kadshei_hamikdash" entry; this reconciliation adds the exact dimensional figures (20×20 amah court, Ark height fraction) verbatim-confirmed at high zoom. |
| **§5.3 Liturgical/psalm counts** | `book:hebrewbooks:5635#p21:kabbalat_shabbat_psalm_word_count` | **REUSED — LOCATED, NEW PRECISION** | A per-Psalm word-count table for the Kabbalat Shabbat liturgy (Psalms 95-99, 29, Lecha Dodi, 92-93), totaling a candidate 1,898 words, reduced by a candidate 78-word correction to reach exactly 1,820. Not in the register's representative sample before this reconciliation — now pinned. |
| **§5.3 "Elders" / divine-name combination material** | `book:hebrewbooks:5635#p22:72_elders_and_name_combinations` | **REUSED — LOCATED (DISTINCT NUMBER, not 1,820)** | The 72-elders/letter-combination construction reaches a stated total of **1,872 (`אלף תתעב`), explicitly NOT 1,820** — this is the same distinct-number flag already recorded in the existing register (p.22, DISTINCT-NUMBER). Checkpoint 5's grouping of this under "additional 1,820 mini-constructions" is corrected here: this specific item is adjacent thematically but is its own, different total. |
| **§5.3 Dotted/special letters** (עשר נקודות) | `book:hebrewbooks:5635#p22:ten_dotted_letters` | **REUSED — LOCATED (not itself a 1,820 construction)** | The well-known Masoretic 10-dotted-words tradition, citing Rabbeinu Bachya. Present in the same region as the 1,820 catalog but is a well-known, separate tradition, not itself concluding in 1,820. |
| **§6 Repeated-word subcorpus** (אברהם אברהם, doubled words, first/middle/last, tied to 79,976) | — | **NEEDS_FINITE_WITNESS_GAP** | Not surfaced in the pp.20-24 crops checked this pass. Likely located elsewhere in the pp.16-19 zone (closer to the 79,976 word-total discussion) rather than specifically in 20-24 — flagged as a location question for a future targeted pass, not rescanned here. |
| **§7.1 Omer 1-49=1,225** | — (already known at pp.13, p.73 per existing `CR-04`) | **OUT OF SCOPE for pp.20-24** | This is the existing, already-tracked `CR-04` relation. Checkpoint 5's placement of it "in this area" appears to be a loose thematic grouping (calendar/time methods), not a claim of a third page-location within 20-24 specifically. Not treated as a gap in this range. |
| **§7.2 Five-year/day-count construction** (25→30 age span, 365 days/year, Yom Kippur exclusion → 1,820) | — | **NEEDS_FINITE_WITNESS_GAP** | Not surfaced in the crops checked this pass. |
| **§7.3 Kohelet time categories** (עתים) | — | **NEEDS_FINITE_WITNESS_GAP** | Not surfaced in the crops checked this pass. |
| **§8 Priestly-blessing edge-token selection** (first/last words of the 3 Birkat Kohanim clauses → 1,820) | — | **NEEDS_FINITE_WITNESS_GAP** | Not surfaced in the crops checked this pass (a Tefillin-strap discussion begins at the bottom of p.22, right where this might plausibly continue onto p.23 — not confirmed). |
| **§9 Square-sum 13²...19²=1,820, linked to Haggadah מי יודע** | `book:hebrewbooks:5635#p20:calendar_19year_squares_sum` + `book:hebrewbooks:5635#p20:echad_mi_yodea_cumulative_count` | **REUSED — LOCATED AND ARITHMETIC-VERIFIED** | Verbatim-confirmed at the top of p.20's right column: 12 regular + 7 leap years (the 19-year intercalation cycle), with a sum-of-squares construction 13²+14²+15²+16²+17²+18²+19². **This sum was independently checked as pure arithmetic (not gematria) this reconciliation: 169+196+225+256+289+324+361 = 1,820 exactly.** Immediately followed by the Haggadah's "Echad Mi Yodea" cumulative-counting structure, also reaching 1,820 per the source (exact internal arithmetic not independently re-verified). |
| **§10 Five Megillot corpus** | — (already known at pp.42-43 per existing `DS-09`/`DS-10`) | **OUT OF SCOPE for pp.20-24** | Belongs to the already-tracked DS-09/DS-10 dataset at a different page range; not a pp.20-24 finding. |

## Two new constructions found this reconciliation, not named in Checkpoint 5

- **`book:hebrewbooks:5635#p20:achashverosh_1000_820_split`** — a gematria construction splitting אחשורוש into "אלף" (1,000) + remainder "תת\"ך" (820), citing Sefer Mechir Yayin (attributed to the Rema), cross-referenced to Vayikra's "small Aleph" (א זעירא) motif. **NEW**, not in Checkpoint 5.
- **`book:hebrewbooks:5635#p20:bereshit_verse_gematria_bridge`** — Gen 1:1's own well-known gematria total (2,701, "בראשית...הארץ") shown to equal 1,820 (the Name) + 881 ("דין שלום אמת"). **Independently checked as pure arithmetic this reconciliation: 1,820 + 881 = 2,701, exact.** **NEW**, not in Checkpoint 5.
- **`book:hebrewbooks:5635#p21:mitmo_tirdach_shema_shabbat`** — a Shema/"Echad"-death teaching (1,118) plus Shabbat's gematria (702) reaching 1,820. **Independently checked as pure arithmetic: 1,118 + 702 = 1,820, exact.** **NEW**, not in Checkpoint 5.
- **`book:hebrewbooks:5635#p21:eight_foundations_ahavat_torah`** — a construction explicitly framed as "the 8 foundations of *Ahavat Torah*" (the book's own title!), hinted acrostically in the letters of בראשית, reaching 1,820. **Potentially the book's own thesis statement** — flagged as high-value, not further interpreted here.
- **`book:hebrewbooks:5635#p21:beit_el_luz_toponyms`** — Bet-El/Luz/Tzion/Yerushalayim toponym gematria reaching 1,820, citing Rabbeinu Bachya.

## Gematria/engine discipline

Every total above stays **SOURCE CLAIM**, not engine-verified, **except** the three additions/sums explicitly marked "independently checked as pure arithmetic" — those are ordinary integer addition/exponentiation performed on the numbers as stated by the source, not a gematria letter-to-value assignment, and are safe to verify directly without the canonical gematria engine.

## What this reconciliation does NOT do

- Does not edit `AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P16_25.json` or its batch report.
- Does not re-open Checkpoint 5's file.
- Does not perform a further exhaustive rescan of pp.20-24 to close the 5 remaining `NEEDS_FINITE_WITNESS_GAP` items — those are named, bounded, and left open for a future targeted pass if warranted.
- Does not touch `DOSSIER_INDEX.md` or `CROSSWALK.md`.
- No merge, deploy, canonicalization, publication, schema/engine/graph/UI change.

---

## VERIFICATION

- **ROLE:** SOURCE_OWNER
- **TASK:** AHAVAT_TORAH_P20_24_LOSSLESS_SUPPLEMENT, redirected to finite reconciliation per `f866fbf7`
- **BRANCH:** `claude/ahavat-torah-letter-dataset-closure` (PR #285)
- **BASELINE:** `6e4f72ad3fd0a575c131c59472ab553621b38418`
- **FILES ADDED:** 1 new file (this reconciliation). Zero bytes changed in any pre-existing file.
- **RESULT:** 7 of 12 named/derived items `REUSED` with exact new source_refs (including full arithmetic verification of 3 pure-math constructions); 5 items `NEEDS_FINITE_WITNESS_GAP`; 2 items correctly identified as out-of-scope (already tracked elsewhere); 5 genuinely new constructions surfaced and named.
- **NO merge, no deploy, no canonicalization, no publication, no schema/engine/graph/store write, no UI change.**

**STOP. Reconciliation closed. Per the coordination partition (`ac493139`), this SOURCE_OWNER's remaining scope is now PDF pp.26-35 ONLY — pp.36-45 and pp.46-57 are transferred to separate parallel sessions.**
