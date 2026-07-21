import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { computeEntity, connectToAxis, PRIMARY } from "../lib/research/coreEngine.js";

// 👨‍👩‍👧 הקשרים במשפחה — מוצא התכנסויות אמיתיות בין שמות בני המשפחה (חוצה-שיטות, עובדה מחושבת).
// רגע ה«זה אני»: «אבא = אמא = 318». כל ערך ממנוע-הליבה (gematria_engine_law) — לא ניחוש.
const KEY = "sod_family_v1";
const RELATIONS = ["אני", "אבא", "אמא", "בן/בת זוג", "בן", "בת", "אח", "אחות", "סבא", "סבתא", "אחר"];
const seed = () => ([{ relation: "אני", name: "" }, { relation: "אבא", name: "" }, { relation: "אמא", name: "" }]);
const load = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || "null"); return Array.isArray(j) && j.length ? j : seed(); } catch { return seed(); } };

// דירוג איכות הצלבה: אותה שיטה ברגיל > אותה שיטה > חוצה-שיטות
const quality = l => (l.same && l.axisMethod === PRIMARY ? 3 : l.same ? 2 : 1);

export default function FamilyCross() {
  const [people, setPeople] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(people)); } catch { /* noop */ } }, [people]);

  const setRow = (i, k, v) => setPeople(p => { const a = p.slice(); a[i] = { ...a[i], [k]: v }; return a; });
  const add = () => setPeople(p => [...p, { relation: "בן", name: "" }]);
  const del = i => setPeople(p => p.filter((_, x) => x !== i));

  // יושר: התכנסות "אמיתית" = אותה שיטה (במיוחד רגיל). חוצה-שיטות = קשר משני בלבד
  // (עם 20 שיטות כמעט תמיד יש איזושהי חפיפה — לא ניפוח אותה לרגע-וואו).
  const { strong, weak } = useMemo(() => {
    const valid = people.filter(p => p.name.trim()).map(p => ({ ...p, name: p.name.trim(), core: computeEntity(p.name.trim()) }));
    const strong = [], weak = [];
    for (let i = 0; i < valid.length; i++)
      for (let j = i + 1; j < valid.length; j++) {
        const links = connectToAxis(valid[i].core, valid[j].core);
        if (!links.length) continue;
        const same = links.filter(l => l.same);
        if (same.length) strong.push({ a: valid[i], b: valid[j], links: same, best: same[0], q: quality(same[0]) + same.length * 0.1 });
        else weak.push({ a: valid[i], b: valid[j], best: links[0] });
      }
    return { strong: strong.sort((x, y) => y.q - x.q), weak };
  }, [people]);
  const pairs = strong;

  const C = { acc: "var(--acc)", ink: "var(--ink)", ink2: "var(--ink2)", ink3: "var(--ink3)", line: "var(--line)", bg: "var(--bg)", accS: "var(--accS)" };
  const inp = { width: "100%", boxSizing: "border-box", fontSize: 16, fontWeight: 600, padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, outline: "none", fontFamily: "inherit" };

  return (
    <div>
      <div className="rw-h1">👨‍👩‍👧 הקשרים במשפחה</div>
      <div className="rw-sub">הזינו שמות בני המשפחה — המערכת תמצא את ההתכנסויות הנסתרות ביניהם. כל גילוי הוא <b>עובדה מחושבת</b> במנוע (לא ניחוש). נשמר אצלכם בלבד.</div>

      <div className="rw-card">
        {people.map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 8, marginBottom: 8 }}>
            <select style={{ ...inp, cursor: "pointer" }} value={p.relation} onChange={e => setRow(i, "relation", e.target.value)}>{RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <input style={inp} dir="rtl" value={p.name} onChange={e => setRow(i, "name", e.target.value)} placeholder="שם" />
            <button onClick={() => del(i)} style={{ cursor: "pointer", border: `1px solid ${C.line}`, background: "var(--card)", color: C.ink2, borderRadius: 8, padding: "6px 10px", fontWeight: 800, fontFamily: "inherit" }}>✕</button>
          </div>
        ))}
        <button onClick={add} style={{ cursor: "pointer", border: `1px solid ${C.acc}`, background: "var(--card)", color: C.acc, borderRadius: 999, padding: "9px 16px", fontWeight: 800, fontFamily: "inherit" }}>➕ הוסף בן משפחה</button>
      </div>

      {pairs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>✦ {pairs.length} התכנסויות אמיתיות במשפחה</div>
          <div className="rw-sub" style={{ marginBottom: 8 }}>אותה שיטה בדיוק — הקשר החזק ביותר.</div>
          <div style={{ display: "grid", gap: 12 }}>
            {pairs.map((pr, i) => {
              const best = pr.best;
              const top = best.axisMethod === PRIMARY;
              return (
                <div key={i} style={{ border: `2px solid ${C.acc}`, borderRadius: 14, padding: "16px 18px", background: "linear-gradient(180deg,var(--card),var(--bg))", textAlign: "center" }}>
                  <div style={{ fontSize: 15, color: C.ink2, fontWeight: 700 }}>
                    <b style={{ color: C.ink }}>{pr.a.name}</b> <span style={{ color: C.ink3 }}>({pr.a.relation})</span>
                    <span style={{ color: C.acc, margin: "0 8px", fontSize: 18 }}>✦</span>
                    <b style={{ color: C.ink }}>{pr.b.name}</b> <span style={{ color: C.ink3 }}>({pr.b.relation})</span>
                  </div>
                  <div style={{ fontSize: 44, fontWeight: 800, color: C.acc, lineHeight: 1.1, margin: "4px 0" }}>{best.value.toLocaleString("he")}</div>
                  <div style={{ fontSize: 14, color: C.ink2 }}>שניהם <b style={{ color: C.acc }}>{best.axisMethod}</b> = {best.value.toLocaleString("he")}{top && " · הערך הגלוי"}</div>
                  {pr.links.length > 1 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                      {pr.links.slice(1, 4).map((l, j) => <span key={j} className="rw-chip" style={{ fontSize: 12 }}>{l.axisMethod} · {l.value.toLocaleString("he")}</span>)}
                    </div>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <Link to={`/number/${best.value}?from=family`} style={{ color: C.acc, fontWeight: 800, fontSize: 13, textDecoration: "none" }}>→ מה עוד מתכנס ב-{best.value.toLocaleString("he")}</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pairs.length === 0 && weak.length > 0 && (
        <div className="rw-card" style={{ marginTop: 12 }}>
          <div className="rw-sub">לא נמצאה התכנסות באותה שיטה בין השמות — וזה בסדר, היא נדירה ולכן מיוחדת. (יש קשרים עקיפים חוצי-שיטות למטה, חלשים יותר.)</div>
        </div>
      )}

      {weak.length > 0 && (
        <div className="rw-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink2, marginBottom: 6 }}>קשרים עקיפים (חוצי-שיטות · חלשים יותר)</div>
          <div style={{ display: "grid", gap: 4 }}>
            {weak.slice(0, 8).map((pr, i) => (
              <div key={i} style={{ fontSize: 12.5, color: C.ink3 }}>
                {pr.a.name} <span style={{ color: C.ink2 }}>({pr.best.axisMethod})</span> = {pr.b.name} <span style={{ color: C.ink2 }}>({pr.best.entMethod})</span> = {pr.best.value.toLocaleString("he")}
              </div>
            ))}
          </div>
        </div>
      )}

      {pairs.length === 0 && weak.length === 0 && (
        <div className="rw-card" style={{ marginTop: 12 }}>
          <div className="rw-sub">הזינו לפחות שני שמות — וההתכנסויות יופיעו כאן.</div>
        </div>
      )}
    </div>
  );
}
