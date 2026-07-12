-- 📜 תיבת-ההגדרות של צוריאל — ערוץ חוקר→מערכת→סוכן (researcher_dialogue_law בכיוון השני).
-- צוריאל כותב באתר (אדמין → עוגנים) → ה-AI עונה מיד → סוכן-פיתוח קורא בתחילת סשן ומיישם.
create table if not exists public.researcher_definitions (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  context text,
  ai_reply text,
  status text not null default 'new' check (status in ('new','ai_replied','applied','archived')),
  applied_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.researcher_definitions enable row level security;
drop policy if exists rd_admin_all on public.researcher_definitions;
create policy rd_admin_all on public.researcher_definitions for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- 🔧 תיקון 12.7: גישה דרך RPC-ים SECURITY DEFINER (rd_add/rd_list/rd_update + rd_is_admin) —
-- policy ישיר שתלוי ב-select על users נכשל בשקט מהלקוח (rls_client_read_protocol).
-- ראה מיגרציית-ענן researcher_definitions_rpcs.
