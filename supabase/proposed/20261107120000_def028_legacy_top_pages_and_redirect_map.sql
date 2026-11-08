-- DEF-028 (P3) - two anon-reachable objects flagged next to the DEF-001 e-mail exposure. Neither returns an e-mail address.
-- Verified read-only against production on 7.11.2026 (docs/reviews/audit-remediation-20261106/EMAIL-EXPOSURE-VERIFICATION-20261107.md).
--
-- Part A: public.legacy_top_pages(p_limit integer) is SECURITY DEFINER with explicit EXECUTE for anon and authenticated.
--   It returns (title, views) aggregated from the archived Jetpack rows of public.legacy_traffic. That table already has a public read
--   policy (legacy_traffic_read, roles {public}, using true), so the function opens nothing the table does not already open; it is an
--   unused client-callable statistics endpoint. Its only client wrapper (src/lib/visits.js getLegacyTopPages) has no caller and is removed
--   on the RC; no DB object, cron job, trigger, Edge function or API log line (5-7.11) uses it. Client EXECUTE is revoked; server side keeps it.
--   search_path is deliberately NOT changed: the body uses the unqualified table name.
revoke all on function public.legacy_top_pages(integer) from public;
revoke all on function public.legacy_top_pages(integer) from anon, authenticated;
grant execute on function public.legacy_top_pages(integer) to service_role;

-- Part B: public.redirect_map is a view owned by postgres that runs with the owner's rights (advisor ERROR security_definer_view).
--   It exposes (wp_id, slug, '/'||slug) of posts whose tags do not contain the draft tag. The posts policies posts_anon_read and
--   posts_auth_read use exactly the same predicate and anon/authenticated have table SELECT on posts, so running the view with the caller's
--   rights returns the IDENTICAL rows (1291 for both roles, 0 differences, verified live). No behaviour change; the lint finding goes away
--   and the view can never again show a row the caller could not read directly.
alter view public.redirect_map set (security_invoker = true);

-- NOT changed on purpose: public.topic_cards_public (security_barrier) is the intentional public door to topic_cards. anon has no
-- table privilege on topic_cards, the view filters status = 'approved' and findings._do_not_publish, and its created_by values are
-- author labels (none contains an '@'). Switching it to security_invoker would break every anonymous topic read.
