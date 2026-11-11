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
