# Resolved Anomalies — Legacy Letters/Numbers Corpus

Items that looked suspicious at some point during the 68/68 close-read (Batch-1 or the final pass) but were **resolved** once tested exhaustively under `gematria_db_first_and_enrich_law` v2 (all ~26 canonical registry methods, plus source-justified spelling/kolel variants). Kept **separate** from `UNRESOLVED_LEDGER.md`/`.json` so a future agent does not reopen them.

Golden calibration precedent (from the v2 law itself, not a new finding here, restated for context): **שאול חי = 1313** — רגיל=355 is a false negative; קדמי/משולש=1313 and משולש גדול=1313 both confirm. First-method failure ≠ claim failure.

---

### R1 — wp13506 (id 1578) — מרכבה = 222
Source text: *"מרכבה — שורש ר.כ.ב = 222"*. The full word מרכבה (רגיל=267) does **not** match; the engine confirms the source's own parenthetical intent — the **3-letter root רכב alone** — reaches רגיל=222 exactly. **Resolved as a root-vs-full-word operand identity**, not a mismatch once the correct operand is used (v2 rule: preserve exact operand identity; the source itself named the root).

### R2 — wp13506 (id 1578) — גיגית = 427 (עם הכולל)
Engine: גיגית רגיל=426. +1 (kolel, explicitly tagged "עם הכולל" by the source) = 427 exactly. **Resolved-with-explicit-kolel**, a standard, source-declared operator, not an error.

### R3 — wp18883 (id 1097) — א"ל ב"ם cipher identity
Hypothesized as a possibly-new 4-letter cipher (א↔ל, ב↔ם). Close reading + engine cross-check prove it is **exactly the registry's existing 22-letter אלבם (Albam)** method: the source's own worked example (וינחם → פשגקב) and its headline claim (אסתר למלך בשם מרדכי, Albam-transformed = 1290) both reproduce **exactly** under `fn_all_methods_full`'s existing אלבם field. **OWNER CHECK for this sub-question = EXTEND_EXISTING** — no new method required.

### R4 — wp18883 (id 1097) — מנצפ"ך final-letter forms
The claimed מנצפ"ך רגיל+גדול=3780 only resolves when the true Unicode sofit-letter forms (ךםןףץ) are used as the operand, not a conventional mixed transliteration. **Resolved as an orthographic/operand identity** issue, not a computational error (רגיל=280 + גדול=3500 = 3780 exactly on the correct operand).

### R5 — wp18883 (id 1097) — לוי יצחק ברדיטשוב = תשפ"א (781)
Only resolves with the source's own no-vav spelling (ברדיטשב, not ברדיטשוב). **Resolved as a spelling variant** the source itself consistently used elsewhere in the same paragraph.

### R6 — wp33149 (id 111) — חורף = 288 (רפ"ח)
The post writes חורף (plene, רגיל=294), which does not match 288. The **defective spelling חרף** (standard alternate Hebrew orthography, not an invented transform) reaches רגיל=288 exactly, matching the post's own repeated 288 = רפ"ח thesis. **Resolved as an orthographic variant.**

### R7 — wp33149 (id 111) — מלחמה ברפיח = משיח בן דוד
רגיל(מלחמה ברפיח)=423, רגיל(משיח בן דוד)=424 — off by 1 without adjustment. The post elsewhere explicitly uses "עם הכולל" for an analogous 2-phrase computation, so +1 kolel is source-justified, not invented. **Resolved-with-kolel.**

### R8 — wp4212 (id 1358) — "מקווה(משולש)בריבוע=477=בעתה"
Originally flagged by the sub-agent as a list-formatting inconsistency (embedded inside a "=776" table while itself stating 477) and left untested. **Resolved in this closure pass**: with the **defective spelling מקוה** (not plene מקווה), both **ריבוע=477** and **משולש מילה=477** match exactly — the source's "(משולש)בריבוע" label maps onto the registry's ריבוע/משולש-מילה methods once the correct (defective) spelling is used. בעתה רגיל=477 is independently confirmed elsewhere in the corpus (Batch-1). **Resolved as an orthographic + method-identification issue**, not a data error — this item is *removed* from the unresolved ledger as a result of this closure pass's exhaustive re-test.

### R9 — wp36103 (id 36) — "נאום ה' = בנימין נתניהו = 683"
Originally flagged unresolved because only רגיל ("נאום יהוה" רגיל=123) had been tested. **Resolved in this closure pass**: "נאום יהוה" reaches **683 exactly via the גדול method** — matching בנימין נתניהו (רגיל=683) precisely. Same pattern as R11 below (unlabeled-גדול).

### R10 — wp36103 (id 36) — 1135-cluster (3 of 5 members)
Of the five phrases the post claims all equal 1135 (קיסר משנה קיסר, הסתכל באוריתא, בנימין נתניהו מלך המשיח, פתח אליהו הנביא זכור לטוב, ביום השמיני[מילוי]): **קיסר משנה קיסר** (רגיל=גדול=1135), **הסתכל באוריתא** (רגיל=גדול=1135), and **ביום השמיני** (מילוי=1135, exactly the method the source named) all **CONFIRM exactly**. The remaining two (בנימין נתניהו מלך המשיח=1136, פתח אליהו הנביא זכור לטוב=888) genuinely fail and remain on the unresolved ledger (L042, L043) — this is a **mixed cluster**, not a wholesale error or a wholesale confirmation.

### R11 — wp36103 (id 36) — Unlabeled-גדול pattern (systemic, resolved structurally)
Several claimed values in this post only resolve via the **גדול** (gadol) method without the source ever naming it: הקטן יהיה (גדול=844, not רגיל=194), בנימן (גדול=802), בנימין (גדול=812), לשרה בן (גדול=1237), ציון במשפט (גדול=1237), נאום יהוה (גדול=683, see R9), קיסר משנה קיסר and הסתכל באוריתא (both גדול=רגיל=1135, see R10). **All resolve exactly once גדול is tried** — this is **methodological opacity in the source material** (the author doesn't label which method he used), not an engine gap. No registry change needed; flagged in `UNRESOLVED_LEDGER.md` §F as a labeling-discipline note only.

### R12 — wp6629 (id 1280) — שכר = 521 (עם הכולל)
Engine: שכר רגיל=520. +1 kolel = 521, matching נתניהו/יהונתן (both independently רגיל=521). **Resolved-with-kolel**, consistent usage elsewhere in the same post.

### R13 — wp3951 (id 1363) — custom "הכפלה" (letter-value squaring) target value
The contributor-defined formula (י²+ה²+ו²+ה²=186) is not itself a registry method, but its **target value is independently confirmed**: מקום רגיל=186 exactly. The "anomaly" here was purely nominal (see `UNRESOLVED_LEDGER.md` §F2, method-label collision with the registry's own, differently-defined, "הכפלה"/hakpala multiplication method) — **not a computational error**.
