-- ELS private-guarantee (ZURIEL recommendation 26.11.2026). NOT APPLIED. Owner-approved operator action only.
-- One rule: visibility='private' is never readable by anyone but its owner and administrators.
-- "Show in the public file" stays the existing owner action (self_publish_matrix) but becomes an explicit publication that moves the
-- access state with it (visibility -> public). It never makes a cipher moderation-approved (status stays out of 'published'), never writes
-- decision_ledger and never changes any row by itself: no data rewrite, no new table, trigger or mechanism.
begin;
do $guard$
begin
  if md5(pg_get_functiondef('public.self_publish_matrix(uuid,boolean)'::regprocedure)) <> 'e5fb2afa044c0ec42640fa1584163dec' then
    raise exception 'Unexpected self_publish_matrix version';
  end if;
  if (select pg_get_expr(polqual, polrelid) from pg_policy
      where polrelid = 'public.els_records'::regclass and polname = 'public_read_self_published_els') is distinct from '(self_published = true)' then
    raise exception 'Unexpected public_read_self_published_els policy';
  end if;
end;
$guard$;

drop policy public_read_self_published_els on public.els_records;
create policy public_read_self_published_els on public.els_records for select
  using (self_published = true and visibility = 'public');

create or replace function public.self_publish_matrix(p_id uuid, p_on boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); r public.els_records%rowtype; v_gate text; v_status text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select * into r from public.els_records where id = p_id for update;
  if not found or r.owner_user_id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.owner_user_id <> v_uid then return jsonb_build_object('ok', false, 'error', 'not_owner'); end if;

  if coalesce(p_on, true) then
    -- A withheld or archived record is not republished by its owner.
    if r.status in ('hidden', 'archived') then return jsonb_build_object('ok', false, 'error', 'withheld'); end if;
    -- Making a private record public is a publication: it passes the same canonical replay gate as a public save.
    if r.visibility is distinct from 'public' then
      v_gate := public.els_publish_truth_gate_v1(r.search_term, r.scope, r.skip_distance, r.direction, r.start_index);
      if v_gate is distinct from 'MATCH' then
        raise exception 'els_publish_gate: %', v_gate using errcode = 'check_violation';
      end if;
    end if;
    -- A draft becomes a pending submission (awaiting moderation). Nothing here sets 'published' (moderation approval).
    v_status := case when r.status = 'draft' then 'pending' else r.status end;
    update public.els_records set self_published = true, visibility = 'public', status = v_status where id = p_id;
    return jsonb_build_object('ok', true, 'id', p_id, 'self_published', true, 'visibility', 'public', 'status', v_status);
  end if;

  -- Withdrawal returns an owner-published record to private. A moderation-approved record keeps its approved library access.
  v_status := case when r.status = 'pending' then 'draft' else r.status end;
  update public.els_records
     set self_published = false,
         visibility = case when r.status = 'published' then r.visibility else 'private' end,
         status = v_status
   where id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id, 'self_published', false,
    'visibility', case when r.status = 'published' then r.visibility else 'private' end, 'status', v_status);
end
$function$;
commit;
