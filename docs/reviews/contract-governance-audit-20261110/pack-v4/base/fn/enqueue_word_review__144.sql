CREATE OR REPLACE FUNCTION public.enqueue_word_review(p_original text, p_extracted text, p_kind text, p_word_count integer, p_flags jsonb, p_quality integer, p_confidence integer, p_reason text, p_source text, p_safe_to_auto boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_ext text := btrim(coalesce(p_extracted,'')); v_gate jsonb; v_action text; v_similar jsonb;
begin
  if v_ext = '' then return 'empty'; end if;
  v_gate := fn_corpus_admission_gate(v_ext, coalesce(p_source,'wa'), p_original, null, null);
  v_action := v_gate->>'action';
  if v_action = 'existing' then return 'exists'; end if;

  v_similar := case when v_action = 'review' then (v_gate->'identity'->'candidates') else '[]'::jsonb end;

  insert into word_review_queue (original_text, extracted, reason, kind, word_count, flags, quality_score, confidence, similar_words, source, hits)
  values (p_original, v_ext, p_reason, p_kind, coalesce(p_word_count,0),
    coalesce(p_flags,'{}'::jsonb) || jsonb_build_object('identity_classification', v_gate->'identity'->>'classification', 'auto_classified', coalesce(p_safe_to_auto,false)),
    p_quality, p_confidence, v_similar, p_source, 1)
  on conflict (extracted) do update set hits = word_review_queue.hits + 1, updated_at = now();
  return 'queued';
end $function$
