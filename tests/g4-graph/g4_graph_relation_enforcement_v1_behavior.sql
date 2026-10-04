-- Behavioral test for G4_GRAPH_RELATION_ENFORCEMENT_V1. Run ONLY on a Supabase branch/scratch DB AFTER the
-- migration, inside this transaction (always rolled back). NEVER run against live project linswmnnkjxvweumprav
-- before the Human Gate. Expect no exception; final line returns 'G4 behavior OK'.
begin;
do $$
declare a uuid; b uuid; ok boolean;
begin
  -- constraints present and validated
  assert (select count(*) from pg_constraint where conrelid='public.edges'::regclass
          and conname in ('edges_relation_type_vocab_chk','edges_metadata_nonempty_chk') and convalidated)=2, 'constraints validated';
  assert not exists (select 1 from public.edges where metadata is null or metadata='{}'::jsonb), 'no null/empty metadata remains';
  select id into a from public.nodes order by id limit 1;
  select id into b from public.nodes where id<>a order by id limit 1;

  -- unsupported relation rejected
  begin insert into public.edges(from_node,to_node,relation_type,metadata) values(a,b,'typo_rel','{"source":"t"}'); ok:=false;
  exception when check_violation then ok:=true; end; assert ok, 'unsupported relation rejected';
  -- reserved + authored_by_external allowed
  insert into public.edges(from_node,to_node,relation_type,metadata) values(a,b,'same_as','{"source":"t"}');
  insert into public.edges(from_node,to_node,relation_type,metadata) values(a,b,'alias_of','{"source":"t"}');
  insert into public.edges(from_node,to_node,relation_type,metadata) values(a,b,'variant_of','{"source":"t"}');
  insert into public.edges(from_node,to_node,relation_type,metadata) values(a,b,'authored_by_external','{"source":"t"}');
  -- empty / null metadata rejected on direct insert
  begin insert into public.edges(from_node,to_node,relation_type,metadata) values(a,b,'related','{}'); ok:=false;
  exception when check_violation then ok:=true; end; assert ok, 'empty metadata rejected';
  begin insert into public.edges(from_node,to_node,relation_type,metadata) values(a,b,'related',null); ok:=false;
  exception when check_violation then ok:=true; end; assert ok, 'null metadata rejected';
  -- generic upsert_edge with empty meta writes explicit UNKNOWN_WRITER
  delete from public.edges where from_node=a and to_node=b;
  perform public.upsert_edge(a,b,'related','{}'::jsonb);
  assert (select metadata->>'provenance_state' from public.edges where from_node=a and to_node=b and relation_type='related')='UNKNOWN_WRITER';
  -- upsert_edge with real meta preserves it
  delete from public.edges where from_node=a and to_node=b;
  perform public.upsert_edge(a,b,'related','{"via":"contribution","space":"core"}'::jsonb);
  assert (select metadata->>'via' from public.edges where from_node=a and to_node=b)='contribution';
end $$;
rollback;
select 'G4 behavior OK' as result;
