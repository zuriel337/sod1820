import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase.js";
import { C, F } from "../../theme.js";
import { SectionHeader, GoldButton } from "../../components/ui.jsx";

// ===== ELS — דילוגי אותיות =====
const ELS_SOURCE = `
  בראשית ברא אלהים את השמים ואת הארץ
  והארץ היתה תהו ובהו וחשך על פני תהום ורוח אלהים מרחפת על פני המים
  ויאמר אלהים יהי אור ויהי אור
  וירא אלהים את האור כי טוב ויבדל אלהים בין האור ובין החשך
  ויקרא אלהים לאור יום ולחשך קרא לילה ויהי ערב ויהי בקר יום אחד
  ויאמר אלהים יהי רקיע בתוך המים ויהי מבדיל בין מים למים
  ויעש אלהים את הרקיע ויבדל בין המים אשר מתחת לרקיע ובין המים אשר מעל לרקיע ויהי כן
  ויקרא אלהים לרקיע שמים ויהי ערב ויהי בקר יום שני
`;
const ELS_FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
export function elsNormalize(s) {
  return [...(s || "")].filter(ch => /[א-ת]/.test(ch))
    .map(ch => ELS_FINALS[ch] || ch).join('');
}
const ELS_SAMPLE = elsNormalize(ELS_SOURCE); // fallback אם טעינת התורה נכשלת
const ELS_HIT_CAP = 300; // הגבלת מספר המופעים שנאספים

// צבעים לכל מונח בחיפוש מונחים מרובים (האחראי=זהב)
const ELS_TERM_COLORS = ["#E8C84A", "#a01f2e", "#6b3fa0", "#3a9b6e", "#c77d2e"];

// חיפוש ELS: תומך בסבילות לשגיאות וממוין לפי מובהקות (דילוג קצר קודם)
function elsSearch(letters, targetRaw, skipMin, skipMax, dir, maxMismatches = 0) {
  const target = elsNormalize(targetRaw);
  const N = letters.length, L = target.length;
  const hits = [];
  if (L < 2 || N === 0) return { hits, N, target, capped: false };
  const dirs = dir === 'fwd' ? [1] : dir === 'back' ? [-1] : [1, -1];
  let capped = false;

  for (let start = 0; start < N && !capped; start++) {
    // קפיצה מהירה אפשרית רק בחיפוש מדויק (ללא סבילות)
    if (maxMismatches === 0 && letters[start] !== target[0]) continue;
    for (const d of dirs) {
      for (let skip = skipMin; skip <= skipMax; skip++) {
        const step = skip * d;
        const end = start + step * (L - 1);
        if (end < 0 || end >= N) continue;
        let mm = 0, bad = false;
        for (let k = 0; k < L; k++) {
          if (letters[start + step * k] !== target[k]) {
            if (++mm > maxMismatches) { bad = true; break; }
          }
        }
        if (!bad) {
          const positions = [];
          for (let k = 0; k < L; k++) positions.push(start + step * k);
          hits.push({ skip, dir: d, start, positions, mismatches: mm });
          if (hits.length >= ELS_HIT_CAP) { capped = true; break; }
        }
      }
      if (capped) break;
    }
  }
  // מיון מובהקות: התאמה מדויקת קודם, ואז דילוג קצר קודם
  hits.sort((a, b) => (a.mismatches - b.mismatches) || (Math.abs(a.skip) - Math.abs(b.skip)));
  return { hits, N, target, capped };
}

// אשכול מונחים: מחפש כל מונח, בוחר עוגן (הנדיר ביותר), ומודד קרבה במטריצה
function elsClusters(letters, terms, skipMin, skipMax, dir, maxMismatches) {
  const perTerm = terms.map(t => {
    const r = elsSearch(letters, t, skipMin, skipMax, dir, maxMismatches);
    return { term: r.target, hits: r.hits };
  });
  const missing = perTerm.filter(p => p.hits.length === 0).map(p => p.term);
  const allTerms = perTerm.map(p => p.term);
  if (missing.length) return { clusters: [], missing, terms: allTerms };

  const sorted = [...perTerm].sort((a, b) => a.hits.length - b.hits.length);
  const anchor = sorted[0], others = sorted.slice(1);
  const center = h => (Math.min(...h.positions) + Math.max(...h.positions)) / 2;

  const clusters = [];
  for (const aHit of anchor.hits.slice(0, 200)) {
    const aC = center(aHit);
    const picks = [{ term: anchor.term, hit: aHit }];
    let ok = true;
    for (const o of others) {
      let best = null, bestD = Infinity;
      for (const h of o.hits) {
        const d = Math.abs(center(h) - aC);
        if (d < bestD) { bestD = d; best = h; }
      }
      if (!best) { ok = false; break; }
      picks.push({ term: o.term, hit: best });
    }
    if (!ok) continue;
    const allPos = picks.flatMap(p => p.hit.positions);
    const span = Math.max(...allPos) - Math.min(...allPos);
    clusters.push({ picks, span, anchorHit: aHit });
  }
  clusters.sort((a, b) => a.span - b.span);
  return { clusters: clusters.slice(0, 12), terms: allTerms, anchorTerm: anchor.term };
}

function ELSMatrix({ letters, hit }) {
  const cols = Math.abs(hit.skip);
  // מטריצה רחבה מדי לא ניתנת להצגה — מציגים את הרצף בשורה אחת עם הקשר
  if (cols > 60) {
    const min = Math.min(...hit.positions);
    const max = Math.max(...hit.positions);
    const from = Math.max(0, min - 2);
    const to = Math.min(letters.length, max + 3);
    const set = new Set(hit.positions);
    const cells = [];
    for (let i = from; i < to; i++) {
      const isHit = set.has(i);
      cells.push(
        <span key={i} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 22, padding: "2px 1px", borderRadius: 3, margin: 1,
          background: isHit ? `linear-gradient(135deg, ${C.crimson}, #4a0c14)` : "transparent",
          color: isHit ? C.goldBright : "#6f6347",
          fontWeight: isHit ? 700 : 400,
          boxShadow: isHit ? `0 0 8px rgba(122,19,32,0.6)` : "none",
        }}>{letters[i]}</span>
      );
    }
    return (
      <div style={{ direction: "rtl", fontFamily: F.regal, fontSize: 15, lineHeight: 1.9 }}>
        <div style={{ color: C.goldDim, fontSize: 10, marginBottom: 4 }}>
          דילוג גדול ({cols}) — מוצג הרצף בהקשרו
        </div>
        {cells}
      </div>
    );
  }

  const set = new Set(hit.positions);
  const min = Math.min(...hit.positions);
  const max = Math.max(...hit.positions);
  const startRow = Math.max(0, Math.floor(min / cols) - 1);
  const endRow = Math.min(Math.ceil(letters.length / cols), Math.floor(max / cols) + 2);
  const rows = [];
  for (let r = startRow; r < endRow; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const isHit = set.has(idx);
      rows.push(
        <div key={idx} style={{
          width: 26, height: 30, display: "flex", alignItems: "center",
          justifyContent: "center", borderRadius: 3,
          background: isHit ? `linear-gradient(135deg, ${C.crimson}, #4a0c14)` : "#0a0700",
          color: isHit ? C.goldBright : "#6f6347",
          fontWeight: isHit ? 700 : 400,
          boxShadow: isHit ? `0 0 8px rgba(122,19,32,0.6)` : "none",
        }}>{idx < letters.length ? letters[idx] : ""}</div>
      );
    }
  }
  return (
    <div style={{
      display: "grid", gap: 3, direction: "rtl",
      gridTemplateColumns: `repeat(${cols}, 26px)`,
      fontFamily: F.regal, fontSize: 15, overflowX: "auto", padding: 4,
    }}>{rows}</div>
  );
}

// מטריצת אשכול: כל מונח בצבע משלו, לפי רוחב העוגן
function ELSClusterMatrix({ letters, cluster }) {
  const cols = Math.abs(cluster.anchorHit.skip);
  const colorByIdx = new Map();
  cluster.picks.forEach((p, ti) => {
    const color = ELS_TERM_COLORS[ti % ELS_TERM_COLORS.length];
    p.hit.positions.forEach(idx => colorByIdx.set(idx, color));
  });
  const allPos = cluster.picks.flatMap(p => p.hit.positions);
  const min = Math.min(...allPos), max = Math.max(...allPos);
  const startRow = Math.max(0, Math.floor(min / cols) - 1);
  const endRow = Math.min(Math.ceil(letters.length / cols), Math.floor(max / cols) + 2);
  // מטריצה רחבה/ארוכה מדי — לא מציגים גריד (יוצג סיכום טקסטואלי בלבד)
  if (cols > 60 || (endRow - startRow) > 60) return null;

  const cells = [];
  for (let r = startRow; r < endRow; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const color = colorByIdx.get(idx);
      cells.push(
        <div key={idx} style={{
          width: 24, height: 28, display: "flex", alignItems: "center",
          justifyContent: "center", borderRadius: 3,
          background: color ? color : "#0a0700",
          color: color ? "#0a0700" : "#6f6347",
          fontWeight: color ? 800 : 400,
          boxShadow: color ? `0 0 8px ${color}88` : "none",
        }}>{idx < letters.length ? letters[idx] : ""}</div>
      );
    }
  }
  return (
    <div style={{
      display: "grid", gap: 3, direction: "rtl",
      gridTemplateColumns: `repeat(${cols}, 24px)`,
      fontFamily: F.regal, fontSize: 14, overflowX: "auto", padding: 4,
    }}>{cells}</div>
  );
}

// תצוגת ציר אנכי (העמודה שבה הרצף יורד מלמעלה למטה) + חיפוש פנימי בתוך הציר
function ELSAxisView({ letters, hit, contextRows = 12, innerMaxSkip = 12 }) {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");

  const axis = React.useMemo(() => {
    const S = Math.abs(hit.skip);
    const col = ((hit.start % S) + S) % S;
    const colIdx = [];
    for (let p = col; p < letters.length; p += S) colIdx.push(p);
    const colLetters = colIdx.map(p => letters[p]);
    const posSet = new Set(hit.positions);
    const termRowSet = new Set();
    colIdx.forEach((p, i) => { if (posSet.has(p)) termRowSet.add(i); });
    return { S, col, colLetters, termRowSet };
  }, [letters, hit]);

  const inner = React.useMemo(() => {
    const q = elsNormalize(applied);
    const set = new Set();
    let info = null;
    const { colLetters } = axis;
    if (q.length >= 2) {
      for (let sk = 1; sk <= innerMaxSkip && !info; sk++) {
        for (const d of [1, -1]) {
          let done = false;
          for (let s = 0; s < colLetters.length; s++) {
            const end = s + sk * d * (q.length - 1);
            if (end < 0 || end >= colLetters.length) continue;
            let ok = true;
            for (let k = 0; k < q.length; k++) {
              if (colLetters[s + sk * d * k] !== q[k]) { ok = false; break; }
            }
            if (ok) {
              for (let k = 0; k < q.length; k++) set.add(s + sk * d * k);
              info = { skip: sk, dir: d }; done = true; break;
            }
          }
          if (done) break;
        }
      }
    }
    return { set, info, q };
  }, [applied, axis, innerMaxSkip]);

  const termRows = [...axis.termRowSet];
  const tMin = Math.min(...termRows), tMax = Math.max(...termRows);
  const from = Math.max(0, tMin - contextRows);
  const to = Math.min(axis.colLetters.length, tMax + contextRows + 1);

  const inputStyle = {
    flex: 1, background: "#050400", border: `1px solid ${C.border}`,
    color: C.goldBright, padding: "8px 10px", borderRadius: 6,
    fontFamily: F.royal, fontSize: 14, outline: "none",
  };

  return (
    <div style={{
      marginTop: 12, padding: 14, borderRadius: 8,
      background: "#0a0700", border: `1px solid ${C.border}`,
    }}>
      <div style={{ color: C.goldDim, fontSize: 11, marginBottom: 10, fontFamily: F.heading, letterSpacing: 1 }}>
        ציר אנכי · עמודה {(axis.col + 1).toLocaleString("he")} · דילוג {axis.S} · הרצף יורד מלמעלה למטה
      </div>

      {/* הציר עצמו — אנכי */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        direction: "rtl", fontFamily: F.regal, fontSize: 16,
        maxHeight: 420, overflowY: "auto", padding: "4px 0",
      }}>
        {Array.from({ length: to - from }, (_, j) => {
          const i = from + j;
          const isTerm = axis.termRowSet.has(i);
          const isInner = inner.set.has(i);
          return (
            <div key={i} style={{
              width: 34, height: 30, display: "flex", alignItems: "center",
              justifyContent: "center", borderRadius: 4,
              background: isInner ? "#2f7d57" : isTerm ? `linear-gradient(135deg, ${C.crimson}, #4a0c14)` : "transparent",
              color: (isInner || isTerm) ? C.goldBright : "#6f6347",
              fontWeight: (isInner || isTerm) ? 700 : 400,
              boxShadow: isTerm ? `0 0 8px rgba(122,19,32,0.6)`
                : isInner ? `0 0 8px rgba(58,155,110,0.6)` : "none",
            }}>{axis.colLetters[i]}</div>
          );
        })}
      </div>

      {/* חיפוש פנימי בתוך הציר */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          style={inputStyle}
          value={query}
          placeholder="חיפוש בתוך הציר…"
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && setApplied(query)}
        />
        <button onClick={() => setApplied(query)} style={{
          background: "#2f7d57", color: C.goldBright, border: "none",
          padding: "0 16px", borderRadius: 6, cursor: "pointer",
          fontFamily: F.heading, fontSize: 12, fontWeight: 700, letterSpacing: 1,
        }}>חפש בציר</button>
      </div>
      {applied && (
        <div style={{ marginTop: 8, fontSize: 12.5, fontFamily: F.royal, color: C.muted }}>
          {inner.info
            ? <>נמצא <b style={{ color: "#4fc78c" }}>{inner.q}</b> בתוך הציר (דילוג פנימי {inner.info.skip}, {inner.info.dir === 1 ? "למטה" : "למעלה"})</>
            : <>הביטוי <b style={{ color: C.crimsonLight }}>{inner.q || applied}</b> לא נמצא בתוך הציר (דילוג עד {innerMaxSkip}).</>}
        </div>
      )}
    </div>
  );
}

export function ELSSection() {
  // קישור עמוק — קריאת פרמטרי החיפוש מה-URL
  const deepLink = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("terms");
    if (!t || elsNormalize(t).length < 2) return null;
    const num = k => { const v = parseInt(sp.get(k)); return Number.isFinite(v) ? v : null; };
    return { terms: t, skipMin: num("skipMin"), skipMax: num("skipMax"), dir: sp.get("dir"), mm: num("mm") };
  }, []);

  const sectionRef = useRef(null);
  const [target, setTarget] = useState(deepLink?.terms ?? "אור");
  const [skipMin, setSkipMin] = useState(deepLink?.skipMin ?? 1);
  const [skipMax, setSkipMax] = useState(deepLink?.skipMax ?? 100);
  const [dir, setDir] = useState(deepLink?.dir ?? "both");
  const [maxMismatches, setMaxMismatches] = useState(deepLink?.mm ?? 0);
  const [letters, setLetters] = useState(ELS_SAMPLE); // עד שהתורה נטענת — קטע לדוגמה
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [axisHit, setAxisHit] = useState(null); // המופע שצירו האנכי פתוח
  const [copied, setCopied] = useState(false);
  const [cfg, setCfg] = useState({ contextRows: 12, innerMaxSkip: 12, freeQuota: 5 });

  // טעינת הגדרות הכלי מ-Supabase (טבלת els_settings)
  useEffect(() => {
    supabase.from("els_settings").select("key,value").then(({ data }) => {
      if (!data) return;
      const m = {};
      data.forEach(r => { m[r.key] = r.value; });
      setCfg({
        contextRows: m.axis_context_rows ?? 12,
        innerMaxSkip: m.inner_search_max_skip ?? 12,
        freeQuota: m.free_quota_searches ?? 5,
      });
      // ברירות מחדל מההגדרות — רק אם אין קישור עמוק שגובר עליהן
      if (!deepLink && m.default_skip_min != null) setSkipMin(m.default_skip_min);
      if (!deepLink && m.default_skip_max != null) setSkipMax(m.default_skip_max);
    });
  }, []);

  // טעינת טקסט התורה המלא (עם זיהוי כשל — למשל אם השרת מחזיר HTML במקום הקובץ)
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoadError(false);
    fetch("/torah-letters.txt", { headers: { Accept: "text/plain" } })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(txt => {
        if (!alive) return;
        const clean = elsNormalize(txt);
        if (clean.length > 1000) { setLetters(clean); setLoaded(true); setLoadError(false); }
        else { setLoadError(true); }   // קיבלנו תוכן לא תקין (למשל דף HTML)
      })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [reloadKey]);

  // חיפוש ראשוני / לפי קישור עמוק כשהטקסט מוכן
  useEffect(() => {
    if (deepLink) {
      const lo = Math.max(1, parseInt(skipMin) || 1);
      const hi = Math.max(lo, parseInt(skipMax) || lo);
      const mm = Math.max(0, parseInt(maxMismatches) || 0);
      const terms = deepLink.terms.split(/[,\n]/).map(s => s.trim()).filter(s => elsNormalize(s).length >= 2);
      if (terms.length >= 2) setResult({ mode: "cluster", ...elsClusters(letters, terms, lo, hi, dir, mm) });
      else setResult({ mode: "single", ...elsSearch(letters, terms[0] || deepLink.terms, lo, hi, dir, mm) });
    } else {
      setResult({ mode: "single", ...elsSearch(letters, "אור", 1, 100, "both", 0) });
    }
  }, [letters]);

  // גלילה אוטומטית לכלי כשמגיעים דרך קישור עמוק
  useEffect(() => {
    if (!deepLink) return;
    const t = setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
    return () => clearTimeout(t);
  }, []);

  function run() {
    const lo = Math.max(1, parseInt(skipMin) || 1);
    const hi = Math.max(lo, parseInt(skipMax) || lo);
    const mm = Math.max(0, parseInt(maxMismatches) || 0);
    // מספר מונחים מופרדים בפסיק → חיפוש אשכול
    const terms = target.split(/[,\n]/).map(s => s.trim()).filter(s => elsNormalize(s).length >= 2);
    setAxisHit(null);
    setSearching(true);
    // נותנים ל-UI להתעדכן לפני חישוב כבד
    setTimeout(() => {
      if (terms.length >= 2) {
        setResult({ mode: "cluster", ...elsClusters(letters, terms, lo, hi, dir, mm) });
      } else {
        setResult({ mode: "single", ...elsSearch(letters, terms[0] || target, lo, hi, dir, mm) });
      }
      setSearching(false);
    }, 10);
  }

  // בניית קישור עמוק לחיפוש הנוכחי + העתקה ללוח
  function copyLink() {
    const sp = new URLSearchParams();
    sp.set("terms", target);
    sp.set("skipMin", String(Math.max(1, parseInt(skipMin) || 1)));
    sp.set("skipMax", String(Math.max(1, parseInt(skipMax) || 1)));
    sp.set("dir", dir);
    if (parseInt(maxMismatches) > 0) sp.set("mm", String(parseInt(maxMismatches)));
    const url = `${window.location.origin}/?${sp.toString()}#els`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => { setCopied(true); setTimeout(() => setCopied(false), 2200); },
        () => window.prompt("העתק את הקישור:", url)
      );
    } else {
      window.prompt("העתק את הקישור:", url);
    }
  }

  const inputStyle = {
    width: "100%", background: "#050400", border: `1px solid ${C.border}`,
    color: C.goldBright, padding: "10px 12px", borderRadius: 6,
    fontFamily: F.royal, fontSize: 15, outline: "none",
  };
  const labelStyle = {
    display: "block", fontSize: 11, color: C.goldDim, letterSpacing: 2,
    textTransform: "uppercase", marginBottom: 6, fontFamily: F.heading,
  };

  return (
    <div ref={sectionRef} id="els" style={{
      padding: "80px 24px",
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 100%)`,
      direction: "rtl",
    }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <SectionHeader eyebrow="כלי דילוגי אותיות" title="הצופן שמסתתר בטקסט" />

        <div style={{
          maxWidth: 640, margin: "-32px auto 28px", textAlign: "center",
          color: C.muted, fontSize: 13.5, fontFamily: F.royal, lineHeight: 1.8,
          borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
          padding: "14px 16px",
        }}>
          <b style={{ color: C.goldBright, letterSpacing: 1 }}>עדות — ולא ניבוי.</b>{" "}
          הדילוגים מתעדים התאמות בטקסט הקדום; הם אינם חיזוי עתידות ואינם הוכחה.
          כלי לימוד והתבוננות, לא נבואה.
        </div>

        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>מילת היעד  ·  לאשכול הפרד מונחים בפסיק</label>
              <input style={inputStyle} value={target} maxLength={80}
                placeholder="לדוגמה: משיח, דוד, גאולה"
                onChange={e => setTarget(e.target.value)}
                onKeyDown={e => e.key === "Enter" && run()} />
            </div>
            <div>
              <label style={labelStyle}>דילוג מינימלי</label>
              <input style={inputStyle} type="number" value={skipMin} min={1}
                onChange={e => setSkipMin(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>דילוג מקסימלי</label>
              <input style={inputStyle} type="number" value={skipMax} min={1}
                onChange={e => setSkipMax(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>כיוון</label>
              <select style={inputStyle} value={dir} onChange={e => setDir(e.target.value)}>
                <option value="both">שני הכיוונים</option>
                <option value="fwd">קדימה בלבד</option>
                <option value="back">אחורה בלבד</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>סבילות לשגיאות</label>
              <select style={inputStyle} value={maxMismatches}
                onChange={e => setMaxMismatches(e.target.value)}>
                <option value={0}>התאמה מדויקת</option>
                <option value={1}>עד שגיאה אחת</option>
                <option value={2}>עד 2 שגיאות</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <GoldButton onClick={run} disabled={searching}>
              {searching ? "מחפש…" : "חפש דילוגים ◆"}
            </GoldButton>
            <button onClick={copyLink} style={{
              background: "transparent", color: C.goldBright,
              border: `1px solid ${C.borderGold}`, borderRadius: 6,
              padding: "10px 18px", cursor: "pointer", fontFamily: F.heading,
              fontSize: 12, fontWeight: 700, letterSpacing: 1,
            }}>{copied ? "✓ הקישור הועתק" : "🔗 העתק קישור לחיפוש"}</button>
          </div>
        </div>

        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: 20,
        }}>
          {/* ── מצב יחיד ── */}
          {(!result || result.mode === "single") && (
            <>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, fontFamily: F.royal }}>
                טקסט: <b style={{ color: C.goldBright }}>{(result?.N ?? letters.length).toLocaleString("he")}</b> אותיות ·
                יעד: <b style={{ color: C.goldBright }}>{result?.target || "—"}</b> ·
                נמצאו <b style={{ color: C.goldBright }}>{(result?.hits.length ?? 0).toLocaleString("he")}{result?.capped ? "+" : ""}</b> מופעים
                {(result?.hits.length ?? 0) > 0 && <span> · ממוין לפי מובהקות</span>}
              </div>
              {!result || result.hits.length === 0 ? (
                <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 14 }}>
                  לא נמצאו מופעים. נסה להרחיב את טווח הדילוג, להעלות סבילות לשגיאות, או מילה קצרה יותר.
                </div>
              ) : (
                <>
                  {result.capped && (
                    <div style={{ color: C.goldDim, fontSize: 12, marginBottom: 10, fontFamily: F.royal }}>
                      נמצאו מופעים רבים — מוצגים החזקים ביותר (דילוג קצר). צמצם את הטווח למיקוד.
                    </div>
                  )}
                  {result.hits.slice(0, 6).map((h, i) => (
                    <div key={i} style={{ borderTop: `1px solid ${C.border}`, padding: "14px 0" }}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontFamily: F.royal, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <span>
                          מופע {i + 1} · דילוג <b style={{ color: C.goldBright }}>{h.skip}</b> ·
                          כיוון <b style={{ color: C.goldBright }}>{h.dir === 1 ? "קדימה" : "אחורה"}</b> ·
                          מיקום <b style={{ color: C.goldBright }}>{(h.start + 1).toLocaleString("he")}</b>
                          {h.mismatches > 0 && <> · <b style={{ color: C.crimsonLight }}>{h.mismatches} שגיאות</b></>}
                        </span>
                        <button onClick={() => setAxisHit(axisHit === h ? null : h)} style={{
                          background: axisHit === h ? C.gold : "transparent",
                          color: axisHit === h ? "#0a0700" : C.goldBright,
                          border: `1px solid ${C.borderGold}`, borderRadius: 5,
                          padding: "3px 10px", cursor: "pointer", fontFamily: F.heading,
                          fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                        }}>{axisHit === h ? "סגור ציר ▲" : "ציר אנכי ▼"}</button>
                      </div>
                      <ELSMatrix letters={letters} hit={h} />
                      {axisHit === h && (
                        <ELSAxisView letters={letters} hit={h}
                          contextRows={cfg.contextRows} innerMaxSkip={cfg.innerMaxSkip} />
                      )}
                    </div>
                  ))}
                  {result.hits.length > 6 && (
                    <div style={{ color: C.muted, textAlign: "center", padding: 16, fontSize: 13 }}>
                      ...ועוד {(result.hits.length - 6).toLocaleString("he")}{result.capped ? "+" : ""} מופעים
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── מצב אשכול (מונחים מרובים) ── */}
          {result?.mode === "cluster" && (
            result.missing?.length ? (
              <div style={{ color: C.muted, fontSize: 13.5, fontFamily: F.royal, padding: "8px 0", lineHeight: 1.8 }}>
                המונחים <b style={{ color: C.crimsonLight }}>{result.missing.join(", ")}</b> לא נמצאו בטווח הנוכחי — לכן אין אשכול.
                נסה להרחיב את טווח הדילוג או להעלות סבילות לשגיאות.
              </div>
            ) : (
              <>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, fontFamily: F.royal }}>
                  חיפוש אשכול · מונחים: <b style={{ color: C.goldBright }}>{result.terms.join(" · ")}</b> ·
                  עוגן: <b style={{ color: C.goldBright }}>{result.anchorTerm}</b> ·
                  נמצאו <b style={{ color: C.goldBright }}>{(result.clusters?.length ?? 0).toLocaleString("he")}</b> אשכולות (ממוין לפי קומפקטיות)
                </div>
                {(result.clusters?.length ?? 0) === 0 ? (
                  <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 14 }}>
                    כל המונחים נמצאו בנפרד, אך לא נוצר אשכול קרוב בטווח הזה.
                  </div>
                ) : result.clusters.slice(0, 5).map((cl, ci) => (
                  <div key={ci} style={{ borderTop: `1px solid ${C.border}`, padding: "14px 0" }}>
                    <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10, fontFamily: F.royal }}>
                      אשכול {ci + 1} · כל המונחים בתוך <b style={{ color: C.goldBright }}>{cl.span.toLocaleString("he")}</b> אותיות
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                      {cl.picks.map((p, ti) => (
                        <span key={ti} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontFamily: F.royal, color: C.muted }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: ELS_TERM_COLORS[ti % ELS_TERM_COLORS.length] }} />
                          <b style={{ color: C.goldBright }}>{p.term}</b> (דילוג {p.hit.skip}{p.hit.mismatches > 0 ? `, ${p.hit.mismatches} שג׳` : ""})
                        </span>
                      ))}
                    </div>
                    <ELSClusterMatrix letters={letters} cluster={cl} />
                  </div>
                ))}
              </>
            )
          )}
        </div>

        <div style={{ color: C.goldDim, fontSize: 11, textAlign: "center", marginTop: 24, fontFamily: F.heading, lineHeight: 1.9 }}>
          {loaded
            ? `טקסט המקור: חמשת חומשי התורה · ${letters.length.toLocaleString("he")} אותיות (נוסח קורן המסורתי, נחלת הכלל)`
            : loadError
              ? (
                <span style={{ color: C.crimsonLight }}>
                  ⚠ לא הצלחנו לטעון את טקסט התורה המלא — מוצג קטע דוגמה בלבד, ולכן רוב החיפושים לא יחזירו תוצאות.{" "}
                  <button onClick={() => setReloadKey(k => k + 1)} style={{
                    background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright,
                    borderRadius: 6, padding: "3px 12px", cursor: "pointer", fontFamily: F.heading, fontSize: 11, marginInlineStart: 6,
                  }}>נסה שוב</button>
                </span>
              )
              : "טוען את טקסט התורה המלא…  בינתיים מוצג קטע מבראשית"}
          <br />
          חינם: עד {cfg.freeQuota} חיפושים · גישה מלאה לבני ההיכל (מנוי)
        </div>
      </div>
    </div>
  );
}
