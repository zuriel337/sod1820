# EXP-12 pilot — does a model recognise several words as one shared structure? (pre-registration, 28.10.2026)

Written and committed **before** the pools are built for the report and **before** the saved cipher's known findings are read. What is already known when this is written: the matrix of the saved cipher "אורניום"
(engine: one hit, start 81020, forward, skip 10101 = the matrix width, rows 8-14 of column 212, md5-verified window in EXP-16 case U1), the sizes produced by an exploratory run of the generator on the real window
and three tiles (about 5,600 candidates of 4-9 letters per window; a shortlist of about 300; about 3,300 relations; no target, no saved record was used), and the user's statement that the cipher holds two known
parallel words. **The two words are not written anywhere in code, prompts or this file.**

## 1. Question and approval

ZURIEL's question: if a cipher contains a finding such as two words that run parallel to each other, will the system find it and understand that it is a strong structure of the cipher, rather than picking single words?
Approval (28.10.2026): the EXP-12 pilot, **up to USD 8**, inside the USD 40 total cap for all experiments; verify the balance before every run; no Production deployment and no use of the temporary function without an
appropriate approval. Spent so far (actual, ledger corrected after EXP-16): USD 28.72293; remaining of the cap USD 11.27707. Nothing may create an engine, a Provider, a conversation or an AI route.

The pilot separates five questions and never merges them:
1. **Pool:** are the two known words in the candidate pool? (a miss is a *pool-creation failure*, never a model failure)
2. **Geometry:** is their geometric relation computed and represented correctly in the pool?
3. **Selection:** does the model choose to show them together as one group, and does it say why?
4. **Calibration:** what is their rank, and how many similar groups do control windows produce?
5. **Free proposals:** with no story and no topic, what words, phrases and continuations does the model propose, and how many survive verification?

## 2. The matrix and the region

* Cipher "אורניום": scope Torah, skip 10101. The saved record has no start index; the occurrence is the engine's **only** hit (`els_search_page_v1`, skip 10101..10101, no continuation). Stop and report if it were not unique.
* Matrix width W = 10101. The Torah has 30 full rows and a partial row of 1,775 letters. **Region** = rows 0-30 (all 31) x columns 162-262 (101 columns, the axis column 212 in the middle), 3,131 cells. The axis cells are
  the seven letters in rows 8-14 of column 212. The region's letters are read from the page copy of the Torah, whose first 304,805 letters equal `public.torah_stream` by md5 (`0066c243…`); the whole region is also compared with
  the table by an md5 computed in SQL.
* **Control tiles:** same shape (31 rows x 101 columns) in columns that every row has (0-1,774), not overlapping the real region or each other; 12 tiles drawn by `mulberry32(seed)` with seed label
  `EXP12P-control-tiles-v1`; the pseudo-axis of a tile is its middle column over the same rows (8-14), seven letters with no meaning. Controls get exactly the same pipeline.

## 3. The candidate pool (generator, then engine)

* **Line families** (steps, both reading directions): R (0,1) skip 1; C (1,0) skip W; D1 (1,1) W+1; A1 (1,-1) W-1; D2 (1,2) W+2; A2 (1,-2) W-2; C2 (2,0) 2W; K1 (2,1) 2W+1; K2 (2,-1) 2W-1; K3 (2,2) 2W+2; K4 (2,-2) 2W-2.
  Family R is plain text of the Torah (skip 1), not an ELS; the others are ELS skips. Everything else (skip 3W±k, small skips, wrapped lines) is **not generated** — stated limitation.
* **Word list** = union of (G) single words of `public.gematria_words` visible to the public key and (T) forms of the Tanakh text (`public/tanakh-verses.json`) that occur at least twice; folded finals, letters only, **length 4-9**.
  `public.maftech_lexicon` (43,510 words, 1,987 not in the Tanakh) is **not** used: the public key cannot read it. Not covered by construction: abbreviations, proper names, modern words that neither source contains,
  spelling variants, words shorter than 4 or longer than 9 letters, words that occur once in the Tanakh and are not in G.
* **Candidates** = every occurrence of a word-list word along a registered family inside the region, maximal per reading (a word wholly inside a longer found word on the same reading is dropped), palindromes once.
  Words made only of the axis' own letters are excluded ("inside"). Each candidate carries: word, family, direction, start, skip, dir, cells, positions, the up-to-6 letters before and after it on its line (inside the region),
  and the chance expectation E = 2 x (N - (L-1) x skip) x product of the Torah's letter frequencies (ELS only).
* **Shortlist (K = 300), fixed now:** tier A = candidates that cross or continue the axis (cap 120); tier B = candidates related (continuation, same line, crossing, parallel with offset <= 3, or near) to a tier-A item
  (cap 100); tier C = the longest remaining candidates anywhere in the region with at least 6 letters, until 300. Within a tier: longer first, then smaller E, then alphabetical, then position. **Item ids are assigned by
  position in the region (top to bottom, then by column), never by tier or strength.**
* **Engine confirmation:** every shortlisted ELS item is confirmed by `els_verify_occurrence_v1` (state MATCH); skip-1 items are confirmed as plain text of the stream. An item the engine does not confirm is dropped and counted.
* **Generator check against the engine** (read-only, before any pool is used): for a seeded sample of 60 word-list words and every ELS family, the engine's occurrences wholly inside a window are compared with the generator's
  unfiltered occurrences of the same words (`review/generator-vs-engine.json`). Equality on the sample is what "the generator equals the engine on the registered families" means; it says nothing about words outside the sample.

## 4. Relations (computed from cells only)

`continuation` (same line, overlapping or touching), `same_line` (same line, 1-6 letters apart), `crossing` (different families, shared cell), `parallel` (same family, different lines, perpendicular offset <= 6 cells
(rounded to 0.1), overlap along the line >= 2 cells; also records whether the two readings run the same way), `near` (none of the above, Chebyshev distance <= 1). Each item also has a relation to the axis
(crossing, continuation, near, parallel with offset, none). Relations are computed between all shortlisted items; the packet lists them all (after a size check, section 6).

**Pair score for rank (deterministic, no model):** for a pair with relation parallel or crossing or continuation: (relation priority continuation > crossing > parallel), then the larger sum of letters, then the smaller product of E.
"Similar groups" in a window are pairs of items with >= 4 letters each, ELS, `parallel` with offset <= 3 and overlap >= 3 (PP); the sub-counts PPA (both items attached to the axis, tier A) and PXA (both cross the axis).

## 5. Known findings (kept outside every prompt)

The saved record's stored findings are read **only after** the pools of the real window and of all control tiles exist and are committed. They are copied into `evaluation/saved-cipher-u1.json` (never imported by the
library, the prompts or the orchestrator; a test enforces it) together with the record id and the time of reading. Cells and relations are computed from the stored `skip_dir_start` entries after checking them against
the Torah letters. Outcomes of questions 1-2 (pool, geometry) are computed offline and reported before any model is called. **If a known word is not in the pool, that is reported as a pool-creation failure with its reason**
(not in the word list / outside the region / outside the families / cut by the shortlist), and the blind arms are *not* re-run with a pool tuned to it. A **diagnostic** pool that adds the known words as ordinary items
(same format, no wording about them) is a separate, labelled arm.

## 6. Arms, models, settings (blind and diagnostic never pooled)

All requests are Message Batches through the temporary request-locked function (only after ZURIEL's explicit approval, with the exact hashes below), single round, structured JSON output, no tools, no forced tool use,
no fallbacks. Models and settings: **Fable 5.1** `claude-fable-5-1` (thinking always on, summarized, effort medium, max_tokens 48,000); **Sonnet 5.5** `claude-sonnet-5-5` (adaptive, summarized, effort medium, max_tokens 32,000);
**Haiku 5.5** `claude-haiku-5-5` (adaptive, effort medium, max_tokens 32,000). A call that ends without a usable answer is recorded and **not** retried.

**Blind arms** (the prompt contains the pool, the relations and the task only):
* **B1** real region, axis marked but **unnamed**, no story, no topic: Sonnet x3, Haiku x1, Fable x1.
* **B2** real region, axis named (the cipher's phrase, from the region data), no story, no topic: Sonnet x2, Fable x1.
* **B3** control tiles, axis marked and unnamed (same prompt as B1): Sonnet x1 on each of 6 tiles, Fable x1 on 2 of them, Haiku x1 on 2 of them.

**Diagnostic arms** (labelled, reported apart, never counted as blind success):
* **D1** pool-forced: the real region's pool with the known words added as ordinary items (prompt of B2): Sonnet x2, Fable x1.
* **D2** structure hint: one added paragraph saying that groups of words running parallel to each other are of interest (no word, no cipher): Sonnet x1 on the real region (prompt of B1 + paragraph).

**Task text (fixed, same wording in every arm):** from the pool of verified findings and their computed relations, (1) propose groups of two or more findings that you consider one shared structure, ordered by your priority, each with the
ids, the relation ids you rely on, a type (pair / chain / cluster) and a short reason; (2) propose single findings that stand out and say why; (3) propose phrases made of findings that continue each other on one line (ids in order),
and continuations (a finding extended by the letters shown before/after it, as letters only); (4) state in one line which relations you consider chance; the answer uses ids and the letters shown, never new words, positions or numbers;
`story_related` does not exist. The packet states what E means and that most relations in such a pool are chance. The axis name appears only in B2, D1.

**Validation (no model):** unknown ids, ids in two groups, digits in free text, relation ids that do not exist, a continuation whose letters are not exactly the finding plus letters shown, and a claimed relation that is not in the
computed list are all recorded as errors (not silently fixed). Every proposed continuation is confirmed by the engine like any other occurrence.

**Budget guard:** one ledger for the pilot (`controls/budget-ledger.json`), the pilot cap USD 8 and the total cap USD 40 (prior spend 28.72293 recorded as the first entry); before every call the guard prints the balance, reserves
the worst case (batch price x max_tokens + input), refuses a call that would pass the pilot cap, and releases the reservation on a definite 4xx refusal; priority order B1(Sonnet, Haiku), B2(Sonnet), B3(Sonnet), then the Fable
arms, then diagnostics, then the remaining Haiku/Fable controls. Nothing is deployed and no call is made before the explicit approval.

## 7. Metrics (all descriptive; no test statistic is claimed)

Pool: candidates per window, shortlist composition by tier, relation counts by type, engine-confirmed fraction, generator-vs-engine equality, known words (in word list? in region? in families? in candidates? in shortlist?).
Geometry: for the known pair, the relation computed from the saved positions versus the relation in the pool's list (type, offset, overlap, same-direction). Rank: pair-score rank among all pairs in the real pool and
the number of control tiles whose best PP/PPA/PXA pair scores at least as high. Model: groups per answer, sizes, share of group members connected by a computed relation, relation types used, E of members (share with E >= 1),
whether a group holds both known words, its position in the model's ordering, whether the reason names the relation, phrases/continuations proposed and engine-confirmed, errors, tokens, time, cost. Stability: the same arm repeated.
Controls: the same model metrics on tiles; "similar groups" = groups holding a PP pair.

## 8. What each outcome means (fixed now)

* A known word missing from the pool is a *pool-creation failure*; it says nothing about the model.
* If both words are in the pool and their relation is represented, and a model puts them in one group with a reason that names the relation, that is **selection of a structure**; it is *not* evidence that the structure is meaningful
  or non-chance: four-letter words give about two chance parallel neighbours per word in a window this size, and the controls measure exactly that.
* If controls produce groups of the same kind at a similar rate, the structure is not distinguishable from what the method produces anywhere; the pilot then answers "can the model recognise a structure", not "is the structure rare".
* A diagnostic success (D1, D2) shows only what the model does once the pool contains the words, or once it is told what kind of structure to look for.
* Run-to-run differences inside an arm are reported; one answer is not a result.
* A negative result is about these settings (pool recipe, prompt, models), not about the research direction.

## 9. Known limits (reported again in the results)

Word-list coverage; line families beyond the registered ones; region bounds (a structure outside the 101 columns is invisible); the shortlist cut (K = 300, tier rules); words of 4-9 letters only; E treats letters as independent;
the control tiles are neighbours in the same text and not independent; n is small; the saved findings are post-hoc picks of a human; the model's reasons are interpretation; thinking can exhaust max_tokens (as in EXP-16).

## Amendment 1 (28.10.2026, before any pool is engine-confirmed for the report, before the saved findings are read, before any call)
Sizes of the exploratory run settle three details that section 2-6 left open:
* **Control tiles** are the slots of 101 columns that fit inside columns 0-1,774 (17 slots: columns 0-100, 101-201, ...), minus the slots that overlap the real region (columns 101-201 and 202-302), i.e. 15 slots;
  **12 of them are drawn by a seeded shuffle** (`mulberry32`, seed label `EXP12P-control-tiles-v1`). (Random placement without overlap could not fit 12 tiles.)
* **Packet relation filter** (the pool data keeps every relation; the packet lists): all `continuation`, `same_line` and `crossing`; `parallel` with offset <= 3 and overlap >= 3; `near` only when both items have >= 5 letters.
  Every item also states its own relation to the axis (including `near`), so nothing about nearness to the axis is dropped. Real pool: 1,689 of 3,283 relations are listed (about 25K tokens). What the filter omits
  (parallels farther than 3 cells, near pairs with a 4-letter member) is a stated limit.
* **Generator check** (`review/generator-vs-engine.json`, 600 engine calls, 60 seeded words, 10 ELS families): the generator and the engine returned exactly the same occurrences inside the real window (28 = 28) and inside a
  second window (33 = 33); no occurrence only on one side. Read-only; no saved record or target was used.

## Amendment 2 (28.10.2026, after the pools were committed at 172344dc0 and the saved record was read; before any call)
What reading the saved record changed, stated before any model result exists:
* **The record stores words and colors only** (`positions.findings` = `[{t, color}]`): no skip, direction or start. Section 5 expected `skip_dir_start` entries; there are none. The occurrences of the saved words were
  therefore **located by an exhaustive search in the region** (`evaluation/locate-saved.mjs`: every occurrence along the registered families, both readings, whatever the word list says) and **all** are reported; none was
  chosen. A second search along steps outside the registered families (|dr|, |dc| <= 4) is reported only as a limit of the families (it found two more occurrences of one word).
* **D1 (pool-forced)** is built generically (`evaluation/build-d1.mjs`): the real pool plus every located occurrence of a saved word that the pool lacks **because the word is not in the word list** (6 items; the saved
  word that is in the list keeps whatever the shortlist gave it). The added items have exactly the fields of every other item, are engine-confirmed through the same function, and the ids of the whole pool are re-assigned by
  position. Which ids were added is kept in `evaluation/d1-forced-ids.json`, outside the pool file the prompt builder reads. D1 is a diagnostic arm; it never counts as blind success.
* **The relation of the known pair is not "parallel"** (computed, section 4 definitions): see `results/offline-q1-q2.md`. The registered score (continuation / crossing / parallel) therefore does not rank it, and the
  registered PP/PPA/PXA counts do not describe it. Two **post-hoc** measures are added and are labelled post-hoc wherever they appear: *collinear pairs* (same line, gap <= 2, both ELS, >= 4 letters) and *tight groups*
  (connected groups of ELS items >= 4 letters under same-line gap <= 2 or parallel offset <= 1 with overlap >= 3; crossings and nesting are left out because they chain a whole pool into one component). They are
  descriptive and were chosen after the pair was seen; they carry no test statistic.

## Amendment 3 (28.10.2026, after the offline results of Amendment 2, before any call)
* **Mirrored plain-text readings are not candidates.** Family R is the plain text of the Torah (skip 1) and is confirmed against the stream only; the engine does not answer skip 1 (`CONTEXT_REQUIRED` / `NOT_TESTED`
  for both directions). The first pools contained 3-10 items per window read backwards along a row ("R−"), which are neither text nor engine-confirmable, while the packet described every R item as plain text.
  `scanWindow` now skips the reversed reading of family R; **all 13 pools were rebuilt** (same word list, same recipe, 0 engine drops, window md5 unchanged), D1 and every offline figure were recomputed, and the results
  note was updated. No model had been called.
* **Counts and order (cost).** Fable on control tiles is dropped (two calls of up to about USD 1.5 each); Fable remains on B1, B2 and D1. The final plan is `lib/plan.mjs` (22 runs; the review lists every request hash).
  A **free-proposal arm F** is added for the "no story, no topic, propose words, phrases and continuations" part of the request: the EXP-16 case-U1 request (window letters of 31 rows × 41 columns, axis phrase given, v3 prompt)
  unchanged except for the model, Sonnet × 1 and Haiku × 1; every proposal is verified by the engine; compared with the saved words only afterwards. It is the only arm in which a name or an abbreviation can be proposed at all.
* **Pilot ledger and guard.** `controls/budget-ledger.json`: first entry the prior spend (USD 28.72293); hard guard = prior + 8 (a call is refused if spent + its worst case would pass it), no new call above prior + 7,
  diagnostic arms (priority >= 4) only while the settled spend is at most prior + 6. Worst case = batch price × (input × 1.25 + max_tokens × output price); reserved before the call, replaced by the actual cost.
* **Axis phrase in the real pool.** The first committed pools stored `axis.term: null` for the real region (the phrase was read from the wrong field of the engine record), which would have printed „null” in the arms that
  name the axis. Found while building the requests, before any call; the pools were rebuilt once more (items, relations and window md5 identical; only `axis.term` = the phrase as given, in the real pool and D1), and
  the tests now check the phrase in every request that names it and the absence of placeholders in all of them.

## Amendment 4 (28.10.2026, during and after the live run; the plan itself did not change)
* **Execution.** The reviewed plan (22 requests, plan-review sha256 `fe41b8d8…c280e`) ran as written, in the registered priority order; the first run (B1-sonnet-1) was sent alone as a smoke test and the other 21 followed.
  22 of 22 calls ended `end_turn` with a parseable answer; no retry, no budget stop; actual pilot cost USD 2.826 (spent 31.549 of 40). The temporary function (`els-live-reading` v9) was replaced by the 410 stub (v10)
  right after the last run and verified (410 with and without the token); token and env file deleted. The work_log BEFORE row of the live phase was written after the function was deployed (same minute), not before.
* **Post-hoc, labelled as such wherever they appear.** (a) `evaluation/axis-parallels.mjs`: words beside the axis in its own family at any column offset, in the real window and in the 12 tiles (asked by ZURIEL after the pair's relation to the
  axis, hidden by the registered 6-column parallel limit, was seen). (b) `errors_other_than_digits` and `texts_with_digits_beyond_labels` in the metrics: the registered validator counts every digit in free text as an error, which mostly
  catches counts copied from the relation lines and family labels (K4, D2…); the other error codes are reported separately. (c) The Jaccard stability of the B3 arm compares different tiles and is not interpreted.
* **Result files.** `results/pilot-results-note.md` (conclusions and limits), `results/pilot-results.json`, `controls/summary.md` (tables), `results/proposals.md` (every original proposal with its verdict), `controls/runs/<id>/` (requests, preflight,
  raw answers, validation and engine checks).
