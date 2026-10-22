# Ahavat Torah — Checkpoint 5 finite witness-gap closure

Date: 2026-10-22  
Source identity: `book:hebrewbooks:5635`  
Digital object: `Hebrewbooks_org_5635.pdf` (99 PDF pages)  
Status: additive research note; witness locations closed, downstream calculations not silently promoted

## Scope and method

This pass addresses only the five finite witness gaps carried forward from
`AHAVAT_TORAH_CHECKPOINT5_RECONCILIATION.md`. Embedded PDF text was used for
discovery. Every result below was then checked against a high-resolution render
of the corresponding PDF page. OCR is not treated as the authority.

The status `VISUALLY_VERIFIED` means that the authorial passage and the claimed
selection rule were found on the cited page. It does **not** mean that every
resulting corpus count, gematria, or arithmetic claim has been independently
reproduced.

## Closure matrix

| ID | Former gap | Exact source locus | Direct witness | Result | Residual work |
|---|---|---|---|---|---|
| CP5-WG-01 | ל-prefix → terminal ה rule | `book:hebrewbooks:5635#p22:lamed-prefix-he-suffix` | “כל תיבה שצריכה למ״ד בתחלתה הטיל לה הכתוב ה״א בסופה” | `VISUALLY_VERIFIED` | Test the rule across any claimed token set; no universal application is asserted here. |
| CP5-WG-02 | repeated-word subcorpus / midpoint | `book:hebrewbooks:5635#p71:repeated-word-subcorpus` | The passage begins “דרש דרש אמרו חז״ל שהוא באמצע התיבות”, counts `פ״ט` doubled words, begins with `הרמש הרמש`, ends with `אני אני`, excludes `לך לך` and `שם שם` as different roots, and places `דרש דרש` in the middle. | `VISUALLY_VERIFIED` | Independently reconstruct the 89-item corpus and its midpoint. The source witness is closed; the corpus computation is not. |
| CP5-WG-03 | five-year / day-count / Yom-Kippur exclusion | `book:hebrewbooks:5635#p14:five-years-yom-kippur-exclusion` | “לחמשה שנים לכל שנה שס״ד יום ... כי יום הכפורים אינו בחשבון הימים ... ה׳ פעם שס״ד עולה אלף תת״ך” | `VISUALLY_VERIFIED · CORRECTED` | The carried-forward shorthand “365” was inaccurate. The source explicitly uses 364 days: `5 × 364 = 1,820`. |
| CP5-WG-04 | Kohelet time categories | `book:hebrewbooks:5635#p14:kohelet-time-categories` | “הכ״ח עתים שכתוב בקהלת המה באמת אך י״ד עתים וכל עת חמשה שנים ... שבעים שנה” | `VISUALLY_VERIFIED` | The passage's full life-stage interpretation can be transcribed separately; the category mapping itself is located. |
| CP5-WG-05 | Birkat Kohanim edge-token selection | `book:hebrewbooks:5635#p14:birkat-kohanim-edge-tokens` | “תחלת כל ברכה וסוף כל ברכה דהיינו יברכך וישמרך יאר ויחנך ישא שלום עולה אלף תת״ך” | `VISUALLY_VERIFIED` | Recompute the six-token value with the canonical gematria engine before claiming engine verification. |

## Reconciliation result

All five finite Checkpoint-5 witness gaps are now closed at the source-location
level:

- PDF p.14 closes three items: Birkat Kohanim edge tokens, `5 × 364` with the
  Yom-Kippur exclusion, and the Kohelet `28 → 14 × 5 → 70` mapping.
- PDF p.22 closes the ל-prefix / terminal-ה linguistic rule.
- PDF p.71 closes the repeated-word subcorpus witness and the author's midpoint
  explanation.

The earlier “gap” classification reflected the bounded pages inspected in that
checkpoint, not absence from the 99-page source. No older provenance note is
rewritten by this file.

## What remains open

1. Reproduce the 89-item doubled-word corpus and verify the author's midpoint
   under the stated exclusions.
2. Run the six Birkat-Kohanim tokens through the canonical gematria engine.
3. Keep DS-03's `79,976 ↔ 110,976` contradiction open; this pass supplies the
   repeated-word witness but does not reconcile the population total.
4. Keep DS-04's final-glyph reading (`304,812 ↔ 304,830`) open.
5. Continue preserving source witness, arithmetic closure, corpus closure, and
   engine verification as separate status dimensions.

