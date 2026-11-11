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
$function$
