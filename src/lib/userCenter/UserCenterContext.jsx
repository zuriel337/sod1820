import React, { createContext, useContext, useState, useCallback } from "react";

// 🏛️ מרכז השליטה האישי — מצב פתיחה גלובלי (מגירה אחת, עץ אחד).
// הטריגר (צ'יפ-המשתמש) קורא open(); ה-<UserCenter/> הגלובלי מאזין. active = מודול פעיל (או null = הבית).
const Ctx = createContext({ isOpen: false, active: null, open: () => {}, close: () => {}, setActive: () => {} });

export function UserCenterProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(null);
  const open = useCallback((id = null) => { setActive(id); setIsOpen(true); }, []);
  const close = useCallback(() => setIsOpen(false), []);
  return <Ctx.Provider value={{ isOpen, active, open, close, setActive }}>{children}</Ctx.Provider>;
}

export const useUserCenter = () => useContext(Ctx);
