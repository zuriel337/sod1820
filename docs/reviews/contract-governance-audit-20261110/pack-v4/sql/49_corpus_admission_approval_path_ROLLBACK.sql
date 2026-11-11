-- SOD1820 · ROLLBACK of 40_corpus_admission_approval_path.sql — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 11.11.2026 against the live DB definitions read the same day (pg_get_functiondef md5 guards below).
-- Requires ZURIEL's explicit approval of this exact file (SHA-256 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Restores the exact live definitions of 4 functions and drops the 4 functions 40_ created. Decisions, queue rows and ledger rows written AFTER 40_ are data and are kept.
-- (Original scope of 40_: replaces 4 functions (same signatures, SECURITY DEFINER and search_path kept) and adds 4. Changes NO data:
-- the apply step re-checks the state of every gematria_words row and the row counts of the queue, ledger and post links.
-- word_approval_required_law stays active. corpus_admission_foundation_v1 (frozen, ד5) is not touched.
begin;

do $s49g$
begin
  if (select md5(prosrc) from pg_proc where oid = 'public.resolve_word_review(uuid,text,text,text)'::regprocedure) <> '9f247a5f6ca5a92f1954d628fb8aee73' then raise exception 'S49: public.resolve_word_review(uuid,text,text,text) is not the 40_ version'; end if;
  if (select md5(prosrc) from pg_proc where oid = 'public.wa_word_review(uuid,text)'::regprocedure) <> '5bc6d76fd0a1bb94987ed6286e958171' then raise exception 'S49: public.wa_word_review(uuid,text) is not the 40_ version'; end if;
  if (select md5(prosrc) from pg_proc where oid = 'public.admin_bulk_triage(text)'::regprocedure) <> 'c17f9ef70d8d111c9e4ac791986fad70' then raise exception 'S49: public.admin_bulk_triage(text) is not the 40_ version'; end if;
  if (select md5(prosrc) from pg_proc where oid = 'public.admin_hide_word(text)'::regprocedure) <> 'aeff932f605306120b97fbef5019e34e' then raise exception 'S49: public.admin_hide_word(text) is not the 40_ version'; end if;
end $s49g$;

-- restore public.resolve_word_review(uuid,text,text,text) (md5 63a3e2f29a7d7ca206a5db7d3159317a)
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
BEGIN
  if not public.rd_is_admin() then
    raise exception 'admin only';
  end if;
  v_actor := auth.uid()::text;

  SELECT * INTO v FROM public.word_review_queue WHERE id = p_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  v_phrase := btrim(coalesce(nullif(p_edit,''), v.extracted));

  IF p_action IN ('approve','edit') THEN
    v_add_result := public.wa_add_word(v_phrase, coalesce(v.source,'review'), null);
    IF v_add_result = 'possible_variant_queued' THEN
      UPDATE public.word_review_queue
         SET status='merged', extracted=v_phrase, decided_by=v_actor,
             decided_at=now(), updated_at=now()
       WHERE id=p_id;
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

    RETURN 'approved:' || coalesce(v_add_result,'unknown') ||
           CASE WHEN v_word_id IS NOT NULL
                THEN ':engine_verified=' || coalesce(v_engine_verified,false)::text
                ELSE ':engine_verified=false' END;
  ELSIF p_action = 'reject' THEN
    UPDATE public.word_review_queue SET status='rejected', decided_by=v_actor, decided_at=now() WHERE id=p_id;
    RETURN 'rejected';
  ELSIF p_action IN ('block','hide') THEN
    UPDATE public.word_review_queue SET status='blocked', decided_by=v_actor, decided_at=now() WHERE id=p_id;
    RETURN 'blocked';
  ELSIF p_action = 'merge' THEN
    UPDATE public.word_review_queue SET status='merged', decided_by=v_actor, decided_at=now() WHERE id=p_id;
    RETURN 'merged';
  ELSIF p_action = 'delete' THEN
    DELETE FROM public.word_review_queue WHERE id=p_id;
    RETURN 'deleted';
  END IF;
  RETURN 'noop';
END;
$function$;

-- restore public.wa_word_review(uuid,text) (md5 b6a17fa640ca992a65368263cdcba28b)
CREATE OR REPLACE FUNCTION public.wa_word_review(p_id uuid, p_action text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.rd_is_admin() then
    raise exception 'admin only';
  end if;

  if p_action = 'approve' then
    update gematria_words
       set is_verified=true,
           visibility_reason='approved_by_admin',
           visibility_changed_at=now()
     where id=p_id;
    return 'approved';
  elsif p_action = 'reject' then
    update gematria_words
       set is_verified=false,
           visibility_reason='rejected_by_admin',
           visibility_changed_at=now()
     where id=p_id;
    return 'rejected';
  elsif p_action = 'delete' then
    delete from gematria_words where id=p_id;
    return 'deleted';
  end if;
  return 'noop';
end;
$function$;

-- restore public.admin_bulk_triage(text) (md5 2a44326886e4d3011d6df36f78c411e2)
CREATE OR REPLACE FUNCTION public.admin_bulk_triage(p_action text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n int;
begin
  if not exists (select 1 from users where id=auth.uid() and role='admin') then return -1; end if;
  with fam as (select ragil, count(*) c from gematria_words where is_verified=true group by ragil),
  target as (
    select p.id, _word_rec(p.phrase, coalesce(f.c,0)::int) rec
    from gematria_words p left join fam f on f.ragil=p.ragil
    where p.is_verified=false and coalesce(p.visibility_reason,'') <> 'rejected_by_admin'
  )
  update gematria_words g set
    is_verified = case when p_action='approve_good' then true else false end,
    visibility_reason = case when p_action='approve_good' then 'approved_by_admin' else 'rejected_by_admin' end,
    visibility_changed_at = now()
  from target t
  where g.id = t.id
    and ((p_action='reject_junk' and t.rec='reject') or (p_action='approve_good' and t.rec='approve'));
  get diagnostics v_n = row_count;
  return v_n;
end; $function$;

-- restore public.admin_hide_word(text) (md5 fe5dfee95a705dcfb2ee969f7e544a5a)
CREATE OR REPLACE FUNCTION public.admin_hide_word(p_phrase text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n int;
begin
  -- אדמין בלבד (אותה בדיקה כמו admin_words_console)
  if not exists (select 1 from users where id = auth.uid() and role = 'admin') then
    return jsonb_build_object('error','forbidden');
  end if;
  if p_phrase is null or btrim(p_phrase) = '' then
    return jsonb_build_object('error','empty');
  end if;

  update gematria_words
     set is_verified = false,
         visibility_reason = 'rejected_by_admin',
         visibility_changed_at = now()
   where btrim(phrase) = btrim(p_phrase);
  get diagnostics v_n = row_count;

  return jsonb_build_object('ok', true, 'hidden', v_n, 'phrase', btrim(p_phrase));
end;
$function$;

drop function public.admin_corpus_enqueue_existing_words_v1(uuid[],text);
drop function public.admin_corpus_admission_state_v1();
drop function public._corpus_admission_ledger_v1(text,text,text,jsonb,jsonb,jsonb);
drop function public._corpus_word_state_v1(uuid);

do $s49p$
begin
  if md5(pg_get_functiondef('public.resolve_word_review(uuid,text,text,text)'::regprocedure)) <> '63a3e2f29a7d7ca206a5db7d3159317a' then raise exception 'S49: public.resolve_word_review(uuid,text,text,text) was not restored exactly'; end if;
  if md5(pg_get_functiondef('public.wa_word_review(uuid,text)'::regprocedure)) <> 'b6a17fa640ca992a65368263cdcba28b' then raise exception 'S49: public.wa_word_review(uuid,text) was not restored exactly'; end if;
  if md5(pg_get_functiondef('public.admin_bulk_triage(text)'::regprocedure)) <> '2a44326886e4d3011d6df36f78c411e2' then raise exception 'S49: public.admin_bulk_triage(text) was not restored exactly'; end if;
  if md5(pg_get_functiondef('public.admin_hide_word(text)'::regprocedure)) <> 'fe5dfee95a705dcfb2ee969f7e544a5a' then raise exception 'S49: public.admin_hide_word(text) was not restored exactly'; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
             and p.proname in ('_corpus_word_state_v1','_corpus_admission_ledger_v1','admin_corpus_admission_state_v1','admin_corpus_enqueue_existing_words_v1')) then
    raise exception 'S49: a created function is still present'; end if;
end $s49p$;

commit;
