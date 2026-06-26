import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase.js";
import { C, F, calcGem, KEY_NUMBERS, isWarmNumber } from "../../theme.js";
import { SectionHeader, GoldButton } from "../../components/ui.jsx";
import SubscribeGate from "../../components/SubscribeGate.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { trackShare } from "../../lib/tracking.js";

const ELS_FREE_KEY = "els_free_used";    // מונה חיפושים חינם (אנונימי), נשמר מקומית
const ELS_BONUS_KEY = "els_share_bonus"; // בונוס חיפושים על שיתוף
const ELS_BONUS_PER = 2;                 // חיפושים נוספים לכל שיתוף
const ELS_BONUS_CAP = 8;                 // תקרת בונוס שיתוף מצטבר

// חיפושים מוצעים — לחיצה אחת (מילות מפתח מהאתר)
const ELS_SUGGESTIONS = ["משיח", "גאולה", "ישראל", "דוד", "אליהו", "תורה", "ירושלים", "נחש"];

// משמעות הדילוג: כשהדילוג שווה לגימטריית המילה — ממצא מובהק; או דילוג שהוא מספר-מפתח.
function skipNote(skip, targetGem) {
  if (targetGem && skip === targetGem) return { mark: "✦", text: `הדילוג שווה לגימטריה (${skip})`, key: true };
  if (isWarmNumber(skip)) return { mark: "⭐", text: `דילוג ${skip} · ${KEY_NUMBERS[skip]}`, key: false };
  return null;
}

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
const ELS_HIT_CAP = 5000; // אוסף עד 5000 מופעים — מעשית ללא הגבלה

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

// בניית קנבס המטריצה (משותף להורדה ולשיתוף) — ללא תלות חיצונית
function buildMatrixCanvas(letters, hit, title) {
  const S = Math.abs(hit.skip);
  const set = new Set(hit.positions);
  const cell = 30, pad = 18, headH = 40, footH = 24;
  let cols, rows;
  if (S > 60) {
    const min = Math.min(...hit.positions), max = Math.max(...hit.positions);
    const from = Math.max(0, min - 3), to = Math.min(letters.length, max + 4);
    const row = [];
    for (let i = from; i < to; i++) row.push({ ch: letters[i], hl: set.has(i) });
    cols = row.length; rows = [row];
  } else {
    cols = S;
    const min = Math.min(...hit.positions), max = Math.max(...hit.positions);
    const startRow = Math.max(0, Math.floor(min / cols) - 1);
    const endRow = Math.min(Math.ceil(letters.length / cols), Math.floor(max / cols) + 2);
    rows = [];
    for (let r = startRow; r < endRow; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) { const idx = r * cols + c; row.push({ ch: idx < letters.length ? letters[idx] : "", hl: set.has(idx) }); }
      rows.push(row);
    }
  }
  const W = pad * 2 + cols * cell, H = pad * 2 + headH + rows.length * cell + footH;
  const cv = document.createElement("canvas");
  const scale = 2; cv.width = W * scale; cv.height = H * scale;
  const g = cv.getContext("2d"); g.scale(scale, scale);
  g.fillStyle = "#0a0700"; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#E8C84A"; g.font = "bold 18px 'Frank Ruhl Libre', serif";
  g.fillText(title, W / 2, pad + headH / 2);
  g.font = "bold 17px 'Frank Ruhl Libre', serif";
  rows.forEach((row, r) => row.forEach((cl, c) => {
    const x = pad + (cols - 1 - c) * cell, y = pad + headH + r * cell; // RTL
    if (cl.hl) { g.fillStyle = "#7a1320"; g.fillRect(x + 1, y + 1, cell - 2, cell - 2); g.fillStyle = "#E8C84A"; }
    else g.fillStyle = "#6f6347";
    if (cl.ch) g.fillText(cl.ch, x + cell / 2, y + cell / 2);
  }));
  g.fillStyle = "#9a7818"; g.font = "12px 'Heebo', sans-serif";
  g.fillText("סוד 1820 · הצופן התנ\"כי · sod1820.co.il", W / 2, H - footH / 2);
  return cv;
}

const matrixFileName = title => `els-${(title || "matrix").replace(/[^\w֐-׿]+/g, "-")}.png`;

// בניית קנבס הציר האנכי — המילה יורדת בעמודה אחת, ממורכזת, עם הקשר
function buildAxisCanvas(letters, hit, title, contextRows = 14) {
  const S = Math.abs(hit.skip);
  const col = ((hit.start % S) + S) % S;
  const colIdx = [];
  for (let p = col; p < letters.length; p += S) colIdx.push(p);
  const posSet = new Set(hit.positions);
  const termRows = [];
  colIdx.forEach((p, i) => { if (posSet.has(p)) termRows.push(i); });
  const tMin = Math.min(...termRows), tMax = Math.max(...termRows);
  const from = Math.max(0, tMin - contextRows), to = Math.min(colIdx.length, tMax + contextRows + 1);
  const rows = to - from;
  const cellH = 30, cellW = 46, pad = 18, headH = 40, footH = 24;
  const W = Math.max(pad * 2 + cellW, 260);
  const H = pad * 2 + headH + rows * cellH + footH;
  const cv = document.createElement("canvas");
  const scale = 2; cv.width = W * scale; cv.height = H * scale;
  const g = cv.getContext("2d"); g.scale(scale, scale);
  g.fillStyle = "#0a0700"; g.fillRect(0, 0, W, H);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#E8C84A"; g.font = "bold 16px 'Frank Ruhl Libre', serif";
  g.fillText(title, W / 2, pad + headH / 2);
  g.font = "bold 18px 'Frank Ruhl Libre', serif";
  for (let i = from; i < to; i++) {
    const y = pad + headH + (i - from) * cellH;
    if (posSet.has(colIdx[i])) {
      g.fillStyle = "#7a1320"; g.fillRect(W / 2 - cellW / 2 + 3, y + 1, cellW - 6, cellH - 2);
      g.fillStyle = "#E8C84A";
    } else g.fillStyle = "#6f6347";
    g.fillText(letters[colIdx[i]], W / 2, y + cellH / 2);
  }
  g.fillStyle = "#9a7818"; g.font = "12px 'Heebo', sans-serif";
  g.fillText("סוד 1820 · הצופן התנ\"כי · sod1820.co.il", W / 2, H - footH / 2);
  return cv;
}

// בוחר את הקנבס לפי התצוגה הנוכחית (ציר/טבלה)
const pickCanvas = (mode, letters, hit, title) =>
  mode === "axis" ? buildAxisCanvas(letters, hit, title) : buildMatrixCanvas(letters, hit, title);

// ייצוא התצוגה הנוכחית כתמונת PNG (הורדה)
function downloadMatrixPNG(letters, hit, title, mode) {
  try {
    pickCanvas(mode, letters, hit, title).toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = matrixFileName(title); a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    });
  } catch { alert("שמירת התמונה נכשלה — נסו שוב."); }
}

// שיתוף התצוגה כתמונה — שיתוף מקורי (וואטסאפ וכו') במובייל, ובמחשב נופל להורדה
async function shareMatrixPNG(letters, hit, title, mode) {
  try {
    const cv = pickCanvas(mode, letters, hit, title);
    const blob = await new Promise(res => cv.toBlob(res, "image/png"));
    const file = new File([blob], matrixFileName(title), { type: "image/png" });
    const shareText = `${title} — הצופן התנ״כי · סוד 1820\nגלו עוד דילוגים: https://sod1820.co.il/code`;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      trackShare("native", "els-matrix");
      await navigator.share({ files: [file], title: "הצופן התנ״כי · סוד 1820", text: shareText });
    } else {
      // אין שיתוף קבצים (רוב הדפדפנים בדסקטופ) → מורידים את התמונה
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = matrixFileName(title); a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    return true;   // שיתוף/הורדה הצליחו
  } catch (e) {
    if (e && e.name === "AbortError") return false;   // המשתמש ביטל את חלון השיתוף
    alert("שיתוף התמונה נכשל — נסו 'שמור כתמונה'.");
    return false;
  }
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

  // ממקמים את הרצף במרכז חלון הציר (גלילה אוטומטית) — כך המילה תמיד באמצע המסך
  const scrollRef = useRef(null);
  const ROW_PITCH = 32; // גובה תא (30) + רווח (2)
  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    const mid = ((tMin + tMax) / 2 - from) * ROW_PITCH;   // מרכז הרצף
    c.scrollTop = Math.max(0, mid - c.clientHeight / 2 + ROW_PITCH / 2);
  }, [hit, from, tMin, tMax]);

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
      <div ref={scrollRef} style={{
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

export function ELSSection({ gated = false } = {}) {
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
  const gateRef = useRef(null);
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
  const [selectedIdx, setSelectedIdx] = useState(0);   // המופע המוצג בטבלה האחת
  const [tableMode, setTableMode] = useState("axis");  // axis | grid — ברירת מחדל: ציר אנכי מרכזי
  const [copied, setCopied] = useState(false);
  const [myName, setMyName] = useState("");   // חיפוש שם אישי
  const [showHelp, setShowHelp] = useState(false);  // פאנל "כל הפעולות"
  const [cfg, setCfg] = useState({ contextRows: 12, innerMaxSkip: 12, freeQuota: 5 });
  const [usedSearches, setUsedSearches] = useState(() => {
    try { return parseInt(localStorage.getItem(ELS_FREE_KEY)) || 0; } catch { return 0; }
  });
  const [shareBonus, setShareBonus] = useState(() => {
    try { return parseInt(localStorage.getItem(ELS_BONUS_KEY)) || 0; } catch { return 0; }
  });
  const [bonusToast, setBonusToast] = useState("");
  const freeLimit = (cfg.freeQuota ?? 5) + shareBonus;   // מכסה + בונוס שיתוף
  const freeLeft = Math.max(0, freeLimit - usedSearches);
  const gateLocked = gated && freeLeft <= 0;   // נגמרה המכסה החינמית

  // ── לוח תגליות הגולשים ──
  const { user, verified, isAdmin } = useAuth();
  const [finds, setFinds] = useState([]);
  const [saving, setSaving] = useState(false);
  const loadFinds = () => {
    supabase.from("els_finds").select("id,term,value,skip,dir,start_pos,user_id,created_at")
      .eq("approved", true).order("created_at", { ascending: false }).limit(40)
      .then(({ data }) => setFinds(data || []));
  };
  useEffect(() => { loadFinds(); }, []);

  // מחיקת ממצא — לאדמין (כל ממצא) או לבעלים (הממצא שלו)
  async function deleteFind(id, e) {
    e.stopPropagation();
    if (!window.confirm("למחוק את הממצא מהלוח?")) return;
    const { error } = await supabase.from("els_finds").delete().eq("id", id);
    if (!error) setFinds(fs => fs.filter(f => f.id !== id));
    else { setBonusToast("המחיקה נכשלה"); setTimeout(() => setBonusToast(""), 3000); }
  }

  // שמירת ממצא ללוח הגולשים (דורש התחברות — תמריץ הרשמה נוסף)
  async function saveFind(hit) {
    if (!verified || !user) {
      setBonusToast("התחברו (חינם) כדי לשמור ולשתף ממצא עם הקהילה");
      setTimeout(() => setBonusToast(""), 3600);
      gateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("els_finds").insert({
      term: result?.target || target, value: calcGem(result?.target || target),
      skip: hit.skip, dir: hit.dir, start_pos: hit.start, user_id: user.id,
    });
    setSaving(false);
    setBonusToast(error ? "השמירה נכשלה — נסו שוב" : "✓ הממצא נשמר ללוח תגליות הגולשים");
    setTimeout(() => setBonusToast(""), 3600);
    if (!error) loadFinds();
  }

  // טעינת ממצא מהלוח → חיפוש חוזר מדויק (לא תלוי בעדכון ה-state האסינכרוני)
  function loadFind(f) {
    const d = f.dir === 1 ? "fwd" : "back";
    setTarget(f.term);
    setSkipMin(f.skip); setSkipMax(f.skip); setDir(d); setMaxMismatches(0);
    run(f.term, { lo: f.skip, hi: f.skip, dir: d, mm: 0 });
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // בונוס שיתוף — מי שמשתף מקבל חיפושים חינם נוספים ("העבירו את האור הלאה")
  function grantShareBonus() {
    if (!gated) return;   // משתמש רשום/אדמין — ללא הגבלה ממילא
    setShareBonus(b => {
      if (b >= ELS_BONUS_CAP) { setBonusToast("תודה ששיתפת! 🙏 (כבר קיבלת את בונוס השיתוף המלא)"); return b; }
      const nb = Math.min(ELS_BONUS_CAP, b + ELS_BONUS_PER);
      try { localStorage.setItem(ELS_BONUS_KEY, String(nb)); } catch { /* ignore */ }
      setBonusToast(`✨ תודה ששיתפת! קיבלת +${nb - b} חיפושים חינם`);
      return nb;
    });
    setTimeout(() => setBonusToast(""), 3600);
  }

  // שיתוף הכלי עצמו (קישור/דף) → מזכה בבונוס. זמין תמיד, גם כששער ההרשמה נעול.
  async function shareTool() {
    const url = "https://sod1820.co.il/code";
    const text = "מצאתי דברים מדהימים בצופן התנ״כי של סוד 1820 — חפשו גם אתם את השם שלכם בתורה:";
    try {
      if (navigator.share) { trackShare("native", "els-tool"); await navigator.share({ title: "הצופן התנ״כי · סוד 1820", text, url }); grantShareBonus(); }
      else if (navigator.clipboard?.writeText) { trackShare("copy", "els-tool"); await navigator.clipboard.writeText(`${text} ${url}`); grantShareBonus(); }
      else { trackShare("copy", "els-tool"); window.prompt("העתיקו ושתפו:", url); grantShareBonus(); }
    } catch (e) { if (e && e.name === "AbortError") return; /* ביטול — בלי בונוס */ }
  }

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

  // תוצאה חדשה → מאפסים את הבחירה; ברירת המחדל היא הציר האנכי (המילה במרכז המסך)
  useEffect(() => { setSelectedIdx(0); setTableMode("axis"); }, [result]);

  function run(override, opts) {
    const src = typeof override === "string" ? override : target;
    // מכסת חיפושים חינם (אנונימי) — בסיום המכסה מציגים שער הרשמה ולא מחפשים
    if (gated && freeLeft <= 0) {
      gateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (gated) {
      const n = usedSearches + 1;
      setUsedSearches(n);
      try { localStorage.setItem(ELS_FREE_KEY, String(n)); } catch { /* ignore */ }
    }
    const lo = opts?.lo ?? Math.max(1, parseInt(skipMin) || 1);
    const hi = opts?.hi ?? Math.max(lo, parseInt(skipMax) || lo);
    const mm = opts?.mm ?? Math.max(0, parseInt(maxMismatches) || 0);
    const dirUse = opts?.dir ?? dir;
    // מספר מונחים מופרדים בפסיק → חיפוש אשכול
    const terms = src.split(/[,\n]/).map(s => s.trim()).filter(s => elsNormalize(s).length >= 2);
    setAxisHit(null);
    setSearching(true);
    // נותנים ל-UI להתעדכן לפני חישוב כבד
    setTimeout(() => {
      if (terms.length >= 2) {
        setResult({ mode: "cluster", ...elsClusters(letters, terms, lo, hi, dirUse, mm) });
      } else {
        setResult({ mode: "single", ...elsSearch(letters, terms[0] || src, lo, hi, dirUse, mm) });
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

        {/* 🪪 חפשו את שמכם בתורה — שער כניסה אישי ומזמין */}
        <div style={{
          background: "linear-gradient(160deg, rgba(212,175,55,0.10), rgba(20,15,12,0.5))",
          border: `1px solid ${C.borderGold}`, borderRadius: 12, padding: "18px 20px", marginBottom: 18, textAlign: "center",
        }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginBottom: 4 }}>🪪 חפשו את שִמכם בתורה</div>
          <div style={{ color: C.muted, fontFamily: F.royal, fontSize: 13.5, lineHeight: 1.7, marginBottom: 12 }}>
            הקלידו שם פרטי — והמנוע יחפש אותו כדילוג אותיות בכל חמשת חומשי התורה, ממוין לפי מובהקות (הדילוג הקצר ביותר ראשון).
          </div>
          <form onSubmit={e => { e.preventDefault(); const n = myName.trim(); if (elsNormalize(n).length >= 2) { setTarget(n); run(n); } }}
            style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <input value={myName} maxLength={40} onChange={e => setMyName(e.target.value)} placeholder="השם שלכם…" dir="rtl"
              style={{ ...inputStyle, width: "auto", flex: "1 1 220px", maxWidth: 320, textAlign: "center" }} />
            <GoldButton type="submit" disabled={searching || gateLocked || elsNormalize(myName).length < 2}>חפשו אותי בתורה ✦</GoldButton>
          </form>
          {elsNormalize(myName).length >= 2 && (
            <div style={{ color: C.goldDim, fontFamily: F.royal, fontSize: 12.5, marginTop: 9 }}>
              גימטריית «{myName.trim()}» = <b style={{ color: C.goldLight }}>{calcGem(myName).toLocaleString("he")}</b>
            </div>
          )}
        </div>

        {/* ❓ כל הפעולות האפשריות — מדריך מתקפל */}
        <div style={{ marginBottom: 18 }}>
          <button onClick={() => setShowHelp(v => !v)} style={{
            cursor: "pointer", width: "100%", background: "transparent", color: C.goldLight,
            border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px",
            fontFamily: F.heading, fontSize: 13, fontWeight: 700, letterSpacing: 1, textAlign: "right",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>❓ כל הפעולות האפשריות בכלי</span><span>{showHelp ? "▲" : "▼"}</span>
          </button>
          {showHelp && (
            <div style={{ border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "6px 16px 14px", background: "rgba(10,7,0,0.5)" }}>
              {[
                ["🔍", "חיפוש מילה יחידה", "מאתר כל המופעים של מילה כדילוג אותיות בכל התורה."],
                ["🧩", "חיפוש אשכול", "כמה מונחים מופרדים בפסיק — מוצא היכן הם נפגשים קרוב זה לזה במטריצה."],
                ["🪪", "חיפוש שם אישי", "הקלידו שם פרטי ומצאו אותו בתורה (השער למעלה)."],
                ["↔️", "כיוון חיפוש", "קדימה בלבד · אחורה בלבד · שני הכיוונים."],
                ["📏", "טווח דילוג", "דילוג מינימלי עד מקסימלי — קצר = מובהק יותר."],
                ["🎯", "סבילות לשגיאות", "התאמה מדויקת, או עד 1–2 אותיות שונות."],
                ["🔢", "גימטריה", "ערך המילה מוצג; באדג' ✦ כשהדילוג שווה לגימטריה, ⭐ כשהוא מספר-מפתח."],
                ["▦", "מטריצה / ציר אנכי", "שתי תצוגות למופע, כולל חיפוש פנימי בתוך הציר."],
                ["📲", "שמירה ושיתוף", "ייצוא המטריצה כתמונה ממותגת — שמירה או שיתוף ישיר לוואטסאפ."],
                ["🔗", "קישור עמוק", "העתקת קישור שמשחזר בדיוק את החיפוש הנוכחי."],
              ].map(([ic, t, d]) => (
                <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 17, flexShrink: 0, width: 24, textAlign: "center" }}>{ic}</span>
                  <div>
                    <b style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 13.5 }}>{t}</b>
                    <span style={{ color: C.muted, fontFamily: F.royal, fontSize: 13, lineHeight: 1.6 }}> — {d}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <GoldButton onClick={run} disabled={searching || gateLocked}>
              {searching ? "מחפש…" : "חפש דילוגים ◆"}
            </GoldButton>
            <button onClick={copyLink} style={{
              background: "transparent", color: C.goldBright,
              border: `1px solid ${C.borderGold}`, borderRadius: 6,
              padding: "10px 18px", cursor: "pointer", fontFamily: F.heading,
              fontSize: 12, fontWeight: 700, letterSpacing: 1,
            }}>{copied ? "✓ הקישור הועתק" : "🔗 העתק קישור לחיפוש"}</button>
          </div>

          {/* חיפושים מוצעים — לחיצה אחת */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginTop: 14 }}>
            <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 1, alignSelf: "center" }}>נסו:</span>
            {ELS_SUGGESTIONS.map(w => (
              <button key={w} onClick={() => { setTarget(w); run(w); }} disabled={searching || gateLocked} style={{
                cursor: "pointer", background: "rgba(212,175,55,0.07)", color: C.goldLight,
                border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 13px",
                fontFamily: F.royal, fontSize: 13, fontWeight: 700,
              }}>{w} <span style={{ color: C.goldDim, fontSize: 11 }}>({calcGem(w)})</span></button>
            ))}
          </div>
        </div>

        {/* מכסת חיפושים חינם — באנר לאנונימי */}
        {gated && !gateLocked && (
          <div style={{
            margin: "0 0 16px", padding: "10px 14px", borderRadius: 8,
            background: "rgba(212,175,55,0.06)", border: `1px solid ${C.border}`,
            color: C.goldLight, fontFamily: F.royal, fontSize: 13,
            display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "center",
          }}>
            <span>🔓 נותרו לכם <b style={{ color: C.goldBright }}>{freeLeft.toLocaleString("he")}</b> חיפושים חינם{shareBonus > 0 ? <span style={{ color: C.goldDim }}> (כולל +{shareBonus} בונוס שיתוף)</span> : null} · הרשמה = <b>בלי הגבלה</b></span>
            {shareBonus < ELS_BONUS_CAP && (
              <button onClick={shareTool} style={{
                cursor: "pointer", background: "rgba(212,175,55,0.14)", color: C.goldBright,
                border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "5px 14px",
                fontFamily: F.heading, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
              }}>📲 שתפו וקבלו +{ELS_BONUS_PER}</button>
            )}
          </div>
        )}

        {/* שער הרשמה — בסיום המכסה החינמית. עדיין אפשר לשתף ולהרוויח חיפושים */}
        {gateLocked && (
          <div ref={gateRef}>
            {shareBonus < ELS_BONUS_CAP && (
              <div style={{
                textAlign: "center", margin: "0 0 14px", padding: "12px 16px", borderRadius: 10,
                background: "rgba(212,175,55,0.08)", border: `1px solid ${C.borderGold}`,
                color: C.goldLight, fontFamily: F.royal, fontSize: 13.5, lineHeight: 1.7,
              }}>
                רוצים עוד חיפושים בלי הרשמה? <b style={{ color: C.goldBright }}>העבירו את האור הלאה</b> —{" "}
                <button onClick={shareTool} style={{
                  cursor: "pointer", background: C.gold, color: "#0a0700", border: "none",
                  borderRadius: 999, padding: "5px 16px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, margin: "0 2px",
                }}>📲 שתפו וקבלו +{ELS_BONUS_PER} חיפושים</button>
              </div>
            )}
            <SubscribeGate source="code" />
          </div>
        )}

        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: 20,
          ...(gateLocked ? { opacity: 0.5, pointerEvents: "none", filter: "blur(1px)" } : null),
        }}>
          {/* ── מצב יחיד ── */}
          {(!result || result.mode === "single") && (
            <>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, fontFamily: F.royal }}>
                טקסט: <b style={{ color: C.goldBright }}>{(result?.N ?? letters.length).toLocaleString("he")}</b> אותיות ·
                יעד: <b style={{ color: C.goldBright }}>{result?.target || "—"}</b>
                {result?.target && <span> · גימטריה <b style={{ color: C.goldLight }}>{calcGem(result.target).toLocaleString("he")}</b></span>} ·
                נמצאו <b style={{ color: C.goldBright }}>{(result?.hits.length ?? 0).toLocaleString("he")}{result?.capped ? "+" : ""}</b> מופעים
                {(result?.hits.length ?? 0) > 0 && <span> · ממוין לפי מובהקות</span>}
              </div>
              {!result || result.hits.length === 0 ? (
                <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 14 }}>
                  לא נמצאו מופעים. נסה להרחיב את טווח הדילוג, להעלות סבילות לשגיאות, או מילה קצרה יותר.
                </div>
              ) : (() => {
                const sel = result.hits[Math.min(selectedIdx, result.hits.length - 1)] || result.hits[0];
                const targetGem = calcGem(result.target);
                const selNote = skipNote(sel.skip, targetGem);
                return (
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                  {/* רשימת התוצאות — לפי מובהקות (דילוג קצר קודם) */}
                  <div style={{ flex: "1 1 210px", minWidth: 180, maxWidth: 300, maxHeight: 540, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, background: "#0a0700" }}>
                    <div style={{ position: "sticky", top: 0, background: "#0a0700", color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 1, padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
                      {result.hits.length.toLocaleString("he")}{result.capped ? "+" : ""} מופעים · בחרו לצפייה
                    </div>
                    {result.hits.slice(0, 600).map((h, i) => {
                      const on = h === sel;
                      return (
                        <button key={i} onClick={() => setSelectedIdx(i)} style={{
                          display: "block", width: "100%", textAlign: "right", cursor: "pointer",
                          background: on ? "rgba(212,175,55,0.14)" : "transparent", border: "none",
                          borderBottom: `1px solid ${C.border}`, borderInlineStart: `3px solid ${on ? C.gold : "transparent"}`,
                          color: on ? C.goldBright : C.muted, fontFamily: F.royal, fontSize: 12.5, padding: "9px 12px",
                        }}>
                          <b style={{ color: on ? C.goldBright : C.goldLight }}>#{i + 1}</b> · דילוג {h.skip} · {h.dir === 1 ? "→" : "←"} · מיקום {(h.start + 1).toLocaleString("he")}
                          {h.mismatches > 0 && <span style={{ color: C.crimsonLight }}> · {h.mismatches} שג׳</span>}
                          {(() => { const n = skipNote(h.skip, targetGem); return n ? <span title={n.text} style={{ color: n.key ? C.goldBright : C.gold }}> {n.mark}</span> : null; })()}
                        </button>
                      );
                    })}
                    {result.hits.length > 600 && (
                      <div style={{ color: C.goldDim, fontSize: 11, padding: "8px 12px", textAlign: "center" }}>
                        ...ועוד {(result.hits.length - 600).toLocaleString("he")} — צמצמו את הטווח למיקוד
                      </div>
                    )}
                  </div>

                  {/* טבלה אחת — המופע הנבחר; כפתור להחלפת ציר */}
                  <div style={{ flex: "3 1 320px", minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                      <span style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 14 }}>
                        מופע #{Math.min(selectedIdx, result.hits.length - 1) + 1} · דילוג <b>{sel.skip}</b> · {sel.dir === 1 ? "קדימה" : "אחורה"} · מיקום {(sel.start + 1).toLocaleString("he")}
                      </span>
                      {selNote && (
                        <span title={selNote.text} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: selNote.key ? "rgba(212,175,55,0.16)" : "rgba(212,175,55,0.08)",
                          border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "3px 11px",
                          color: selNote.key ? C.goldBright : C.goldLight, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700,
                        }}>{selNote.mark} {selNote.text}</span>
                      )}
                      <span style={{ flex: 1 }} />
                      {[["axis", "ציר אנכי ▼"], ["grid", "טבלה ▦"]].map(([mode, lbl]) => (
                        <button key={mode} onClick={() => setTableMode(mode)} style={{
                          cursor: "pointer", background: tableMode === mode ? C.gold : "transparent",
                          color: tableMode === mode ? "#0a0700" : C.goldBright, border: `1px solid ${C.borderGold}`,
                          borderRadius: 6, padding: "4px 13px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700,
                        }}>{lbl}</button>
                      ))}
                      <button onClick={() => downloadMatrixPNG(letters, sel, `${result.target} · דילוג ${sel.skip}`, tableMode)} title="שמור את התצוגה כתמונה" style={{
                        cursor: "pointer", background: "transparent", color: C.goldBright, border: `1px solid ${C.borderGold}`,
                        borderRadius: 6, padding: "4px 13px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700,
                      }}>📷 שמור כתמונה</button>
                      <button onClick={async () => { const ok = await shareMatrixPNG(letters, sel, `${result.target} · דילוג ${sel.skip}`, tableMode); if (ok) grantShareBonus(); }} title="שתף את התצוגה כתמונה" style={{
                        cursor: "pointer", background: C.gold, color: "#0a0700", border: `1px solid ${C.borderGold}`,
                        borderRadius: 6, padding: "4px 13px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700,
                      }}>📲 שתף{gated ? ` (+${ELS_BONUS_PER})` : ""}</button>
                      <button onClick={() => saveFind(sel)} disabled={saving} title="שמרו את הממצא ללוח תגליות הגולשים" style={{
                        cursor: "pointer", background: "transparent", color: C.goldBright, border: `1px solid ${C.borderGold}`,
                        borderRadius: 6, padding: "4px 13px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700,
                      }}>💾 שמרו ממצא</button>
                    </div>
                    {tableMode === "grid"
                      ? <ELSMatrix letters={letters} hit={sel} />
                      : <ELSAxisView letters={letters} hit={sel} contextRows={cfg.contextRows} innerMaxSkip={cfg.innerMaxSkip} />}
                  </div>
                </div>
                );
              })()}
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

        {/* 🏆 לוח תגליות הגולשים — ממצאים שמורים, לחיצה טוענת את החיפוש המדויק */}
        <div style={{ marginTop: 30 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 800, margin: 0 }}>🏆 תגליות הגולשים</h3>
            <span style={{ color: C.goldDim, fontFamily: F.royal, fontSize: 12.5 }}>ממצאים ששמרו הגולשים · לחצו לטעינת החיפוש</span>
          </div>
          {finds.length === 0 ? (
            <div style={{ color: C.muted, fontFamily: F.royal, fontSize: 13.5, padding: "14px 4px", lineHeight: 1.8 }}>
              עדיין אין ממצאים שמורים. מצאו דילוג מעניין ולחצו <b style={{ color: C.goldLight }}>💾 שמרו ממצא</b> — וזה יופיע כאן לכולם.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
              {finds.map(f => (
                <div key={f.id} onClick={() => loadFind(f)} role="button" tabIndex={0} title="טען חיפוש זה" style={{
                  position: "relative", cursor: "pointer", textAlign: "right", background: "rgba(20,15,12,0.5)",
                  border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px",
                  display: "flex", flexDirection: "column", gap: 5,
                }}>
                  <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 15, fontWeight: 700, paddingInlineEnd: (isAdmin || (user && f.user_id === user.id)) ? 22 : 0 }}>{f.term}</span>
                  <span style={{ color: C.muted, fontFamily: F.royal, fontSize: 12 }}>
                    גימטריה {(f.value ?? 0).toLocaleString("he")} · דילוג {f.skip} · {f.dir === 1 ? "→" : "←"}
                  </span>
                  {(isAdmin || (user && f.user_id === user.id)) && (
                    <button onClick={e => deleteFind(f.id, e)} title="מחק ממצא" style={{
                      position: "absolute", top: 6, insetInlineEnd: 6, cursor: "pointer",
                      background: "transparent", border: "none", color: C.crimsonLight, fontSize: 14, lineHeight: 1, padding: 2,
                    }}>🗑</button>
                  )}
                </div>
              ))}
            </div>
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
          {gated
            ? <>חיפוש חינם · הרשמה פותחת ללא הגבלה · שיתוף מזכה בחיפושים נוספים ✦</>
            : <>חיפוש חופשי · ללא הגבלה ✦</>}
        </div>
      </div>

      {/* טוסט בונוס שיתוף */}
      {bonusToast && (
        <div style={{
          position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 300,
          background: "linear-gradient(160deg, rgba(30,22,6,0.98), rgba(10,7,0,0.98))",
          border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "11px 22px",
          color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700,
          boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(212,175,55,0.3)`, direction: "rtl",
        }}>{bonusToast}</div>
      )}
    </div>
  );
}
