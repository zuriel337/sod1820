import supabase from "./supabase.js";

/**
 * אימות אמיתי דרך Supabase Auth — קוד חד-פעמי (OTP) במייל.
 * "משתמש מאומת" = משתמש שאימת את המייל שלו והשיג session.
 *
 * הערת הגדרה (Supabase Dashboard → Authentication):
 *  - Email provider מופעל (ברירת מחדל).
 *  - כדי שהמייל יכיל קוד 6 ספרות: בתבנית "Magic Link" להוסיף {{ .Token }}.
 *  - לפרודקשן: להגדיר SMTP מותאם (המייל המובנה של Supabase מוגבל בקצב).
 */

// שולח קוד אימות למייל (ויוצר משתמש אם לא קיים)
export async function requestEmailOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
  return { ok: true };
}

// מאמת את הקוד שהמשתמש הזין מול המייל
export async function verifyEmailOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });
  if (error) throw error;
  return data;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data?.subscription?.unsubscribe?.();
}

export async function signOut() {
  await supabase.auth.signOut();
}
