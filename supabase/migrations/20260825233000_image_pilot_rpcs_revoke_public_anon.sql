-- SOD1820 — ACL hygiene: close default PUBLIC/anon EXECUTE on the two Zvi image-pilot RPCs
-- Actor: CLAUDE
-- Date: 2026-08-25
-- Task: ZVI_HUMAN_GATE_WORKFLOW — post-merge ACL hygiene pass (Zuriel explicit instruction)
--
-- Same class of gap found and fixed on channel_update_save_to_research
-- (20260825230000 migration): both image_artifact_classify and image_artifact_route_to_intake
-- were created via CREATE OR REPLACE FUNCTION (20260825160000 migration) without an explicit
-- REVOKE ALL FROM PUBLIC first, so Postgres' default EXECUTE-to-PUBLIC grant survived alongside
-- the migration's own explicit "GRANT ... TO authenticated" — confirmed live via
-- information_schema.role_routine_grants before writing this (PUBLIC + authenticated + postgres
-- were all present on both functions).
--
-- image_artifact_route_to_intake is SECURITY DEFINER with an internal users.role='admin' check —
-- same reasoning as channel_update_save_to_research: no actual unauthorized write was possible
-- (anon/non-admin got {ok:false,error:'admin_only'}), this is ACL hygiene, not a breach fix.
-- image_artifact_classify is SECURITY INVOKER, STABLE, read-only (never writes) — its own
-- read access is already bounded by the caller's own SELECT grants on gallery_images (RLS
-- ro_admin_read-equivalent gi_anon_sel policy already allows public SELECT on gallery_images
-- itself, so this classifier exposes nothing beyond what's already publicly readable); tightening
-- its EXECUTE grant is still done here for consistency/least-privilege, not because a real gap
-- was found in its case.
--
-- No function body change on either function.
--
-- service_role intentionally NOT granted on either: their only live callers are the browser admin
-- client (authenticated role, ImagePilotPanel/ImagePilotCard in WarRoomTab.jsx), gated by
-- auth.uid() for the write RPC; a service_role caller has no auth.uid() and would hit the same
-- admin_only refusal on the write RPC regardless, and the read-only classifier has no service_role
-- caller anywhere in the repo.

REVOKE ALL ON FUNCTION public.image_artifact_classify(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.image_artifact_classify(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.image_artifact_classify(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.image_artifact_route_to_intake(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.image_artifact_route_to_intake(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.image_artifact_route_to_intake(uuid) TO authenticated;
