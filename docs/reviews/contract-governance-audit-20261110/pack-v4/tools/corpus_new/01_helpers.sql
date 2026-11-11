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
