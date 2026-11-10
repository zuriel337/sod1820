// Prevents pointless repeated code requests from one tab. Every new request invalidates the previous code and Auth
// rate-limits re-requests, so a second request inside the window gives the person nothing but a dead code.
export const OTP_RESEND_WINDOW_MS = 30_000;
const sent = new Map();
const keyOf = email => String(email || '').trim().toLowerCase();
export function otpResendWaitMs(email, now = Date.now()) {
  const last = sent.get(keyOf(email));
  return last ? Math.max(0, OTP_RESEND_WINDOW_MS - (now - last)) : 0;
}
export function markOtpSent(email, now = Date.now()) { sent.set(keyOf(email), now); }
export function clearOtpThrottle() { sent.clear(); }
