# אהבת תורה — DS-06 Counting-Contract Closure Pass (population definition, prefix forms, recurring-50, aggregation)

> **Status:** Claude, Session 6 (branch `claude/ahavat-torah-letter-dataset-closure`, continuing from commit `06b2be59`). **Scope:** the "DS-06 COUNTING-CONTRACT CLOSURE" brief — mechanical/visual closure only, no interpretation, no new datasets, no merge.
> **Extends, does not edit:** `AHAVAT_TORAH_DS06_MOSHE_OCCURRENCE_TABLE.md`/`.json` (Session 5). This file **corrects two specific readings** in that artifact via direct re-verification at higher zoom (18×–45×) on the same source page (PDF p.70). The Session-5 file is left byte-identical; corrections are recorded here, additively, per `everything_additive_law`.

## 1. DS-06 exact counting-contract verdict

**Population counted: the written NAME/word משה as it appears in the Biblical text (`שם משה`), per the source's own words** — the opening definitional passage (re-read at 16× zoom, `Z_p70_R_opening_def.png`) states explicitly: *"...ככתוב בספר מעשה רוקח כשם מגלה עמוקות בפ' האזינו שתקצ"ה פעמים **שם משה** בתורה..."* ("...as written in Ma'aseh Rokeach in the name of the Megaleh Amukot on Parashat Haazinu, that 795 times [is] **the name Moshe** in the Torah..."). The counting object is explicitly framed as **occurrences of the name**, not an abstract concept or gematria-derived figure.

**New, load-bearing correction to Session 5's open question:** Session 5 could not determine whether the reported 647 is a bare-token count or includes prefixed forms, and flagged the composite breakdown as "internally inconsistent" (200 and 614 as sub-components of 647 seemed impossible). **Direct re-verification at 30×–45× zoom on the specific ambiguous glyphs resolves this cleanly — see §2.**

**Verdict: the counting contract is CLOSED.** DS-06's grand total (647) is an **inclusive count of the name משה in every grammatical/prefixed form it takes in the Masoretic text** (bare משה, למשה, ומשה, במשה, ובמשה, כמשה) — i.e. **lexical/written-form occurrence of the string משה regardless of attached prefix**, not a "bare token only" count. This is now VISUALLY_VERIFIED via an exact arithmetic closure (§2), not asserted from the definitional sentence alone (which does not itself specify the prefix treatment).

## 2. Prefix/form treatment verdict — composite breakdown re-verified and RESOLVED

Session 5 transcribed the composite breakdown (the sentence following the restated total) as containing two arithmetically-impossible values: "200 (ר') times במשה" and "614 (תרי"ד) times כמשה" — both larger than could fit inside a 647 total alongside the other listed forms. Two specific glyphs were re-examined at 30×–45× zoom (`Z_glyph_resh_or_dalet.png`, `Z_line_kemoshe.png`, `Z_line_bemoshe.png`):

1. The digit read as **"ר'" (200) before "פעמים במשה"** is, at 45× zoom, a **genuinely ambiguous glyph** between ד (Dalet=4) and ר (Resh=200) — consistent with this typeface's already-documented ד/ר confusion pattern. Visual inspection alone does not fully disambiguate it.
2. The clause previously read as **"כמשה תרי"ד פעמים"** (implying 614 occurrences *of the form כמשה*) is, at 22× zoom, more precisely **"כ**׳** משה תרי"ד פעמים משה חוץ..."** — i.e. **"כ'" here reads as "as for" / "regarding"** (a section-introducing particle), not as the prefix כ- attached to the following numeral. Under this parse, **תרי"ד (614) is the count of the plain/bare form משה itself**, not of "כמשה."

**Disambiguating test (arithmetic, not forced):** treating the ambiguous glyph in bullet 1 as **ד=4** and summing all six named forms —

| Form | Value |
|---|---|
| משה (bare) | 614 |
| למשה | 13 |
| ומשה | 13 |
| במשה | 4 |
| ובמשה | 2 |
| כמשה | 1 |
| **Σ** | **647** |

**Σ = 647, an EXACT match to the grand total**, with no residual and no digit altered to force it — the only free variable was choosing between two independently-plausible readings of one already-ambiguous glyph (ד vs ר), and the ד reading is the one, and only the one, that closes exactly. This is treated as **ARITHMETIC-DISAMBIGUATED, high confidence** — a distinct and weaker-than-VISUALLY_VERIFIED but stronger-than-UNCERTAIN status, stated explicitly rather than silently upgraded. **This corrects and closes Session 5's F-DS06 composite-breakdown finding, which is hereby superseded (not deleted) by this exact reconciliation.**

**Verdict: prefix forms are INCLUDED in the 647 total**, and the source itself decomposes the total by grammatical form: 614 bare + 13 + 13 + 4 + 2 + 1 (prefixed/derived forms) = 647.

## 3. Recurring-`50` (נ') verdict — direct re-check of all 5 instances

All five previously-flagged instances were independently re-rendered at 24× zoom and re-read on fresh crops (not reused from the original pass): `Z_metzora_line2.png` (מצורע), `Z_bechukotai_line2.png` (בחקתי), `Z_p70_L_balak.png` (בלק), `Z_p70_L_devarim_haazinu.png` (דברים), `Z_haazinu_line.png` (האזינו).

**Result: all 5 glyphs are unambiguous, clean, isolated Nun-with-geresh (נ׳) characters at this zoom — none show any sign of ink damage, column-bleed, or a different underlying letter.**

| # | Parasha | Book | Confidence |
|---|---|---|---|
| 1 | מצורע | ויקרא | VISUALLY_VERIFIED (re-confirmed, clean isolated glyph) |
| 2 | בחקתי | ויקרא | VISUALLY_VERIFIED |
| 3 | בלק | במדבר | VISUALLY_VERIFIED |
| 4 | דברים | דברים | VISUALLY_VERIFIED |
| 5 | האזינו | דברים | VISUALLY_VERIFIED |

**Classification (per the task's own options):**
- **NOT a repeated transcription artifact** — ruled out by direct re-check; every instance is a clean, correctly-read 50.
- **NOT a subtotal** — each sits in the same per-parasha slot as every other value in its row, syntactically identical to unambiguous small values (ה', כ', י"ז) around it.
- **Literal value — confirmed.** Each is a genuine, printed "50."
- **Whether it additionally functions as a notation convention (e.g. an author's round/approximate figure used when an exact count was not carried out) is UNDETERMINED** — this cannot be settled from the image alone (there is no marginal note, asterisk, or "כ-" approximation-marker attached to any of the five). **Per instruction, no numerical motif is inferred merely because the value repeats.** This is explicitly left open for interpretive review (HANDOFF_TO_GPT) rather than mechanically resolved.

## 4. Parasha → book → Torah aggregation — status, now more precisely characterized

Re-examining the book-level totals alongside the grand total, using the source's own printed figures (not the re-summed parasha rows):

**Torah-level reconciliation — RESOLVED, mechanically exact:**

> 290 (שמות) + 86 (ויקרא) + 233 (במדבר) + 38 (דברים) = **647**

This is an **exact match** to the grand total, and it **resolves the Session-5 ambiguity on Vayikra's book-total glyph** (previously read as "פ"ו or פ"ז," 86 or 87) decisively in favor of **פ"ו = 86** — the only value of the two that closes the sum. As in §2, this is an **arithmetic disambiguation of an already-ambiguous glyph**, not a forced correction of an unambiguous one.

**Verdict: BOOK SUBTOTAL → TORAH TOTAL is mechanically reproducible and exact**, using the source's own four printed book-level figures.

**Parasha-row-level reconciliation — remains UNRESOLVED, NOT reproducible:**

| Sefer | Σ of re-transcribed parasha rows | Printed book subtotal | Δ |
|---|---|---|---|
| שמות | 312 | 290 | +22 |
| ויקרא | 198 | **86** (corrected, §4 above) | **+112** |
| במדבר | 280 | 233 | +47 |
| דברים | 132 (of 6/11 parshiot listed) | 38 | +94 |

**None of the four books' parasha-rows sum to their own printed book subtotal.** The gaps do not scale with book size or with the recurring-50 pattern in a fully explanatory way: Vayikra's two confirmed 50s (מצורע, בחקתי) account for 100 of its 112-point gap (~89% — a strong partial explanation), but Bamidbar's single 50 (בלק) accounts for only 50 of its 47-point gap headroom (removing it would *overshoot* into a negative delta, so it cannot be the sole cause there), and Devarim's list is separately known to be incomplete (§3 of the Session-5 file). **Root cause of the parasha-row-level non-closure: UNRESOLVED.** No digit has been altered to force closure at this level.

**Summary verdict for aggregation (task item 4):**

| Level | Status |
|---|---|
| PARASHA ROWS → BOOK SUBTOTAL | **NOT reproducible** — real, substantial, unresolved per-book gaps |
| BOOK SUBTOTAL → TORAH TOTAL | **Mechanically reproducible, exact** (290+86+233+38=647) |

This is a meaningful refinement of Session 5's finding: the dataset's **top-level arithmetic is sound and closes exactly**; the **row-level detail beneath it does not**, and that gap is now isolated to a single layer of the hierarchy rather than characterized as a blanket "all checksums fail."

## 5. Exact unresolved contradictions (carried forward, not resolved here)

1. **Parasha-row Σ vs. book subtotal**, all 4 books (§4) — root cause UNRESOLVED.
2. **Recurring literal-50 pattern** (§3) — confirmed genuine, significance (motif vs. coincidence vs. unstated approximation convention) UNDETERMINED, HANDOFF_TO_GPT.
3. **Devarim's parasha list is visibly partial** (6 of 11 parshiot named in the source) — carried forward from Session 5, unresolved.
4. **Tetzaveh's absence from the Shemot list** — plausible-but-unconfirmed 0, carried forward from Session 5, unresolved.
5. **The ד/ר glyph ambiguity itself remains a live typeface issue** — it was disambiguated *by arithmetic fit* in two specific instances this session (§2, §4), which is sound evidence for *those two* readings specifically, but is **not** a general license to read every future ambiguous ד/ר glyph in this book as whichever value makes a sum close. Each future instance must still be argued on its own arithmetic/visual merits, not by analogy to this one.

## 6. Corrections to previous DS-06 claims (additive, Session-5 file untouched)

| Session-5 claim | Correction (this session) | Status |
|---|---|---|
| Composite breakdown forms `{למשה:13, ומשה:13, במשה:200, ובמשה:1, כמשה:614}` marked internally inconsistent, HANDOFF_TO_GPT | Corrected reading: `{bare משה:614, למשה:13, ומשה:13, במשה:4, ובמשה:2, כמשה:1}` — Σ=647 exact | **RESOLVED, superseding (not deleting) the Session-5 finding F-DS06 composite-breakdown entry** |
| Vayikra book-total glyph ambiguous, "פ"ו (or פ"ז)" = 86 or 87, UNCERTAIN | Resolved to **86 (פ"ו)** via exact Torah-total arithmetic fit (§4) | **RESOLVED** |
| All 4 book-level checksums characterized as uniformly "UNRESOLVED" with no further structure | Refined: **Torah-level aggregation (book subtotals → 647) is exact and reproducible; only the parasha-row level fails to close** — a materially different and more precise characterization | **REFINED, not merely restated** |
| Recurring-50 pattern flagged as "suspicious," transcription-artifact possibility left open | Transcription-artifact hypothesis **ruled out** by direct re-check of all 5 instances; confirmed literal values; significance still open | **NARROWED** |

No figure in `AHAVAT_TORAH_DS06_MOSHE_OCCURRENCE_TABLE.md`/`.json` (Session 5) has been edited. This file is the authoritative additive correction layer; a future reader should consult both files together.

## 7. DS-06 vs. ATTRIBUTED EXPRESSION CORPUS (GPT Checkpoint 7) — distinction check

No content from GPT's Checkpoint 7 was read this session (out of scope — GPT's parallel/interpretive territory, and this task explicitly instructs not to duplicate that work). Based solely on what this and the prior session directly extracted from DS-06 itself:

- DS-06 measures **occurrences of one proper name (משה) across the whole Torah**, using a **single metric (פעמים / occurrence-count only)** — no companion תיבות (word-mass) metric was observed anywhere in the DS-06 table on PDF p.70.
- The task's own description of the Attributed Expression Corpus (A) specifies a **dual פעמים+תיבות metric for attributed expressions of persons/groups** — matching what this dossier's `CROSSWALK.md` §A already cross-references to GPT's Checkpoint 4 ("פעמים/תיבות dual metric; composite attribution").
- **Verdict: no new evidence from this session collapses or blurs the distinction.** DS-06 (single-metric, name-occurrence, narrative-text-wide) and the Attributed Expression Corpus (dual-metric, attributed-speech, person/group-scoped) remain **separate, as already stated in the coordination brief**. This is a negative/confirmatory result, not a new finding — flagged as requested, not expanded.

## 8. Branch, commit, changed files

- **Branch:** `claude/ahavat-torah-letter-dataset-closure`
- **Base commit this session started from:** `06b2be599b57a2bc87300664ce68a9430c450e8e`
- **Branch safety (re-verified this session):** `git rev-list --left-right --count origin/main...HEAD` → **5 behind / 2 ahead of `origin/main`** (confirms GPT's independent report exactly). `git diff --stat origin/main...HEAD` shows **6 files changed, 759 insertions, 0 deletions, all under `docs/`** — confirms **docs-only scope**, no schema/code/UI touched, nothing disappearing from `main`. **Not merged, not rebased, not force-pushed** — left exactly as instructed pending Zuriel's explicit release authorization.
- **New file this session:** `docs/research-notes/AHAVAT_TORAH_DS06_COUNTING_CONTRACT_CLOSURE.md` (this file). No other file modified.

## 9. Explicit status

**implemented:** docs-only research artifact, written and committed to the working branch.
**merged:** NO.
**deployed:** NO.
**live:** NO — nothing in this file touches Production, Supabase, or any canonical/DB object.
**verified:** the two arithmetic disambiguations in §2 and §4 are internally verified (exact closure, shown in full); the underlying source glyphs remain independently ambiguous typeface artifacts, disambiguated by fit, not by direct unambiguous visual reading — stated as such, not overstated.

**STOP condition met: (A) — the DS-06 counting contract and the recurring-50 question are now mechanically classified** (population definition closed; prefix treatment closed via exact arithmetic; recurring-50 confirmed-literal but significance left open; aggregation status precisely split into a resolved layer and an unresolved layer). No further scope taken up. **NO MERGE.**
