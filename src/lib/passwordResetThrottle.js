// Password-reset requests are throttled per address in the tab, separately from sign-in code requests, so asking for a link
// never blocks asking for a code (and the reverse). Uses the shared per-address window in otpThrottle.js.
export const passwordResetKey = email => 'reset:' + String(email || '').trim().toLowerCase();
