# Sefer HaBahir 1883 — Rendering Unblock Golden Sample

Dispatch: `18d7f35f-4f9f-4c7c-aa4f-5a6732750a87`

Scope: rendering/readability verification only. Canonical PDF pages 2, 12, 23. No transcription corpus, research extraction, Book node, edges, Research Objects, schema/RPC/UI, merge or deploy.

## Reproducible rendering protocol

1. Use the exact canonical witness `gallery/Book/Sefer_HaBahir_1883.pdf` (verified 48 PDF pages; 4,362,696 bytes). The user-provided copy used for the golden sample has the same page count and byte size and renders the same page images.
2. Verify page count with `pdfinfo` before extraction; expected `Pages: 48`.
3. Render an exact PDF page with Poppler, not the embedded OCR layer: `pdftoppm -f <PDF_PAGE> -singlefile -r 220 -png Sefer_HaBahir_1883.pdf p<PDF_PAGE>`.
4. Treat the resulting PNG as the visual source of truth. OCR/parsed text may be used only as a navigation/transcription aid.
5. Any text marked `exact` must be visually cross-checked character-by-character against that rendered page. If typography/damage prevents certainty, mark unresolved; never repair from Wikisource/Sefaria.
6. Preserve raw PDF page index in every source_ref. Printed folio/page labels are secondary metadata only.

## Golden sample

### PDF page 2 — early sample
- Render: PASS at 220 dpi.
- Visual state: essentially blank scan leaf with faint accession/scan marks; no reliable Hebrew body text to transcribe.
- Exact-safe observation: page has no printed `ספר הבהיר` body/header visible.
- Fidelity: HIGH for page-image reproduction; content usefulness LOW because the source page itself is nearly blank.

### PDF page 12 — middle sample
- Render: PASS at 220 dpi; dense Hebrew body and commentary are visually legible at zoom.
- Exact visually cross-checked anchors: `ספר הבהיר`; printed page label `8`; body anchor `א״ר אמוראי ג״ע היכן הוא`.
- OCR verdict: useful as an aid but not authoritative; visual image remains controlling witness.
- Fidelity: HIGH for main body/header; very small commentary should be zoomed/cropped or re-rendered at 400 dpi when exact transcription is required.

### PDF page 23 — late sample
- Render: PASS at 220 dpi; main text and `אור הגנוז` commentary are visually present and separable.
- Exact visually cross-checked anchors: `ספר הבהיר`; `אור הגנוז`; body anchor `יש כנגדם י״ב פקידים`.
- Fidelity: HIGH for main body/header; dense lower commentary benefits from 400 dpi/crop for letter-perfect work.

## Fidelity verdict

**PASS — RENDER/READABILITY BLOCKER RESOLVED.** Poppler `pdftoppm` faithfully renders the canonical JBIG2-backed PDF page images. The previous blocker was tool-path availability, not unreadability of the witness. The safe Scan-A continuation protocol is direct visual reading from exact page renders, with OCR only as an aid and visual cross-check required for anything marked exact.

Recommended production transcription setting: 220 dpi full-page render for orientation + 400 dpi targeted render/crop for dense commentary or uncertain glyphs.

Release state: BRANCH ONLY · NOT MERGED · NOT DEPLOYED · NOT LIVE.
