CREATE OR REPLACE FUNCTION public.admin_bulk_triage(p_action text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n int;
begin
  if not exists (select 1 from users where id=auth.uid() and role='admin') then return -1; end if;
  with fam as (select ragil, count(*) c from gematria_words where is_verified=true group by ragil),
  target as (
    select p.id, _word_rec(p.phrase, coalesce(f.c,0)::int) rec
    from gematria_words p left join fam f on f.ragil=p.ragil
    where p.is_verified=false and coalesce(p.visibility_reason,'') <> 'rejected_by_admin'
  )
  update gematria_words g set
    is_verified = case when p_action='approve_good' then true else false end,
    visibility_reason = case when p_action='approve_good' then 'approved_by_admin' else 'rejected_by_admin' end,
    visibility_changed_at = now()
  from target t
  where g.id = t.id
    and ((p_action='reject_junk' and t.rec='reject') or (p_action='approve_good' and t.rec='approve'));
  get diagnostics v_n = row_count;
  return v_n;
end; $function$
