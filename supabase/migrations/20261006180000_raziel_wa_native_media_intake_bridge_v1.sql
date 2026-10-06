-- RAZIEL_WHATSAPP_2029_NATIVE_CUTOVER_V2 — BRANCH-ONLY (not applied live).
-- EXTEND_EXISTING: one bounded service-only RPC that creates the existing research_contributions
-- semantic record (status pending) and binds the exact private submission-inbox object.
-- No new table/store/media system. Mirrors public.bind_contribution_media's media-ref shape and
-- owner-prefix convention (contributors/<id>/ else accounts/<uid>/) for a verified WhatsApp sender.
-- Chain validated inside the function: sender phone -> wa_account_links -> auth user -> owner prefix -> storage object.

create or replace function public.wa_raziel_intake_source_v1(
  p_sender text,
  p_storage_path text,
  p_caption text default null,
  p_role text default 'source'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_phone text := regexp_replace(coalesce(p_sender,''), '[^0-9]', '', 'g');
  v_path text := btrim(coalesce(p_storage_path,''));
  v_role text := lower(btrim(coalesce(p_role,'source')));
  v_uid uuid;
  v_contrib record;
  v_name text;
  v_prefix text;
  v_o record;
  v_mime text;
  v_kind text;
  v_ref jsonb;
  v_existing uuid;
  v_new public.research_contributions%rowtype;
begin
  if length(v_phone) < 7 or length(v_phone) > 15 then raise exception 'invalid sender'; end if;
  if v_path = '' or length(v_path) > 500 or v_path like '%..%' or v_path like '%\%' or v_path ~ '[[:cntrl:]]' then
    raise exception 'invalid storage path';
  end if;
  if v_role !~ '^[a-z0-9][a-z0-9_-]{0,40}$' then raise exception 'invalid media role'; end if;

  -- sender -> wa_account_links -> user (unlinked sender is never accepted)
  select l.user_id into v_uid
  from public.wa_account_links l
  where l.phone = v_phone
  order by l.verified_at desc nulls last
  limit 1;
  if v_uid is null then raise exception 'sender not linked'; end if;

  -- contributor provenance: a phone match alone is NEVER sufficient once wa_account_links resolved a user.
  -- The contributor is used only when contributors.user_id = the linked user_id (explicit contributor<->user binding);
  -- otherwise accounts/<uid>/ prefix and author_contributor_id = null. Never grants a moderation bypass.
  select c.id, c.display_name, coalesce(c.trusted, false) as trusted
    into v_contrib
  from public.contributors c
  where coalesce(c.active, true)
    and c.user_id = v_uid
    and regexp_replace(coalesce(c.phone,''), '[^0-9]', '', 'g') = v_phone
  order by c.vip desc nulls last
  limit 1;

  if v_contrib.id is not null then
    v_prefix := 'sod1820/2029/contributors/' || v_contrib.id::text || '/';
  else
    v_prefix := 'sod1820/2029/accounts/' || v_uid::text || '/';
  end if;
  if position(v_prefix in v_path) <> 1 then
    raise exception 'storage object outside linked owner prefix';
  end if;

  select o.id, o.bucket_id, o.name, o.metadata into v_o
  from storage.objects o
  where o.bucket_id = 'submission-inbox' and o.name = v_path;
  if not found then raise exception 'storage object not found'; end if;

  v_mime := lower(coalesce(v_o.metadata->>'mimetype',''));
  v_kind := case
    when v_mime like 'image/%' then 'image'
    when v_mime in ('application/pdf','application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain') then 'document'
    else null
  end;
  if v_kind is null then raise exception 'unsupported stored mime'; end if;

  -- idempotent (transport retries): the same object is never bound twice for this author
  select rc.id into v_existing
  from public.research_contributions rc
  where rc.author_user_id = v_uid
    and exists (
      select 1 from jsonb_array_elements(coalesce(rc.media,'[]'::jsonb)) item
      where item->>'storage_object_id' = v_o.id::text)
  limit 1;
  if v_existing is not null then
    return jsonb_build_object('ok', true, 'already_bound', true, 'contribution_id', v_existing,
                              'storage_object_id', v_o.id, 'actor_user_id', v_uid);
  end if;

  v_name := nullif(v_contrib.display_name, '');
  v_ref := jsonb_build_object(
    'storage_object_id', v_o.id,
    'kind', v_kind,
    'role', v_role,
    'visibility', 'private',
    'channel', 'whatsapp_dm',
    'contributor_trusted', coalesce(v_contrib.trusted, false)
  );

  insert into public.research_contributions
    (author_user_id, author_contributor_id, author_name, intent, origin, research_state, status, body, media)
  values
    (v_uid, v_contrib.id, v_name, 'מקור', 'whatsapp_dm', 'raw', 'pending',
     nullif(left(btrim(coalesce(p_caption,'')), 4000), ''), jsonb_build_array(v_ref))
  returning * into v_new;

  -- Knowledge-bearing moderation: WhatsApp intake is ALWAYS pending. A standing-approval trigger
  -- (fn_zvi_standing_approve_research_contribution) may flip status on insert for specific authors;
  -- never let that bypass moderation through this channel — abort the whole insert instead.
  if v_new.status is distinct from 'pending' then
    raise exception 'whatsapp intake must remain pending (standing approval trigger would approve)';
  end if;

  return jsonb_build_object('ok', true, 'already_bound', false, 'contribution_id', v_new.id,
                            'storage_object_id', v_o.id, 'actor_user_id', v_uid,
                            'status', v_new.status, 'media_ref', v_ref);
end
$function$;

revoke all on function public.wa_raziel_intake_source_v1(text, text, text, text) from public, anon, authenticated;
grant execute on function public.wa_raziel_intake_source_v1(text, text, text, text) to service_role;

comment on function public.wa_raziel_intake_source_v1(text, text, text, text) is
  'Service-only WhatsApp DM source intake: linked sender -> pending research_contributions + exact private submission-inbox binding. Never approves/publishes.';
