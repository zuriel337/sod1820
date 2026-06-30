import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { emit, EVENTS } from "./eventBus.js";
import { useAuth } from "../AuthContext.jsx";
import { getCloudResearch, saveCloudResearch } from "../auth.js";

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
  const [pinned, setPinned] = useState(() => init.pinned || []); // 📌 מוצמדים — נשארים זמינים בכל Hub
  const [history, setHistory] = useState(() => init.history || []); // 🕘 היסטוריית מחקר (אחרונים)
  const [collections, setCollections] = useState(() => init.collections || []); // 📁 אוספים

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ cart, saved, pinned, history, collections })); } catch { /* noop */ }
  }, [cart, saved, pinned, history, collections]);

  // ☁️ סנכרון-ענן למשתמש מחובר — כל «עולם המשתמש» עובר בין מכשירים.
  const { user } = useAuth();
  const pulled = useRef(false);
  // התחברות → משיכת המצב מהענן (ענן מנצח אם יש בו תוכן; אחרת דוחפים את המקומי למעלה)
  useEffect(() => {
    pulled.current = false;
    if (!user) return;
    let alive = true;
    getCloudResearch(user.id).then(d => {
      if (!alive) return;
      const has = d && ((d.cart && d.cart.length) || (d.saved && d.saved.length) || (d.pinned && d.pinned.length) || (d.history && d.history.length) || (d.collections && d.collections.length));
      if (has) {
        if (Array.isArray(d.cart)) setCart(d.cart);
        if (Array.isArray(d.saved)) setSaved(d.saved);
        if (Array.isArray(d.pinned)) setPinned(d.pinned);
        if (Array.isArray(d.history)) setHistory(d.history);
        if (Array.isArray(d.collections)) setCollections(d.collections);
      } else {
        saveCloudResearch(user.id, { cart, saved, pinned, history, collections }).catch(() => {});
      }
      pulled.current = true;
    }).catch(() => { pulled.current = true; });
    return () => { alive = false; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  // שינוי מצב + מחובר + אחרי המשיכה → דחיפה לענן (debounce)
  useEffect(() => {
    if (!user || !pulled.current) return;
    const t = setTimeout(() => { saveCloudResearch(user.id, { cart, saved, pinned, history, collections }).catch(() => {}); }, 700);
    return () => clearTimeout(t);
  }, [user, cart, saved, pinned, history, collections]);

  // 🕘 לוג-היסטוריה — «המשך מהמקום שעצרת». הכי-חדש למעלה, ללא כפילויות, מוגבל ל-50.
  const logHistory = useCallback((entity) => {
    if (!entity || !entity.id) return;
    setHistory(h => [{ ...entity, t: Date.now() }, ...h.filter(e => e.id !== entity.id)].slice(0, 50));
  }, []);
  const clearHistory = useCallback(() => setHistory([]), []);

  const addToResearch = useCallback((entity) => {
    setCart(c => (c.some(e => e.id === entity.id) ? c : [...c, entity]));
    logHistory(entity);
    emit(EVENTS.RESEARCH_ADD, entity);
  }, [logHistory]);
  const removeFromResearch = useCallback((id) => setCart(c => c.filter(e => e.id !== id)), []);
  const clearResearch = useCallback(() => { setCart([]); emit(EVENTS.RESEARCH_CLEAR); }, []);

  const saveItem = useCallback((entity) => {
    setSaved(s => (s.some(e => e.id === entity.id) ? s : [entity, ...s]));
    logHistory(entity);
    emit(EVENTS.ITEM_SAVE, entity);
  }, [logHistory]);
  const removeSaved = useCallback((id) => setSaved(s => s.filter(e => e.id !== id)), []);

  // 📌 Pin — ישות שהוצמדה נשארת זמינה בכל המעבדה (Workspace = pin + הוסף-למחקר).
  const togglePin = useCallback((entity) => {
    setPinned(p => {
      const on = p.some(e => e.id === entity.id);
      const next = on ? p.filter(e => e.id !== entity.id) : [entity, ...p];
      emit(on ? EVENTS.PIN_REMOVE : EVENTS.PIN_ADD, entity);
      return next;
    });
  }, []);
  const isPinned = useCallback((id) => pinned.some(e => e.id === id), [pinned]);

  // 📁 אוספים — קיבוץ שמורים לתיקיות בעלות-שם.
  const addCollection = useCallback((name) => {
    const id = "c" + Date.now();
    setCollections(cs => [...cs, { id, name: (name || "אוסף").trim() }]);
    return id;
  }, []);
  const removeCollection = useCallback((id) => {
    setCollections(cs => cs.filter(c => c.id !== id));
    setSaved(s => s.map(e => (e.coll === id ? { ...e, coll: undefined } : e)));
  }, []);
  const assignCollection = useCallback((itemId, collId) => {
    setSaved(s => s.map(e => (e.id === itemId ? { ...e, coll: collId || undefined } : e)));
  }, []);

  const value = {
    cart, saved, pinned, history, collections,
    addToResearch, removeFromResearch, clearResearch, saveItem, removeSaved, togglePin, isPinned,
    logHistory, clearHistory, addCollection, removeCollection, assignCollection,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
