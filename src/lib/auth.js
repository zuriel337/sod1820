import { supabase } from './supabase.js';
import { signupAttribution, visitorId } from './acquisition.js';

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';
// 🌱 עץ אחד: כלכלה (credits/xp/level) נקראת מ-profiles הקנונית (getMyProfile), לא מ-users.
// כאן רק שדות-זהות: users נשאר מקור-הזהות (username/display_name/avatar/role/tier-member).
const PROFILE_COLS = 'id, username, display_name, avatar_url, tier, role, created_at';

// ── מערכת המשתמשים (Google + Magic Link + פרופילים) ──
export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: SITE_URL + '/' },
  });
}

export function signInWithFacebook() {
  return supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: SITE_URL + '/', scopes: 'email public_profile' },
  });
}

// כניסה ישירה עם סיסמה (אדמין) — ללא מייל/הפניה, עובד בכל דומיין
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: (email || '').trim(), password: password || '',
  });
  if (error) throw error;
  return data;
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
  // WIRING: מצרפים את תצלום-הייחוס ל-user_metadata כדי ש-handle_new_user (טריגר auth signup)
  // יוכל לשמור אותו ב-subscribers.acquisition — זה המסלול הדומיננטי (שער-האימות), שאין לו
  // גישה ל-localStorage בצד-השרת. אם הלכידה נכשלת — ההרשמה ממשיכה כרגיל (data ריק).
  let data = {};
  try { data = { acquisition: signupAttribution(), visitor_id: visitorId() }; } catch { data = {}; }
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true, data },
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

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export function signOut() {
  return supabase.auth.signOut();
}

// 🎯 המרה (research funnel שלב 6): בעת התחברות, לתבוע את ליד-המחקר של המשתמש
// (לפי מייל או visitor_id) ולסמן converted. RPC security-definer. שקט בכשל.
export async function claimResearchLead(visitorId) {
  try { await supabase.rpc('claim_research_lead', { p_visitor: visitorId || null }); } catch { /* noop */ }
}

// ── פנקס-מחקר בענן (user_notes) — סנכרון בין מכשירים למשתמש מחובר ──
export async function getCloudNotes(userId) {
  if (!userId) return null;
  const { data } = await supabase.from('user_notes').select('content').eq('user_id', userId).maybeSingle();
  return data?.content ?? null;
}
export async function saveCloudNotes(userId, content) {
  if (!userId) return;
  await supabase.from('user_notes').upsert(
    { user_id: userId, content: content || '', updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

// ── Research OS personal cloud state — G3 principal-bound sync ──
// The server derives the real actor from auth.uid(). p_expected_user_id is only a stale-request
// guard, so an A-request that races with a switch to B fails instead of mutating B's state.
// Item deletion is explicit-operation only; absence from a browser snapshot is never delete intent.
async function assertResearchPrincipal(userId) {
  const expected = String(userId || '').trim();
  if (!expected) throw new Error('research_principal_required');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const current = data?.session?.user?.id || null;
  if (!current || current !== expected) throw new Error('research_principal_mismatch');
  return current;
}

export async function getCloudResearch(userId) {
  const expected = await assertResearchPrincipal(userId);
  const { data, error } = await supabase.rpc('research_state_snapshot_v1', {
    p_expected_user_id: expected,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('research_snapshot_invalid');
  }
  return {
    cart: Array.isArray(data.cart) ? data.cart : [],
    saved: Array.isArray(data.saved) ? data.saved : [],
    pinned: Array.isArray(data.pinned) ? data.pinned : [],
    history: Array.isArray(data.history) ? data.history : [],
    collections: Array.isArray(data.collections) ? data.collections : [],
    journeys: Array.isArray(data.journeys) ? data.journeys : [],
    context: data.context ?? null,
  };
}

export async function applyCloudResearchOps(userId, ops) {
  const expected = await assertResearchPrincipal(userId);
  const batch = Array.isArray(ops) ? ops : [];
  if (!batch.length) return { ok: true, applied: 0 };
  if (batch.length > 100) throw new Error('research_ops_batch_too_large');
  const { data, error } = await supabase.rpc('research_state_apply_ops_v1', {
    p_expected_user_id: expected,
    p_ops: batch,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error('research_ops_apply_failed');
  return data;
}
