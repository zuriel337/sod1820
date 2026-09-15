-- G3_DISPATCH_LEGACY_INSERT_ONLY_HARDENING
-- Decision-changing release hardening: legacy work_log envelope parsing may only
-- promote a row into structured dispatch state on INSERT. An unrelated UPDATE of
-- a historical row must never create a new live assignment.

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
  -- Structured callers may update already-structured dispatch rows, but legacy
  -- topic/status inference is intentionally INSERT-only.
  if tg_op = 'INSERT' then
    if new.task_key is null then
      v_match := regexp_match(coalesce(new.topic,''), 'task=([^ ]+)');
      if v_match is not null then new.task_key := v_match[1]; end if;
    end if;

    if new.from_actor is null then
      v_match := regexp_match(coalesce(new.topic,''), '(^| )FROM=(GPT|CLAUDE|ZURIEL)( |$)');
      if v_match is not null then new.from_actor := v_match[2]; end if;
    end if;

    -- Intentionally does NOT parse multi-target TO=GPT/CLAUDE text.
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

    -- Legacy claimable specialist rows fail safe to READ_ONLY. WRITE must be
    -- explicit structurally or in the insertion envelope.
    if new.dispatch_kind = 'ASSIGNMENT' and new.assignment_mode is null then
      new.assignment_mode := 'READ_ONLY';
    end if;
  else
    -- On UPDATE, never infer routing/identity from free text. Only normalize
    -- fields already supplied structurally by a governed caller.
    if new.assignment_mode is not null then
      new.assignment_mode := upper(new.assignment_mode);
    end if;
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

comment on function public.work_log_dispatch_prepare() is
  'Structured dispatch normalizer. Legacy topic/status auto-routing is INSERT-only; UPDATE never promotes historical rows into live assignments.';
