-- PROPOSAL ONLY — NOT APPLIED. Not under supabase/migrations (so no CI/auto-apply). Move to the approved path only on ZURIEL approval.
-- Owner: content_translation_law §4 («טבלת-תרגומים לפי (entity, lang)»; פוסטים/ישויות = אותו דפוס). EXTEND_EXISTING — not a parallel store;
-- mirrors video_transcripts (RLS + column GRANT + service_role-only writes). Hebrew source stays in posts.* (immutable provenance, law v3/v4).
-- Post translations are NEVER stored in video_transcripts and are NOT keyed by video_key.

create table if not exists public.content_translations (
  id            bigint generated always as identity primary key,
  entity_type   text not null check (entity_type in ('post')),          -- extendable by the law's «ישויות» later
  entity_id     text not null check (entity_id ~ '^[0-9]+$'),            -- posts.id (single post identity)
  lang          text not null check (lang ~ '^[a-z]{2,3}$'),
  source_lang   text not null default 'he' check (source_lang ~ '^[a-z]{2,3}$'),
  title         text,
  excerpt       text,
  content       text,                                                    -- translated HTML (markup/URLs copied from source, never model-generated)
  source_hash   text not null,                                           -- sha256(title\nexcerpt\ncontent) of the Hebrew source at translation time
  segment_count int,
  validation    jsonb not null default '{}'::jsonb,                      -- verifier report (verses/numbers/urls/skeleton); not client-readable
  translated_by text not null,                                          -- 'anthropic:<model>' | 'human'
  model         text,
  status        text not null default 'pending' check (status in ('pending','draft','published')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (entity_type, entity_id, lang),                                 -- one row per (post, lang)
  check (lang <> source_lang)
);
create index if not exists content_translations_entity_idx on public.content_translations (entity_type, entity_id);

alter table public.content_translations enable row level security;
drop policy if exists content_translations_read on public.content_translations;
create policy content_translations_read on public.content_translations
  for select to anon, authenticated
  using (status = 'published'
         and exists (select 1 from public.posts p where p.id::text = content_translations.entity_id));  -- parent post RLS (טיוטה) applies
grant select (id, entity_type, entity_id, lang, source_lang, title, excerpt, content, translated_by, model, updated_at)
  on public.content_translations to anon, authenticated;                 -- status/source_hash/validation not exposed
-- writes: service_role only (edge function video-transcribe extension) — no GRANT to anon/authenticated.

create or replace function public.content_translations_touch() returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists content_translations_touch_trg on public.content_translations;
create trigger content_translations_touch_trg before update on public.content_translations
  for each row execute function public.content_translations_touch();

-- Reader view: only translations that still match the CURRENT Hebrew source (no trigger on posts; stale rows simply disappear).
create or replace view public.post_translations_public_v1 with (security_invoker = true) as
select t.entity_id::bigint as post_id, t.lang, t.source_lang, t.title, t.excerpt, t.content, t.translated_by, t.model, t.updated_at
from public.content_translations t
join public.posts p on p.id = t.entity_id::bigint
where t.entity_type = 'post' and t.status = 'published'
  and t.source_hash = encode(sha256(convert_to(coalesce(p.title,'')||E'\n'||coalesce(p.excerpt,'')||E'\n'||coalesce(p.content,''), 'UTF8')), 'hex');
grant select on public.post_translations_public_v1 to anon, authenticated;

-- ROLLBACK (manual): drop view public.post_translations_public_v1; drop table public.content_translations;
