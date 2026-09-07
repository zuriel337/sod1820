# Sefer HaBahir 1883 — Scan A pagewise reconstruction v2

## Scope
Canonical witness: `gallery/Book/Sefer_HaBahir_1883.pdf`
SHA-256: `b099f2298525c71e7abd45e6132610525fef7ccb8a8f3be338cf4e2404a57067`
PDF N=48. This artifact owns **PDF pages 1–24 only**. Pages 25–48 and all Claude Scan B artifacts are out of scope.

## Why v2
The earlier Scan A stopped on render/readability. The blocker was later resolved with `pdftoppm`.
A subsequent independent witness-structure audit found that **multi-page batching can cause page-assignment mistakes**.
This v2 therefore supersedes any batched Scan-A transcription candidate as the usable Scan-A reconstruction.

## Reproducible method
Each page was rendered **individually**, never as a 4-page/read batch:
`pdftoppm -f N -l N -r 220 -png -singlefile <canonical.pdf> pNN`
Pages 7, 18, 23 and 24 received page-local 400dpi crops for dense/decision-relevant readings.
The embedded text layer / `pdftotext -layout` was used only as a reading aid. It is **not authoritative** and its raw text is deliberately omitted from the branch artifact; only a SHA-256 aid fingerprint is retained per page.
A block is marked `exact=true` only where its text was visually checked against the individually rendered page.
Regions not faithfully adjudicated remain `exact=false`/`visible_text=null`, with confidence, fingerprints where applicable, and unresolved reasons.
No text is inferred across page boundaries. No Wikisource/Sefaria/secondary witness fills a gap.

## Truth boundary
`Input ≠ Extraction ≠ Finding ≠ Claim`.
This artifact contains source input locators, extraction, and noncanonical finding candidates only.
It makes **no canonical promotion**, creates no Research Objects, and writes no graph edges.

## Artifact inventory
- `SEFER_HABAHIR_1883_SCAN_A_PAGEWISE_V2.json.gz` — 24 page records, block-level provenance, exact visual anchors, extraction categories, reading-aid fingerprints, unresolveds.
- `SEFER_HABAHIR_1883_SCAN_A_COVERAGE_V2.json` — coverage/count validation summary.
- `SEFER_HABAHIR_1883_SCAN_A_UNRESOLVED_V2.md` — page-local unresolved list.
- `validate_scan_a_v2.py` — deterministic structural validation.

## Research highlights (extraction, not canonical claims)
The first half visibly carries the Bahir’s core symbolic vocabulary: light/darkness, letters and their shapes, king/daughter/garden/tree/spring metaphors, `ל"ב נתיבות`, explicit `בס"י` reference, seven/sefirot language, `מעשה מרכבה`, `ע"ב שמות`, twelve governors/officials, `תלי · גלגל · לב`, thirty-six powers, and `עץ החיים`.
Numerical statements are preserved as **source-supported witness readings only**; no gematria/engine verification is claimed.

## Release state
Branch-only research artifact. NOT MERGED · NOT DEPLOYED · NOT LIVE.
