-- POST_PUBLISHING_2029_CHAIN_V1 — explicit, server-only ACL for the existing system post writer.
-- BRANCH-ONLY: NOT applied to live. Reuses public.sys_save_post as-is (no new function/table/store).
-- Live DRIFT observed 2026-10-05: sys_save_post ACL = {postgres=X/postgres} only, yet the post-save Edge
-- (and the publish_post bundle) call it as service_role. Restore the intended boundary explicitly:
-- service_role + postgres ONLY; never PUBLIC / anon / authenticated.
revoke all on function public.sys_save_post(bigint, text, text, text, text, text[], text[], text, text, text, boolean) from public;
revoke all on function public.sys_save_post(bigint, text, text, text, text, text[], text[], text, text, text, boolean) from anon;
revoke all on function public.sys_save_post(bigint, text, text, text, text, text[], text[], text, text, text, boolean) from authenticated;
grant execute on function public.sys_save_post(bigint, text, text, text, text, text[], text[], text, text, text, boolean) to service_role;
