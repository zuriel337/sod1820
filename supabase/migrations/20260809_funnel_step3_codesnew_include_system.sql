-- 🧩 צעד 3: fan-out של codes:new כולל צפני-מערכת (source='admin'), לא רק community.
-- הגדרה קנונית: «צופן חדש» = נעשה ציבורי-לראשונה בספרייה → status→published AND source IN ('admin','community').
-- מוחרגים: research (תיקייה נסתרת) ו-import (bulk backfill). first-published-only. אותו Dispatcher/alias els.
create or replace function public.notify_on_cipher_publish()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(NEW.status,'') = 'published'
     and coalesce(NEW.source,'') in ('admin','community')
     and (TG_OP = 'INSERT' or coalesce(OLD.status,'') <> 'published') then
    perform public.dispatch('cipher_feed', 'all', 'code_new', NEW.id::text,
      'צופן חדש עלה 🔐', coalesce(nullif(NEW.title,''), nullif(NEW.search_term,''), 'צופן חדש'),
      '/codes/' || NEW.slug);
  end if;
  return NEW;
end $function$;
drop trigger if exists trg_cipher_notify on public.els_records;
create trigger trg_cipher_notify after insert or update of status on public.els_records
  for each row execute function public.notify_on_cipher_publish();
