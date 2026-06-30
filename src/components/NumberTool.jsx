import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// 🔢 כלי «דף מספר» בתוך המעבדה — הקלד מספר → פותח את דף-המספר הקנוני (/number/:n).
// מחליף את הקישור הישן ל-/numbers (גלקסיית-ההתכנסויות) שלא קשור לכאן.
const KEY_NUMS = [1820, 358, 26, 86, 541, 1776, 14, 45];

export default function NumberTool() {
  const [n, setN] = useState("");
  const nav = useNavigate();
  const go = (v) => {
    const x = parseInt(v ?? n, 10);
    if (Number.isFinite(x) && x > 0) nav(`/number/${x}?from=lab`);
  };
  return (
    <div className="rw-card">
      <div className="rw-muted" style={{ fontWeight: 700, marginBottom: 12 }}>🔢 דף מספר · פתח כל מספר וראה הכל — גימטריאות · הצלבות · התכנסויות · אירועים</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="rw-num-in" inputMode="numeric" dir="ltr" value={n}
          onChange={e => setN(e.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={e => e.key === "Enter" && go()}
          aria-label="הקלד מספר" placeholder="הקלד מספר…" />
        <button className="rw-tchip on" onClick={() => go()} disabled={!n} style={!n ? { opacity: 0.5 } : undefined}>פתח דף מספר ←</button>
      </div>
      <div className="rw-muted" style={{ margin: "16px 0 8px", fontSize: 12.5, fontWeight: 700 }}>מספרי-מפתח:</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {KEY_NUMS.map(k => (
          <button key={k} className="rw-chip" style={{ cursor: "pointer" }} onClick={() => go(k)}>{k.toLocaleString("he")}</button>
        ))}
      </div>
    </div>
  );
}
