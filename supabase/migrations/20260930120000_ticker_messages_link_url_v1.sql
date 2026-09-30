-- 📡 ticker_messages.link_url — יעד-לחיצה אופציונלי להודעת-טיקר ידנית (נתיב פנימי בלבד, מתחיל ב-«/»).
-- NULL = התנהגות קודמת (לחיצה → דף הבית). הלקוח מסנן כל ערך שאינו נתיב פנימי.
alter table public.ticker_messages add column if not exists link_url text;
alter table public.ticker_messages drop constraint if exists ticker_messages_link_url_internal;
alter table public.ticker_messages add constraint ticker_messages_link_url_internal
  check (link_url is null or (link_url like '/%' and link_url not like '//%'));
