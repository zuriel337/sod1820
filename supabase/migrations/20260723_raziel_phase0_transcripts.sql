-- 🧠 המוח-המשתפר, שלב 0: תיעוד-שיחה מלא (הדלק לניטור ולשיפור-עצמי).
-- הפער שנסגר: reply_out ב-wa_bot_log היה '[dm-sent]' בלבד → מה שהבוט *אמר* לא נשמר.
-- פתרון בטוח בלי פריסת-Edge: הלכדה בפונקציית-הצוואר היחידה wa_admin (sendMessage), מבודדת לחלוטין.
-- (הוחל ב-DB דרך apply_migration 23.7.2026; קובץ זה לתיעוד/שחזור. הגדרת wa_admin המלאה חיה ב-DB.)

create table if not exists public.bot_transcripts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  chat_id text,
  message text,
  http_status int,
  meta jsonb
);
alter table public.bot_transcripts enable row level security;  -- server-only (אין policy; קריאה דרך admin_conversation)
create index if not exists bot_transcripts_chat_idx on public.bot_transcripts(chat_id, created_at desc);

-- קריאה לניטור: מיזוג נכנס (wa_bot_log) + יוצא (bot_transcripts) לשיחה רציפה. אדמין בלבד (auth.uid→users.role).
create or replace function public.admin_conversation(p_phone text, p_days int default 7)
returns table(ts timestamptz, direction text, who text, text_body text)
language plpgsql security definer set search_path=public as $$
declare v_admin boolean; v_p text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
begin
  select (role='admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin,false) then raise exception 'admin only'; end if;
  return query
    select w.created_at, 'in'::text, coalesce(w.sender_name,'משתמש'), w.text_in
    from public.wa_bot_log w
    where w.sender = v_p and w.text_in is not null and w.action = 'raziel_dm'
      and w.created_at > now() - make_interval(days => p_days)
    union all
    select b.created_at, 'out'::text, 'רזיאל'::text, b.message
    from public.bot_transcripts b
    where b.chat_id = v_p || '@c.us'
      and b.created_at > now() - make_interval(days => p_days)
    order by 1;
end; $$;
revoke all on function public.admin_conversation(text,int) from public, anon;
grant execute on function public.admin_conversation(text,int) to authenticated;

-- הערה: wa_admin עודכן בנפרד (CREATE OR REPLACE) להוסיף בלוק-הלכדה מבודד:
--   if lower(p_method) like 'sendmessage%' and p_payload ? 'message' then
--     begin insert into bot_transcripts(chat_id,message,http_status,meta) values (...);
--     exception when others then null; end;  -- לעולם לא חוסם את שליחת-הבוט
--   end if;
