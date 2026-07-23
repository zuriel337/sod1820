import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, logActivity, claimVisitorPrefs } from './supabase.js';
import { fetchProfile, signOut as doSignOut, claimResearchLead } from './auth.js';
import { getVisitorId } from './tracking.js';
import { stitchLogin } from './identity.js';

const AuthContext = createContext({
  user: null, profile: null, loading: true,
  isAdmin: false, isMember: false,
  signOut: () => {}, refreshProfile: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u) => {
    if (!u) { setProfile(null); return; }
    try {
      let p = await fetchProfile(u.id);
      // ירושת תמונה מחשבון חברתי (גוגל/פייסבוק) גם למשתמש קיים שמתחבר עכשיו:
      // הטריגר handle_new_user יורש רק בהרשמה ראשונה — כאן משלימים אם עדיין ריק.
      const social = u.user_metadata?.avatar_url || u.user_metadata?.picture;
      if (p && !p.avatar_url && social) {
        try {
          const { updateProfile } = await import('./auth.js');
          const updated = await updateProfile(u.id, { avatar_url: social });
          if (updated) p = updated;
        } catch { /* ignore */ }
      }
      setProfile(p);
    } catch { setProfile(null); }
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const u = data.session?.user ?? null;
      setUser(u);
      loadProfile(u).finally(() => { if (alive) setLoading(false); });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  // תיעוד "ביקור" יומי למשתמש מחובר (פעם ביום לכל דפדפן) — לזיהוי מבקר חוזר
  useEffect(() => {
    if (!user) return;
    const key = `ua_visit_${user.id}_${new Date().toISOString().slice(0, 10)}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* ignore storage errors */ }
    logActivity('visit', typeof window !== 'undefined' ? window.location.pathname : null);
  }, [user]);

  // תפר זהות: בעת התחברות, לקשר את העדפות ההתראות האנונימיות (visitor_id) לחשבון,
  // ולתבוע את ליד-המחקר (research funnel שלב 6 → converted).
  useEffect(() => {
    if (!user) return;
    // 🔗 גרף-הזהות הקנוני: לקשר את המכשיר (sod_id + כל sod_vid הישנים דרך legacy_seed)
    // לחשבון — יוצר קשר kind='login' → persons.account_user_id. בלי זה אף מבקר/שגריר
    // לא נפתר לשם/מייל (identity_edges היו רק device/legacy_seed, אפס login). idempotent.
    try { stitchLogin(user.id); } catch { /* ignore */ }
    try { claimVisitorPrefs(user.id, getVisitorId()); } catch { /* ignore */ }
    try { claimResearchLead(getVisitorId()); } catch { /* ignore */ }
    // 🔗 גשר לשידור-החי: לקשר את מזהה site_visits (sod_visitor UUID) לחשבון, כדי שמחוברים
    // יזוהו במסך החי עם המייל. (מזהה נפרד מ-getVisitorId — לכן קישור ייעודי.)
    try {
      const sv = localStorage.getItem('sod_visitor');
      if (sv) supabase.rpc('link_visitor_identity', { p_visitor: sv });
    } catch { /* ignore */ }
    // ◆ קרדיטים בהתחברות (idempotent) — מענק-מייסד ממתין + קרדיט-יומי. כך הם מוחלים
    // גם למי שלא פותח את האזור-האישי (במקום להסתמך רק על פתיחת-המגירה).
    try { supabase.rpc('claim_my_founding_grants'); } catch { /* ignore */ }
    try { supabase.rpc('claim_daily_credit'); } catch { /* ignore */ }
    try { supabase.rpc('claim_wa_activity_credits'); } catch { /* ignore */ }
    // 👥 הזמנת-חברים: אם המשתמש הגיע דרך קישור-הזמנה — רושמים (מזמין +100, הוא +50). פעם אחת.
    try {
      const ref = localStorage.getItem('sod_ref');
      if (ref && ref !== user.id) {
        supabase.rpc('record_referral', { p_ref: ref }).finally(() => { try { localStorage.removeItem('sod_ref'); } catch { /* noop */ } });
      } else if (ref) { try { localStorage.removeItem('sod_ref'); } catch { /* noop */ } }
    } catch { /* ignore */ }
  }, [user]);

  const value = {
    user, profile, loading,
    verified: !!user,
    isAdmin: profile?.role === 'admin',
    isMember: profile?.tier === 'member',
    signOut: async () => { await doSignOut(); setUser(null); setProfile(null); },
    refreshProfile: () => loadProfile(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
