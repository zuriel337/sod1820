import { supabase } from './supabase.js';

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';
const PROFILE_COLS = 'id, username, display_name, avatar_url, tier, role, created_at, credits, xp, level';

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

// ── עולם-המשתמש בענן (עץ אחד) ──
// פריטים (cart/saved/pinned) = research_items (שורה-לפריט, מחובר-לגרף, קנוני).
// collections/journeys/history = user_research (בלוב מצב-משתמש). ה-interface נשאר זהה
// {cart,saved,pinned,history,collections,journeys} → ResearchProvider לא משתנה.
const RI_BUCKET = { cart: 'cart', saved: 'library', pinned: 'pinned' };

export async function getCloudResearch(userId) {
  if (!userId) return null;
  const [itemsRes, blobRes] = await Promise.all([
    supabase.from('research_items').select('bucket, entity_type, entity_ref, title, link, metadata').eq('user_id', userId),
    supabase.from('user_research').select('data').eq('user_id', userId).maybeSingle(),
  ]);
  const out = { cart: [], saved: [], pinned: [] };
  for (const r of itemsRes.data || []) {
    const key = r.bucket === 'library' ? 'saved' : r.bucket; // library→saved
    if (!out[key]) continue;
    // ⛑️ לא מפילים שורה בגלל metadata חסר — משחזרים ישות מינימלית מהעמודות (אחרת המחיקה-הסלקטיבית
    //    בשמירה הבאה היתה מוחקת אותה כ"לא-קיימת-מקומית").
    out[key].push(r.metadata || { type: r.entity_type, ref: r.entity_ref, id: r.entity_ref, title: r.title, link: r.link });
  }
  const b = blobRes.data?.data || {};
  return { ...out, history: b.history || [], collections: b.collections || [], journeys: b.journeys || [] };
}

export async function saveCloudResearch(userId, data) {
  if (!userId) return;
  const d = data || {};
  // 1) מצב לא-פריטים → בלוב (user_research)
  await supabase.from('user_research').upsert(
    { user_id: userId, data: { history: d.history || [], collections: d.collections || [], journeys: d.journeys || [] }, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  // 2) פריטים → research_items — **לא-הרסני** (תיקון באג-ניגוב-שמורים):
  //    היה delete-all-then-insert מונע מהמצב המקומי; מצב-ריק (מרוץ-הידרציה/דסינק) ניגב את הענן,
  //    וה-insert העטוף ב-catch בלע כשלים. עכשיו: upsert (לא הורס) + מחיקה סלקטיבית של פריטים שהוסרו בפועל.
  const rows = [];
  const seen = new Set();
  for (const [srcKey, bucket] of Object.entries(RI_BUCKET)) {
    for (const e of (d[srcKey] || [])) {
      if (!e || !e.type) continue;
      const ref = String(e.ref ?? e.id ?? e.title ?? '');
      const k = `${bucket}|${e.type}|${ref}`;
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push({ user_id: userId, bucket, entity_type: e.type, entity_ref: ref, title: e.title ?? null, link: e.link ?? null, metadata: e });
    }
  }
  // 🛡️ הגנת-נתונים: מצב מקומי ריק לעולם לא מנגב את הענן. מחיקה מתרחשת רק כשיש פריטים,
  //    וגם אז רק על מה שהוסר בפועל (reconcile), לא מחיקה-גורפת.
  if (!rows.length) return;
  await supabase.from('research_items').upsert(rows, { onConflict: 'user_id,bucket,entity_type,entity_ref' });
  const keep = new Set(rows.map(r => `${r.bucket}|${r.entity_type}|${r.entity_ref}`));
  const { data: existing } = await supabase.from('research_items')
    .select('id, bucket, entity_type, entity_ref').eq('user_id', userId).in('bucket', Object.values(RI_BUCKET));
  const stale = (existing || []).filter(r => !keep.has(`${r.bucket}|${r.entity_type}|${r.entity_ref}`)).map(r => r.id);
  if (stale.length) await supabase.from('research_items').delete().in('id', stale);
}
