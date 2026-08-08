import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";

// 🔢 הגימטריות המאומתות של הכתב — מקום אחד, רק מה שאומת ואושר.
// מאחד שני מקורות (כי חומר-הכתבים יושב בשניהם):
//   • gematria_words  — source='contribution:<שם>' , is_verified  (קוהורטים שהוזרמו, למשל צבי)
//   • research_contributions — חידושי-הכתב המאושרים עם ערך-מספר (למשל יניב, שחר, אריאל בן משה)
// כל ביטוי → דף-המספר הקנוני. עץ אחד: מצביע, לא משכפל. (writers_page_law)
const stripNikud = (s) => (s || "").replace(/[֑-ׇ]/g, "");
// חילוץ ערך מספרי מכותרת-חידוש: "אחזה רעננה=396" → 396 ; מסיר את «=מספר» מהביטוי.
function parseContribGem(it) {
  const raw = stripNikud(it.title || it.body || "").replace(/\s+/g, " ").trim();
  let value = null;
  if (it.target_id && /^\d+$/.test(String(it.target_id))) value = parseInt(it.target_id, 10);
  const m = raw.match(/=\s*(\d{1,5})\b/);
  if (value == null && m) value = parseInt(m[1], 10);
  if (value == null) return null;                    // לא גימטריה (אין ערך) — לא נכנס
  const phrase = raw.replace(/\s*=\s*\d[\d\s.,!]*$/, "").replace(/\s*=\s*\d+.*$/, "").trim();
  if (!phrase || phrase.length > 60) return null;
  return { phrase, value };
}

export default function VerifiedGematrias({ name, acc }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  const A = acc || P.accent;

  useEffect(() => {
    if (!name) return;
    let alive = true;
    (async () => {
      const [bank, contribs] = await Promise.all([
        supabase.from("gematria_words").select("phrase,ragil")
          .eq("source", `contribution:${name}`).eq("is_verified", true).not("ragil", "is", null).limit(400),
        supabase.from("research_contributions").select("title,body,target_id,intent")
          .eq("author_name", name).in("status", ["approved", "published"])
          .in("intent", ["gematria", "מקור", "חידוש", "תצפית"]).limit(400),
      ]);
      const map = new Map();
      for (const r of (bank.data || [])) {
        if (r.phrase && r.ragil != null) map.set(`${r.phrase}|${r.ragil}`, { phrase: r.phrase, value: r.ragil });
      }
      for (const it of (contribs.data || [])) {
        const g = parseContribGem(it);
        if (g) map.set(`${g.phrase}|${g.value}`, g);
      }
      const list = [...map.values()].sort((a, b) => a.value - b.value);
      if (alive) setRows(list);
    })();
    return () => { alive = false; };
  }, [name]);

  if (rows === null || rows.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800 }}>
          🔢 הגימטריות המאומתות של {name}
          <span title="אומת במנוע ואושר" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: F.heading, fontSize: 11, fontWeight: 900, color: "#0b3d2e", background: "linear-gradient(135deg,#8ff0c0,#38d493)", borderRadius: 999, padding: "2px 9px" }}>✓ מאומת</span>
        </div>
        <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>
          {rows.length} ביטויים מאומתים · לחיצה פותחת את דף-המספר
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
        {rows.map((r, i) => (
          <a key={i} href={`/number/${encodeURIComponent(r.phrase)}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textDecoration: "none",
              background: P.card, border: `1px solid ${P.border}`, borderRadius: 11, padding: "9px 13px" }}>
            <span style={{ color: P.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.phrase}</span>
            <span style={{ flex: "none", color: A, fontFamily: F.mono, fontSize: 14, fontWeight: 900 }}>{r.value}</span>
          </a>
        ))}
      </div>
      <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "18px 0 2px" }} />
    </div>
  );
}
