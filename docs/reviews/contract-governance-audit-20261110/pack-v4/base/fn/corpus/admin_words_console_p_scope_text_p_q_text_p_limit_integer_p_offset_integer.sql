CREATE OR REPLACE FUNCTION public.admin_words_console(p_scope text DEFAULT 'pending'::text, p_q text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_total bigint; v_rows jsonb;
begin
  if not exists (select 1 from users where id = auth.uid() and role = 'admin') then
    return jsonb_build_object('error','forbidden');
  end if;

  with base as (
    select * from gematria_words w
    where (case p_scope
             when 'pending'  then (w.is_verified = false and coalesce(w.visibility_reason,'') <> 'rejected_by_admin')
             when 'verified' then (w.is_verified = true)
             when 'rejected' then (coalesce(w.visibility_reason,'') = 'rejected_by_admin')
             else true end)
      and (p_q is null or p_q = '' or w.phrase ilike '%'||p_q||'%')
  )
  select count(*) into v_total from base;

  with base as (
    select * from gematria_words w
    where (case p_scope
             when 'pending'  then (w.is_verified = false and coalesce(w.visibility_reason,'') <> 'rejected_by_admin')
             when 'verified' then (w.is_verified = true)
             when 'rejected' then (coalesce(w.visibility_reason,'') = 'rejected_by_admin')
             else true end)
      and (p_q is null or p_q = '' or w.phrase ilike '%'||p_q||'%')
    order by w.created_at desc
    limit greatest(p_limit,1) offset greatest(p_offset,0)
  ),
  enriched as (
    select b.id, b.phrase, b.ragil, b.all_values, b.source, b.vip_source, b.notes,
           b.created_at, b.is_verified, b.visibility_reason,
           (b.node_id is not null) as has_entity,
           (select count(*) from gematria_words g2 where g2.ragil=b.ragil and g2.is_verified=true and g2.id<>b.id) as family,
           coalesce(array_length(regexp_split_to_array(btrim(b.phrase),'\s+'),1),1) as wc,
           _word_is_spam(b.phrase) as is_spam
    from base b
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',e.id,'phrase',e.phrase,'ragil',e.ragil,'all_values',e.all_values,
           'source',e.source,'vip_source',e.vip_source,'notes',e.notes,'created_at',e.created_at,
           'is_verified',e.is_verified,'state',e.visibility_reason,
           'has_entity',e.has_entity,'family',e.family,
           'rec', case
             when e.is_spam then jsonb_build_object('v','reject','why','נראה כספאם — קישור/מייל/טלפון/משפט ארוך')
             when e.wc >= 5 then jsonb_build_object('v','reject','why','ביטוי ארוך ('||e.wc||' מילים)')
             when e.wc <= 2 and e.family >= 1 then jsonb_build_object('v','approve','why','מילה נקייה, מחוברת ל-'||e.family||' ביטויים באותו ערך')
             when e.wc <= 3 and e.family >= 3 then jsonb_build_object('v','approve','why','צירוף קצר עם התכנסות חזקה ('||e.family||')')
             when e.wc <= 3 then jsonb_build_object('v','review','why','צירוף קצר — מבט אנושי')
             else jsonb_build_object('v','review','why','גבולי — החלטה שלך')
           end
         ) order by e.created_at desc), '[]'::jsonb)
  into v_rows from enriched e;

  return jsonb_build_object('scope',p_scope,'total',v_total,'limit',p_limit,'offset',p_offset,'rows',v_rows);
end;
$function$
