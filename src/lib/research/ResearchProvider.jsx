import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { emit, EVENTS } from "./eventBus.js";
import { findingToWorkspaceItem } from "./finding.js";
import { useAuth } from "../AuthContext.jsx";
import { getCloudResearch, saveCloudResearch } from "../auth.js";
import { trackResearch } from "../tracking.js";
import { signalAiBehavior } from "../supabase.js";

// 🧠 ResearchProvider — סביבת המחקר הגלובלית (Local-first). מחזיק את «המחקר הפעיל»
// (cart) ואת השמורים, שורד מעבר בין דפים, ונשמר ב-localStorage בלי התחברות.
// (סנכרון-ענן למחוברים — שלב מאוחר.) כל פעולה פולטת Event ל-Bus → הפאנלים מאזינים.
const KEY = "sod_research_v1";
// 🔬 גלגול «מצב מחקר למבקרים חוזרים» (החלטת צוריאל 7.2026) —
// רק מי שכבר ביקר (יש לו קאש שמור) עובר למצב מחקר פעם אחת. **מבקר חדש נשאר על הנקי (reader).**
// דגל חד-פעמי; אחרי הגלגול — בחירה מפורשת של המשתמש נשמרת ולא נדרסת שוב.
const MODE_ROLLOUT_KEY = "sod_mode_rollout_v1";
const Ctx = createContext(null);
export const useResearch = () => useContext(Ctx) || {};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

// מצב-הפתיחה: גלגול חד-פעמי → discovery רק לחוזרים; מבקר חדש וכל השאר → reader אלא אם נשמר discovery.
function initialMode(init) {
  try {
    if (localStorage.getItem(MODE_ROLLOUT_KEY) !== "1") {
      const returning = localStorage.getItem(KEY) != null;   // כבר ביקר בעבר = יש קאש שמור
      localStorage.setItem(MODE_ROLLOUT_KEY, "1");
      if (returning) return "discovery";   // רק מבקר חוזר עובר למצב מחקר פעם אחת (מבקר חדש נופל ל-reader)
    }
  } catch { /* noop */ }
  return init.mode === "discovery" ? "discovery" : "reader";
}

export default function ResearchProvider({ children }) {
  const init = load();
  const [cart, setCart] = useState(() => init.cart || []);     // המחקר הפעיל
  const [saved, setSaved] = useState(() => init.saved || []);  // שמורים (מקומי)
  const [pinned, setPinned] = useState(() => init.pinned || []); // 📌 מוצמדים — נשארים זמינים בכל Hub
  const [history, setHistory] = useState(() => init.history || []); // 🕘 היסטוריית מחקר (אחרונים)
  const [collections, setCollections] = useState(() => init.collections || []); // 📁 אוספים
  const [journeys, setJourneys] = useState(() => init.journeys || []); // 🧭 «המסעות שלי» — מסעות שהושלמו
  // 🔬 מצב עבודה גלובלי — reader (ברירת מחדל, מעטפת ציבורית נקייה) | discovery (היכל הגילוי, הכל פתוח).
  // גלגול 7.2026: רק מבקר חוזר עובר למצב מחקר פעם אחת דרך initialMode; מבקר חדש נשאר על הנקי. נשמר מקומית.
  const [mode, setModeState] = useState(() => initialMode(init));

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ cart, saved, pinned, history, collections, journeys, mode })); } catch { /* noop */ }
  }, [cart, saved, pinned, history, collections, journeys, mode]);

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
      const has = d && ((d.cart && d.cart.length) || (d.saved && d.saved.length) || (d.pinned && d.pinned.length) || (d.history && d.history.length) || (d.collections && d.collections.length) || (d.journeys && d.journeys.length));
      if (has) {
        if (Array.isArray(d.cart)) setCart(d.cart);
        if (Array.isArray(d.saved)) setSaved(d.saved);
        if (Array.isArray(d.pinned)) setPinned(d.pinned);
        if (Array.isArray(d.history)) setHistory(d.history);
        if (Array.isArray(d.collections)) setCollections(d.collections);
        if (Array.isArray(d.journeys)) setJourneys(d.journeys);
      } else {
        saveCloudResearch(user.id, { cart, saved, pinned, history, collections, journeys }).catch(() => {});
      }
      pulled.current = true;
    }).catch(() => { pulled.current = true; });
    return () => { alive = false; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  // שינוי מצב + מחובר + אחרי המשיכה → דחיפה לענן (debounce)
  useEffect(() => {
    if (!user || !pulled.current) return;
    const t = setTimeout(() => { saveCloudResearch(user.id, { cart, saved, pinned, history, collections, journeys }).catch(() => {}); }, 700);
    return () => clearTimeout(t);
  }, [user, cart, saved, pinned, history, collections, journeys]);

  // 🕘 לוג-היסטוריה — «המשך מהמקום שעצרת». הכי-חדש למעלה, ללא כפילויות, מוגבל ל-50.
  const logHistory = useCallback((entity) => {
    if (!entity || !entity.id) return;
    setHistory(h => [{ ...entity, t: Date.now() }, ...h.filter(e => e.id !== entity.id)].slice(0, 50));
  }, []);
  const clearHistory = useCallback(() => setHistory([]), []);

  // 🔠 ELS → Workspace bridge. ה-iframe הקנוני כבר פולט postMessage מסוג state דרך TzofenEmbed;
  // ResearchProvider רק רושם את החיפוש המוצלח בהיסטוריית-המחקר — בלי לחשב ELS, בלי ליצור Finding,
  // בלי לקדם לקנון ובלי טבלה/Store מקבילים. כך «המשך מהמקום שעצרת» עובד גם בדילוגים.
  // dedupe לפי תמונת-החיפוש עצמה, כדי state-ticks של אותו צופן לא יציפו את ההיסטוריה.
  const lastElsHistorySig = useRef(null);
  useEffect(() => {
    const onElsState = (e) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (!d || d.source !== "tzofen" || d.type !== "state" || d.status !== "ok") return;
      const term = String(d?.axis?.term || d?.axis?.t || d?.term || d?.query || d?.raw || "").trim();
      if (!term) return;
      const scope = d?.provenance?.scope || d?.scope || "torah";
      const skip = Number(d?.axis?.skip || 0);
      const hitId = d?.axis?.hitId ?? d?.occurrence?.index ?? 0;
      const searchKind = d?.provenance?.searchKind || d?.kind || "regular";
      const sig = `${scope}|${term}|${searchKind}|${hitId}|${skip}`;
      if (lastElsHistorySig.current === sig) return;
      lastElsHistorySig.current = sig;
      logHistory({
        id: `els:${encodeURIComponent(scope)}:${encodeURIComponent(term)}:${encodeURIComponent(searchKind)}:${hitId}:${skip}`,
        type: "els",
        title: `ELS · ${term}`,
        label: term,
        term,
        scope,
        skip,
        searchKind,
        href: `/lab/els?q=${encodeURIComponent(term)}`,
        metadata: {
          engine: "tzofen",
          corpus: scope,
          hitId,
          skip,
          searchKind,
          findingCount: Array.isArray(d.findings) ? d.findings.length : 0,
          matrixVersion: d?.matrix?.v || null,
        },
      });
    };
    window.addEventListener("message", onElsState);
    return () => window.removeEventListener("message", onElsState);
  }, [logHistory]);

  const addToResearch = useCallback((entity) => {
    if (!entity?.id) return;
    setCart(c => (c.some(e => e.id === entity.id) ? c : [...c, entity]));
    logHistory(entity);
    emit(EVENTS.RESEARCH_ADD, entity);
    trackResearch("add", { type: entity.type });
    signalAiBehavior("research");   // 🧪 ai_style_learning_law — "האם המשכת לחקור?" אחרי ניתוח טרי
  }, [logHistory]);
  const removeFromResearch = useCallback((id) => setCart(c => c.filter(e => e.id !== id)), []);
  const clearResearch = useCallback(() => { setCart([]); emit(EVENTS.RESEARCH_CLEAR); }, []);

  const saveItem = useCallback((entity) => {
    if (!entity?.id) return;
    setSaved(s => (s.some(e => e.id === entity.id) ? s : [entity, ...s]));
    logHistory(entity);
    emit(EVENTS.ITEM_SAVE, entity);
    trackResearch("save", { type: entity.type });
  }, [logHistory]);
  const removeSaved = useCallback((id) => setSaved(s => s.filter(e => e.id !== id)), []);

  // 📌 Pin — ישות שהוצמדה נשארת זמינה בכל המעבדה (Workspace = pin + הוסף-למחקר).
  const togglePin = useCallback((entity) => {
    if (!entity?.id) return;
    setPinned(p => {
      const on = p.some(e => e.id === entity.id);
      const next = on ? p.filter(e => e.id !== entity.id) : [entity, ...p];
      emit(on ? EVENTS.PIN_REMOVE : EVENTS.PIN_ADD, entity);
      return next;
    });
  }, []);
  const isPinned = useCallback((id) => pinned.some(e => e.id === id), [pinned]);

  // 🔬 Universal Finding projection bridge — membership only.
  // The full source-native envelope is preserved under metadata.finding by findingToWorkspaceItem.
  // These actions never create research_objects and never promote Canonical/Published state.
  const addFinding = useCallback((finding, options) => {
    const item = findingToWorkspaceItem(finding, options);
    if (!item) return null;
    addToResearch(item);
    return item;
  }, [addToResearch]);
  const saveFinding = useCallback((finding, options) => {
    const item = findingToWorkspaceItem(finding, options);
    if (!item) return null;
    saveItem(item);
    return item;
  }, [saveItem]);
  const toggleFindingPin = useCallback((finding, options) => {
    const item = findingToWorkspaceItem(finding, options);
    if (!item) return null;
    togglePin(item);
    return item;
  }, [togglePin]);

  // 📁 אוספי-מחקר פרטיים — קיבוץ שמורים לתיקיות בעלות-שם, עם תיוג-ארגון אופציונלי
  // (topic/world/number/year — research_workspace_law). תוכן-אישי: Lens/Ownership layer
  // בלבד, Local-first + סנכרון-ענן ל-user_research (בלוב, per-user) — לא Canonical, לא Public.
  const addCollection = useCallback((name, meta) => {
    const id = "c" + Date.now();
    const { topic, world, number, year } = meta || {};
    setCollections(cs => [...cs, {
      id, name: (name || "אוסף").trim(),
      topic: topic || null, world: world || null,
      number: (number || number === 0) ? Number(number) : null,
      year: (year || year === 0) ? Number(year) : null,
    }]);
    return id;
  }, []);
  const updateCollection = useCallback((id, patch) => {
    setCollections(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, []);
  const removeCollection = useCallback((id) => {
    setCollections(cs => cs.filter(c => c.id !== id));
    setSaved(s => s.map(e => (e.id === id ? { ...e, coll: undefined } : e)));
  }, []);
  const assignCollection = useCallback((itemId, collId) => {
    setSaved(s => s.map(e => (e.id === itemId ? { ...e, coll: collId || undefined } : e)));
  }, []);

  // 🧭 «המסעות שלי» — רושם מסע שהושלם. dedupe לפי מספר-השורש (המסע האחרון מנצח), הכי-חדש למעלה, עד 30.
  const addJourney = useCallback((j) => {
    if (!j || j.root == null) return;
    const rec = { id: "j" + j.root, root: j.root, path: j.path || [], world: j.world || null, msg: j.msg || null, t: Date.now() };
    setJourneys(js => [rec, ...js.filter(x => x.root !== j.root)].slice(0, 30));
    trackResearch("journey", { root: j.root });
  }, []);
  const removeJourney = useCallback((id) => setJourneys(js => js.filter(j => j.id !== id)), []);
  const clearJourneys = useCallback(() => setJourneys([]), []);

  // 🔬 מצב עבודה — setMode/enterDiscovery/toggleMode. enterDiscovery = "נכנסת להיכל הגילוי" (מהמעבדה).
  const setMode = useCallback((m) => setModeState(m === "discovery" ? "discovery" : "reader"), []);
  const enterDiscovery = useCallback(() => setModeState("discovery"), []);
  const toggleMode = useCallback(() => setModeState(m => (m === "discovery" ? "reader" : "discovery")), []);

  const value = {
    cart, saved, pinned, history, collections, journeys,
    addToResearch, removeFromResearch, clearResearch, saveItem, removeSaved, togglePin, isPinned,
    addFinding, saveFinding, toggleFindingPin,
    logHistory, clearHistory, addCollection, updateCollection, removeCollection, assignCollection,
    addJourney, removeJourney, clearJourneys,
    mode, setMode, enterDiscovery, toggleMode,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
