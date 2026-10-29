-- Branch/local-test migration only. Do not apply to a live project without release approval.
-- Technical execution receipts under the existing ai-analyze ELS action; not a
-- conversation store, ELS engine, AI transport, worker or research/truth owner.
-- No lease expires into another provider POST. UNKNOWN remains active until an
-- explicit reconciliation can bind the already-created provider batch.

create table public.els_matrix_reading_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  scope_key text not null check (scope_key ~ '^[0-9a-f]{64}$'),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  state text not null default 'STARTING'
    check (state in ('STARTING','UNKNOWN','RUNNING','CANCEL_REQUESTED','COMPLETE','INCOMPLETE','FAILED')),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 65536),
  batch_id text unique check (batch_id ~ '^msgbatch_[A-Za-z0-9_-]{1,120}$'),
  job_token text check (length(job_token) between 40 and 6000 and job_token ~ '^[A-Za-z0-9._-]+$'),
  job_payload jsonb check (jsonb_typeof(job_payload) = 'object' and octet_length(job_payload::text) <= 16384),
  result jsonb check (jsonb_typeof(result) = 'object' and octet_length(result::text) <= 524288),
  cost_log_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, request_id),
  check ((batch_id is null) = (job_payload is null)),
  check (job_token is null or batch_id is not null),
  check (state not in ('RUNNING','CANCEL_REQUESTED','COMPLETE','INCOMPLETE','FAILED') or batch_id is not null),
  check ((state in ('COMPLETE','INCOMPLETE','FAILED')) = (result is not null))
);

create unique index els_matrix_reading_one_active_scope
  on public.els_matrix_reading_jobs(owner_id, scope_key)
  where state in ('STARTING','UNKNOWN','RUNNING','CANCEL_REQUESTED');
create index els_matrix_reading_scope_latest
  on public.els_matrix_reading_jobs(owner_id, scope_key, created_at desc, id desc);

alter table public.els_matrix_reading_jobs enable row level security;
revoke all on public.els_matrix_reading_jobs from public, anon, authenticated, service_role;
grant select, insert, update on public.els_matrix_reading_jobs to service_role;
-- Intentionally no client RLS policies: the existing authenticated ai-analyze
-- boundary checks identity/admin/availability and supplies owner_id itself.

create function public.els_matrix_reading_job_claim_v1(
  p_owner_id uuid, p_request_id uuid, p_scope_key text, p_request_hash text, p_snapshot jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare j public.els_matrix_reading_jobs;
begin
  if p_owner_id is null or p_request_id is null or p_scope_key is null or p_request_hash is null
    or p_scope_key !~ '^[0-9a-f]{64}$' or p_request_hash !~ '^[0-9a-f]{64}$'
    or p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object'
    or octet_length(p_snapshot::text) > 65536
    or jsonb_typeof(p_snapshot->'axis') is distinct from 'object'
    or p_snapshot#>>'{axis,scope}' is distinct from 'torah'
    or jsonb_typeof(p_snapshot#>'{axis,corpus_id}') is distinct from 'string'
    or length(coalesce(p_snapshot#>>'{axis,corpus_id}', '')) not between 1 and 200
    or coalesce(p_snapshot#>>'{axis,term}', '') = ''
    or length(p_snapshot#>>'{axis,term}') > 300
    or coalesce(p_snapshot#>>'{axis,start}', '') !~ '^[0-9]+$'
    or coalesce(p_snapshot#>>'{axis,skip}', '') !~ '^[1-9][0-9]*$'
    or coalesce(p_snapshot#>>'{axis,dir}', '') not in ('1','-1') then
    raise exception using errcode = '22023', message = 'invalid_reading_job_claim';
  end if;
  -- Stable request replay and the active-scope check are one transaction. The
  -- unique constraints are a second fence, not a read-then-insert convention.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('els_matrix_reading_v1:' || p_owner_id::text, 0));
  select * into j from public.els_matrix_reading_jobs where owner_id = p_owner_id and request_id = p_request_id for update;
  if found then
    if j.request_hash <> p_request_hash or j.scope_key <> p_scope_key then
      raise exception using errcode = '22023', message = 'reading_request_id_conflict';
    end if;
    return jsonb_build_object('created', false, 'conflict', false, 'job', to_jsonb(j));
  end if;
  select * into j from public.els_matrix_reading_jobs
    where owner_id = p_owner_id and scope_key = p_scope_key
      and state in ('STARTING','UNKNOWN','RUNNING','CANCEL_REQUESTED') for update;
  if found then
    return jsonb_build_object('created', false, 'conflict', true, 'job', to_jsonb(j));
  end if;
  insert into public.els_matrix_reading_jobs(owner_id, request_id, scope_key, request_hash, snapshot)
    values (p_owner_id, p_request_id, p_scope_key, p_request_hash, p_snapshot) returning * into j;
  return jsonb_build_object('created', true, 'conflict', false, 'job', to_jsonb(j));
end;
$$;

create function public.els_matrix_reading_job_get_v1(
  p_owner_id uuid, p_job_id uuid default null, p_scope_key text default null, p_batch_id text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare j public.els_matrix_reading_jobs;
begin
  if p_owner_id is null or num_nonnulls(p_job_id, p_scope_key, p_batch_id) <> 1
    or (p_scope_key is not null and p_scope_key !~ '^[0-9a-f]{64}$')
    or (p_batch_id is not null and p_batch_id !~ '^msgbatch_[A-Za-z0-9_-]{1,120}$') then
    raise exception using errcode = '22023', message = 'invalid_reading_job_selector';
  end if;
  select * into j from public.els_matrix_reading_jobs where owner_id = p_owner_id
    and (p_job_id is null or id = p_job_id)
    and (p_scope_key is null or scope_key = p_scope_key)
    and (p_batch_id is null or batch_id = p_batch_id)
    order by created_at desc, id desc limit 1;
  return jsonb_build_object('job', case when found then to_jsonb(j) else null end);
end;
$$;

create function public.els_matrix_reading_job_attach_v1(
  p_owner_id uuid, p_job_id uuid, p_batch_id text, p_job_token text, p_job_payload jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare j public.els_matrix_reading_jobs;
begin
  if p_owner_id is null or p_job_id is null or p_batch_id is null
    or p_batch_id !~ '^msgbatch_[A-Za-z0-9_-]{1,120}$'
    or (p_job_token is not null and (length(p_job_token) not between 40 and 6000 or p_job_token !~ '^[A-Za-z0-9._-]+$'))
    or p_job_payload is null or jsonb_typeof(p_job_payload) <> 'object'
    or octet_length(p_job_payload::text) > 16384
    or p_job_payload->>'v' is distinct from '1'
    or p_job_payload->>'b' is distinct from p_batch_id
    or p_job_payload->>'i' is distinct from ('u:' || p_owner_id::text)
    or p_job_payload->>'bc' is distinct from ('els_' || p_job_id::text) then
    raise exception using errcode = '22023', message = 'invalid_reading_job_attachment';
  end if;
  select * into j from public.els_matrix_reading_jobs where id = p_job_id and owner_id = p_owner_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'reading_job_not_found'; end if;
  if p_job_payload#>>'{ax,term}' is distinct from j.snapshot#>>'{axis,term}'
    or p_job_payload#>>'{ax,corpus_id}' is distinct from j.snapshot#>>'{axis,corpus_id}'
    or p_job_payload#>>'{ax,start}' is distinct from j.snapshot#>>'{axis,start}'
    or p_job_payload#>>'{ax,skip}' is distinct from j.snapshot#>>'{axis,skip}'
    or p_job_payload#>>'{ax,dir}' is distinct from j.snapshot#>>'{axis,dir}' then
    raise exception using errcode = '22023', message = 'reading_job_axis_mismatch';
  end if;
  if j.batch_id is not null then
    if j.batch_id is distinct from p_batch_id or j.job_token is distinct from p_job_token or j.job_payload is distinct from p_job_payload then
      raise exception using errcode = '22023', message = 'reading_job_already_bound';
    end if;
    return jsonb_build_object('job', to_jsonb(j));
  end if;
  if j.state not in ('STARTING','UNKNOWN') then
    raise exception using errcode = '22023', message = 'reading_job_not_attachable';
  end if;
  update public.els_matrix_reading_jobs set batch_id = p_batch_id, job_token = p_job_token,
    job_payload = p_job_payload, state = 'RUNNING', updated_at = clock_timestamp() where id = j.id returning * into j;
  return jsonb_build_object('job', to_jsonb(j));
end;
$$;

create function public.els_matrix_reading_job_mark_unknown_v1(p_owner_id uuid, p_job_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare j public.els_matrix_reading_jobs;
begin
  select * into j from public.els_matrix_reading_jobs where id = p_job_id and owner_id = p_owner_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'reading_job_not_found'; end if;
  if j.state = 'STARTING' then
    update public.els_matrix_reading_jobs set state = 'UNKNOWN', updated_at = clock_timestamp() where id = j.id returning * into j;
  end if;
  return jsonb_build_object('job', to_jsonb(j));
end;
$$;

create function public.els_matrix_reading_job_cost_v1(p_owner_id uuid, p_job_id uuid, p_model text, p_usage jsonb, p_trace jsonb default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  j public.els_matrix_reading_jobs;
  token_key text;
  total_input bigint;
  receipt bigint;
  existed boolean;
  checked_trace uuid;
  checked_span uuid;
begin
  select * into j from public.els_matrix_reading_jobs where id = p_job_id and owner_id = p_owner_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'reading_job_not_found'; end if;
  if j.batch_id is null or p_model is null
    or p_model !~ '^claude-[A-Za-z0-9._-]{1,100}$'
    or p_usage is null or jsonb_typeof(p_usage) <> 'object'
    or not (p_usage ? 'input_tokens') or not (p_usage ? 'output_tokens') then
    raise exception using errcode = '22023', message = 'invalid_reading_cost_receipt';
  end if;
  foreach token_key in array array['input_tokens','output_tokens','cache_creation_input_tokens','cache_read_input_tokens'] loop
    if p_usage ? token_key and (jsonb_typeof(p_usage->token_key) is distinct from 'number'
      or (p_usage->>token_key) !~ '^[0-9]+$' or (p_usage->>token_key)::numeric > 2147483647) then
      raise exception using errcode = '22023', message = 'invalid_reading_token_usage';
    end if;
  end loop;
  total_input := (p_usage->>'input_tokens')::bigint
    + coalesce((p_usage->>'cache_creation_input_tokens')::bigint, 0)
    + coalesce((p_usage->>'cache_read_input_tokens')::bigint, 0);
  if total_input > 2147483647 then raise exception using errcode = '22023', message = 'invalid_reading_token_usage'; end if;
  if j.cost_log_id is not null then
    -- Replaying a receipt is idempotent, not permission to silently alter its
    -- model, owner, batch or aggregate token counts. No audit schema is added.
    if not exists (select 1 from public.ai_token_log l where l.id = j.cost_log_id
      and l.user_id = j.owner_id and l.ref = j.batch_id and l.model = p_model
      and l.source = 'analyze' and l.kind = 'raziel_els_matrix_reading'
      and l.input_tokens = total_input and l.output_tokens = (p_usage->>'output_tokens')::integer) then
      raise exception using errcode = '22023', message = 'reading_cost_receipt_conflict';
    end if;
    receipt := j.cost_log_id;
    existed := true;
  else
    if j.state not in ('RUNNING','CANCEL_REQUESTED') then
      raise exception using errcode = '22023', message = 'invalid_reading_cost_receipt';
    end if;
    -- This insert and its receipt are one transaction under the same row lock.
    -- A lost HTTP response can repeat this RPC, but cannot insert another cost row.
    insert into public.ai_token_log(source, kind, model, input_tokens, output_tokens, user_id, ref, ref_name)
      values ('analyze', 'raziel_els_matrix_reading', p_model, total_input::integer,
        (p_usage->>'output_tokens')::integer, j.owner_id, j.batch_id, 'els_matrix_reading:' || p_model || ':batch')
      returning id into receipt;
    update public.els_matrix_reading_jobs set cost_log_id = receipt, updated_at = clock_timestamp() where id = j.id;
    existed := false;
  end if;
  -- The winning collector may create its model span after claiming the receipt,
  -- then replay this RPC to attach that span. Never replace an existing binding.
  -- A missing/deleted/mismatched optional trace cannot erase an incurred cost.
  if jsonb_typeof(p_trace) = 'object' and octet_length(p_trace::text) <= 1024
    and (p_trace->>'traceId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (p_trace->>'spanId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select s.trace_id, s.span_id into checked_trace, checked_span
      from public.op_trace_spans s join public.op_trace_roots r on r.trace_id = s.trace_id
      where s.span_id = (p_trace->>'spanId')::uuid and s.trace_id = (p_trace->>'traceId')::uuid;
    if found then
      begin
        update public.ai_token_log set trace_id = checked_trace, span_id = checked_span
          where id = receipt and trace_id is null and span_id is null;
      exception when foreign_key_violation or unique_violation then
        -- Trace persistence may race cleanup or an already-linked span. The
        -- existing cost receipt remains authoritative; never insert a second.
        null;
      end;
    end if;
  end if;
  return jsonb_build_object('logged', true, 'id', receipt, 'existed', existed);
end;
$$;

create function public.els_matrix_reading_job_finish_v1(p_owner_id uuid, p_job_id uuid, p_result jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare j public.els_matrix_reading_jobs; terminal_state text;
begin
  select * into j from public.els_matrix_reading_jobs where id = p_job_id and owner_id = p_owner_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'reading_job_not_found'; end if;
  if j.state in ('COMPLETE','INCOMPLETE','FAILED') then return jsonb_build_object('job', to_jsonb(j)); end if;
  if p_result is null or jsonb_typeof(p_result) <> 'object' or octet_length(p_result::text) > 524288
    or p_result->>'contract' is distinct from 'els_matrix_reading_v1'
    or coalesce(p_result->>'state', '') not in ('COMPLETE','INCOMPLETE','FAILED_WITH_REASON')
    or j.state not in ('RUNNING','CANCEL_REQUESTED') or j.batch_id is null
    or p_result#>>'{job,batch_id}' is distinct from j.batch_id
    or (p_result#>>'{job,id}' is not null and p_result#>>'{job,id}' <> j.id::text)
    or p_result#>>'{axis,scope}' is distinct from 'torah'
    or p_result#>>'{axis,corpus_id}' is distinct from j.snapshot#>>'{axis,corpus_id}'
    or p_result#>>'{axis,term}' is distinct from j.snapshot#>>'{axis,term}'
    or p_result#>>'{axis,start}' is distinct from j.snapshot#>>'{axis,start}'
    or p_result#>>'{axis,skip}' is distinct from j.snapshot#>>'{axis,skip}'
    or p_result#>>'{axis,dir}' is distinct from j.snapshot#>>'{axis,dir}' then
    raise exception using errcode = '22023', message = 'invalid_reading_terminal_result';
  end if;
  if (p_result->>'state' in ('COMPLETE','INCOMPLETE')
    or p_result#>>'{output,input_tokens}' is not null or p_result#>>'{output,output_tokens}' is not null
    or jsonb_typeof(p_result#>'{output,usage}') = 'object') and j.cost_log_id is null then
    raise exception using errcode = '22023', message = 'reading_cost_receipt_required';
  end if;
  terminal_state := case when p_result->>'state' = 'FAILED_WITH_REASON' then 'FAILED' else p_result->>'state' end;
  update public.els_matrix_reading_jobs set state = terminal_state,
    result = p_result #- '{job,token}', updated_at = clock_timestamp() where id = j.id returning * into j;
  return jsonb_build_object('job', to_jsonb(j));
end;
$$;

revoke all on function public.els_matrix_reading_job_claim_v1(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.els_matrix_reading_job_get_v1(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.els_matrix_reading_job_attach_v1(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.els_matrix_reading_job_mark_unknown_v1(uuid,uuid) from public, anon, authenticated;
revoke all on function public.els_matrix_reading_job_cost_v1(uuid,uuid,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.els_matrix_reading_job_finish_v1(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.els_matrix_reading_job_claim_v1(uuid,uuid,text,text,jsonb) to service_role;
grant execute on function public.els_matrix_reading_job_get_v1(uuid,uuid,text,text) to service_role;
grant execute on function public.els_matrix_reading_job_attach_v1(uuid,uuid,text,text,jsonb) to service_role;
grant execute on function public.els_matrix_reading_job_mark_unknown_v1(uuid,uuid) to service_role;
grant execute on function public.els_matrix_reading_job_cost_v1(uuid,uuid,text,jsonb,jsonb) to service_role;
grant execute on function public.els_matrix_reading_job_finish_v1(uuid,uuid,jsonb) to service_role;

comment on table public.els_matrix_reading_jobs is
  'Private technical receipts for the existing ai-analyze ELS matrix reading action. UNKNOWN never automatically redispatches; no conversation, engine, worker or public research truth.';
