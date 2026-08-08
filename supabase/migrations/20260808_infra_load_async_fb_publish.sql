-- Infra-load fix (8.8.2026): stop holding DB connections on blocking outbound HTTP.
--
-- Root cause of the 17:20 health-watch alert: sod_publish_spain_alonlevy() ran 3
-- sequential sod_fb_call('fb_video'/'ig_reels', ..., 150000) calls that each blocked
-- inside Postgres (extensions.http) for the full FB/IG video upload — holding a
-- client-backend connection ~120s until statement_timeout. Same anti-pattern (blocking
-- HTTP inside the DB) drives wa_admin(), which is 68.7% of DB exec time.
--
-- Fix:
--  1) sod_fb_call: heavy publish actions (fb_video, ig_reels) now go through net.http_post
--     (pg_net, non-blocking) — the DB fires the request to the facebook-admin edge function
--     and releases the connection immediately. Light/read actions stay synchronous with a
--     capped timeout. New optional p_async param (auto by action; can force true/false).
--     The old blocking 3-arg overload is dropped so existing 3-arg callers use the new one.
--  2) wa_admin: CURLOPT_TIMEOUT_MS 60000 -> 20000 so one hung Green API call can't hold a
--     connection for a full minute.

CREATE OR REPLACE FUNCTION public.sod_fb_call(
  p_action text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_timeout_ms integer DEFAULT 30000,
  p_async boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'extensions', 'public', 'vault', 'net'
AS $function$
declare
  v_key text;
  v_url text := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/facebook-admin';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';
  v_status int;
  v_content text;
  v_async boolean;
  v_req bigint;
  v_body jsonb;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name='FB_ADMIN_KEY' limit 1;
  if v_key is null then return jsonb_build_object('ok',false,'error','FB_ADMIN_KEY missing from vault'); end if;

  v_body := coalesce(p_payload,'{}'::jsonb) || jsonb_build_object('action',p_action);

  -- Heavy publish actions (video/reels) default to NON-BLOCKING via pg_net so the
  -- DB connection is released instantly instead of being held for the whole upload.
  v_async := coalesce(p_async, lower(p_action) in ('fb_video','ig_reels'));

  if v_async then
    select net.http_post(
      url := v_url,
      body := v_body,
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-fb-admin-key', v_key,
        'apikey', v_anon,
        'Authorization', 'Bearer '||v_anon),
      timeout_milliseconds := greatest(coalesce(p_timeout_ms,30000), 180000)
    ) into v_req;
    return jsonb_build_object('queued', true, 'request_id', v_req, 'via', 'pg_net', 'action', p_action);
  end if;

  -- Synchronous path for light/read actions (whoami, status, photo, dry-runs).
  -- Capped timeout so a single hung call can never hold a DB connection for minutes.
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', least(coalesce(p_timeout_ms,30000), 45000)::text);
  select r.status, r.content into v_status, v_content
  from extensions.http((
    'POST', v_url,
    array[
      extensions.http_header('x-fb-admin-key', v_key),
      extensions.http_header('apikey', v_anon),
      extensions.http_header('Authorization','Bearer '||v_anon)
    ]::extensions.http_header[],
    'application/json',
    v_body::text
  )::extensions.http_request) r;
  return jsonb_build_object('http_status', v_status,
    'result', case when v_content ~ '^\s*[\[{]' then v_content::jsonb else to_jsonb(v_content) end);
exception when others then
  return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$function$;

DROP FUNCTION IF EXISTS public.sod_fb_call(text, jsonb, integer);

CREATE OR REPLACE FUNCTION public.wa_admin(p_method text, p_payload jsonb DEFAULT NULL::jsonb, p_http text DEFAULT 'POST'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'extensions', 'public', 'vault'
AS $function$
declare
  v_id text; v_token text; v_base text; v_url text; v_status int; v_content text;
begin
  select decrypted_secret into v_id from vault.decrypted_secrets where name = 'GREEN_API_ID' limit 1;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'GREEN_API_TOKEN' limit 1;
  select decrypted_secret into v_base from vault.decrypted_secrets where name = 'GREEN_API_URL' limit 1;
  if v_id is null or v_token is null then
    return jsonb_build_object('ok', false, 'error', 'GREEN_API_ID/GREEN_API_TOKEN missing from vault');
  end if;
  v_url := coalesce(nullif(trim(trailing '/' from v_base), ''), 'https://api.green-api.com')
           || '/waInstance' || v_id || '/' || p_method || '/' || v_token;
  -- Capped at 20s (was 60s): a single hung Green API call can no longer hold a DB
  -- connection for a full minute — the pattern that tripped the infra-load alert.
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '20000');
  if upper(p_http) = 'GET' then
    select r.status, r.content into v_status, v_content
    from extensions.http(('GET', v_url, array[]::extensions.http_header[], null, null)::extensions.http_request) r;
  else
    select r.status, r.content into v_status, v_content
    from extensions.http(('POST', v_url, array[]::extensions.http_header[], 'application/json',
      coalesce(p_payload, '{}'::jsonb)::text)::extensions.http_request) r;
  end if;

  if lower(p_method) like 'sendmessage%' and p_payload ? 'message' then
    begin
      insert into public.bot_transcripts(chat_id, message, http_status, meta)
      values (p_payload->>'chatId', p_payload->>'message', v_status,
              jsonb_build_object('method', p_method, 'quoted', p_payload->>'quotedMessageId'));
    exception when others then null;
    end;
  end if;

  return jsonb_build_object('http_status', v_status,
    'result', case when v_content ~ '^\s*[\[{]' then v_content::jsonb else to_jsonb(v_content) end);
exception when others then
  return jsonb_build_object('ok', false, 'error', SQLERRM);
end; $function$;
