import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, logActivity } from './supabase.js';
import { fetchProfile, signOut as doSignOut, claimResearchLead } from './auth.js';
import { getVisitorId } from './tracking.js';
import { stitchLogin } from './identity.js';
import { PUBLIC_READING_RELEASE } from './publicReadingRelease2029.js';
import { verifyReadingSession } from './publicReadingAuthSession.js';

const AuthContext = createContext({
  user: null, profile: null, loading: true,
  isAdmin: false, isMember: false,
  signOut: () => {}, refreshProfile: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const preview = import.meta.env.VITE_INTEGRATED_PREVIEW === 'true';
  const passiveAccount = preview || PUBLIC_READING_RELEASE;
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const profileRequest = useRef(0);
  const currentUser = useRef(null);

  const loadProfile = useCallback(async (u) => {
    const request = ++profileRequest.current;
    if (!u) { setProfile(null); return; }
    try {
      let p = await fetchProfile(u.id);
      if (request !== profileRequest.current) return;
      // ירושת תמונה מחשבון חברתי (גוגל/פייסבוק) גם למשתמש קיים שמתחבר עכשיו:
      // הטריגר handle_new_user יורש רק בהרשמה ראשונה — כאן משלימים אם עדיין ריק.
      const social = u.user_metadata?.avatar_url || u.user_metadata?.picture;
      if (!passiveAccount && p && !p.avatar_url && social) {
        try {
          const { updateProfile } = await import('./auth.js');
          const updated = await updateProfile(u.id, { avatar_url: social });
          if (updated) p = updated;
        } catch { /* ignore */ }
      }
      if (request === profileRequest.current) setProfile(p?.id === u.id ? p : null);
    } catch { if (request === profileRequest.current) setProfile(null); }
  }, [passiveAccount]);

  useEffect(() => {
    let alive = true;
    let authRevision = 0;
    let sessionRequest = 0;
    const applySession = async (session) => {
      if (!alive) return;
      const request = ++sessionRequest;
      // Revoke roles while revalidating. A refresh of the already verified
      // principal keeps local navigation/context; an account switch does not.
      if (PUBLIC_READING_RELEASE) {
        setVerified(false);
        profileRequest.current++;
        const sameVerifiedPrincipal = !!session?.user?.id && currentUser.current?.id === session.user.id;
        setProfile(null);
        if (!sameVerifiedPrincipal) {
          currentUser.current = null;
          setUser(null); setLoading(true);
        }
      }
      const u = PUBLIC_READING_RELEASE ? await verifyReadingSession(session, supabase.auth) : session?.user ?? null;
      if (!alive || request !== sessionRequest) return;
      currentUser.current = u;
      setVerified(Boolean(u));
      setUser(u);
      loadProfile(u).finally(() => { if (alive && request === sessionRequest) setLoading(false); });
    };
    const initialRevision = authRevision;
    supabase.auth.getSession().then(({ data }) => {
      if (authRevision === initialRevision) applySession(data.session);
    }).catch(() => {
      if (alive && authRevision === initialRevision) applySession(null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      authRevision++;
      applySession(session);
    });
    return () => { alive = false; sessionRequest++; profileRequest.current++; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  // תיעוד "ביקור" יומי למשתמש מחובר (פעם ביום לכל דפדפן) — לזיהוי מבקר חוזר
  useEffect(() => {
    if (!user || passiveAccount) return;
    const key = `ua_visit_${user.id}_${new Date().toISOString().slice(0, 10)}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* ignore storage errors */ }
    logActivity('visit', typeof window !== 'undefined' ? window.location.pathname : null);
  }, [user, passiveAccount]);

  // תפר זהות: בעת התחברות, לקשר את העדפות ההתראות האנונימיות (visitor_id) לחשבון,
  // ולתבוע את ליד-המחקר (research funnel שלב 6 → converted).
  useEffect(() => {
    if (!user || passiveAccount) return;
    // 🔗 גרף-הזהות הקנוני: לקשר את המכשיר (sod_id + כל sod_vid הישנים דרך legacy_seed)
    // לחשבון — יוצר קשר kind='login' → persons.account_user_id. בלי זה אף מבקר/שגריר
    // לא נפתר לשם/מייל (identity_edges היו רק device/legacy_seed, אפס login). idempotent.
    try { stitchLogin(user.id); } catch { /* ignore */ }
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
  }, [user, passiveAccount]);

  // An old account's delayed profile must never lend its name or role to a new one.
  const currentProfile = user?.id && profile?.id === user.id ? profile : null;
  const value = {
    user, profile: currentProfile, loading,
    verified: !!user && (!PUBLIC_READING_RELEASE || verified),
    isAdmin: currentProfile?.role === 'admin',
    isMember: currentProfile?.tier === 'member',
    signOut: async (options) => {
      const { error } = await doSignOut(options || (passiveAccount ? { scope: 'local' } : undefined));
      if (error) throw error;
      // The existing auth event owns session state, including concurrent sign-ins.
    },
    refreshProfile: () => loadProfile(currentUser.current),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
