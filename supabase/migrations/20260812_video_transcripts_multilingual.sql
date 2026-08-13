-- 🎬 שכבת תמלול רב-לשוני לכל סרטון (video_transcription_law)
-- כל סרטון (YouTube / mp4 מאוחסן / ריל אינסטגרם) מקבל תמלול-מקור אחד + תרגומים לכל שפה.
-- מפתח-זהות גמיש (video_key): מזהה YouTube, או shortcode/URL של ריל, או slug.
create table if not exists public.video_transcripts (
  id           bigint generated always as identity primary key,
  video_key    text not null,                                  -- זהות קנונית: yt id / reel shortcode / slug
  video_id     bigint references public.home_videos(id) on delete set null,
  yt           text,
  source_url   text,                                           -- למשל קישור הריל באינסטגרם
  title        text,
  lang         text not null,                                  -- 'he','en','ar','es','fr','ru','pt','de',...
  transcript   text not null,
  summary      text,
  is_original  boolean not null default false,                 -- true = שפת-המקור שממנה מתרגמים
  translated_by text,                                          -- 'human' | 'anthropic:claude-sonnet-5'
  model        text,
  status       text not null default 'published',              -- 'pending' | 'draft' | 'published'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (video_key, lang)
);

create index if not exists video_transcripts_key_idx on public.video_transcripts (video_key);
create index if not exists video_transcripts_video_id_idx on public.video_transcripts (video_id);

-- 🔐 rls_client_read_protocol: RLS + policy + GRANT מפורש-עמודות (בלי GRANT אין קריאה!)
alter table public.video_transcripts enable row level security;

drop policy if exists video_transcripts_read on public.video_transcripts;
create policy video_transcripts_read on public.video_transcripts
  for select using (status = 'published');

-- GRANT רשימת-עמודות בלבד (status לא נחשף ללקוח; מסונן ב-policy)
grant select (id, video_key, video_id, yt, source_url, title, lang, transcript, summary, is_original, translated_by, model, created_at, updated_at)
  on public.video_transcripts to anon, authenticated;

-- כתיבה = service_role בלבד (edge function video-transcribe) → אין GRANT ל-anon/authenticated.

-- טריגר updated_at
create or replace function public.video_transcripts_touch() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists video_transcripts_touch_trg on public.video_transcripts;
create trigger video_transcripts_touch_trg before update on public.video_transcripts
  for each row execute function public.video_transcripts_touch();

-- ── SQL-wrapper לקריאה ל-Edge Function video-transcribe (מירור של social_admin) ──
-- מושך FB_ADMIN_KEY מ-Vault ושולח כ-header x-fb-admin-key. קריאה דרך execute_sql בלבד.
create or replace function public.video_translate(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'extensions','public','vault'
as $function$
declare
  v_key text;
  v_url text := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/video-transcribe';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';
  v_status int;
  v_content text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name='FB_ADMIN_KEY' limit 1;
  if v_key is null then
    return jsonb_build_object('ok', false, 'error', 'FB_ADMIN_KEY missing from vault');
  end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '120000');
  select r.status, r.content into v_status, v_content
  from extensions.http((
    'POST', v_url,
    array[
      extensions.http_header('x-fb-admin-key', v_key),
      extensions.http_header('apikey', v_anon),
      extensions.http_header('Authorization', 'Bearer ' || v_anon)
    ]::extensions.http_header[],
    'application/json',
    coalesce(p_payload, '{}'::jsonb)::text
  )::extensions.http_request) r;
  return jsonb_build_object(
    'http_status', v_status,
    'result', case when v_content ~ '^\s*[\[{]' then v_content::jsonb else to_jsonb(v_content) end
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$function$;

revoke all on function public.video_translate(jsonb) from public, anon, authenticated;
