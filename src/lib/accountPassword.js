// Pure, framework-free rules of the e-mail + password account flow (sign-up, code confirmation, sign-in, reset).
// No Supabase client and no React in here: every decision is a function of its arguments and is unit-tested.
//
// Design rules this file encodes:
//  * Confirmation and password reset are completed by typing a code from the e-mail. No link is ever required, so the flow works in any
//    browser or device and never depends on a browser storage that a mail app's in-app browser does not share.
//  * A failure to send is never presented as a success. A 5xx, a network failure or a rate limit keeps the person on the step they were
//    on, with an honest message.
//  * Nothing here reveals whether an address already has an account.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// A surface may open an account when it is the public release, an ordinary build, or a functional preview that was explicitly granted.
// A read-only integrated preview must still refuse account creation (previously expressed as `shouldCreateUser`).
export function accountCreationAllowed({ publicReading, preview, functionalPreview } = {}) {
  return Boolean(publicReading) || !preview || functionalPreview === "true";
}

export function normalizeEmail(value) {
  return String(value ?? "").trim();
}

export function isEmailAddress(value) {
  const address = normalizeEmail(value);
  return address.length <= 320 && EMAIL_PATTERN.test(address);
}

// Returns "" when the password is acceptable for submission, otherwise the message to show. Supabase Auth owns the real policy
// (its own minimum, strength and breached-password rules) and answers with `weak_password`; this is only the cheap local floor.
export function passwordProblem(value) {
  const password = String(value ?? "");
  if (!password) return "הזינו סיסמה.";
  if (password.length < PASSWORD_MIN_LENGTH) return `הסיסמה קצרה מדי — לפחות ${PASSWORD_MIN_LENGTH} תווים.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `הסיסמה ארוכה מדי — עד ${PASSWORD_MAX_LENGTH} תווים.`;
  return "";
}

// Live stage text for the operation indicator (Operation Visibility Law): the real step the system is in, never an invented percentage.
export const STAGE_TEXT = Object.freeze({
  signin: "מתחברים לחשבון",
  signup: "פותחים את החשבון ושולחים קוד אימות",
  confirm: "מאמתים את הקוד",
  resend: "מבקשים קוד חדש",
  reset: "מבקשים קוד לאיפוס הסיסמה",
  "reset-code": "מאמתים את הקוד",
  "reset-new": "שומרים את הסיסמה החדשה",
  signout: "יוצאים מהחשבון",
});

const SEND_ACTIONS = new Set(["signup", "resend", "reset"]);
export const isSendAction = action => SEND_ACTIONS.has(action);

const WEAK_REASON_TEXT = Object.freeze({
  pwned: "הסיסמה הזאת מופיעה ברשימות סיסמאות שדלפו. בחרו סיסמה אחרת.",
  length: `הסיסמה קצרה מדי — לפחות ${PASSWORD_MIN_LENGTH} תווים.`,
  characters: "הסיסמה חייבת לשלב אותיות ומספרים.",
});

// Maps an error thrown by the Auth client to { kind, message, next? }.
//   kind  — a stable label for tests and for the caller's decisions
//   next  — a step the caller should move to (only when it is safe and truthful)
// `action` is one of: signin | signup | confirm | resend | reset | reset-code | reset-new.
export function describeAuthFailure(error, action) {
  const status = Number(error?.status) || 0;
  const code = String(error?.code || "");
  const name = String(error?.name || "");
  const text = String(error?.message || "");
  const sending = isSendAction(action);

  if (name === "AuthWeakPasswordError" || code === "weak_password") {
    const reasons = Array.isArray(error?.reasons) ? error.reasons : [];
    const known = reasons.map(reason => WEAK_REASON_TEXT[reason]).filter(Boolean);
    return { kind: "weak_password", message: known.length ? known.join(" ") : "הסיסמה חלשה מדי. בחרו סיסמה ארוכה וייחודית יותר." };
  }
  if (/public_reading_auth_denied|public_reading_operation_denied/.test(text)) {
    return { kind: "denied", message: "הפעולה הזאת אינה זמינה כרגע בגרסה הזאת של האתר." };
  }
  if (status === 429 || /rate_limit/.test(code)) {
    return { kind: "rate_limited", message: sending
      ? "ביקשנו לשלוח קוד לפני רגע, ולכן אי אפשר לשלוח עוד אחד עכשיו. אם כבר קיבלתם קוד, הזינו אותו. אחרת נסו שוב בעוד דקה."
      : "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." };
  }
  // Server, gateway and network failures. The SDK reports every 5xx as a retryable fetch error with status 0 or 5xx. Never a success.
  if (status >= 500 || status === 0 || name === "AuthRetryableFetchError") {
    return { kind: "unavailable", message: sending
      ? "לא הצלחנו לשלוח את הקוד למייל. נסו שוב בעוד רגע. אם בכל זאת קיבלתם קוד, אפשר להזין אותו."
      : action === "signin" ? "לא הצלחנו להתחבר לשירות הכניסה. נסו שוב בעוד רגע."
        : "לא הצלחנו להשלים את הפעולה בגלל תקלה זמנית. נסו שוב בעוד רגע." };
  }
  if (code === "email_not_confirmed" || /email not confirmed/i.test(text)) {
    // GoTrue reports this only after the password matched, so naming it discloses nothing to a stranger.
    return { kind: "unconfirmed", next: "confirm", message: "הכתובת עדיין לא אומתה. הזינו את קוד האימות מהמייל, או בקשו קוד חדש." };
  }
  // Verifying a typed code: whatever 4xx the server answers with, the person's next move is the same, so the message is decided by the step.
  if (code === "otp_expired" || ((action === "confirm" || action === "reset-code") && status >= 400 && status < 500 && status !== 401)) {
    return { kind: "code", message: "הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש." };
  }
  if (action === "signin" && (code === "invalid_credentials" || status === 400)) {
    return { kind: "invalid_credentials", message: "המייל או הסיסמה אינם נכונים. אם עוד לא קבעתם סיסמה, אפשר לקבוע אותה דרך \"שכחתי סיסמה\"." };
  }
  if (code === "same_password") {
    return { kind: "same_password", message: "הסיסמה החדשה זהה לקודמת. בחרו סיסמה אחרת." };
  }
  if (name === "AuthSessionMissingError" || code === "session_not_found" || code === "bad_jwt" || code === "no_authorization" || status === 401) {
    return { kind: "session", next: "reset", message: "פג תוקף האימות. התחילו מחדש וקבלו קוד חדש." };
  }
  if (code === "signup_disabled") {
    return { kind: "signup_disabled", message: "פתיחת חשבון חדש אינה זמינה כרגע." };
  }
  if (code === "email_address_invalid" || code === "validation_failed") {
    return { kind: "email_invalid", message: "כתובת המייל אינה תקינה." };
  }
  if (code === "user_already_exists" || code === "email_exists") {
    return { kind: "exists", message: "אם כבר נרשמתם בעבר, היכנסו עם הסיסמה או אפסו אותה דרך \"שכחתי סיסמה\"." };
  }
  return { kind: "unknown", message: "משהו השתבש. נסו שוב בעוד רגע." };
}
