// Authentication diagnostics. Classifies a failure into a small, fixed vocabulary and keeps a short in-tab trail of
// {time, kind, step, status}. It never records or logs passwords, one-time codes, access/refresh tokens, e-mail addresses
// or any response body: only the fixed `kind`, the step name and the numeric HTTP status.
export const AUTH_FAILURE_KINDS = Object.freeze([
  'blocked_by_worker', 'otp_expired', 'otp_consumed', 'rate_limited', 'invalid_verification_type', 'pkce_mismatch',
  'refresh_failed', 'stale_worker', 'callback_failed', 'invalid_credentials', 'storage_unavailable', 'network', 'server_error', 'unknown',
]);

import { isStorageError } from './authStorage.js';
const text = value => String(value ?? '');
export function classifyAuthError(error, { step = '' } = {}) {
  if (!error) return 'unknown';
  const status = Number(error.status ?? error.statusCode ?? 0) || 0;
  const code = text(error.code ?? error.error_code), message = text(error.message ?? error.msg ?? error.error);
  // A real upstream outage reported by the worker is a network failure, not a policy denial.
  if (/public_reading_auth_unreachable/.test(message + code)) return 'network';
  if (/public_reading_auth_denied/.test(message + code)) return 'blocked_by_worker';
  // The browser refused to store something (full quota, blocked site data): never a network problem, even though the text starts with "Failed to".
  if (isStorageError(error)) return 'storage_unavailable';
  if (/worker_(identity_mismatch|redundant|bootstrap_timeout|bootstrap_expired|required)/.test(message)) return 'stale_worker';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) return 'rate_limited';
  if (code === 'otp_expired' || /expired or is invalid/i.test(message)) return step === 'verify_repeat' ? 'otp_consumed' : 'otp_expired';
  if (code === 'bad_code_verifier' || code === 'flow_state_not_found' || code === 'flow_state_expired' || /code verifier|pkce/i.test(message)) return 'pkce_mismatch';
  if (code === 'refresh_token_not_found' || code === 'refresh_token_already_used' || /invalid refresh token/i.test(message)) return 'refresh_failed';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return 'invalid_credentials';
  if (code === 'validation_failed' && /type/i.test(message)) return 'invalid_verification_type';
  if (status >= 500) return 'server_error';
  if (error.name === 'AuthRetryableFetchError' || error.name === 'TypeError' || status === 0 && /fetch|network|failed to/i.test(message)) return 'network';
  return 'unknown';
}

const KEY = 'sod_auth_diag_v1', MAX = 20;
function store() { try { return globalThis.sessionStorage || null; } catch { return null; } }
export function recordAuthEvent(kind, step = '', status = 0, now = Date.now()) {
  const safe = { t: now, kind: AUTH_FAILURE_KINDS.includes(kind) ? kind : 'unknown', step: text(step).replace(/[^a-z_]/g, '').slice(0, 24), status: Number(status) || 0 };
  const s = store(); if (!s) return safe;
  try { const trail = JSON.parse(s.getItem(KEY) || '[]'); trail.push(safe); s.setItem(KEY, JSON.stringify(trail.slice(-MAX))); } catch { /* diagnostics are best effort */ }
  return safe;
}
export function readAuthTrail() { try { const parsed = JSON.parse(store()?.getItem(KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
export function reportAuthFailure(error, step) { const kind = classifyAuthError(error, { step }); recordAuthEvent(kind, step, error?.status); return kind; }

// Short, plain-Hebrew explanation per kind, and whether the runtime-recovery action should be offered.
export const AUTH_MESSAGES = Object.freeze({
  blocked_by_worker: 'הדפדפן עדיין מחזיק גרסה ישנה של האתר וחסם את הבקשה. לחצו על ״רענון האתר״ ונסו שוב. ההתחברות והנתונים שלכם לא יימחקו.',
  stale_worker: 'האתר לא נטען במלואו בגרסה החדשה. לחצו על ״רענון האתר״ ונסו שוב.',
  otp_expired: 'הקוד שגוי או שפג תוקפו. הקוד תקף פעם אחת, ורק האחרון שנשלח. אפשר לבקש קוד חדש או להיכנס עם סיסמה.',
  otp_consumed: 'הקוד כבר נוצל. אם כבר התחברתם, רעננו את הדף. אחרת בקשו קוד חדש.',
  rate_limited: 'כבר שלחנו קוד לפני רגע. השתמשו בקוד מהמייל האחרון (כל בקשה חדשה מבטלת את הקודם), או המתינו כחצי דקה ובקשו שוב.',
  invalid_verification_type: 'סוג האימות לא התקבל. בקשו קוד חדש ונסו שוב.',
  pkce_mismatch: 'הקישור נפתח בדפדפן או במכשיר אחר מזה שבו ביקשתם אותו. חזרו למסך הכניסה והזינו את הקוד מהמייל.',
  refresh_failed: 'החיבור לחשבון פג. היכנסו שוב.',
  callback_failed: 'הכניסה לא הושלמה. אם פתחתם את הקישור בדפדפן או במכשיר אחר מזה שבו ביקשתם אותו, חזרו למסך הכניסה והזינו את הקוד מהמייל.',
  invalid_credentials: 'המייל או הסיסמה אינם נכונים. אפשר להיכנס גם עם קוד למייל.',
  storage_unavailable: 'הדפדפן לא מאפשר לשמור נתוני אתר (האחסון מלא או חסום), ולכן ההתחברות לא יכולה להישמר לצמיתות. הכניסה עדיין אפשרית וההתחברות תחזיק בטאב הזה, אבל תצטרכו להיכנס שוב אחרי שסוגרים אותו. פרטי האחסון מוצגים למטה. שום מידע שלכם לא נמחק.',
  network: 'אין חיבור יציב לרשת. בדקו את החיבור ונסו שוב.',
  server_error: 'השרת לא ענה כרגע. נסו שוב בעוד רגע.',
  unknown: 'הכניסה לא הושלמה. נסו שוב או היכנסו עם סיסמה.',
});
export const RECOVERABLE_BY_REFRESH = new Set(['blocked_by_worker', 'stale_worker']);
