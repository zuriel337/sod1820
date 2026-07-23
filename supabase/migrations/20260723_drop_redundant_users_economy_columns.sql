-- 🗑️ מחיקת עמודות-הכלכלה המקבילות/הנטושות מ-users. profiles = מקור-האמת (unify_credits).
-- הרצף הבטוח: (1) auth.js PROFILE_COLS כבר לא בוחר credits/xp/level → (2) פריסת-main (3cd4ac8)
--   מאומתת חי (הבandל מכיל 'avatar_url, tier, role, created_at' בלי הסיומת) → (3) מחיקה זו.
-- users.tier נשאר — מושג 'member'/'free' חי שהאתר מציג (כתר «בני ההיכל»), נפרד מ-profiles.tier(0-5).
-- כבר הוחל חי דרך apply_migration; קובץ זה = תיעוד הפיך.

-- (1) ניקוי המראה הנטושה ב-my_research_level (הפנתה ל-users.xp/level שנמחקים). xp/level → profiles בלבד.
create or replace function public.my_research_level()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_gem int; v_ri int; v_days int; v_ai int; v_contrib int; v_wa int; v_ref int; v_posts int;
  v_xp int; v_level int; v_label text; v_next int; v_next_label text; v_floor int; v_snr int;
begin
  if v_uid is null then return jsonb_build_object('ok',false); end if;
  select count(*) filter (where kind='gematria'), count(distinct date_trunc('day',created_at)) into v_gem, v_days from public.user_activity where user_id=v_uid;
  select count(*) into v_ri from public.research_items where user_id=v_uid;
  select count(*) into v_ai from public.ai_token_log where user_id=v_uid;
  select count(*) into v_contrib from public.research_contributions where author_user_id=v_uid and status='approved';
  select count(*) into v_ref from public.referrals where inviter_id=v_uid;
  v_wa := public.wa_msg_count(v_uid);
  select count(*) into v_posts from public.posts p where p.author in (
    select display_name from public.users where id=v_uid and coalesce(display_name,'')<>''
    union select display_name from public.contributors where user_id=v_uid and coalesce(display_name,'')<>'' );
  v_xp := coalesce(v_gem,0)*1 + coalesce(v_ri,0)*4 + coalesce(v_days,0)*15 + coalesce(v_contrib,0)*40
        + coalesce(v_ai,0)*8 + coalesce(v_wa,0)*8 + coalesce(v_ref,0)*60 + coalesce(v_posts,0)*200;
  v_level := case when v_xp>=5000 then 5 when v_xp>=2000 then 4 when v_xp>=600 then 3 when v_xp>=150 then 2 else 1 end;
  select coalesce(senior_level,0) into v_snr from public.users where id=v_uid;
  v_level := greatest(v_level, coalesce(v_snr,0), 1);
  select (array[0,0,150,600,2000,5000])[v_level+1] into v_floor;
  if v_level>=5 then v_next:=null; v_next_label:=null; else
    v_next := (array[150,600,2000,5000])[v_level]; v_next_label := (array['חוקר מתעורר','חוקר','חוקר בכיר','חוקר היכל'])[v_level];
  end if;
  v_label := (array['מתחיל','חוקר מתעורר','חוקר','חוקר בכיר','חוקר היכל'])[v_level];
  -- 🌱 xp/level נשמרים ב-profiles הקנוני בלבד (users.xp/level נמחקו).
  update public.profiles set xp=v_xp, level=v_level, updated_at=now() where user_id=v_uid;
  return jsonb_build_object('ok',true,'xp',v_xp,'level',v_level,'label',v_label,'floor',v_floor,'next_xp',v_next,'next_label',v_next_label,
    'parts', jsonb_build_object('gematria',v_gem,'research',v_ri,'days',v_days,'contrib',v_contrib,'ai',v_ai,'whatsapp',v_wa,'referrals',v_ref,'posts',v_posts));
end $function$;

-- (2) מחיקת שלוש העמודות המיותרות.
alter table public.users drop column if exists credits;
alter table public.users drop column if exists xp;
alter table public.users drop column if exists level;

comment on table public.users is
  'זהות בסיסית: id·email·username·display_name·avatar_url·role·tier(member/free)·senior_level. '
  '⚠️ הכלכלה (credits/xp/level/streak) חיה ב-profiles הקנוני בלבד — לא כאן (נמחקו 23.7, unify_credits).';
