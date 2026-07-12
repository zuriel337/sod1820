import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import QuickActions from "./QuickActions.jsx";
import { calcGem } from "../theme.js";
import { onlyHeb } from "../lib/gematria.js";
import { entityFromPhrase, entityFromVerse } from "../lib/research/entity.js";
import ToolGuide from "./research/ToolGuide.jsx";
import AiAnalyze from "./AiAnalyze.jsx";

// 🔠 ראשי / אמצעי / סופי תיבות (נוטריקון) — שני כיוונים:
//   • מהביטוי → ראשי-התיבות · אמצעי-התיבות · סופי-התיבות + ערך כל אחד + השוואת-התכנסות.
//   • חיפוש הפוך → נתון רצף-אותיות, מצא פסוקים בתורה שזה ראשי/סופי-התיבות שלהם.
// כל ערך = node בגרף → מפנה ל-/number/:n. גימטריה דרך המנוע בלבד (calcGem).
const heb = n => Number(n).toLocaleString("he");
const midIdx = arr => Math.floor(arr.length / 2); // אות אמצעית: אורך 3→1, אורך 4→2, אורך 1→0

function ResultRow({ title, sub, txt, badge }) {
  if (!txt) return null;
  const val = calcGem(txt);
  return (
    <div className="rw-card" style={{ marginTop: 12 }}>
      <div className="rw-muted" style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
        {title} <span style={{ fontWeight: 600 }}>· {sub}</span>
        {badge && <span style={{ marginInlineStart: 8, color: "var(--acc)", fontWeight: 800 }}>{badge}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div dir="rtl" style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, color: "var(--ink)" }}>{txt}</div>
        <Link to={`/number/${val}?from=notarikon`} title="פתח את דף המספר" style={{ fontSize: 14.5, fontWeight: 800, color: "var(--acc)", background: "var(--accS)", borderRadius: 999, padding: "5px 15px", textDecoration: "none" }}>= {heb(val)}</Link>
      </div>
      <QuickActions entity={entityFromPhrase(txt, val)} />
    </div>
  );
}

// ── מהביטוי → ראשי/אמצעי/סופי + השוואה ──
function Forward() {
  const [q, setQ] = useState("");
  const words = q.trim().split(/\s+/).map(w => onlyHeb(w)).filter(a => a.length);
  const rashei = words.map(a => a[0]).join("");
  const emtzaei = words.map(a => a[midIdx(a)]).join("");
  const sofei = words.map(a => a[a.length - 1]).join("");

  // השוואת שלושת הערכים — שוויון = התכנסות אמיתית (עובדה מחושבת)
  const conv = useMemo(() => {
    if (words.length < 2) return null;
    const trio = [["ראשי", rashei], ["אמצעי", emtzaei], ["סופי", sofei]].map(([k, t]) => ({ k, t, v: calcGem(t) }));
    const eq = [];
    for (let i = 0; i < trio.length; i++)
      for (let j = i + 1; j < trio.length; j++)
        if (trio[i].v === trio[j].v) eq.push([trio[i], trio[j]]);
    return eq.length ? eq : null;
  }, [rashei, emtzaei, sofei, words.length]);

  return (
    <>
      <input className="rw-num-in" dir="rtl" value={q} onChange={e => setQ(e.target.value)}
        aria-label="ביטוי לראשי/אמצעי/סופי תיבות" placeholder="הקלידו ביטוי (כמה מילים)…" style={{ textAlign: "right" }} />
      {words.length >= 2 ? (
        <>
          <ResultRow title="ראשי תיבות" sub="האות הראשונה בכל מילה" txt={rashei} />
          <ResultRow title="אמצעי תיבות" sub="האות האמצעית בכל מילה" txt={emtzaei} />
          <ResultRow title="סופי תיבות" sub="האות האחרונה בכל מילה" txt={sofei} />
          {conv && (
            <div className="rw-card" style={{ marginTop: 12, border: "1px solid var(--acc)", background: "var(--accS)" }}>
              <div style={{ fontWeight: 800, color: "var(--acc)", marginBottom: 4 }}>✦ התכנסות מחושבת</div>
              {conv.map(([a, b], i) => (
                <div key={i} style={{ fontSize: 14, fontWeight: 700 }}>
                  {a.k}-תיבות «{a.t}» = {b.k}-תיבות «{b.t}» = <b>{heb(a.v)}</b>
                </div>
              ))}
            </div>
          )}
          {/* 🤖 ניתוח AI — מפרש את ראשי/אמצעי/סופי התיבות (לא מחשב) */}
          <AiAnalyze
            compare
            kind="notarikon"
            subject={q.trim()}
            facts={`ביטוי: ${q.trim()}. ראשי-תיבות «${rashei}»=${calcGem(rashei)} · אמצעי-תיבות «${emtzaei}»=${calcGem(emtzaei)} · סופי-תיבות «${sofei}»=${calcGem(sofei)}.` + (conv ? " התכנסות מחושבת: " + conv.map(([a, b]) => `${a.k}-תיבות «${a.t}» = ${b.k}-תיבות «${b.t}» = ${a.v}`).join(" · ") : "")}
          />
        </>
      ) : q.trim() ? <div className="rw-muted" style={{ marginTop: 12 }}>הקלידו לפחות שתי מילים (למשל «רבי שמעון בר יוחאי»).</div> : (
        <div className="rw-muted" style={{ marginTop: 12, lineHeight: 1.7 }}>דוגמה: «את השמים ואת הארץ» → ראשי-תיבות «אהוה», סופי-תיבות «תםתץ».</div>
      )}
    </>
  );
}

// ── חיפוש הפוך → פסוקים שרצף-אותיות הוא ראשי/סופי-התיבות שלהם ──
const MARK = { background: "var(--accS)", color: "inherit", borderRadius: 4, padding: "0 2px" };
function Reverse() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [edge, setEdge] = useState("first"); // first=ראשי · last=סופי
  const [q, setQ] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/torah-verses.json").then(r => r.json()).then(j => { if (live) setData(j); }).catch(() => live && setErr(true));
    return () => { live = false; };
  }, []);

  const target = onlyHeb(q).join(""); // אותיות-המטרה בלבד
  const val = target ? calcGem(target) : 0;

  // לכל פסוק: מחרוזת-אות-קצה (אות ראשונה/אחרונה לכל מילה) → חיפוש המטרה כתת-מחרוזת = מילים רצופות
  const results = useMemo(() => {
    if (!data || target.length < 2) return [];
    const out = []; const cap = 300;
    for (let k = 0; k < data.verses.length && out.length < cap; k++) {
      const words = data.verses[k][3].split(" ");
      let edges = "";
      for (const w of words) { const h = onlyHeb(w); edges += h.length ? (edge === "first" ? h[0] : h[h.length - 1]) : "·"; }
      const idx = edges.indexOf(target);
      if (idx >= 0) out.push({ k, span: [idx, idx + target.length - 1] });
    }
    return out;
  }, [data, target, edge]);

  const refOf = r => `${data.books[r[0]]} ${r[1]}:${r[2]}`;
  const hl = (res) => {
    const words = data.verses[res.k][3].split(" ");
    const [s, e] = res.span;
    return words.map((w, i) => (
      <React.Fragment key={i}>{i > 0 && " "}{i >= s && i <= e ? <mark style={MARK}>{w}</mark> : w}</React.Fragment>
    ));
  };

  return (
    <>
      <div className="rw-qa" style={{ marginTop: 0, marginBottom: 10 }}>
        <button className={edge === "first" ? "pri" : ""} onClick={() => setEdge("first")}>ראשי-תיבות</button>
        <button className={edge === "last" ? "pri" : ""} onClick={() => setEdge("last")}>סופי-תיבות</button>
      </div>
      <input className="rw-num-in" dir="rtl" value={q} onChange={e => setQ(e.target.value)}
        aria-label="רצף אותיות לחיפוש הפוך" placeholder="רצף אותיות (למשל «אהוה»)…" style={{ textAlign: "right" }} />
      {target.length >= 2 && (
        <div className="rw-muted" style={{ marginTop: 7, textAlign: "center", lineHeight: 1.7 }}>
          פסוקים שבהם <b>רצף מילים סמוכות</b> ש{edge === "first" ? "ראשי" : "סופי"}-התיבות שלו = «{target}»
          {" · "}<Link to={`/number/${val}?from=notarikon`} style={{ color: "var(--acc)", fontWeight: 800, textDecoration: "none" }}>«{target}» = {heb(val)}</Link>
        </div>
      )}
      {!data && !err && <div className="rw-muted" style={{ marginTop: 14 }}>טוען את פסוקי התורה…</div>}
      {err && <div className="rw-muted" style={{ marginTop: 14, color: "#b4453a" }}>שגיאה בטעינת הפסוקים. נסו לרענן.</div>}
      {data && target.length >= 2 && (
        <div className="rw-muted" style={{ marginTop: 14, marginBottom: 6, fontWeight: 700 }}>
          {results.length === 0 ? "לא נמצאו פסוקים." : `נמצאו ${results.length}${results.length >= 300 ? "+" : ""} פסוקים`}
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {results.map((res, i) => {
          const r = data.verses[res.k]; const ref = refOf(r);
          return (
            <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", background: "var(--bg)" }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--acc)", marginBottom: 4 }}>{ref}</div>
              <div style={{ fontSize: 17, lineHeight: 1.9, fontWeight: 600 }}>{hl(res)}</div>
              <QuickActions entity={entityFromVerse(ref, r[3])} />
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function NotarikonTool() {
  const [dir, setDir] = useState("fwd"); // fwd=מהביטוי · rev=חיפוש הפוך
  return (
    <div className="rw-card">
      <div className="rw-muted" style={{ fontWeight: 700, marginBottom: 12 }}>🔠 נוטריקון — מהביטוי לראשי/אמצעי/סופי תיבות, או חיפוש הפוך בפסוקי התורה</div>
      <ToolGuide
        title="איך משתמשים בנוטריקון"
        intro="נוטריקון = יצירת מילה מאותיות-הקצה של ביטוי. שני כיוונים — מביטוי לאותיות, או חיפוש הפוך בתורה."
        steps={[
          "✍️ «מהביטוי → אותיות»: הקלידו ביטוי בן כמה מילים. המנוע מרכיב 3 מילים — ראשי-תיבות (אות ראשונה בכל מילה), אמצעי-תיבות (אות אמצעית), וסופי-תיבות (אות אחרונה) — ומחשב את הגימטריה של כל אחת.",
          "✦ אם שניים מהערכים שווים — מוצגת «התכנסות מחושבת» (עובדה, לא פרשנות).",
          "🔎 «חיפוש הפוך בתורה»: בחרו ראשי-תיבות או סופי-תיבות, והקלידו רצף-אותיות (למשל «אהוה»). המנוע מוצא פסוקים שבהם רצף מילים סמוכות נותן בדיוק את האותיות האלה בקצותיהן.",
          "🔢 כל ערך לחיץ → נפתח דף-המספר עם כל ההצלבות.",
        ]}
        tip="דוגמה מפורסמת: «את השמים ואת הארץ» → ראשי-תיבות «אהוה». נסו «רבי שמעון בר יוחאי»."
      />
      <div className="rw-qa" style={{ marginTop: 0, marginBottom: 12 }}>
        <button className={dir === "fwd" ? "pri" : ""} onClick={() => setDir("fwd")}>✍️ מהביטוי → אותיות</button>
        <button className={dir === "rev" ? "pri" : ""} onClick={() => setDir("rev")}>🔎 חיפוש הפוך בתורה</button>
      </div>
      {dir === "fwd" ? <Forward /> : <Reverse />}
    </div>
  );
}
