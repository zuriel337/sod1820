# G4_GRAPH_RELATION_ENFORCEMENT_V1 — branch artifact (not applied)

Status: BRANCH_ONLY. Live DB unchanged. Needs independent GPT review + ZURIEL Human Gate before apply.
Base: main `10cbd029`. Assignment: work_log `380804e4-baae-4ea1-8b27-41d1d789df65`.

## Files
- `supabase/migrations/20261004080000_g4_graph_relation_enforcement_v1.sql`
- `tests/g4-graph/*_preconditions.sql` (read-only census + fingerprints), `*_behavior.sql` (branch DB only, rolled back), `*_rollback.sql`
- `test/g4-graph-relation-enforcement-contract.test.mjs` (static contract test, `node test/...`)

## Allowed `edges.relation_type` (35)
31 live (unchanged): bridges_to, cipher_link, contained_in, contains, contributes_to, converges_on, cross, demand_signal, derived_from, discovered_by, documents, equals, equals_by_depth, equals_word, extends_rule, has_language_bridge, interpreted_by, is_kadmi_of, kadmi_equals, kadmi_reverse_of, mentions, opposite_of, related, relates_to, represents, reverse_of, scale, scale_x10, seeded_by, source, zero_scale.
Plus: same_as, alias_of, variant_of (reserved identity), authored_by_external (contribution_links writer; 27750 live links).
`parent_of`/`family_input` are not edges vocabulary.

## Affected rows (live census 2026-10-04, read-only)
7212 edges. Backfill marker: 12 NULL + 4297 `{}` = 4309 rows (metadata only). 2903 non-empty rows untouched. 0 relation_type values outside the list.

## Writer audit (functions that insert into public.edges)
| writer | change |
|---|---|
| upsert_edge | empty/null p_meta -> `{provenance_state: UNKNOWN_WRITER, writer: upsert_edge}`; non-empty preserved |
| sync_convergence | adds source/via/card_id/relation_role (card_number, highlight_number_match) |
| wire_image_meaningful, wire_number_to_images | add source/via/gallery_image_id/relation_role |
| fn_ti_project_demand, graph_wire_number, project_language_bridges | already non-empty; no change |
| project_contribution_to_graph | via upsert_edge with `via`/`space`; no change (its contribution_links types are all allowed) |
Non-DB writers: src/ only reads edges; scripts/entities-import*, silver_878 are archived one-offs, not patched (constraints intentionally force reconciliation on reuse).
Note: `contains` rows from the two wire_* writers and sync_convergence were 2334 live; new rows now carry real provenance. Existing `edges_identity_uidx` uses only `metadata->>'period'`, unaffected.

## Not changed (proof via fingerprints in preconditions.sql)
No edge deleted; no from/to/weight/relation_type change; no alias merge; no confidence/Research Strength; relation_evidence & identity_edges untouched. UNKNOWN markers must never increase Research Strength.

## Advisor / review plan (at apply, after Human Gate)
1. Run preconditions.sql; compare fingerprints before/after.
2. Apply to a Supabase branch first; run behavior.sql.
3. `get_advisors` security + performance before/after (CHECKs add no index; SECURITY DEFINER upsert_edge retains search_path=public and ACLs).
4. Lock note: both CHECKs are NOT VALID then VALIDATE (SHARE UPDATE EXCLUSIVE scan); backfill UPDATE touches 4309 rows.
Rollback: rollback.sql (drops constraints, restores 4 writers, resets marker rows incl. the 12 originally NULL by id).

## Caveats
Not executed against any database (no local Postgres in the routine sandbox; live apply prohibited). SQL syntax reviewed by hand; behavior.sql must pass on a branch DB before apply.
