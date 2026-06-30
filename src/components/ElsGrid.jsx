import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { elsNormalize, elsSearch, elsClusters, buildSkipSet, TANAKH_BOOKS } from "../features/els/Els.jsx";
import { computeEntity } from "../lib/research/coreEngine.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { getTorahNiqqud } from "../lib/research/torah.js";
import { emit, on, EVENTS } from "../lib/research/eventBus.js";
import { LOGO_URL } from "../theme.js";

// המרת צבע hex לשקיפות — ל«צבע שמתחלש ככל שמתרחקים» (חיפוש משני)
const hexA = (hex, a) => {
  const n = hex.replace("#", ""); const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// ℹ️ הסבר-מנוע מתקפל — מוצב במקומות מתאימים כדי שכל אחד יבין מה קורה
const Help = ({ children, label = "ℹ️ מה זה? / איך זה עובד" }) => (
  <details className="els-help"><summary>{label}</summary><div className="els-help-b">{children}</div></details>
);

// רקעי-מטריצה לבחירה (החלפת צבע לרקע האותיות). הצבע המודגש נשאר תמיד.
const CELL_BGS = [
  { bg: "var(--bg)", fg: "var(--ink2)", label: "רגיל" },
  { bg: "#fffdf6", fg: "#3a2f12", label: "קרם" },
  { bg: "#ffffff", fg: "#1b1d22", label: "לבן" },
  { bg: "#10131a", fg: "#e8dcc0", label: "כהה" },
  { bg: "#0a0700", fg: "#E8C84A", label: "מגילה" },
  { bg: "#eef4ff", fg: "#243b6b", label: "תכלת" },
];

// 🔡 מסך הדילוגים — בהיר, מתאים לסביבה. רוכב על מנוע ה-ELS הקיים (לא מחשב מחדש).
// מונח אחד → עמודה אנכית · כמה מונחים → קרבה במטריצה אחת · «כולל קרובים» → סבילות-שגיאה.
// רשימת-תוצאות עם מיקום (ספר+אות) + לחיצה ממקדת · מסך-מלא. יושר: מציאה=עובדה, משמעות=חקירה.
const TERM_COLORS = ["#b07d12", "#a01f2e", "#6b3fa0", "#1f7a4d", "#c5631a"];
// ✦ משפטים מתחלפים בזמן החיפוש — מתחת ללוגו המהבהב
const ELS_PHRASES = [
  "מצרף את אותיות התורה…", "סורק את הצופן הנסתר…", "כל אות במקומה — רגע…",
  "מודד מרחקים בין המילים…", "1820 — הכל מחובר…", "התורה מדברת במספרים…",
  "מחפש את הרמז שמסתתר…", "פותח את שערי הצופן…",
];
// 🎨 לוח-צבעים לבחירת המשתמש — צובעים כל מונח/דילוג בצבע משלו על המטריצה.
const PAINT = ["#e02424", "#E8C84A", "#2f6df6", "#2f9e44", "#7048e8", "#e8590c", "#d6336c", "#0c8599", "#f08c00", "#343a40"];
const PATTERNS = [["range", "טווח רציף"], ["fib", "פיבונאצ׳י"], ["prime", "ראשוניים"], ["pow2", "חזקות 2"]];
const DIRS = [["both", "↔ שני הכיוונים"], ["fwd", "→ קדימה"], ["back", "← אחורה"]];

export default function ElsGrid({ seed }) {
  const { isAdmin } = useAuth();
  // ⚡ ביצועים: התורה (304,805 · 600KB) נטענת תמיד ומהר. התנ״ך המלא (1.2M · 2.4MB)
  // נטען בעצלתיים — *רק* כשבוחרים היקף שמעבר לתורה (נביאים/כתובים/כל-התנ״ך).
  const [torahLetters, setTorahLetters] = useState("");
  const [tanakhLetters, setTanakhLetters] = useState("");
  const [tanakhBusy, setTanakhBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [zoom, setZoom] = useState(1);       // זום למטריצה
  const [cellBgIdx, setCellBgIdx] = useState(0); // רקע האותיות
  const [aiStruct, setAiStruct] = useState(null); // ניתוח-מבנה AI (אדמין)
  const [niqqud, setNiqqud] = useState(false);   // ניקוד אופציונלי
  const [nqData, setNqData] = useState(null);    // שכבת-הניקוד (נטענת בעצלתיים)
  const [nqBusy, setNqBusy] = useState(false);
  const toggleNiqqud = async () => {
    if (!niqqud && !nqData) { setNqBusy(true); const d = await getTorahNiqqud(); setNqData(d); setNqBusy(false); if (!d) return; }
    setNiqqud(v => !v);
  };
  const [raw, setRaw] = useState(seed || "ישראל");
  const [book, setBook] = useState("torah"); // ברירת-מחדל: תורה (מהיר). תנ״ך = בחירה מפורשת.
  const [skipMax, setSkipMax] = useState(2000);
  const [pattern, setPattern] = useState("range");
  const [dir, setDir] = useState("both");
  const [fuzzy, setFuzzy] = useState(false);
  const [hitIdx, setHitIdx] = useState(0);
  const [clusterIdx, setClusterIdx] = useState(0);
  const [full, setFull] = useState(false);
  const [subRaw, setSubRaw] = useState("");   // קלט להוספת שכבה
  const [overlays, setOverlays] = useState([]); // 🔢 שכבות-חיפוש: מערך מונחים (מנורמלים) על אותה מטריצה
  const [layersOpen, setLayersOpen] = useState(false); // פאנל-השכבות מכווץ כברירת-מחדל; נפתח לחיפוש-משולב
  // 📌 הממצאים שלי — טבלה אישית: מוסיפים/מוחקים ידנית ממצאים (אותיות/ביטויים), נשמר ב-localStorage
  const [findings, setFindings] = useState(() => { try { return JSON.parse(localStorage.getItem("els_findings") || "[]"); } catch { return []; } });
  const [findRaw, setFindRaw] = useState("");
  const persistFindings = arr => { setFindings(arr); try { localStorage.setItem("els_findings", JSON.stringify(arr)); } catch { /**/ } };
  const addFinding = (txt) => { const t = (txt ?? findRaw).trim(); if (t && !findings.includes(t)) { persistFindings([t, ...findings].slice(0, 60)); setFindRaw(""); } };
  const removeFinding = t => persistFindings(findings.filter(x => x !== t));
  const [paint, setPaint] = useState({});     // 🎨 צבע-לפי-מונח (term → hex); ריק = ברירת-מחדל
  const [paintOpen, setPaintOpen] = useState(null); // איזה מונח פתוח-לבחירת-צבע
  const [savedSearches, setSavedSearches] = useState(() => { try { return JSON.parse(localStorage.getItem("els_saved") || "[]"); } catch { return []; } });
  const persistSaved = arr => { setSavedSearches(arr); try { localStorage.setItem("els_saved", JSON.stringify(arr)); } catch { /**/ } };
  const [q, setQ] = useState({ raw: seed || "ישראל", book: "torah", skipMax: 2000, pattern: "range", dir: "both", fuzzy: false });

  // האם ההיקף הנבחר חורג מהתורה (304,805) → צריך את קובץ-התנ״ך המלא
  const needTanakh = (TANAKH_BOOKS.find(b => b.key === q.book)?.to ?? 0) > 304805;
  const letters = needTanakh ? tanakhLetters : torahLetters;

  // זריעה ממסע-החיפוש: מונח חדש ב-URL → טוען ומריץ אוטומטית
  useEffect(() => { if (seed) { setRaw(seed); setHitIdx(0); setClusterIdx(0); setQ(p => ({ ...p, raw: seed })); } }, [seed]);

  // טעינת התורה — תמיד, בכניסה (קטן ומהיר)
  useEffect(() => {
    let ok = true;
    fetch("/torah-letters.txt", { headers: { Accept: "text/plain" } })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(t => { if (!ok) return; const c = elsNormalize(t); c.length > 1000 ? setTorahLetters(c) : setErr(true); })
      .catch(() => ok && setErr(true));
    return () => { ok = false; };
  }, []);

  // טעינת התנ״ך המלא — בעצלתיים, רק כשנדרש (פעם אחת)
  useEffect(() => {
    if (!needTanakh || tanakhLetters || tanakhBusy) return;
    let ok = true; setTanakhBusy(true);
    fetch("/tanakh-letters.txt", { headers: { Accept: "text/plain" } })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(t => { if (!ok) return; const c = elsNormalize(t); if (c.length > 1000) setTanakhLetters(c); else setErr(true); setTanakhBusy(false); })
      .catch(() => { if (ok) { setErr(true); setTanakhBusy(false); } });
    return () => { ok = false; };
  }, [needTanakh, tanakhLetters, tanakhBusy]);

  // ESC סוגר מסך-מלא
  useEffect(() => {
    if (!full) return;
    const h = e => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [full]);

  const terms = useMemo(() => q.raw.split(/[,\n]/).map(s => s.trim()).filter(s => elsNormalize(s).length >= 2), [q.raw]);
  const isCluster = terms.length >= 2;

  // 🔎 חיפוש דחוי (א-סינכרוני) — מציגים לוּדר עם הלוגו המהבהב לפני החישוב הכבד, ומחשבים בטיק הבא.
  const [res, setRes] = useState(null);
  const [searching, setSearching] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    if (!letters || !terms.length) { setRes(null); setSearching(false); return; }
    setSearching(true);
    setPhraseIdx(i => (i + 1) % ELS_PHRASES.length);
    const id = setTimeout(() => {
      const bk = TANAKH_BOOKS.find(b => b.key === q.book) || TANAKH_BOOKS[0];
      const mm = q.fuzzy ? 1 : 0;
      const opts = { winFrom: bk.from, winTo: Math.min(letters.length, bk.to), skips: buildSkipSet(q.pattern, 2, q.skipMax) };
      const r = isCluster
        ? { mode: "cluster", ...elsClusters(letters, terms, 2, Math.max(3, q.skipMax), q.dir, mm, opts) }
        : { mode: "single", ...elsSearch(letters, terms[0], 2, Math.max(3, q.skipMax), q.dir, mm, opts) };
      setRes(r); setSearching(false);
    }, 40);
    return () => clearTimeout(id);
  }, [letters, q, terms, isCluster]);

  const search = () => { setHitIdx(0); setClusterIdx(0); setOverlays([]); setLayersOpen(false); setSubRaw(""); setAiStruct(null); setQ({ raw, book, skipMax: Math.max(2, parseInt(skipMax) || 100), pattern, dir, fuzzy }); };
  // הוספת שכבה חדשה (מונח) למטריצה; הסרה; ניקוי
  const addOverlay = (raw) => { const t = elsNormalize(typeof raw === "string" ? raw : subRaw); if (t.length >= 2 && !overlays.includes(t)) { setOverlays(o => [...o, t]); if (typeof raw !== "string") setSubRaw(""); setLayersOpen(true); } };
  const removeOverlay = t => setOverlays(o => o.filter(x => x !== t));

  // 💾 שמירת חיפושים — כמה חיפושים שמורים (localStorage), נראים גם בקיר הימני
  const saveCurrent = () => {
    // 💾 שומר את כל המטריצה — החיפוש + שכבות-החיפוש שהוספת (overlays)
    const id = [q.raw, q.skipMax, q.book, q.dir, q.pattern, q.fuzzy ? 1 : 0, overlays.join("+")].join("|");
    if (savedSearches.some(s => s.id === id)) return;
    const label = q.raw + (overlays.length ? ` +${overlays.length}` : "");
    persistSaved([{ id, label, q: { ...q }, overlays: [...overlays] }, ...savedSearches].slice(0, 24));
  };
  const removeSaved = id => persistSaved(savedSearches.filter(s => s.id !== id));
  const loadSaved = useCallback(sv => {
    const c = sv?.q; if (!c) return;
    setRaw(c.raw); setBook(c.book); setSkipMax(c.skipMax); setPattern(c.pattern); setDir(c.dir); setFuzzy(!!c.fuzzy);
    const ov = Array.isArray(sv.overlays) ? sv.overlays : [];
    setHitIdx(0); setClusterIdx(0); setOverlays(ov); setLayersOpen(ov.length > 0); setSubRaw(""); setAiStruct(null); setQ({ ...c });
  }, []);
  // הקיר הימני מבקש לטעון חיפוש שמור → מיישמים כאן
  useEffect(() => on(EVENTS.ELS_LOAD, loadSaved), [loadSaved]);

  const locOf = useCallback(idx => {
    const b = TANAKH_BOOKS.filter(x => x.section).find(b => idx >= b.from && idx < b.to);
    if (!b) return { label: "—", off: idx, pct: 0 };
    return { label: b.label, off: idx - b.from, pct: Math.round(((idx - b.from) / (b.to - b.from)) * 100) };
  }, []);

  // העוגן הפעיל לפי המצב (single→hitIdx · cluster→clusterIdx)
  const anchorHit = useMemo(() => {
    if (!res) return null;
    if (res.mode === "single") return (res.hits || [])[Math.min(hitIdx, (res.hits?.length || 1) - 1)] || null;
    const cl = (res.clusters || [])[Math.min(clusterIdx, (res.clusters?.length || 1) - 1)];
    return cl ? cl.picks[0].hit : null;
  }, [res, hitIdx, clusterIdx]);

  const centerOf = h => (Math.min(...h.positions) + Math.max(...h.positions)) / 2;

  // 🪟 חלון-המטריצה (טווח-אותיות הנראה) — לפי העוגן בלבד. חיפוש-שכבה מוגבל אליו + שוליים →
  // לא סורק את כל הטקסט אלא רק את סביבת המטריצה → מהיר, וגם «קרוב» באמת = ליד מה שרואים.
  const matrixWindow = useMemo(() => {
    if (!anchorHit) return null;
    const s = Math.abs(anchorHit.skip), TARGET = 28;
    const W2 = s <= TARGET ? s * Math.max(1, Math.round(TARGET / s)) : s;
    const minP = Math.min(...anchorHit.positions), maxP = Math.max(...anchorHit.positions);
    const firstRow = Math.floor(minP / W2), lastRow = Math.floor(maxP / W2);
    const rowStart = firstRow - 4, rowEnd = Math.min(lastRow + 4, firstRow + 170);
    const margin = W2 * 12; // טיפה יותר בצדדים
    return { from: Math.max(0, rowStart * W2 - margin), to: (rowEnd + 1) * W2 + margin };
  }, [anchorHit]);

  // ---- שכבות-חיפוש — לכל מונח-שכבה מוצאים את המופע הקרוב-ביותר לעוגן, וצובעים על המטריצה ----
  // ⭐ מתחיל מ-skip 1 (כולל טקסט-רצוף) → מונח «צמוד» בכתב המקור (כמו «חג שבעת» ליד «יום משיח בא») נמצא.
  // 🪟 מוגבל לחלון-המטריצה (+שוליים) → לא לוקח זמן, ומחזיר רק את מה שבאמת ליד.
  const overlayData = useMemo(() => {
    if (!letters || !anchorHit || res?.mode !== "single" || !overlays.length) return [];
    const bk = TANAKH_BOOKS.find(b => b.key === q.book) || TANAKH_BOOKS[0];
    const winFrom = matrixWindow ? Math.max(bk.from, matrixWindow.from) : bk.from;
    const winTo = matrixWindow ? Math.min(letters.length, bk.to, matrixWindow.to) : Math.min(letters.length, bk.to);
    const opts = { winFrom, winTo, skips: buildSkipSet(q.pattern, 1, q.skipMax) };
    const aC = centerOf(anchorHit);
    return overlays.map((term, j) => {
      const r = elsSearch(letters, term, 1, Math.max(3, q.skipMax), q.dir, q.fuzzy ? 1 : 0, opts);
      const list = r.hits.map(h => ({ hit: h, dist: Math.round(Math.abs(centerOf(h) - aC)) })).sort((a, b) => a.dist - b.dist);
      return { term, ci: j + 1, list, nearest: list[0] || null, count: r.hits.length, capped: r.capped,
        within: d => list.filter(x => x.dist <= d).length };
    });
  }, [letters, overlays, q, anchorHit, res, matrixWindow]);

  // ---- מטריצה ----
  const grid = useMemo(() => {
    if (!res || !anchorHit) return null;
    const colorMap = new Map(), opMap = new Map();
    if (res.mode === "single") {
      anchorHit.positions.forEach(p => colorMap.set(p, 0));
      // כל שכבה — המופע הקרוב-ביותר לעוגן, בצבע השכבה (ci)
      overlayData.forEach(o => { if (o.nearest) o.nearest.hit.positions.forEach(p => colorMap.set(p, o.ci)); });
    } else {
      const cl = (res.clusters || [])[Math.min(clusterIdx, res.clusters.length - 1)];
      cl.picks.forEach((pk, i) => pk.hit.positions.forEach(p => colorMap.set(p, i)));
    }
    // 🔲 רוחב-תצוגה שממלא את הדף: דילוג קטן → כפולה שלו הקרובה ל-TARGET (לא «טור של 2»);
    // דילוג גדול → רוחב=דילוג עם חלון ממורכז. כך המטריצה תמיד נפתחת רחב.
    const s = Math.abs(anchorHit.skip), TARGET = 28;
    const W2 = s <= TARGET ? s * Math.max(1, Math.round(TARGET / s)) : s;
    // ממסגרים סביב העוגן + השכבות הקרובות (כדי שהן ייכנסו לתצוגה), לא סביב צבעים רחוקים
    const framePos = res.mode === "single"
      ? [...anchorHit.positions, ...overlayData.flatMap(o => o.nearest ? o.nearest.hit.positions : [])]
      : (res.clusters[Math.min(clusterIdx, res.clusters.length - 1)].picks.flatMap(p => p.hit.positions));
    const minP = Math.min(...framePos), maxP = Math.max(...framePos);
    const firstRow = Math.floor(minP / W2), lastRow = Math.floor(maxP / W2);
    let colWin = W2, colStart = 0;
    if (W2 > 34) { colWin = 29; const wc = anchorHit.start % W2; colStart = Math.max(0, Math.min(W2 - colWin, wc - 14)); }
    const rowStart = firstRow - 4, rowEnd = Math.min(lastRow + 4, firstRow + 170), rows = [];
    for (let r = rowStart; r <= rowEnd; r++) {
      const cells = [];
      for (let c = 0; c < colWin; c++) {
        const i = r * W2 + (colStart + c);
        cells.push(r >= 0 && i >= 0 && i < letters.length ? { ch: letters[i], ci: colorMap.has(i) ? colorMap.get(i) : -1, op: opMap.has(i) ? opMap.get(i) : 1, idx: i } : { ch: "", ci: -1, op: 1, idx: -1 });
      }
      rows.push(cells);
    }
    return { rows, W: W2, skip: s };
  }, [res, anchorHit, clusterIdx, letters, overlayData]);

  // 🎨 צבע לכל שכבה לפי האינדקס (ci) שבמטריצה: single → 0=מונח ראשי · 1=מונח-משני;
  // cluster → i=מונח ה-i. צבע-בחירה של המשתמש (paint[term]) גובר על ברירת-המחדל.
  const cluster0c = res?.mode === "cluster" ? (res.clusters || [])[Math.min(clusterIdx, (res.clusters?.length || 1) - 1)] : null;
  const layerColors = useMemo(() => {
    if (res?.mode === "cluster" && cluster0c) {
      return cluster0c.picks.map((pk, i) => paint[pk.term] || TERM_COLORS[i % TERM_COLORS.length]);
    }
    return [paint[terms[0]] || TERM_COLORS[0], ...overlays.map((t, j) => paint[t] || PAINT[j % PAINT.length])];
  }, [res, cluster0c, terms, overlays, paint]);
  const colorAt = ci => layerColors[ci] || TERM_COLORS[ci % TERM_COLORS.length];

  // נקודת-צבע לחיצה → לוח-צבעים קטן לבחירת צבע למונח (term)
  const paintDot = (term, color) => (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button onClick={() => setPaintOpen(o => o === term ? null : term)} title="בחר צבע למונח" aria-label="בחר צבע"
        style={{ width: 15, height: 15, borderRadius: "50%", background: color, border: "2px solid #fff", boxShadow: `0 0 0 1.5px ${color}`, cursor: "pointer", padding: 0 }} />
      {paintOpen === term && (
        <>
          <span onClick={() => setPaintOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 39 }} />
          <span style={{ position: "absolute", top: "150%", insetInlineStart: 0, zIndex: 40, display: "flex", flexWrap: "wrap", gap: 5, width: 142, padding: 7, background: "var(--card,#fff)", border: "1px solid var(--line,#e6dcc6)", borderRadius: 11, boxShadow: "0 10px 26px rgba(40,30,8,.28)" }}>
            {PAINT.map(c => (
              <button key={c} onClick={() => { setPaint(p => ({ ...p, [term]: c })); setPaintOpen(null); }} title={c}
                style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: c === color ? "2.5px solid #111" : "2px solid #fff", boxShadow: `0 0 0 1px ${c}` }} />
            ))}
          </span>
        </>
      )}
    </span>
  );

  const C = { acc: "var(--acc)", ink: "var(--ink)", ink2: "var(--ink2)", line: "var(--line)", bg: "var(--bg)", accS: "var(--accS)" };
  const ctl = { fontSize: 15, fontWeight: 700, padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, outline: "none", fontFamily: "inherit" };
  const chip = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, padding: "5px 11px", borderRadius: 999, border: `1px solid ${C.line}`, background: C.bg, color: C.ink2 };

  // ---- רשימת התוצאות (עובדה: כמה · איפה) ----
  const ResultsList = () => {
    if (!res) return null;
    if (res.mode === "single") {
      const hits = res.hits || []; if (!hits.length) return null;
      return (
        <div className="els-list">
          <div className="els-list-h">📋 {hits.length}{res.capped ? "+" : ""} מופעים{q.fuzzy ? " (כולל קרובים)" : ""} — לחצו למיקוד</div>
          <div className="els-list-body">
            {hits.slice(0, 80).map((h, i) => {
              const l = locOf(h.start);
              return (
                <button key={i} className={"els-row" + (i === Math.min(hitIdx, hits.length - 1) ? " on" : "")} onClick={() => setHitIdx(i)}>
                  <span className="els-rk">{i + 1}</span>
                  <span className="els-rc">דילוג <b>{Math.abs(h.skip).toLocaleString("he")}</b></span>
                  <span className="els-rc">{h.dir > 0 ? "→" : "←"}</span>
                  <span className="els-rc">{l.label}</span>
                  <span className="els-rc muted">אות {l.off.toLocaleString("he")} · {l.pct}%</span>
                  {h.mismatches > 0 && <span className="els-rc warn">~קרוב</span>}
                </button>
              );
            })}
            {hits.length > 80 && <div className="els-more">…ועוד {hits.length - 80} מופעים. צמצמו דילוג למיקוד.</div>}
          </div>
        </div>
      );
    }
    const cls = res.clusters || []; if (!cls.length) return null;
    return (
      <div className="els-list">
        <div className="els-list-h">📋 {cls.length} אשכולות קרובים — לחצו למיקוד</div>
        <div className="els-list-body">
          {cls.map((cl, i) => {
            const l = locOf(cl.picks[0].hit.start);
            return (
              <button key={i} className={"els-row" + (i === Math.min(clusterIdx, cls.length - 1) ? " on" : "")} onClick={() => setClusterIdx(i)}>
                <span className="els-rk">{i + 1}</span>
                <span className="els-rc">טווח <b>{cl.span.toLocaleString("he")}</b></span>
                <span className="els-rc">{l.label}</span>
                <span className="els-rc muted">{cl.picks.map(p => p.term).join(" · ")}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const theme = CELL_BGS[cellBgIdx];
  // סרגל-תצוגה: זום + בורר-רקע (משותף לרגיל ולמסך-מלא)
  const MatrixTools = () => (
    <div className="els-mtools">
      <span className="els-mt-lb">זום</span>
      <button className="els-mt-b" onClick={() => setZoom(z => Math.max(0.25, +(z - 0.15).toFixed(2)))} title="הרחק (זום אאוט)">−</button>
      <span className="els-mt-z">{Math.round(zoom * 100)}%</span>
      <button className="els-mt-b" onClick={() => setZoom(z => Math.min(3.5, +(z + 0.15).toFixed(2)))} title="התקרב (זום אין)">+</button>
      {zoom !== 1 && <button className="els-mt-b" onClick={() => setZoom(1)} title="איפוס">⟳</button>}
      <span className="els-mt-sep" />
      <span className="els-mt-lb">רקע</span>
      {CELL_BGS.map((c, i) => <button key={i} className={"els-swatch" + (i === cellBgIdx ? " on" : "")} style={{ background: c.bg === "var(--bg)" ? "var(--bg)" : c.bg }} onClick={() => setCellBgIdx(i)} title={c.label} aria-label={c.label} />)}
      <span className="els-mt-sep" />
      <button className={"els-mt-nq" + (niqqud ? " on" : "")} onClick={toggleNiqqud} disabled={nqBusy} title="ניקוד אופציונלי">{nqBusy ? "טוען ניקוד…" : niqqud ? "ניקוד ✓" : "נַקֵּד"}</button>
    </div>
  );
  // ---- ציור המטריצה (משותף: רגיל + מסך-מלא) ----
  const Matrix = ({ big }) => {
    if (!grid) return null;
    const sz = Math.round((big ? 38 : 30) * zoom), h = Math.round((big ? 42 : 34) * zoom), fs = Math.round((big ? 25 : 20) * zoom);
    return (
      <div className="els-matrix" style={{ overflow: "auto", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "inline-grid", gap: 3, background: theme.bg, padding: 8, borderRadius: 10 }}>
          {grid.rows.map((row, r) => (
            <div key={r} dir="rtl" style={{ display: "flex", gap: 3 }}>
              {row.map((cell, c) => {
                const col = cell.ci >= 0 ? colorAt(cell.ci) : null;
                const bg = col ? (cell.op < 1 ? hexA(col, cell.op) : col) : theme.bg; // צבע מתחלש לפי קרבה
                const glyph = niqqud && nqData && cell.idx >= 0 ? cell.ch + (nqData[cell.idx] || "") : cell.ch;
                return <div key={c} style={{ width: sz, height: h, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Frank Ruhl Libre', serif", fontSize: fs, fontWeight: col ? 800 : 500, borderRadius: 6, overflow: "visible",
                  color: col ? (cell.op < 0.55 ? "#3a1418" : "#fff") : theme.fg, background: bg, border: `1px solid ${col ? hexA(col, cell.op) : (theme.bg === "var(--bg)" ? C.line : "transparent")}` }}>{glyph}</div>;
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const cluster0 = res?.mode === "cluster" ? (res.clusters || [])[Math.min(clusterIdx, (res.clusters?.length || 1) - 1)] : null;

  // 📡 מפרסמים את מצב התוצאות לקיר הימני (Event Bus) — שם רואים תוצאות-דילוג + חיפושים שמורים
  const savedMeta = useMemo(() => savedSearches.map(s => ({ id: s.id, label: s.label })), [savedSearches]);
  const elsSummary = useMemo(() => {
    const base = { saved: savedMeta };
    if (!res) return { ...base, has: false };
    if (res.mode === "single") {
      const h = anchorHit;
      return {
        ...base, has: true, mode: "single", term: elsNormalize(terms[0] || ""),
        skip: h ? Math.abs(h.skip) : 0, dir: h ? h.dir : 1, count: res.hits.length, capped: res.capped,
        loc: h ? locOf(h.start) : null,
        hits: (res.hits || []).slice(0, 24).map(x => ({ skip: Math.abs(x.skip), dir: x.dir, ...locOf(x.start), mm: x.mismatches })),
        sub: overlayData[0] ? { term: overlayData[0].term, count: overlayData[0].count, nearest: overlayData[0].nearest?.dist ?? null, w1000: overlayData[0].within(1000), w5000: overlayData[0].within(5000),
          list: overlayData[0].list.slice(0, 16).map(x => ({ dist: x.dist, skip: Math.abs(x.hit.skip), ...locOf(x.hit.start) })) } : null,
        overlays: overlayData.map(o => ({ term: o.term, nearest: o.nearest?.dist ?? null, count: o.count })),
      };
    }
    return { ...base, has: true, mode: "cluster", terms,
      clusters: (res.clusters || []).slice(0, 10).map(cl => ({ span: cl.span, ...locOf(cl.picks[0].hit.start), picks: cl.picks.map(p => ({ term: p.term, skip: Math.abs(p.hit.skip) })) })) };
  }, [res, anchorHit, overlayData, terms, savedMeta, locOf]);
  useEffect(() => { emit(EVENTS.ELS_STATE, elsSummary); }, [elsSummary]);
  useEffect(() => () => emit(EVENTS.ELS_STATE, null), []); // ניקוי בעת עזיבה

  // 🤖 ניתוח-מבנה האשכול ב-AI (אדמין בלבד) — בוחרים כמה מונחים, ה-AI מפרש את המבנה.
  // שולח עובדות שכבר חושבו (מונחים · דילוגים · טווח · מיקום) → פרשנות. לא מחשב, לא מכריע.
  const runStructAi = async () => {
    if (!cluster0) return;
    setAiStruct({ loading: true });
    try {
      const picks = cluster0.picks.map(p => ({ term: p.term, skip: Math.abs(p.hit.skip), dir: p.hit.dir > 0 ? "קדימה" : "אחורה", book: locOf(p.hit.start).label, letter: locOf(p.hit.start).off }));
      const input = { type: "els_cluster", terms, span: cluster0.span, book: locOf(cluster0.picks[0].hit.start).label, picks };
      const { data, error } = await supabase.functions.invoke("field-router", { body: { input, core_values: computeEntity(terms.join(" ")).values, lenses: ["journey"] } });
      if (error) throw error;
      if (data?.gated) setAiStruct({ msg: data.reason === "rate" ? "מכסת ההרצות היומית מוצתה." : "אין הרשאה (התחבר כאדמין)." });
      else { const o = (data?.outputs || []).find(x => x.out)?.out; o ? setAiStruct({ out: o }) : setAiStruct({ msg: "המודל לא החזיר פלט תקין." }); }
    } catch (e) { setAiStruct({ msg: "שגיאה: " + (e?.message || String(e)).slice(0, 80) }); }
  };

  return (
    <div>
      <style>{ELS_CSS}</style>
      <div className="rw-h1">🔡 דילוגי אותיות</div>
      <div className="rw-sub"><b>שני מונחים יחד</b> (מופרדים בפסיק — «דוד, שלמה») → המערכת מוצאת אותם ב<b>קרבה</b> ומציגה את <b>התוצאה הכי טובה</b> במטריצה אחת. מונח אחד → המילה מודגשת לאורך הדילוג. «כולל קרובים» מאתר גם התאמה עם אות שונה. <b>משמעות = חקירה, לא הוכחה.</b></div>
      <Help>
        <b>איך המנוע עובד:</b> קוראים את אותיות התנ״ך ברצף קבוע — כל 2, כל 7, כל 50… — ובודקים אם נוצרת מילה. זה נקרא <b>דילוג שווה (ELS)</b>. ככל שהדילוג קצר יותר, המופע מובהק יותר. <b>חשוב ליושר:</b> אפשר למצוא דילוגים כמעט בכל טקסט גדול — לכן זו עדשת-חקירה, לא הוכחה.
      </Help>

      <div className="rw-card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...ctl, flex: "1 1 220px", textAlign: "center", fontSize: 17 }} dir="rtl" value={raw}
            onChange={e => setRaw(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
            placeholder="שם · או כמה שמות בפסיק: דוד, בת שבע, שלמה" aria-label="מונחים לחיפוש" />
          <button onClick={search} style={{ cursor: "pointer", border: "none", background: C.acc, color: "#fff", fontWeight: 800, fontSize: 15, borderRadius: 999, padding: "10px 22px", fontFamily: "inherit" }}>🔍 חפש</button>
          <button onClick={saveCurrent} title="שמור את החיפוש הזה" style={{ cursor: "pointer", border: `1px solid ${C.line}`, background: C.bg, color: C.ink2, fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "10px 16px", fontFamily: "inherit" }}>💾 שמור</button>
        </div>
        {savedSearches.length > 0 && (
          <div className="els-saved">
            <span className="els-saved-lb">שמורים:</span>
            {savedSearches.map(s => (
              <span key={s.id} className="els-saved-chip">
                <button className="els-saved-load" onClick={() => loadSaved(s)} title="טען חיפוש">{s.label}</button>
                <button className="els-saved-x" onClick={() => removeSaved(s.id)} title="הסר">✕</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          <select style={{ ...ctl, cursor: "pointer" }} value={book} onChange={e => setBook(e.target.value)}>
            {TANAKH_BOOKS.filter(b => !b.section).map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
            {["תורה", "נביאים", "כתובים"].map(sec => (
              <optgroup key={sec} label={sec}>
                {TANAKH_BOOKS.filter(b => b.section === sec).map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
              </optgroup>
            ))}
          </select>
          <select style={{ ...ctl, cursor: "pointer" }} value={pattern} onChange={e => setPattern(e.target.value)}>{PATTERNS.map(([k, l]) => <option key={k} value={k}>דילוג: {l}</option>)}</select>
          <select style={{ ...ctl, cursor: "pointer" }} value={dir} onChange={e => setDir(e.target.value)}>{DIRS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, display: "flex", alignItems: "center" }}>דילוג עד
            <input style={{ ...ctl, width: 90, marginInlineStart: 6 }} type="number" min="2" value={skipMax} onChange={e => setSkipMax(e.target.value)} /></label>
          <label className="els-chk" style={{ color: C.ink2 }}>
            <input type="checkbox" checked={fuzzy} onChange={e => setFuzzy(e.target.checked)} /> כולל קרובים (±אות)
          </label>
        </div>
      </div>

      {!letters && !err && <div className="rw-card rw-muted" style={{ marginTop: 12 }}>{needTanakh ? "טוען את התנ״ך המלא (פעם אחת)…" : "טוען את אותיות התורה…"}</div>}
      {err && <div className="rw-card" style={{ marginTop: 12, color: "#b4453a" }}>שגיאה בטעינת הטקסט.</div>}

      {/* ⏳ לוּדר חיפוש — עיגול עם הלוגו המהבהב + משפט מתחלף */}
      {searching && (
        <div className="rw-card els-loading">
          <div className="els-loading-ring"><img src={LOGO_URL} alt="" className="els-loading-logo" /></div>
          <div className="els-loading-msg">{ELS_PHRASES[phraseIdx]}</div>
          <div className="els-loading-sub">סורק את אותיות {needTanakh ? "התנ״ך המלא" : "התורה"}…</div>
        </div>
      )}

      {/* ===== עובדות ===== */}
      {res?.mode === "single" && (res.hits?.length ? (() => {
        const hit = anchorHit; const l = locOf(hit.start); const gem = computeEntity(terms[0]).primary;
        return <div className="rw-card" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ ...chip, gap: 7, borderColor: colorAt(0), color: colorAt(0) }}>{paintDot(terms[0], colorAt(0))} «{elsNormalize(terms[0])}»</span>
          {/* דילוג · כיוון · מיקום · מופעים — מוצגים בקיר-הימני «תוצאות דילוג» (דסקטופ); כאן רק במובייל (אין קיר) */}
          <span className="els-dup">
            <span style={chip}>דילוג <b style={{ color: C.acc }}>{Math.abs(hit.skip).toLocaleString("he")}</b></span>
            <span style={chip}>{hit.dir > 0 ? "→ קדימה" : "← אחורה"}</span>
            <span style={chip}>📍 {l.label} · אות {l.off.toLocaleString("he")}</span>
            <span style={chip}>מופעים <b style={{ color: C.acc }}>{res.hits.length}{res.capped ? "+" : ""}</b></span>
          </span>
          {hit.mismatches > 0 && <span style={{ ...chip, color: "#b4453a", borderColor: "#e0b4b0" }}>~ התאמה קרובה</span>}
          <span style={chip}>גימטריה <Link to={`/number/${gem}?from=els`} style={{ color: C.acc, textDecoration: "none", fontWeight: 800 }}>{gem.toLocaleString("he")}</Link></span>
          <button onClick={() => setFull(true)} style={{ ...chip, marginInlineStart: "auto", cursor: "pointer" }}>⛶ מסך מלא</button>
        </div>;
      })() : <div className="rw-card rw-muted" style={{ marginTop: 12 }}>«{elsNormalize(terms[0] || "")}» לא נמצא כדילוג עד {q.skipMax}. נסו דילוג גדול יותר{!q.fuzzy ? ", או סמנו «כולל קרובים»" : ""}.</div>)}

      {res?.mode === "cluster" && (res.missing?.length
        ? <div className="rw-card" style={{ marginTop: 12, color: "#b4453a" }}>לא נמצאו כדילוג: {res.missing.join(" · ")}. הגדילו את הדילוג{!q.fuzzy ? " או סמנו «כולל קרובים»" : ""}.</div>
        : cluster0
          ? <div className="rw-card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span>✦ התוצאה הכי טובה — {terms.length} מונחים בטווח <b style={{ color: C.acc }}>{cluster0.span.toLocaleString("he")}</b> אותיות · 📍 {locOf(cluster0.picks[0].hit.start).label}{res.clusters.length > 1 ? ` · מתוך ${res.clusters.length} אשכולות` : ""}</span>
                <button onClick={() => setFull(true)} style={{ ...chip, marginInlineStart: "auto", cursor: "pointer" }}>⛶ מסך מלא</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {cluster0.picks.map((pk, i) => <span key={i} style={{ ...chip, gap: 7, borderColor: colorAt(i), color: colorAt(i) }}>{paintDot(pk.term, colorAt(i))} {pk.term} · דילוג {Math.abs(pk.hit.skip).toLocaleString("he")}</span>)}
              </div>
              <div className="rw-sub" style={{ marginTop: 6 }}>🎨 לחצו על נקודת-הצבע שליד כל מונח כדי לצבוע אותו במטריצה. «קרבה» = מרחק קטן בין המונחים בטקסט. עובדה מדידה — לא הוכחה (אפשר למצוא קרבות בכל טקסט גדול).</div>
              {isAdmin && (
                <div className="els-ai">
                  {!aiStruct && <button className="els-ai-btn" onClick={runStructAi}>🤖 נתח מבנה ב-AI</button>}
                  {aiStruct?.loading && <div className="rw-muted">ה-AI מנתח את מבנה האשכול…</div>}
                  {aiStruct?.msg && <div className="els-ai-msg">{aiStruct.msg} <button className="els-ai-retry" onClick={runStructAi}>נסה שוב</button></div>}
                  {aiStruct?.out && (
                    <div className="els-ai-out">
                      <div className="els-ai-h">🔵 ניתוח מבנה (AI){aiStruct.out.confidence ? ` · ביטחון ${({ low: "נמוך", medium: "בינוני", high: "גבוה" })[aiStruct.out.confidence] || aiStruct.out.confidence}` : ""}</div>
                      {aiStruct.out.summary && <p className="els-ai-sum">{aiStruct.out.summary}</p>}
                      {Array.isArray(aiStruct.out.connections) && aiStruct.out.connections.length > 0 && <ul className="els-ai-list">{aiStruct.out.connections.map((c, i) => <li key={i}>{c}</li>)}</ul>}
                      {Array.isArray(aiStruct.out.questions) && aiStruct.out.questions.length > 0 && <><div className="els-ai-t">שאלות להמשך</div><ul className="els-ai-list">{aiStruct.out.questions.map((c, i) => <li key={i}>{c}</li>)}</ul></>}
                      <div className="rw-sub" style={{ marginTop: 6 }}>פרשנות — לא הוכחה. העובדות (מונחים · דילוגים · מרחקים) למעלה.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          : <div className="rw-card rw-muted" style={{ marginTop: 12 }}>המונחים נמצאו, אך לא באשכול קרוב. הגדילו את הדילוג.</div>)}

      {/* ===== שכבות-חיפוש — מכווץ כברירת-מחדל; נפתח כשרוצים חיפוש-משולב ===== */}
      {res?.mode === "single" && res.hits?.length > 0 && !layersOpen && (
        <button className="els-combine-btn" onClick={() => setLayersOpen(true)}>
          🔢 חיפוש משולב — הוסיפו מונחים נוספים על המטריצה ▾
        </button>
      )}
      {res?.mode === "single" && res.hits?.length > 0 && layersOpen && (
        <div className="rw-card els-sub" style={{ marginTop: 12 }}>
          <div className="els-sub-bar">
            <span className="els-sub-t">🔢 שכבות חיפוש</span>
            <button className="els-sub-clear" onClick={() => setLayersOpen(false)} title="כווץ">▴ כווץ</button>
            <input className="els-sub-in" dir="rtl" value={subRaw} onChange={e => setSubRaw(e.target.value)} onKeyDown={e => e.key === "Enter" && addOverlay()}
              placeholder={`מונח נוסף על המטריצה — הקרוב ביותר ל«${elsNormalize(terms[0] || "")}»`} />
            <button className="els-sub-btn" onClick={() => addOverlay()} disabled={elsNormalize(subRaw).length < 2}>➕ הוסף</button>
            <button className="els-sub-btn" onClick={saveCurrent} title="שמור את כל המטריצה (החיפוש + השכבות)" style={{ background: "var(--accS)", color: "var(--acc)", border: "1px solid var(--acc)" }}>💾 שמור מטריצה</button>
            {overlays.length > 0 && <button className="els-sub-clear" onClick={() => setOverlays([])}>נקה הכל</button>}
          </div>
          <Help label="ℹ️ איך עובדות שכבות-חיפוש?">
            המונח הראשון הוא <b>העוגן</b>. כל מונח שתוסיפו = <b>שכבה</b> חדשה: המנוע מוצא את המופע <b>הקרוב ביותר</b> לעוגן וצובע אותו במטריצה בצבע משלו. אפשר להוסיף שני · שלישי · רביעי… כל אחד ריבוע בטבלה למטה. 🎨 לחיצה על נקודת-הצבע = שינוי צבע. 💾 «שמור מטריצה» שומר את כל הצירוף.
          </Help>
          {/* טבלת השכבות — ריבוע לכל מונח */}
          <div className="els-layers">
            <span className="els-layer anchor" style={{ borderColor: colorAt(0) }}>
              {paintDot(elsNormalize(terms[0]), colorAt(0))} <b style={{ color: colorAt(0) }}>{elsNormalize(terms[0])}</b>
              <span className="els-layer-meta">עוגן · דילוג {Math.abs(anchorHit.skip).toLocaleString("he")}</span>
            </span>
            {overlayData.map(o => (
              <span key={o.term} className="els-layer" style={{ borderColor: colorAt(o.ci) }}>
                {paintDot(o.term, colorAt(o.ci))} <b style={{ color: colorAt(o.ci) }}>{o.term}</b>
                <span className="els-layer-meta">
                  {o.nearest ? <>קרוב <b>{o.nearest.dist.toLocaleString("he")}</b> · דילוג {Math.abs(o.nearest.hit.skip).toLocaleString("he")} · {locOf(o.nearest.hit.start).label}</> : "לא נמצא בטווח"}
                </span>
                <button className="els-layer-x" onClick={() => addFinding(o.term)} title="שמור לטבלת הממצאים שלי" style={{ color: "var(--acc)" }}>💾</button>
                <button className="els-layer-x" onClick={() => removeOverlay(o.term)} title="הסר שכבה">✕</button>
              </span>
            ))}
          </div>
          {overlays.length === 0
            ? <div className="rw-sub" style={{ marginTop: 8 }}>הקלידו מונח ו«➕ הוסף» — הוא יופיע כאן כריבוע צבעוני וייצבע על המטריצה. הוסיפו כמה שתרצו (שני · שלישי · רביעי…), ושמרו את הצירוף ב«💾 שמור מטריצה».</div>
            : <div className="els-sub-note">כל שכבה = המופע הקרוב-ביותר לעוגן, בצבעה · 💾 = שמירה לטבלת-הממצאים. «קרוב» = מרחק באותיות. עובדה מדידה — לא הוכחה.</div>}

          {/* 📌 הממצאים שלי — טבלה אישית: הוספה/מחיקה ידנית, נשמר אצלך */}
          <div className="els-findings">
            <div className="els-find-bar">
              <span className="els-sub-t" style={{ fontSize: 13.5 }}>📌 הממצאים שלי</span>
              <input className="els-sub-in" dir="rtl" value={findRaw} onChange={e => setFindRaw(e.target.value)} onKeyDown={e => e.key === "Enter" && addFinding()}
                placeholder="הוסף ממצא ידני (אותיות/ביטוי שמצאת)…" />
              <button className="els-sub-btn" onClick={() => addFinding()} disabled={!findRaw.trim()}>➕ שמור ממצא</button>
            </div>
            {findings.length > 0
              ? <div className="els-find-list">
                  {findings.map(f => (
                    <span key={f} className="els-find-chip">
                      <button className="els-find-go" onClick={() => addOverlay(f)} title="חפש כשכבה על המטריצה">{f}</button>
                      <button className="els-find-x" onClick={() => removeFinding(f)} title="מחק מהטבלה">✕</button>
                    </span>
                  ))}
                </div>
              : <div className="rw-sub" style={{ marginTop: 6 }}>טבלה אישית — מוסיפים אותיות/ביטויים שמצאתם (ידנית או דרך 💾 שעל שכבה), והם נשמרים כאן. לחיצה על ממצא = חיפוש שלו על המטריצה.</div>}
          </div>
        </div>
      )}

      {/* ===== המטריצה + רשימה ===== */}
      {grid && <div className="rw-card" style={{ marginTop: 12 }}><MatrixTools /><Matrix big={false} /></div>}
      {grid && <div className="rw-sub" style={{ marginTop: 8, textAlign: "center" }}>הרשת ברוחב {grid.W.toLocaleString("he")} (דילוג {grid.skip.toLocaleString("he")}) — {isCluster ? "כל מונח בצבע משלו" : "המונח מודגש לאורך הדילוג"}.</div>}
      {grid && <Help label="ℹ️ איך קוראים את המטריצה?">
        אותיות התנ״ך נכתבות בשורות ברוחב קבוע (כאן {grid.W.toLocaleString("he")}). המילה שחיפשת מודגשת — כל אות שלה רחוקה מהקודמת בדיוק כמספר-הדילוג. הרוחב נבחר כך שהמטריצה תתמלא את הדף. ⚙️ בסרגל-התצוגה: <b>זום</b>, <b>רקע</b> לאותיות, ו<b>ניקוד</b> אופציונלי.
      </Help>}

      {res && <div className="rw-card" style={{ marginTop: 12 }}><ResultsList /></div>}

      {/* ===== מסך מלא ===== */}
      {full && grid && (
        <div className="els-full" onClick={e => e.target === e.currentTarget && setFull(false)}>
          <div className="els-full-bar">
            <span style={{ fontWeight: 800 }}>🔡 {terms.join(" · ")}</span>
            <span className="rw-sub">רוחב {grid.W} · {res.mode === "single" ? `${res.hits.length} מופעים` : `${res.clusters.length} אשכולות`}</span>
            <button className="els-x" onClick={() => setFull(false)}>✕ סגור (Esc)</button>
          </div>
          <div className="els-full-body">
            <div className="els-full-grid"><div style={{ width: "100%" }}><MatrixTools /><Matrix big /></div></div>
            <div className="els-full-side"><ResultsList /></div>
          </div>
        </div>
      )}
    </div>
  );
}

const ELS_CSS = `
.els-chk{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;cursor:pointer}
.els-sub-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.els-sub-t{font-weight:800;font-size:14px;color:var(--ink)}
.els-sub-in{flex:1 1 200px;text-align:center;font-size:15px;font-weight:700;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-family:inherit;outline:none}
.els-sub-btn{border:none;background:var(--acc);color:#fff;font-weight:800;font-size:14px;border-radius:999px;padding:9px 18px;cursor:pointer;font-family:inherit}
.els-sub-btn:disabled{opacity:.5;cursor:default}
.els-sub-clear{border:1px solid var(--line);background:var(--bg);color:var(--ink2);border-radius:999px;padding:9px 14px;cursor:pointer;font-family:inherit;font-weight:700}
/* ⏳ לוּדר חיפוש — לוגו מהבהב בעיגול */
.els-loading{display:flex;flex-direction:column;align-items:center;gap:11px;margin-top:12px;padding:30px 20px;text-align:center}
.els-loading-ring{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle,var(--accS),transparent 72%);animation:els-pulse 1.25s ease-in-out infinite}
.els-loading-logo{width:60px;height:60px;object-fit:contain;border-radius:50%;animation:els-blink 1.25s ease-in-out infinite}
@keyframes els-pulse{0%,100%{box-shadow:0 0 0 0 var(--acc);transform:scale(1)}50%{box-shadow:0 0 0 16px transparent;transform:scale(1.07)}}
@keyframes els-blink{0%,100%{opacity:1;filter:drop-shadow(0 0 5px var(--acc))}50%{opacity:.5;filter:drop-shadow(0 0 16px var(--acc))}}
.els-loading-msg{font-size:16.5px;font-weight:800;color:var(--ink);animation:els-fade 1.25s ease-in-out infinite}
@keyframes els-fade{0%,100%{opacity:1}50%{opacity:.6}}
.els-loading-sub{font-size:12.5px;color:var(--ink2)}
@media(prefers-reduced-motion:reduce){.els-loading-ring,.els-loading-logo,.els-loading-msg{animation:none}}
/* כפילות עם «תוצאות דילוג» בקיר-הימני: מוצג רק במובייל (≤760, אז אין קיר), מוסתר בדסקטופ */
.els-dup{display:contents}
@media(min-width:761px){.els-dup{display:none}}
/* כפתור פתיחת חיפוש-משולב (פאנל-השכבות מכווץ) */
.els-combine-btn{display:block;width:100%;margin-top:12px;padding:12px 16px;border:1.5px dashed var(--acc);background:var(--accS);
  color:var(--acc);border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;transition:.12s}
.els-combine-btn:hover{background:var(--acc);color:#fff;border-style:solid}
.els-layers{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.els-layer{display:inline-flex;align-items:center;gap:7px;background:var(--bg);border:1.5px solid var(--line);border-radius:12px;padding:7px 12px;font-size:13.5px;font-weight:700}
.els-layer.anchor{background:var(--accS)}
.els-layer-meta{font-size:11.5px;font-weight:600;color:var(--ink2)}
.els-layer-x{border:none;background:none;cursor:pointer;color:var(--ink3);font-size:13px;padding:0 0 0 2px;line-height:1}
.els-layer-x:hover{color:#b4453a}
/* 📌 הממצאים שלי */
.els-findings{margin-top:14px;border-top:1px dashed var(--line);padding-top:12px}
.els-find-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.els-find-list{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
.els-find-chip{display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--line);border-radius:999px;overflow:hidden}
.els-find-go{border:none;background:none;color:var(--ink);font-weight:700;font-size:13px;padding:6px 12px;cursor:pointer;font-family:inherit}
.els-find-go:hover{color:var(--acc);background:var(--accS)}
.els-find-x{border:none;background:none;color:var(--ink3);cursor:pointer;font-size:11px;padding:6px 9px 6px 5px}
.els-find-x:hover{color:#b4453a}
.els-sub-stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.els-sub-note{font-size:12.5px;color:var(--ink2);margin-top:7px}
.els-help{margin:8px 0 4px;background:var(--accS);border:1px solid var(--line);border-radius:10px;padding:2px 12px}
.els-help summary{cursor:pointer;font-size:12.5px;font-weight:800;color:var(--acc);padding:7px 0;list-style:none}
.els-help summary::-webkit-details-marker{display:none}
.els-help-b{font-size:13px;color:var(--ink2);line-height:1.65;padding:0 0 10px}
.els-saved{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px}
.els-saved-lb{font-size:12px;font-weight:800;color:var(--ink3)}
.els-saved-chip{display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--line);border-radius:999px;overflow:hidden}
.els-saved-load{border:none;background:none;color:var(--ink2);font-weight:700;font-size:12.5px;padding:6px 11px;cursor:pointer;font-family:inherit}
.els-saved-load:hover{color:var(--acc)}
.els-saved-x{border:none;background:none;color:var(--ink3);cursor:pointer;font-size:11px;padding:6px 8px 6px 4px}
.els-saved-x:hover{color:#b4453a}
.els-mtools{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.els-mt-lb{font-size:12px;font-weight:800;color:var(--ink3)}
.els-mt-b{width:30px;height:30px;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;cursor:pointer;font-family:inherit;font-size:16px;font-weight:800;line-height:1}
.els-mt-b:hover{border-color:var(--acc);color:var(--acc)}
.els-mt-z{font-size:13px;font-weight:800;color:var(--ink2);min-width:42px;text-align:center}
.els-mt-sep{width:1px;height:20px;background:var(--line);margin:0 4px}
.els-swatch{width:24px;height:24px;border-radius:7px;border:2px solid var(--line);cursor:pointer;padding:0}
.els-swatch.on{border-color:var(--acc);box-shadow:0 0 0 2px var(--accS)}
.els-mt-nq{border:1px solid var(--line);background:var(--bg);color:var(--ink2);border-radius:8px;padding:5px 12px;cursor:pointer;font-family:'Frank Ruhl Libre',serif;font-size:14px;font-weight:700}
.els-mt-nq:hover{border-color:var(--acc);color:var(--acc)}
.els-mt-nq.on{background:var(--acc);color:#fff;border-color:var(--acc)}
.els-mt-nq:disabled{opacity:.6;cursor:default}
.els-ai{margin-top:10px}
.els-ai-btn{border:none;background:#1f6feb;color:#fff;font-weight:800;font-size:13.5px;border-radius:999px;padding:8px 18px;cursor:pointer;font-family:inherit}
.els-ai-msg{font-size:13px;color:#b4453a}
.els-ai-retry{margin-inline-start:8px;border:1px solid var(--line);background:var(--bg);border-radius:7px;padding:3px 10px;cursor:pointer;font-family:inherit;color:var(--ink2)}
.els-ai-out{background:#eef5ff;border:1px solid #d6e4ff;border-radius:11px;padding:12px 15px;margin-top:6px}
.els-ai-h{font-weight:800;color:#1f6feb;font-size:13.5px}
.els-ai-sum{margin:7px 0;color:var(--ink);font-size:14px;line-height:1.55}
.els-ai-t{font-weight:800;font-size:12.5px;color:var(--ink2);margin-top:6px}
.els-ai-list{margin:4px 0;padding-inline-start:18px}
.els-ai-list li{margin:3px 0;color:var(--ink);font-size:13.5px}
.els-list-h{font-weight:800;font-size:13px;color:var(--ink2);margin-bottom:8px}
.els-list-body{display:flex;flex-direction:column;gap:4px;max-height:340px;overflow:auto}
.els-row{display:flex;align-items:center;gap:9px;width:100%;text-align:start;background:var(--bg);border:1px solid var(--line);
  border-radius:9px;padding:7px 11px;cursor:pointer;font-family:inherit;font-size:13px;color:var(--ink2);transition:.1s}
.els-row:hover{border-color:var(--acc);background:var(--accS)}
.els-row.on{border-color:var(--acc);background:var(--accS);box-shadow:inset 3px 0 0 var(--acc)}
.els-rk{min-width:22px;height:22px;border-radius:6px;background:var(--accS);color:var(--acc);font-weight:800;display:flex;align-items:center;justify-content:center;font-size:12px}
.els-rc b{color:var(--acc)}
.els-rc.muted{color:var(--ink3);margin-inline-start:auto}
.els-rc.warn{color:#b4453a;font-weight:800}
.els-more{font-size:12px;color:var(--ink3);padding:6px 2px}
.els-full{position:fixed;inset:0;z-index:120;background:rgba(20,16,8,.55);backdrop-filter:blur(3px);display:flex;flex-direction:column;padding:14px}
.els-full-bar{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:11px 16px;color:var(--ink)}
.els-x{margin-inline-start:auto;border:1px solid var(--line);background:var(--bg);color:var(--ink2);border-radius:9px;padding:7px 14px;font-weight:800;cursor:pointer;font-family:inherit}
.els-x:hover{border-color:var(--acc);color:var(--acc)}
.els-full-body{flex:1;min-height:0;display:flex;gap:12px;margin-top:12px}
.els-full-grid{flex:1;min-width:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;overflow:auto;display:flex;align-items:flex-start;justify-content:center}
.els-full-side{flex:0 0 320px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;overflow:auto}
@media (max-width:820px){.els-full-body{flex-direction:column}.els-full-side{flex:0 0 auto;max-height:38vh}}
`;
