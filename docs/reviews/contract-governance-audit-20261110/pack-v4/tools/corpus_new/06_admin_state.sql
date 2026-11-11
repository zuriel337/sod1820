CREATE FUNCTION public.admin_corpus_admission_state_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v jsonb;
begin
  if not public.rd_is_admin() then
    return jsonb_build_object('error','forbidden');
  end if;
  -- read-only map of the is_verified=false rows to admission states (decision 4); changes nothing
  with b as (
    select id, is_verified, coalesce(visibility_reason,'') vr, visibility_tier, coalesce(is_published,false) pub,
           coalesce(source,'') src, coalesce(phrase,'') phrase
      from public.gematria_words where is_verified = false),
  c as (
    select b.*, case
      when vr = 'rejected_by_admin' then 'REJECTED_BY_ADMIN'
      when vr = 'bulk_hide_2026_07_03' then 'BULK_HIDDEN_2026_07_03'
      when src like 'ZURIEL%' then 'HUMAN_GATE_AUTHORED'
      when src like 'culture_cipher:%' then 'CULTURE_CIPHER_SOURCE'
      when vr = 'pending_wa' or (vr = 'pending_review' and src like 'wa-%') then 'CHANNEL_PENDING'
      when phrase !~ '^[א-ת]+( [א-ת]+)*$' then 'ENGINE_UNVERIFIABLE_FORMAT'
      when vr = 'exposed_general_clean' then 'EXPOSED_LABEL_UNVERIFIED'
      when vr = '' then 'NO_REASON_IMPORT'
      else 'OTHER_' || upper(vr) end cls
      from b)
  select jsonb_build_object(
      'total', (select count(*) from c),
      'by_class', (select jsonb_object_agg(cls, n) from (select cls, count(*) n from c group by cls) x),
      'by_visibility_reason', (select jsonb_object_agg(coalesce(nullif(vr,''),'(none)'), n) from (select vr, count(*) n from c group by vr) y),
      'state_checksum', (select md5(string_agg(id::text||'|'||is_verified::text||'|'||vr||'|'||coalesce(visibility_tier,-1)::text||'|'||pub::text, ',' order by id)) from c),
      'public_visible', 0,
      'note', 'anon read requires is_verified=true and is_published=true; none of these rows is public')
    into v;
  return v;
end $function$;
