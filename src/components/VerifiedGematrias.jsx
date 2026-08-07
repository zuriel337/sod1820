import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";

// 🔢 הגימטריות המאומתות של הכתב — מקום אחד, רק מה שאומת במנוע ואושר.
// מקור-אמת יחיד: gematria_words where source='contribution:<שם>' and is_verified.
// כל ביטוי → דף-המספר הקנוני (/number). עץ אחד: מצביע, לא משכפל. (writers_page_law)
export default function VerifiedGematrias({ name, acc }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  const A = acc || P.accent;

  useEffect(() => {
    if (!name) return;
    let alive = true;
    supabase.from("gematria_words")
      .select("phrase,ragil")
      .eq("source", `contribution:${name}`).eq("is_verified", true)
      .not("ragil", "is", null)
      .order("ragil", { ascending: true }).limit(400)
      .then(({ data }) => { if (alive) setRows(Array.isArray(data) ? data : []); });
    return () => { alive = false; };
  }, [name]);

  if (rows === null || rows.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800 }}>
          🔢 הגימטריות המאומתות של {name}
          <span title="אומת במנוע הרשמי" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: F.heading, fontSize: 11, fontWeight: 900, color: "#0b3d2e", background: "linear-gradient(135deg,#8ff0c0,#38d493)", borderRadius: 999, padding: "2px 9px" }}>✓ מאומת</span>
        </div>
        <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>
          {rows.length} ביטויים — כולם אומתו במנוע ואושרו · לחיצה פותחת את דף-המספר
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
        {rows.map((r, i) => (
          <a key={i} href={`/number/${encodeURIComponent(r.phrase)}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textDecoration: "none",
              background: P.card, border: `1px solid ${P.border}`, borderRadius: 11, padding: "9px 13px" }}>
            <span style={{ color: P.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.phrase}</span>
            <span style={{ flex: "none", color: A, fontFamily: F.mono, fontSize: 14, fontWeight: 900 }}>{r.ragil}</span>
          </a>
        ))}
      </div>
      <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "18px 0 2px" }} />
    </div>
  );
}
