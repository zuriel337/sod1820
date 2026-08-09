-- 🧲 שלב ב' · צעד 1 — Dispatcher + canonical-key resolver (subscription_funnel_law v12).
-- העיקרון: ה-Dispatcher לא יודע עברית/אנגלית/URL/display_name. הוא עובד רק מול זהות קנונית
-- (entity_type + stable_id). resolve_topics = השכבה היחידה שממירה זהות→topic; מיגרציה עתידית
-- ל-cat:<id>/author:<id> תשנה רק אותה (לא את המנוע). In-App בלבד. אידמפוטנטי. append-only audit.
-- לא נוגע ב: world:mine · רזיאל · איחוד-local-stores · חשיפת codes:new UI · i18n.

-- ── (A) יומן-אירועים append-only (audit ברמת-האירוע; «מה נשלח ולמי כמה») ──
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  stable_id   text not null,
  kind        text not null,
  source_ref  text,
  topics      text[] not null default '{}',   -- ה-topics שנפתרו מהזהות הקנונית
  recipients  integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.notification_events enable row level security;
drop policy if exists ne_admin_read on public.notification_events;
create policy ne_admin_read on public.notification_events for select
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
-- server-only בכוונה: אין GRANT ל-anon/authenticated (rls_client_read_protocol).
create index if not exists ix_notification_events_entity on public.notification_events(entity_type, stable_id);
create index if not exists ix_notification_events_ref on public.notification_events(source_ref);

-- ── (B) resolver — השכבה היחידה שיודעת «מהי הזהות הקנונית → אילו topics» ──
-- ⚠️ נקודת-הבידוד ל-Future-Proof: כאן ורק כאן stable_id הופך למחרוזת-topic.
-- היום: author/category — stable_id == display-name (עדיין אין id יציב). מחר, לפני אנגלית,
-- הפונקציה הזו תמפה name→canonical_id (ותוכל להוסיף aliases/locales) — בלי לגעת ב-Dispatcher,
-- ב-watch_toggle או במשטחי-ה-UI. number/stream/codes כבר קנוניים לחלוטין.
create or replace function public.resolve_topics(p_entity_type text, p_stable_id text)
returns text[] language plpgsql immutable set search_path to 'public' as $function$
begin
  return case p_entity_type
    when 'number'         then array['number:'  || p_stable_id]
    when 'author'         then array['author:'  || p_stable_id]
    when 'category'       then array['cat:'     || p_stable_id]
    when 'cipher_feed'    then array['codes:new']
    when 'reality_stream' then array['stream:reality']
    else array[]::text[]
  end;
end $function$;
revoke all on function public.resolve_topics(text,text) from public;

-- ── (C) הליבה: dispatch(זהות קנונית + טקסט-תצוגה) → מנויים → התראה (dedup) → יומן ──
-- dedup: (recipient | kind | source_ref) — אירוע-תוכן אחד = התראה אחת לאדם, גם אם הוא עוקב
-- אחרי כמה מהישויות שלו (קטגוריה+כתב לאותו פוסט). source_topic = ה-topic שבאמת התאים לאדם.
create or replace function public.dispatch(
  p_entity_type text, p_stable_id text, p_kind text, p_source_ref text,
  p_title text, p_body text, p_link text, p_exclude uuid default null)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare v_topics text[]; v_n integer;
begin
  v_topics := public.resolve_topics(p_entity_type, p_stable_id);
  if v_topics is null or array_length(v_topics, 1) is null then return 0; end if;

  insert into public.user_notifications
    (user_id, email, kind, title, body, link, source_topic, source_ref, channels_sent, dedupe_key)
  select np.user_id, lower(u.email), p_kind, p_title, p_body, p_link,
         (select t from unnest(v_topics) t where t = any(np.topics) limit 1),   -- «למה קיבלת»: ה-topic שהתאים
         p_source_ref, array['in_app'],
         np.user_id::text || '|' || p_kind || '|' || coalesce(p_source_ref, '')
  from public.notification_prefs np
  join public.users u on u.id = np.user_id
  where np.user_id is not null
    and np.topics && v_topics                                   -- חפיפה: עוקב אחרי אחד/יותר מה-topics
    and np.user_id is distinct from p_exclude
    and (np.muted_until is null or np.muted_until < now())
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics v_n = row_count;

  insert into public.notification_events(entity_type, stable_id, kind, source_ref, topics, recipients)
    values (p_entity_type, p_stable_id, p_kind, p_source_ref, v_topics, v_n);
  return v_n;
end $function$;
revoke all on function public.dispatch(text,text,text,text,text,text,text,uuid) from public;

-- ── (D) Emitters — טריגרי-תוכן מנותבים מחדש דרך ה-Dispatcher (מנוע אחד) ──
-- כלל-ברזל: אירוע-תוכן אחד = kind אחד + source_ref אחד, נפלט לכמה ישויות → dedup מבטיח
-- התראה אחת לאדם. פוסט: cat: (קיים) + author: (חדש — עכשיו author: באמת יורה).
create or replace function public.notify_on_post_publish()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare c text;
begin
  if coalesce(NEW.date, now()) < now() - interval '2 hours' then return NEW; end if;
  if NEW.categories is not null and array_length(NEW.categories,1) is not null then
    foreach c in array NEW.categories loop
      if c is not null and btrim(c) <> '' then
        perform public.dispatch('category', c, 'post_new', NEW.id::text,
          'פוסט חדש ב' || c, NEW.title, '/' || NEW.slug);
      end if;
    end loop;
  end if;
  if NEW.author is not null and btrim(NEW.author) <> '' and NEW.author <> 'המערכת' then
    perform public.dispatch('author', NEW.author, 'post_new', NEW.id::text,
      'פוסט חדש מאת ' || NEW.author, NEW.title, '/' || NEW.slug);
  end if;
  return NEW;
end $function$;
drop trigger if exists trg_posts_notify on public.posts;
create trigger trg_posts_notify after insert on public.posts
  for each row execute function public.notify_on_post_publish();

-- צופן-קהילה חדש → codes:new (התנהגות זהה: community+published בלבד; דרך ה-Dispatcher).
create or replace function public.notify_on_cipher_publish()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(NEW.status,'') = 'published' and coalesce(NEW.source,'') = 'community'
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

-- תמונת-זרם חדשה → stream:reality (קיים) + number:<primary_value> (חדש — האירוע הקנוני
-- הברור למספר: «רמז/חומר חדש על מספר N»). kind אחד = reality_new → מי שעוקב גם וגם = התראה אחת.
create or replace function public.notify_on_stream_image()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_new boolean;
begin
  v_new := coalesce(NEW.source,'') = 'update'
       and (TG_OP = 'INSERT' or coalesce(OLD.source,'') <> 'update');
  if not v_new then return NEW; end if;
  perform public.dispatch('reality_stream', 'all', 'reality_new', NEW.id::text,
    'רמז חדש בזרם המציאות 🌊',
    coalesce(nullif(NEW.name,''), case when NEW.primary_value is not null then 'מספר ' || NEW.primary_value else 'תמונה חדשה' end),
    case when NEW.primary_value is not null then '/archive?q=' || NEW.primary_value else '/archive' end);
  if NEW.primary_value is not null then
    perform public.dispatch('number', NEW.primary_value::text, 'reality_new', NEW.id::text,
      'חומר חדש על ' || NEW.primary_value || ' 🔢',
      coalesce(nullif(NEW.name,''), 'רמז חדש בזרם'),
      '/number/' || NEW.primary_value);
  end if;
  return NEW;
end $function$;
drop trigger if exists trg_stream_image_notify on public.gallery_images;
create trigger trg_stream_image_notify after insert or update of source on public.gallery_images
  for each row execute function public.notify_on_stream_image();
