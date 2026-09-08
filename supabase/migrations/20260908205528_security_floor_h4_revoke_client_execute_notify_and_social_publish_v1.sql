-- H4 — nine SECURITY DEFINER helpers were executable by anon and authenticated with no gate.
-- Eight of them reach live brand publishing (Facebook / Instagram) via social_admin;
-- notify_topic writes broadcast notification rows.
-- INTENT: all nine are SERVER_ONLY (cron / server-invoked). Caller proof: zero RPC callers
-- in src/, supabase/functions/ and api/. The only notify_topic hits in the codebase are two
-- explanatory UI comment strings in EntityHubGoldenControls.jsx, not invocations.
-- NOTE: this migration was a NO-OP against the live ACL and is retained for provenance only;
-- the effective change is the corrective migration that follows it. See its header.
-- NOT TESTED BY INVOCATION: calling any social-publish helper would publish to live brand
-- pages, and their idempotency is unverified. Verified structurally only, by design.

revoke execute on function public.notify_topic(text, text, text, text, text, text, uuid) from anon, authenticated;
revoke execute on function public.fn_publish_squid_social() from anon, authenticated;
revoke execute on function public.fn_publish_squid_456() from anon, authenticated;
revoke execute on function public.fn_publish_schumann_social() from anon, authenticated;
revoke execute on function public.sod_publish_greenprince_fb() from anon, authenticated;
revoke execute on function public.sod_publish_greenprince_post() from anon, authenticated;
revoke execute on function public.sod_publish_jerusalem_reels() from anon, authenticated;
revoke execute on function public.sod_publish_spain_alonlevy() from anon, authenticated;
revoke execute on function public.post_mazal_sartan_fb() from anon, authenticated;
