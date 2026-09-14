-- G2 Bedrock: extend existing Research Object successor/revision mechanism to Observation.
-- EXTEND_EXISTING only. No new store/system. Human Gate: ZURIEL, 2026-09-13.

do $do$
declare v_trig text; v_corr text;
begin
  select pg_get_functiondef('public.fn_snapshot_research_object_revision()'::regprocedure) into v_trig;
  if position('OLD.kind in (''fact'',''relation'')' in v_trig)>0 then
    v_trig := replace(v_trig, 'OLD.kind in (''fact'',''relation'')', 'OLD.kind in (''fact'',''relation'',''observation'')');
    v_trig := replace(v_trig, 'an approved/canonical fact or relation''s statement/value/terms/relates', 'an approved/canonical fact, relation or observation''s statement/value/terms/relates');
    execute v_trig;
  elsif position('OLD.kind in (''fact'',''relation'',''observation'')' in v_trig)=0 then
    raise exception 'unexpected trigger definition';
  end if;

  select pg_get_functiondef('public.fn_research_object_correct(uuid,text,text,integer,text[],text[])'::regprocedure) into v_corr;
  if position('v_old.kind not in (''fact'', ''relation'')' in v_corr)>0 then
    v_corr := replace(v_corr, 'v_old.kind not in (''fact'', ''relation'')', 'v_old.kind not in (''fact'', ''relation'', ''observation'')');
    v_corr := replace(v_corr, 'fn_research_object_correct is only for kind=fact|relation; other kinds may be edited in place (never gated)', 'fn_research_object_correct is for governed material correction of kind=fact|relation|observation; hypothesis/question remain outside this successor gate');
  elsif position('v_old.kind not in (''fact'', ''relation'', ''observation'')' in v_corr)=0 then
    raise exception 'unexpected correction definition';
  end if;

  if position('set successor_id = v_new_id' in v_corr)=0 then
    v_corr := replace(v_corr,
      'perform set_config(''app.allow_claim_correction'', '''', true);',
$rep$perform set_config('app.allow_claim_correction', '', true);

  update public.research_object_revisions
     set successor_id = v_new_id
   where id = (
     select r.id from public.research_object_revisions r
      where r.research_object_id = p_id
        and r.change_kind = 'update'
        and r.successor_id is null
      order by r.id desc limit 1
   );$rep$);
  end if;
  execute v_corr;

  if not exists (
    select 1 from pg_constraint
     where conname='research_object_revisions_successor_id_fkey'
       and conrelid='public.research_object_revisions'::regclass
  ) then
    alter table public.research_object_revisions
      add constraint research_object_revisions_successor_id_fkey
      foreign key (successor_id) references public.research_objects(id) on delete set null;
  end if;
end $do$;

revoke execute on function public.fn_snapshot_research_object_revision() from public, anon, authenticated, service_role;
revoke execute on function public.fn_research_object_correct(uuid,text,text,integer,text[],text[]) from public, anon, service_role;
grant execute on function public.fn_research_object_correct(uuid,text,text,integer,text[],text[]) to authenticated;

comment on function public.fn_research_object_correct(uuid,text,text,integer,text[],text[]) is
'Governed material correction/successor RPC for approved/canonical fact, relation and observation. Creates candidate successor and links latest predecessor revision.successor_id. G2 Bedrock observation lineage 2026-09-13.';
