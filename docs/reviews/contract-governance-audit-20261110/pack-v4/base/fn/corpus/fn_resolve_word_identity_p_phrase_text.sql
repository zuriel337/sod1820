CREATE OR REPLACE FUNCTION public.fn_resolve_word_identity(p_phrase text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid; v_phrase text;
  v_norm text := fn_normalize_for_calc(p_phrase);
  v_similar jsonb;
  v_min_len numeric := greatest(2, length(v_norm)::numeric * 0.5);
begin
  select id, phrase into v_id, v_phrase from gematria_words where phrase = btrim(p_phrase) limit 1;
  if v_id is not null then
    return jsonb_build_object('classification','MATCH','match_type','EXACT_MATCH','word_id',v_id,'phrase',v_phrase);
  end if;

  select id, phrase into v_id, v_phrase from gematria_words where fn_normalize_for_calc(phrase) = v_norm limit 1;
  if v_id is not null then
    return jsonb_build_object('classification','MATCH','match_type','SAFE_NORMALIZED_MATCH','word_id',v_id,'phrase',v_phrase,'input_normalized',v_norm);
  end if;

  select coalesce(jsonb_agg(c), '[]'::jsonb) into v_similar
  from jsonb_array_elements(find_similar_words(p_phrase)) c
  where length(c->>'phrase') >= v_min_len;

  if jsonb_array_length(v_similar) > 0 then
    return jsonb_build_object('classification','POSSIBLE_VARIANT','candidates',v_similar,'human_gate_required',true);
  end if;

  return jsonb_build_object('classification','NEW','phrase',btrim(p_phrase));
end $function$
