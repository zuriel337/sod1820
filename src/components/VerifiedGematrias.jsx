import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { getWriterGematrias } from "../lib/contributions.js";

// 🔢 הגימטריות המאומתות של הכתב — מקום אחד, רק מה שאומת ואושר. מאחד שני מקורות:
//   • gematria_words  — source='contribution:<שם>' , is_verified  (קוהורטים שהוזרמו, למשל צבי=227)
//   • writer_gematria_findings (RPC · SECURITY DEFINER) — חידושי-הכתב הפורסמו עם ערך-מנוע
//     (יניב/שחר/ציון). ⚠️ חובה RPC ולא שאילתה-ישירה: RLS על research_contributions חושף רק
//     status='approved' ל-anon, אבל הגימטריות שלהם status='published' → שאילתה-ישירה מחזירה 0.
// כל ביטוי → דף-המספר הקנוני. עץ אחד: מצביע, לא משכפל. (writers_page_law)
const stripNikud = (s) => (s || "").replace(/[֑-ׇ]/g, "");
// חילוץ {ביטוי,ערך} מממצא-כתב: claim="צירוף מקרים=776" / value=776 → {phrase:"צירוף מקרים", value:776}
function parseFinding(r) {
  const value = Number(r.value);
  if (!Number.isFinite(value) || value <= 0) return null;
  let phrase = stripNikud(String(r.claim || "")).split("\n")[0]
    .replace(/\s*=\s*\d[\d\s.,!?]*$/, "").replace(/\s*=\s*\d+.*$/, "")   // הסרת «=מספר…»
    .replace(/[!?.·\-\s]+$/, "").replace(/^[(（[\s]+|[)）\]\s]+$/g, "").trim();  // סימני-קצה/סוגריים
  if (!phrase || phrase.length > 60 || !/[א-ת]/.test(phrase)) return null;
  return { phrase, value, method: r.method || null };   // method = שיטה לא-רגילה (מסתתר/מילוי/את־בש…) לתיוג
}

export default function VerifiedGematrias({ name, acc, uid }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  const A = acc || P.accent;

  useEffect(() => {
    if (!name) return;
    let alive = true;
    (async () => {
      const [bank, findings] = await Promise.all([
        supabase.from("gematria_words").select("phrase,ragil")
          .eq("source", `contribution:${name}`).eq("is_verified", true).not("ragil", "is", null).limit(400),
        getWriterGematrias(name, uid || null),   // RPC — עוקף RLS, כולל published
      ]);
      const map = new Map();
      for (const r of (bank.data || [])) {
        if (r.phrase && r.ragil != null) map.set(`${r.phrase}|${r.ragil}`, { phrase: r.phrase, value: r.ragil });
      }
      for (const r of (Array.isArray(findings) ? findings : [])) {
        const g = parseFinding(r);
        if (g) map.set(`${g.phrase}|${g.value}`, g);
      }
      const list = [...map.values()].sort((a, b) => a.value - b.value);
      if (alive) setRows(list);
    })();
    return () => { alive = false; };
  }, [name, uid]);

  if (rows === null) return null;   // טעינה — לא מהבהב

  // מדור קנוני: תמיד נוכח (כותרת+חותם). ריק → empty-state, לא היעלמות (Canonical Writer Page).
  const Header = (
    <div style={{ textAlign: "center", marginBottom: 12 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800 }}>
        🔢 הגימטריות המאומתות של {name}
        <span title="אומת במנוע ואושר" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: F.heading, fontSize: 11, fontWeight: 900, color: "#0b3d2e", background: "linear-gradient(135deg,#8ff0c0,#38d493)", borderRadius: 999, padding: "2px 9px" }}>✓ מאומת</span>
      </div>
      {rows.length > 0 && (
        <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>
          {rows.length} ביטויים מאומתים · לחיצה פותחת את דף-המספר
        </div>
      )}
    </div>
  );

  if (rows.length === 0) return (
    <div style={{ marginBottom: 24 }}>
      {Header}
      <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, padding: "14px 10px", border: `1px dashed ${P.border}`, borderRadius: 12 }}>אין גימטריות מאומתות כרגע</div>
      <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "18px 0 2px" }} />
    </div>
  );

  return (
    <div style={{ marginBottom: 24 }}>
      {Header}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
        {rows.map((r, i) => (
          <a key={i} href={`/number/${encodeURIComponent(r.phrase)}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textDecoration: "none",
              background: P.card, border: `1px solid ${P.border}`, borderRadius: 11, padding: "9px 13px" }}>
            <span style={{ color: P.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.phrase}</span>
            <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 6 }}>
              {r.method && <span title={`שיטה: ${r.method} (לא רגילה)`} style={{ fontFamily: F.heading, fontSize: 9.5, fontWeight: 900, color: P.accentText, background: `${A}22`, border: `1px solid ${A}55`, borderRadius: 999, padding: "1px 7px" }}>{r.method}</span>}
              <span style={{ color: A, fontFamily: F.mono, fontSize: 14, fontWeight: 900 }}>{r.value}</span>
            </span>
          </a>
        ))}
      </div>
      <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "18px 0 2px" }} />
    </div>
  );
}
