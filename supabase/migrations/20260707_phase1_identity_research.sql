-- Phase 1 — identity + research foundation (one-tree)
-- מהותי: public.users כבר קיים כ«פרופיל» (trigger on_auth_user_created → handle_new_user).
-- לכן מרחיבים אותו — לא יוצרים profiles כפול. research_items = מאגר-המחקר המחובר (אנונימי נשאר localStorage).

-- 1) הרחבת הפרופיל הקיים (public.users) — credits/xp/level. NOT NULL DEFAULT מבצע backfill ל-23 המשתמשים.
alter table public.users
  add column if not exists credits integer not null default 0,
  add column if not exists xp      integer not null default 0,
  add column if not exists level   integer not null default 1;

-- 2) research_items — מאגר-מחקר אחד למשתמש מחובר (מאחד את user_saved_items הריק). bucket = דלי.
create table if not exists public.research_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  bucket      text not null default 'library'
              check (bucket in ('cart','library','draft','favorite','pinned')),
  entity_type text not null,                 -- number | phrase | post | verse | image | insight | ...
  entity_ref  text,                          -- מזהה/ערך קנוני (ערך המספר, slug וכו')
  title       text,
  link        text,                          -- קישור קנוני (/number/.. , /post/..)
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (user_id, bucket, entity_type, entity_ref)
);

create index if not exists idx_research_items_user   on public.research_items (user_id, created_at desc);
create index if not exists idx_research_items_entity on public.research_items (entity_type, entity_ref);

alter table public.research_items enable row level security;

-- RLS: בעלים בלבד. שימוש ב-(select auth.uid()) = הצורה שמונעת initplan פר-שורה (H3 בדוח הבריאות).
create policy ri_select_own on public.research_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy ri_insert_own on public.research_items for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy ri_update_own on public.research_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy ri_delete_own on public.research_items for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.research_items to authenticated;
-- אנונימי: אין grant בכוונה — אוסף אנונימי חי ב-localStorage (local-first, research_workspace_law).
