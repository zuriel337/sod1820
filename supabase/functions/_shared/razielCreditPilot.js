// Non-secret server allowlist. Inputs must come from verified server identity,
// never request body role/user_id. The action catalogue remains the DB kill switch.
export const RAZIEL_CREDIT_PILOT_USER_ID = '36f5cb84-71c3-4977-a2c7-d6413e973443';
export function isRazielCreditPilot({ enabled, verifiedUserId, verifiedRole } = {}) {
  return enabled === true && verifiedRole === 'admin' && verifiedUserId === RAZIEL_CREDIT_PILOT_USER_ID;
}
