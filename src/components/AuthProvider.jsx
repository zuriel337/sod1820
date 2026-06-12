import React, { createContext, useContext, useEffect, useState } from "react";
import { getSession, onAuthChange } from "../lib/auth.js";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getSession()
      .then(s => { if (alive) { setUser(s?.user ?? null); setLoading(false); } })
      .catch(() => alive && setLoading(false));
    const unsub = onAuthChange(u => alive && setUser(u));
    return () => { alive = false; unsub?.(); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, verified: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
