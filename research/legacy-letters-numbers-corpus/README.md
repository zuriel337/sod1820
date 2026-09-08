# Legacy Letters/Numbers Corpus — Lossless Closure

Durable closure artifact for handoff `LEGACY_LETTERS_NUMBERS_DEEP_EXTRACTION_V1`. READ-ONLY research artifact — a coordination/provenance record, not a canonical truth store. See `UNRESOLVED_LEDGER.md` + `.json` for the itemized ledger, `RESOLVED_ANOMALIES.md` for previously-suspicious-now-resolved items.

## A — Scope + Provenance

**Corpus definition:** `posts` where `source='wordpress'`, `categories @> ['סוד האותיות והמספרים']`, `NOT categories @> ['רמזים חזקים']` — 68 posts, independently re-derived and cross-verified against census `f668f5e7` (count, date range 2013-11-11..2026-04-30, content volume) on every pass.

**Handoff chain (all live in `work_log`, canonical Supabase `linswmnnkjxvweumprav`):**
| id | actor/task | role |
|---|---|---|
| `1b0c4e03-711c-45e0-bca0-bbca32bf6483` | GPT→CLAUDE specialist handoff | original task |
| `25432c61-d722-4cf4-be9a-bebb5be7acaa` | CLAUDE ACK | acknowledged |
| `bdab4356-4d7e-4d28-a86b-3276f6690552` | CLAUDE Batch-1 AFTER | 29/68 close-read + census reproduction |
| `ce48d822-cae6-4dab-af78-2ff3d7b26009` | GPT — `gematria_db_first_and_enrich_law` v2 AFTER | exhaustive-before-mismatch law |
| `bf6fecf5-a708-4510-ba2c-50ab20a76f7b` | CLAUDE FINAL 68/68 AFTER | remaining 39/68 close-read (6 parallel READ-ONLY sub-extractions) |
| *(this artifact's own final AFTER)* | CLAUDE — lossless closure | this durable ledger |

**Governing rules:** `inter_agent_coordination_law` v5, `truth_axes_foundation_law`, `research_intake_foundation_contract_law`, `canonical_methods_registry_law`, `gematria_engine_law`, `gematria_db_first_and_enrich_law` v2, `messiah_frequency_in_every_person_law` v3 (touched only where the corpus itself invokes משיח/geulah framing — never used to declare any person the Messiah).

**Owner check (performed first, per the closure task's mandate):** existing_owner(s)_checked = the rules above + this repo's own `research/` and `docs/research-notes/` convention (see e.g. `research/sefer-habahir-1883/FULL_CORPUS_UNRESOLVED_CLASSIFICATION.md` for the established README + classification-ledger + JSON-companion pattern this artifact follows). **VERDICT: EXTEND_EXISTING.** No new registry/store/table was created — this artifact reuses the repo's existing `research/<corpus-slug>/` convention exactly, and `work_log` remains the coordination ledger of record.

## B — 68/68 Closure Statement

- **68/68 exact corpus** reconfirmed live at the start of this closure pass (unchanged from the two prior AFTERs).
- **68/68 CLOSE READ COMPLETE** — 29/68 in Batch-1 (direct read), 39/68 in the FINAL pass (6 parallel READ-ONLY sub-extractions, full HTML-stripped clean-text read end-to-end per post; 2 of the 6 sub-extractions were interrupted once by a session rate-limit and successfully resumed, covering their full original post lists).
- **content_old coverage:** 24/68 posts have no content_old (content is the sole version). Of the remaining 44/68, 43 are confirmed representation-only (WordPress→Supabase Storage media rehosting is the sole difference); the **one exception is wp17** (post-yesod, סוד-1820), which has a materially new editorial layer ("חמש החותמות של 1820") appended after the 2013 original.
- **This closure pass did NOT reread or rescan the 68 posts.** It performed bounded source-locus lookups (via `fn_all_methods_full` against the canonical engine, 26 methods per phrase) to complete v2-exhaustive verification on items the original sub-extractions had only partially tested, and to compile the durable ledger from the six sub-extraction reports already on record in this session's provenance chain.

## Ledger location

See `UNRESOLVED_LEDGER.md` (human-readable, sections C–H) and `UNRESOLVED_LEDGER.json` (machine-readable companion, same 53 rows + 5 contradictions + counts). See `RESOLVED_ANOMALIES.md` (section E) for 13 items that looked suspicious but resolved under v2 exhaustive testing — kept separate so they are not reopened.

## I — Exact Counts

| Metric | Count |
|---|---|
| Corpus size | 68 posts |
| Posts closely read (Batch-1 + FINAL) | 68 |
| Posts with content_old = empty (sole version) | 24 |
| Posts with content_old present | 44 |
| ...of which representation-only (confirmed) | 43 |
| ...of which with a genuine added content layer | 1 (wp17) |
| Total ledger rows (`UNRESOLVED_LEDGER.json` `items`) | 53 |
| — verification_state = `mismatch` | 41 |
| — verification_state = `method_unknown` | 3 |
| — verification_state = `not_tested` | 6 |
| — verification_state = `match` (structural/juxtaposition flags only) | 3 |
| Direct contradictions (`contradictions` array) | 5 |
| Source self-correction artifacts | 1 (L052) |
| Procedures not single-call re-derivable | 3 (L005, L027 partial, L038) |
| Whole posts flagged unverifiable-by-construction | 1 (wp11877, L040) |
| Resolved anomalies (see `RESOLVED_ANOMALIES.md`) | 13 (R1–R13) |
| Anchor/representative claims exhaustively engine-tested across both passes | ~300 (≈260 in the FINAL pass + ~40 additional exhaustive completions run in this closure pass) |
| Total distinct claims extracted (typed, preserved, not all individually re-verified) | ~500+ |

Reconciliation with the FINAL AFTER's "approximately 45-50 additional unresolved/mismatch items": the 53 ledger rows minus the 3 pure-`match` structural-flag rows (L051-L053) = **50 non-match rows**, matching that estimate exactly.

## J — Validation Summary

- [x] Exact corpus remains 68/68 (reverified live at closure-pass start).
- [x] No duplicate ledger rows except where explicitly marked representation/copy lineage (see §G in `UNRESOLVED_LEDGER.md`).
- [x] Every item named in the FINAL AFTER's recheck list (Batch-1's 4 anomalies) is accounted for: L001 (שבועות), L002 (ארבעה יודין), L003 (אאש"ן), L052 (מבוי, reclassified SOURCE SELF-CORRECTION).
- [x] All 10 items GPT's closure-task message explicitly named for recheck are present: L001, L002, L003, L052, Contradiction C1 (L016), Contradiction C2 (L019), Contradiction C3, Contradiction C4, L005 (Albam procedure), F2 (הכפלה label collision).
- [x] Counts reconcile (see §I above).
- [x] Every numeric mismatch/method_unknown item in the ledger was passed through the v2 exhaustive-before-mismatch rule (all ~26 canonical registry methods via `fn_all_methods_full`, plus source-justified spelling/kolel variants where applicable) — including items the original sub-extraction reports had only partially tested; those were completed in this closure pass via bounded `fn_all_methods_full` lookups (no re-reading of source posts).
- [x] Source spelling preserved verbatim in every ledger row (`source_spelling` field).
- [x] wp_id present for every row; internal `id` (posts.id) present for every row via the corpus's own id↔wp_id mapping captured during Batch-1.
- [x] No Strong Hints (`רמזים חזקים`) posts or category entries appear anywhere in this corpus, ledger, or artifact set.
- [x] No forbidden DB/code/schema writes made — this closure pass performed only SELECT queries (including `fn_all_methods_full`, a read-only computation) against Supabase, plus these repository file writes and their git commit/push.
- [x] Artifact readable from the branch after commit (verified via `git show` before push — see final `work_log` AFTER for the exact commit hash).
- [x] Branch pushed successfully to `origin` (not merged, not deployed).

**STOP CONDITION check:** none triggered. No unresolved item was irrecoverable (all 4 GPT-named recheck items + the corpus-wide ~45-50 additional items were recovered from the six sub-extraction reports already in this session's provenance chain and organized here); no ledger-count mismatch; no item was classified `mismatch`/`method_unknown` without a full v2-exhaustive sweep (completed in this closure pass for every item that needed it); no source-locus/provenance materially missing; no overlapping writer found (fresh `work_log` scan at the start of this closure pass showed only unrelated concurrent activity — Strong Hints continuation, Traffic Intelligence, Cipher Spatial Mockup — none touching this corpus); no schema/owner mismatch.

**OWNER CHECK:** EXTEND_EXISTING (confirmed, see §A).
**FOUNDATION GATE:** FOUNDATION SUFFICIENT — this closure required 0 schema/store/engine/law changes; it reused the repository's existing `research/<slug>/` artifact convention and the existing `work_log` coordination ledger exactly as-is.
