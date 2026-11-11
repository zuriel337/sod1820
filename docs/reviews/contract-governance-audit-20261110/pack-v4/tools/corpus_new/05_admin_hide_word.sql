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
