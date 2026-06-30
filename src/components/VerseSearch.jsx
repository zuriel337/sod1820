import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import QuickActions from "./QuickActions.jsx";
import { entityFromVerse } from "../lib/research/entity.js";
import { METHODS, methodLabel } from "../lib/gematria.js";

// 📖 חיפוש בפסוקים — עדשה על כל חמשת חומשי התורה (5,846 פסוקים, נטענים לפי דרישה).
// טקסט = תת-מחרוזת (מדגיש כל מופע). גימטריה דרך המנוע הרשמי (METHODS) בכל שיטה:
//   שיטה  — רגיל · מילוי · מסתתר · קדמי · אתבש · ריבוע · גדול · סידורי · אלבם …
//   מצב   — מילה בודדת · רצף מילים סמוכות (ביטוי נסתר) · פסוק שלם (סך)
// כל ערך = node בגרף → מפנה ל-/number/:n. עץ אחד: לא משכפל, מקשר.
const isNum = s => /^\d+$/.test(s.trim());
const heb = n => n.toLocaleString("he");

export default function VerseSearch({ seed }) {
  const [data, setData] = useState(null);   // { books, verses:[[b,c,v,t,g]] }
  const [err, setErr] = useState(false);
  const [mode, setMode] = useState("text"); // text | gematria
  const [gmode, setGmode] = useState("word"); // word | span | total
  const [method, setMethod] = useState("רגיל"); // שיטת-גימטריה (METHODS)
  const [q, setQ] = useState(seed || "");

  useEffect(() => {
    let live = true;
    fetch("/torah-verses.json").then(r => r.json()).then(j => { if (live) setData(j); }).catch(() => live && setErr(true));
    return () => { live = false; };
  }, []);

  // זריעה ממסע-החיפוש
  useEffect(() => { if (seed) setQ(seed); }, [seed]);

  const term = q.trim();
  const methodFn = useMemo(() => (METHODS.find(m => m.key === method) || METHODS[0]).fn, [method]);
  const target = mode === "gematria" ? (isNum(term) ? parseInt(term, 10) : methodFn(term)) : 0;

  // אינדקס-מילים לכל פסוק לפי השיטה הנבחרת (מחושב מחדש כשמשנים שיטה) — מאיץ חיפוש
  const wordIndex = useMemo(() => {
    if (!data) return null;
    return data.verses.map(row => {
      const words = row[3].split(" ");
      const vals = words.map(methodFn);
      let total = 0; for (const v of vals) total += v;
      return { vals, total };
    });
  }, [data, methodFn]);

  // ביצוע החיפוש. מחזיר { k, span?:[i,j] } — k=אינדקס הפסוק, span לסימון רצף/מילה.
  const results = useMemo(() => {
    if (!data || !term) return [];
    const out = [];
    const cap = 400;

    if (mode === "text") {
      for (let k = 0; k < data.verses.length && out.length < cap; k++) {
        if (data.verses[k][3].includes(term)) out.push({ k });
      }
      return out;
    }

    if (target <= 0 || !wordIndex) return [];

    if (gmode === "total") {
      for (let k = 0; k < data.verses.length && out.length < cap; k++) {
        if (wordIndex[k].total === target) out.push({ k });
      }
      return out;
    }

    for (let k = 0; k < data.verses.length && out.length < cap; k++) {
      const { vals } = wordIndex[k];
      if (gmode === "word") {
        const i = vals.findIndex(v => v === target);
        if (i >= 0) out.push({ k, span: [i, i] });
      } else { // span — רצף סמוך של ≥2 מילים שסכומו = הערך (חלון מתגלגל)
        let found = null;
        for (let i = 0; i < vals.length && !found; i++) {
          let sum = vals[i];
          for (let j = i + 1; j < vals.length; j++) {
            sum += vals[j];
            if (sum === target) { found = [i, j]; break; }
            if (sum > target) break; // ערכים חיוביים → אפשר לעצור
          }
        }
        if (found) out.push({ k, span: found });
      }
    }
    if (gmode === "span") out.sort((a, b) => (a.span[1] - a.span[0]) - (b.span[1] - b.span[0]));
    return out;
  }, [data, wordIndex, term, mode, gmode, target]);

  const refOf = r => `${data.books[r[0]]} ${r[1]}:${r[2]}`;
  const MARK = { background: "var(--accS)", color: "inherit", borderRadius: 4, padding: "0 2px" };

  // סימון: טקסט = כל מופעי המחרוזת · גימטריה = המילים שב-span
  const hl = (res) => {
    const t = data.verses[res.k][3];
    if (mode === "text") {
      if (!term) return t;
      const parts = []; let i = 0, n = 0;
      while (n < 50) {
        const idx = t.indexOf(term, i);
        if (idx < 0) { parts.push(t.slice(i)); break; }
        parts.push(t.slice(i, idx));
        parts.push(<mark key={idx} style={MARK}>{t.slice(idx, idx + term.length)}</mark>);
        i = idx + term.length; n++;
      }
      return <>{parts}</>;
    }
    if (!res.span) return t;
    const words = t.split(" ");
    const [s, e] = res.span;
    return words.map((w, i) => (
      <React.Fragment key={i}>
        {i > 0 && " "}
        {i >= s && i <= e ? <mark style={MARK}>{w}</mark> : w}
      </React.Fragment>
    ));
  };

  const GLABEL = { word: "מילה", span: "רצף מילים", total: "פסוק שלם" };

  return (
    <div className="rw-card">
      <div className="rw-muted" style={{ fontWeight: 700, marginBottom: 10 }}>📖 חיפוש בפסוקים · חמשת חומשי התורה · 5,846 פסוקים</div>

      <div className="rw-qa" style={{ marginTop: 0, marginBottom: 10 }}>
        <button className={mode === "text" ? "pri" : ""} onClick={() => setMode("text")}>📖 לפי טקסט</button>
        <button className={mode === "gematria" ? "pri" : ""} onClick={() => setMode("gematria")}>🔢 לפי גימטריה</button>
      </div>

      {mode === "gematria" && (
        <>
          {/* בורר-שיטה — כל שיטות המנוע הרשמי */}
          <div className="vs-methods">
            {METHODS.map(m => (
              <button key={m.key} className={"vs-mchip" + (method === m.key ? " on" : "")} title={m.sub}
                onClick={() => setMethod(m.key)}>{methodLabel(m.key)}</button>
            ))}
          </div>
          {/* תת-מצב */}
          <div className="rw-qa" style={{ marginTop: 0, marginBottom: 10 }}>
            {["word", "span", "total"].map(g => (
              <button key={g} className={gmode === g ? "pri" : ""} onClick={() => setGmode(g)} style={{ fontSize: 13 }}>{GLABEL[g]}</button>
            ))}
          </div>
        </>
      )}

      <input
        value={q} onChange={e => setQ(e.target.value)} dir="rtl"
        aria-label={mode === "text" ? "חיפוש מילה בפסוקים" : "חיפוש לפי ערך גימטרי"}
        placeholder={mode === "text" ? "הקלידו מילה / ביטוי…" : "ערך מספרי או ביטוי (יחושב)…"}
        style={{ width: "100%", boxSizing: "border-box", fontSize: 18, fontWeight: 700, padding: "11px 14px",
          border: "1px solid var(--acc)", borderRadius: 10, background: "var(--bg)", color: "var(--ink)", outline: "none", textAlign: "center" }}
      />

      {mode === "gematria" && term !== "" && (
        <div className="rw-muted" style={{ marginTop: 7, textAlign: "center", lineHeight: 1.7 }}>
          {!isNum(term) && <>«{term}» ({methodLabel(method)}) = <b style={{ color: "var(--acc)" }}>{heb(target)}</b> · </>}
          {gmode === "word" && <>פסוקים שיש בהם <b>מילה</b> ששווה {heb(target)}</>}
          {gmode === "span" && <>פסוקים שיש בהם <b>רצף מילים סמוכות</b> שסכומו {heb(target)}</>}
          {gmode === "total" && <>פסוקים ש<b>סך כולם</b> = {heb(target)}</>}
          {" "}<Link to={`/number/${target}?from=verse`} style={{ color: "var(--acc)", fontWeight: 800, textDecoration: "none" }}>→ דף המספר {heb(target)}</Link>
        </div>
      )}

      {!data && !err && <div className="rw-muted" style={{ marginTop: 14 }}>טוען את פסוקי התורה…</div>}
      {err && <div className="rw-muted" style={{ marginTop: 14, color: "#b4453a" }}>שגיאה בטעינת הפסוקים. נסו לרענן.</div>}

      {data && term && (
        <div className="rw-muted" style={{ marginTop: 14, marginBottom: 6, fontWeight: 700 }}>
          {results.length === 0 ? "לא נמצאו פסוקים." : `נמצאו ${results.length}${results.length >= 400 ? "+" : ""} פסוקים`}
          {mode === "gematria" && results.length > 0 && <span style={{ fontWeight: 600 }}> · {methodLabel(method)}, על הכתיב</span>}
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {results.map((res, i) => {
          const r = data.verses[res.k];
          const ref = refOf(r);
          const total = wordIndex ? wordIndex[res.k].total : r[4];
          return (
            <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", background: "var(--bg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Link to={`/code?q=${encodeURIComponent(r[3].split(" ")[0] || "")}`} style={{ fontWeight: 800, fontSize: 13.5, color: "var(--acc)", textDecoration: "none" }}>{ref}</Link>
                <Link to={`/number/${total}?from=verse`} title={`סך הפסוק · ${methodLabel(method)}`} style={{ fontSize: 12.5, fontWeight: 800, color: "var(--acc)", background: "var(--accS)", borderRadius: 999, padding: "2px 10px", textDecoration: "none" }}>הפסוק = {heb(total)}</Link>
              </div>
              <div style={{ fontSize: 17, lineHeight: 1.9, marginTop: 6, fontWeight: 600 }}>{hl(res)}</div>
              <QuickActions entity={entityFromVerse(ref, r[3])} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
