export function analyticsEmissionAllowed2029({
  switchState,
  pathname = "/",
  hostedPreview = false,
  integratedPreview = false,
  kingdomPreview = false,
} = {}) {
  if (!switchState || switchState.loading || !switchState.on) return false;
  if (hostedPreview || integratedPreview) return false;
  if (kingdomPreview && pathname === "/kingdom") return false;
  return true;
}
