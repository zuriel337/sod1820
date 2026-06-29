import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { computeEntity, connectToAxis } from "../lib/research/coreEngine.js";
import { entityFromPhrase } from "../lib/research/entity.js";
import QuickActions from "./QuickActions.jsx";

// 🔀 השוואת שניים — שני שמות/ביטויים זה מול זה. המנוע מוצא איפה הם נפגשים:
// אותה שיטה (הצלבה חזקה) · חוצה-שיטות (הצלבה עקיפה). עובדה מחושבת — לא הוכחה.
const METHOD_SHOW = ["רגיל", "מילוי", "מסתתר", "סידורי", "אתבש", "ריבוע", "קדמי", "אלבם", "גדול"];

export default function CompareTwo({ onOpenTool }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const cmp = useMemo(() => {
    const ta = a.trim(), tb = b.trim();
    if (ta.length < 1 || tb.length < 1) return null;
    const entA = computeEntity(ta), entB = computeEntity(tb);
    if (!entA.primary && !entB.primary) return null;
    const links = connectToAxis(entA, entB);              // היכן ערך-של-A = ערך-של-B
    const same = links.filter(l => l.same);                // אותה שיטה משני הצדדים = חזק
    const cross = links.filter(l => !l.same);              // חוצה-שיטות = עקיף
    return { ta, tb, entA, entB, same, cross, sum: entA.primary + entB.primary };
  }, [a, b]);

  return (
    <div>
      <style>{C2_CSS}</style>
      <div className="rw-h1">🔀 השוואת שניים</div>
      <div className="rw-sub">שני שמות/ביטויים זה מול זה — המנוע מוצא היכן הם נפגשים בערך. <b>אותה שיטה</b> = הצלבה חזקה · <b>חוצה-שיטות</b> = הצלבה עקיפה. עובדה מחושבת, לא הוכחה.</div>

      <div className="rw-card c2-inputs">
        <input dir="rtl" value={a} onChange={e => setA(e.target.value)} placeholder="שם / ביטוי ראשון — למשל אברהם" />
        <span className="c2-vs">מול</span>
        <input dir="rtl" value={b} onChange={e => setB(e.target.value)} placeholder="שם / ביטוי שני — למשל שרה" />
      </div>

      {cmp && (
        <>
          {/* כותרת — שני הצדדים */}
          <div className="rw-card c2-heads">
            <div className="c2-head">
              <div className="c2-name">{cmp.ta}</div>
              <Link to={`/number/${cmp.entA.primary}?from=compare`} className="c2-num">{cmp.entA.primary.toLocaleString("he")}</Link>
              <QuickActions entity={entityFromPhrase(cmp.ta, cmp.entA.primary)} />
            </div>
            <div className="c2-mid">⇄</div>
            <div className="c2-head">
              <div className="c2-name">{cmp.tb}</div>
              <Link to={`/number/${cmp.entB.primary}?from=compare`} className="c2-num">{cmp.entB.primary.toLocaleString("he")}</Link>
              <QuickActions entity={entityFromPhrase(cmp.tb, cmp.entB.primary)} />
            </div>
          </div>

          {/* הצלבות */}
          <div className="rw-card">
            <div className="c2-sec-t">🧩 היכן הם נפגשים</div>
            {cmp.same.length === 0 && cmp.cross.length === 0 && (
              <div className="rw-muted">לא נמצאה הצלבה ישירה בין השניים בשיטות המרכזיות. נסו ביטוי/כתיב אחר, או בדקו כל אחד ב«מסע חיפוש».</div>
            )}
            {cmp.same.map((l, i) => (
              <div key={"s" + i} className="c2-link strong">
                <span className="c2-badge">חזקה</span>
                <Link to={`/number/${l.value}`} className="c2-lval">{l.value.toLocaleString("he")}</Link>
                <span className="c2-ldesc"><b>{cmp.ta}</b> · {l.axisMethod} = <b>{cmp.tb}</b> · {l.entMethod}</span>
              </div>
            ))}
            {cmp.cross.map((l, i) => (
              <div key={"c" + i} className="c2-link">
                <span className="c2-badge weak">עקיפה</span>
                <Link to={`/number/${l.value}`} className="c2-lval">{l.value.toLocaleString("he")}</Link>
                <span className="c2-ldesc"><b>{cmp.ta}</b> · {l.axisMethod} = <b>{cmp.tb}</b> · {l.entMethod}</span>
              </div>
            ))}
          </div>

          {/* טבלת השיטות זו מול זו */}
          <div className="rw-card">
            <div className="c2-sec-t">📊 כל השיטות — זה מול זה</div>
            <div className="c2-tablewrap">
              <table className="c2-table">
                <thead><tr><th>שיטה</th><th>{cmp.ta}</th><th>{cmp.tb}</th><th /></tr></thead>
                <tbody>
                  {METHOD_SHOW.map(k => {
                    const va = cmp.entA.values[k], vb = cmp.entB.values[k];
                    if (va == null && vb == null) return null;
                    const eq = va != null && va === vb;
                    return (
                      <tr key={k} className={eq ? "eq" : ""}>
                        <td className="c2-mk">{k}</td>
                        <td className={k === "רגיל" ? "c2-rg" : ""}>{va?.toLocaleString("he") ?? "—"}</td>
                        <td className={k === "רגיל" ? "c2-rg" : ""}>{vb?.toLocaleString("he") ?? "—"}</td>
                        <td className="c2-eqmark">{eq ? "= שווה" : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* סכום */}
          <div className="rw-card c2-sum">
            <span>{cmp.ta} + {cmp.tb} =</span>
            <Link to={`/number/${cmp.sum}?from=compare`} className="c2-sumv">{cmp.sum.toLocaleString("he")}</Link>
            {onOpenTool && <button className="c2-open" onClick={() => onOpenTool("journey", cmp.ta)}>מסע על «{cmp.ta}» →</button>}
          </div>
          <div className="rw-sub" style={{ marginTop: 8 }}>⚖️ «אותה שיטה» = שני הצדדים באותה דרך-חישוב (חזק). «חוצה-שיטות» = דרכים שונות שמצטלבות בערך (עקיף). המערכת מציגה עובדה — הפרשנות שלך.</div>
        </>
      )}
    </div>
  );
}

const C2_CSS = `
.c2-inputs{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}
.c2-inputs input{flex:1 1 200px;text-align:center;font-size:16px;font-weight:700;padding:11px 14px;border-radius:11px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-family:inherit;outline:none}
.c2-vs{font-weight:800;color:var(--ink3);font-size:13px}
.c2-heads{display:flex;align-items:stretch;gap:12px;margin-top:12px}
.c2-head{flex:1;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px}
.c2-name{font-weight:800;font-size:17px;color:var(--ink)}
.c2-num{font-size:34px;font-weight:900;color:var(--acc);text-decoration:none;line-height:1}
.c2-mid{display:flex;align-items:center;color:var(--ink3);font-size:22px}
.c2-sec-t{font-weight:800;font-size:15px;color:var(--ink);margin-bottom:10px}
.c2-link{display:flex;align-items:center;gap:10px;padding:7px 0;flex-wrap:wrap}
.c2-badge{font-size:11px;font-weight:800;color:#1f7a4d;background:#e7f6ee;border-radius:999px;padding:3px 10px}
.c2-badge.weak{color:#9a6b00;background:#f7efd9}
.c2-lval{font-weight:900;color:var(--acc);text-decoration:none;min-width:52px}
.c2-ldesc{color:var(--ink2);font-size:14px}
.c2-tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px}
.c2-table{border-collapse:collapse;width:100%;font-size:14px}
.c2-table th{background:var(--bg);text-align:center;padding:8px 12px;font-weight:800;color:var(--ink2);white-space:nowrap}
.c2-table th:first-child{text-align:start}
.c2-table td{padding:7px 12px;border-top:1px solid var(--line);text-align:center}
.c2-table tr.eq{background:var(--accS)}
.c2-mk{text-align:start !important;color:var(--ink2);font-weight:700}
.c2-rg{font-weight:800;color:var(--acc)}
.c2-eqmark{color:#1f7a4d;font-weight:800;font-size:12.5px}
.c2-sum{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px;font-weight:700;color:var(--ink)}
.c2-sumv{font-size:24px;font-weight:900;color:var(--acc);text-decoration:none}
.c2-open{margin-inline-start:auto;border:1px solid var(--line);background:var(--bg);color:var(--acc);border-radius:9px;padding:6px 12px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit}
.c2-open:hover{border-color:var(--acc);background:var(--accS)}
`;
