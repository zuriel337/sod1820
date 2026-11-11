CREATE OR REPLACE FUNCTION public.fn_corpus_admission_gate(p_phrase text, p_source text, p_source_ref text DEFAULT NULL::text, p_contributor text DEFAULT NULL::text, p_claimed_value integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_identity jsonb := fn_resolve_word_identity(p_phrase);
  v_class text := v_identity->>'classification';
  v_word_id uuid;
begin
  if v_class = 'MATCH' then
    v_word_id := (v_identity->>'word_id')::uuid;
    if p_source_ref is not null and p_claimed_value is not null then
      insert into research_objects (kind, statement, terms, value, source, source_ref, contributor, confidence, engine_verified, status, meta)
      values ('fact', coalesce(p_phrase,'') || ' — repeated discovery', array[btrim(p_phrase)], p_claimed_value,
        coalesce(p_source,'admission_gate'), p_source_ref, p_contributor, 90, true, 'candidate',
        jsonb_build_object('ext', jsonb_build_object('corpus_admission', jsonb_build_object(
          'matched_word_id', v_word_id, 'match_type', v_identity->>'match_type',
          'original_representation', p_phrase, 'gate', 'fn_corpus_admission_gate'))))
      on conflict (public.fn_research_source_uid(source_ref), public.fn_research_claim_uid(statement))
        where created_at >= timestamptz '2026-08-29 21:00:00+00'
        do nothing;
    end if;
    return jsonb_build_object('action','existing','word_id',v_word_id,'identity',v_identity);
  elsif v_class = 'POSSIBLE_VARIANT' then
    return jsonb_build_object('action','review','identity',v_identity);
  else
    return jsonb_build_object('action','new','identity',v_identity);
  end if;
end $function$
