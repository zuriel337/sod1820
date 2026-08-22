# SOD1820 — RESEARCH DNA v1 · ARCHITECTURE DECISION PACK / PROOF OF MODEL
READ-ONLY. No migration/schema/UI/backfill executed. Base: `MASTER_CLASSIFICATION_v3.csv` (15,433 rows) + live DB (`linswmnnkjxvweumprav`), verified 22.8.2026.

---

## PART 0 — PRE-VERIFICATION / DRIFT REPORT (mandatory, run before any conclusion below)

Per Zuriel's explicit instruction, live DB + code + docs were re-checked against the Legacy→DNA Crosswalk before building this pack. Findings:

| # | Item | Crosswalk said | Live now | Verdict |
|---|---|---|---|---|
| 1 | `gematria_words` | 15,433 (basis of v3) | **15,433** | ✅ no drift — v3 is still built on the current live count |
| 2 | `nodes` | 5,889 | **5,889** | ✅ no drift |
| 3 | `edges` | 5,100 | **5,100** | ✅ no drift |
| 4 | `gematria_methods` | 24 (Crosswalk) vs 23 (Master State doc) | **24** | Master State §9/§1 text (23) is stale, not live DB. **Resolved, not blocking**: a new rule `gematria_methods_catalog` v2 (21.8.2026) explicitly retired hard-coding a method *count* in policy — "the registry is the source of truth, don't fix a number in the rule." So the correct posture going forward is: never hardcode a count, always read `gematria_methods` live. This pack does that. |
| 5 | `topic_cards` approved | 204 | **204** | ✅ no drift (Master State's "203" is the stale figure) |
| 6 | `insights` | 308 total / "296 active" per Master State | **308 total** (didn't re-filter by active) | Not reconciled precisely, but not relevant to any of the 8 architecture decisions below — not blocking |
| 7 | `fn_normalize_for_calc` / `gw_enforce_engine` (the newest commit, `0cf88fa`, on the currently-checked-out branch) | Unknown deployment status at summary time | **Confirmed live in DB** (`pg_proc` lookup found both functions) | **Resolved.** `work_log` shows Normalization v1 was implemented+verified **21.8.2026** ("0 gematria_words rows changed · 574/574 parity · 500/500 regression"), one full day *before* today's Method-Mentions Phase 2/3 + Closing Sequence + Crosswalk work (all dated 22.8.2026). So every `fn_all_methods()` verification call used in Phase 2/3 (the 225 mismatches) already ran **through** the normalized calc pipeline — there is no before/after inconsistency to worry about. Not blocking. |
| 8 | Current git branch (`claude/gematria-normalize-v1-31748`) vs. task-wrapper's stated branch (`claude/gematria-lists-organization-u39nlj`) vs. `CLAUDE.md`'s stated branch (`claude/prayer-sharing-popup-u1kn3s`) | — | Three different branch names in play | **Not blocking for this task**: every deliverable since the Crosswalk (Method Mentions, Closing Sequence, Crosswalk, this Pack) has been READ-ONLY — no commits, no pushes. The branch currently checked out is simply the last one with real commits (Normalization v1, 21.8). No git action is needed for this pack either. Flagging the inconsistency for Zuriel's awareness only. |
| 9 | **NEW, not in the Crosswalk**: `relation_evidence` table | Not discovered/mapped in the Crosswalk | **Exists live**, 132 rows, schema `{id, relation_type, method, a_phrase, b_phrase, value, note, source, engine_verified, status, created_at, updated_at, rejection_reason}` | Real gap in the prior Crosswalk, closed here. Per Master State Change Log #29 (§19-A, "γ two-layer"), this is the **Atlas** layer (engine-computed relation-facts between two phrases) sitting next to `research_objects` (the **Ledger**, claim/candidate/interpretation layer). Both are used below. |
| 10 | Follow-up memo already in `work_log` since the Crosswalk was delivered ("Gate #1 of Crosswalk answered", 22.8.2026, actor=CLAUDE relaying a Zuriel constraint) | Not seen before this pre-verification | **Found and read in full** | **This directly shapes Decisions E and F below** — see box immediately after this table. It is treated as a standing decision, not re-derived from scratch. |

**Zuriel's already-recorded constraint (from the "Gate #1" memo, honored throughout this pack):**
> DNA v1 must support future corpus expansion, new methods, numeric-language generation, and multilingual identity — **without schema redesign**.
> Resolution recorded: (1) Open-Question #1 of the Crosswalk (new table vs. derived-view) is **decided: derived-view, not a new table**. A new method joins through the existing convention (code registration + `nodes type=rule` metarule), not a new column. (2) NUMERIC-DNA needs a **generation-slot**: an engine-callable transform (number→word-form and word→number), living in the same `method`/`engine_detail` jsonb convention already approved for cross-domain transforms (Master State §19-C(E)) — not a fixed text column. (3) IDENTITY-DNA must be **lang-tagged** (`{phrase, lang}`, not bare `phrase`), aligned with `content_translation_law`'s 8-language set.

**Conclusion of Part 0: no drift blocks this Pack.** All 9 discrepancies found are either resolved (stale-doc-vs-live, now reconciled) or additive (a table the prior Crosswalk missed, now incorporated). Proceeding.

---

## PART 1 — THE 20 CASES

All 20 are real rows pulled from `MASTER_CLASSIFICATION_v3.csv` / `METHOD_CLAIMS_PHASE3.csv` / `METHOD_CANDIDATES_RESOLVED.csv` / `STEP3_whatsapp_structured.csv`, or live `gematria_words`/`word_aliases`, except #20 which is explicitly architecture-only (see its row).

| # | Phrase (truncated) | Primary role this case proves |
|---|---|---|
| 1 | פנחס | researcher attribution (vip_source, tiered) |
| 2 | משיח בן דוד | researcher attribution + already-graph-linked (`node_id` populated) + interpretation tag |
| 3 | שחרור | `public_core` + author source-claim |
| 4 | אני הוא | personal/restricted **+** messianic research package (`do_not_display`) |
| 5 | כתר שלי 96 960 148 | personal/restricted, pure privacy (no package) |
| 6 | הרב עמוס גואטה נדקר | WhatsApp + `human_review` (PII/violence marker) |
| 7 | היום שמעתי | WhatsApp + `research_package` (verified, cross-linked) |
| 8 | הישועה בימינו 644 - אתבש - 1100 לפני | multi-method mention, **engine MISMATCH** |
| 9 | ברית בין הבתרים רגיל 1331 ועוד ∆ 5430 | method mention, **engine MATCH** |
| 10 | ...לך צמח דוד מכי ליהוה המלוכה -מילוי -רת 337 | candidate method **with** anchor evidence (ר"ת→644) |
| 11 | עד מתי קץ הפלאות (רגיל ו ∆ ישר והפוך) | candidate method **without** anchor evidence |
| 12 | אלף עד תיו במילוי | numeric-word construct (word-form present in text) |
| 13 | שנת 2448= לפני | Hebrew/AM year |
| 14 | שם י ה ו | Gregorian year + multi-method-documented source claim |
| 15 | וְקָרָאת אֶתְכֶם הָרָעָה...-1820- מילוי... | landmark/anchor (1820 = **target**, not computed result) |
| 16 | המלך 1335- גדול ואותיות -לפי אחד | genuine multi-dimension single record |
| 17 | צופן משיח | one clear world/theme (`world=ספירות`) |
| 18 | המשיח צומח בזמן הזה | **two simultaneous** theme-tags on one record (`world=גאולה` + `category=משיח`) |
| 19 | סוד → "secret" (en) | multilingual identity + name/word expansion (`word_aliases`) |
| 20 | 1820 → number-to-word generation | **future-capability stress test only** — no live row; tests decision F end-to-end |

---

## PART 2 — PER-CASE DNA MAPPING + PASS/FAIL

Format per case: `gematria_words row → research_object needed? → node → edges → theme(s) → method → numeric-language → year/event → provenance → package → verification → access → interpretation` → **PASS/FAIL**.

### Case 1 — פנחס (vip_source=שמעון חיימוב, visibility_tier=3, space=core)
- **research_object?** Not required to *store* the value (already in `gematria_words`); required only if/when someone builds a *claim about* פנחס (e.g. "פנחס = X in method Y, proposed by שמעון חיימוב"). The row itself is the fact; a research_object would wrap an *interpretation* of it.
- **node**: none yet (`node_id` is null) — would be `nodes type='word'` if promoted.
- **edges**: none yet; future edge `word --contributed_by--> person(שמעון חיימוב)`.
- **theme(s)**: none set (`world`/`category` null here).
- **method**: n/a (no method claim on this row).
- **numeric-language**: n/a.
- **year/event**: n/a.
- **provenance**: `vip_source` column, already ACTIVE (per Crosswalk) — this *is* the researcher-attribution field, no new column needed.
- **package**: n/a.
- **verification**: `visibility_tier=3` (one of the 3 existing tier signals — see Decision H).
- **access**: `space='core'`.
- **interpretation**: n/a.
- **PASS/FAIL: PASS** — attribution lives entirely on the existing row; nothing to duplicate.

### Case 2 — משיח בן דוד (vip_source=יצחק שחר קנדרו, node_id populated, tags=["כיוון:חיובי"])
- **research_object?** Not required — this record already graduated *past* candidate: it has a live `node_id`, i.e. it is already One-Tree material.
- **node**: `nodes` row `d03a2b07-...` — this word IS a node already.
- **edges**: whatever edges that node already carries (not re-audited here — out of scope for a proof-of-model, would be a live graph query).
- **theme(s)**: not set on the `gematria_words` row itself, but the *node*'s `metadata.world`/`metadata.tier` may carry it — this is exactly the ontology-duplication risk Decision B and Open-Question #2 flag (see Part 4).
- **method**: n/a.
- **numeric-language**: n/a.
- **year/event**: n/a.
- **provenance**: `vip_source` again — same mechanism, second researcher, proving it's not a one-off.
- **package**: n/a directly, but "משיח בן דוד" is exactly the kind of phrase that would sit inside a `messianic_claim_linked` package (see case 4/18) if a claim were attached.
- **verification**: `visibility_tier=2`.
- **access**: `space='core'`.
- **interpretation**: `tags=["כיוון:חיובי"]` — this **is** the existing direction-lens precedent (`direction_lens_law`, confirmed live rule) already rendering on `EntityPage.jsx`. INTERPRETATION-DNA does not need a new field; it needs to keep reusing `tags`.
- **PASS/FAIL: PASS**.

### Case 3 — שחרור (`corpus_role=public_core`, `source_claim_rule=tagged_1820_completion`)
- **research_object?** No — `public_core` means this is treated as established fact-vocabulary, not a pending claim.
- **node**: candidate for `nodes type='word'` if not already present (not checked live here, out of proof-of-model scope).
- **edges**: `word --relates_to--> 1820` (the "completion" relation the classifier detected via `tagged_1820_completion`).
- **theme(s)**: none stored on this row (see Decision B — themes are 0% populated in `world_theme` in v3, all the real theme signal lives on the live `world`/`category` columns, which are separately-tracked).
- **method**: n/a.
- **numeric-language**: n/a.
- **year/event**: n/a.
- **provenance**: `source='promoted:raw_docx_v2'` — origin-corpus tag, distinct from researcher attribution.
- **package**: n/a.
- **verification**: `normalization_state=true`.
- **access**: `display_recommendation='eligible via existing lens'`.
- **interpretation**: `source_claim_rule` itself **is** an interpretation-classifier output (my own enrichment layer) — it would live as `research_objects.meta.source_claim_rule` if ever promoted to a formal claim, not as a new gematria_words column.
- **PASS/FAIL: PASS**.

### Case 4 — אני הוא (`personal_or_restricted`, `research_package_cluster=messianic_claim_linked`, `availability=do_not_display`)
- **research_object?** **Yes, this is the textbook case `research_objects` was built for.** The row itself stays untouched (`gematria_words`); a `research_objects` row would wrap the *claim* ("אני הוא = personal messianic identification, do-not-display") with `status`, `privacy_scope`, `owner_person_id` — exactly its existing schema, no new columns.
- **node**: none — and per `do_not_display`, none should be created without a separate Human-Gate.
- **edges**: none yet; future edge would be `research_object --relates--> nodes type='convergence' (messianic_claim_linked package)`, never a direct edge from the raw row.
- **theme(s)**: `research_package_cluster` (my enrichment layer) maps to a future `nodes type='convergence', label='messianic_claim_linked'` — matches the existing `topic_cards→nodes type=convergence` pipeline exactly (Decision C).
- **method**: n/a on this row.
- **numeric-language**: n/a.
- **year/event**: n/a.
- **provenance**: `source='excel_import'` only — no personal attribution beyond that (correctly private).
- **package**: `messianic_claim_linked`, `sensitivity=personal_claim`.
- **verification**: `normalization_state=true`.
- **access**: `display_recommendation=hold/restrict` — this is exactly what `research_objects.privacy_scope` + `owner_person_id` (already shipped, §16 R1) is for.
- **interpretation**: personal claim, not a system fact — must stay claim-tagged forever, never promoted to fact.
- **PASS/FAIL: PASS**.

### Case 5 — כתר שלי 96 960 148 (`personal_or_restricted`, no package)
- Same shape as case 4 minus the package membership — proves `research_objects` privacy wrapping works **independently** of package membership (a lone private row, not clustered with anything).
- **PASS/FAIL: PASS**.

### Case 6 — הרב עמוס גואטה נדקר (WhatsApp, `human_review`, PII/violence marker)
- **research_object?** No — this is below the candidate threshold; it needs a **human moderation decision** before it becomes research material of any kind. `research_objects` is for claims-about-content, not content-moderation triage.
- **node/edges**: none; must not auto-link a real named person to any public node.
- **theme(s)/method/numeric/year**: none relevant — genuinely just raw archived WhatsApp text.
- **provenance**: `source='wa-deep'`.
- **package**: n/a.
- **verification**: `verified='False'`, `connectivity='none'`.
- **access**: must resolve to the *most* restrictive tier available (`personal_or_restricted`-equivalent), same 3-signal access model as everything else — no separate "sensitive content" flag needed, `visibility_tier`+`space` already model degrees of restriction.
- **interpretation**: none — flagged content is pre-interpretation.
- **PASS/FAIL: PASS** (the model correctly has *nowhere* good for this to live except "flagged, unpromoted" — which is the honest state).

### Case 7 — היום שמעתי (WhatsApp, `verified=True`, `connectivity=bidim`, `research_package`)
- **research_object?** Yes if a specific claim inside it gets extracted; the *phrase itself* becomes ordinary `research_vocabulary`/`research_package` corpus.
- **theme/method/numeric/year**: not present in this row (a conversational research-fragment, not a claim-bearing one) — correctly reflects that "verified WhatsApp research fragment" ≠ "has a gematria method claim."
- **provenance**: `source='wa-120363409557...'` — channel/group id, distinct from a person's name; this is the WhatsApp equivalent of `vip_source` but at group-granularity, not researcher-granularity. Worth noting as a real (not invented) provenance axis already present in the WhatsApp corpus.
- **package**: `connectivity='bidim'` (cross-linked cluster) is effectively a lightweight package signal that predates and parallels `research_package_cluster` — same underlying idea (grouped-claim membership), different corpus (WhatsApp vs excel_import), same target structure (`nodes type='convergence'`).
- **PASS/FAIL: PASS**.

### Case 8 — הישועה בימינו 644 - אתבש - 1100 לפני (multi-method, MISMATCH)
- **research_object?** Once someone decides this claim needs individual review — yes, wrapping: `{statement:"הישועה בימינו = 1100 באתבש", engine_verified:false, engine_detail:{method:'אתבש', claimed:1100, computed:788, delta:312}}`.
- **This is exactly what `research_objects.engine_detail` (jsonb) already exists for** — no new columns needed for "claimed vs. computed vs. delta."
- **Alternative/complementary home**: `relation_evidence` (the newly-found Atlas table, Part 0 #9) already has the *exact* shape `{method, value, engine_verified, status}` for a two-phrase relation — but this case is a single-phrase method claim, not a phrase↔phrase relation, so `relation_evidence` is the wrong fit here; `research_objects.engine_detail` is correct. This distinction matters: **not everything method-shaped belongs in the same table** — the model must route by claim *shape* (single-phrase-claim → research_objects; phrase-pair-relation → relation_evidence), and both already exist.
- **method**: `method_mention_type=multi_method_instruction`, `method_claim_status=unresolved_mismatch`, `reason_class=insufficient_context` — all three facts (mention/claim/verification-result) are already separably tracked in my enrichment layer, none of them overwrite each other, matching Decision E's requirement exactly.
- **PASS/FAIL: PASS**.

### Case 9 — ברית בין הבתרים רגיל 1331 ועוד ∆ 5430 (method MATCH)
- Mirror of case 8 but `engine_verified:true`, `historical_method_convention='value-then-רגיל-suffix'` — proves the same `research_objects.engine_detail` shape carries a **positive** verification exactly as easily as a negative one; no schema branch needed for match-vs-mismatch.
- **PASS/FAIL: PASS**.

### Case 10 — ...רת 337 / "צמח דוד...644" (candidate method WITH anchor evidence)
- **method**: `method_mention_type=candidate_method`, `method_claim_reason='candidate_method:ר"ת (רת)'`. Per the locked `method_lifecycle` rule (known→reconstructed→candidate→verified→canonical) **and** the fresh `gematria_methods_catalog` v2 rule (registry-driven, no hardcoded counts), this candidate is NOT added to `gematria_methods` — it stays exactly where it is: a `candidate_method` tag on the mention, with the 644-anchor hypothesis recorded as *evidence*, not as a formula.
- **Where does the anchor-evidence itself live?** Not on `gematria_words` (would pollute the row with an unverified guess) and not yet in `gematria_methods` (would fake canonicity). It belongs in a `research_objects` row: `{kind:'method_hypothesis', statement:'רת(צמח דוד)=644, spelling-invariant', engine_verified:false, status:'candidate', evidence:'644 recurs 6+ times across דוד/דויד spellings; not equal to any live method output on the same phrase'}` — this is a **claim about a method**, which is exactly what `research_objects` already supports (Decision A), not a new "candidate methods" table.
- **PASS/FAIL: PASS**.

### Case 11 — עד מתי קץ הפלאות (רגיל ו ∆ ישר והפוך) (candidate WITHOUT anchor evidence)
- Same routing as case 10, but the `research_objects.evidence` field would honestly say "no recurring value, no reconstructable definition" — proving the model doesn't need a *different* structure for a stronger vs. weaker candidate, only a different value in the same `evidence`/`confidence` fields. `candidate_definition_status` (insufficient_definition vs. the medium-confidence case 10) is exactly a value, not a schema fork.
- **PASS/FAIL: PASS**.

### Case 12 — אלף עד תיו במילוי (numeric-word, word-form present)
- **numeric-language**: `numeric_word_category='ambiguous'` (flagged, not force-resolved) — this is a **word→number-recognition** direction case: the text already contains a numeric-word construct ("א׳ עד ת׳", an aleph-to-tav range) combined with a method reference ("במילוי"). It proves numeric-word and method-mention can coexist on **one row** without either overwriting the other (two separate DNA dimensions, same record) — direct evidence for Decision F needing separate slots, not a single flattened field.
- **PASS/FAIL: PASS**.

### Case 13 — שנת 2448= לפני (Hebrew/AM year)
- **year/event**: `year_hebrew='שנת 2448 (למניין בריאת העולם - AM, לא לועזי)'`, `yeartime_category='year_in_phrase'`. This is stored as free text in my v3 enrichment layer; the *architectural* target is an edge to `nodes type='year'` (12 exist live per the Crosswalk) — proving temporal facts route to existing year-nodes, not a new timeline table (Decision D).
- **PASS/FAIL: PASS** — with one honest caveat: a `nodes type='year'` node for AM-2448 specifically may not exist yet among the 12 (not checked live — would need to at build time, not proof-of-model time). Not a `MISSING_CAPABILITY` (the *mechanism* — edge to a year-node — already exists), just a **data-completeness gap** to fill later.

### Case 14 — שם י ה ו (Gregorian year + multi-method-documented claim)
- **year/event**: `year_gregorian='2015-2016'`, `yeartime_category='research_year'` — same mechanism as case 13, proving both calendar systems route through the same `nodes type='year'` edge pattern, not two different structures.
- **source_claim_rule**: `verified_multi_method_documented` — this researcher documented the value across multiple methods at once; this is a `research_objects` row with `engine_detail` holding an array/object of method→value pairs, still one row, still no new table.
- **PASS/FAIL: PASS**.

### Case 15 — וְקָרָאת אֶתְכֶם הָרָעָה...-1820- מילוי... (landmark, TARGET not RESULT)
- **This is the case that stress-tests Decision F's four-way separation most directly.** `landmark_target_flag='yes'`, `method_claim_reason='value_is_target_not_result'`: 1820 here is **not** a computed gematria value of anything in the phrase — it's the *research target the author is aiming the phrase at* ("here's a phrase, and I claim it connects to 1820" — not "I computed 1820 from this phrase"). If this were modeled the same way as a normal method-claim, it would be silently and wrongly treated as a mismatch (claimed=1820, computed=788-or-whatever) instead of what it actually is: a **relationship claim to the 1820 landmark**, structurally closer to `relation_evidence` (a_phrase↔b_phrase-style relation, here phrase↔landmark-number) than to `research_objects.engine_detail` (single-phrase computed-value claim).
- **theme/method/numeric/year**: N/A directly — this row's real content is the *edge*, not a value.
- **edges**: `gematria_words row --targets--> nodes(number=1820)` — a distinct edge type from `--computed_value_of-->`. This distinction (target-of vs. value-of) is not something the current v3 CSV enrichment enforces as a *typed* edge yet — it is currently only visible via `landmark_target_flag` (a boolean I added). **This is the one clean edge-typing gap the model needs before build** (see Part 4).
- **PASS/FAIL: PASS**, with a named edge-type gap flagged in Part 4 (not a new table — a controlled vocabulary value on an existing `edges.relation`-type column).

### Case 16 — המלך 1335- גדול ואותיות -לפי אחד (genuine multi-dimension)
- STEP2 resolution: `dimensions='numeric_instruction_suffix|method_instruction'`, `decision='multiple_valid_dimensions'` — **this row legitimately carries two DNA facts at once** (an instruction-suffix pattern "לפי אחד" AND a method mention "גדול ואותיות"), and STEP2 deliberately did **not** force it into one `corpus_role`.
- **This directly proves the multi-dimension requirement**: the DNA model must allow **N tags per record**, not one enum. `MASTER_CLASSIFICATION_v3.csv`'s own structure (27 separate columns, independently populated) already demonstrates this in CSV form; the live-DB equivalent is exactly what `edges`/`tags`/`research_objects.relates[]` already provide — multiple simultaneous relations off one row, no forced single-value classification.
- **PASS/FAIL: PASS**.

### Case 17 — צופן משיח (`world='ספירות'`, `category='מספר-אם 1234'`)
- **theme(s)**: single clean world+category pair, live on the row today (World Tagger, confirmed ACTIVE by the prior Crosswalk's code sweep) — nothing to build, this already works.
- **PASS/FAIL: PASS**.

### Case 18 — המשיח צומח בזמן הזה (`world='גאולה'`, `category='משיח'`)
- **theme(s)**: **two simultaneous theme-facets on one row** — `world` (broad semantic domain) and `category` (narrower subject tag) are *already* two independent columns, not one. This is real, live, present-day proof that SOD1820's theme model is **already multi-axis**, not single-taxonomy — directly answers the "multiple themes for the same record" requirement without inventing anything.
- **Caveat surfaced, not solved here**: this only gives 2 axes (world × category), each single-valued. It does **not** yet prove N-many *arbitrary* themes per record (e.g., "also tag this with גאולה AND גימטריה AND פרה אדומה simultaneously") — that would need `edges` to `nodes type='theme'` (multiple edges, unbounded), which is architecturally available (One Tree) but not the *currently active* UI/write-path (World Tagger writes one `world` + one `category`, not N edges). Recorded as a real open item in Part 4, **not** a MISSING_CAPABILITY (the *edges* mechanism exists; only the *UI convention* is single-valued today).
- **PASS/FAIL: PASS** (for the 2-axis case actually tested); **caveat, not fail**, on N-axis.

### Case 19 — סוד → "secret" (en) via `word_aliases`
- **This is the live, working precedent for both "multilingual identity" and "name/word expansion."** `word_aliases` (FK'd to `gematria_words.id`, `alias` + `lang` columns, admin-managed via `admin_manage_alias`, auto-populated by `wa-process`) already does exactly what IDENTITY-DNA's lang-tag requirement (Part 0's Zuriel-constraint box) asks for: `{phrase, lang}` pairs off a canonical word, not a duplicated corpus per language.
- **A future new word/name entering the system** (per Decision G) would go through the same path: land in `gematria_words` (or its future DNA-view) once, get its calc-time values once, and pick up `word_aliases` rows for every language variant — never a second `gematria_words`-like table per language.
- **PASS/FAIL: PASS**.

### Case 20 — 1820 → number-to-word generation (FUTURE-ONLY, architecture stress test)
- **No live row backs this case — by design.** Per the task's own scope, this capability is not built and must not be built now; only the architecture must be shown not to require a redesign when it is.
- Walking the four facts Decision F requires kept **permanently separate** (see Decision F below for the full rule), instantiated on 1820 specifically:
  1. `1820 → "אלף שמונה מאות ועשרים"` (word-form spelling of the number) — a **generation output**, would live as `engine_detail={method:'number_to_word', direction:'generate', lang:'he', form:'word'}` on a `research_objects` row of `kind='generated_expression'`. Never written into `gematria_words.phrase` (that column is for real corpus phrases, not synthetic ones).
  2. `1820 → "אחד שמונה שתיים אפס"` (digit-reading form) — same shape, `form:'digit_read'` — a **different value** in the same slot, not a competing table.
  3. **The gematria value OF an expression** (e.g. `ragil("אלף שמונה מאות ועשרים") = ?`) — this is the *existing*, already-built direction (word→number via the live calc engine) — completely different fact from #1/#2, and already has a home (`gematria_words.ragil` etc., or `relation_evidence`/`research_objects.engine_detail` for an ad-hoc phrase not in the corpus).
  4. **The 1820-landmark/target relationship** (a phrase *pointing at* 1820 as a research anchor, same shape as case 15) — again a distinct fact from all three above; an edge (`--targets-->`), not a value.
- **The proof**: all four facts route to structures that already exist (`research_objects.engine_detail` jsonb for generation output/method-transform records, the live calc engine + `gematria_words` columns for word→number, and a `--targets-->` edge type for the landmark relation) — **zero new tables, zero new columns**, provided the `--targets-->` edge type from case 15 gets formalized (same gap, not a new one).
- **PASS/FAIL: PASS** (architecture-only; the same single edge-type gap as case 15 is the only thing this case surfaces, not a new one).

---

## PART 3 — ARCHITECTURAL DECISIONS A–H

**A. `research_objects` as a claim/research wrapper (never copies the row).** Confirmed across cases 4, 5, 8, 9, 10, 11, 14: in every case, `research_objects` wraps a *statement about* a `gematria_words` (or synthetic, case 20) phrase — `statement`/`engine_detail`/`evidence`/`status`/`owner_person_id`/`privacy_scope` — and never needs to duplicate `phrase`/`ragil`/etc. The row is referenced (`source_ref`), not copied. **Confirmed. No hack needed.**

**B. Themes/Worlds via `nodes`+`edges`, 0–N, no taxonomy unification.** Cases 17/18 show the *current* live mechanism (`world`+`category`, 2 fixed axes) already supports "≥1 theme, 2 independently-set facets" without any table change. True N-many arbitrary theme edges (beyond those 2 axes) is architecturally available (One Tree: `nodes type='theme'` + edges) but not the active write-path today. **Not a schema gap — a scope decision for later** (whether/when to let a record carry more than world+category). No unification of the 44 (`nodes.metadata.world`) vs. 5 (`gematria_words.world`) worlds is proposed or needed here, per the task's explicit instruction not to do that yet.

**C. Packages as membership/relations, not copied lists.** Cases 4 and 18 both touch `messianic_claim_linked` from two different angles (a personal restricted claim, and a public thematic record) without either copying the other's data — `research_package_cluster` (my enrichment layer) maps 1:1 onto the existing, already-working `topic_cards → nodes type='convergence'` promotion pipeline (204 approved, code-consistent per the Crosswalk). **Confirmed. No hack needed.**

**D. Temporal via edges to `nodes type='year'/'event'`.** Cases 13/14 show both Hebrew(AM) and Gregorian years reduce to the same edge-shape, just a different `nodes type='year'` target — no new timeline table. Caveat: whether a year-node for AM-2448 specifically exists is a **data-completeness** question for build time, not an architecture gap. **Confirmed.**

**E. Methods — five facts kept separately, never merged.** Cases 8/9/10/11 prove, with real data, that `method_mention_type` / `method_claim_status` (claimed value) / `engine_verified`+`engine_detail` (engine result) / `historical_method_convention` (historical-claim framing) / `candidate_method_dependency`+`evidence`/`confidence` (candidate-method framing) are five genuinely separable facts about one phrase, and none of them ever overwrite one another in the v3 enrichment (nor would they need to in `research_objects.engine_detail`, which is jsonb and can hold all five as sibling keys). ר"ת, ס"ת, and "רגיל ישר והפוך" are **not** added to `gematria_methods` — consistent with `method_lifecycle` (known→reconstructed→candidate→verified→canonical, human-gated at every promotion) and the fresh `gematria_methods_catalog` v2 rule. **Confirmed.**

**F. Numeric Language — bidirectional, four facts never merged.** Cases 12, 15, and 20 together prove all four required facts route to distinct existing structures: (1) word-form generation and (2) digit-reading generation are two values of the same future `engine_detail={method:'number_to_word', form:...}` slot (not built, but same slot per Zuriel's Gate-#1 constraint); (3) the gematria value **of** an expression is the *existing*, already-live word→number direction (`gematria_words` calc columns / `relation_evidence`/`research_objects.engine_detail` for ad-hoc phrases); (4) the landmark/target relationship (1820, case 15) is an **edge**, categorically different from a computed *value*. **Confirmed — with one concrete build item, not a redesign**: a formal `--targets-->` edge-type/relation-vocabulary entry is needed before (4) can be represented cleanly; it's a controlled-vocabulary addition on the existing `edges` relation-type field, not a new table or column.

**G. Names/Words/Multilingual — reuse `word_aliases`, no parallel corpus.** Case 19 is a live, already-working proof: a new word/name would enter through the same intake as any `gematria_words` row, then acquire `word_aliases` rows per language/variant — exactly matching `content_translation_law`'s existing pattern (source-lang + auto-distribution), and exactly matching Zuriel's Gate-#1 lang-tag requirement for IDENTITY-DNA. **Confirmed. No hack needed.**

**H. Access — shadow-only resolution from the 3 existing signals, across all 20 cases.**

| # | `visibility_tier` | `space` | `nodes.metadata.tier` | Shadow-resolved access (illustrative only, nothing written) |
|---|---|---|---|---|
| 1 | 3 | core | n/a (no node) | tier-gated, core space |
| 2 | 2 | core | (node exists — not queried live, out of scope) | tier-gated, core space, possibly a second tier value on the node — **this is exactly Open-Question #3 from the Crosswalk, reconfirmed live and still open** |
| 3 | — | — | — | `public_core` corpus_role implies open display |
| 4 | — | — | — | `do_not_display` (my enrichment) → most-restrictive |
| 5 | — | — | — | `personal_or_restricted` → restrictive |
| 6 | — | — | — | unpromoted/flagged → most-restrictive by default |
| 7 | — | — | — | `research_package`, verified → open-ish, pending normal Human-Gate |
| 8–16 | (not queried live per-row; same 3-signal model applies uniformly) | | | |
| 17/18 | — | — | — | world/category-tagged, no extra access implication |
| 19 | — | — | — | alias inherits the base word's access, no separate access model |
| 20 | n/a (no row) | n/a | n/a | future generated content would need its own access default — **flagged in Part 4** |

No fourth field was added anywhere in this exercise. The one genuine open item — reconciling `visibility_tier` vs. `space` vs. `nodes.metadata.tier` when a record has **all three** and they might disagree (case 2 is a live example of a record with both a `visibility_tier` and a promoted `node_id`) — is **Open-Question #3 from the Crosswalk, still unresolved, not new**. It is not blocking DNA v1 (nothing in the 20 cases needed a 4th signal), but it should be closed before ACCESS-DNA is finalized.

---

## PART 4 — REAL MISSING_CAPABILITY LIST (only things a case actually proved are missing)

1. **`--targets-->` (or equivalent) edge-type vocabulary entry**, distinct from `--computed_value_of-->` / `--relates_to-->`. Surfaced by cases 15 and 20. This is the **one** genuine build item this whole pack produced — and it is a controlled-vocabulary value on the existing `edges` relation-type field, not a new table, column, or engine.
2. **Open-Question #3 (3-way tier reconciliation: `visibility_tier` / `space` / `nodes.metadata.tier`)** — re-confirmed still open by case 2 (a record that already has two of the three signals live at once). Carried over from the Crosswalk, not created here.
3. **Open-Question #2 (44 vs. 5 worlds; `gematria_words.world` vs. `nodes.metadata.world` unsynced)** — re-confirmed still open by case 2 (a graph-linked word whose theme, if any, would live on the node's metadata, not on the `gematria_words` row that has `world=null`). Also carried over, not created here.
4. **N-many arbitrary theme-edges per record** (beyond the current 2-axis `world`+`category`) is architecturally available but not the active write-path (case 18's caveat). Not a schema gap — a scope/UI decision for later, explicitly not to be solved now.

Everything else tested — `research_objects` as wrapper, package-as-membership, temporal-as-edge, the 5-way method separation, the 4-way numeric-language separation, multilingual via `word_aliases`, 3-signal access — **passed without needing anything new.**

---

## PART 5 — HACKS AVOIDED (explicitly, by choosing the structure above instead)

- Did **not** flatten case 8/10's "claimed vs. computed vs. delta" into a single text note — used `engine_detail` jsonb's existing sibling-key capacity instead.
- Did **not** promote case 10/11's candidate methods into `gematria_methods` "just to have somewhere to put the anchor evidence" — kept them as `research_objects` hypotheses, per `method_lifecycle`.
- Did **not** treat case 15's `landmark_target_flag=yes` as an ordinary mismatch (which the raw claimed-vs-computed delta would suggest) — recognized it as a different *kind* of fact (a target relation, not a value claim), avoiding a false "engine got it wrong" read.
- Did **not** invent a parallel "sensitive content" boolean for case 6 — routed it through the same tier/space access model as everything else.
- Did **not** merge case 17/18's `world` and `category` into one combined tag — kept them as the two independent axes they already are live.
- Did **not** create a synthetic `gematria_words` row for case 20's 1820 word-forms — kept generation output strictly in `research_objects`/`engine_detail`, off the canonical-phrase table.
- Did **not** build a second multilingual corpus table for case 19 — reused `word_aliases` exactly as-is.
- Did **not** try to reconcile the 3 tier signals or the 44-vs-5 worlds split "along the way" — left both explicitly open per the task's own scope boundary, rather than quietly deciding them inside a proof-of-model.

---

## PART 6 — READINESS DECISION

**Research DNA v1 is architecturally ready.** All 20 cases, deliberately chosen to stress every required category (public/package/vocabulary/thematic/personal/WhatsApp/attribution/source-claim/method/multi-method/candidate-historical-method/match/mismatch/numeric-word/Hebrew-year/Gregorian-year/single-theme/multi-theme/messianic-package/multilingual/landmark, plus a pure future-capability test), pass without requiring a new table, a new tree, a new taxonomy, or a behavior change to the legacy site. The only concrete build item is a single controlled-vocabulary edge-type (#1 in Part 4) — everything else that looked open (Open-Questions #2/#3) is pre-existing, already flagged, and explicitly out of this pack's scope to resolve.

**Proposed next order (architecture only — no code/schema/migration approved by this pack itself):**
1. **DNA foundation** — formalize the derived-view (not table) that reads across `gematria_words` + `research_objects` + `relation_evidence` + `edges`/`nodes` + `word_aliases`, and add the one edge-type vocabulary entry from Part 4 #1. This is the only genuinely new artifact this whole exercise produced.
2. **Methods** — wire the 5-way separation (mention/claim/engine-result/historical-claim/candidate) into `research_objects.engine_detail`'s convention for real (not just CSV), still with zero writes to `gematria_methods` for candidates.
3. **Numbers↔words** — build the generation-slot (`engine_detail={method:'number_to_word', direction, form, lang}`) per Zuriel's Gate-#1 answer; the word→number direction needs no new work, it's live.
4. **Names/words expansion** — extend intake so a new word/name enters once and picks up `word_aliases` rows, same as case 19, formalized as the standard path rather than an ad-hoc one.
5. **Multilingual** — layer `content_translation_law`'s existing 8-language distribution on top of step 4, no new mechanism.

Per the explicit scope boundary given with this task, **none of steps 1–5 are started here** — this pack stops at the readiness decision and the ordered list.

---
*Proof-of-Model complete. READ-ONLY throughout — 0 migrations, 0 schema changes, 0 UI, 0 writes to `gematria_words`/`research_objects`, 0 Roadmap/Master-State edits, 0 deploys.*
