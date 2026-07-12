-- 🧭 המודל הפרשני של SOD1820 — שכבה ב' (פרשנות), נפרדת משכבת-החישוב (nodes rules = עובדות).
-- לא "חוק" אוניברסלי: profile='sod1820' מאפשר אסכולות עתידיות (method_profiles) על אותו מנוע.
-- confidence_source: algorithm · tradition (ספרים) · curated (הגדרת צוריאל) · derived (נגזרת חישובית).
-- ה-seed = טיוטה מנוסחת מ-METHODS.soul (gematria.js); status='draft' עד תיקון/אישור צוריאל.
create table if not exists public.method_semantics (
  id uuid primary key default gen_random_uuid(),
  profile text not null default 'sod1820',
  method text not null,
  relation_type text not null,
  emoji text,
  label_he text,
  phrase_template text,
  description text,
  confidence_source text not null default 'curated' check (confidence_source in ('algorithm','tradition','curated','derived')),
  status text not null default 'draft' check (status in ('draft','approved')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(profile, method)
);
alter table public.method_semantics enable row level security;
drop policy if exists method_semantics_public_read on public.method_semantics;
create policy method_semantics_public_read on public.method_semantics for select using (true);
-- (שורות ה-seed הוזרמו במיגרציה בענן; ראה method_semantics_model)

-- ── סבב-דיוק 2 (הכרעות צוריאל + GPT) ──
-- שדות נפרדים: calculation_description (עובדה) / semantic_description (המודל) / core_note (ידע-ליבה פנימי).
-- confidence: algorithm · traditional_source · sod1820_model · derived.
-- אושרו: מסתתר (חכמה מסתתר=67=בינה, מאומת-מנוע) · אתבש (מצב הפוך) · אלבם (11+11 · בן-הזוג).
-- ידע-ליבה «גדול»: אותיות גדולות = דין (שקר=600 · מנצפ״ך · ק=רגליה יורדות מוות) — מוזן ל-AI, לא הסבר חיצוני.
-- נוספו: מילוי דמילוי · מילוי דמילוי גדול · משולש גדול · מסתתר גדול · הכפלה גדולה · ריבוע גדול.
alter table public.method_semantics
  add column if not exists calculation_description text,
  add column if not exists semantic_description text,
  add column if not exists core_note text;
-- (עדכוני התוכן המלאים הוחלו במיגרציית-ענן method_semantics_round2)
