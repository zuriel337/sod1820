create or replace function public.system_watchman_run(p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_detected jsonb;
  v_pulse jsonb;
  v_pending int := 0;
  v_titles text := '';
  v_worth boolean := false;
  v_text text;
  v_sent jsonb;
begin
  v_detected := public.detect_suggestions();
  v_pulse := coalesce(public.site_pulse(7), '{}'::jsonb);
  select count(*), coalesce(string_agg('• ' || title || ' (' || coalesce(confidence::text,'—') || '%)', E'\n'), '') into v_pending, v_titles
  from (select title, confidence from public.system_suggestions where status='pending' order by confidence desc nulls last, created_at desc limit 8) s;
  v_worth := coalesce(p_force,false) or v_pending > 0 or coalesce((v_pulse->>'pending_ratings')::int,0) >= 10 or coalesce((v_pulse->>'ai_analyses')::int,0) > 0 or coalesce((v_pulse->>'new_findings')::int,0) > 0;
  if not v_worth then return jsonb_build_object('ok',true,'sent',false,'reason','nothing_worth_reporting','detected',v_detected,'pulse',v_pulse); end if;
  v_text := concat_ws(E'\n','🧠 דופק סוד 1820 · 7 ימים',format('🤖 ניתוחי AI: %s',coalesce(v_pulse->>'ai_analyses','0')),format('🔬 המשיכו לחקור: %s%% · הוסיפו למחקר: %s%%',coalesce(v_pulse->>'ai_continue_rate','0'),coalesce(v_pulse->>'ai_research_rate','0')),format('🌌 ממצאים חדשים: %s · גשרי שפה: %s',coalesce(v_pulse->>'new_findings','0'),coalesce(v_pulse->>'new_bridges','0')),format('✍️ ממתינים לדירוג: %s',coalesce(v_pulse->>'pending_ratings','0')),case when v_pending>0 then E'\n🧠 המלצות מערכת:\n'||v_titles else null end,'👉 https://sod1820.co.il/admin');
  v_sent := public.notify_admin(v_text,null);
  return jsonb_build_object('ok',true,'sent',true,'suggestions',v_pending,'detected',v_detected,'pulse',v_pulse,'notify',v_sent);
end;
$$;
revoke all on function public.system_watchman_run(boolean) from public, anon, authenticated;
grant execute on function public.system_watchman_run(boolean) to service_role, postgres;
revoke all on function public.detect_suggestions() from public, anon, authenticated;
grant execute on function public.detect_suggestions() to service_role, postgres;
revoke all on function public.site_pulse(integer) from public, anon, authenticated;
grant execute on function public.site_pulse(integer) to service_role, postgres;
create or replace function public.admin_fire_watchman() returns text language plpgsql security definer set search_path to 'public' as $$ begin if not public.rd_is_admin() then raise exception 'admin only'; end if; perform public.system_watchman_run(true); return 'fired'; end; $$;
revoke all on function public.admin_fire_watchman() from public, anon;
grant execute on function public.admin_fire_watchman() to authenticated, postgres;
create or replace function public.notify_payment_request_tg() returns trigger language plpgsql security definer set search_path to 'public' as $$ declare v_email text; v_name text; v_text text; begin select u.email,coalesce(u.display_name,p.full_name) into v_email,v_name from public.users u left join public.profiles p on p.user_id=u.id where u.id=new.user_id; v_text:=concat_ws(E'\n','💳 בקשת רכישת קרדיטים חדשה',format('₪%s · %s קרדיטים',coalesce(new.price_ils::text,'—'),coalesce(new.credits::text,'—')),format('אמצעי: %s',case when new.method='bit' then 'ביט/פייבוקס' else 'העברה בנקאית' end),format('גולש: %s%s',coalesce(v_name,'—'),case when v_email is not null then ' ('||v_email||')' else '' end),case when nullif(new.reference,'') is not null then 'הערה: '||new.reference else null end,'לאישור: אתר ← אדמין ← אישורי תשלום'); perform public.notify_admin(v_text,nullif(new.proof_url,'')); return new; exception when others then return new; end; $$;
update public.agent_identity set wa_slug='wa-raziel' where agent_id='raziel' and active=true and wa_slug='wa-christina';
