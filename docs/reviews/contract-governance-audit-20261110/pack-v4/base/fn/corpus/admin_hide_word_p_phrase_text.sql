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
$function$
