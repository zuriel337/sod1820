# Sefer HaBahir 1883 — Full Corpus Integration (48/48)

**Dispatch:** `work_log.id = 4e860969-c19b-4637-8e99-d35229e3c8f3`
(`actor=GPT FROM=ZURIEL/GPT TO=CLAUDE(BAHIR_INTEGRATOR) task=SEFER_HABAHIR_1883_FULL_CORPUS_INTEGRATION_GATE_V1`)

**Mode:** Integration only. No new research, no rescanning, no reinterpretation. Every file imported below is byte-identical to its source branch (verified by sha256 sample and — for the full active-block set — independently recounted from the imported files themselves by `tests/validate_full_corpus.py`, not copied from any prior summary).

**Branch:** `claude/sefer-habahir-1883-full-corpus-integration`, created fresh from `origin/main` @ `07c978d1582e00c1a9df30440056d4326b3eaf84`. No merge, no deploy, no Book node, no edges, no Research Object promotion, no schema/RPC/UI change, no Master/Roadmap edit.

---

## 0. ACK

ACK of dispatch `4e860969-c19b-4637-8e99-d35229e3c8f3`. Re-verified live facts before integrating:
- Scan A closure `79f00810-b9d5-44b4-884c-714cfcbb734e`: branch `gpt/sefer-habahir-1883-scan-a-pagewise-v2` @ `c338fb58a15666be054126dc36d82369befb40b4` — confirmed present on origin, commit SHA matches exactly, every artifact's sha256 in its own `manifest.json` verified against the actual file bytes.
- Scan B original `d34b0532-f9c8-4202-bcf1-21186ffad9d2`: branch `claude/sefer-habahir-second-half-0lbg2i` @ `9b215c663f5d3d271a8d8b12a64481fdd2bfc1dc` — confirmed present, matches.
- Witness-structure audit `b6cc2d66-dd69-4dcf-8615-7ee329301607`: branch `claude/bahir-witness-structure-audit` @ `01bb7712d2df172eaf89795b28781acae923bec6` — confirmed present, matches.
- Scan B corrective `2a97a5db-855d-475c-a6ae-49007b8706bc`: branch `claude/sefer-habahir-scan-b-corrective` @ `9a828bdba7d6ae4a89d5357cf97ac35815662009` — confirmed present, matches.
- Source PDF identity: `gallery/Book/Sefer_HaBahir_1883.pdf`, sha256 `b099f2298525c71e7abd45e6132610525fef7ccb8a8f3be338cf4e2404a57067`, N=48 — this exact fingerprint appears, independently, in every one of the four source branches' own manifests (Scan A's, Scan B's, the audit's, and the corrective's), which is itself a consistency check: all four sub-corpora agree on what object they describe.

No stop condition was triggered: all four branch payloads reconciled losslessly, page coverage is exactly 48/48 once supersession is applied, the source fingerprint is consistent everywhere it appears, and no semantic reinterpretation was required to combine them (see §4 on why not).

## 1. What was imported (lossless)

| Import | From branch @ commit | Into | Files | Verification |
|---|---|---|---|---|
| Scan A | `gpt/sefer-habahir-1883-scan-a-pagewise-v2` @ `c338fb58a1` | `research/sefer-habahir-1883/scan-a/` | 6 | `git checkout <branch> -- <path>`; sha256 sample match confirmed; file count 6=6 |
| Scan B (original, incl. the 6 now-superseded pages) | `claude/sefer-habahir-second-half-0lbg2i` @ `9b215c663f` | `research/sefer-habahir-1883/scan-b/` | 30 | same method; sha256 sample match confirmed; file count 30=30 |
| Witness-structure audit | `claude/bahir-witness-structure-audit` @ `01bb7712d2` | `research/sefer-habahir-1883/witness-structure-audit/` | 3 | same method; sha256 sample match confirmed |
| Scan B corrective | `claude/sefer-habahir-scan-b-corrective` @ `9a828bdba7` | `research/sefer-habahir-1883/scan-b-corrective/` | 9 | same method; sha256 sample match confirmed |

`git checkout <branch> -- <path>` pulls the exact git blob for each file — this is not a copy-and-retype operation, so byte-identity is guaranteed by construction, and was additionally spot-verified with direct sha256 comparison against the source branch tip for one file per import (see commit diff / validator output).

## 2. Supersession map (provenance preserved, not deleted)

For PDF pages **30, 31, 32, 34, 35, 38**, the witness-structure audit found the original Scan B content did not match its own page image (see `witness-structure-audit/scan_b_reliability_audit.json`), and the corrective pass independently re-transcribed exactly those 6 pages.

| PDF page | Historical (kept on disk, NOT active) | Active (current authoritative content) |
|---|---|---|
| 30, 31, 32, 34, 35, 38 | `research/sefer-habahir-1883/scan-b/pages/pNN.json` | `research/sefer-habahir-1883/scan-b-corrective/pages/pNN.json` |

The historical files were **not edited, deleted, or overwritten** — `tests/validate_full_corpus.py` explicitly asserts they still exist on disk and are excluded from the active block/unresolved counts, per `everything_additive_law`. This is a manifest-level supersession (which file is authoritative for a given page), not a file-level one.

## 3. 48/48 coverage — proof

`FULL_CORPUS_COVERAGE.json` (regenerated and cross-checked by `tests/validate_full_corpus.py`, which independently recounts every number from the actual source files rather than trusting any cached summary):

- **Pages covered: 1–48, exactly. Gaps: none. Duplicate active assignments: none. Duplicate `source_ref` values in the active set: none** (212 distinct refs for 212 active blocks).
- Breakdown: Scan A owns pages 1–24 (82 blocks). Scan B owns pages 25–48 **except** 30/31/32/34/35/38 — 18 pages, 90 blocks. Scan B corrective owns 30/31/32/34/35/38 — 6 pages, 40 blocks.
- **Total active block count: 212.**
- **Total active unresolved-reading count: 115** (26 from Scan A's own count, 89 from the active 18 Scan B pages + 6 corrective pages combined — the 6 superseded pages' own unresolved counts are excluded, since their content is historical, not active).

## 4. Why no semantic reinterpretation was needed (and none was done)

Scan A and Scan B/corrective use two **different but structurally compatible** page-artifact schemas (Scan A: a single gzipped `pages[]` array with `blocks[]`/`extraction`/`findings`/`claims`/`unresolved_readings` per page and an `exact`+`confidence` float per block; Scan B/corrective: one JSON file per page with `input.blocks[]`/`extraction`/`finding`/`claim` and a `high`/`medium`/`low` confidence string per block). This integration does **not** unify those schemas into one common shape — doing so would require deciding how to map, e.g., `exact: true, confidence: 0.99` onto `confidence: "high"`, which is exactly the kind of semantic reinterpretation the dispatch's STOP CONDITION forbids guessing at.

Instead, integration happens at one level up: both schemas already independently converged on the **same `source_ref` locator convention** (`book:sefer-habahir-1883#p<PDF_PAGE>:<BLOCK_ID>`), which is what makes it possible to prove 48/48 page coverage, block counts, and `source_ref` uniqueness **across** the two schemas without touching their internal shape. `FULL_CORPUS_MANIFEST.json` records which schema/source is active per page; nothing about the schemas themselves was changed.

## 5. Unresolved classification

See `FULL_CORPUS_UNRESOLVED_CLASSIFICATION.md` for the itemized list. Summary:

| Class | Count | What it means |
|---|---|---|
| **Bibliographic** | 2 | Open questions about the book's own identity/date (the p43 printer colophon date line and the p44 chronogram -- both concern whether the print year reads as 1880/81 or 1883; see the witness-structure audit's verdict, which favors 1883 on external evidence but did not re-verify the exact colophon letter). |
| **Structural** | 4 | Open questions about layout/section division (a page-order/duplication question on p33/p38/p41/p42 relating to the now-resolved cross-page-duplication finding's residual edge cases, and diagram/section-marker placement uncertainty). |
| **Textual** | 109 | Transcription/legibility uncertainty in running text or dense marginal commentary — the overwhelming majority, consistent with a 19th-century small-type rabbinic printing. |

Classification was produced programmatically from each item's own description text (keyword rules for "bibliographic" and "structural" triggers, default "textual"), then spot-checked by hand; see the script embedded in this session's working notes if exact reproduction is needed (not committed as a separate artifact -- the classified output itself, `FULL_CORPUS_UNRESOLVED_CLASSIFICATION.md`, is the deliverable).

## 6. Validation

Four validators pass on this branch, all re-run from the integrated location (not merely re-committed from their origin branches):

```
scan-a:            PASS: 24/24 exact PDF page assignments; no gaps/duplicates; blocks=82 exact_blocks=50 unresolved=26
scan-b:             All validation checks passed. 24 pages, 126 input blocks (includes the 6 now-superseded pages' original content, on disk as history)
scan-b-corrective:  All validation checks passed. 6/6 pages [30, 31, 32, 34, 35, 38]
full-corpus (NEW):  All full-corpus validation checks passed. 48/48 exact, no gaps, no duplicate active assignments, no duplicate source_refs.
```

`tests/validate_full_corpus.py` is the new corpus-level validator produced by this integration; it re-derives every number (page coverage, active block count, source_ref uniqueness) directly from the imported source files on disk, and additionally cross-checks its recount against `FULL_CORPUS_COVERAGE.json`.

## 7. FOUNDATION SUFFICIENT / NOT SUFFICIENT verdict

**FOUNDATION SUFFICIENT for Book Admission consideration** -- with three explicit caveats carried forward, not resolved here:

1. **Reliability, not completeness, is what's being certified.** "Sufficient" means: every one of the 48 PDF pages now has exactly one active, independently-verified-or-corrected artifact, with no gaps and no silent overwrites of provenance. It does **not** mean every word on every page has been transcribed with high confidence -- 109 of 115 unresolved items are ordinary textual/legibility uncertainty, expected for dense 19th-century small-type marginalia, and are preserved as `unresolved_readings`, not smoothed over.
2. **The 2 bibliographic unresolved items (print-year ambiguity) are a real, unresolved open question**, not a blocker to admitting the corpus as a researched *source*, but should be resolved (or explicitly accepted as unresolved) before any canonical claim that states a specific print year as fact.
3. **This integration is READ/IMPORT-ONLY.** No Book node, edges, Research Object, schema/RPC/UI, or Master/Roadmap change has been made. Book Admission itself -- and the decision of what, if anything, gets projected into the canonical Knowledge Graph -- is explicitly a separate, future, human-gated step, per `command_center_law` and `agent_onboarding_law`. This report supplies the evidence for that decision; it does not make it.

**NOT MERGED. NOT DEPLOYED. NOT LIVE.**

---

**STOP.**
