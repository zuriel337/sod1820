-- 🌳 גזע: מוח אחד לרזיאל — מקור-אמת יחיד לפרסונה, שממנו יונקים גם האתר (ai-analyze) וגם הוואטסאפ (wa-christina).
-- core = הפרסונה המשותפת (זהה ל-SYSTEM_BASE הלוחם של wa-christina). addon_site = הערת-ערוץ-אתר (פלט חוזה raziel_response_contract).
-- עדכון ה-core = עדכון שני הערוצים בבת אחת (חוק העץ האחד — לא מערכת מקבילה).
-- (הוחל ב-DB דרך apply_migration ב-23.7.2026; קובץ זה לתיעוד/שחזור.)
create table if not exists public.raziel_brain (
  id int primary key default 1,
  core text not null,
  addon_wa text not null default '',
  addon_site text not null default '',
  model text not null default 'claude-sonnet-5',
  voice_version int not null default 1,
  updated_at timestamptz not null default now(),
  constraint raziel_brain_singleton check (id = 1)
);
alter table public.raziel_brain enable row level security;  -- server-only (service_role bypasses)

-- fn_raziel_persona — מרכיב את הפרסונה לפי ערוץ. server-only (service_role בלבד — הפונקציות הקצה קוראות).
create or replace function public.fn_raziel_persona(p_channel text default 'site')
returns text
language sql
stable
security definer
set search_path = public
as $fn$
  select b.core ||
    case lower(coalesce(p_channel,'site'))
      when 'wa' then b.addon_wa
      when 'whatsapp' then b.addon_wa
      when 'site' then b.addon_site
      when 'web' then b.addon_site
      else b.addon_site
    end
  from public.raziel_brain b
  where b.id = 1;
$fn$;

revoke all on function public.fn_raziel_persona(text) from public, anon, authenticated;
grant execute on function public.fn_raziel_persona(text) to service_role;

-- הזרעה: core = SYSTEM_BASE של wa-christina מילה-במילה · addon_site = הערת-ערוץ + חוזה JSON.
-- (ראה seed מלא ברשומת work_log «המוח-המשותף של רזיאל (גזע) — מוח+זיכרון אחד».)
