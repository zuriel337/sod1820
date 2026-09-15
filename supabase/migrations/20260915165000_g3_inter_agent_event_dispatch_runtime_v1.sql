-- G3_INTER_AGENT_EVENT_DRIVEN_DISPATCH_RUNTIME_V1
-- Human Gate carry-forward: inter_agent_coordination_law v11.
-- EXTEND_EXISTING only: work_log remains the Coordination Ledger.
-- No Agent System, queue authority, Coordination Store, Truth Store or parallel owner.
--
-- Release order (when explicitly authorized):
--   1) deploy supabase/functions/agent-dispatch (verify_jwt=false; internal Vault header gate)
--   2) apply this migration (activates event trigger + recovery cron)
--
-- Dispatch never grants WRITE/release/publish/canonicalization authority.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Structured transport state lives ON the existing work_log row.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.work_log
  add column if not exists task_key text,
  add column if not exists from_actor text,
  add column if not exists to_actor text,
  add column if not exists assignment_mode text,
  add column if not exists assignment_scope text,
  add column if not exists primary_owner text,
  add column if not exists release_authorization_state text,
  add column if not exists parent_assignment_id uuid references public.work_log(id),
  add column if not exists dispatch_kind text,
  add column if not exists dispatch_state text,
  add column if not exists dispatch_context jsonb default '{}'::jsonb,
  add column if not exists dispatch_attempts integer default 0,
  add column if not exists dispatch_next_attempt_at timestamptz,
  add column if not exists dispatch_lease_owner text,
  add column if not exists dispatch_lease_expires_at timestamptz,
  add column if not exists dispatch_last_error text,
  add column if not exists dispatch_last_request_id bigint,
  add column if not exists dispatch_last_emitted_at timestamptz,
  add column if not exists dispatch_completed_at timestamptz;

alter table public.work_log
  drop constraint if exists work_log_assignment_mode_ck,
  add constraint work_log_assignment_mode_ck
    check (assignment_mode is null or assignment_mode in ('READ_ONLY','WRITE')),
  drop constraint if exists work_log_from_actor_ck,
  add constraint work_log_from_actor_ck
    check (from_actor is null or from_actor in ('GPT','CLAUDE','ZURIEL')),
  drop constraint if exists work_log_to_actor_ck,
  add constraint work_log_to_actor_ck
    check (to_actor is null or to_actor in ('GPT','CLAUDE','ZURIEL')),
  drop constraint if exists work_log_dispatch_kind_ck,
  add constraint work_log_dispatch_kind_ck
    check (dispatch_kind is null or dispatch_kind in ('ASSIGNMENT','RESULT_WAKE')),
  drop constraint if exists work_log_dispatch_state_ck,
  add constraint work_log_dispatch_state_ck
    check (dispatch_state is null or dispatch_state in (
      'QUEUED','CLAIMED','RETRY_WAIT','DEFERRED','FAILED','CANCELLED','COMPLETED'
    )),
  drop constraint if exists work_log_dispatch_attempts_ck,
  add constraint work_log_dispatch_attempts_ck
    check (dispatch_attempts is null or dispatch_attempts between 0 and 20);

create index if not exists work_log_task_key_idx
  on public.work_log(task_key, created_at desc)
  where task_key is not null;

create index if not exists work_log_parent_assignment_idx
  on public.work_log(parent_assignment_id)
  where parent_assignment_id is not null;

create index if not exists work_log_dispatch_ready_idx
  on public.work_log(dispatch_state, dispatch_next_attempt_at, created_at)
  where archived = false
    and superseded_by_id is null
    and dispatch_state in ('QUEUED','RETRY_WAIT','CLAIMED','DEFERRED');

-- Idempotency: a task_key addresses one assignment to one agent exactly once.
create unique index if not exists work_log_assignment_idempotency_uidx
  on public.work_log(task_key, to_actor, dispatch_kind)
  where task_key is not null
    and to_actor is not null
    and dispatch_kind = 'ASSIGNMENT';

-- ONE SCOPE — ONE ACTIVE WRITER is enforced at DB level for structured assignments.
create unique index if not exists work_log_one_active_writer_scope_uidx
  on public.work_log(lower(assignment_scope))
  where assignment_scope is not null
    and assignment_mode = 'WRITE'
    and dispatch_kind = 'ASSIGNMENT'
    and archived = false
    and superseded_by_id is null
    and coalesce(dispatch_state, 'QUEUED') not in ('FAILED','CANCELLED','COMPLETED');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Existing Vault is reused for the DB → Edge webhook secret.
--    No secret registry/system is created.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'AGENT_DISPATCH_WEBHOOK_KEY'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'AGENT_DISPATCH_WEBHOOK_KEY',
      'G3 work_log → agent-dispatch internal webhook key. Transport secret only; no governance authority.'
    );
  end if;
end
$$;

create or replace function public.agent_dispatch_verify_webhook(p_key text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select exists (
    select 1
    from vault.decrypted_secrets s
    where s.name = 'AGENT_DISPATCH_WEBHOOK_KEY'
      and s.decrypted_secret is not null
      and s.decrypted_secret = p_key
  );
$$;

revoke all on function public.agent_dispatch_verify_webhook(text) from public, anon, authenticated;
grant execute on function public.agent_dispatch_verify_webhook(text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Legacy-compatible preparation: explicit structured fields win; otherwise
--    parse only exact single-target GPT/CLAUDE envelopes from existing topic/status.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.work_log_dispatch_prepare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match text[];
  v_claimable boolean;
begin
  if new.task_key is null then
    v_match := regexp_match(coalesce(new.topic,''), 'task=([^ ]+)');
    if v_match is not null then new.task_key := v_match[1]; end if;
  end if;

  if new.from_actor is null then
    v_match := regexp_match(coalesce(new.topic,''), '(^| )FROM=(GPT|CLAUDE|ZURIEL)( |$)');
    if v_match is not null then new.from_actor := v_match[2]; end if;
  end if;

  -- Intentionally does NOT parse TO=GPT/CLAUDE multi-target text.
  -- Auto-dispatch requires one unambiguous addressed runtime.
  if new.to_actor is null then
    v_match := regexp_match(coalesce(new.topic,''), '(^| )TO=(GPT|CLAUDE)( |$)');
    if v_match is not null then new.to_actor := v_match[2]; end if;
  end if;

  if new.assignment_scope is null and new.task_key is not null then
    new.assignment_scope := new.task_key;
  end if;

  if new.assignment_mode is not null then
    new.assignment_mode := upper(new.assignment_mode);
  elsif coalesce(new.status,'') ~* '(READ_ONLY|SPECIALIST|CHALLENGE)' then
    new.assignment_mode := 'READ_ONLY';
  elsif coalesce(new.status,'') ~* '(CLAIMED_WRITE|WRITE_SCOPE|ASSIGNED_WRITE)' then
    new.assignment_mode := 'WRITE';
  end if;

  v_claimable := coalesce(new.status,'') ~* '(QUEUED|ASSIGNED|ACK_REQUIRED|WAITING_SPECIALIST)';

  if new.dispatch_kind is null
     and new.task_key is not null
     and new.to_actor in ('GPT','CLAUDE')
     and v_claimable then
    new.dispatch_kind := 'ASSIGNMENT';
  end if;

  -- Fail safe: legacy claimable specialist rows without an explicit mode are
  -- READ_ONLY. WRITE must be stated structurally or in the assignment status.
  if new.dispatch_kind = 'ASSIGNMENT'
     and new.assignment_mode is null then
    new.assignment_mode := 'READ_ONLY';
  end if;

  if new.dispatch_kind in ('ASSIGNMENT','RESULT_WAKE')
     and new.to_actor in ('GPT','CLAUDE')
     and new.dispatch_state is null then
    new.dispatch_state := 'QUEUED';
    new.dispatch_next_attempt_at := coalesce(new.dispatch_next_attempt_at, now());
  end if;

  new.dispatch_context := coalesce(new.dispatch_context, '{}'::jsonb);
  new.dispatch_attempts := coalesce(new.dispatch_attempts, 0);
  return new;
end;
$$;

revoke all on function public.work_log_dispatch_prepare() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Event emitter: pg_net is PRIMARY transport. It only sends assignment_id.
--    Prompt/task content is reloaded server-side by the Edge dispatcher.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.agent_dispatch_emit(p_assignment_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  v_row public.work_log%rowtype;
  v_key text;
  v_request_id bigint;
begin
  select * into v_row
  from public.work_log
  where id = p_assignment_id
  for update;

  if not found
     or v_row.archived
     or v_row.superseded_by_id is not null
     or v_row.to_actor not in ('GPT','CLAUDE')
     or v_row.dispatch_state not in ('QUEUED','RETRY_WAIT')
     or coalesce(v_row.dispatch_next_attempt_at, now()) > now() then
    return null;
  end if;

  -- Duplicate suppression for trigger recursion / recovery overlap.
  if v_row.dispatch_last_emitted_at is not null
     and v_row.dispatch_last_emitted_at > now() - interval '45 seconds' then
    return v_row.dispatch_last_request_id;
  end if;

  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'AGENT_DISPATCH_WEBHOOK_KEY'
  order by created_at desc
  limit 1;

  if v_key is null or length(v_key) < 32 then
    update public.work_log
       set dispatch_last_error = 'dispatcher_webhook_key_missing'
     where id = p_assignment_id;
    return null;
  end if;

  begin
    select net.http_post(
      url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/agent-dispatch',
      body := jsonb_build_object('assignment_id', p_assignment_id),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-agent-dispatch-key',v_key
      ),
      timeout_milliseconds := 5000
    ) into v_request_id;

    update public.work_log
       set dispatch_last_request_id = v_request_id,
           dispatch_last_emitted_at = now(),
           dispatch_last_error = null
     where id = p_assignment_id;

    return v_request_id;
  exception when others then
    update public.work_log
       set dispatch_last_error = left('emit_error:' || sqlerrm, 1000),
           dispatch_last_emitted_at = now()
     where id = p_assignment_id;
    return null;
  end;
end;
$$;

revoke all on function public.agent_dispatch_emit(uuid) from public, anon, authenticated;
grant execute on function public.agent_dispatch_emit(uuid) to service_role;

create or replace function public.work_log_dispatch_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.to_actor in ('GPT','CLAUDE')
     and new.dispatch_state in ('QUEUED','RETRY_WAIT')
     and coalesce(new.dispatch_next_attempt_at, now()) <= now() then
    perform public.agent_dispatch_emit(new.id);
  end if;
  return null;
end;
$$;

revoke all on function public.work_log_dispatch_after_write() from public, anon, authenticated;

drop trigger if exists trg_work_log_dispatch_prepare on public.work_log;
create trigger trg_work_log_dispatch_prepare
before insert or update on public.work_log
for each row execute function public.work_log_dispatch_prepare();

drop trigger if exists trg_work_log_dispatch_event on public.work_log;
create trigger trg_work_log_dispatch_event
after insert or update of dispatch_state, dispatch_next_attempt_at on public.work_log
for each row execute function public.work_log_dispatch_after_write();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Canonical structured assignment writer.
--    Admin/UI callers must be authenticated admins; service_role is allowed.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.work_log_assign_agent(
  p_from_actor text,
  p_to_actor text,
  p_task_key text,
  p_primary_owner text,
  p_mode text,
  p_scope text,
  p_objective text,
  p_dependencies text[] default '{}'::text[],
  p_do_not_touch text[] default '{}'::text[],
  p_verification text default null,
  p_stop_condition text default null,
  p_expected_output text default null,
  p_release_authorization_state text default 'NOT_AUTHORIZED',
  p_github_paths text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from text := upper(trim(coalesce(p_from_actor,'')));
  v_to text := upper(trim(coalesce(p_to_actor,'')));
  v_mode text := upper(trim(coalesce(p_mode,'')));
  v_existing uuid;
  v_id uuid;
begin
  if auth.role() <> 'service_role'
     and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

  if v_from not in ('GPT','CLAUDE','ZURIEL') then raise exception 'invalid from_actor'; end if;
  if v_to not in ('GPT','CLAUDE') then raise exception 'invalid to_actor'; end if;
  if v_mode not in ('READ_ONLY','WRITE') then raise exception 'invalid assignment mode'; end if;
  if coalesce(p_task_key,'') !~ '^[A-Za-z0-9._:-]{3,160}$' then raise exception 'invalid task_key'; end if;
  if length(trim(coalesce(p_scope,''))) < 2 then raise exception 'scope required'; end if;
  if length(trim(coalesce(p_primary_owner,''))) < 2 then raise exception 'primary_owner required'; end if;
  if length(trim(coalesce(p_objective,''))) < 2 then raise exception 'objective required'; end if;

  perform pg_advisory_xact_lock(hashtext('agent_dispatch:' || p_task_key));

  select id into v_existing
  from public.work_log
  where task_key = p_task_key
    and to_actor = v_to
    and dispatch_kind = 'ASSIGNMENT'
  order by created_at desc
  limit 1;

  if v_existing is not null then
    return v_existing; -- idempotent duplicate suppression
  end if;

  if v_mode = 'WRITE' and exists (
    select 1 from public.work_log
    where lower(assignment_scope) = lower(p_scope)
      and assignment_mode = 'WRITE'
      and dispatch_kind = 'ASSIGNMENT'
      and archived = false
      and superseded_by_id is null
      and coalesce(dispatch_state,'QUEUED') not in ('FAILED','CANCELLED','COMPLETED')
  ) then
    raise exception 'active writer already exists for scope %', p_scope;
  end if;

  insert into public.work_log(
    topic, status, what_we_did, open_threads,
    task_key, from_actor, to_actor, assignment_mode, assignment_scope,
    primary_owner, release_authorization_state, dispatch_kind, dispatch_state,
    dispatch_next_attempt_at, dispatch_context
  ) values (
    format('actor=%s FROM=%s TO=%s task=%s — ASSIGNMENT', v_from, v_from, v_to, p_task_key),
    format('ASSIGNED_%s_EVENT_DRIVEN_DISPATCH_PENDING', v_mode),
    left(p_objective, 12000),
    left(concat_ws(E'\n',
      case when coalesce(array_length(p_dependencies,1),0) > 0 then 'DEPENDENCIES: ' || array_to_string(p_dependencies, ' · ') end,
      case when coalesce(array_length(p_do_not_touch,1),0) > 0 then 'DO_NOT_TOUCH: ' || array_to_string(p_do_not_touch, ' · ') end,
      case when p_verification is not null then 'VERIFICATION: ' || p_verification end,
      case when p_stop_condition is not null then 'STOP_CONDITION: ' || p_stop_condition end,
      case when p_expected_output is not null then 'EXPECTED_OUTPUT: ' || p_expected_output end,
      'release_authorization_state=' || coalesce(p_release_authorization_state,'NOT_AUTHORIZED')
    ), 12000),
    p_task_key, v_from, v_to, v_mode, p_scope,
    p_primary_owner, coalesce(p_release_authorization_state,'NOT_AUTHORIZED'),
    'ASSIGNMENT', 'QUEUED', now(),
    jsonb_build_object(
      'objective', p_objective,
      'dependencies', to_jsonb(coalesce(p_dependencies,'{}'::text[])),
      'do_not_touch', to_jsonb(coalesce(p_do_not_touch,'{}'::text[])),
      'verification', p_verification,
      'stop_condition', p_stop_condition,
      'expected_output', p_expected_output,
      'github_paths', to_jsonb(coalesce(p_github_paths,'{}'::text[])),
      'created_via', 'work_log_assign_agent_v1'
    )
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.work_log_assign_agent(text,text,text,text,text,text,text,text[],text[],text,text,text,text,text[]) from public, anon;
grant execute on function public.work_log_assign_agent(text,text,text,text,text,text,text,text[],text[],text,text,text,text,text[]) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Claim / lease: service-role runtime only. Attempts increment on CLAIM.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.agent_dispatch_claim(
  p_assignment_id uuid,
  p_worker text,
  p_lease_seconds integer default 900
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.work_log%rowtype;
  v_lease integer := greatest(30, least(coalesce(p_lease_seconds,900), 1800));
begin
  if length(trim(coalesce(p_worker,''))) < 3 then raise exception 'worker required'; end if;

  update public.work_log w
     set dispatch_state = 'CLAIMED',
         dispatch_attempts = coalesce(w.dispatch_attempts,0) + 1,
         dispatch_lease_owner = left(p_worker, 200),
         dispatch_lease_expires_at = now() + make_interval(secs => v_lease),
         dispatch_next_attempt_at = null
   where w.id = p_assignment_id
     and w.archived = false
     and w.superseded_by_id is null
     and w.to_actor in ('GPT','CLAUDE')
     and coalesce(w.dispatch_attempts,0) < 3
     and (
       (w.dispatch_state in ('QUEUED','RETRY_WAIT') and coalesce(w.dispatch_next_attempt_at,now()) <= now())
       or (w.dispatch_state = 'CLAIMED' and w.dispatch_lease_expires_at < now())
     )
  returning w.* into v_row;

  if not found then return null; end if;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.agent_dispatch_claim(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.agent_dispatch_claim(uuid,text,integer) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) Runtime completion / retry / defer. Terminal outcomes create ONE AFTER row.
--    If the originating actor is GPT/CLAUDE, that AFTER becomes RESULT_WAKE.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.agent_dispatch_finish(
  p_assignment_id uuid,
  p_worker text,
  p_outcome text,
  p_result_status text,
  p_result_summary text,
  p_open_threads text default null,
  p_retryable boolean default false,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.work_log%rowtype;
  v_outcome text := upper(trim(coalesce(p_outcome,'')));
  v_after_id uuid;
  v_next interval;
  v_wake boolean;
  v_after_dispatch_state text;
  v_after_dispatch_kind text;
  v_after_to text;
begin
  select * into v_row
  from public.work_log
  where id = p_assignment_id
  for update;

  if not found then raise exception 'assignment not found'; end if;
  if v_row.dispatch_state <> 'CLAIMED'
     or v_row.dispatch_lease_owner is distinct from left(p_worker,200) then
    raise exception 'lease mismatch';
  end if;

  if v_outcome = 'DEFERRED' then
    update public.work_log
       set dispatch_state = 'DEFERRED',
           status = left(coalesce(nullif(p_result_status,''),'DEFERRED_AGENT_RUNTIME'),240),
           dispatch_last_error = left(coalesce(p_error,p_result_summary,'deferred'),1000),
           dispatch_lease_owner = null,
           dispatch_lease_expires_at = null,
           dispatch_next_attempt_at = null
     where id = p_assignment_id;
    return jsonb_build_object('state','DEFERRED','assignment_id',p_assignment_id);
  end if;

  if v_outcome = 'FAILED' and p_retryable and coalesce(v_row.dispatch_attempts,0) < 3 then
    v_next := case coalesce(v_row.dispatch_attempts,0)
      when 1 then interval '1 minute'
      when 2 then interval '5 minutes'
      else interval '15 minutes'
    end;
    update public.work_log
       set dispatch_state = 'RETRY_WAIT',
           dispatch_last_error = left(coalesce(p_error,p_result_summary,'retryable_failure'),1000),
           dispatch_next_attempt_at = now() + v_next,
           dispatch_lease_owner = null,
           dispatch_lease_expires_at = null
     where id = p_assignment_id;
    return jsonb_build_object('state','RETRY_WAIT','assignment_id',p_assignment_id,'next_attempt_at',now()+v_next);
  end if;

  if v_outcome not in ('COMPLETED','FAILED','CANCELLED') then
    raise exception 'invalid terminal outcome %', v_outcome;
  end if;

  v_wake := v_row.from_actor in ('GPT','CLAUDE');
  v_after_dispatch_state := case when v_wake then 'QUEUED' else null end;
  v_after_dispatch_kind := case when v_wake then 'RESULT_WAKE' else null end;
  v_after_to := case when v_wake then v_row.from_actor else null end;

  insert into public.work_log(
    topic, status, what_we_did, open_threads,
    task_key, from_actor, to_actor, assignment_mode, assignment_scope,
    primary_owner, release_authorization_state, parent_assignment_id,
    dispatch_kind, dispatch_state, dispatch_next_attempt_at, dispatch_context
  ) values (
    format('actor=%s FROM=%s TO=%s task=%s — AFTER',
      coalesce(v_row.to_actor,'DISPATCHER'),
      coalesce(v_row.to_actor,'DISPATCHER'),
      coalesce(v_row.from_actor,'ZURIEL'),
      coalesce(v_row.task_key,'UNKNOWN_TASK')),
    left(coalesce(nullif(p_result_status,''), 'AFTER_DISPATCH_' || v_outcome), 240),
    left(coalesce(p_result_summary,''),12000),
    left(coalesce(p_open_threads,''),12000),
    v_row.task_key,
    v_row.to_actor,
    v_after_to,
    'READ_ONLY',
    v_row.assignment_scope,
    v_row.primary_owner,
    v_row.release_authorization_state,
    v_row.id,
    v_after_dispatch_kind,
    v_after_dispatch_state,
    case when v_wake then now() else null end,
    jsonb_build_object(
      'result_of', v_row.id,
      'outcome', v_outcome,
      'attempts', coalesce(v_row.dispatch_attempts,0),
      'runtime_error', p_error,
      'originating_actor', v_row.from_actor,
      'completed_by', p_worker
    )
  ) returning id into v_after_id;

  update public.work_log
     set dispatch_state = v_outcome,
         dispatch_completed_at = now(),
         dispatch_last_error = case when v_outcome='COMPLETED' then null else left(coalesce(p_error,p_result_summary),1000) end,
         dispatch_lease_owner = null,
         dispatch_lease_expires_at = null,
         dispatch_next_attempt_at = null,
         superseded_by_id = v_after_id
   where id = p_assignment_id;

  return jsonb_build_object(
    'state',v_outcome,
    'assignment_id',p_assignment_id,
    'after_id',v_after_id,
    'result_wake_queued',v_wake
  );
end;
$$;

revoke all on function public.agent_dispatch_finish(uuid,text,text,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.agent_dispatch_finish(uuid,text,text,text,text,text,boolean,text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8) Admin cancellation + explicit requeue. Requeue resets attempts by design.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.agent_dispatch_cancel(p_assignment_id uuid, p_reason text default 'cancelled_by_human_gate')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.work_log%rowtype;
  v_after_id uuid;
  v_wake boolean;
begin
  if auth.role() <> 'service_role'
     and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

  select * into v_row from public.work_log where id=p_assignment_id for update;
  if not found then raise exception 'assignment not found'; end if;
  if v_row.dispatch_state in ('COMPLETED','FAILED','CANCELLED') then return v_row.superseded_by_id; end if;

  v_wake := v_row.from_actor in ('GPT','CLAUDE');
  insert into public.work_log(
    topic,status,what_we_did,open_threads,
    task_key,from_actor,to_actor,assignment_mode,assignment_scope,primary_owner,
    release_authorization_state,parent_assignment_id,dispatch_kind,dispatch_state,
    dispatch_next_attempt_at,dispatch_context
  ) values (
    format('actor=ZURIEL FROM=ZURIEL TO=%s task=%s — AFTER',coalesce(v_row.from_actor,'ZURIEL'),coalesce(v_row.task_key,'UNKNOWN_TASK')),
    'AFTER_DISPATCH_CANCELLED',
    left(coalesce(p_reason,'cancelled'),12000),
    '',
    v_row.task_key,'ZURIEL',case when v_wake then v_row.from_actor else null end,
    'READ_ONLY',v_row.assignment_scope,v_row.primary_owner,v_row.release_authorization_state,
    v_row.id,case when v_wake then 'RESULT_WAKE' else null end,
    case when v_wake then 'QUEUED' else null end,
    case when v_wake then now() else null end,
    jsonb_build_object('result_of',v_row.id,'outcome','CANCELLED','reason',p_reason)
  ) returning id into v_after_id;

  update public.work_log
     set dispatch_state='CANCELLED', dispatch_completed_at=now(),
         dispatch_last_error=left(coalesce(p_reason,'cancelled'),1000),
         dispatch_lease_owner=null, dispatch_lease_expires_at=null,
         dispatch_next_attempt_at=null, superseded_by_id=v_after_id
   where id=p_assignment_id;

  return v_after_id;
end;
$$;

revoke all on function public.agent_dispatch_cancel(uuid,text) from public, anon;
grant execute on function public.agent_dispatch_cancel(uuid,text) to authenticated, service_role;

create or replace function public.agent_dispatch_requeue(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
     and not coalesce(public.rd_is_admin(), false) then
    raise exception 'not authorized';
  end if;

  update public.work_log
     set dispatch_state='QUEUED',
         dispatch_attempts=0,
         dispatch_next_attempt_at=now(),
         dispatch_lease_owner=null,
         dispatch_lease_expires_at=null,
         dispatch_last_error=null,
         dispatch_last_emitted_at=null,
         dispatch_last_request_id=null,
         dispatch_completed_at=null
   where id=p_assignment_id
     and archived=false
     and superseded_by_id is null
     and dispatch_kind in ('ASSIGNMENT','RESULT_WAKE')
     and to_actor in ('GPT','CLAUDE');
  return found;
end;
$$;

revoke all on function public.agent_dispatch_requeue(uuid) from public, anon;
grant execute on function public.agent_dispatch_requeue(uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9) Recovery is NOT primary polling. It only recovers stale leases and retries
--    events that were not claimed after the event-driven emit.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.agent_dispatch_recover()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.work_log%rowtype;
  v_after_id uuid;
  v_retried integer := 0;
  v_failed integer := 0;
  v_emitted integer := 0;
  v_wake boolean;
begin
  -- Recover stale leases. Three claimed attempts exhaust the retry budget.
  for v_row in
    select * from public.work_log
    where archived=false
      and superseded_by_id is null
      and dispatch_state='CLAIMED'
      and dispatch_lease_expires_at < now()
    order by created_at
    limit 50
    for update skip locked
  loop
    if coalesce(v_row.dispatch_attempts,0) >= 3 then
      v_wake := v_row.from_actor in ('GPT','CLAUDE');
      insert into public.work_log(
        topic,status,what_we_did,open_threads,
        task_key,from_actor,to_actor,assignment_mode,assignment_scope,primary_owner,
        release_authorization_state,parent_assignment_id,dispatch_kind,dispatch_state,
        dispatch_next_attempt_at,dispatch_context
      ) values (
        format('actor=DISPATCHER FROM=%s TO=%s task=%s — AFTER',
          coalesce(v_row.to_actor,'CLAUDE'),coalesce(v_row.from_actor,'ZURIEL'),coalesce(v_row.task_key,'UNKNOWN_TASK')),
        'AFTER_DISPATCH_FAILED_LEASE_EXHAUSTED',
        'Dispatch lease expired after retry budget was exhausted.',
        'Human/runtime review required before explicit requeue.',
        v_row.task_key,v_row.to_actor,case when v_wake then v_row.from_actor else null end,
        'READ_ONLY',v_row.assignment_scope,v_row.primary_owner,v_row.release_authorization_state,
        v_row.id,case when v_wake then 'RESULT_WAKE' else null end,
        case when v_wake then 'QUEUED' else null end,
        case when v_wake then now() else null end,
        jsonb_build_object('result_of',v_row.id,'outcome','FAILED','reason','lease_exhausted')
      ) returning id into v_after_id;

      update public.work_log
         set dispatch_state='FAILED', dispatch_completed_at=now(),
             dispatch_last_error='lease_exhausted',
             dispatch_lease_owner=null, dispatch_lease_expires_at=null,
             dispatch_next_attempt_at=null, superseded_by_id=v_after_id
       where id=v_row.id;
      v_failed := v_failed + 1;
    else
      update public.work_log
         set dispatch_state='RETRY_WAIT',
             dispatch_next_attempt_at=now(),
             dispatch_last_error='stale_lease_recovered',
             dispatch_lease_owner=null,
             dispatch_lease_expires_at=null
       where id=v_row.id;
      v_retried := v_retried + 1;
    end if;
  end loop;

  -- Re-emit due event rows whose previous event was never claimed.
  for v_row in
    select * from public.work_log
    where archived=false
      and superseded_by_id is null
      and to_actor in ('GPT','CLAUDE')
      and dispatch_state in ('QUEUED','RETRY_WAIT')
      and coalesce(dispatch_next_attempt_at,now()) <= now()
      and (dispatch_last_emitted_at is null or dispatch_last_emitted_at < now()-interval '45 seconds')
    order by created_at
    limit 100
  loop
    perform public.agent_dispatch_emit(v_row.id);
    v_emitted := v_emitted + 1;
  end loop;

  return jsonb_build_object('stale_retried',v_retried,'terminal_failed',v_failed,'events_reemitted',v_emitted);
end;
$$;

revoke all on function public.agent_dispatch_recover() from public, anon, authenticated;
grant execute on function public.agent_dispatch_recover() to service_role;

-- Replace any previous same-name recovery job. Event trigger remains PRIMARY.
do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname='g3-agent-dispatch-recovery' loop
    perform cron.unschedule(r.jobid);
  end loop;
  perform cron.schedule(
    'g3-agent-dispatch-recovery',
    '* * * * *',
    'select public.agent_dispatch_recover();'
  );
end
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10) Bounded CURRENT projection remains compatible with SETOF work_log.
--     Existing columns stay first/in-order; dispatch columns append at the end.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.work_log_current as
with base as (
  select
    w.*,
    coalesce(
      w.task_key,
      (regexp_match(coalesce(w.topic,''),'task=([^ ]+)'))[1],
      split_part(coalesce(w.topic,''),' — ',1)
    ) as _task_scope
  from public.work_log w
  where w.archived=false and w.superseded_by_id is null
),
recent as (
  select id from base order by created_at desc limit 100
),
active_latest as (
  select distinct on (_task_scope) id
  from base
  where created_at >= now()-interval '14 days'
    and (
      coalesce(status,'') ~* '(CLAIMED_WRITE|WRITE_SCOPE_OPEN|BLOCKED|WAITING|AWAITING|QUEUED|ASSIGNED|ACK_REQUIRED|READY_TO_DEPLOY|RELEASE_AUTHORIZED|ממתין)'
      or dispatch_state in ('QUEUED','CLAIMED','RETRY_WAIT','DEFERRED')
    )
  order by _task_scope, created_at desc
),
keep as (
  select id from recent
  union
  select id from active_latest
)
select
  b.id,b.session_date,b.topic,b.numbers,b.what_we_did,b.status,b.open_threads,b.created_at,b.archived,b.superseded_by_id,
  b.task_key,b.from_actor,b.to_actor,b.assignment_mode,b.assignment_scope,b.primary_owner,b.release_authorization_state,
  b.parent_assignment_id,b.dispatch_kind,b.dispatch_state,b.dispatch_context,b.dispatch_attempts,b.dispatch_next_attempt_at,
  b.dispatch_lease_owner,b.dispatch_lease_expires_at,b.dispatch_last_error,b.dispatch_last_request_id,b.dispatch_last_emitted_at,
  b.dispatch_completed_at
from base b join keep k using(id)
order by b.created_at desc;

comment on column public.work_log.dispatch_state is
  'Transport/runtime state only. Never truth/governance/release authority.';
comment on column public.work_log.dispatch_context is
  'Bounded task/runtime hints. work_log remains Coordination Ledger, not project/domain SSOT.';
