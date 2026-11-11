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
$function$
