# Old-vs-New Discrepancy Report — Scan B Corrective Re-transcription

Scope: PDF pages 30, 31, 32, 34, 35, 38 only (per `work_log` dispatch, following the witness-structure-audit finding, `work_log.id b6cc2d66`).
Old artifacts: `research/sefer-habahir-1883/scan-b/pages/pNN.json` on branch `claude/sefer-habahir-second-half-0lbg2i` @ commit `9b215c66` (left untouched).
New artifacts: `research/sefer-habahir-1883/scan-b-corrective/pages/pNN.json` on this branch, produced by independent single-page reads (no batching), per-page 220dpi full render + targeted 400dpi crops.

## Per-page verdict

| PDF page | Old artifact's actual content | This page's true content | Verdict |
|---|---|---|---|
| **30** | Verbatim = PDF page 34's true content (Marah/Elim discourse) | Two king/princess parables (Chochmah-as-distant-princess; the adjoining, separately-watered field) + a full-width "מט" discourse equating kavod/lev via Deut 4:24 and the Amalek war | Old content **entirely replaced** with page 30's own, previously-uncaptured content. |
| **31** | Not a match for any single neighboring page; closest thematic overlap (Jeremiah 1:14, "mitzafon tiftach ha-ra'ah") with page 35's true content, but not verbatim -- most likely a paraphrase/reconstruction rather than a direct read | The chesed/pachad/emet-as-shalom chain continuing into a discourse on the letter Aleph, the Ten Utterances of creation, and the Throne of Glory/World-to-Come (section "נ") | Old content **entirely replaced**; this page's real content was previously wholly uncaptured. |
| **32** | Verbatim duplicate of PDF page 36's true content (Exodus 15:26 healing discourse) | R. Yochanan's "two great lights" teaching, the hidden primordial light (or ha-ganuz), its distillation into the 32 Paths of Wisdom, and a discourse on Proverbs 6:23 / "chevyon uzo" / the three crowns | Old content **entirely replaced**; this is the clearest case of the original duplication-authoring error. |
| **34** | Direction-diagram page content (the running text that genuinely belongs to PDF page 38) | R. Berechiah's "Olam Ha-Ba as primordial light" discourse (section "נב") + the Marah episode / king's-daughter parable opening | Old content **relocated, not lost**: it was the correct reading of a *different* page (38), now corrected there too. This page's own true content is confirmed to match what the original session had (by cross-file accident) filed under old `p30.json`. |
| **35** | Verbatim duplicate of PDF page 33's true content ("shemini... tzaddik yesod olam") | The "North = the attribute of evil" discourse (Jeremiah 1:14, Genesis 8:21) + the Elim/70-palms numerology (section "נה") + the closing king's-servants/treasuries parable identifying the rebellious servant as the yetzer hara | Old content **entirely replaced**. Notably, the closing parable on this page is what the original session had (correctly in substance, wrongly filed) placed under old `p31.json` -- see below. |
| **38** | A distorted paraphrase/echo of PDF page 37's content (not verbatim, not this page's own content) | The 4-intercardinal-direction diagram (confirmed) + a Yesod/Sabbath discourse (Exodus 20:8, Deuteronomy 5:12) + the king-and-his-betrothed / king's-sons-bread parables | Old content **entirely replaced**; the diagram identification is now correctly anchored to its own running text instead of being paired with page 34's text. |

## A secondary finding surfaced during correction: old `p31.json`'s content was not pure fabrication

While confirming page 35's true content, this corrective pass found that old (faulty) `p31.json`'s closing material -- a king with treasury-steward parable ("בעולם שר אחד שממונה על כל אוצרות מאכל...") -- is **not** invented. It is a near-verbatim match for the **bottom section of PDF page 35's true content** (the "yetzer hara as steward" parable, section "נד", which continues onto PDF page 36). The original session appears to have read this passage correctly at some point but filed it under the wrong page number (31 instead of 35/36) and, per the audit, apparently truncated or blended it with other material. This is recorded here as a data point on the error's nature: not every old-artifact content string was hallucinated from scratch -- some are real passages misfiled by page number, which is consistent with the "4-page-batch attribution mixup" root-cause hypothesis in `witness-structure-audit/scan_b_reliability_audit.json`, rather than a vision/legibility failure.

## What did NOT change

- Old `pages/p30.json`, `p31.json`, `p32.json`, `p34.json`, `p35.json`, `p38.json` on `claude/sefer-habahir-second-half-0lbg2i` remain exactly as committed. They are superseded in effect by the pages in this directory, but not edited, deleted, or overwritten, per `everything_additive_law` and this task's explicit "do not trust or patch incrementally" instruction.
- PDF pages 1-24 (SCAN_A's territory): not opened, not touched.
- PDF pages 25-29, 33, 36, 37, 39-48: not opened, not touched, not re-verified in this pass (they were already independently confirmed accurate in `witness-structure-audit/scan_b_reliability_audit.json`).

## Updated Scan B reliability status

With this corrective batch, **all 24 PDF pages in Scan B's assigned range (25-48) now have independently-verified, page-matching content**:
- 18 pages verified accurate in the witness-structure-audit pass (25-29, 33, 36, 37, 39-48).
- 6 pages corrected in this pass (30, 31, 32, 34, 35, 38), each read in isolation with no batching, each cross-checked against its own page image before any comparison to the old (faulty) artifact.

**Scan B reaches 24/24 reliable pages once the corrective pages in this directory are treated as authoritative for 30/31/32/34/35/38, superseding (not replacing on disk) the corresponding files on `claude/sefer-habahir-second-half-0lbg2i`.** A follow-up integration step (outside this task's scope) would formally merge/supersede those 6 files; this task deliberately stops short of that per its READ/CORRECT-ONLY, no-merge mandate.

## Updated aggregate counts (corrective batch only, pages 30/31/32/34/35/38)

See `coverage.json`. Total corrected input characters: 16,641. Total unresolved-reading items in the corrective batch: 30 (see `unresolved.md`). None of the corrective batch's candidate relations, findings, or extractions have been promoted to canonical status.
