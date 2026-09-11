-- W2.2b · SECURITY — Root-of-Trust closure for public.fn_raziel_research_intel_scoped
-- Owner: person_foundation_contract_law v4 (root of trust) — EXTEND_EXISTING, no new permission system.
-- Reported live by GPT preflight de9969d1 / security delta d8f30f38, independently reverified here.
--
-- LIVE DEFECT (before this migration):
--   fn_raziel_research_intel_scoped is STABLE SECURITY DEFINER with anon_exec=true/auth_exec=true and
--   accepts a caller-supplied p_user_ref. It then read research_items / profiles / agent_user_memory
--   for THAT ref with no auth.uid() ownership equality, and decided the admin branch by looking up
--   users.role of p_user_ref instead of the authenticated actor. Any caller who knows (or guesses) a
--   user id could therefore read another person's private research counts, last research subjects and
--   profile tier/credits/xp/level, and could reach the admin aggregate block by naming an admin's id.
--   No exploitation or enumeration was performed; the defect was confirmed from the function
--   definition and grants only.
--
-- FIX (capability preserved, authority moved):
--   The client-supplied p_user_ref is no longer an authority. The authority is:
--     * auth.uid()      for ordinary anon/authenticated PostgREST callers, and
--     * the service role for trusted server callers (the wa-* Edge Functions already authenticate the
--       person before calling, so they may still name the subject they resolved — delegation, not IDOR).
--   A client may still PASS p_user_ref: it is accepted only when it resolves to the caller themselves
--   (their own uuid, or a phone genuinely linked to them in wa_account_links). Anything else silently
--   degrades to the public aggregate block with an explicit denial reason in `exposure` — fail-closed,
--   never an error that leaks whether the named user exists.
--   The admin block is decided by the AUTHENTICATED actor's users.role, never by the named ref.
--
-- Signature, return shape and grants are unchanged (additive `root_of_trust` field only). No data is
-- written and no privilege is widened by this migration.

create or replace function public.fn_raziel_research_intel_scoped(
  p_context_type text default 'public_user',
  p_user_ref text default null,
  p_number integer default null,
  p_period text default '7d',
  p_limit integer default 8
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_ct text := lower(coalesce(p_context_type,'public_user'));
  v_claims jsonb;
  v_jwt_role text;
  v_caller uuid;
  v_trusted_server boolean := false;
  v_subject_ref text := null;      -- resolved, TRUSTED subject reference (never the raw client value)
  v_owner_uuid uuid := null;       -- resolved subject as a users.id
  v_denied text := null;
  v_is_admin boolean := false;
  v_public jsonb;
  v_private jsonb := null;
  v_admin jsonb := null;
  v_refs text[];
  v_exposure text;
begin
  -- The public aggregate block is genuinely public and is unchanged.
  v_public := fn_raziel_research_intel(p_number, p_period, p_limit);

  -- ── ROOT OF TRUST ────────────────────────────────────────────────────────────────────────
  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_claims := null;
  end;
  v_jwt_role := coalesce(v_claims ->> 'role', '');

  begin
    v_caller := auth.uid();
  exception when others then
    v_caller := null;
  end;

  -- A trusted server caller is the service role, or a direct privileged DB session with no JWT at all
  -- (postgres / supabase_admin). Those callers authenticated the person upstream, so they may name a
  -- subject. A JWT-bearing anon/authenticated caller never can.
  v_trusted_server := (v_jwt_role = 'service_role')
                   or (v_claims is null and session_user in ('postgres','supabase_admin','service_role'));

  if v_trusted_server then
    v_subject_ref := nullif(btrim(coalesce(p_user_ref,'')), '');
  elsif v_caller is null then
    -- Unauthenticated client: there is no private scope to resolve, whatever it asked for.
    v_denied := case when p_user_ref is null then 'no_authenticated_caller' else 'user_ref_requires_authenticated_caller' end;
  elsif p_user_ref is null or btrim(p_user_ref) = '' then
    v_subject_ref := v_caller::text;
  elsif btrim(p_user_ref) = v_caller::text then
    v_subject_ref := v_caller::text;
  elsif exists (select 1 from wa_account_links w where w.phone = btrim(p_user_ref) and w.user_id = v_caller) then
    -- A phone the caller has genuinely linked to their own account still resolves to the caller.
    v_subject_ref := v_caller::text;
  else
    v_denied := 'user_ref_is_not_the_authenticated_caller';
  end if;

  -- Resolve the trusted subject reference to a users.id (a delegated server call may name a phone).
  if v_subject_ref is not null then
    if v_subject_ref ~ '^[0-9a-fA-F-]{36}$' then
      v_owner_uuid := v_subject_ref::uuid;
    else
      select w.user_id into v_owner_uuid from wa_account_links w where w.phone = v_subject_ref limit 1;
    end if;
  end if;

  -- Admin is decided by the AUTHENTICATED actor, never by the named ref.
  if v_trusted_server then
    if v_owner_uuid is not null then
      select (u.role = 'admin') into v_is_admin from users u where u.id = v_owner_uuid limit 1;
    end if;
  elsif v_caller is not null then
    select (u.role = 'admin') into v_is_admin from users u where u.id = v_caller limit 1;
  end if;
  v_is_admin := coalesce(v_is_admin, false);

  -- ── PRIVATE BLOCK — owner-only, keyed on the resolved subject, never on the raw client value ──
  if v_owner_uuid is not null and v_ct in ('authenticated_user','whatsapp_user','admin') then
    select coalesce(array_agg(distinct r) filter (where r is not null), array[v_owner_uuid::text]) into v_refs from (
      select v_owner_uuid::text r
      union select w.phone::text from wa_account_links w where w.user_id = v_owner_uuid
    ) x;

    v_private := jsonb_build_object(
      'scope','user_private',
      'own_research_items', (select count(*) from research_items ri where ri.user_id = v_owner_uuid),
      'own_recent_subjects', coalesce((select jsonb_agg(title order by ord) from (
          select ri.title, row_number() over(order by ri.created_at desc) ord
          from research_items ri where ri.user_id = v_owner_uuid and ri.title is not null
          order by ri.created_at desc limit 5) t),'[]'::jsonb),
      'own_profile', (select jsonb_build_object('tier',pr.tier,'credits',pr.credits,'xp',pr.xp,'level',pr.level)
                        from profiles pr where pr.user_id = v_owner_uuid),
      'own_memory_items', (select count(*) from agent_user_memory m
                            where m.user_ref = any(v_refs) and m.agent='raziel' and m.memory_scope='personal'),
      'note','נתוני המשתמש עצמו בלבד — אין גישה לנתוני משתמש אחר'
    );
  end if;

  if v_ct = 'admin' and v_is_admin then
    v_admin := jsonb_build_object(
      'scope','admin',
      'pending_candidates', (select count(*) from decision_ledger where status='pending'),
      'community_hints_pending', (select count(*) from community_hints where status='pending'),
      'open_definitions', (select count(*) from researcher_definitions where status in ('new','ai_replied')),
      'subscribers_active', (select count(*) from subscribers where active),
      'users_total', (select count(*) from users),
      'ai_tokens_7d', (select coalesce(sum(input_tokens+output_tokens),0) from ai_token_log where created_at > now()-interval '7 days'),
      'note','מידע ניהולי מורשה — מפקדה בלבד'
    );
  end if;

  v_exposure := case
    when v_ct='admin' and v_is_admin then 'full+admin_signals'
    when v_private is not null then 'aggregate_public+own_private'
    when v_denied is not null then 'aggregate_public_only(denied:' || v_denied || ')'
    when v_ct='admin' and not v_is_admin then 'aggregate_public_only(admin_denied:not_verified)'
    else 'aggregate_public_only'
  end;

  return jsonb_build_object(
    'context_type', v_ct,
    'authorized_admin', v_is_admin,
    'exposure', v_exposure,
    -- Auditable statement of WHO the private scope was resolved from. Never echoes the raw client ref.
    'root_of_trust', jsonb_build_object(
      'authority', case when v_trusted_server then 'service_role_delegated' when v_caller is not null then 'auth.uid' else 'none' end,
      'caller_authenticated', v_caller is not null,
      'client_user_ref_is_authority', false,
      'private_scope_resolved', v_private is not null,
      'denied_reason', v_denied
    ),
    'public', v_public,
    'user_private', v_private,
    'admin', v_admin,
    'boundary', 'popularity ≠ research_strength ≠ canonical_truth · user_behavior ≠ canon',
    'generated_at', now()
  );
end
$function$;

comment on function public.fn_raziel_research_intel_scoped(text,text,integer,text,integer) is
  'Raziel research intel, scoped. ROOT OF TRUST = auth.uid() for client callers, service role for trusted '
  'server callers. A client-supplied p_user_ref is NOT an authority: it is honoured only when it resolves '
  'to the caller themselves, otherwise the call fail-closes to the public aggregate block with an explicit '
  'denial reason. person_foundation_contract_law v4.';

-- Grants unchanged: the public aggregate block stays public; the private block is now genuinely private.
grant execute on function public.fn_raziel_research_intel_scoped(text,text,integer,text,integer) to anon, authenticated, service_role;
