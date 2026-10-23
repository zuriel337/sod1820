-- WORLD_SPATIAL_STRUCTURES_METADATA_V1
-- Research metadata only. This migration does not change RLS, privacy_scope, status,
-- publication, graph promotion or any durable source row.

with spatial_manifest(source_ref, cluster_id, section_key, shape_key, media_ref, duplicate_of, geometry_state) as (
  values
    ('channel_updates:2eb781a4-1389-42b9-b19e-a1ff27ed861f', 'hashgacha-pratit-1020', 'solids', 'cube', 'channel_updates:2eb781a4-1389-42b9-b19e-a1ff27ed861f', null, 'basic_geometry_verified'),
    ('channel_updates:a6805e30-21e0-4315-8f35-70b1bfdb0d14', 'raza-deshabbat-910', 'solids', 'cube', 'channel_updates:a6805e30-21e0-4315-8f35-70b1bfdb0d14', null, 'basic_geometry_verified'),
    ('channel_updates:bc0aa8ce-30fc-4a22-b42d-113a456f5e58', 'raza-deshabbat-910', 'solids', 'cube', 'channel_updates:0cae4513-9e41-4bd9-a938-a8d9a26938b6', 'channel_updates:a6805e30-21e0-4315-8f35-70b1bfdb0d14', 'basic_geometry_verified'),
    ('channel_updates:9a2ebafc-592a-4bd3-9ab6-f0edf2b086f5', 'keter-icosahedron-620', 'solids', 'icosahedron', 'channel_updates:9a2ebafc-592a-4bd3-9ab6-f0edf2b086f5', null, 'basic_geometry_verified'),
    ('channel_updates:beb34cf8-de31-413e-af6e-73efabceda24', 'keter-icosahedron-620', 'solids', 'icosahedron', 'channel_updates:beb34cf8-de31-413e-af6e-73efabceda24', 'channel_updates:9a2ebafc-592a-4bd3-9ab6-f0edf2b086f5', 'basic_geometry_verified'),
    ('channel_updates:b0d16169-e7a8-424a-984f-9c7435d12594', 'keter-icosahedron-620', 'solids', 'icosahedron', 'channel_updates:dabebad9-37fa-4962-a7d5-21a677b8b0c4', 'channel_updates:9a2ebafc-592a-4bd3-9ab6-f0edf2b086f5', 'basic_geometry_verified'),
    ('channel_updates:71662e56-24dd-4a4a-8dea-b615d636b509', 'matamim-cube-1254', 'solids', 'cube', 'channel_updates:71662e56-24dd-4a4a-8dea-b615d636b509', null, 'basic_geometry_verified'),
    ('channel_updates:14d5652b-55b2-4bf7-9184-049b1afb94a0', 'matamim-cube-1254', 'solids', 'cube', null, null, 'basic_geometry_verified'),
    ('channel_updates:e68793a9-a7ae-46a5-8023-ca209dd8a65f', 'yesharim-3060-family', 'complex', 'compound_cube_pentagon_triangles', null, null, 'source_diagram_review'),
    ('channel_updates:39d0dba8-9fa1-4743-9ebc-4f7d5c155a0b', 'yesharim-3060-family', 'complex', 'compound_cube_pentagon_triangles', 'channel_updates:305b8335-72bf-43e5-9edd-0d1b4340f97f', null, 'source_diagram_review'),
    ('channel_updates:64155afc-c205-42a8-8e74-0315ab93cda6', 'yesharim-3060-family', 'complex', 'compound_cube_pentagon_triangles', 'channel_updates:3c8ea715-0e4e-4690-9d49-b011b71b61d2', null, 'source_diagram_review'),
    ('channel_updates:94be5c72-3042-4c61-8fe7-134ce57b3edc', 'yesharim-3060-family', 'complex', 'compound_cube_pentagon_triangles', 'channel_updates:2a3d4ece-101d-41a1-af0f-51851db890d5', null, 'source_diagram_review'),
    ('channel_updates:d5bef7a5-0673-4c2e-98da-0d1c538724ad', 'yesharim-3060-family', 'complex', 'compound_cube_pentagon_triangles', 'channel_updates:5ea25825-f2da-4b7f-ae23-77b0868408a6', 'channel_updates:39d0dba8-9fa1-4743-9ebc-4f7d5c155a0b', 'source_diagram_review'),
    ('channel_updates:d76e2d8c-724f-454e-bff3-7668dbb6ab82', 'yesharim-3060-family', 'complex', 'compound_cube_pentagon_triangles', null, null, 'source_diagram_review'),
    ('channel_updates:aa5276b4-6246-4334-8d96-5e8111ccff0c', 'emunah-brit-cube-612', 'series', 'cube', 'channel_updates:d485746a-4557-4e3b-b367-f0fe9693df46', null, 'basic_geometry_verified'),
    ('channel_updates:710edaf6-440a-4e40-931c-b1626503d744', 'emunah-brit-cube-612', 'series', 'cube', 'channel_updates:51e71029-045c-4489-8a89-364c529a6d09', 'channel_updates:aa5276b4-6246-4334-8d96-5e8111ccff0c', 'basic_geometry_verified'),
    ('channel_updates:1011feef-c35f-44b6-9c3d-450e1fc0ca1d', 'emunah-brit-cube-612', 'series', 'cube', 'channel_updates:d897c365-d977-4ca1-a32a-74f36ebfcd50', null, 'basic_geometry_verified'),
    ('channel_updates:bf535fbb-5422-4d77-b3b2-1b6a5a149711', 'chai-cube-1080', 'series', 'cube', 'channel_updates:a9d05b02-55cd-4de9-8491-0ae521f010e2', 'channel_updates:29ba7ea6-96b8-4143-97b0-b3882a999cef', 'basic_geometry_verified'),
    ('channel_updates:29ba7ea6-96b8-4143-97b0-b3882a999cef', 'chai-cube-1080', 'series', 'cube', 'channel_updates:38e1658c-b52d-4e19-98a8-7515d3ea5e76', null, 'basic_geometry_verified'),
    ('channel_updates:175ef8a6-b683-41e0-aac2-c50bcd3f72a3', 'chai-star-1080', 'solids', 'sixty_face_star', 'channel_updates:799e955a-3214-4c1d-bd54-3786fa8b9029', null, 'source_diagram_review'),
    ('channel_updates:3d964695-e6de-41b4-b58d-952f6146d90d', 'zot-cube-408', 'solids', 'cube', null, null, 'basic_geometry_verified'),
    ('channel_updates:e68735d7-71a4-417e-8ea7-33db737b793f', 'arbaat-haminim-cube-828', 'solids', 'cube', 'channel_updates:6afe9c9f-523c-4567-b63a-b17831644ece', 'channel_updates:9f67e21f-cfea-4ee7-a113-e43548772afc', 'basic_geometry_verified'),
    ('channel_updates:9f67e21f-cfea-4ee7-a113-e43548772afc', 'arbaat-haminim-cube-828', 'solids', 'cube', 'channel_updates:6afe9c9f-523c-4567-b63a-b17831644ece', null, 'basic_geometry_verified'),
    ('channel_updates:3aa20146-133d-4183-9e24-540c0ce0dd28', 'na-kippur-cube-306', 'solids', 'cube', 'channel_updates:0342eef3-f47b-4661-bf50-2707bd4a9120', null, 'basic_geometry_verified'),
    ('channel_updates:432ed0eb-d367-4383-9ce8-03c7020af9aa', 'na-kippur-cube-306', 'solids', 'cube', 'channel_updates:0342eef3-f47b-4661-bf50-2707bd4a9120', 'channel_updates:3aa20146-133d-4183-9e24-540c0ce0dd28', 'basic_geometry_verified'),
    ('channel_updates:21efe320-1035-4321-a690-212c867da536', 'zot-compound-408', 'complex', 'compound_pentagon_octagon', 'channel_updates:10979eaa-d3cb-4afa-8f2c-5a3f7462dea5', null, 'source_diagram_review'),
    ('channel_updates:4a9649ed-cca8-4938-b83b-fc0e3f935da7', 'zot-compound-408', 'complex', 'compound_pentagon_octagon', 'channel_updates:10979eaa-d3cb-4afa-8f2c-5a3f7462dea5', 'channel_updates:21efe320-1035-4321-a690-212c867da536', 'source_diagram_review')
), ranked as (
  select ro.id, sm.*,
         row_number() over (
           partition by sm.source_ref
           order by (ro.kind = 'observation') desc, length(coalesce(ro.statement, '')) desc, ro.created_at, ro.id
         ) as rn
  from spatial_manifest sm
  join public.research_objects ro on split_part(ro.source_ref, '#', 1) = sm.source_ref
  where ro.privacy_scope = 'public'
), picked as (
  select * from ranked where rn = 1
)
update public.research_objects ro
set meta = jsonb_set(
  jsonb_set(coalesce(ro.meta, '{}'::jsonb), '{ext}', coalesce(ro.meta->'ext', '{}'::jsonb), true),
  '{ext,spatial_research}',
  coalesce(ro.meta#>'{ext,spatial_research}', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'contract', 'world_spatial_structures_v1',
    'classification', 'HUMAN_CURATED_SPATIAL_CLUSTER',
    'cluster_id', p.cluster_id,
    'section', p.section_key,
    'shape', p.shape_key,
    'source_ref', p.source_ref,
    'media_ref', p.media_ref,
    'duplicate_of', p.duplicate_of,
    'calculation_verification', 'deterministic_exact',
    'geometry_verification', p.geometry_state,
    'curated_by', 'human_gate:ZURIEL',
    'curated_at', '2026-10-23T00:00:00Z'
  )),
  true
)
from picked p
where ro.id = p.id;

with constant_manifest(source_ref, case_id, formula, media_ref) as (
  values
    ('channel_updates:1eb4df29-9b31-4773-8fce-ec84b1cef609', 'e-pi-minus-pi-20', 'e^pi - pi', 'channel_updates:4cab1899-520b-4c27-9d97-2c7893271d7b'),
    ('channel_updates:b76c4363-9b82-4672-aad9-eb1d6bdd4c70', 'pi45-e6-403', 'pi^4 + pi^5 ~= e^6', 'channel_updates:239e8685-57a6-48b8-9b1f-bac368a532db')
), ranked as (
  select ro.id, cm.*,
         row_number() over (
           partition by cm.source_ref
           order by (ro.kind = 'observation') desc, length(coalesce(ro.statement, '')) desc, ro.created_at, ro.id
         ) as rn
  from constant_manifest cm
  join public.research_objects ro on split_part(ro.source_ref, '#', 1) = cm.source_ref
  where ro.privacy_scope = 'public'
), picked as (
  select * from ranked where rn = 1
)
update public.research_objects ro
set meta = jsonb_set(
  jsonb_set(coalesce(ro.meta, '{}'::jsonb), '{ext}', coalesce(ro.meta->'ext', '{}'::jsonb), true),
  '{ext,constant_research}',
  coalesce(ro.meta#>'{ext,constant_research}', '{}'::jsonb) || jsonb_build_object(
    'contract', 'world_constant_series_v1',
    'classification', 'HUMAN_CURATED_CONSTANT_CASE',
    'case_id', p.case_id,
    'formula', p.formula,
    'source_ref', p.source_ref,
    'media_ref', p.media_ref,
    'relation', 'approximation',
    'calculation_verification', 'deterministic_approximation_verified',
    'curated_by', 'human_gate:ZURIEL',
    'curated_at', '2026-10-23T00:00:00Z'
  ),
  true
)
from picked p
where ro.id = p.id;
