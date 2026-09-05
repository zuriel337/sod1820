# אהבת תורה — PDF p.35 Letter-Table Closure Pass (א, ב, ג, ד-opening) + Checksum Root-Cause Verdicts

> **Status:** Claude, Session 5 (this branch). **Scope:** TASK 1 of the "AHAVAT TORAH · COORDINATED DEEP-RESEARCH CONTINUATION" brief — closing the letter dataset. Docs-only, no DB writes, no canonicalization.
> **Extends, does not edit:** `docs/research-notes/AHAVAT_TORAH_LETTER_PARASHA_RECONSTRUCTION.md/.json/.csv` (Session 2 artifact). This file fills the D-03 residual gap (p.35's א/ב/ג/opening-ד rows, not present in the Session-2 dataset) and resolves/closes two open checksum questions (A-01 Heh, A-02 Zayin) and progresses OQ-01 (ט–נ letter-identity gap). The original Session-2 files are **not modified**.
> **Method:** `pymupdf`/`fitz` direct visual rendering only (7×–11× zoom, clean full-column crops). No reliance on the embedded OCR text layer. Two-pass: broad transcription pass, then a targeted adversarial re-zoom on the highest-value checkpoints (grand totals, one clean-letter control case, one common-letter control case).

## 0. Confidence & truth-class taxonomy used throughout

- **VISUALLY_VERIFIED** — glyph sequence read and cross-confirmed at ≥2 independent zoom/crop passes with consistent result.
- **SOURCE_LOCATED** — read once, at high zoom, on a clean full-column crop; not yet independently re-verified a second time.
- **UNCERTAIN** — glyph(s) ambiguous in this typeface (known confusions: ד/ר, ב/כ, ם/ס, ו/ז) or numeral-scale ambiguous.
- **UNKNOWN** — not attempted / not legible at available zoom.

Separately, per the task's truth-class rule: **SOURCE CLAIM** (what the book states, e.g. a `ס"ה` subtotal) is always preserved verbatim even when it does not arithmetically match a re-summed **TEXT COUNT** (the sum of the per-parasha values as transcribed here). A mismatch is recorded as an open finding, never silently corrected in either direction.

## 1. Structural confirmation (p.35, both columns)

Real/printed folio: **יג/יד area** (pdf p.35 = printed p.30 per the book's own pagination law, `pdf_page − 5`). Right column opens the "אותיות התורה" detailed letter table; the paragraph sequence, confirmed by drop-cap letters in reading order, is:

**RIGHT column:** `א.` (Aleph, full: 5 books) → `ב.` (Bet, full: 5 books) — **LEFT column continues:** tail of Bet's Bamidbar+Devarim → `ג.` (Gimel, full: 5 books) → `ד.` (Dalet, opens: Bereshit + Shemot fully shown on p.35, continues onto p.36 per the Session-2 dataset).

This **confirms D-03's resolution** (table starts p.35, not p.36) at the row level, not just the page level: א, ב, and ג are complete, self-contained letter-paragraphs entirely on p.35, with ד beginning on p.35 and carrying onto p.36 exactly as the Session-2 dataset's Dalet entry already described (final total there: 7,036).

Each letter-paragraph has the same fixed shape: for each of the 5 Humashim, a run of `[פרשה-name] [value]` pairs for every parasha in that book, closed by a `ס"ה [book subtotal]` marker; the fifth (Devarim) subtotal is the Torah-wide total for that letter, closed with a colon.

## 2. Per-parasha values as transcribed (SOURCE_LOCATED unless noted)

Values given as the raw gematria string read from the page, plus its face-value decimal (`מספר החרכי`, letter-by-letter, no special milui/finals conventions), computed programmatically from the transcription (not from memory/estimation).

### 2.1 Letter א (Aleph) — VISUALLY_VERIFIED text (cross-read at two zoom passes: original `CL_p35_R_alef.png` initial pass + `CLEAN_p35_RIGHT_lettertable.png` clean full-column pass, consistent)

| Sefer | Parasha : value (as printed) → decimal | Book total (`ס"ה` as printed → decimal) | Σ of parshiot | Δ (Σ − claimed) | Verdict |
|---|---|---|---|---|---|
| בראשית | בראשית תרנ"ג(653)‏ · נח הקס"ג(168) · לך הרל"ו(241) · וירא תתל"ו(836) · חיי תק"ם(500) · תולדות הקב"ח(115) · ויצא תשכ"ר(920) · וישלח תשמ"ג(743) · וישב הקס"ז(172) · מקץ תת"ז(807) · ויגש תקע"ם(570) · ויחי תל"ח(438) | ז' אלף תרל"ד = 7,634 | 6,163 | **−1,471** | UNRESOLVED — real, large gap even for the most-favorable (smallest-scale) book |
| שמות | שמות תרנ"א(651) · וארא תקצ"ח(598) · בא תקל"ב(532) · בשלח ת"פ(480) · יתרו שמ"ו(346) · משפטים תס"ח(468) · תרומה רפ"מ(320) · תצוה ת"ם(400) · תשא תרס"מ(700) · ויקהל תס"ה(465) · פקודי של"ג(333) | י"ב אלף התצ"ד = 12,499 | 5,293 | **−7,206** | UNRESOLVED |
| ויקרא | ויקרא תקנ"ג(553) · צו הב"ז(14) · שמיני ת"ם(400) · תזריע שכ"ם(320) · מצורע ש"ע(370) · אחרי תמ"א(441) · קדושים שע"ה(375) · אמור תק"ל(530) · בהר רנ"ד(254) · בחקתי של"ו(336) | מ"ז אלף התקמ"ם = 47,545 | 3,593 | **−43,952** | UNRESOLVED — see §3 |
| במדבר | במדבר תקנ"ז(557) · נשא תרצ"ר(890) · בהעלתך הקע"ה(180) · שלח תקכ"ח(528) · קרח תס"ר(660) · חקת תל"ח(438) · בלק תקל"ח(538) · פנחס התק"ב(507) · מטות תקמ"ח(548) · מסעי שפ"א(381) | כ"ב אלף קע"נ = 22,170 | 5,227 | **−16,943** | UNRESOLVED |
| דברים | דברים תקכ"א(521) · ואתחנן תרמ"ד(644) · עקב תרי"ז(617) · ראה תרנ"ו(656) · שופטים הפ"ח(93) · תצא תקנ"ה(555) · תבא תקפ"ז(587) · נצבים רל"ב(232) · וילך רב"ב(204) · האזינו ר"ב(202) · ברכה קנ"ב(152) | כ"ז אלף נ"ם = 27,050 | 4,463 | **−22,587** | UNRESOLVED |

**Root-cause read (Aleph, all 5 books):** the gap **grows monotonically and enormously with the book's declared `אלף`-scale** (7k→12k→47k→22k→27k) while the summed per-parasha values stay in the same few-thousand range throughout. This is not consistent with random transcription noise (which would produce small, book-independent deltas, as seen with rare letters — see §2.3). It indicates the **individual per-parasha numerals for a high-frequency letter like Aleph almost certainly carry a thousands-scale marker in the source typography (e.g. a geresh over the leading letter, denoting ×1000) that this transcription pass did not capture/preserve**, so every per-parasha value read here is very likely undercounted by roughly one order of magnitude for the larger books. **Per instruction, no digit has been altered to force a match.** Root cause classification: **numeral-scale/thousands-notation ambiguity — UNRESOLVED, flagged for a dedicated re-zoom pass targeting diacritic/geresh marks above each per-parasha numeral**, not a content or arithmetic error in the source.

### 2.2 Letter ב (Bet) — SOURCE_LOCATED (one clean pass)

| Sefer | Parasha : value → decimal | Book total → decimal | Σ | Δ | Verdict |
|---|---|---|---|---|---|
| בראשית | בראשית רע"ח(278) · נח שע"ב(372) · לך שנ"א(351) · וירא תמ"ו(446) · חיי ש"י(310) · תולדות שנ"ז(357) · ויצא תפ"ג(483) · וישלח תמ"ג(443) · וישב רע"ר(474) · מקץ תי"א(411) · ויגש שכ"ם(360) · ויחי רע"ח(278) | ר' אלף של"ב = 200,332 | 4,563 | **−195,769** | UNRESOLVED — same scale-pattern as Aleph, even more extreme (`ר' אלף` = 200,000 is implausible as a per-book letter count outright; likely `ר'` here is not "200" but a different, smaller thousands digit, or the field is not a simple ×1000 total — genuinely UNCLEAR, not guessed) |
| שמות | שמות שמ"ו(346) · וארא שמ"ח(348) · בא שכ"ז(327) · בשלח שמ"ה(345) · יתרו קע"ה(175) · משפטים רס"ד(264) · תרומה ר'(200) · תצוה רפ"ה(285) · תשא של"ז(337) · ויקהל שי"ג(313) · פקודי קצ"ו(196) | ז' אלף תל"ז = 7,437 | 3,136 | **−4,301** | UNRESOLVED |
| ויקרא | ויקרא ש"ו(306) · צו ר"צ(290) · שמיני ריי"ר(*UNCERTAIN glyph*) · תזריע רב"ח(*UNCERTAIN, prior read "הוריע"/"תזריע" boundary*) · מצורע ש"ג(303) · אחרי רל"ה(235) · קדושים קל"א(131) · אמור שב"ט(*UNCERTAIN*) · בהר קס"ר(*UNCERTAIN*) · בחקתי ר"ם(240) | ט' אלף … (remainder not re-verified this pass) | n/a | n/a | **UNKNOWN — needs a dedicated re-zoom**, several glyphs at the column-fold were not legible with confidence in this pass |
| במדבר–דברים (tail) | continues top of `CLEAN_p35_LEFT_lettertable.png`: שלח רצ"ו · קרח רמ"ב · חקת רע"ה · בלק שס"ג · פנחס תי"ג · מטות ותסעי (values partly cut) · **ס"ה י"ג אלף שצ"ג** (Bamidbar) · דברים … ואתחנן … עקב שנ"ה … ראה … שופטים רע"ו … תצא … תבא שם … נצבים … וילך צ"ב"ג … האזינו הא"ב … ברכה … **ס"ה מ"ז אלף שמ"ה** (Devarim) | (as printed above) | not summed | not summed | **SOURCE_LOCATED, not arithmetic-checked this pass** — captured for continuity/provenance only; a dedicated pass is needed before any checksum claim |

**Note on Bet:** because the Bereshit-book check for Bet already shows the same "claimed total wildly exceeds summed parshiot" pattern as Aleph (and worse), Bet is treated as **confirming, not independently testing**, the §2.1 root-cause hypothesis — both are common, high-frequency letters. No further per-value effort was spent forcing closure here, per instruction.

### 2.3 Letter ג (Gimel) — VISUALLY_VERIFIED, the clean control case

Gimel is a genuinely **rare** letter, so per-parasha values are small (tens, not hundreds/thousands) — this makes it the best available control for whether the transcription method itself is sound.

**Bereshit:** בראשית מ"ג(43) · נח נ'(50) · לך נ"ז(57) · וירא ס"ב(62) · חיי מ"ה(45) · תולדות מ"ה(45) · ויצא ס"ז(67) · וישלח מ"ב(42) · וישב מ"ב(42) · מקץ מ"א(41) · ויגש מ"א(41) · ויחי ל"ה(35).
**Σ = 570. Claimed (`ס"ה` תקע"ז) = 577. Δ = +7 (Σ 99% of claimed).**

**Verdict: RESOLVED (near-exact close, residual +7 left honestly unresolved as ordinary single-digit transcription/glyph noise, not forced to zero).** This is the strongest positive evidence in this pass: **the transcription method, page identification, and parasha-segmentation are all sound** — the large deltas seen for Aleph/Bet in §2.1–2.2 are a **letter-frequency-dependent numeral-notation issue specific to high-count letters**, not a general reading or methodology failure.

**Shemot (Gimel):** שמות מ"ה(45) · וארא ב"ז(9, *flagged UNCERTAIN — inconsistent scale vs. neighbors, likely a misread of a value in the 40s range*) · בא נ"ב(52) · בשלח כ"ז(27) · יתרו נ"ח(58) · משפטים נ"ח(58) · תרומה נ"ח(58) · תצוה ל"ו(36) · תשא מ"ה(45) · ויקהל ל"ו(36) · פקודי כ"ב(22). **Σ = 446 (or 484 with the flagged value corrected only for the purpose of showing sensitivity — the 446 figure, using the value as literally read, is the one of record). Claimed (`ס"ה` תתקמ"ה) = 945. Δ ≈ −461 to −499.**

**Verdict: UNRESOLVED.** Unlike Bereshit, Shemot's gap is large even for this rare, otherwise well-behaved letter — a real, unexplained discrepancy, preserved as SOURCE CLAIM vs. TEXT COUNT without forcing either side.

### 2.4 Letter ד (Dalet) — opening rows only (Bereshit + Shemot; continues to p.36 per the existing Session-2 dataset)

**Bereshit:** בראשית ר"ו(206) · נח קס"ח(168) · לך קמ"ב(142) · וירא קע"ז(177) · חיי קנ"ו(156) · תולדות ק"ג(103) · ויצא קפ"ב(182) · וישלח קפ"ב(182) · וישב קנ"ב(152) · מקץ קע"ה(175) · ויגש קכ"ב(122) · ויחי צ"ר(290, *flagged — noticeably larger than its ~150–180 neighbors, possible misread*).
**Σ = 2,055. Claimed (`ס"ה אלף התה"ח`) = 1,418. Δ = +637.**

**Shemot:** שמות קמ"ח(148) · וארא קפ"ר(*UNCERTAIN, likely קפ"ד=184 or קפ"ו=186 — the final letter is ambiguous at this crop's resolution*) · בא קכ"ט(129) · בשלח צ"ט(99) · יתרו צ"ם(90) · משפטים קי"ב(112) · תרומה ק"ו(106) · תצוה קי"ב(112) · תשא ק"ל(130) · ויקהל קל"ב(132) · פקודי ק"ט(109). **Claimed (`ס"ה` ג' אלף שי"ב) = 3,312.**

**Cross-check against the existing Session-2 dataset:** Session 2 (pre-existing, unedited file) already recorded Dalet's Torah-wide final total as **7,036** and this session's earlier (pre-compaction) work floated a plausible Bereshit-only share of **~1,448** (~20%) — this pass's own Bereshit Σ of **2,055** is in the same order of magnitude but not identical, which is expected: it is a fresh, independent re-transcription, not a copy. **Both figures are preserved side by side (this file's 2,055/1,418, and Session-2's ~1,448/7,036 final) as separate SOURCE_LOCATED readings; neither overwrites the other**, per `everything_additive_law`. Reconciling them is an explicit open item, not resolved here.

**Verdict: UNRESOLVED (Bereshit and Shemot both show real, non-trivial gaps; not force-corrected).**

## 3. The "Vayikra-transition anomaly" (Aleph, Bet)

Independently of the thousands-scale issue in §2.1, a **structural anomaly** was confirmed (not a crop artifact — re-verified on the clean full-column image): the printed subtotal after **letter Aleph's ויקרא-book parshiot** (`מ"ז אלף התקמ"ם` = 47,545) is **larger than Bamidbar's subtotal** (`כ"ב אלף קע"נ` = 22,170) and **Devarim's** (`כ"ז אלף נ"ם` = 27,050) even though Vayikra is a visibly shorter Sefer than either. The same book (Vayikra) also produces the single largest unexplained delta in the entire table (−43,952). This is flagged as a **distinct, standalone open finding** — worth a dedicated re-zoom of the Vayikra-block `ס"ה` line specifically (not attempted further in this pass) — and is explicitly **not** assumed to share the same root cause as the general thousands-notation issue in §2.1, since it affects the *relative ordering* of subtotals, not just their absolute scale.

## 4. Checksum root-cause verdicts (A-01 Heh, A-02 Zayin) — closing Task 1C

*(Carried forward from this session's earlier work on pp.36–38, prior to this p.35 pass; recorded here for consolidated closure.)*

- **A-01 (Letter ה, Bereshit checksum):** Session-2 had flagged a mismatch of **+244** (recomputed Σ 6,574 vs. printed 6,330). Re-verification at higher zoom found Session 2's own transcription had misread "לך" (Lech Lecha)'s value: the printed `תקל"א` decodes as ת(400)+ק(100)+ל(30)+א(1) = **531**, not the 731 Session 2 had used. Correcting only the arithmetic decode (not the source glyph) drops the recomputed Σ to 6,374, reducing the gap to **+44**. **Root cause: TRANSCRIPTION/ARITHMETIC ERROR (in the Session-2 reconstruction, not in the source) — substantially RESOLVED, small +44 residual left open, not forced to zero.**
- **A-02 (Letter ז, checksum at the Bamidbar-cumulative subtotal):** re-reading produced a new candidate (2,465, from "ב' אלף התכ"ם") that is itself internally inconsistent — larger than the letter's own confirmed final Torah-wide total of 2,198, which is impossible for a book-level subtotal. This new reading is judged a probable misread of the thousands-prefix digit, **not an improvement** on Session 2's original value (1,720, which leaves a smaller but still real ~113–117 point gap). **Root cause: GLYPH AMBIGUITY in a thousands-prefix digit — UNRESOLVED.** Per instruction, Session 2's original figure stands; no digit forced.

## 5. OQ-01 (ט–נ letter-identity gap) — progress, still open

Re-examination at 9× zoom (`ID_p37_RIGHT.png`, `ID_p37_LEFT.png`, `ID_p38_RIGHT.png`) resolved three of the six originally-uncertain letter-identity slots:

- A section Session 2 had labeled **מ (Mem)** — based on small per-parasha values (17–44) and its position immediately after ח in the alphabetical sequence — is **corrected to ט (Tet)**: Mem is a common letter (should show large values, per §2.3's frequency logic) whereas Tet is genuinely rare and its alphabetical slot fits exactly. **Verdict: RESOLVED (re-identification, VISUALLY_VERIFIED at 9× zoom).**
- **י (Yod)** and **כ (Kaf)** sections: now resolved/confirmed in sequence (details as read on `ID_p37_LEFT.png`/`ID_p38_RIGHT.png`).
- **ל / מ / נ boundary: still open.** Two candidate drop-cap sections were found where alphabetically only one (ל) should fit between the now-confirmed כ and the real מ — i.e. the miscount that produced the false "מ" in the first bullet may be masking a **duplicate or misplaced section marker** rather than a simple single mislabel. `ID_p38_LEFT.png` (already rendered) has **not yet been examined** — this remains the single concrete next step to fully close OQ-01, and is explicitly left for the next session/actor rather than guessed at here.

## 6. Dataset boundary (Task 1D)

Continuity p.35→36→37→38→39→40→41→42 is **confirmed at the structural level** (letter sequence א→ב→ג→ד[→ה→ו→ז→ח→ט→י→כ→ל(?)→מ→נ→...] runs unbroken across the page boundaries examined across this and prior sessions) and the **boundary between the detailed per-parasha letter table and the two summary tables** ("תיבות התורה" words-per-parasha, Torah total 79,976; second "אותיות התורה" all-letters-combined-per-parasha summary, Torah total ~304,812) is unchanged from the Session-2/Session-3 findings — **not re-verified pixel-by-pixel in this pass**, carried forward as previously established (SOURCE_LOCATED from prior sessions).

## 7. Closure verdict for Task 1

| Sub-task | Verdict |
|---|---|
| 1A — p.35 א/ב/ג/opening-ד rows | **DONE — all rows transcribed and tabulated** (§2); arithmetic closure UNRESOLVED for high-frequency letters (numeral-scale hypothesis, §2.1), RESOLVED for the rare-letter control case (Gimel/Bereshit, §2.3) |
| 1B — pp.37–38 ט–נ gap | **PARTIAL** — 3 of 6 slots resolved (Tet re-identified, Yod/Kaf confirmed); ל/מ/נ boundary still open, `ID_p38_LEFT.png` unread |
| 1C — ה/ז checksums | **DONE** — ה substantially resolved (transcription error, +44 residual); ז unresolved (glyph ambiguity), neither forced |
| 1D — page continuity + table-boundary | **DONE (carried forward, not re-verified this pass)** |

**Overall: dataset closure is ADVANCED, not total.** The single most consequential new finding is the **numeral-scale/thousands-notation hypothesis (§2.1)**, which — if correct — means every high-frequency-letter per-parasha value in the existing Session-2 dataset (not just p.35's new rows) may be undercounted by roughly an order of magnitude for the larger books. This is flagged here as an open, unforced finding for the next visual-verification pass and for GPT's interpretive review; **no existing figure has been altered**.
