# Source Dossier — אהבת תורה (HebrewBooks #5635)

> **Canonical source identity:** `book:hebrewbooks:5635`
> **This is the ONE dossier home for this source.** Any future session/branch/checkpoint (Claude, GPT, or Zuriel) that touches this book **appends a row below or adds a linked file referenced from here** — it does not create a second index, a second inventory root, or a second identity string. See `docs/research-library/RESEARCH_LIBRARY_FOUNDATION_v1.md` §8 for the full One-Source-One-Dossier contract this file implements.
>
> **Non-canonical.** Nothing in this dossier is a `research_objects` row, a `nodes`/`edges` row, a Universal Finding, or a canonical claim. Everything here is pre-promotion research/workspace material per §6.3 Representation Collapse (`research_intake_foundation_contract`). Promotion of any specific claim to canonical status requires the existing, unchanged flow: `SOURCE → EXTRACTION → RESEARCH OBJECT/CANDIDATE → VERIFICATION → UNIVERSAL FINDING → HUMAN GATE → ONE TREE → PUBLICATION`.

## Source facts

- **Title:** ספר אהבת תורה (Ahavat Torah)
- **Author:** ר' פנחס זלמן הלוי סג"ל איש־הורוויץ (Pinchas Zalman HaLevi Segal Ish-Horowitz)
- **Original imprint:** Podgórze/Kraków, תרס"ה (1905); printer שאול חנני דייטשער
- **Known reprints:** Brooklyn, תשמ"ג (1983, אחים גאלדענבערג / errata by ר' יהושע בר"י צבי לימן); HebrewBooks digitization, ע"י חיים, תשס"ז (2007)
- **Catalog identity:** HebrewBooks item #5635
- **Extent:** 99 PDF pages (confirmed via `pymupdf`, `doc.page_count == 99`)
- **Physical structure:** front matter (pp.1–5) → חלק א' / "מגדל עוז" (pp.6–24) → אוריין תליתאי (pp.25–31) → שרשים בתורה (pp.31–35) → סופר ומונה אותיות התורה, detailed letter table (pp.35–41) + תיבות/אותיות summary tables (pp.41–42) → אותיות/תיבות חמש מגילות (pp.42–43) → חלק ב' title (p.44) + blank (p.45) → parasha-ordered chiddushim (pp.46–92) → מגילת אסתר (pp.93–94) → השמטות/addenda (pp.94–99) → 1983-edition errata list (p.99)

## Known artifacts (append new rows here — do not remove existing rows)

| # | Artifact | Location (branch : path) | Actor | Date/session | What it covers | Status |
|---|---|---|---|---|---|---|
| 1 | Research Ledger | `gpt/ahavat-torah-research-ledger` → `-v2`/`-v3`/`-v4` : `docs/research-notes/AHAVAT_TORAH_RESEARCH_LEDGER.md` | GPT | (pre-existing at start of this reconciliation) | §3.1–§3.12 source findings; method inventory; evidence-strength ranking; corrections/drift log | CURRENT |
| 2 | Checkpoint 2 | `gpt/ahavat-torah-research-ledger-v3`,`-v4`,`-v5`,`-v5b` : `docs/research-notes/AHAVAT_TORAH_RESEARCH_CHECKPOINT_2.md` | GPT | (pre-existing) | Ordinal position; entity-word tables; 1,820 holy names; Haggadah bounded span | CURRENT |
| 3 | Checkpoint 3 | `-v4`,`-v5`,`-v5b` : `..._CHECKPOINT_3.md` | GPT | (pre-existing) | Jacob speech decomposition; Vayigash/Vayechi boundary; Omer count; bounded external corpus | CURRENT — cross-confirmed visually |
| 4 | Checkpoint 4 | `-v4`,`-v5`,`-v5b` : `..._CHECKPOINT_4.md` | GPT | (pre-existing) | אוריין תליתאי closure: פעמים/תיבות dual metric; composite attribution | CURRENT — cross-confirmed visually |
| 5 | Checkpoint 5 | `gpt/ahavat-torah-research-ledger-v5` **only** : `..._CHECKPOINT_5.md` | GPT | (pre-existing) | Coverage-discipline proposal; Research Unit contract extension fields; MUST/EXTENSION/LATER classification | PARALLEL-EXISTING — GPT's own `v5b` branch points at the pre-Checkpoint-5 commit; not adjudicated here, see foundation report §15 item 5 |
| 6 | Coverage/Provenance Map | `claude/hebrewbooks-coverage-provenance-map-qdl1xo` : `docs/research-notes/HEBREWBOOKS_5635_COVERAGE_PROVENANCE_MAP.md` | Claude | Session 1 | 99-page OCR-text-based section map; SCANNED/PARTIAL/SEARCH_HIT_ONLY/NOT_RESEARCHED per page; first page-level cross-reference of the GPT ledger | CURRENT, 2 corrections layered on top (see Crosswalk D-01, D-02) |
| 7 | Letter×Parasha Reconstruction | `claude/ahavat-torah-letter-parasha-reconstruction` : `docs/research-notes/AHAVAT_TORAH_LETTER_PARASHA_RECONSTRUCTION.md` + `.json` + `.csv` | Claude | Session 2 | Deep two-pass visual reconstruction of the detailed letter table + 2 summary tables, originally scoped pp.36–42; 187-row dataset; 2 checksum mismatches; 1 open letter-identity question | CURRENT, 1 scope correction (see Crosswalk D-03 — true table start is p.35, not p.36; pp.35's Aleph/Bet/Gimel/opening-Dalet rows are a documented, not-yet-filled gap) |
| 8 | Full-Book Digital Inventory | `claude/ahavat-torah-full-book-inventory` : `docs/research-notes/AHAVAT_TORAH_FULL_BOOK_INVENTORY.md` + 7 JSON files | Claude | Session 3 | 99/99 page structural map (visual, pp.19–24 deliberately withheld); 88 research units; 12 datasets; 7 calculations; 26 sources; 13 relations; 12 exceptions | CURRENT, 1 open question resolved this session (D-03) |
| 9 | Research Library Foundation (this reconciliation) | `claude/ahavat-torah-research-dossier-foundation` : `docs/research-library/RESEARCH_LIBRARY_FOUNDATION_v1.md` + this file + `CROSSWALK.md` | Claude | Session 4 (this task) | Architecture decision; One-Source-One-Dossier contract; lossless crosswalk; D-03 resolution; checkpoint ingestion contract | CURRENT |

## Open items carried forward (do not silently resolve — see foundation report for detail)

- **D-03 residual:** the letter-table dataset (artifact #7) is missing PDF p.35's Aleph/Bet/Gimel/opening-Dalet content. Documented, not backfilled, in this session.
- **CR-04:** relationship between the two Omer 1..49=1,225 constructions (p.13, p.73) not established.
- **GPT `v5`/`v5b` branch-pointer state:** not adjudicated by Claude (§15 item 5 of the foundation report).
- **PDF pp.19–24:** deliberately outside every Claude artifact's content scope (GPT's declared parallel territory). No Claude row in this dossier claims content from that range.

## How to extend this dossier (for the next session, any actor)

1. Read this file and `docs/research-library/RESEARCH_LIBRARY_FOUNDATION_v1.md` first.
2. Do your extraction/verification/correction work as its own git-tracked artifact (new file or new branch), exactly as artifacts #1–#9 above did.
3. Add one row to the "Known artifacts" table above (or extend the Crosswalk) — never remove or silently rewrite an existing row.
4. Classify your new material against the existing dossier using the NEW/SUPPORTS/CONTRADICTS/CORRECTS/EXTENDS/DUPLICATE_REPRESENTATION taxonomy (foundation report §11).
5. If you believe something should be promoted toward canonical status, do **not** do it from here — hand it to the existing Research Intake / Universal Finding / Human Gate flow, citing `source_ref = "book:hebrewbooks:5635"`.
