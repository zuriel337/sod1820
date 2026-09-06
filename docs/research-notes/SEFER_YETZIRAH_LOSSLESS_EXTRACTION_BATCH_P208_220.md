# Sefer Yetzirah — Lossless Extraction Batch, PDF pp.208–220

**Role:** SEFER_YETZIRAH_EXTRACTION_C
**Dispatch:** work_log `df4c4fd4-599a-4c9b-8ad2-a3f88fa9637c` (task `SEFER_YETZIRAH_LOSSLESS_EXTRACTION_PP208_220_V1`)
**Boundary basis:** work_log `5ac66a4b-5f46-4eac-bb9f-e7b5c1c87e85` (locked 3-session partition + locator grammar)
**Source:** `gallery/Book/Sefer Yetsirah.pdf` only (220 PDF pages total). Wrong PDF ("Hebrewbooks_org_33050.pdf" = Ma'amar Esther) excluded, not reopened.
**Scope discipline:** PDF pages 208–220 inclusive, ONLY. p.207 and below not opened. Sibling ranges (pp.1–152, pp.153–207) not touched.

## What this batch is

A full register (`SEFER_YETZIRAH_LOSSLESS_PAGE_REGISTER_P208_220.json`) of the 13 tail pages of the book, at the same schema depth as the existing `AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P*.json` files: per-page zone/work identification, source_ref locators, opening/closing anchors, verbatim quotes where confidently legible, and explicit unresolved-reading flags where not.

## Key findings (see JSON `gpt_research_flags` / `verification_summary` for full detail)

1. **pp.208–211: Ari-attributed commentary, corrected boundary.** The `פירוש מהאר"י הקדוש זצ"ל` block runs from the bottom half of p.208 (after the tail of the Pri Yitzchak "32 Paths" work) through p.211, where it closes with its own decorative printer's ornament. The prior boundary audit's estimate of "pp.208–212" is corrected: p.212 is a separate insert page, not part of the Ari commentary.

2. **p.212: a previously-uncounted insert page.** A half-title page banner "**כליל תכנית**" ("this is Ma'amar Kadishin from the Ari, containing all the roots of Sefer Yetzirah") introduces two columns that already embed a first, distinct instance each of **Sefer Amash** and **Sefer Bagad Kafrat**, plus a 12-simple-letters path list. This page was not separately named by the prior boundary audit.

3. **p.213: Maamar Kadishin proper + Tamarlish's explanation + a *second*, textually distinct instance of Sefer Amash / Sefer Bagad Kafrat.** Matches the dispatch's anchor, but the dispatch (and prior audit) did not flag that the mini-works here differ in wording from the p.212 instances. **Both instances are preserved separately (`_v1` / `_v2`) and must never be merged** — this is itself a real textual-variant finding for the sibling Textual-Version audit.

4. **pp.214–215 "UNKNOWN" — RESOLVED.** This was the one deliberately-unread pocket left by the boundary-adjudication session for this extraction session to resolve inline. Direct full-resolution reading shows: **the old-recension text (`ספר יצירה נוסחא ישנה`) does not start at p.216 — it starts at p.214**, immediately below a large editorial banner that reads (verbatim):

   > לשלמות המלאכה והדפסתי גם נוסח הספר יצירה כפי שהוא מסודר בדפוס מנטובה (שנת שכ"ב) בסופו, אשר עליו קבעו המפרשים הראשונים פירושיהם: ה"ה ר' שבתי דונולו, הראב"ד, רס"ג, ור"א מגרמיזא, ועוד

   ("For the completeness of the work I have also printed, at the end, the recension of Sefer Yetzirah as arranged in the Mantua printing [year 5322/1562], the basis for the first commentators' — Donolo, Raavad, Saadia Gaon, R' Eliezer of Worms — own commentaries.")

   This is **printed, in-source evidence** for the "Mantua 1562" identification — satisfying (not bypassing) the dispatch's explicit instruction not to assert that attribution as fact without printed evidence. It is recorded as *a source-printed editorial claim*, not as independent codicological verification against a surviving 1562 exemplar (that stronger claim is out of scope and not made). The recension's actual text (opening with Sefer Yetzirah's famous "ב-ל"ב נתיבות פליאות חכמה" Ch.1 Mishnah 1) then runs continuously across pp.214→215→216.

5. **p.216: true end of the old recension AND of the whole printed volume's content.** The recension's own text closes with the verbatim colophon **"סליק ספר יצירה הקדוש, בעזר שמו יתברך ויתעלה"**, immediately followed (same page) by the printed volume's overall printer/compositor colophon naming **ר' גרשון הלוי מוויכאליסקי מווילנא**. Everything after this (pp.217–220) is blank flyleaves and the back cover.

6. **pp.217–219 blank, p.220 back cover** — confirmed by direct visual read, matching the dispatch's expectation exactly.

## Depth of transcription

Following the existing Ahavat Torah precedent, this batch is **not** a full letter-perfect diplomatic transcription of every line. Headers, titles, opening/closing anchors, and the two colophons are recorded verbatim; the dense multi-entry enumerations (32-Paths tail, the 12-simples/3-mothers/7-doubles mini-works, the old recension's own mishnayot) are recorded at structural/anchor depth with explicit `unresolved_readings` entries flagging exactly what remains for a future full-transcription pass. Nothing was guessed or filled in past what was legible.

## No-write / no-scope-creep confirmation

- No DB write of any kind (no content/schema/RPC/RLS, no Book node, no `research_objects`/`topic_cards`/`nodes`/`edges`).
- No Roadmap/Master edit. No merge. No deploy.
- Only this `.md` file and its companion `.json` register were written, on a fresh branch (`claude/sefer-yetzirah-pp208-220-extraction`), off up-to-date `origin/main`.
- p.207 and below not opened. Wrong PDF "A" not reopened.

**handoff_to:** GPT/ZURIEL
