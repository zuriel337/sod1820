-- SOD1820 · Decision 4 — Corpus Admission: word-approval path (functions only) — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 11.11.2026 against the live DB definitions read the same day (pg_get_functiondef md5 guards below).
-- Requires ZURIEL's explicit approval of this exact file (SHA-256 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Scope: replaces 4 functions (same signatures, SECURITY DEFINER and search_path kept) and adds 4. Changes NO data:
-- the apply step re-checks the state of every gematria_words row and the row counts of the queue, ledger and post links.
-- word_approval_required_law stays active. corpus_admission_foundation_v1 (frozen, ד5) is not touched.
begin;

-- G0: refuse unless the live definitions are exactly the reviewed ones and the new names are free
do $s40g$
begin
  if md5(pg_get_functiondef('public.resolve_word_review(uuid,text,text,text)'::regprocedure)) <> '63a3e2f29a7d7ca206a5db7d3159317a' then raise exception 'S40: public.resolve_word_review(uuid,text,text,text) differs from the reviewed definition'; end if;
  if md5(pg_get_functiondef('public.wa_word_review(uuid,text)'::regprocedure)) <> 'b6a17fa640ca992a65368263cdcba28b' then raise exception 'S40: public.wa_word_review(uuid,text) differs from the reviewed definition'; end if;
  if md5(pg_get_functiondef('public.admin_bulk_triage(text)'::regprocedure)) <> '2a44326886e4d3011d6df36f78c411e2' then raise exception 'S40: public.admin_bulk_triage(text) differs from the reviewed definition'; end if;
  if md5(pg_get_functiondef('public.admin_hide_word(text)'::regprocedure)) <> 'fe5dfee95a705dcfb2ee969f7e544a5a' then raise exception 'S40: public.admin_hide_word(text) differs from the reviewed definition'; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
             and p.proname in ('_corpus_word_state_v1','_corpus_admission_ledger_v1','admin_corpus_admission_state_v1','admin_corpus_enqueue_existing_words_v1')) then
    raise exception 'S40: a function name to be created already exists'; end if;
end $s40g$;

create temp table _s40_before on commit drop as select
  (select md5(string_agg(id::text||'|'||is_verified::text||'|'||coalesce(visibility_reason,'')||'|'||coalesce(visibility_tier,-1)::text||'|'||coalesce(is_published,false)::text, ',' order by id)) from public.gematria_words) words_state,
  (select count(*) from public.gematria_words) n_words, (select count(*) from public.word_review_queue) n_queue,
  (select count(*) from public.decision_ledger) n_ledger, (select count(*) from public.post_gematria_links) n_links;

-- 01_helpers.sql
CREATE FUNCTION public._corpus_word_state_v1(p_word_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- decision-relevant state of one word (snapshot for the ledger; read-only)
  select jsonb_build_object('id', w.id, 'phrase', w.phrase, 'is_verified', w.is_verified,
           'visibility_reason', w.visibility_reason, 'visibility_tier', w.visibility_tier,
           'is_published', w.is_published, 'source', w.source,
           'post_links', (select count(*) from public.post_gematria_links l where l.gematria_id = w.id))
  from public.gematria_words w where w.id = p_word_id
$function$;

CREATE FUNCTION public._corpus_admission_ledger_v1(p_subject_type text, p_subject_ref text, p_decision text, p_prior jsonb, p_new jsonb, p_extra jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  -- one audit row per explicit admin decision (decision 4, ZURIEL 11.11.2026); human_decision vocabulary is the existing one
  insert into public.decision_ledger (decision_type, subject_type, subject_ref, candidate, domain, human_decision, human_reason,
                                      decided_by, provenance, status)
  values ('corpus_word_admission', p_subject_type, p_subject_ref, p_new, 'corpus', p_decision, p_extra->>'reason',
          coalesce(auth.uid()::text, 'unknown'),
          jsonb_build_object('prior_state', p_prior, 'new_state', p_new, 'function', p_extra->>'function',
                             'queue_id', p_extra->>'queue_id', 'action', p_extra->>'action',
                             'law', 'word_approval_required_law v1 (active) + corpus_admission_foundation_v1 (text unchanged)'),
          'applied')
  returning id into v_id;
  return v_id;
end $function$;

-- 02_resolve_word_review.sql
CREATE OR REPLACE FUNCTION public.resolve_word_review(p_id uuid, p_action text, p_edit text DEFAULT NULL::text, p_by text DEFAULT 'admin'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v record;
  v_phrase text;
  v_add_result text;
  v_word_id uuid;
  v_engine_verified boolean;
  v_actor text;
  v_prior jsonb;
  v_new jsonb;
BEGIN
  if not public.rd_is_admin() then
    raise exception 'admin only';
  end if;
  v_actor := auth.uid()::text;

  SELECT * INTO v FROM public.word_review_queue WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  -- v2 (decision 4, 11.11.2026): a decided row is never decided again (no retroactive change of an admin decision)
  IF v.status <> 'pending' THEN RETURN 'already_decided:' || v.status; END IF;
  -- v2: delete is disabled; the queue row and its decision stay as history (use reject)
  IF p_action = 'delete' THEN RETURN 'delete_disabled_use_reject'; END IF;

  -- v2: a queue row that points at an EXISTING word (admin_corpus_enqueue_existing_words_v1)
  IF v.entity_word_id IS NOT NULL THEN
    v_word_id := v.entity_word_id;
    v_prior := public._corpus_word_state_v1(v_word_id);
    IF v_prior IS NULL THEN RETURN 'word_not_found'; END IF;
    IF coalesce(v_prior->>'visibility_reason','') IN ('approved_by_admin','rejected_by_admin') THEN
      RETURN 'already_decided_by_admin:' || (v_prior->>'visibility_reason');
    END IF;
    IF p_action = 'approve' THEN
      -- is_verified stays engine-owned (corpus_admission_foundation_v1); the human decision is visibility_reason
      v_engine_verified := public.fn_verify_gematria_word_engine(v_word_id);
      UPDATE public.gematria_words SET visibility_reason = 'approved_by_admin', visibility_changed_at = now() WHERE id = v_word_id;
      UPDATE public.word_review_queue SET status = 'approved', decided_by = v_actor, decided_at = now(), updated_at = now() WHERE id = p_id;
      v_new := public._corpus_word_state_v1(v_word_id);
      PERFORM public._corpus_admission_ledger_v1('gematria_word', v_word_id::text, 'approve', v_prior, v_new,
        jsonb_build_object('function', 'resolve_word_review v2', 'queue_id', p_id, 'action', p_action));
      RETURN 'approved_existing:engine_verified=' || coalesce(v_engine_verified, false)::text;
    ELSIF p_action IN ('reject', 'block', 'hide') THEN
      UPDATE public.gematria_words SET visibility_reason = 'rejected_by_admin', visibility_changed_at = now() WHERE id = v_word_id;
      UPDATE public.word_review_queue SET status = CASE WHEN p_action = 'reject' THEN 'rejected' ELSE 'blocked' END,
             decided_by = v_actor, decided_at = now(), updated_at = now() WHERE id = p_id;
      v_new := public._corpus_word_state_v1(v_word_id);
      PERFORM public._corpus_admission_ledger_v1('gematria_word', v_word_id::text, 'reject', v_prior, v_new,
        jsonb_build_object('function', 'resolve_word_review v2', 'queue_id', p_id, 'action', p_action));
      RETURN 'rejected_existing';
    END IF;
    -- edit / merge of an existing word change identity or links: a separate explicit decision, not this path
    RETURN 'action_not_allowed_for_existing_word:' || coalesce(p_action, '');
  END IF;

  -- original queue path (behaviour of v1 kept; added: prior-admin-decision guard and ledger rows)
  v_phrase := btrim(coalesce(nullif(p_edit,''), v.extracted));

  IF p_action IN ('approve','edit') THEN
    SELECT (public.fn_resolve_word_identity(v_phrase)->>'word_id')::uuid INTO v_word_id;
    IF v_word_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.gematria_words w WHERE w.id = v_word_id AND w.visibility_reason = 'rejected_by_admin') THEN
      RETURN 'blocked_by_prior_admin_rejection';
    END IF;
    v_prior := CASE WHEN v_word_id IS NOT NULL THEN public._corpus_word_state_v1(v_word_id) END;
    v_add_result := public.wa_add_word(v_phrase, coalesce(v.source,'review'), null);
    IF v_add_result = 'possible_variant_queued' THEN
      UPDATE public.word_review_queue
         SET status='merged', extracted=v_phrase, decided_by=v_actor,
             decided_at=now(), updated_at=now()
       WHERE id=p_id;
      PERFORM public._corpus_admission_ledger_v1('word_review_queue', p_id::text, 'merge', null, null,
        jsonb_build_object('function', 'resolve_word_review v2', 'queue_id', p_id, 'action', p_action, 'reason', 'possible_variant_redirected'));
      RETURN 'possible_variant_redirected:' || v_phrase;
    END IF;

    SELECT (public.fn_resolve_word_identity(v_phrase)->>'word_id')::uuid INTO v_word_id;
    IF v_word_id IS NOT NULL THEN
      v_engine_verified := public.fn_verify_gematria_word_engine(v_word_id);
      UPDATE public.gematria_words
         SET visibility_reason = 'approved_by_admin', visibility_changed_at = now()
       WHERE id = v_word_id;
    END IF;

    UPDATE public.word_review_queue
       SET status='approved', extracted=v_phrase, decided_by=v_actor,
           decided_at=now(), updated_at=now()
     WHERE id=p_id;
    v_new := CASE WHEN v_word_id IS NOT NULL THEN public._corpus_word_state_v1(v_word_id) END;
    PERFORM public._corpus_admission_ledger_v1(CASE WHEN v_word_id IS NOT NULL THEN 'gematria_word' ELSE 'word_review_queue' END,
      coalesce(v_word_id::text, p_id::text), CASE WHEN p_action = 'edit' THEN 'modify' ELSE 'approve' END, v_prior, v_new,
      jsonb_build_object('function', 'resolve_word_review v2', 'queue_id', p_id, 'action', p_action, 'reason', v_add_result));

    RETURN 'approved:' || coalesce(v_add_result,'unknown') ||
           CASE WHEN v_word_id IS NOT NULL
                THEN ':engine_verified=' || coalesce(v_engine_verified,false)::text
                ELSE ':engine_verified=false' END;
  ELSIF p_action = 'reject' THEN
    UPDATE public.word_review_queue SET status='rejected', decided_by=v_actor, decided_at=now() WHERE id=p_id;
    PERFORM public._corpus_admission_ledger_v1('word_review_queue', p_id::text, 'reject', null, null,
      jsonb_build_object('function', 'resolve_word_review v2', 'queue_id', p_id, 'action', p_action));
    RETURN 'rejected';
  ELSIF p_action IN ('block','hide') THEN
    UPDATE public.word_review_queue SET status='blocked', decided_by=v_actor, decided_at=now() WHERE id=p_id;
    PERFORM public._corpus_admission_ledger_v1('word_review_queue', p_id::text, 'reject', null, null,
      jsonb_build_object('function', 'resolve_word_review v2', 'queue_id', p_id, 'action', p_action));
    RETURN 'blocked';
  ELSIF p_action = 'merge' THEN
    UPDATE public.word_review_queue SET status='merged', decided_by=v_actor, decided_at=now() WHERE id=p_id;
    PERFORM public._corpus_admission_ledger_v1('word_review_queue', p_id::text, 'merge', null, null,
      jsonb_build_object('function', 'resolve_word_review v2', 'queue_id', p_id, 'action', p_action));
    RETURN 'merged';
  END IF;
  RETURN 'noop';
END;
$function$;

-- 03_wa_word_review.sql
CREATE OR REPLACE FUNCTION public.wa_word_review(p_id uuid, p_action text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_prior jsonb;
  v_new jsonb;
  v_engine boolean;
begin
  if not public.rd_is_admin() then
    raise exception 'admin only';
  end if;
  -- v2 (decision 4, 11.11.2026): never delete a word (post_gematria_links would cascade); reject instead
  if p_action = 'delete' then
    return 'delete_disabled_use_reject';
  end if;
  v_prior := public._corpus_word_state_v1(p_id);
  if v_prior is null then
    return 'not_found';
  end if;
  if coalesce(v_prior->>'visibility_reason','') in ('approved_by_admin','rejected_by_admin') then
    return 'already_decided_by_admin:' || (v_prior->>'visibility_reason');
  end if;

  if p_action = 'approve' then
    -- v2: is_verified stays engine-owned (corpus_admission_foundation_v1); the human decision is visibility_reason
    v_engine := public.fn_verify_gematria_word_engine(p_id);
    update gematria_words
       set visibility_reason='approved_by_admin',
           visibility_changed_at=now()
     where id=p_id;
    v_new := public._corpus_word_state_v1(p_id);
    perform public._corpus_admission_ledger_v1('gematria_word', p_id::text, 'approve', v_prior, v_new,
      jsonb_build_object('function', 'wa_word_review v2', 'action', p_action));
    return 'approved:engine_verified=' || coalesce(v_engine, false)::text;
  elsif p_action = 'reject' then
    update gematria_words
       set is_verified=false,
           visibility_reason='rejected_by_admin',
           visibility_changed_at=now()
     where id=p_id;
    v_new := public._corpus_word_state_v1(p_id);
    perform public._corpus_admission_ledger_v1('gematria_word', p_id::text, 'reject', v_prior, v_new,
      jsonb_build_object('function', 'wa_word_review v2', 'action', p_action));
    return 'rejected';
  end if;
  return 'noop';
end;
$function$;

-- 04_admin_bulk_triage.sql
CREATE OR REPLACE FUNCTION public.admin_bulk_triage(p_action text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from users where id=auth.uid() and role='admin') then return -1; end if;
  -- v2 (decision 4, ZURIEL 11.11.2026): no bulk or heuristic approve/reject. Every word needs its own explicit
  -- admin decision through resolve_word_review / wa_word_review (identity, provenance and audit are recorded there).
  raise exception 'admin_bulk_triage is disabled: decide each word explicitly (resolve_word_review / wa_word_review)';
end;
$function$;

-- 05_admin_hide_word.sql
CREATE OR REPLACE FUNCTION public.admin_hide_word(p_phrase text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n int; r record; v_prior jsonb;
begin
  -- אדמין בלבד (אותה בדיקה כמו admin_words_console)
  if not exists (select 1 from users where id = auth.uid() and role = 'admin') then
    return jsonb_build_object('error','forbidden');
  end if;
  if p_phrase is null or btrim(p_phrase) = '' then
    return jsonb_build_object('error','empty');
  end if;

  v_n := 0;
  -- v2 (decision 4, 11.11.2026): same explicit moderation action, now one audit row per hidden word; already-rejected rows are left as they are
  for r in select id from gematria_words where btrim(phrase) = btrim(p_phrase) and coalesce(visibility_reason,'') <> 'rejected_by_admin' for update loop
    v_prior := public._corpus_word_state_v1(r.id);
    update gematria_words
       set is_verified = false,
           visibility_reason = 'rejected_by_admin',
           visibility_changed_at = now()
     where id = r.id;
    perform public._corpus_admission_ledger_v1('gematria_word', r.id::text, 'reject', v_prior, public._corpus_word_state_v1(r.id),
      jsonb_build_object('function', 'admin_hide_word v2', 'action', 'hide', 'reason', 'moderation_hide_by_phrase'));
    v_n := v_n + 1;
  end loop;

  return jsonb_build_object('ok', true, 'hidden', v_n, 'phrase', btrim(p_phrase));
end;
$function$;

-- 06_admin_state.sql
CREATE FUNCTION public.admin_corpus_admission_state_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v jsonb;
begin
  if not public.rd_is_admin() then
    return jsonb_build_object('error','forbidden');
  end if;
  -- read-only map of the is_verified=false rows to admission states (decision 4); changes nothing
  with b as (
    select id, is_verified, coalesce(visibility_reason,'') vr, visibility_tier, coalesce(is_published,false) pub,
           coalesce(source,'') src, coalesce(phrase,'') phrase
      from public.gematria_words where is_verified = false),
  c as (
    select b.*, case
      when vr = 'rejected_by_admin' then 'REJECTED_BY_ADMIN'
      when vr = 'bulk_hide_2026_07_03' then 'BULK_HIDDEN_2026_07_03'
      when src like 'ZURIEL%' then 'HUMAN_GATE_AUTHORED'
      when src like 'culture_cipher:%' then 'CULTURE_CIPHER_SOURCE'
      when vr = 'pending_wa' or (vr = 'pending_review' and src like 'wa-%') then 'CHANNEL_PENDING'
      when phrase !~ '^[א-ת]+( [א-ת]+)*$' then 'ENGINE_UNVERIFIABLE_FORMAT'
      when vr = 'exposed_general_clean' then 'EXPOSED_LABEL_UNVERIFIED'
      when vr = '' then 'NO_REASON_IMPORT'
      else 'OTHER_' || upper(vr) end cls
      from b)
  select jsonb_build_object(
      'total', (select count(*) from c),
      'by_class', (select jsonb_object_agg(cls, n) from (select cls, count(*) n from c group by cls) x),
      'by_visibility_reason', (select jsonb_object_agg(coalesce(nullif(vr,''),'(none)'), n) from (select vr, count(*) n from c group by vr) y),
      'state_checksum', (select md5(string_agg(id::text||'|'||is_verified::text||'|'||vr||'|'||coalesce(visibility_tier,-1)::text||'|'||pub::text, ',' order by id)) from c),
      'public_visible', 0,
      'note', 'anon read requires is_verified=true and is_published=true; none of these rows is public')
    into v;
  return v;
end $function$;

-- 07_admin_enqueue.sql
CREATE FUNCTION public.admin_corpus_enqueue_existing_words_v1(p_word_ids uuid[], p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid; w record; q record; v_out jsonb := '[]'::jsonb; v_res text; v_state jsonb;
begin
  if not public.rd_is_admin() then
    return jsonb_build_object('error','forbidden');
  end if;
  if p_word_ids is null or coalesce(array_length(p_word_ids, 1), 0) = 0 then
    return jsonb_build_object('error','empty');
  end if;
  if array_length(p_word_ids, 1) > 200 then
    return jsonb_build_object('error','too_many', 'max', 200);
  end if;
  -- puts EXISTING words in front of a human (decision 4). It never changes gematria_words; it never decides.
  foreach v_id in array (select array_agg(distinct x) from unnest(p_word_ids) x) loop
    select id, phrase, is_verified, visibility_reason, source into w from public.gematria_words where id = v_id;
    if not found then v_res := 'not_found';
    elsif w.is_verified then v_res := 'already_verified';
    elsif coalesce(w.visibility_reason,'') in ('approved_by_admin','rejected_by_admin') then v_res := 'already_decided_by_admin:' || w.visibility_reason;
    else
      select id, status, entity_word_id into q from public.word_review_queue where entity_word_id = v_id or extracted = btrim(w.phrase) limit 1;
      if found then
        if q.status <> 'pending' then v_res := 'queue_already_decided:' || q.status;
        elsif q.entity_word_id = v_id then v_res := 'already_queued';
        elsif q.entity_word_id is not null then v_res := 'duplicate_phrase_queued_for_other_word';
        else v_res := 'pending_text_review_exists';   -- a pending text review for the same phrase: left as it is
        end if;
      else
        v_state := public._corpus_word_state_v1(v_id);
        -- submitted_by stays NULL: the admin who queues an existing word is not its contributor (no contribution credit)
        insert into public.word_review_queue (original_text, extracted, reason, kind, word_count, flags, entity_word_id,
                                              will_create, similar_words, source, hits, status)
        values (w.phrase, btrim(w.phrase), coalesce(p_note, 'existing_word_review'), 'phrase',
                coalesce(array_length(regexp_split_to_array(btrim(w.phrase), '\s+'), 1), 1),
                jsonb_build_object('admission', 'existing_word', 'prior_state', v_state, 'enqueued_by', auth.uid()::text,
                                   'identity_classification', public.fn_resolve_word_identity(w.phrase)->>'classification'),
                v_id, false, '[]'::jsonb, w.source, 1, 'pending');
        v_res := 'queued';
      end if;
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object('word_id', v_id, 'result', v_res));
  end loop;
  return jsonb_build_object('ok', true, 'results', v_out);
end $function$;

revoke all on function public._corpus_word_state_v1(uuid) from public, anon, authenticated;
revoke all on function public._corpus_admission_ledger_v1(text,text,text,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.admin_corpus_admission_state_v1() from public, anon;
revoke all on function public.admin_corpus_enqueue_existing_words_v1(uuid[],text) from public, anon;
grant execute on function public.admin_corpus_admission_state_v1() to authenticated, service_role;
grant execute on function public.admin_corpus_enqueue_existing_words_v1(uuid[],text) to authenticated, service_role;

-- P: verify the installed bodies and that no data changed
do $s40p$
begin
  if (select md5(prosrc) from pg_proc where oid = 'public.resolve_word_review(uuid,text,text,text)'::regprocedure) <> '9f247a5f6ca5a92f1954d628fb8aee73' then raise exception 'S40: public.resolve_word_review(uuid,text,text,text) body differs'; end if;
  if (select md5(prosrc) from pg_proc where oid = 'public.wa_word_review(uuid,text)'::regprocedure) <> '5bc6d76fd0a1bb94987ed6286e958171' then raise exception 'S40: public.wa_word_review(uuid,text) body differs'; end if;
  if (select md5(prosrc) from pg_proc where oid = 'public.admin_bulk_triage(text)'::regprocedure) <> 'c17f9ef70d8d111c9e4ac791986fad70' then raise exception 'S40: public.admin_bulk_triage(text) body differs'; end if;
  if (select md5(prosrc) from pg_proc where oid = 'public.admin_hide_word(text)'::regprocedure) <> 'aeff932f605306120b97fbef5019e34e' then raise exception 'S40: public.admin_hide_word(text) body differs'; end if;
  if (select md5(prosrc) from pg_proc where oid = 'public._corpus_word_state_v1(uuid)'::regprocedure) <> 'b58df24b27f3243163e83791df5102d1' then raise exception 'S40: public._corpus_word_state_v1(uuid) body differs'; end if;
  if (select md5(prosrc) from pg_proc where oid = 'public._corpus_admission_ledger_v1(text,text,text,jsonb,jsonb,jsonb)'::regprocedure) <> 'e7436d06197ca02bcb43dee02830f69e' then raise exception 'S40: public._corpus_admission_ledger_v1(text,text,text,jsonb,jsonb,jsonb) body differs'; end if;
  if (select md5(prosrc) from pg_proc where oid = 'public.admin_corpus_admission_state_v1()'::regprocedure) <> 'fa59bf8d01174a3fee79c531610c2772' then raise exception 'S40: public.admin_corpus_admission_state_v1() body differs'; end if;
  if (select md5(prosrc) from pg_proc where oid = 'public.admin_corpus_enqueue_existing_words_v1(uuid[],text)'::regprocedure) <> 'e3414edff8b7639cedf1582f18bb3523' then raise exception 'S40: public.admin_corpus_enqueue_existing_words_v1(uuid[],text) body differs'; end if;
  if (select words_state from _s40_before) is distinct from (select md5(string_agg(id::text||'|'||is_verified::text||'|'||coalesce(visibility_reason,'')||'|'||coalesce(visibility_tier,-1)::text||'|'||coalesce(is_published,false)::text, ',' order by id)) from public.gematria_words) then raise exception 'S40: word state changed'; end if;
  if (select n_words from _s40_before) <> (select count(*) from public.gematria_words)
     or (select n_queue from _s40_before) <> (select count(*) from public.word_review_queue)
     or (select n_ledger from _s40_before) <> (select count(*) from public.decision_ledger)
     or (select n_links from _s40_before) <> (select count(*) from public.post_gematria_links) then raise exception 'S40: row counts changed'; end if;
end $s40p$;

commit;
