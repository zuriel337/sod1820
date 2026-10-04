-- Read-only preconditions/census for apply time (re-run immediately before any Human-Gated apply).
select relation_type, count(*) from public.edges
 where relation_type <> all (array['bridges_to','cipher_link','contained_in','contains','contributes_to','converges_on','cross','demand_signal','derived_from','discovered_by','documents','equals','equals_by_depth','equals_word','extends_rule','has_language_bridge','interpreted_by','is_kadmi_of','kadmi_equals','kadmi_reverse_of','mentions','opposite_of','related','relates_to','represents','reverse_of','scale','scale_x10','seeded_by','source','zero_scale','same_as','alias_of','variant_of','authored_by_external'])
 group by 1;                                        -- expect 0 rows
select count(*) filter (where metadata is null) null_meta, count(*) filter (where metadata='{}'::jsonb) empty_meta,
       count(*) filter (where metadata is not null and metadata<>'{}'::jsonb) nonempty_meta, count(*) total from public.edges;  -- 2026-10-04: 12 / 4297 / 2903 / 7212
select distinct relation_type from public.contribution_links;  -- must be subset of allowed list
-- fingerprint to prove no endpoint/weight/relation_type change: run before and after, compare
select md5(string_agg(id::text||from_node::text||to_node::text||relation_type||coalesce(weight::text,''), ',' order by id)) from public.edges;
-- nonempty-metadata preservation fingerprint (must be identical before/after)
select md5(string_agg(id::text||metadata::text, ',' order by id)) from public.edges where metadata is not null and metadata<>'{}'::jsonb;
