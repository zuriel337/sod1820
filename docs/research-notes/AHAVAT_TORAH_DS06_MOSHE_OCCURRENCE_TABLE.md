# אהבת תורה — DS-06 Full Extraction: the "משה" (Moshe) Name-Occurrence Table (PDF pp.69[tail]–70)

> **Status:** Claude, Session 5 (this branch). **Scope:** TASK 2 of the "AHAVAT TORAH · COORDINATED DEEP-RESEARCH CONTINUATION" brief — full extraction of DS-06, previously only partially identified in `AHAVAT_TORAH_DATASETS.json` (Session 3, entry DS-06, pages `[70,71]`, "existence+partial content VISUALLY_VERIFIED... table not fully transcribed").
> **Correction to the Session-3 page range, made explicitly here (not silently):** DS-06 does **not** extend onto PDF p.71. p.71 (both columns, real pages 26/כה, Parashat Tzav → Parashat Shmini) was read in full this session and contains **only discursive derash/chiddushim text, no table**. DS-06's table content is fully contained within **PDF p.70** (both columns), and its data-block actually *starts* on PDF p.70's right column mid-page (following the tail-end of a separate, only-partially-visible prior table — see §4) and *closes* partway down p.70's left column, transitioning directly into ordinary commentary text ("ונרצה לו לכפר עליו...").

## 1. Dataset identity

- **What it is:** a per-parasha occurrence count of the **name משה (Moshe)**, spanning the entire Torah (Shemot through Devarim — Moshe is not a character in Bereshit). This is explicitly framed in the source as a **correction to an earlier authority's count**: R' Mordechai Yoffe's *Levush* / the *Megaleh Amukot* is cited (on Parashat Haazinu) claiming **795 (תקצ"ה)** occurrences of "משה" in the Torah, equal (per that author) to 795 occurrences of "ישראל" — a homiletic gematria-style equivalence. Others are said to have challenged this with a count of **642 (תרמ"ב)**. This book's author states **both are imprecise ("גם הוא לא דק")** and gives his own count: **647 (תרמ"ז)**.
- **Exact opening anchor:** the bold section header **`* פרשת ויקרא.`** on PDF p.70, right column, roughly 60% down the column (visually confirmed, `DS06_p70_RIGHT.png` / `ADV_p70_R_shemottotals.png`), immediately followed by the paragraph beginning **`ויאמר ר' אליו רש"י ז"ל...`** which sets up the count (citing Rashi on the מיעוטים/"only to Moshe, not Aharon" derivation), then the Megaleh-Amukot citation, then the per-parasha breakdown itself.
- **Exact closing anchor:** PDF p.70, left column, the line **`כמשה תרי"ד פעמים משה חוץ כשנם וחוץ משה וחוץ משה:`** (colon-terminated — the book's standard end-of-unit marker), immediately followed by a full paragraph break and the next unit, **`ונרצה` לו לכפר עליו...`** (ordinary derash, not part of this dataset).
- **Section/parasha context:** the table itself is presented as a note under the **Parashat Vayikra** section header, but its *content* is Torah-wide (Shemot→Devarim), not scoped to Vayikra — the header marks where the author chose to insert the digression, not the table's subject-matter scope.

## 2. Full extracted rows

All values SOURCE_LOCATED (read once at 9×–11× zoom on clean crops; the grand total and the Sefer-Shemot block were independently re-verified at a second, higher-zoom pass — `ADV_p70_R_shemotlist2.png` — with consistent results, so those two are upgraded to **VISUALLY_VERIFIED**). Values given as printed-gematria string → face-value decimal.

### 2.1 Grand total (VISUALLY_VERIFIED, cross-confirmed at 2 independent zoom passes)

> **"כי באמת תרמ"ז פעמים משה בתורה"** — "in truth, 647 times [is] Moshe in the Torah."

### 2.2 Sefer שמות (VISUALLY_VERIFIED)

| Parasha | Value (printed) | Decimal |
|---|---|---|
| שמות | ל"ז | 37 |
| וארא | מ"ז | 47 |
| בא | כ"ו | 26 |
| בשלח | מ"ב | 42 |
| יתרו | ל"ח | 38 |
| משפטים | י"ד | 14 |
| תרומה | פעם אחת | 1 |
| **תצוה** | *(not listed — see §3)* | **0 (inferred, not printed)** |
| כי תשא | מ"ם (unusual spelling) | 40 |
| ויקהל | מ' | 40 |
| פקודי | כ"ז | 27 |
| **Σ (as listed, Tetzaveh=0)** | | **312** |
| **Claimed book total (`כספר שמות ... פעמים`)** | ר"ץ | **290** |
| **Δ (Σ − claimed)** | | **+22 — UNRESOLVED, not forced** |

### 2.3 Sefer ויקרא (SOURCE_LOCATED, one clean pass)

| Parasha | Value | Decimal |
|---|---|---|
| ויקרא | ד' | 4 |
| צו | ל"א | 31 |
| שמיני | י"ח | 18 |
| תזריע | ב' | 2 |
| מצורע | נ' | 50 *(flagged §3)* |
| אחרי | ה' | 5 |
| קדושים | כ' | 20 |
| אמור | י"ז | 17 |
| בהר | פעם אחד | 1 |
| בחקתי | נ' | 50 *(flagged §3)* |
| **Σ** | | **198** |
| **Claimed book total** | פ"ו *(read as Vav; a Zayin reading — פ"ז=87 — cannot be excluded, glyph-ambiguous)* | **86 (or 87)** |
| **Δ** | | **+111/+112 — UNRESOLVED, large gap even after the ×10 hypothesis is inapplicable here (these are already small, single/double-digit values — this is a genuine, unexplained source/transcription discrepancy, not a scale issue)** |

### 2.4 Sefer במדבר (SOURCE_LOCATED)

| Parasha | Value | Decimal |
|---|---|---|
| במדבר | כ"ה | 25 |
| נשא | כ"א | 21 |
| בהעלתך | מ"ג | 43 |
| שלח | כ"ד | 24 |
| קרח | שלשים (spelled out) | 30 |
| חקת | כ"ב | 22 |
| בלק | נ' | 50 *(flagged §3)* |
| פנחס | כ"ב | 22 |
| מטות | ל"א | 31 |
| מסעי | י"ב | 12 |
| **Σ** | | **280** |
| **Claimed book total** | רל"ג | **233** |
| **Δ** | | **+47 — UNRESOLVED** |

### 2.5 Sefer דברים (SOURCE_LOCATED — list is visibly non-exhaustive, see §3)

| Parasha | Value | Decimal |
|---|---|---|
| דברים | נ' | 50 *(flagged §3)* |
| ואתחנן | ה' | 5 |
| *(עקב, ראה, שופטים, כי תצא — not listed)* | — | — |
| כי תבוא | ה' | 5 |
| וילך | י"א | 11 |
| האזינו | נ' | 50 *(flagged §3)* |
| וזאת הברכה | י"א | 11 |
| **Σ (of listed parshiot only)** | | **132** |
| **Claimed book total** | ל"ח | **38** |
| **Δ** | | **+94 — UNRESOLVED; see §3 for why this list is treated as intentionally partial, not mis-transcribed** |

### 2.6 Composite breakdown appended after the grand total (SOURCE_LOCATED, flagged UNCERTAIN/interpretive)

Immediately after restating **"הרי תרמ"ז פעמים משה בתורה"** (647), the source appends a breakdown by **grammatical form** of the name, not by parasha:

> `ומהם י"ג פעמים למשה · י"ג פעמים ומשה · ר' פעמים במשה · ובמשה פעם אחד · כמשה תרי"ד פעמים · משה חוץ כשנם וחוץ משה וחוץ משה:`

i.e. (as read): 13× "**ל**משה" (to Moshe), 13× "**ו**משה" (and Moshe), 200(?) × "**ב**משה" (in/with Moshe), 1× "**ו**במשה", 614(?) × "**כ**משה" (like Moshe). **These two largest sub-figures (200 and 614) are arithmetically impossible as sub-components of a 647 total that also needs room for plain "משה"** — flagged explicitly as **UNCERTAIN / INTERNALLY INCONSISTENT, not force-reconciled**. Given this exceeds mechanical transcription into genuine interpretive territory (is "כמשה" being counted as a *different* dataset entirely, e.g. across a wider textual corpus, rather than as a sub-total of the 647?), this sub-breakdown is marked **HANDOFF_TO_GPT** rather than resolved here.

## 3. Open findings / exceptions (mechanical reconciliation only — no interpretation forced)

1. **Every book-level checksum in this table has a real, unforced gap** (Shemot +22, Vayikra +111/112, Bamidbar +47, Devarim +94) — unlike the p.35 letter-table's scale-dependent pattern (§ of the companion closure file), these gaps are **modest in absolute size relative to small per-parasha values**, not order-of-magnitude, so the "thousands-notation" hypothesis from the letter-table does **not** transfer here as an explanation. Root cause across all four: **UNRESOLVED**, most plausibly ordinary digit-level transcription/glyph noise compounding across 8–11 values per book, given the pattern (see next point).
2. **Recurring suspicious "נ' (50)" values**: five separate parshiot across three different books (Vayikra: מצורע, בחקתי; Bamidbar: בלק; Devarim: דברים, האזינו) are each independently read as exactly **50**. Five independent "round 50"s appearing for otherwise-unrelated parshiot is a statistically notable pattern — worth flagging as a candidate systematic misread (e.g. a distinct glyph or column-formatting artifact being decoded as נ every time) rather than five independent coincidences. **Not resolved, not force-corrected — HANDOFF_TO_GPT** as a pattern-level observation better suited to interpretive/cross-corpus review than mechanical re-zooming.
3. **Sefer Devarim's list is visibly partial** (only 6 of Devarim's 11 parshiot are named) with no visual gap or page-break in the source between the printed parshiot — i.e. **this is not a transcription omission, the source itself only names 6 parshiot**. This is thematically plausible (Devarim is narrated by Moshe in the first person, so third-person "משה" may be genuinely rare or absent in the unlisted parshiot), but is recorded as an **open question, not assumed** — the unlisted parshiot's true count (0, or simply un-enumerated by the author) is UNKNOWN.
4. **Parashat Tetzaveh is entirely absent from the Shemot list** (§2.2) — thematically consistent with the well-known fact that Tetzaveh is the one parasha after Moshe's birth that never mentions his name — treated as **plausible 0, not confirmed 0** (UNCERTAIN).

## 4. Adjacent dataset discovered, NOT part of DS-06 — new candidate DS-13 (HANDOFF_TO_GPT, not investigated further)

The top ~40% of PDF p.70's right column (before the `* פרשת ויקרא` header that opens DS-06) contains the **tail end of a separate, previously unregistered table**: a per-parasha occurrence count of the **verb/root עשה** ("did/made") across Parashat Terumah through Pekudei (Sefer Shemot), concluding with an explicit gematria punch-line: **`ותמצא מכוון רמ"ח:`** — "and you will find it comes to exactly 248" — the same number as the traditional **248 positive commandments (רמ"ח מצוות עשה)**, presented as the author's resolution of a counting dispute about how to treat repeated/derivative forms of עשה (אעשה, מעשה, תעשה, etc.). **This table's start (presumably on PDF p.69, unread this session) and full row-by-row content were not examined** — out of scope for Task 2 (DS-06 pp.70–71 only) and explicitly reserved as a **new dataset candidate for a future session**, tentatively numbered **DS-13** pending registration in `AHAVAT_TORAH_DATASETS.json` (not registered in this pass, per the "no schema/DB writes" and "prepare, don't execute Task 3" instructions — this is flagged, not built out).

## 5. Counting-regime / method-family note

DS-06 (name-occurrence-by-parasha) is a **distinct method family** from both: (a) the p.35–41 letter-occurrence-by-parasha table (counts individual **letters**, not names/words), and (b) the "תיבות התורה" word-count summary table (counts **total words** per parasha, not occurrences of one specific word). DS-06 is closer in kind to the newly-discovered DS-13 (§4, also a specific-word/root occurrence count) — **both DS-06 and DS-13 together suggest the book contains a whole sub-genre of "count how many times word/name X appears across the Torah" studies, distinct from the letter-counting and word-counting projects already catalogued.** This generalization is flagged **HANDOFF_TO_GPT** — it is an interpretive/method-family claim, not a transcription fact, and per the task's own division of labor this is GPT's territory, not Claude's to formalize into a contract.
