import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { emit, EVENTS } from "./eventBus.js";

// 🧠 ResearchProvider — סביבת המחקר הגלובלית (Local-first). מחזיק את «המחקר הפעיל»
// (cart) ואת השמורים, שורד מעבר בין דפים, ונשמר ב-localStorage בלי התחברות.
// (סנכרון-ענן למחוברים — שלב מאוחר.) כל פעולה פולטת Event ל-Bus → הפאנלים מאזינים.
const KEY = "sod_research_v1";
const Ctx = createContext(null);
export const useResearch = () => useContext(Ctx) || {};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export default function ResearchProvider({ children }) {
  const init = load();
  const [cart, setCart] = useState(() => init.cart || []);     // המחקר הפעיל
  const [saved, setSaved] = useState(() => init.saved || []);  // שמורים (מקומי)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ cart, saved })); } catch { /* noop */ }
  }, [cart, saved]);

  const addToResearch = useCallback((entity) => {
    setCart(c => (c.some(e => e.id === entity.id) ? c : [...c, entity]));
    emit(EVENTS.RESEARCH_ADD, entity);
  }, []);
  const removeFromResearch = useCallback((id) => setCart(c => c.filter(e => e.id !== id)), []);
  const clearResearch = useCallback(() => { setCart([]); emit(EVENTS.RESEARCH_CLEAR); }, []);

  const saveItem = useCallback((entity) => {
    setSaved(s => (s.some(e => e.id === entity.id) ? s : [entity, ...s]));
    emit(EVENTS.ITEM_SAVE, entity);
  }, []);
  const removeSaved = useCallback((id) => setSaved(s => s.filter(e => e.id !== id)), []);

  const value = { cart, saved, addToResearch, removeFromResearch, clearResearch, saveItem, removeSaved };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
