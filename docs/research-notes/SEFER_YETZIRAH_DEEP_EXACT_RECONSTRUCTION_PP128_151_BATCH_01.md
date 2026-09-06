# Sefer Yetzirah — Deep Exact-Witness Completion, PDF pp.128–151 (Sefer HaChachmoni body)

**Role:** SEFER_YETZIRAH_DEEP_A3
**Dispatch:** work_log `2e850b77-fafd-4471-b53f-8178701570d8` (task `SEFER_YETZIRAH_DEEP_EXACT_PP128_151_V1`)
**Boundary basis:** work_log `5ac66a4b-5f46-4eac-bb9f-e7b5c1c87e85` (locked 3-session partition)
**Source:** `gallery/Book/Sefer Yetsirah.pdf` only. PDF pages 128–151 inclusive, ONLY. p.126 (editorial insert), p.127 (Chachmoni title/hakdama) and p.152 (closure) are already covered by the sibling pp.1–152 register and were **not** re-opened.
**Nature of this artifact:** ADDITIVE deepening, not a replacement. The sibling session (`claude/sefer-yetzirah-extraction-pp001-152`, file `SEFER_YETZIRAH_LOSSLESS_PAGE_REGISTER_PP001_152.json`) already coarse-mapped this range at "STRUCTURALLY_MAPPED ONLY" depth (one line per several pages). This batch re-reads all 24 pages individually at 250dpi to bring them to block-level exact-witness depth, per dispatch.

## What this batch found

### Corrected chapter map

Direct reading establishes a finer structure than the sibling's coarse pass:

- **חלק ראשון** (Part One — the "Na'aseh Adam"/microcosm philosophical preamble): pp.128–134, closing at the top of p.135. Includes the **"דמהו לעולם"** (microcosm) sub-section (p.131–134) and an embryology-as-ruach/mayim/eish exposition (p.133–134).
- **חלק שני** (Part Two — the actual Sefer Yetzirah verse commentary) begins at **p.135**, explicitly headed "זה תחלת פירוש ספר יצירה..." — this part-boundary was not present in the sibling's coarse map at all.
- Within Part Two: **Ch.1** (ten sefirot, pp.136–138), **Ch.2** (22 letters, pp.138–139), **Ch.3** (three mothers, pp.140–141), **Ch.4** (seven doubles + a long planetary/astronomical excursus, pp.141–148), **Ch.5** (twelve simples, pp.148–150), **Ch.6** (Teli/Galgal/Lev, pp.150–151+).

### Two corrections to the sibling coarse register

The sibling file states p.148 = "פרק ששי" (Chapter Six). Direct reading shows this is wrong on two counts:

1. **p.148 is actually פרק חמישי (Chapter Five)** — the twelve-simples chapter, opening "ספר שלישי של שנים עשר ההלוחיות הנקראות פשוטות."
2. **Chapter Six actually begins at p.150**, immediately after Chapter Five's own closing colophon ("נגמר ספר שלישי של י"ב פשוטות...").

This is stated as a finding of this session; the sibling's file itself was not edited (per the additive-only instruction).

### Dispatch mandate items — all located

- **Articulation (קול/רוח/דיבור) — the batch's highest-value find.** p.138 states directly: *"ואלו הן חקוקות בקול, חצובות ברוח, קבועות בפה, בחמשה מקומות: אחה"ע, בומ"ף, גיכ"ק, דטלנ"ת, זסשר"ץ"* — "these are carved in **voice**, hewn in **breath**, fixed in the **mouth**, in five places" — a direct, source-attested statement of the five articulation places with the standard letter groupings. A second, distinct articulation passage on p.140 describes the *individual sound-quality* of each of the three mother-letters (Mem = silent, Shin = sibilant/hissing, Alef = mediating between them, compared to breath mediating between water and fire).
- **3 (mothers) / 7 (doubles) / 12 (simples).** All three chapters located with their opening formulas verbatim-captured: Ch.3's אמ"ש opening (p.140), Ch.4's seven traditional opposite-pairs list (p.141), Ch.5's twelve-faculties list (ראיה/שמיעה/ריח/דבור.../שינה, p.148).
- **עולם/שנה/נפש.** The triad appears explicitly on p.140, tied to the three mothers — exact surrounding wording flagged as needing a higher-zoom confirmation pass (small print), but the co-occurrence of all three terms is confident.
- **Diagrams/tables.** Two combinatorial 22-letter grids located (p.139, p.142) — Donnolo's own renditions of the "gates" combinatorial table, distinct from the one the sibling session found at p.85 in the earlier synoptic-commentary section. Recorded at structural depth (existence + layout), not transcribed cell-by-cell.
- **Chapter Six capstone.** p.151 gives a clean, fully-legible formula: *"תלי בעולם כמלך על כסאו, גלגל בגוף כמלך במדינה, לב באדם כמלך במלחמה"* — the Teli/Galgal/Lev ruling-triad, plus a 3/6/12 numerical-synthesis passage and a citation of Sefer Yetzirah's own concluding mishnah (Yeshayahu 57:15), just short of the book's final colophon on p.152 (out of scope, sibling-owned).

## Depth of transcription

Titles, chapter/part headers, colophons, and the highest-value formula passages (articulation, opposite-pairs, olam/shana/nefesh, Teli/Galgal/Lev) are recorded verbatim where legible. The extensive discursive prose — especially Chapter Four's long planetary/astronomical excursus (pp.142–147), which is the least letter/sound-specific material in the batch — is recorded at structural/anchor depth with explicit `unresolved_readings` flags. Nothing was guessed past what was legible at 250dpi; several specific phrases are flagged `UNRESOLVED, FLAGGED NOT GUESSED` for a future higher-zoom pass rather than asserted as diplomatically exact.

## Digital transcription policy

No external/modern digital transcription of Sefer HaChachmoni was used in this pass. Per dispatch, any future digital-transcription alignment is permitted only as a post-hoc aid layered on top of this scan-based reading — the scan remains sole source authority.

## No-write / no-scope-creep confirmation

- No DB write of any kind (no content/schema/RPC/RLS, no Book node, no `research_objects`/`topic_cards`/`nodes`/`edges`).
- No Roadmap/Master edit. No merge. No deploy.
- Only this `.md` file and its companion `.json` register were written, on branch `claude/sefer-yetzirah-deep-pp128-151`, off up-to-date `origin/main`.
- p.126, p.127, p.152 not opened. This file is additive to, and does not edit, the sibling pp.1–152 register.

**handoff_to:** GPT/ZURIEL
