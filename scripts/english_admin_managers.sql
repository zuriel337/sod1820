-- ============================================================================
-- ניהול מלא לטאב-אנגלית — גשרים + כינויים (כמו ניהול העברית) — 2026-07-11
-- ----------------------------------------------------------------------------
-- BridgesManager + AliasesManager ב-LanguageEngineTab. כל ה-RPC אדמין-בלבד
-- (SECURITY DEFINER + בדיקת role='admin'). הוחלו ב-DB (חי). כאן לשחזור.
--
-- ⚠️ מוסכמת-סטטוס לגשרים: «ממתין לאישורך» = status='approved' + human_verified=false
--    (לא status='pending' — מצב-לימבו שה-UI/counters מתעלמים ממנו).
-- ============================================================================

-- ── גשרים (language_links) ──────────────────────────────────────────────────
-- admin_all_bridges() → כל הגשרים (מאושר/ממתין/נדחה) עם status+human_verified.
-- admin_verify_bridge(id, action): verify | reject | unverify | delete.
-- admin_edit_bridge(id, hebrew, foreign): מחליף מילים, מחשב gematria_he=fn_ragil מחדש.
--   (ההגדרות המלאות הוחלו ב-DB — ראה pg_get_functiondef עבור כל אחת.)

-- ── כינויים (word_aliases) ─────────────────────────────────────────────────
create or replace function public.admin_all_aliases()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from users where id=auth.uid() and role='admin') then return jsonb_build_object('error','forbidden'); end if;
  return (select coalesce(jsonb_agg(to_jsonb(a) order by a.verified, a.created_at desc), '[]'::jsonb)
    from (select wa.id, wa.alias, wa.lang, wa.method, wa.verified, wa.source, wa.confidence,
                 gw.phrase as hebrew, gw.ragil, wa.created_at
          from word_aliases wa left join gematria_words gw on gw.id = wa.word_id
          where wa.lang <> 'he') a);
end $$;
grant execute on function public.admin_all_aliases() to authenticated, anon;

-- הוספה ידנית: מוודא שהמילה העברית קיימת (הטריגר gw_enforce_engine מחשב גימטריה), ואז כינוי מאומת
create or replace function public.admin_add_alias(p_hebrew text, p_alias text, p_lang text default 'en', p_method text default 'transliteration')
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_word uuid; v_id uuid; v_heb text := btrim(coalesce(p_hebrew,''));
begin
  if not exists (select 1 from users where id=auth.uid() and role='admin') then return null; end if;
  if v_heb = '' or btrim(coalesce(p_alias,'')) = '' then return null; end if;
  select id into v_word from gematria_words where phrase = v_heb order by created_at limit 1;
  if v_word is null and v_heb ~ '^[א-ת]+( [א-ת]+)*$' then
    insert into gematria_words (phrase, source, category, space, visibility_reason)
    values (v_heb, 'admin-alias', 'כינוי לועזי', 'core', 'alias_manual') returning id into v_word;
  end if;
  if v_word is null then return null; end if;
  select add_word_alias(v_heb, btrim(p_alias), coalesce(p_lang,'en'), 'english', 'admin', coalesce(p_method,'transliteration'), 1, true) into v_id;
  return v_id;
end $$;
grant execute on function public.admin_add_alias(text,text,text,text) to authenticated, anon;

-- עריכה: טקסט לועזי ו/או המילה העברית שאליה מפנה
create or replace function public.admin_edit_alias(p_id uuid, p_alias text default null, p_hebrew text default null)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_word uuid; v_heb text := btrim(coalesce(p_hebrew,''));
begin
  if not exists (select 1 from users where id=auth.uid() and role='admin') then return -1; end if;
  if v_heb <> '' then
    select id into v_word from gematria_words where phrase = v_heb order by created_at limit 1;
    if v_word is null and v_heb ~ '^[א-ת]+( [א-ת]+)*$' then
      insert into gematria_words (phrase, source, category, space, visibility_reason)
      values (v_heb, 'admin-alias', 'כינוי לועזי', 'core', 'alias_manual') returning id into v_word;
    end if;
  end if;
  update word_aliases
    set alias = coalesce(nullif(btrim(p_alias),''), alias),
        alias_norm = lower(coalesce(nullif(btrim(p_alias),''), alias)),
        word_id = coalesce(v_word, word_id)
    where id = p_id;
  return 1;
end $$;
grant execute on function public.admin_edit_alias(uuid,text,text) to authenticated, anon;
-- אישור/הסתרה/מחיקה של כינוי = admin_manage_alias(id, 'verify'|'hide'|'delete') — קיים מראש.
