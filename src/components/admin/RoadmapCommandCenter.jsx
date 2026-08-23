// 🧭 מרכז הניהול — מפת העבודה (Roadmap Command Center)
// עדשת-אדמין קוראת-בלבד (CC-1) מעל מפת-העבודה הקנונית. מקור-נתונים יחיד:
// SOD1820_MASTER_ROADMAP.md (v4) — נטען ישירות (?raw), בלי DB, בלי feature-flags,
// בלי מערכת מקבילה. מתעדכן אוטומטית עם המפה. גלוי ≠ מופעל.
// שייך לקבוצת «🎛️ חדר המפקדה» ב-AdminPage; מגודר ב-isAdmin ברמת העמוד.
//
// 🗺️ מצב-מפה תלת-ממדית (החלטת צוריאל 22.8.2026): הרחבה של אותה עדשה עצמה —
// לא ארטיפקט חדש, לא נוגע בהכרעת CC-1-target (Gate #9). ברירת-מחדל = מפה
// תלת-ממדית (RoadmapMap3D, "מרכז המחקר של הפיתוח" עצמו); תצוגת-הטקסט למטה
// נשארת כפתור-מעבר וגם הגיבוי האוטומטי כש-WebGL לא זמין / מסך צר מדי.
import React, { useState, useEffect } from "react";
import roadmapMd from "../../../SOD1820_MASTER_ROADMAP.md?raw";
import RoadmapMap3D, { webglAvailable } from "./RoadmapMap3D.jsx";

// --- markdown → HTML מינימלי, מותאם למבנה של v4 (כותרות/טבלאות/רשימות/ציטוט/קוד) ---
// הקלט הוא קובץ-מקור שלנו (מהימן), לא קלט-משתמש.
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(s) {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return t;
}
function mdToHtml(md) {
  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let i = 0;
  const N = lines.length;
  const parseRow = (r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  while (i < N) {
    const line = lines[i];
    // code fence ```
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < N && !/^```/.test(lines[i])) { buf.push(esc(lines[i])); i++; }
      i++; // דלג על סגירה
      html += "<pre><code>" + buf.join("\n") + "</code></pre>";
      continue;
    }
    // כותרת
    const hm = line.match(/^(#{1,6})\s+(.*)$/);
    if (hm) { const l = hm[1].length; html += `<h${l}>${inline(hm[2])}</h${l}>`; i++; continue; }
    // קו מפריד
    if (/^---+\s*$/.test(line)) { html += "<hr/>"; i++; continue; }
    // טבלת GFM (שורת-כותרת ואחריה שורת-מפריד |---|)
    if (/^\s*\|/.test(line) && i + 1 < N && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      const header = parseRow(line);
      i += 2;
      const body = [];
      while (i < N && /^\s*\|/.test(lines[i])) { body.push(parseRow(lines[i])); i++; }
      let t = '<div class="rcc-tw"><table><thead><tr>' + header.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>";
      t += body.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("");
      t += "</tbody></table></div>";
      html += t;
      continue;
    }
    // ציטוט
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < N && /^>\s?/.test(lines[i])) { buf.push(inline(lines[i].replace(/^>\s?/, ""))); i++; }
      html += "<blockquote>" + buf.join("<br/>") + "</blockquote>";
      continue;
    }
    // רשימה לא-ממוספרת
    if (/^\s*[-*]\s+/.test(line)) {
      const buf = [];
      while (i < N && /^\s*[-*]\s+/.test(lines[i])) { buf.push("<li>" + inline(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>"); i++; }
      html += "<ul>" + buf.join("") + "</ul>";
      continue;
    }
    // רשימה ממוספרת
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < N && /^\s*\d+\.\s+/.test(lines[i])) { buf.push("<li>" + inline(lines[i].replace(/^\s*\d+\.\s+/, "")) + "</li>"); i++; }
      html += "<ol>" + buf.join("") + "</ol>";
      continue;
    }
    // שורה ריקה
    if (/^\s*$/.test(line)) { i++; continue; }
    // פסקה
    const buf = [];
    while (i < N && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|>|\s*[-*]\s|\s*\d+\.\s|```|---+\s*$|\s*\|)/.test(lines[i])) {
      buf.push(inline(lines[i])); i++;
    }
    html += "<p>" + buf.join(" ") + "</p>";
  }
  return html;
}

const CSS = `
.roadmap-cc{background:#11131b;border:1px solid rgba(232,200,74,.14);border-radius:16px;
  padding:16px 18px;color:#dbe0ee;font-family:"Heebo",system-ui,sans-serif;line-height:1.6;direction:rtl}
.roadmap-cc .rcc-banner{display:flex;gap:9px;flex-wrap:wrap;align-items:center;
  background:rgba(232,200,74,.08);border:1px solid rgba(232,200,74,.3);border-radius:12px;
  padding:10px 13px;margin-bottom:16px;font-size:12.5px;font-weight:600;color:#e8c84a}
.roadmap-cc .rcc-banner .s{color:#9aa2b6;font-weight:500}
.roadmap-cc .rcc-banner a{margin-inline-start:auto;color:#8ab4ff;text-decoration:none;font-size:12px}
.roadmap-cc h1{font-size:22px;color:#e8c84a;margin:18px 0 8px;font-weight:800}
.roadmap-cc h2{font-size:18px;color:#efd67a;margin:22px 0 8px;font-weight:700;
  border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:6px}
.roadmap-cc h3{font-size:15px;color:#dfe3ee;margin:16px 0 6px;font-weight:700}
.roadmap-cc h4{font-size:13.5px;color:#c8cfe0;margin:12px 0 5px;font-weight:700}
.roadmap-cc p{margin:8px 0;font-size:13.5px;color:#cdd3e2}
.roadmap-cc strong{color:#fff;font-weight:700}
.roadmap-cc a{color:#8ab4ff}
.roadmap-cc code{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.86em;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:5px;
  padding:1px 5px;direction:ltr;unicode-bidi:isolate;color:#e6c96a}
.roadmap-cc pre{background:#0b0d14;border:1px solid rgba(255,255,255,.08);border-radius:10px;
  padding:12px 14px;overflow-x:auto;-webkit-overflow-scrolling:touch;direction:ltr}
.roadmap-cc pre code{background:none;border:none;padding:0;color:#a7b0c6;font-size:12px;line-height:1.5;white-space:pre}
.roadmap-cc blockquote{margin:10px 0;padding:9px 13px;border-inline-start:3px solid #e8c84a;
  background:rgba(232,200,74,.05);border-radius:8px;font-size:13px;color:#cdd3e2}
.roadmap-cc ul,.roadmap-cc ol{margin:8px 0;padding-inline-start:22px;font-size:13.5px;color:#cdd3e2}
.roadmap-cc li{margin:4px 0}
.roadmap-cc hr{border:none;border-top:1px solid rgba(255,255,255,.09);margin:18px 0}
.roadmap-cc .rcc-tw{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid rgba(255,255,255,.09);
  border-radius:10px;margin:11px 0}
.roadmap-cc table{width:100%;border-collapse:collapse;font-size:12px;min-width:520px}
.roadmap-cc th,.roadmap-cc td{text-align:right;padding:8px 11px;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:top}
.roadmap-cc th{color:#e8c84a;font-weight:700;background:rgba(255,255,255,.03);white-space:nowrap}
.roadmap-cc tbody tr:last-child td{border-bottom:none}
@media(max-width:640px){
  .roadmap-cc{padding:13px 13px}
  .roadmap-cc h1{font-size:19px}.roadmap-cc h2{font-size:16px}
}
`;

export default function RoadmapCommandCenter() {
  const html = React.useMemo(() => mdToHtml(roadmapMd), []);
  // 320 (לא 480): צוריאל ביקש לראות את המפה גם בנייד — הסף הקודם חסם 3D (ועם
  // זה הפך את כפתור "מפה תלת־ממדית" ל-disabled/לא-לחיץ) על רוב הטלפונים
  // הרגילים (~360-430px רוחב), לא רק על מכשירים שבאמת חסרי-WebGL.
  const [canMap, setCanMap] = useState(true);
  useEffect(() => {
    setCanMap(webglAvailable() && window.innerWidth >= 320);
  }, []);
  const [mode, setMode] = useState("map"); // "map" | "text" — ברירת-מחדל: המפה התלת-ממדית
  const effectiveMode = canMap ? mode : "text";

  return (
    <div className="roadmap-cc">
      <style>{CSS}</style>
      <div className="rcc-banner">
        <span>👁️ תצוגת אדמין · קריאה־בלבד</span>
        <span className="s">Lens חי מעל SOD1820_MASTER_ROADMAP.md (v4) · מקור יחיד · אין מערכת מקבילה</span>
        <a href="https://github.com/zuriel337/sod1820/blob/main/SOD1820_MASTER_ROADMAP.md" target="_blank" rel="noreferrer">קובץ המקור ↗</a>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setMode("map")}
          disabled={!canMap}
          title={canMap ? "" : "תלת־הממד אינו זמין (WebGL חסר או מסך צר מדי) — נופל אוטומטית לתצוגת טקסט"}
          style={{
            cursor: canMap ? "pointer" : "not-allowed", opacity: canMap ? 1 : 0.4,
            borderRadius: 999, padding: "6px 14px", fontFamily: "Heebo,system-ui,sans-serif", fontSize: 12.5, fontWeight: 800,
            border: `1px solid ${effectiveMode === "map" ? "#e8c84a" : "rgba(232,200,74,.3)"}`,
            background: effectiveMode === "map" ? "rgba(232,200,74,.16)" : "transparent",
            color: effectiveMode === "map" ? "#e8c84a" : "#9aa2b6",
          }}
        >🌌 מפה תלת־ממדית</button>
        <button
          onClick={() => setMode("text")}
          style={{
            cursor: "pointer",
            borderRadius: 999, padding: "6px 14px", fontFamily: "Heebo,system-ui,sans-serif", fontSize: 12.5, fontWeight: 800,
            border: `1px solid ${effectiveMode === "text" ? "#e8c84a" : "rgba(232,200,74,.3)"}`,
            background: effectiveMode === "text" ? "rgba(232,200,74,.16)" : "transparent",
            color: effectiveMode === "text" ? "#e8c84a" : "#9aa2b6",
          }}
        >📄 טקסט מלא</button>
      </div>

      {effectiveMode === "map"
        ? <RoadmapMap3D height="80vh" />
        : <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
