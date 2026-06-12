import { supabase } from './supabase.js';

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';

const PROFILE_COLS = 'id, username, display_name, avatar_url, tier, role, created_at';

// התחברות עם Google (OAuth) — דורש הגדרת ספק Google בלוח Supabase
export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: SITE_URL + '/' },
  });
}

// התחברות בקוד/קישור למייל (Magic Link) — עובד ללא הגדרות נוספות
export function signInWithMagicLink(email) {
  return supabase.auth.signInWithOtp({
    email: (email || '').trim(),
    options: { emailRedirectTo: SITE_URL + '/' },
  });
}

export function signOut() {
  return supabase.auth.signOut();
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
