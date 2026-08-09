import React, { createContext, useContext, useState, useCallback } from "react";

// 🏛️ מרכז השליטה האישי — מצב פתיחה גלובלי (מגירה אחת, עץ אחד).
// הטריגר (צ'יפ-המשתמש) קורא open(); ה-<UserCenter/> הגלובלי מאזין. active = מודול פעיל (או null = הבית).
const Ctx = createContext({ isOpen: false, active: null, activeParam: null, open: () => {}, close: () => {}, setActive: () => {} });

export function UserCenterProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActiveState] = useState(null);
  // 🔗 activeParam — פרמטר-עומק אופציונלי למודול הפעיל (למשל {dm:<uid>} לפתיחת שיחה ספציפית).
  const [activeParam, setActiveParam] = useState(null);
  const open = useCallback((id = null, param = null) => { setActiveState(id); setActiveParam(param); setIsOpen(true); }, []);
  const setActive = useCallback((id = null, param = null) => { setActiveState(id); setActiveParam(param); }, []);
  const close = useCallback(() => setIsOpen(false), []);
  return <Ctx.Provider value={{ isOpen, active, activeParam, open, close, setActive }}>{children}</Ctx.Provider>;
}

export const useUserCenter = () => useContext(Ctx);
