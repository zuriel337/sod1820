# SOD1820 — CORPUS EXPANSION · PHASE 1
Intake Rules for Words / Names / Aliases. READ-ONLY DESIGN — 0 writes, 0 migrations, 0 UI, 0 deploy. Nothing in this document has been executed.

> **GATE CORRECTION (this revision):** the original draft let AUTO-CANDIDATE cases (types A/C/D with clean provenance) proceed straight to a live `word_aliases`/`language_bridge` insert without Zuriel. That was wrong and is corrected throughout this document. **No candidate — of any type, at any confidence level — ever reaches `canonical`, `verified=true`, an identity merge/link, or a publication/access change without Zuriel's explicit approval.** AUTO processing can only ever advance a candidate to `validated_candidate` / `ready_for_human_gate` and stop there. See §0.1 and §9 for the corrected rule, and the end of this document for a short diff summary against the previous revision.

---

## 0. GOVERNANCE — what was read live before designing anything

- **`word_aliases`** (7 live rows, schema confirmed in the prior Phase 1 pass), **`nodes type='language_bridge'`** (13 live rows, 26 live edges wiring `entity --has_language_bridge--> language_bridge --bridges_to--> foreign_word`), **`gematria_words`** (15,433 rows, 505 with `node_id`), RPCs `admin_manage_alias`/`add_word_alias`/`admin_all_aliases`/`admin_add_alias`/`admin_edit_alias` (all live) — all re-confirmed from the immediately-prior `WORDS_NAMES_IDENTITY_PROOF.csv`/`WORDS_NAMES_IDENTITY_REPORT.md` pass, reused as FACT, not re-derived.
- **`research_objects`** (124 rows, all `status='candidate'`, `kind` ∈ {fact, hypothesis, observation, question, relation}) — a general research-claim staging table with `promoted_node_id`, `confidence`, `engine_verified`, `engine_detail` (jsonb), `evidence`, `contributor`, `source`/`source_ref`. **Not currently used for word/alias candidates** — no `kind` value fits lexical intake today.
- **`research_contributions`** (schema confirmed live: `intent`, `origin`, `research_state`, `status`, `target_type`/`target_id`, `parent_id`, `gematria_claim` jsonb, `graph_node_id`, `projected_insight_id`, `author_user_id`/`author_contributor_id`) — **the single most important discovery for this spec.** This is a locked, DB-level rule (`research_contribution_law`, Zuriel 14.7) that *already defines* almost the exact state machine this task asks for, for the general case of any shared research contribution: `research_state` already runs `idea → discussion → investigating → validated → canonical`; `status` is separately the moderation gate (`pending/approved/rejected/hidden`); promotion is explicitly a **projection, never a copy** ("שום תרומה לא מועתקת — היא רק מחליפה מצב" / "no contribution is ever copied — it only changes state"). The rule's own build-order note says the next correct step is wiring `research_contributions` into `nodes`+`edges` as first-class graph citizens, not adding new tables.

### 0.1 `research_contributions.intent` — LIVE actual usage (re-checked this revision, corrects the prior draft)

The rule text describes an intended emoji-labeled taxonomy (💡חידוש · ❓שאלה · 🛠תיקון · 🔍תצפית · 🧩השערה · 📚מקור · 🤝תגובה · 🔠צופן · 🔢גימטריה · 🔗קשר). **Live data does not match that exactly** — the previous draft of this spec incorrectly assumed `intent='🔢גימטריה'` was in live use. The actual distinct values in production today, by count:

| `intent` (live) | count | what it actually holds |
|---|---:|---|
| `מקור` | 226 | sources |
| `חידוש` | 53 | novel findings |
| `interpretation` | 39 | free-text wordplay/midrash **and** transliteration/alias-style notes, unstructured, `target_type=null` |
| `gematria` | 35 | structured numeric-convergence claims, `target_type='number'`, `gematria_claim` jsonb populated |
| `תגובה` | 15 | replies |
| `תצפית` | 3 | observations |
| `research_material` | 1 | (single row) |

**Does an existing intent already fit lexical/identity/alias/language contribution?** Sampled `interpretation` and `gematria` directly (10 live rows). Finding: **`interpretation` already carries real transliteration/alias content today** — e.g. live rows titled `"הימג'ן = imagine = תדמיין / מגן יה / משיח מילוי"` and `"דרים = dream / הפי דרים (תעתיק)"`, both explicitly self-described in their own body text as `תעתיק` (transliteration). But `interpretation` is a **mixed, unstructured bucket**: the same intent also holds pure wordplay/midrash with no identity claim at all (e.g. `"פרידה = פירמידה = מפרידה"` — a poetic multi-word echo, not a claim that two surface forms are the same word/name). `target_type` is `null` on every sampled row — there is no structured field distinguishing "this is a same-identity claim" from "this is a creative aside." `gematria` is the opposite problem: cleanly structured (`target_type='number'`, `gematria_claim` jsonb) but centered on **numbers**, not on **words/identities** — its claims are "these N Hebrew phrases share a value," not "these two surface forms are the same lexical identity."

**Conclusion: no existing `intent` value is a precise fit.** Recommendation, per instruction — propose exactly **one** new value, name and meaning only, **no write performed**:

> **`intent = 'lexical_identity'`** — a contribution proposing that two surface forms (a spelling variant, a transliteration, a translation, or a foreign-language bridge) refer to the same lexical/name identity, OR explicitly noting that they only share a computed value (never to be merged by default). Structured like `gematria` (uses `target_type`/`target_id` to point at the anchor word, `gematria_claim` jsonb to hold the live-engine values where Hebrew is involved), but scoped to identity/alias/language claims rather than numeric convergence. Lowercase English, matching the casing already used by the two other structured/high-volume intents (`gematria`, `research_material`) rather than the emoji-Hebrew style the rule document describes but production does not actually use.
>
> This is a **naming proposal only** — no `intent` value has been written, and adopting it (or choosing to keep routing this content through `interpretation`, restructured) is Zuriel's call, not decided here.
- **`gematria_auto_registry_law`** (locked rule, Zuriel 3.7.2026): **any gematria expression entering the system through any channel must auto-insert into `gematria_words`**, deduplicated by `phrase`, with `source` + contributor credit + `source_wp_ids`. A DB trigger (`gw_enforce_engine`) computes all canonical methods automatically on insert — an agent only ever needs to supply `phrase` + metadata, never compute values by hand. This is already the exact "Hebrew surface form → live engine calc" step this spec needs; it does not need to be redesigned, only cited.
- **Base design decision, confirmed and NOT re-litigated** (per instruction §2, and consistent with the prior Phase 1 report's own recommendation): same-language spelling variant → `word_aliases.alias_type='spelling_variant'` (schema already accepts this value; zero live rows currently use it — a data-population gap, not a schema gap). Cross-language identity/relation → the existing `language_bridge` graph pattern (`entity --has_language_bridge--> language_bridge --bridges_to--> foreign_word`), already live and working for 13 real word pairs across 3 languages.

**Conclusion driving the whole design: no new table is proposed anywhere in this spec, and no new `intent` value has been created (only named, per §0.1).** The candidate/staging layer maps onto the already-existing, already-locked `research_contributions` (proposed: `intent='lexical_identity'`, plus `research_state`, `status`, `gematria_claim`, `target_type`/`target_id`, `graph_node_id`); the canonical layer maps onto the already-existing `gematria_words` (auto-computed via `gw_enforce_engine`) + `word_aliases` + `language_bridge`/`edges`. This spec's only job is to define *which candidate goes through which existing door, in what order, with which gate* — a routing decision, not a construction project. **Reaching the canonical layer at all — for any identity/alias/link claim — requires Zuriel's approval; only a bare new word with no relation claim (type A) auto-inserts, per the pre-existing, unmodified `gematria_auto_registry_law`.**

---

## 2. BASE DESIGN DECISION (restated, per instruction §2 — not re-decided here)

| Relation type | Mechanism | Status today |
|---|---|---|
| Same-language spelling variant (דוד ↔ דויד) | `word_aliases` row, `alias_type='spelling_variant'`, `word_id` → the OTHER spelling's `gematria_words.id` | Schema-ready, zero live rows |
| Cross-language identity/relation (משיח ↔ Messiah) | `nodes type='language_bridge'` + `edges` (`has_language_bridge`, `bridges_to`) | Live, working, 13 rows |

---

## 3. THE INTAKE STATE MACHINE

```
 INPUT (raw candidate: a phrase/name/word string + context of where it came from)
   │
   ▼
 [1] NORMALIZE IDENTITY CANDIDATE
   • strip niqqud/punctuation for comparison purposes only (never alter the stored original — see Sec.8)
   • detect script (Hebrew block vs. Latin vs. Cyrillic vs. other)
   • produce a normalized comparison key (mirrors gematria_words dedup-by-phrase + word_aliases.alias_norm)
   │
   ▼
 [2] EXACT DUPLICATE CHECK
   • Hebrew: does this exact phrase already exist in gematria_words? (gematria_auto_registry_law's own
     dedup-by-phrase rule — reused, not reinvented)
   • non-Hebrew: does this exact alias string already exist in word_aliases.alias_norm or
     language_bridge.foreign_word for ANY word? (yes is legal -- see Sec.6 collision policy -- but must
     be surfaced, never silently duplicated)
   • EXACT match found → route to existing record, no new candidate created. STOP here for this input.
   │  (no match)
   ▼
 [3] ALIAS / VARIANT CHECK (the step this whole task exists to define carefully)
   • is this string a NEAR match (same consonant skeleton, one-letter spelling difference, mixed
     כתיב-מלא/כתיב-חסר) of an EXISTING Hebrew phrase? → candidate type B (spelling_variant)
   • is this string a foreign-script rendering that phonetically echoes an EXISTING Hebrew phrase?
     → candidate type C (transliteration)
   • is this string a foreign-language MEANING match for an EXISTING Hebrew phrase (independent of sound)?
     → candidate type D (translation)
   • does this string merely COMPUTE to the same value as an existing phrase, with no claimed
     relationship in meaning or sound? → candidate type E (shared_value_only) -- flagged, never merged
   • is this string a longer title/expansion built from an existing shorter identity
     (דוד → דוד המלך)? → candidate type F (title/expanded_name)
   • none of the above, and the string is genuinely new → candidate type A (new_canonical_word)
   • **CRITICAL — per Sec.5: this step NEVER auto-decides B/C/D/E/F from similarity alone.** It only
     PROPOSES a classification with a confidence score. Even the strongest, cleanest-provenance case
     only ever reaches `validated_candidate` automatically (Sec.9) — it NEVER becomes the live canonical
     link itself. That step is Zuriel-only, always, with no exceptions for "obvious" cases.
   │
   ▼
 [4] LANGUAGE DETECTION
   • Hebrew script → proceed to [5]
   • non-Hebrew script → skip [5], proceed directly to [6] with computation SKIPPED (Sec.7)
   │
   ▼
 [5] ENGINE CALCULATION (Hebrew only)
   • run the live registry-driven engine (the same fn_all_methods_full used throughout this entire
     multi-phase arc) -- OR, if this candidate is being intaken via a normal insert into gematria_words,
     simply insert phrase+meta and let the existing gw_enforce_engine trigger compute all methods
     automatically, per gematria_auto_registry_law. Either path uses the SAME canonical engine.
   • store results as this candidate's gematria_claim (maps directly onto research_contributions.gematria_claim jsonb)
   │
   ▼
 [6] PROVENANCE CAPTURE (Sec.8 -- always, every path, no exceptions)
   │
   ▼
 [7] CANDIDATE CLASSIFICATION (finalize A-F from [3], now backed by [5]'s live numbers where applicable)
   │
   ▼
 [8] AUTO-VALIDATION (Sec.9 matrix decides how far AUTO may advance the candidate --
     but NEVER past validated_candidate, for ANY type, at ANY confidence)
   │
   ├── type A, no relation claim at all ─────────────────────────────────────────────┐
   │   (a bare new phrase -- not a B/C/D/F relation candidate)                        │
   │                                                                                    ▼
   │                                                                    [9a] gematria_words insert
   │                                                                    (auto-computed via gw_enforce_engine,
   │                                                                     PRE-EXISTING gematria_auto_registry_law,
   │                                                                     UNCHANGED by this spec -- registering a
   │                                                                     word's own gematria is not an identity
   │                                                                     merge/link and stays auto, as it does today)
   │
   └── type B / C / D / E / F, OR any type A with a co-proposed relation ─────────────┐
       (i.e. anything that implies a link between two identities)                       │
                                                                                          ▼
                                                                    [9b] research_contributions row advances to
                                                                    research_state='validated', status='pending'
                                                                    (== "validated_candidate" / "ready_for_human_gate")
                                                                    and STOPS. No word_aliases row, no language_bridge
                                                                    node/edges, no verified=true, no research_state=
                                                                    'canonical' is ever written at this stage --
                                                                    by AUTO, under any circumstance.
                                                                                          │
                                                                                          ▼
                                                                    [10] ZURIEL-ONLY GATE (Sec.9) -- the ONLY
                                                                    actor who can advance research_state to
                                                                    'canonical', flip verified=true/human_verified=true,
                                                                    approve an identity merge/link, or approve any
                                                                    publication/access change.
                                                                          │
                                                                          ├── approved → [11] CANONICAL INSERT/LINK
                                                                          │   • type B → word_aliases insert (alias_type=spelling_variant)
                                                                          │   • type C/D → language_bridge node + 2 edges
                                                                          │   • type F → gematria_words insert for the new
                                                                          │     (longer) phrase already may exist per [9a];
                                                                          │     the IDENTITY-relation to the shorter form
                                                                          │     is what gets linked here, on approval only
                                                                          │   • type E → NEVER reaches this step -- terminal
                                                                          │     at [9b] as a noted coincidence, not a
                                                                          │     pending link (see Sec.4)
                                                                          │
                                                                          └── rejected → research_state stays at its
                                                                              current step (or moves back), status=
                                                                              'rejected', nothing written to the
                                                                              canonical layer, ever
```

Every candidate that reaches step [11] is a **state change on the SAME `research_contributions` row**, never a copy (per the locked "לא-מעתיקים" rule) — `research_state` moves to `canonical` **only at [11], only by Zuriel's action** — `graph_node_id`/`target_id` then records where it landed (`gematria_words.id`, `word_aliases.id`, or a `language_bridge` node id). Steps [8]/[9b] never write `research_state='canonical'` under any condition.

---

## 4. CANDIDATE TYPES A–F — definition and routing

**Column key:** "AUTO reaches" is the highest state AUTO processing may ever leave the candidate in, unattended. "Zuriel approval writes" is what only Zuriel's action ever creates.

| Type | Definition | AUTO reaches | Zuriel approval writes | Example (live) |
|---|---|---|---|---|
| **A. NEW_CANONICAL_WORD** (no relation claim) | A word/name genuinely absent from the corpus, no claimed link to anything else | `gematria_words` insert (auto-computed via `gw_enforce_engine`) — **unchanged, pre-existing `gematria_auto_registry_law`, not an identity decision** | n/a — already canonical the moment it's registered, same as any ordinary corpus phrase today | any not-yet-seen Hebrew phrase |
| **B. SPELLING_VARIANT** | Same referent, same language, different spelling | `validated_candidate` in `research_contributions` only | `word_aliases`, `alias_type='spelling_variant'` | דוד ↔ דויד |
| **C. TRANSLITERATION** | Sound-preserving rendering across languages/scripts | `validated_candidate` only | `language_bridge` node, `relationship_type='transliteration'` | משיח ↔ Messiah |
| **D. TRANSLATION** | Meaning-preserving rendering across languages | `validated_candidate` only | `language_bridge` node, `relationship_type='translation'` | סוד ↔ secret |
| **E. SHARED_VALUE_ONLY** | Two unrelated words that merely compute to the same value | terminal at `validated_candidate` (noted, never escalated to Zuriel as a link request) | **nothing** — Zuriel is never asked to approve a link for type E; it is not a pending decision, it is a closed observation | בנק / נקב / צמח דוד = 152 |
| **F. TITLE / EXPANDED_NAME** | Possible same referent, longer/titled phrase, different gematria | the new phrase itself may reach `gematria_words` via [9a] (it's a type-A registration on its own); the identity-RELATION to the shorter form stops at `validated_candidate` | the identity-relation link (however that ends up modeled — proposed as a Human-Gate decision itself, not pre-built here) | דוד → דוד המלך |

---

## 5. DUPLICATE SAFETY — what NEVER triggers an automatic merge

Per instruction §5, restated as an enforceable rule set, and matching what Phase 1's 35-case proof already found true in live data:

**FORBIDDEN as sole grounds for auto-merge:**
- Same `ragil` (or any single method value)
- Same full multi-method profile
- Being an anagram of an existing word
- Spelling similarity / edit-distance closeness
- Sharing the same English (or any foreign) alias string with another word

**REQUIRED for any merge/link (auto or human-approved):** identity evidence (an explicit provenance claim that these are the same referent — a note, a source, a researcher's stated intent) **+** provenance (who/where/when) **+**, for anything beyond the lightest auto-candidate tier, human verification.

This is not a new rule invented for this spec — it is exactly what the live `בנק`/`נקב`/`צמח דוד` (=152) triple already demonstrates as *already-correct* behavior in the current data: three unrelated identities share a value and nothing links them.

---

## 6. ALIAS COLLISION POLICY

**One-to-many and many-to-one are both explicitly legal.** A single foreign-language string MAY point to multiple, unrelated Hebrew identities (already true today: "realize" aliases both `לבון`, translation, and `ריאלז`, transliteration — two different `word_id`s, correctly not merged). The intake machine's only obligation on a collision is to **surface** it (so a researcher sees "this English string already aliases N other Hebrew words" at intake time) — never to force a one-to-one constraint, and never to silently pick one.

---

## 7. COMPUTATION RULE

- **Hebrew surface form:** compute all canonical methods LIVE, via the same registry-driven engine used throughout this entire arc (13 active methods, re-verified live at the top of every phase in this session) — or, for a normal corpus insert, rely on the existing `gw_enforce_engine` trigger per `gematria_auto_registry_law`, which does the same computation automatically.
- **Non-Hebrew surface form:** **no gematria computation**, unless a canonical method for that script/system is explicitly defined and registered (none exists today for English ordinal/reduction methods as a *canonical* SOD1820 method — the `language_bridge.method` field already records ad hoc cross-language techniques like "English Ordinal"/"Reverse Reduction" as **relationship-evidence metadata**, not as a canonical gematria-methods-registry method; this distinction is preserved, not blurred).
- **Identity relation ≠ numeric relation**, always. A `language_bridge` of type `shared_value` records a *numeric coincidence that a researcher chose to note*, never an *identity claim*. This mirrors Sec.4's E type exactly and is the same distinction Phase 1's proof already demonstrated live (סוד↔Secret is `shared_value`, not identity-merged with anything).

---

## 8. PROVENANCE — captured for every intake, every path, without exception

| Field | Source | Never overwritten? |
|---|---|---|
| `source` | who/what channel produced this candidate | recorded once at intake |
| `contributor` / researcher (if known) | `research_contributions.author_user_id`/`author_contributor_id`/`author_name` | recorded once |
| `language` | detected at step [4] | recorded once |
| `alias_type` | assigned at step [3]/[7] | may be *revised* by Human-Gate before canonical insert, but the original machine-proposed value is kept in history, never silently replaced |
| `confidence` | machine-assigned at step [3], `research_contributions.gematria_claim`/its own confidence scoring | recorded, may be updated by Human-Gate review, with the prior value retained |
| `verification` | `verified` (bool, mirrors `word_aliases.verified` / `language_bridge.human_verified`) | starts false/unverified always; only a human action sets it true |
| **`original surface form`** | the raw input string, byte-for-byte | **NEVER overwritten, ever** — normalization (step [1]) produces a *separate* comparison key; the literal original is preserved permanently, matching `word_aliases.alias` (raw) vs. `alias_norm` (normalized) already doing exactly this split today |

---

## 9. HUMAN-GATE MATRIX (`INTAKE_DECISION_MATRIX.csv` has the full row-by-row version)

**GATE CORRECTION — restated as the governing rule of this whole section:** "AUTO-CANDIDATE" below does **not** mean "may proceed to a canonical insert without Zuriel." It means "AUTO may advance the candidate to `validated_candidate`/`ready_for_human_gate` (`research_state='validated'`, `status='pending'`) and present it as ready-to-approve — and then stops, unconditionally." The only thing that varies by evidence strength is **how far into pre-validation AUTO goes and how confidently it's presented** — never whether Zuriel is needed for the actual write. **Zuriel alone approves:** `research_state='canonical'`, any `verified=true`/`human_verified=true` flip, any identity merge/link becoming real (the actual `word_aliases`/`language_bridge` insert), and any publication/access-tier change. There is no tier of evidence strong enough to skip this — the previous draft's "AUTO-CANDIDATE = auto-insert" framing for types B/C/D was the specific error this correction fixes.

**AUTO-VALIDATION-ELIGIBLE** (reaches `validated_candidate` unattended, still requires Zuriel to become canonical):
- A genuinely new phrase with clean, unambiguous provenance (a known source, no collision, no near-duplicate) → type A, no relation claim → *this specific sub-case still auto-inserts into `gematria_words` itself*, per the pre-existing, unmodified `gematria_auto_registry_law` — registering a word's own gematria is not an identity decision. Any relation claim attached to it is a different candidate, gated as below.
- A transliteration suggestion where the phonetic match is unambiguous AND the target Hebrew word is already canonical AND no existing alias contradicts it → reaches `validated_candidate` with high pre-validation confidence; the `language_bridge` write itself still waits for Zuriel.
- A spelling-variant suggestion with strong evidence: same consonant skeleton, one well-known כתיב-מלא/כתיב-חסר-class difference (e.g. dropped/added ו or י), AND no competing interpretation → reaches `validated_candidate` with high pre-validation confidence; the `word_aliases` write itself still waits for Zuriel.

**HUMAN-GATE REQUIRED to even reach `validated_candidate` cleanly (held at `idea`/`discussion` until reviewed, not fast-tracked):**
- Any identity merge (asserting two records are "the same" beyond a proposed alias link) — including type B/F relations that go further than "these two phrases co-occur."
- Person-name ambiguity (a name that could refer to more than one real or textual figure) — e.g. דוד/דויד itself, per §10.1: even though the *spelling pattern* is textbook-clean evidence, the *referent* is a major figure, so this specific case is held at `discussion`, not fast-tracked to `validated_candidate`.
- Controversial or public-person claims of any kind.
- Translation vs. shared_value ambiguity (is this a real meaning-relationship, or just a numeric coincidence someone is tempted to over-read?) — the exact distinction this task's E type protects.

**ZURIEL-ONLY, with no AUTO pre-validation tier at all (always starts and stays at `idea` until Zuriel acts):**
- Promotion to `research_state='canonical'`, or any `is_verified=true`/`human_verified=true` flip.
- Any publication or access-tier change.

---

## 10. SPECIAL PROOF — 6 live cases walked through the state machine

### 10.1 דוד ↔ דויד
`INPUT`: "דויד" arrives as a candidate. → `[1]` normalize (strip nothing, both are plain Hebrew) → `[2]` exact-duplicate check against `gematria_words`: **already exists** (ragil=24, no `node_id`) — so this specific case is already past intake in the live data; for a *fresh* instance of this pattern, `[2]` would pass through to `[3]` → **type B, SPELLING_VARIANT** (same consonant skeleton as "דוד," differs only by one letter, well-known כתיב pattern) → `[4]` Hebrew → `[5]` live engine: רגיל=24 (computed, differs from "דוד"'s רגיל=14 — genuinely different numbers, expected and correct, not an error) → `[6]` provenance captured (source=auto:תיעוד אירועים wp16571 in the live row) → `[7]` classification B confirmed → `[8]` the spelling PATTERN alone would pre-validate cleanly, but this exact pair is explicitly flagged in Sec.9's own criteria as "person-name ambiguity" since דוד is a major biblical figure — **held at `discussion`, not fast-tracked to `validated_candidate`**, pending Zuriel. → `[10]` Zuriel reviews → on approval only → `[11]` `word_aliases` row, `word_id`→"דויד"'s `gematria_words.id`, `alias_type='spelling_variant'`, pointing at "דוד," `research_state` now `canonical` for the first time, written by Zuriel's action, not AUTO.

### 10.2 צמח דוד ↔ צמח דויד
Same path as 10.1, one level up (compound phrase instead of bare name) — reconfirms the state machine is depth-agnostic. `[5]` live values: 152 vs 162 (differ by exactly the extra letter's value, as already reconfirmed live in the prior Phase 1 pass). → HUMAN-GATE for the same reason (proper-noun identity claim).

### 10.3 משיח ↔ Messiah ↔ мессия
`INPUT`: "Messiah" (English) arrives. → `[1]` normalize, Latin script detected → `[2]` exact-duplicate check against `language_bridge.foreign_word`: **already exists** (live case) → for a fresh instance: `[3]` proposed type **C, TRANSLITERATION** (phonetic echo of משיח) → `[4]` non-Hebrew → `[5]` **skipped**, per Sec.7 — no canonical gematria method exists for English script → `[6]` provenance (curated (Zuriel), per the live row) → `[7]` type C confirmed → `[8]` **AUTO-VALIDATION-ELIGIBLE** (unambiguous phonetic match, target already canonical, no collision) → reaches `validated_candidate`, `status='pending'` — **and stops there.** → `[10]` Zuriel reviews the pre-validated candidate → on approval only → `[11]` `language_bridge` node + 2 edges (`entity--has_language_bridge-->bridge--bridges_to-->foreign_word`). The Russian "мессия" walks the identical path independently, proving N-language fan-out needs no new logic per language — and reconfirming neither language skips Zuriel's approval, no matter how clean the match.

### 10.4 סוד ↔ Secret/secret
Two SEPARATE live intakes actually happened for this pair (a real, disclosed inconsistency, per Phase 1's report F2): one via `word_aliases` (`alias_type=translation`, lowercase "secret," source=zuriel), one via `language_bridge` (`relationship_type=shared_value`, capitalized "Secret," method="English Ordinal"). Walking a *fresh* instance through THIS spec's machine: `[3]` would classify based on the claimed relationship — if the intake claims "secret" means the same thing as "סוד" → type D (TRANSLATION) → `language_bridge`; if the intake instead just claims their gematria/ordinal values coincide → type E (SHARED_VALUE_ONLY) → not linked as identity. **This machine would have prevented the live duplication** by surfacing, at step `[2]`, that an alias/bridge already exists for "סוד" before a second one is created under a different mechanism — a concrete, disclosed improvement this design offers over what currently happened.

### 10.5 "realize" collision (לבון vs. ריאלז)
`INPUT`: "realize" arrives a second time, already aliasing "לבון." → `[2]` exact-duplicate check finds the STRING exists, but attached to a *different* Hebrew word than the one this new candidate targets ("ריאלז") → **not a duplicate-reject** (per Sec.6, one-to-many is legal) → surfaced as a collision notice, not blocked → `[3]` type C (TRANSLITERATION, phonetic match to ריאלז) vs. the existing D (TRANSLATION, meaning match to לבון) — these are genuinely different relationship types to different words, correctly kept apart → `[8]` **AUTO-VALIDATION-ELIGIBLE** (unambiguous phonetic match, no real conflict, just a shared surface string) with the collision notice attached for visibility, reaches `validated_candidate` and stops → `[10]` Zuriel reviews (collision notice included) → on approval only → `[11]` new `word_aliases` row for ריאלז, unaffected by the existing לבון row.

### 10.6 בנק/נקב/צמח דוד = 152 (negative control)
`INPUT`: someone proposes "בנק and צמח דוד should be linked, they're both 152." → `[3]` no claimed meaning/sound relationship exists, only a shared computed value → **type E, SHARED_VALUE_ONLY**, mandatorily → `[8]` per Sec.4's own rule, E is **never a merge candidate** — it is recorded (optionally, as a `research_objects kind='relation'` numeric-coincidence note) and the machine terminates without linking anything. This is the machine's designed *negative case*: proof it can say "interesting, but not identity" and stop, rather than defaulting to "shared number → related."

---

## 11. OUTPUT FILES

- `CORPUS_EXPANSION_INTAKE_SPEC.md` — this document.
- `INTAKE_DECISION_MATRIX.csv` — row-per-scenario decision table (classification, duplicate-check outcome, alias-collision handling, Human-Gate requirement + reason, target mechanism, worked example) covering all 6 types × the 6 special-proof cases × common failure modes.

### What stays legacy vs. what becomes canonical
- **Stays legacy, unresolved by this spec:** the existing `word_aliases`/`language_bridge` inconsistency for "סוד/Secret" (Sec.10.4) — this spec identifies the fix (check both mechanisms at intake step `[2]`) but does not retroactively repair the existing duplication; that would be a write, out of scope here.
- **Becomes canonical ONLY after Zuriel's explicit approval — with zero exceptions:** any identity merge, any B/C/D/F relation of any kind, any `research_state='canonical'` promotion, any `verified=true`/`human_verified=true` flip, any publication/access change. There is no confidence tier, spelling-pattern strength, or provenance cleanliness that bypasses this.
- **The one and only thing that reaches the canonical layer without Zuriel** is a type-A bare new phrase with **no relation claim attached** — because registering a new word's own gematria value is not an identity decision, and that path is the pre-existing, unmodified `gematria_auto_registry_law`, not something this spec introduces or widens.
- **Everything else** — every B/C/D/F candidate, regardless of how strong its evidence — stops at `validated_candidate`/`ready_for_human_gate` and is always logged with full, reversible provenance in `research_contributions`, per the locked "לא-מעתיקים" state-change model, awaiting Zuriel.

---

## 13. DIFF SUMMARY — this revision vs. the previous draft

| # | Previous draft said | Corrected to |
|---|---|---|
| 1 | Types A/C/D with clean provenance were "AUTO-CANDIDATE" and could proceed straight to a live `word_aliases`/`language_bridge` insert without Zuriel. | AUTO may only ever advance a candidate to `validated_candidate`/`ready_for_human_gate` (`research_state='validated'`, `status='pending'`). The actual canonical write — for any B/C/D/F relation — is Zuriel-only, unconditionally. Only a bare type-A phrase with no relation claim still auto-registers, via the pre-existing, unmodified `gematria_auto_registry_law`. |
| 2 | §0 claimed `research_contributions.intent` already includes `🔢גימטריה` as a live value, citing the rule text. | Live-reverified: actual production values are `מקור`(226)/`חידוש`(53)/`interpretation`(39)/`gematria`(35)/`תגובה`(15)/`תצפית`(3)/`research_material`(1) — no emoji forms exist in practice. The rule's documented taxonomy and live usage diverge; this revision cites only what's actually live. |
| 3 | No `intent` gap analysis was performed for lexical/identity/alias content specifically. | New §0.1: sampled `interpretation` (already carries real transliteration content, e.g. "הימג'ן=imagine=תדמיין", but unstructured/mixed with pure wordplay) and `gematria` (structured but number-centered) — neither is a precise fit. Proposes exactly one new value, **`intent='lexical_identity'`**, name and meaning only, no write performed. |
| 4 | Walkthroughs (§10.1/10.3/10.5) described AUTO-CANDIDATE cases reaching a canonical insert at step `[9]`. | Rewritten: AUTO reaches `validated_candidate` and stops (new step `[9b]`); the canonical write is now step `[11]`, reachable only after an explicit Zuriel review at step `[10]`. |
| 5 | §4's type table routed B/C/D "AUTO-CANDIDATE"-eligible cases directly to their canonical mechanism. | Table restructured with two columns — "AUTO reaches" (always `validated_candidate` for B/C/D/F) vs. "Zuriel approval writes" (the actual `word_aliases`/`language_bridge` record) — making the gate explicit per type. |
| 6 | §9's Human-Gate matrix implied "AUTO-CANDIDATE" meant auto-approval. | Rewritten with an explicit restated governing rule at the top of §9, and a new third tier ("ZURIEL-ONLY, with no AUTO pre-validation tier at all") for `canonical`/`verified`/publication changes specifically. |

No table, schema, or state-machine STEP was added or removed beyond renumbering `[9]` into `[9a]`/`[9b]`/`[10]`/`[11]` to make the gate explicit — this is a correction to the gate logic, not a redesign.

---

## 14. STOP

READ-ONLY DESIGN throughout. No word added, no alias created, no `language_bridge` node created, no schema/UI change, no deploy, no `intent` value written. Closing `work_log` memo (`actor=CLAUDE`, `task=CORPUS_EXPANSION_GATE_CORRECTION`, `status=completed`) logged separately.
