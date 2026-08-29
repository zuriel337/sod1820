-- =====================================================================================
-- M1 TRUTH CONTRACT — SECTION B: FOUNDATION LAW, FOUR ORTHOGONAL SEMANTIC AXES
-- =====================================================================================
-- Human-Gate (ZURIEL) decision HG-1: APPROVED Option D / Hybrid.
--   The Canonical Foundation has FOUR orthogonal semantic axes, plus a SEPARATE
--   domain/operational workflow axis that is NOT a semantic axis.
--   Explicitly NOT approved: one universal lifecycle enum; a `lifecycle_state` column.
-- Human-Gate decision HG-2: APPROVED "approved != canonical" as two distinct Governance states.
-- Human-Gate decision HG-3: APPROVED engine verification as MANDATORY-DECLARED,
--   not universally mandatory-match. Never fabricate "match".
--
-- Evidence base (READ-ONLY pass, work_log b259901a-98ec-4cd1-a1c1-9c35a0ed8dde):
--   the four-axis model was already ratified in THREE independent places
--   (docs/research-universal-finding-contract.md §5; Research DNA v1 §2;
--   Master State §11.34) but was owned by NO layer, and its only enumerated
--   epistemic vocabulary lived in client JS (src/lib/research/universalFinding.js).
--   This migration gives the model an owner. It invents no new vocabulary.
--
-- Mechanism: the EXISTING rule mechanism (nodes type='rule' + project_codex),
--   exactly as used by unified_graph_law / experience_governance_foundation_v1_law.
--   NO new table. NO new column. NO data migration. Zero rows changed.
-- =====================================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. The canonical rule row.
-- ---------------------------------------------------------------------------
insert into public.nodes (type, label, description, metadata, is_active, rule_id, rule_version, weight, depends_on)
values (
  'rule',
  'Truth Axes Foundation v1 — ארבעה צירים סמנטיים אורתוגונליים (Option D, HG-1)',
  $LAW$
חוק-יסוד: ל-SOD1820 יש ארבעה צירים סמנטיים נפרדים, ועוד ציר תפעולי/דומייני שאינו סמנטי כלל.
אף ציר אינו מחליף ציר אחר. אין enum-מחזור-חיים אחד. אין עמודת lifecycle_state.

=== THE FIVE SEPARATIONS (the whole law in one line) ===
EPISTEMIC TYPE != VERIFICATION != GOVERNANCE != PUBLICATION/ACCESS != DOMAIN/OPERATIONAL STATUS

=== AXIS 1 — EPISTEMIC TYPE (what KIND of knowledge-object is this?) ===
Answers: is this an observation, a hypothesis, a question, a relation, a claimed fact?
Canonical live homes: research_objects.kind (CHECKed: fact|relation|observation|hypothesis|question);
the Universal Finding envelope `stage` (candidate|finding|evidence|claim|interpretation).
INVARIANT E1 — CLAIM != FACT. Calling an artifact a "fact" is a TYPE declaration by whoever
created it. It is not evidence, not verification, and not acceptance.
INVARIANT E2 — EPISTEMIC TYPE MAY NOT BE LOAD-BEARING FOR A GOVERNANCE TRANSITION.
The noun chosen at intake may never decide how far a single human approval promotes a row.
(This closes the live D-1 defect in admin_research_review, fixed in the sibling M1 migration.)

=== AXIS 2 — VERIFICATION (did an ENGINE test it, and what came back?) ===
Canonical home for research artifacts: research_objects.engine_detail, carrying the already-ratified
Research DNA v1 §1 shape {claimed_expression, claimed_method, claimed_value,
engine_method_tested, engine_result, verification_state}.
Canonical verification vocabulary (RATIFIED — do not invent more):
  match          — a CLAIM existed and the engine reproduced it.
  mismatch       — a CLAIM existed and the engine contradicted it.
  method_unknown — a CLAIM existed but the engine has no such method to test it with.
  not_tested     — the honest default. No claim was tested. This is a TRUE statement, not a gap.
research_objects.engine_verified remains as a COMPATIBILITY/DERIVED boolean signal.
It is not a second verification store and it is not the authority.
INVARIANT V1 — ENGINE VERIFICATION != HUMAN ACCEPTANCE.
Phrased in this exact direction on purpose: verify_seal_manual_only v3 locks gematria_words.is_verified
as MACHINE-determined, so this law must never be read as "verified means a human said so".
Live proof the axes are already independent: rows exist that are engine_verified=true AND rejected.
INVARIANT V2 — MANDATORY-DECLARED, NOT MANDATORY-MATCH (HG-3).
Engine verification is NOT a universal precondition for canonicalization. A Human Gate may
canonicalize non-computable or interpretive material PROVIDED the verification state is
honestly represented. What is forbidden is silence, and what is forbidden absolutely is
FABRICATING "match". An engine that produced a value against which nothing was claimed
has produced a RESULT, not a MATCH: record the result and leave the state not_tested.
INVARIANT V3 — no parallel verification store may be created.

=== AXIS 3 — GOVERNANCE (how far has the HUMAN GATE accepted it?) ===
Canonical live home for research artifacts: research_objects.status.
Canonical vocabulary, ratified by HG-2 (four states, enforced by CHECK in the sibling migration):
  candidate — proposed. No human has accepted it.
  approved  — the Human Gate ACCEPTED the artifact into the governed research layer.
  canonical — the Human Gate EXPLICITLY PROMOTED it into canonical SOD1820 knowledge/reality.
  rejected  — the Human Gate declined it. Per existing semantics this means "the conclusion is
              not accepted under the current evidence and criterion", NOT "the datum is false".
INVARIANT G1 — APPROVED != CANONICAL (HG-2). Canonical is STRICTLY STRONGER than Approved.
An approve never silently produces canonical. Canonicalization is its own explicit human act.
INVARIANT G2 — governance state may NEVER be inferred from age, kind, confidence, verification,
publication, visibility, popularity, or from how many agents touched it.
INVARIANT G3 — AI MAY propose, rank, research, calculate, extract and recommend.
ONLY the Human Gate may perform a governed canonical promotion. AI never writes a Governance
transition on its own authority.
INVARIANT G4 — governance vocabulary is DB-OWNED wherever it controls canonical promotion.
NOTE ON SHARED WORDS: the same token in two tables is NOT the same state.
'confirmed' on relation_evidence != 'confirmed' on decision_ledger;
'candidate' on research_objects != 'candidate' on relation_evidence. Each table owns its own values.
This law shares AXIS DEFINITIONS, never a single global value set.

=== AXIS 4 — PUBLICATION / ACCESS (who can SEE it, on which surface?) ===
Canonical live homes are per-surface and each surface declares exactly ONE authority field:
research_objects.privacy_scope; posts/gematria is_published; els_records status+visibility;
visibility_tier; gallery published/curation_status.
INVARIANT P1 — CANONICAL != PUBLISHED. Promotion to canonical NEVER publishes and NEVER
widens access on its own. (Already implemented correctly today: privacy_scope gates whether an
approved/canonical research object is projected to the graph at all.)
INVARIANT P2 — PUBLISHED != CANONICAL. Publishing something asserts nothing about its truth
or its governance state. Live proof: rows published while their own research_state says 'idea'.
INVARIANT P3 — VISIBLE/ACCESSIBLE != PUBLISHED. If a row is world-readable because of a grant
or an OR-ed policy, that is an ACCESS FACT, not a publication decision. A missing gate is not consent.
INVARIANT P4 — publication is PER SURFACE. One semantic object may be published on one surface,
private on another, and canonical on neither.

=== AXIS 5 (NON-SEMANTIC) — DOMAIN / OPERATIONAL STATUS ===
Queue, job, moderation, delivery and document-lifecycle states: bot_outbox, media_migration_queue,
wa_deep_queue, newsletter_sends, ocr_status, scan_runs, payment_requests, els_records document
status, research_candidates pending/decided/dismissed, gematria_methods REGISTERED/ACTIVE/IN_ENGINE.
INVARIANT O1 — OPERATIONAL STATUS != EPISTEMIC STATE. These are legitimately domain-specific,
they need no mapping into the four axes, and they must NEVER be pulled into the epistemic
vocabulary or read as a truth gate. Do not "normalize" them.

=== CONFIDENCE, RANKING, HEAT ===
INVARIANT C1 — CONFIDENCE IS AN ATTRIBUTE, NOT AN AXIS. A score never moves an artifact along
EPISTEMIC TYPE, VERIFICATION, GOVERNANCE or PUBLICATION.
INVARIANT C2 — RANKING/HOT/VIP/POPULARITY NEVER PROMOTE TRUTH. HOT != TRUE, SIGNAL != DISCOVERY,
DISCOVERY != CANONICAL. Rank, do not hide (signal_vs_curation v2).

=== PROJECTION BOUNDARY (the second and last enforcement point) ===
INVARIANT PR1 — PROJECTION MAY REPRESENT SEMANTIC STATE. IT MAY NOT INVENT IT.
A projection/envelope/adapter/renderer may transport, display and format an axis value that a
source actually owns. It may NEVER manufacture one from absence.
INVARIANT PR2 — PROJECTION MAY NOT SILENTLY COERCE INVALID SEMANTIC INPUT.
An explicitly invalid axis value must be rejected or preserved as unknown — never quietly
rewritten into a valid-looking one. Silent laundering is worse than a plain default.
INVARIANT PR3 — MISSING SEMANTIC STATE STAYS HONESTLY ABSENT/UNKNOWN (null), or the contract
rejects the input. Absent must never inherit institutional weight: an artifact of unknown origin
is not authored by "SYSTEM"; an artifact of unknown governance is not "active"; an artifact of
unknown epistemic type is not a "finding".
PRESENTATION-SAFE DEFAULTS REMAIN ALLOWED and are not fabrication: empty view containers,
empty collections, display formatting, the construction timestamp of the envelope itself,
and the adapter identity when it is genuinely known.
INVARIANT PR4 — UNIVERSAL FINDING NAMES AN ENVELOPE, NOT AN EPISTEMIC CLAIM.
The name "Finding", the constructor makeUniversalFinding and the predicate isUniversalFinding
describe the CONTAINER. They do NOT imply stage='finding'. `stage` is the sole authority on
epistemic type, and no consumer may infer 'finding' from the envelope's name.
The envelope MUST be capable of REPRESENTING all four axes, including verification and access —
being unable to say the true thing is itself a violation of this law.

=== TRANSLATIONS AND REPRESENTATIONS ===
INVARIANT T1 — the four axes attach to the SEMANTIC OBJECT. Translations, transcripts, renderings,
cards, OG images and derived views INHERIT semantic state from that object. A representation
NEVER independently manufactures truth, governance or publication state.
(content_translation_law: source text + language-fanout. A translation row may not assert a
publication or truth state its source object does not hold.)

=== SUPERSESSION AND HISTORY ===
INVARIANT H1 — supersession is a RELATION between artifacts, never a value overwrite
(everything_additive_law, and the work_log CURRENT/SUPERSEDED/ARCHIVED precedent where
SUPERSEDED is always set explicitly and NEVER derived from age).
INVARIANT H2 — provenance must record the REAL actor and the REAL source (HG-5). A hardcoded
identity is a fabricated attribution. Where a schema cannot yet distinguish EVIDENCE-SOURCE from
ACTING-USER, that gap is reported as a missing primitive — never papered over by overloading one
field with the other's meaning.
INVARIANT H3 — historical rows retain their provenance. Non-conforming history is preserved and
adjudicated by the Human Gate; it is never silently rewritten to satisfy a new constraint.

=== ENFORCEMENT — EXACTLY TWO POINTS, NOT EVERYWHERE ===
(a) the ->canonical and ->published transitions (DB: CHECK + canonical RPC boundary);
(b) the projection boundary (no fabricated axis values, no silent coercion).
Everywhere else the domain keeps its own fields and its own words. This is Option D:
shared axis DEFINITIONS, domain-owned VALUES, enforcement at two points only.
$LAW$,
  jsonb_build_object(
    'human_gate', jsonb_build_object(
      'decided_by', 'ZURIEL',
      'decisions', jsonb_build_array(
        jsonb_build_object('id','HG-1','decision','APPROVED Option D / Hybrid — four orthogonal axes, no universal lifecycle enum, no lifecycle_state column'),
        jsonb_build_object('id','HG-2','decision','APPROVED approved != canonical as two distinct Governance states; canonical is stronger'),
        jsonb_build_object('id','HG-3','decision','APPROVED engine verification MANDATORY-DECLARED, not mandatory-match; never fabricate match'),
        jsonb_build_object('id','HG-4','decision','PR #226 HOLD + AMEND — direction compatible, semantic fabrication must be reconciled before merge'),
        jsonb_build_object('id','HG-5','decision','APPROVED real-actor provenance; hardcoded source=zuriel must not attribute other admins to ZURIEL')
      )
    ),
    'axes', jsonb_build_array('epistemic_type','verification','governance','publication_access'),
    'non_semantic_axis', 'domain_operational_status',
    'governance_vocabulary', jsonb_build_array('candidate','approved','canonical','rejected'),
    'verification_vocabulary', jsonb_build_array('match','mismatch','method_unknown','not_tested'),
    'enforcement_points', jsonb_build_array('canonical_and_published_transitions','projection_boundary'),
    'explicitly_not_created', jsonb_build_array('lifecycle_state column','universal lifecycle enum','new research store','second graph/tree','parallel verification store'),
    'evidence_work_log', 'b259901a-98ec-4cd1-a1c1-9c35a0ed8dde',
    'implementation_work_log_before', '4a59e0ff-6478-45b0-b4cf-4d5b2cf53990',
    'codex_slug', 'truth_axes_foundation_v1'
  ),
  true,
  'truth_axes_foundation_law',
  1,
  5,
  array['unified_graph_law','everything_additive_law','signal_vs_curation','verify_seal_manual_only','research_intake_foundation_contract_law','content_translation_law']
);

-- ---------------------------------------------------------------------------
-- 2. The project_codex companion entry (same pattern as experience_governance_foundation_v1).
-- ---------------------------------------------------------------------------
insert into public.project_codex (slug, title, category, body, related_files, related_tables, tags, priority, source)
values (
  'truth_axes_foundation_v1',
  'Truth Axes Foundation v1 — EPISTEMIC TYPE / VERIFICATION / GOVERNANCE / PUBLICATION-ACCESS (Option D, HG-1..HG-5)',
  'architecture',
  $CODEX$
מקור-האמת המלא של החוק: select description from nodes where rule_id='truth_axes_foundation_law';

WHY THIS EXISTS
The four-axis model was already ratified three separate times (Universal Finding Contract §5,
Research DNA v1 §2, Master State §11.34) and owned by nobody. Its only ENUMERATED epistemic
vocabulary lived in a client-side JS file. Meanwhile the live system let an artifact's KIND decide
its GOVERNANCE promotion, let two governance columns run with no CHECK at all, carried three
competing verification representations, and had a projection layer that manufactured epistemic,
governance and provenance state out of absence. The model was right; ownership and enforcement
were missing. This contract supplies ownership and enforcement, and nothing else.

WHAT CHANGED (M1 implementation pass, branch claude/system-governance-evidence-pack-kgu23i)
1. truth_axes_foundation_law — this contract, as a nodes rule (weight 5).
2. research_objects.status — CHECK {candidate, approved, canonical, rejected}. All 577 live rows
   already conformed; zero backfill, zero rows changed.
3. admin_research_review — EPISTEMIC TYPE no longer decides a GOVERNANCE transition.
   'approve' now yields 'approved' for EVERY kind. A new explicit 'canonicalize' decision on the
   SAME existing RPC performs approved -> canonical. No second canonicalization engine was created.
4. Graph projection moved with the canonical act, not with the approve act. Graph-projectable
   (kind in fact/relation) now decides only WHETHER a projection happens at canonicalization —
   it no longer decides HOW FAR the governance state advances.
5. Verification is declared at the canonicalization boundary into the already-designated home
   research_objects.engine_detail, honestly, without fabricating 'match' and without touching history.
6. Universal Finding stopped fabricating: no stage->finding, no invalid-stage laundering,
   no status->active, no createdBy->SYSTEM. verification{} and access{} were adopted from PR #226
   so the envelope can finally REPRESENT the axes it was blind to.

WHAT WAS DELIBERATELY NOT DONE
No lifecycle_state column. No universal lifecycle enum. No new table, store, graph or engine.
No historical normalization or backfill. No rewrite of historical provenance. decision_ledger's one
non-conforming historical row was preserved, not adjudicated. M2 (77 ELS self_published rows)
untouched. No merge to main. No production deploy.

HOW TO USE IT WHEN BUILDING
Before adding any status-like column or any "is it true / can we show it" gate, name the AXIS first.
If the answer is "it's the workflow position of a job" you are on the non-semantic axis and this
contract does not apply — do not normalize it. If you are writing a projection/adapter/renderer,
you may transport an axis value; you may never default one into existence, and you may never
silently rewrite an invalid one.
$CODEX$,
  array['src/lib/research/universalFinding.js','src/lib/research/canonicalGematria.js','src/components/research/FindingSurface.jsx','src/lib/research/useUniversalWorkspace.js'],
  array['research_objects','decision_ledger','relation_evidence','nodes','edges'],
  array['foundation','truth','governance','verification','projection','option-d','m1'],
  1,
  'ai'
);

commit;
