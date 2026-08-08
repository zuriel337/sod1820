import React, { useState, useEffect } from "react";
import ChristinaDecoder from "./ChristinaDecoder.jsx";
import ChristinaMiluiCalc from "./ChristinaMiluiCalc.jsx";

// ✦ מנוע כריסטינה — שתי העדשות שלה, זו לצד זו, מונעות ממילה אחת (בקשת צוריאל: «אחד ליד השני»).
//   • 🔤 מפענח-האותיות (פירוקים) — משמעות פרשנית לכל אות (christina_decomposition_rules).
//   • 🔢 מחשבון המילוי — שיטת-המילוי הקבועה שלה (christina_milui_letters, ו=וו=12).
// עץ אחד: קלט יחיד → שני הרכיבים הקנוניים (hideInput), בלי שכפול. מוטמע בהיכל (/research?tool=christina)
// וגם בדף-הכתב (SpecialtyCenter, specialty=letter-decoder). מובייל: נערם; דסקטופ: זה-לצד-זה.
const C = {
  card: "var(--card,#ffffff)", line: "var(--line,#e4e7ec)", ink: "var(--ink,#1b1d22)",
  ink2: "var(--ink2,#5b6472)", violet: "#6b4ea6", violetLine: "#ddd0f0",
};

export default function ChristinaEngine({ seed = "", embedded = false }) {
  const [word, setWord] = useState(seed);
  useEffect(() => { setWord(seed); }, [seed]);

  return (
    <div style={{ direction: "rtl" }}>
      {!embedded && (
        <div style={{ color: C.ink, fontWeight: 900, fontSize: 19, marginBottom: 6 }}>
          ✦ מנוע כריסטינה — פירוק ומילוי
        </div>
      )}
      <div style={{ color: C.ink2, fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>
        מילה אחת, שתי עדשות: <b style={{ color: C.violet }}>משמעות האותיות</b> ולצידה <b style={{ color: "#7a5e12" }}>ערך המילוי</b> בשיטתה.
      </div>

      {/* קלט יחיד שמניע את שתי העדשות */}
      <input value={word} onChange={e => setWord(e.target.value)}
        aria-label="מילה למנוע כריסטינה" placeholder="הקלידו מילה בעברית…"
        style={{ width: "100%", boxSizing: "border-box", fontSize: 18, textAlign: "right", direction: "rtl",
          padding: "13px 15px", borderRadius: 12, border: `1px solid ${C.violetLine}`, background: "#fff",
          color: C.ink, fontWeight: 700, outline: "none", marginBottom: 14 }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, alignItems: "start" }}>
        <ChristinaDecoder seed={word} embedded hideInput />
        <ChristinaMiluiCalc seed={word} embedded hideInput />
      </div>
    </div>
  );
}
