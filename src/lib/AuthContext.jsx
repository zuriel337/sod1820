import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, logActivity } from './supabase.js';
import { fetchProfile, signOut as doSignOut } from './auth.js';

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
    try { setProfile(await fetchProfile(u.id)); } catch { setProfile(null); }
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
