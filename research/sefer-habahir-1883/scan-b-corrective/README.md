# Sefer HaBahir 1883 — Scan B Corrective Re-transcription

## Scope

Corrective re-transcription of exactly 6 PDF pages -- **30, 31, 32, 34, 35, 38** -- flagged unreliable by the witness-structure-audit (`work_log.id b6cc2d66-dd69-4dcf-8615-7ee329301607`), which found that Scan B's original committed content for these pages did not match their own page images (see `research/sefer-habahir-1883/witness-structure-audit/scan_b_reliability_audit.json` for the original evidence).

Dispatch: work_log topic `SEFER HABAHIR 1883 · SCAN B CORRECTIVE RETRANSCRIPTION`. ACK'd against `work_log.id d34b0532-f9c8-4202-bcf1-21186ffad9d2` (original Scan B AFTER) and `work_log.id b6cc2d66-dd69-4dcf-8615-7ee329301607` (audit AFTER).

**No other page was opened, read, or touched.** Pages 1-24 (SCAN_A's territory) and pages 25-29/33/36/37/39-48 (already-verified-accurate Scan B pages) are entirely out of scope for this task.

## Method (per dispatch, strictly followed)

- Each of the 6 pages was rendered **individually** with `pdftoppm -f N -l N` at 220dpi (full page), with **no multi-page batching** at any stage of reading.
- Where the 220dpi render left specific passages (the dense marginal "Or HaGanuz" commentary, or a difficult full-width discourse block) genuinely ambiguous, additional **400dpi crops** were produced (via a fresh `pdftoppm -r 400` full-page render, then Python/PIL crops of specific regions) and read before finalizing that block.
- Each page was read and transcribed **before** its old (faulty) artifact was consulted. Only after producing this page's independent reading was the old `pages/pNN.json` on `claude/sefer-habahir-second-half-0lbg2i` fetched (via `git show`, read-only) for comparison -- never as a starting point.
- OCR (the PDF's embedded text layer) was not used as a transcription source at all, consistent with the original Scan B methodology (it was independently confirmed unreliable -- reversed/interleaved Hebrew).
- The live source PDF (`gallery/Book/Sefer_HaBahir_1883.pdf`, sha256 `b099f2298525c71e7abd45e6132610525fef7ccb8a8f3be338cf4e2404a57067`) was re-verified against Supabase Storage (byte-for-byte match) before this corrective session began.

## Artifact schema

Identical to the original Scan B schema (Input ≠ Extraction ≠ Finding ≠ Claim, see `research/sefer-habahir-1883/scan-b/README.md` for the full schema documentation), with two additions per page:
- `correction_of`: names the old (faulty) artifact this page supersedes and why.
- `correction_method`: names the specific render/crop steps used for this page.

`source_ref` convention is unchanged: `book:sefer-habahir-1883#p<PDF_PAGE>:<BLOCK_ID>`.

## What this corrective pass is not

- Not a change to the original Scan B branch or its committed files -- those remain exactly as they were, per `everything_additive_law`. This is a **separate, additive artifact set** that supersedes the 6 named pages in effect, not in place.
- Not a Book node, canonical edge, Research Object promotion, schema/RPC/UI change, or Master/Roadmap edit. No merge, no deploy.
- Not a re-verification of the 18 pages already confirmed accurate by the audit, nor of pages 1-24.

## Results

- All 6 pages independently read, no batching (see each page's `correction_method` field).
- All 6 pages produced content that differs substantively from their old (faulty) counterparts -- see `DISCREPANCY_REPORT.md` for the full old-vs-new comparison, including one notable finding: old `p31.json`'s content was not fabricated from nothing, but was a misfiled fragment of PDF page 35's true content.
- Validation: `python3 tests/validate_corrective.py` -- all checks passing (see below).
- **With this batch, Scan B's full assigned range (PDF pages 25-48) reaches 24/24 independently-verified-accurate pages** (18 from the audit pass + 6 from this corrective pass). See `DISCREPANCY_REPORT.md` §"Updated Scan B reliability status" for the precise framing (this corrective set supersedes the 6 pages in effect; formal supersession/merge of the two directories is a follow-up integration step outside this task's scope).

## Files

| Path | Purpose |
|---|---|
| `pages/p30.json`, `p31.json`, `p32.json`, `p34.json`, `p35.json`, `p38.json` | The 6 corrected page artifacts |
| `coverage.json` | Per-page coverage counts for the corrective batch |
| `unresolved.md` | Consolidated unresolved-readings list (30 items) |
| `DISCREPANCY_REPORT.md` | Full old-vs-new comparison, per-page verdicts |
| `tests/validate_corrective.py` | Validation script |
