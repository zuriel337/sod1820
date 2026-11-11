-- PROPOSAL ONLY — NOT APPLIED to any live project. Lives in supabase/proposed (no auto-apply). Apply only with explicit ZURIEL approval (CLAUDE.md 0.4).
-- Owner: content_translation_law §4 («טבלת-תרגומים לפי (entity, lang)»; פוסטים/ישויות = אותו דפוס) — EXTEND_EXISTING, mirrors video_transcripts
-- (RLS + column GRANT + service_role-only writes). Hebrew source stays in posts.* (immutable provenance). Post translations are NEVER stored in
-- video_transcripts and are NOT keyed by video_key. This file does not ALTER posts and adds no trigger on posts.
-- Verified by: tests/sql/content_translations_v1.sql (scripts/run-content-translations-sql-test.sh, throwaway local Postgres).

-- One definition of the source hash, shared by RLS, the publish guard and (byte-for-byte) the engine (entityTranslationPolicy.js sourceHash).
create or replace function public.content_translation_source_hash(p_title text, p_excerpt text, p_content text)
returns text language sql immutable parallel safe as
$$ select encode(sha256(convert_to(coalesce(p_title,'') || E'\n' || coalesce(p_excerpt,'') || E'\n' || coalesce(p_content,''), 'UTF8')), 'hex') $$;

create table if not exists public.content_translations (
  id            bigint generated always as identity primary key,
  entity_type   text not null,
  entity_id     text not null,
  -- Safe typed projection of entity_id: the cast runs ONLY when the text is a canonical positive id (no sign/zeros/spaces/overflow).
  post_id       bigint generated always as (
                  case when entity_type = 'post' and entity_id ~ '^[1-9][0-9]{0,17}$' then entity_id::bigint end) stored,
  lang          text not null,
  source_lang   text not null default 'he',
  title         text,
  excerpt       text,
  content       text,                                  -- translated HTML (markup/URLs copied from the Hebrew source, never model-generated)
  source_hash   text not null,                         -- content_translation_source_hash of the Hebrew source at translation time
  segment_count int check (segment_count is null or segment_count >= 0),
  validation    jsonb not null default '{}'::jsonb,    -- verifier report; never client-readable
  translated_by text not null,                         -- 'anthropic:<model>' | 'human'
  model         text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint content_translations_entity_type_chk check (entity_type in ('post')),
  constraint content_translations_entity_id_chk   check (entity_id ~ '^[1-9][0-9]{0,17}$'),
  constraint content_translations_post_ref_chk    check (entity_type <> 'post' or post_id is not null),
  constraint content_translations_lang_chk        check (lang ~ '^[a-z]{2,3}$' and source_lang ~ '^[a-z]{2,3}$' and lang <> source_lang),
  constraint content_translations_status_chk      check (status in ('pending','draft','published')),
  constraint content_translations_hash_chk        check (source_hash ~ '^[0-9a-f]{64}$'),
  constraint content_translations_unique          unique (entity_type, entity_id, lang),       -- one translation row per (entity, lang)
  -- Referential protection: a translation cannot point at a non-existent post; deleting a post removes only its derived translations.
  constraint content_translations_post_fk         foreign key (post_id) references public.posts(id) on delete cascade
);
create index if not exists content_translations_post_idx on public.content_translations (post_id);

alter table public.content_translations enable row level security;
drop policy if exists content_translations_read on public.content_translations;
-- DIRECT table reads are safe on their own (the view is only a projection): published + the parent post is visible to the caller
-- (posts RLS, incl. the «טיוטה» tag) + the translation still matches the CURRENT Hebrew source (stale published rows are unreadable).
create policy content_translations_read on public.content_translations
  for select to anon, authenticated
  using (status = 'published' and entity_type = 'post' and exists (
    select 1 from public.posts p
    where p.id = content_translations.post_id
      and public.content_translation_source_hash(p.title, p.excerpt, p.content) = content_translations.source_hash));
grant select (id, entity_type, entity_id, post_id, lang, source_lang, title, excerpt, content, translated_by, model, updated_at)
  on public.content_translations to anon, authenticated;       -- status / source_hash / validation / segment_count are not exposed
-- writes: service_role only (engine) — no GRANT to anon/authenticated.

-- DB-level publish guard: even service_role cannot publish a translation whose source_hash is not the current source.
create or replace function public.content_translations_guard() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'published' and not exists (
       select 1 from public.posts p
       where new.entity_type = 'post' and new.entity_id ~ '^[1-9][0-9]{0,17}$'      -- stored generated post_id is not yet computed in BEFORE triggers
         and p.id = (case when new.entity_id ~ '^[1-9][0-9]{0,17}$' then new.entity_id::bigint end)
         and public.content_translation_source_hash(p.title, p.excerpt, p.content) = new.source_hash) then
    raise exception 'content_translations: stale_or_unknown_source_hash' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists content_translations_guard_trg on public.content_translations;
create trigger content_translations_guard_trg before insert or update on public.content_translations
  for each row execute function public.content_translations_guard();

-- Reader projection (security_invoker => the table RLS above applies; no extra logic here).
create or replace view public.post_translations_public_v1 with (security_invoker = true) as
select t.post_id, t.lang, t.source_lang, t.title, t.excerpt, t.content, t.translated_by, t.model, t.updated_at
from public.content_translations t where t.entity_type = 'post';
grant select on public.post_translations_public_v1 to anon, authenticated;

-- ROLLBACK (manual, in order): drop view public.post_translations_public_v1; drop table public.content_translations;
--   drop function public.content_translations_guard(); drop function public.content_translation_source_hash(text,text,text);
