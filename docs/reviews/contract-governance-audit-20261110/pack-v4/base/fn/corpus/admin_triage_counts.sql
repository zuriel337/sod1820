CREATE OR REPLACE FUNCTION public.admin_triage_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from users where id=auth.uid() and role='admin') then return jsonb_build_object('error','forbidden'); end if;
  return (
    with fam as (select ragil, count(*) c from gematria_words where is_verified=true group by ragil),
    r as (
      select _word_rec(p.phrase, coalesce(f.c,0)::int) rec
      from gematria_words p left join fam f on f.ragil=p.ragil
      where p.is_verified=false and coalesce(p.visibility_reason,'') <> 'rejected_by_admin'
    )
    select jsonb_build_object(
      'reject',  count(*) filter (where rec='reject'),
      'approve', count(*) filter (where rec='approve'),
      'review',  count(*) filter (where rec='review'),
      'total',   count(*)
    ) from r
  );
end; $function$
