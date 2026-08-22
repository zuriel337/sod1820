# SOD1820 — METHODS EXPANSION · PHASE 1
Candidate Method Resolution: ר"ת (רת) · ס"ת (סת) · רגיל ישר והפוך. READ-ONLY throughout — 0 writes, 0 `gematria_methods` changes, 0 migrations, 0 UI, 0 parser production, 0 deploy, no hard-coded method count.

---

## 0. GOVERNANCE

Live-verified before any conclusion: `gematria_methods where active=true and function is not null` = **13** (unchanged since Phases 1–5). Read the locked `method_lifecycle` rule (DB `nodes`, rule_id=`method_lifecycle`) — it independently defines the **exact same** lifecycle this task specifies (`known → reconstructed → candidate → verified → canonical`), and explicitly **permits** testing a fixed, deterministic, input-independent whitelist transformation ("Method Reconstruction חזק אך חסום... שיטה חוקית=דטרמיניסטית, מבוססת-ערכי-אותיות, כלל קבוע") while forbidding free-form/target-seeking search. This governs the one hypothesis tested below: the standard dictionary meaning of ר"ת (ראשי תיבות = first letter of each word) and ס"ת (סופי תיבות = last letter of each word) — not an invented guess, but the term's own conventional definition, tested exactly once per candidate, run through the unchanged live engine, never brute-forced across variants. No dedicated `method_reconstruction_attempts`-style table exists in the DB (checked live) — prior attempts are tracked only in `METHOD_CANDIDATES_RESOLVED.csv` and `work_log`; that CSV's own prior finding (רגיל/מילוי/אתבש/קדמי on "צמח דוד"/"צמח דויד" don't hit 644) is reused as FACT, not recomputed.

Worked from already-documented candidates only (`METHOD_CANDIDATES_RESOLVED.csv`, `METHOD_MENTIONS_CLASSIFIED.csv`, `METHOD_CLAIMS_PHASE3.csv`) — no new discovery pass over the corpus for new method names, per instruction §1's explicit boundary. `METHOD_EXPANSION_CANDIDATES.csv` does not exist in the workspace (checked) — nothing to reconcile against.

---

## SCOPE CONFIRMED

- **ר"ת (רת): 18 rows** (`candidate_labels` = `רת` or `סת|רת`), extracted from `METHOD_MENTIONS_CLASSIFIED.csv`.
- **ס"ת (סת): 18 rows** (`candidate_labels` = `סת` or `סת|רת`).
- **רגיל ישר והפוך: 3 rows** (`candidate_labels` = `רגיל ישר והפוך` or `ישר והפוך`).
- No candidate beyond these three appears in the prior findings — none added.

---

## FACT / INFERENCE / RECOMMENDATION / HUMAN-GATE — per candidate

### A. ר"ת (רת) — 18 rows

**FACT:**
- 6 of 18 rows reference "צמח דוד"/"צמח דויד" (both spellings, spelling-invariant), and among those, **3 rows carry the exact same claimed value 644**, 2 carry no value at all, 1 carries the phrase-plus-644 with the value positioned before rather than after the tag.
- Live-tested the standard ר"ת definition (first Hebrew letter of every word, concatenated, run through all 13 live methods) against every ר"ת row that has both a clean expression and a numeric claimed value (6 of 18 qualify; the other 12 either have no claimed_value, or the claimed_value is embedded in a multi-tag phrase not cleanly attributable to ר"ת specifically):
  - **"צמח דוד" / "צמח דויד" → acronym "צד" → all 13 method values: {אטבח:16, אלבם:67, אתבש:105, גדול:94, קדמי:505, רגיל:94, מילוי:538, מסתתר:86, ריבוע:184, סידורי:22, משולש גדול:505, אותיות אחרי:105, אותיות לפני:83}. None equal 644.** This directly reconfirms, via a *different* tested hypothesis, the prior file's finding that 644 is unexplained by any live-engine computation on this phrase.
  - **"אני אהיה לו לאב... לך צמח דוד מכי ליהוה המלוכה" (id `18207155`) → acronym "אאללוילללצדמלה" (14 letters) → רגיל = 337 AND גדול = 337.** The row's claimed value is exactly **337**. This is a genuine, exact, live-engine-verified match to the standard ר"ת hypothesis.
  - The remaining 4 testable rows ("אשרי המחכה ל"→1335, "מתי אתגלה ב22"→12, "שנת ביאת המשיח האחרון"→1212, "כה אמר יהוה..."→1400) **do not match** any of the 13 method values of their respective ר"ת-acronyms (closest: the long "כה אמר יהוה" verse gives רגיל/גדול=1434 against a claimed 1400 — a 34-point miss, not exact).
- **Net: 1 of 6 testable rows (16.7%) fits the standard ר"ת hypothesis exactly; the strongest, most internally-consistent cluster in the whole label (644 / צמח דוד, 6 occurrences) is explicitly NOT explained by it.**

**INFERENCE:**
- Per §7's own rule ("a method is not verified just because it hits one example"), the 337-match is **plausible but unconfirmed** — with only 6 testable data points and 13 methods each, a single exact hit is well within the range of coincidence, especially since the *same* hypothesis fails on the anchor cluster that motivated testing it in the first place.
- The 644/"צמח דוד" cluster's spelling-invariance (646 hits both כתיב מלא and כתיב חסר identically) remains the single strongest piece of evidence that *something* deterministic and letter-independent-of-spelling produced 644 — but the standard ר"ת reading of the label does not explain it, and no other whitelisted deterministic transformation was found in the provenance. This is most consistent with either (a) a reference value from outside the live `gematria_methods` engine (a source text, an external "צמח דוד" tradition already carrying 644 as a fixed number), or (b) a definition of "ר"ת" as used in *this specific corpus* that differs from the textbook meaning — not resolvable from data alone.

**RECOMMENDATION (process only):** Do not add ר"ת to the registry. If Zuriel can identify where the value 644 for "צמח דוד"/"צמח דויד" originally came from (a source, a teacher, a text), that provenance would let a future pass re-attempt reconstruction with a real anchor instead of a coincidental one.

**HUMAN-GATE:** **REMAIN_CANDIDATE.** One coincidental-looking single-example fit (337, via the standard ר"ת reading) is disclosed but explicitly not elevated to reconstructed/verified. The anchor cluster (644) stays `status=unresolved_historical_method`, `anchor=644`, `evidence_strength=medium`, exactly as instructed §3's fallback specifies.

---

### B. ס"ת (סת) — 18 rows

**FACT:**
- No recurring anchor value exists across the 18 rows — claimed values are 2756, 11111, 5140, 2016, 1335 (×3, across otherwise-unrelated phrases), 1437, 4240, 590, 434, 676, 5520, 566, plus several rows without a value — matching the prior file's own finding of no consistency anchor.
- Live-tested the standard ס"ת definition (last Hebrew letter of every word, concatenated, run through all 13 live methods) against every testable row (13 of 18 have both a clean expression and a value cleanly attributable to ס"ת):
  - **"יהוה יפיל את בראק חוסיין אובאמה" → acronym "הלתקןה" → רגיל = 590.** The row's claimed value is exactly **590** — a genuine, exact match.
  - The other 12 testable rows (2756, 11111, 5140, 2016, 1335×2 distinct phrases, 1437, 4240, 434, 676, 5520, 566) **do not match any of the 13 method values** of their respective ס"ת-acronyms.
- **Net: 1 of 13 testable rows (7.7%) fits — even weaker than ר"ת's already-inconclusive 16.7%.**
- The value **1335 recurs 3 times** across entirely unrelated phrases within this label's rows ("אשרי המחכה ל" [ר"ת row], "זמן ביאת המשיח...בספר דניאל", "סוד דניאל הנביא"), with zero method-value match in any of the 3 cases.

**INFERENCE:**
- 1/13 is consistent with pure coincidence (13 methods × 13 rows gives many chances for an accidental exact hit) — the same "not verified from one hit" caution applies with even less confidence than ר"ת.
- **The recurring 1335 is most plausibly a literal citation of Daniel 12:12's "1,335 days" prophecy, not a computed gematria value at all** — it appears explicitly alongside "דניאל" (Daniel) in two of the three occurrences, and the third ("אשרי המחכה") is a phrase-family closely associated with messianic-waiting language that commonly cites the same verse. This would mean at least some ס"ת-tagged (and some ר"ת-tagged) rows are not testing a gematria *method* at all, but recording a **source-cited number** alongside an unrelated category tag — exactly the §9 warning ("a number attached to a method-instruction may be a `claimed_value`, not a numeric-language/method-computed expression") applied one level further than the instruction's own worked example.
- The label "ס"ת" may, in a meaningful share of these 18 rows, be a **historical/topical tag co-occurring with a cited number**, not a description of how that number was computed — consistent with the prior file's own phrasing: "האם מדובר באמת ב'סופי תיבות' או רק label היסטורי" (exactly the question §4 asked to check).

**RECOMMENDATION (process only):** Do not add ס"ת to the registry. A future pass could specifically separate "ס"ת rows where the number is independently identifiable as a Scripture citation" (like the Daniel 1335/1290 pair) from "ס"ת rows where the number has no external source and might be a genuine computed value" — using the already-existing `year_time_audit`/source-citation infrastructure from Phase 5, not a new discovery effort.

**HUMAN-GATE:** **REMAIN_CANDIDATE.** Weaker than ר"ת — no anchor cluster, 1/13 coincidental-looking fit, and positive evidence (the recurring 1335) that several of the 18 rows may not represent a gematria method at all.

---

### C. רגיל ישר והפוך — 3 rows

**FACT:**
- All 3 occurrences are pure category-tag mentions — none carries a `claimed_value`, a note, or a worked example anywhere in the corpus. The label appears attached to "עד מתי קץ הפלאות," "משיח," and "דויד מלך ישראל" with nothing distinguishing which of the 5 plausible readings (letter-order reversal / two-direction summation / reversed-string gematria / relation between two phrases / historical label only) is meant.

**INFERENCE:**
- With zero numeric examples, no hypothesis — however standard or well-known — can be tested without guessing a target to hit, which is exactly the brute-force behavior §3/§5/governance forbid. No reconstruction was attempted, correctly, per `method_lifecycle`'s own rule: "לא-שוחזר → עצור → אדם (אל תמציא)."

**RECOMMENDATION (process only):** This candidate cannot advance without Zuriel supplying either a worked example (a phrase + the value "ישר והפוך" is claimed to produce) or an explicit definition. No further automated work is possible here.

**HUMAN-GATE:** **REMAIN_CANDIDATE.** Not testable in this pass.

---

## §6 Collision check (all three candidates)

None of the 13 currently active `gematria_methods` operate on an *extracted substring* of a phrase (acronym-of-initials or acronym-of-finals) — all 13 operate on the full phrase/word's own letters directly. So **if** the ר"ת/ס"ת hypotheses were ever confirmed, they would not collide with or duplicate an existing method; they would be a **new two-step transform**: (1) an extraction step (first/last letter of each word) that does not exist in the registry today, composed with (2) an existing canonical method (רגיל/גדול, both of which already coincide on sofit-free short strings, a documented mechanical equivalence from this session's earlier work) applied to the extracted string. Per §6's explicit instruction, this is correctly classified **`composition_candidate = yes`**, not "propose as a new atomic method."

## §7 Verification test — explicitly not reached

Per instruction, only a candidate that reaches `reconstructed` may proceed to verification. Neither ר"ת nor ס"ת reached `reconstructed` as a *general* definition (each has exactly one single-example fit against ~6–13 testable rows, and in ר"ת's case the fit explicitly fails on the strongest anchor cluster) — both remain `candidate`. `רגיל ישר והפוך` has zero testable examples. **No verification set (source examples / spelling variants / control phrases / edge cases / comparison-vs-existing-methods) was run for any candidate**, because none qualified to enter that stage. This is the correct, disciplined outcome per §7's own standard ("not verified from hitting one example").

---

## §9 HUMAN-GATE — one decision per method (as instructed, not dozens)

| Candidate | Decision | Exact algorithm to hand back (if any) |
|---|---|---|
| **ר"ת (רת)** | **REMAIN_CANDIDATE** | Standard reading (first letter of each word → run through live methods) exactly explains 1 of 6 testable rows (id `18207155`, value 337, via רגיל/גדול on acronym "אאללוילללצדמלה") but explicitly fails the strongest anchor (644, "צמח דוד"/"צמח דויד", 6 occurrences). Not verified — disclosed as a single coincidental-looking fit only. |
| **ס"ת (סת)** | **REMAIN_CANDIDATE** | Standard reading (last letter of each word → run through live methods) exactly explains 1 of 13 testable rows (value 590, via רגיל on acronym "הלתקןה" from "יהוה יפיל את בראק חוסיין אובאמה"). Not verified — weaker than ר"ת, and positive evidence (recurring 1335) suggests several rows in this label cite a Scripture number rather than a computed value. |
| **רגיל ישר והפוך** | **REMAIN_CANDIDATE** | No algorithm to report — zero testable examples exist in the corpus. |

No candidate reached `verified`. No candidate reaches `canonical` in this task (explicitly out of scope per §2). Nothing was added to `gematria_methods`.

---

## STOP

READ-ONLY throughout. No changes to `gematria_methods`, the engine, `nodes`, `research_objects`, schema, UI, Roadmap, or Master State. Closing `work_log` memo (`actor=CLAUDE`, `task=METHODS_EXPANSION_PHASE_1`, `status=completed`) logged separately.

> המטרה לא הייתה "להוסיף עוד שיטות," אלא להוכיח אילו שיטות באמת קיימות. במשימה הזו: אף אחת מהשלוש לא הוכחה — כולן נשארות עדות היסטורית (candidate), עם ממצא-משנה כן אפרופו אחד: הצורה הסטנדרטית של ר"ת/ס"ת הופעלה LIVE במקום להיוותר תיאורטית, וגם ככה לא עברה את מבחן העקביות. זה בדיוק ההבדל בין "בדקנו ולא הוכח" לבין "לא בדקנו."
