import { supabase } from './supabase.js';

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';
const PROFILE_COLS = 'id, username, display_name, avatar_url, tier, role, created_at';

// ── מערכת המשתמשים (Google + Magic Link + פרופילים) ──
export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: SITE_URL + '/' },
  });
}

export function signInWithMagicLink(email) {
  return supabase.auth.signInWithOtp({
    email: (email || '').trim(),
    options: { emailRedirectTo: SITE_URL + '/' },
  });
}

export async function fetchProfile(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('users').select(PROFILE_COLS).eq('id', userId).maybeSingle();
  return data || null;
}

export async function updateProfile(userId, fields) {
  if (!userId) throw new Error('no user');
  const allowed = {};
  for (const k of ['username', 'display_name', 'avatar_url']) {
    if (k in fields) allowed[k] = fields[k];
  }
  const { data, error } = await supabase
    .from('users').update(allowed).eq('id', userId).select(PROFILE_COLS).maybeSingle();
  if (error) throw error;
  return data;
}

// ── שער החידושים: אימות OTP במייל (בית המדרש) ──
export async function requestEmailOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
  return { ok: true };
}

export async function verifyEmailOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(), token: token.trim(), type: 'email',
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

export function signOut() {
  return supabase.auth.signOut();
}
