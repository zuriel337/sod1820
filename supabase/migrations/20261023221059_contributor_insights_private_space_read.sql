-- Schema-only reconstruction of the applied Insight private-space read boundary.
-- Authorized data corrections remain in the private coordination ledger.
CREATE POLICY insights_private_space_read ON public.insights
AS RESTRICTIVE FOR SELECT TO anon, authenticated
USING (
  coalesce(space, 'core') <> 'private'
  OR (SELECT public.rd_is_admin())
  OR panel_data->>'privacy_owner_user_id' = (SELECT auth.uid())::text
);
