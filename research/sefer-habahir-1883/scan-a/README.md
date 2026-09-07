# Sefer HaBahir 1883 — SCAN_A (PDF pages 1–24)

## Scope
Canonical source: `gallery/Book/Sefer_HaBahir_1883.pdf`; N=48, M=24. This artifact owns PDF pages 1–24 only. Pages 25–48 are outside scope and belong to the separate Scan B writer.

## Rendering/readability
The prior Scan A stopped on JBIG2/embedded-OCR readability. That blocker is resolved: the canonical PDF renders faithfully with `pdftoppm` at 220dpi. For disputed exact letters/lines, re-render at 400dpi or crop. OCR is helper-only.

## Fidelity model
This scan separates a full OCR-assisted **working transcription** from **visual-cross-checked exact anchors**. Dense multi-column pages are not labelled letter-perfect: only blocks carrying `exact: true` are certified as visually cross-checked exact. No Wikisource/Sefaria/secondary witness substitutes for the canonical PDF.

## Layers
`Input ≠ Extraction ≠ Finding ≠ Claim`. Candidate Tanakh / Sefer-Yetzirah relations remain candidates only; no canonical promotion occurred.

## Coverage
- 24/24 canonical PDF page renders verified.
- 24/24 pages have page-local structured content in the stored chunks.
- 119,096 OCR-assisted working-transcription characters.
- 50 exact anchors visually cross-checked.
- 24 page-scoped findings recorded, not canonicalized.
- 22 unresolved items retained.
- 0 Book nodes, 0 canonical edges, 0 Research Objects, 0 schema/RPC/UI changes.

## Research clusters in pp.5–24
Visible/extracted clusters include light/darkness; תהו ובהו; blessing/wisdom; letter-form symbolism; Michael/Gabriel; Garden of Eden; vowel/point symbolism; seven voices at Sinai; ten sayings; 32 paths/chambers; soul names; Sabbath/sevenfold structures; Merkavah study; justice/Shekhinah; male/female letter anatomy; tekhelet; 72-name traditions; 12 diagonal boundaries; 36/32/72 structures; Tree of Life / sapphire / throne imagery. These are source-derived Extractions/Findings, not canonical doctrinal claims.

## Storage / validation
Pages 1–4 are in `pages/P01_04.json`; pages 5–24 are losslessly gzip-compressed JSON chunks in `chunks/`. Run `python3 tests/validate_scan_a.py` from this directory.
