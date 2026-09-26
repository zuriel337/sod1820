// Canonical client contract for Supabase Email OTP entry.
// Supabase auth.email.otp_length supports 6..10 digits; the client must not hard-code 6.
export const EMAIL_OTP_MIN_LENGTH = 6;
export const EMAIL_OTP_MAX_LENGTH = 10;

export function sanitizeEmailOtp(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, EMAIL_OTP_MAX_LENGTH);
}

export function isValidEmailOtp(value) {
  return new RegExp(`^\\d{${EMAIL_OTP_MIN_LENGTH},${EMAIL_OTP_MAX_LENGTH}}$`).test(String(value ?? "").trim());
}
