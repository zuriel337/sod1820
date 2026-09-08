-- H4 CORRECTIVE — the previous migration revoked from anon/authenticated, which was a
-- silent no-op: these nine functions carry EXECUTE granted to PUBLIC, not to anon or
-- authenticated directly. Live proacl was {=X/postgres,postgres=X/postgres} — the leading
-- "=X" is the PUBLIC grant that anon/authenticated/service_role all inherited.
-- Correct action: revoke from PUBLIC, then re-grant explicitly to service_role so the
-- server path is preserved. postgres keeps its own explicit grant, and all 40 pg_cron jobs
-- run as postgres (verified in cron.job), so scheduled publishing is unaffected —
-- including job 11 sod_jerusalem_reels, the only cron entry touching these helpers.
-- Still NOT tested by invocation: calling a social-publish helper would post to live brand pages.
-- Reversible: grant execute on function ... to public;

revoke execute on function public.notify_topic(text, text, text, text, text, text, uuid) from public;
revoke execute on function public.fn_publish_squid_social() from public;
revoke execute on function public.fn_publish_squid_456() from public;
revoke execute on function public.fn_publish_schumann_social() from public;
revoke execute on function public.sod_publish_greenprince_fb() from public;
revoke execute on function public.sod_publish_greenprince_post() from public;
revoke execute on function public.sod_publish_jerusalem_reels() from public;
revoke execute on function public.sod_publish_spain_alonlevy() from public;
revoke execute on function public.post_mazal_sartan_fb() from public;

grant execute on function public.notify_topic(text, text, text, text, text, text, uuid) to service_role;
grant execute on function public.fn_publish_squid_social() to service_role;
grant execute on function public.fn_publish_squid_456() to service_role;
grant execute on function public.fn_publish_schumann_social() to service_role;
grant execute on function public.sod_publish_greenprince_fb() to service_role;
grant execute on function public.sod_publish_greenprince_post() to service_role;
grant execute on function public.sod_publish_jerusalem_reels() to service_role;
grant execute on function public.sod_publish_spain_alonlevy() to service_role;
grant execute on function public.post_mazal_sartan_fb() to service_role;
