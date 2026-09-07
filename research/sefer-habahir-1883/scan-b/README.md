# Sefer HaBahir 1883 — SCAN_B (PDF pages 25–48)

## Dispatch / scope

- Dispatch record: `work_log.id = f32b6dec-6f96-4841-ae92-83a61130ca3b`
  (`actor=GPT FROM=ZURIEL/GPT TO=CLAUDE(BAHIR_SCAN_B) task=SEFER_HABAHIR_1883_LOSSLESS_SCAN_B`)
- Live source: `gallery/Book/Sefer_HaBahir_1883.pdf` (Supabase Storage, bucket `gallery`), sha256 `b099f2298525c71e7abd45e6132610525fef7ccb8a8f3be338cf4e2404a57067`, 4,362,696 bytes — matches the storage object at the time of this scan.
- Live-determined page count: **N = 48**. **M = floor(48/2) = 24**.
- **This scan owns PDF pages M+1..N = 25..48 (24 pages) only.**
- Counterpart `SCAN_A` (GPT) owns PDF pages 1–24 (dispatch `work_log.id = 74bcf49b-abb4-47ca-b5df-5142527a760d`). No page overlap.
- Branch: `claude/sefer-habahir-second-half-0lbg2i`. No merge/deploy performed by this scan.

## What this scan is and is not

**Is:**
- A lossless, page-by-page visual transcription (Input) and structured extraction (Extraction/Finding/Claim) of PDF pages 25–48, produced by direct visual reading of 220dpi page-image renders (this scan's extracting agent is Claude, a vision-capable model) — **not** by trusting the PDF's embedded OCR text layer, which was checked and found unreliable (reversed/interleaved Hebrew; see `manifest.json`).
- 100% file-based. No Supabase writes of any kind.

**Is not:**
- A canonical Book node, canonical edges, or a Research Object. None were created.
- A schema, RPC, or UI change. None were made.
- A claim of publication-grade, letter-perfect transcription. Confidence is explicitly tracked per block (`high`/`medium`/`low`), and every genuinely uncertain reading is logged in `claim.unresolved_readings` per page and consolidated in `unresolved.md`, rather than silently guessed.

## Layer separation: Input ≠ Extraction ≠ Finding ≠ Claim

Each `pages/pNN.json` file (NN = PDF page 25..48) carries four clearly separated top-level sections, plus a `provenance` section:

- **`input`** — the raw transcription attempt, broken into page-local `blocks` (e.g. header, body columns, the "Torah Or" biblical-citation index line, the "Or HaGanuz"/"Hagahot" marginal-commentary columns). Each block carries a `confidence` rating and, where relevant, `notes` on transcription difficulty. This is the closest thing to "what is printed on the page," not an interpretation of it.
- **`extraction`** — structured items pulled *from* the Input blocks: headings, section markers, verse-citation candidates, numbers, letters, divine names, sefirot/kabbalistic terms, symbols/metaphors, Sefer Yetzirah references, calculations/procedures. Extraction items reference the `block_id` they were pulled from.
- **`finding`** — page-scoped observations made while extracting (structural patterns, continuations, notable juxtapositions). Findings are analytical observations by the extracting agent, not verified facts and not interpretive claims about meaning.
- **`claim`** — candidate relations only (`candidate_relations` to Tanakh / Sefer Yetzirah / rabbinic intertexts / cross-page phenomena), any `contradictions` noticed, and the page's `unresolved_readings`. Nothing in `claim` is asserted as canonical or verified; everything here is explicitly a candidate for human or downstream-agent review.

`source_ref` convention: `book:sefer-habahir-1883#p<PDF_PAGE>:<BLOCK_ID>` — `PDF_PAGE` is the raw PDF page index (25–48), **not** the book's own printed page label (which uses two interleaved numbering tracks — see below). `BLOCK_ID` is the page-local block id (e.g. `p25-b2`, `p25-b_torah_or`).

## Content map of this scan's range

| PDF pages | Content |
|---|---|
| 25–43 | Main Bahir text + "Or HaGanuz" commentary (two-column body, Torah-Or citation line, marginal Hagahot commentary) |
| 43 | Also carries the colophon ending the main text + commentary ("סליק ספר הבהיר" / "תם ספר הבהיר"), plus the medieval commentator's own kabbalistic-transmission-chain colophon |
| 44 | Editorial afterword/essay "דבר אל הקורא" — the single highest-value provenance page in this range (names the editor, his methodology, and the Romm/Vilna printing house) |
| 45–46 | Blank leaves |
| 47 | National Library of Israel accession/stamp page (call number `S 23 A 11927`, barcode `1805775-30`, shelf mark `C.4`) |
| 48 | Back cover (marbled board, no text) — confirms N=48 is the true full extent of the PDF |

See `manifest.json` → `pagination_finding` for the documented dual pagination scheme (Hebrew-letter leaf foliation on rectos, doubled Arabic page numbers on versos) discovered and verified across PDF pages 25–43.

## Known limitations (read before relying on any single page)

1. **Marginal "Hagahot"/"Or HaGanuz" commentary columns are largely illegible at the 220dpi render used.** Every page's `hagahot_*` blocks are `confidence: "low"` and contain only fragmentary phrases. A higher-resolution re-render (400dpi+) of just those regions would likely substantially improve this if a full commentary transcription is ever required.
2. **A small number of pages (32, 33, 36, 37, 38) are unusually dense/low-legibility even in the main body text** and are marked accordingly. PDF page 32 in particular corresponds to a well-known scholarly crux passage (the limb/sefirah correspondence) and should not be treated as a confident verbatim source without independent verification against a critical edition.
3. **A cross-page near-duplication pattern spans PDF pages 32–38 and recurs at page 41** (see `unresolved.md` item 1). This was independently observed via separate visual reads of each page and is flagged, not resolved or silently merged.
4. **The print-year in this specific edition is ambiguous** between ~1880/1881 (per the explicit p44 chronogram gloss, "תרמ\"א") and 1883 (per the source object's filename) — see `unresolved.md` item 2.
5. **Verse-citation candidates and Sefer-Yetzirah/rabbinic-intertext candidates are exactly that: candidates.** None were verified against a canonical verse-lookup or the gematria engine. Per project rule `gematria_engine_law`, any downstream use of numeric/gematria claims from this scan must be recomputed through the system's official engine, not taken at face value from this scan's prose observations.

## Validation

Run `python3 tests/validate_scan_b.py` from this directory. It checks:
- All 24 pages (25–48) have a `pages/pNN.json` file, each valid JSON with the required top-level keys (`pdf_page`, `input`, `extraction`, `finding`, `claim`, `provenance`).
- `pdf_page` values are exactly `{25, ..., 48}` with no gaps, no duplicates, no out-of-range values.
- Every `input.blocks[].block_id` is unique within its page and matches the `p<NN>-...` naming convention.
- `coverage.json` has exactly 24 rows.
- Every unresolved-reading entry's page number appears in `coverage.json`.

## Artifact inventory

See `INVENTORY.md`.
