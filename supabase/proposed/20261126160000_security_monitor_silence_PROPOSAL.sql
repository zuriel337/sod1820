-- Security monitor silence in check_security_spike (PROPOSAL, NOT APPLIED).
-- Apply only on an explicit ZURIEL approval of this exact file (CLAUDE.md 0.4: DDL on the shared DB). Apply as ONE transaction.
-- ORDER: edge function + edge change + canary secret FIRST (docs/reviews/security-edge-package-20261126/README.md). Applied earlier, this
-- function correctly alerts every 12 hours that the security monitor is silent (it is, since 4.11.2026) - noise until the first genuine canary row.
--
-- Owner: system_suggestions_law v7 (reliability/health tree; admin_system_health reads security_alerts). EXTEND_EXISTING: the same function, the same
-- table security_alerts, the same work_log/notify_admin channels. fn_reliability_watch is NOT touched, no table, no cron, no new function.
-- What: (1) the spike detection is byte-for-byte the original (same queries, thresholds 150/h or 100 from one country); (2) if no GENUINE canary row
-- (ua exactly 'sod1820-security-canary/1', which only security-probe-log can write, and only for a valid HMAC proof) arrived for 13 hours, or ever:
-- ONE security_alerts row (total 0), one work_log 'alert' row and one notify_admin per 12 hours.
-- Three different things stay separate: PREVENTION (edge 403; a WAF rule is a separate approval), RECORDING (security-probe-log -> log_security ->
-- security_log) and ALERTING WHEN THE MONITOR ITSELF STOPS (this function).
-- Guard: the live source must be the one read on 26.11.2026 (md5 of prosrc 052ef5209cc75deced4fb572a5587762).
-- Rollback: 20261126160000_security_monitor_silence_ROLLBACK.sql.
do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='public.check_security_spike()'::regprocedure) <> '052ef5209cc75deced4fb572a5587762' then
    raise exception 'check_security_spike drifted from the 26.11.2026 source; reconcile before applying';
  end if;
end
$guard$;

create or replace function public.check_security_spike()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_total int; v_country text; v_count int;
  c_canary constant text := 'sod1820-security-canary/1';   -- written ONLY by security-probe-log after verifying the canary HMAC proof
  c_silence constant interval := interval '13 hours';      -- canary runs every 6 hours (post-deploy-canary schedule); two misses + margin
  v_last_canary timestamptz;
  v_msg text;
begin
  -- 1) Attack-spike detection: UNCHANGED (same two queries, same thresholds, canary rows are counted like any other row: there are only a few
  --    a day, and nothing a requester can send is excluded from the count).
  select count(*) into v_total from security_log where ts > now()-interval '1 hour';
  select country, count(*) into v_country, v_count from security_log
    where ts > now()-interval '1 hour' group by country order by count(*) desc limit 1;
  if v_total >= 150 or coalesce(v_count,0) >= 100 then
    insert into public.security_alerts (total, top_country, top_country_count, note)
    values (v_total, v_country, v_count,
      format('ספייק פריצות: %s בשעה האחרונה (שיא %s מ-%s)', v_total, v_count, v_country));
  end if;

  -- 2) Monitor-silence detection (decision 337): this function used to report "succeeded" while no writer fed security_log (22 days,
  --    4.11-26.11.2026). The scheduled canary sends one signed synthetic probe through the real edge path; the edge function stamps the
  --    exact canary marker only on a valid proof, and relabels a forged marker. If no genuine canary row arrived for 13 hours (or ever),
  --    the monitor itself is dead and this says so, once per 12 hours, through the channels that already exist: security_alerts (read
  --    by admin_system_health), work_log and notify_admin.
  select max(ts) into v_last_canary from security_log where ua = c_canary;
  if v_last_canary is null or v_last_canary < now() - c_silence then
    if not exists (select 1 from public.security_alerts where ts > now() - interval '12 hours' and note like 'שקט ניטור אבטחה%') then
      v_msg := case when v_last_canary is null
        then 'שקט ניטור אבטחה: לא נקלט אות בדיקה (canary) מאומת מעולם. מסלול edge ← security_log לא הוכח; ניטור ספייקים עיוור עד שיוכח.'
        else format('שקט ניטור אבטחה: אות הבדיקה המאומת האחרון נקלט לפני %s שעות (סף 13). מסלול edge ← security_log או ה-canary המתוזמן הפסיקו.',
                    round(extract(epoch from (now() - v_last_canary)) / 3600)) end;
      insert into public.security_alerts (total, top_country, top_country_count, note) values (0, '--', 0, v_msg);
      insert into public.work_log (session_date, topic, what_we_did, status, open_threads)
      values (current_date, '🚨 ניטור אבטחה שותק (אוטומטי)', v_msg, 'alert',
              'הזרם: edge-security-probe.js ← security-probe-log ← log_security ← security_log; ה-canary: .github/workflows/post-deploy-canary.yml (דורש SECURITY_CANARY_KEY). שתיקה אינה הוכחת שקט: לבדוק את הפריסה האחרונה, ריצות ה-canary וה-WAF.');
      begin
        perform public.notify_admin('🚨 סוד1820 — ניטור האבטחה שותק' || chr(10) || v_msg);
      exception when others then null;
      end;
    end if;
  end if;
end; $function$;
