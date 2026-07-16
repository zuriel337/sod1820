-- 16.7.2026 — Make the bot watchdog delivery-aware (bot_delivery_law).
-- Previously fn_bot_watchdog only detected cron silence, so a bot whose cron
-- runs fine but whose WhatsApp sends fail (the "asleep" incident) went
-- undetected. Now it also flags stuck/failed rows in bot_outbox and pings the
-- bot (which drains its outbox via retryOutbox). Also excludes '[queued%'
-- replies from the "last real reply" signal.
CREATE OR REPLACE FUNCTION public.fn_bot_watchdog()
 RETURNS TABLE(bot_name text, status text, last_cron_run timestamp with time zone, last_real_reply timestamp with time zone, minutes_cron_silent integer, action_taken text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  cfg RECORD;
  v_last_cron TIMESTAMPTZ;
  v_last_reply TIMESTAMPTZ;
  v_minutes INT;
  v_status TEXT;
  v_action TEXT;
  v_cron_name TEXT;
  v_outbox_key TEXT;
  v_outbox_bad INT;
BEGIN
  FOR cfg IN SELECT * FROM public.bot_watchdog_config WHERE active=true LOOP
    v_cron_name := CASE cfg.bot_name
      WHEN 'אוריאל'  THEN 'wa-uriel'
      WHEN 'גבריאל'  THEN 'wa-gabriel'
      WHEN 'רזיאל'   THEN 'wa-christina'
      WHEN 'מיכאל'   THEN 'wa-michael'
      WHEN 'התשבי'   THEN 'wa-hatishbi'
      ELSE NULL
    END;

    SELECT MAX(start_time) INTO v_last_cron
    FROM cron.job_run_details jrd
    JOIN cron.job j ON j.jobid=jrd.jobid
    WHERE j.jobname = v_cron_name;

    SELECT MAX(wl.created_at) INTO v_last_reply
    FROM public.wa_bot_log wl
    WHERE wl.action = cfg.action_key
      AND wl.reply_out NOT LIKE '[no%'
      AND wl.reply_out NOT LIKE '[skip%'
      AND wl.reply_out NOT LIKE '[muted%'
      AND wl.reply_out NOT LIKE '[seeded%'
      AND wl.reply_out NOT LIKE '[covered%'
      AND wl.reply_out NOT LIKE '[positive%'
      AND wl.reply_out NOT LIKE '[queued%'
      AND wl.reply_out NOT LIKE '[empty%';

    v_minutes := CASE WHEN v_last_cron IS NULL THEN 9999
                      ELSE EXTRACT(EPOCH FROM (NOW()-v_last_cron))::INT/60
                 END;

    v_status := CASE
      WHEN v_last_cron IS NULL THEN 'no_cron'
      WHEN v_minutes > 10      THEN 'stuck'
      WHEN v_minutes > 5       THEN 'warning'
      ELSE 'ok'
    END;

    -- Deliverability check: failed / long-pending outbox rows = a real problem
    -- even when the cron is running fine (the send-silently-failed failure mode).
    v_outbox_key := replace(coalesce(v_cron_name,''), 'wa-', '');
    v_outbox_bad := 0;
    BEGIN
      SELECT count(*) INTO v_outbox_bad
      FROM public.bot_outbox o
      WHERE o.bot = v_outbox_key
        AND (o.status = 'failed'
          OR (o.status = 'pending' AND o.first_at < NOW() - INTERVAL '15 minutes'));
    EXCEPTION WHEN OTHERS THEN v_outbox_bad := 0; END;

    IF v_outbox_bad > 0 THEN
      v_status := 'stuck';
    END IF;

    v_action := 'monitor_only';
    IF v_status IN ('stuck','no_cron') AND cfg.bot_url IS NOT NULL THEN
      BEGIN
        PERFORM net.http_get(url:=cfg.bot_url, timeout_milliseconds:=30000);
        v_action := CASE WHEN v_outbox_bad > 0 THEN 'auto_pinged:outbox='||v_outbox_bad ELSE 'auto_pinged' END;
      EXCEPTION WHEN OTHERS THEN v_action := 'ping_failed'; END;
    END IF;

    INSERT INTO public.bot_health (bot_name, last_reply_at, minutes_since_last_reply, status, alert_sent)
    VALUES (cfg.bot_name, v_last_reply, v_minutes, v_status, v_status IN ('stuck','no_cron'));

    bot_name:=cfg.bot_name; status:=v_status;
    last_cron_run:=v_last_cron; last_real_reply:=v_last_reply;
    minutes_cron_silent:=v_minutes; action_taken:=v_action;
    RETURN NEXT;
  END LOOP;
END;
$function$;
