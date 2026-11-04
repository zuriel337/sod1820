# Books 2029 — wide reading prototypes

BEFORE · 2026-10-28 · branch based on `253adfcbe1e7ce02610889baf670c8a79072a9e9`. User requested prototypes for Ahavat Torah and Sefer Yetzirah before deciding on a common contract. Scope: existing book-specific layouts and a reusable layout control/style, with focused browser acceptance; no contract, shared frame, Legacy, DB/RLS, main or production modification. The live read-only coordination scan found previous scoped claims released; this note is not a live work-log entry. Preserve source, exact reading actions, fullscreen, explicit spatial activation and existing data. Do not claim that unbuilt structures or content have been completed.

## Implemented

Both existing experiences share the same desktop reading controls: balanced source/explanation and wider source. At 1024px and above the PDF occupies the right-hand column and the selected layout keeps the current source page. On narrower screens the existing stacked layout remains. Entry links offer reading or the existing structures section; they do not introduce a new library surface or activate 3D. Ahavat's source map is reflowed into an unclipped two-column card arrangement inside its newly narrower story column.

## Checks

The focused Chromium matrix passed for both books at 320/390/1440 in light/parchment/dark, checking source-page preservation, keyboard width selection, larger PDF geometry, RTL placement, unclipped Ahavat map cards, no initial 3D and no horizontal overflow. PDF requests were mocked in that matrix. A separate 1440 Chromium check loaded the actual hash-matched 99- and 220-page PDF witnesses, entered and exited fullscreen and retained page 6. Screenshots are temporary evidence under `/tmp/books-wide-dual-experience-20261028`; they are not a hosted Preview.

328 selected Books non-browser tests passed; language 3/3, Auth Guard 4/4, Preview Build 2029, graph/weight and Legacy Production Lock passed. The Preview build with both flags had 376,865 eager JS gzip bytes and did not change the budget. The contract remains unchanged pending user review; no generalized library-by-structure landing, new visual assets or new 3D model were implemented in this slice. Future graphic and interaction work must be accepted against the existing source/spatial contract before any final common design contract update.

AFTER · scoped branch implementation; local ownership released at handoff. No live work-log row, main merge, production release, Legacy, database or permission changes.
