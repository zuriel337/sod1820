-- OR_GEULA_VIDEO_ENRICHMENT_V1
-- Additive enrichment for WhatsApp channel videos. Source WhatsApp text is never overwritten.
-- Grounded SEO metadata is stored separately; generic captions use STT only as enrichment evidence.

create or replace function public.wa_video_enrich_openai_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'OPENAI_API_KEY'
  order by created_at desc
  limit 1
$$;

revoke all on function public.wa_video_enrich_openai_key() from public, anon, authenticated;
grant execute on function public.wa_video_enrich_openai_key() to service_role;

comment on function public.wa_video_enrich_openai_key() is
  'Service-role-only secret bridge for wa-video-enrich STT. Never callable by anon/authenticated.';

alter table public.channel_updates
  add column if not exists seo_title text,
  add column if not exists topics text[] not null default '{}'::text[],
  add column if not exists enrichment_status text not null default 'pending',
  add column if not exists enrichment_source text,
  add column if not exists enriched_at timestamptz;

comment on column public.channel_updates.seo_title is
  'Grounded SEO/display title derived only from source caption/transcript; source text remains unchanged.';
comment on column public.channel_updates.topics is
  'Grounded topical labels derived only from source caption/transcript.';
comment on column public.channel_updates.enrichment_status is
  'pending|enriched|retry_stt|failed for wa-video-enrich.';
comment on column public.channel_updates.enrichment_source is
  'caption|stt; provenance for enrichment metadata.';

-- Explicit canonical mapping for all existing public Or-Geula videos.
update public.channel_updates
set link_url = 'https://sod1820.co.il/or-geula/video/' || id::text
where channel = 'or-geula'
  and image_url ilike '%.mp4%'
  and (link_url is null or btrim(link_url) = '');

-- Keep enrichment asynchronous so wa-channel-ingest remains fast and reliable.
do $$
declare v_id bigint;
begin
  select jobid into v_id from cron.job where jobname = 'wa-video-enrich';
  if v_id is not null then
    perform cron.unschedule(v_id);
  end if;
end $$;

select cron.schedule(
  'wa-video-enrich',
  '*/30 * * * *',
  $cron$
    with s as (
      select decrypted_secret as key
      from vault.decrypted_secrets
      where name = 'FB_ADMIN_KEY'
      order by created_at desc
      limit 1
    )
    select net.http_post(
      url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-video-enrich',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-fb-admin-key',s.key
      ),
      body := '{"limit":8}'::jsonb,
      timeout_milliseconds := 50000
    )
    from s
    where nullif(s.key,'') is not null;
  $cron$
);
