# Artifact Inventory — Sefer HaBahir 1883 SCAN_B

Branch: `claude/sefer-habahir-second-half-0lbg2i`
Scope: PDF pages 25–48 (24 pages) of `gallery/Book/Sefer_HaBahir_1883.pdf`
Dispatch: `work_log.id = f32b6dec-6f96-4841-ae92-83a61130ca3b`

## Files

| Path | Purpose |
|---|---|
| `manifest.json` | Scope, source identity/hash, render parameters, pagination-scheme finding, page-type map |
| `README.md` | Scope, methodology, schema documentation, known limitations |
| `INVENTORY.md` | This file |
| `coverage.json` | Per-page coverage counts (block count, input char count, confidence-tier counts, unresolved count) |
| `unresolved.md` | Consolidated unresolved-readings list (88 items across 24 pages, plus 3 high-priority cross-page structural items) |
| `pages/p25.json` .. `pages/p48.json` | 24 per-page artifacts, each with `input` / `extraction` / `finding` / `claim` / `provenance` sections |
| `tests/validate_scan_b.py` | Validation script (structural integrity of the above) |

## Not produced by this scan (explicitly out of scope per dispatch)

- No Book node in Supabase `nodes`
- No canonical `edges`
- No Research Object creation or promotion
- No schema, RPC, or UI changes
- No Supabase writes of any kind — this artifact set is 100% git-file-based
- No edits to PDF pages 1–24 (SCAN_A's territory) or to any pre-existing repository content

## Local (non-repository) working files

These were used to produce the artifacts above but are **not** committed (scratchpad only, outside the repo):

- `/tmp/.../scratchpad/bahir/Sefer_HaBahir_1883.pdf` — downloaded copy of the source PDF (sha256 `b099f2298525c71e7abd45e6132610525fef7ccb8a8f3be338cf4e2404a57067`, verified against the live Supabase Storage object at scan time)
- `/tmp/.../scratchpad/bahir/pages_img/p-25.png` .. `p-48.png` — 220dpi PNG renders of PDF pages 25–48, used as the direct visual transcription source
- `/tmp/.../scratchpad/bahir/text_layer.txt` — pdftotext dump of the PDF's embedded OCR layer, kept only to document why it was rejected as a transcription source (see `manifest.json.embedded_text_layer_reliability`)

## Coverage summary (see coverage.json for full detail)

- Pages covered: 24 / 24 (PDF pages 25–48), no gaps, no overlap with SCAN_A's 1–24
- Total input blocks: 126
- Total input characters transcribed (Input layer only): ~25,800
- Total unresolved-reading items logged: 88 (plus 3 cross-page structural items documented in unresolved.md's "high-priority" section)
- Pages with page_type other than `bahir_text_and_commentary`: p43 (colophon), p44 (editorial essay), p45–46 (blank), p47 (library administrative), p48 (cover)
