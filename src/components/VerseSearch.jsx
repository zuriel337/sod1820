import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import QuickActions from "./QuickActions.jsx";
import { entityFromVerse } from "../lib/research/entity.js";
import { calcGem } from "../theme.js";

// 📖 חיפוש בפסוקים — עדשה על כל חמשת חומשי התורה (5,846 פסוקים, נטענים לפי דרישה).
// שני מצבים: «לפי טקסט» (תת-מחרוזת) · «לפי גימטריה» (סך הפסוק = ערך). כל ערך פסוק
// כבר מחושב מראש (רגיל, סופיות=בסיס) → תואם את מנוע האתר. כל פסוק = ישות בגרף.
const isNum = s => /^\d+$/.test(s.trim());

export default function VerseSearch() {
  const [data, setData] = useState(null);   // { books, verses:[[b,c,v,t,g]] }
  const [err, setErr] = useState(false);
  const [mode, setMode] = useState("text"); // text | gematria
  const [q, setQ] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/torah-verses.json").then(r => r.json()).then(j => { if (live) setData(j); }).catch(() => live && setErr(true));
    return () => { live = false; };
  }, []);

  const term = q.trim();
  const target = mode === "gematria" ? (isNum(term) ? parseInt(term, 10) : calcGem(term)) : 0;

  // טקסט = תת-מחרוזת · גימטריה = פסוקים שמכילים *מילה* ששווה לערך (חיפוש ברמת המילה — שימושי)
  const results = useMemo(() => {
    if (!data || !term) return [];
    const out = [];
    for (const row of data.verses) {
      if (mode === "text") { if (row[3].includes(term)) out.push(row); }
      else if (target > 0 && row[3].split(" ").some(w => calcGem(w) === target)) out.push(row);
      if (out.length >= 400) break;
    }
    return out;
  }, [data, term, mode, target]);

  const refOf = r => `${data.books[r[0]]} ${r[1]}:${r[2]}`;
  const MARK = { background: "var(--accS)", color: "inherit", borderRadius: 4, padding: "0 2px" };
  const hl = t => {
    if (!term) return t;
    if (mode === "text") {
      const i = t.indexOf(term);
      if (i < 0) return t;
      return <>{t.slice(0, i)}<mark style={MARK}>{t.slice(i, i + term.length)}</mark>{t.slice(i + term.length)}</>;
    }
    // גימטריה — הדגש כל מילה ששווה לערך
    if (target <= 0) return t;
    const words = t.split(" ");
    return words.map((w, i) => (
      <React.Fragment key={i}>
        {i > 0 && " "}
        {calcGem(w) === target ? <mark style={MARK}>{w}</mark> : w}
      </React.Fragment>
    ));
  };

  return (
    <div className="rw-card">
      <div className="rw-muted" style={{ fontWeight: 700, marginBottom: 10 }}>📖 חיפוש בפסוקים · חמשת חומשי התורה</div>

      <div className="rw-qa" style={{ marginTop: 0, marginBottom: 10 }}>
        <button className={mode === "text" ? "pri" : ""} onClick={() => setMode("text")}>📖 לפי טקסט</button>
        <button className={mode === "gematria" ? "pri" : ""} onClick={() => setMode("gematria")}>🔢 לפי גימטריה</button>
      </div>

      <input
        value={q} onChange={e => setQ(e.target.value)} dir="rtl"
        aria-label={mode === "text" ? "חיפוש מילה בפסוקים" : "חיפוש לפי ערך גימטרי"}
        placeholder={mode === "text" ? "הקלידו מילה / ביטוי…" : "ערך מספרי או ביטוי (יחושב)…"}
        style={{ width: "100%", boxSizing: "border-box", fontSize: 18, fontWeight: 700, padding: "11px 14px",
          border: "1px solid var(--acc)", borderRadius: 10, background: "var(--bg)", color: "var(--ink)", outline: "none", textAlign: "center" }}
      />

      {mode === "gematria" && term !== "" && (
        <div className="rw-muted" style={{ marginTop: 7, textAlign: "center" }}>
          {isNum(term) ? <>פסוקים שמכילים מילה ששווה <b>{target.toLocaleString("he")}</b></> : <>«{term}» = <b>{target.toLocaleString("he")}</b> — פסוקים שמכילים מילה בערך הזה</>}
        </div>
      )}

      {!data && !err && <div className="rw-muted" style={{ marginTop: 14 }}>טוען את פסוקי התורה…</div>}
      {err && <div className="rw-muted" style={{ marginTop: 14, color: "#b4453a" }}>שגיאה בטעינת הפסוקים. נסו לרענן.</div>}

      {data && term && (
        <div className="rw-muted" style={{ marginTop: 14, marginBottom: 6, fontWeight: 700 }}>
          {results.length === 0 ? "לא נמצאו פסוקים." : `נמצאו ${results.length}${results.length >= 400 ? "+" : ""} פסוקים`}
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {results.map((r, i) => {
          const ref = refOf(r);
          return (
            <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", background: "var(--bg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Link to={`/code?q=${encodeURIComponent(r[3].split(" ")[0] || "")}`} style={{ fontWeight: 800, fontSize: 13.5, color: "var(--acc)", textDecoration: "none" }}>{ref}</Link>
                <Link to={`/number/${r[4]}?from=verse`} style={{ fontSize: 12.5, fontWeight: 800, color: "var(--acc)", background: "var(--accS)", borderRadius: 999, padding: "2px 10px", textDecoration: "none" }}>= {r[4].toLocaleString("he")}</Link>
              </div>
              <div style={{ fontSize: 17, lineHeight: 1.9, marginTop: 6, fontWeight: 600 }}>{hl(r[3])}</div>
              <QuickActions entity={entityFromVerse(ref, r[3])} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
