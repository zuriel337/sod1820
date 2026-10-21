# Raziel 2029 — research knowledge gateway / access audit

Date: 2026-10-21 · Issue #1142 · Read-only discovery; no production changes.

## Owner-approved content policy
Raziel may use publicly published/otherwise authorized authored writings, author credits, numbers, gematria, ELS, posts, source texts, graph links and curated research. **Only private user self-research** (e.g., a person's own name/birthdate/measurements/life journey/private analysis) is excluded from general retrieval. Do not over-redact public author names. Access to user-owned private research, if supported later, must be restricted to that authenticated owner. Published data must still pass its existing visibility/permission checks.

## Physical sources discovered (not proof of live connector coverage)
- Core editorial corpus: `posts` (content, author, authors, source), `nodes`, `edges`, `number_sets`.
- Gematria: `gematria_words` (is_published, source), `gematria_methods`, `post_gematria_links`, `raw_gematria`.
- ELS: `els_records` (status, owner_user_id, author_name, visitor_id, self_published, source), `els_finds` (user_id). **Do not expose private draft/raw personal records through AI.**
- Research: `research_objects` (status, owner_person_id, source), `research_contributions` (status, author_*), `research_paths` (created_by_user_id), `research_candidates`, `research_plans` (user_ref), `research_items` (user_id), `research_leads` (email, user_id).
- Protect from global lookup: `name_research_log` (has_birthdate, name_norm), `research_leads` (emails), `user_research`, private `research_items`, private `research_plans`, private ELS/user logs, backups and unpublished submissions.

## Security discovery
Observed `relrowsecurity=true` for posts, nodes, edges, gematria_words, ELS records/finds, research objects/paths/plans/items/contributions and user_research; this alone does NOT establish that individual policies or SECURITY DEFINER calls enforce desired visibility. Independently inspect policy predicates and live authorized API behavior before exposing any source. In particular, avoid service_role-wide fetches used to build user-facing model context; verify every row and field is authorized, not just visible in administrative SQL.

## Planned single-gateway contract
`query -> intent/anchor -> allowlisted existing per-domain source adapters -> row policy & personal-submission check -> provenance-labelled evidence pack -> Raziel response`.
Adapters **read** existing canonical sources. No duplicate content database or indiscriminate dumps into the LLM. Each result should carry source table, stable source ID, source type, publication/visibility status, verified calculation vs research interpretation, and precise deep link. Read-only first; cap source counts and token usage. Prevent leakage via snippets, graph neighbors, OCR and linked documents; preserve legitimate public author credit.

## Order of execution
1. Validate active claim and permissions for each source. Inspect policy definitions, status enums and source-level filtering without reading private content.
2. Map present planner/ai-analyze evidence sources against this inventory; classify connected, partial, absent.
3. Implement and test the smallest missing safe adapter at a time (number identity 776/1820 first), with empty corpus and private-owner negative tests.
4. Run deterministic test suite and authenticated canary. Deploy only through separately approved gated rollout with rollback.

Acceptance: 'מה זה 776?' returns evidence for canonical 776 number and verified authorized links to 776 convergence, without hallucinated meaning; 'מה זה 1820?' grounds the site identity; a user's private personal analysis is never returned to another user; public named writer attribution remains when authorized.
