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
