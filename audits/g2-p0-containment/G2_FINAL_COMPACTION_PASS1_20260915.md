# G2 Final Canonical Compaction — Pass 1 · 2026-09-15

**Human Gate:** ZURIEL  
**Primary writer:** GPT  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Main at start:** `f1972c9944e6f0e7a094cc500dba5963221ea21d`  
**Branch:** `gpt/g2-final-compaction-v1`

## Goal

Reduce normal agent startup to a finite owner-first tree while preserving all historical provenance in Archive/Git/inactive rule history.

## Live DB changes completed

### Rule tree

- active rules before pass: **249**
- first legacy retirement batch: **8**
- implementation/projection retirement batch: **17**
- Experience legacy-presentation retirement batch: **8**
- active rules after current Pass-1 waves: **216**
- active rules classified by `metadata.compaction_v1`: **216 / 216**
- active rules without canonical owner pointer: **0**
- inactive/historical rows remain preserved; no rule row was deleted.

Classification vocabulary:

- `OWNER`
- `CHILD_OF_OWNER`
- `IMPLEMENTATION_OR_PROJECTION_RULE`
- `LEGACY_RETIRE_OR_SUPERSEDE`

Retired rows preserve `canonical_owner`, `owner_family`, archive reason and provenance metadata.

### Work log

`work_log` remains append-only provenance.

`work_log_current` changed from an almost-full-history view to a bounded current surface:

- before: **3,563** rows
- after bounded-view migration: **501** rows
- after stale BEFORE/CLAIMED reconciliation: **340** rows
- stale BEFORE/active-status rows reconciled to a later terminal row: **297**

Those rows were not deleted: they were marked archived/superseded and linked by `superseded_by_id` to the later terminal record.

Current surface keeps:

- latest 100 non-archived/non-superseded rows;
- latest row per active/waiting/assigned/release task scope during the last 14 days.

## Documentation compaction on branch

- preserved immutable Master v2 by exact Git commit/blob pointer;
- replaced active Master with `MASTER STATE v3 COMPACT` pointer/state form;
- replaced Roadmap with navigation/priority/gates/open-decisions-only form;
- replaced Owner Index with finite owner-family routing hierarchy;
- added explicit anti-inflation / future-admission rule.

## Representative routing replay — Pass 1

| Natural task | Family | Canonical owner / first read | Live owner verified |
|---|---|---|---|
| “פתח 358 / חפש גימטריה” | Gematria/Numeric | numeric rule-family index + `gematria_engine_law` / method owners | PASS |
| “בדוק דילוג” | ELS | `els_research_layer_law` + `els_single_engine_law` | PASS |
| “סרוק ספר / מקור” | Research Intake/Source | `research_intake_foundation_contract_law` | PASS |
| “שאל את רזיאל / מחקר רזיאל” | Raziel | `raziel_companion_layer_law` | PASS |
| “אדם / חיים / חומר אישי” | Person/Personal | `person_foundation_contract_law` | PASS |
| “תעלה פוסט / ערוך פוסט” | Publishing | `project_codex.publishing_conventions` | PASS |
| “עקוב / עדכונים / התראות” | Follow/Attention | `subscription_funnel_law` | PASS |
| “איפה אנחנו במפה” | Program navigation | compact Roadmap + `foundation_closure_protocol_law` only when gate-state verification is required | PASS |
| “תעלה” | Release | `deploy_on_request` + live-state + coordination/write safety | PASS |

This replay proves the routing map is coherent. It is **not yet the independent fresh-agent acceptance closure** required by the gate.

## What is intentionally NOT archived yet

The remaining active `CHILD_OF_OWNER` rules are not bulk-deactivated merely to reduce a number. Some still carry unique live domain semantics (e.g. method lifecycle, ELS single-engine invariant, Raziel routing, exact numeric operators).

Next retirement wave must first prove one of:

1. semantics are already fully carried by the canonical owner; or
2. the owner explicitly points to the scoped historical child on demand; or
3. the child is implementation/projection/history only.

No semantic loss for cosmetic count reduction.

## Remaining Pass-2 work

1. absorb/retire duplicated child semantics family-by-family;
2. verify no current body duplicates another current body with competing authority;
3. reconcile material branch/release states;
4. independent fresh-agent challenge (GPT/CLAUDE class);
5. patch any DRIFT found;
6. Human Gate final approval.

## Gate state

**G2 remains OPEN.**

Pass 1 materially reduces routing ambiguity and startup volume, but formal closure still requires the independent fresh-agent acceptance and remaining One Decision → One Canonical Body reconciliation.
