import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { loadProfile, saveProfile, emptyProfile, fieldEngine, cleanInput, promptFor, LENSES, EMOTIONS } from "../lib/research/lifeProfile.js";
import { PRIMARY } from "../lib/research/coreEngine.js";
import { parseEngineOutput, mergeEngines } from "../lib/research/router.js";

// 🧬 ניתוח חיים — תקן השדה האחיד (v2). קלט אחיד → מנועים → אותו פלט אחיד → השוואה + עץ אחד.
const card = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginTop: 12 };
const inp = { width: "100%", boxSizing: "border-box", fontSize: 15.5, fontWeight: 600, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", outline: "none", fontFamily: "inherit" };
const lbl = { fontSize: 12.5, fontWeight: 800, color: "var(--ink2)", marginBottom: 4 };
const btn = (pri) => ({ cursor: "pointer", borderRadius: 999, fontWeight: 800, fontSize: 13.5, padding: "9px 16px", fontFamily: "inherit", border: pri ? "none" : "1px solid var(--acc)", background: pri ? "var(--acc)" : "var(--card)", color: pri ? "#fff" : "var(--acc)" });
const xbtn = { cursor: "pointer", border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink2)", borderRadius: 8, padding: "6px 10px", fontFamily: "inherit", fontWeight: 800 };

// קלט-צ׳יפים למערכים (ילדים/מקומות/נושאים/מספרים)
function Chips({ label, arr, onAdd, onDel, ph }) {
  const [v, setV] = useState("");
  const add = () => { const t = v.trim(); if (t) { onAdd(t); setV(""); } };
  return (
    <div>
      <div style={lbl}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        {arr.map((x, i) => <span key={i} className="rw-chip" style={{ cursor: "pointer" }} onClick={() => onDel(i)} title="הסר">{x} ✕</span>)}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input style={inp} dir="rtl" value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder={ph} />
        <button onClick={add} style={btn(false)}>＋</button>
      </div>
    </div>
  );
}

export default function LifeProfile() {
  const [p, setP] = useState(loadProfile);
  const [copied, setCopied] = useState("");
  useEffect(() => { saveProfile(p); }, [p]);

  const set = (path, val) => setP(prev => { const n = structuredClone(prev); let o = n; const ks = path.split("."); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; return n; });
  const pushArr = (path, val) => setP(prev => { const n = structuredClone(prev); let o = n; const ks = path.split("."); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = [...o[ks[ks.length - 1]], val]; return n; });
  const delArr = (path, idx) => setP(prev => { const n = structuredClone(prev); let o = n; const ks = path.split("."); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = o[ks[ks.length - 1]].filter((_, x) => x !== idx); return n; });

  const addEvent = () => pushArr("timeline", { date: "", title: "", description: "", emotion: "neutral" });
  const setEvent = (i, k, v) => setP(prev => { const t = prev.timeline.slice(); t[i] = { ...t[i], [k]: v }; return { ...prev, timeline: t }; });
  const addPerson = () => pushArr("entities.people", { name: "", status: "", note: "" });
  const setPerson = (i, k, v) => setP(prev => { const a = prev.entities.people.slice(); a[i] = { ...a[i], [k]: v }; return { ...prev, entities: { ...prev.entities, people: a } }; });

  const input = useMemo(() => cleanInput(p), [p]);
  const out = useMemo(() => fieldEngine(p), [p]);
  // 🧠 Router — מאחד את מנוע השדה (דטרמיניסטי) עם פלטי ה-AI שהודבקו (תקינים)
  const consensus = useMemo(() => {
    const engines = [{ name: "מפת השדה", out }];
    LENSES.forEach(m => { const o = parseEngineOutput(p._engines?.[m.key]); if (o) engines.push({ name: m.title, out: o }); });
    return mergeEngines(engines);
  }, [out, p._engines]);
  const json = useMemo(() => JSON.stringify(input, null, 2), [input]);
  const outJson = useMemo(() => JSON.stringify(out, null, 2), [out]);
  const copy = (text, tag) => { try { navigator.clipboard?.writeText(text); setCopied(tag); setTimeout(() => setCopied(""), 1700); } catch { /* noop */ } };

  const lvlColor = { low: "var(--ink3)", medium: "var(--acc)", high: "var(--good)" }[out.insight_level];

  return (
    <div>
      <div className="rw-h1">🧬 ניתוח חיים</div>
      <div className="rw-sub">תקן אחיד נעול: קלט אחד → כל מנוע מחזיר אותו פלט → השוואה + עץ אחד (nodes+edges). הנתונים אצלך בלבד.</div>

      {/* ===== 📥 INPUT ===== */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>📥 הקלט שלך</div>

        <div style={lbl}>זהות</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
          <input style={inp} dir="rtl" value={p.identity.name} onChange={e => set("identity.name", e.target.value)} placeholder="שם מלא" />
          <input style={inp} dir="rtl" value={p.identity.birth_date} onChange={e => set("identity.birth_date", e.target.value)} placeholder="תאריך לידה" />
          <input style={inp} dir="rtl" value={p.identity.birth_place} onChange={e => set("identity.birth_place", e.target.value)} placeholder="מקום לידה" />
          <input style={inp} dir="rtl" value={p.identity.family.father} onChange={e => set("identity.family.father", e.target.value)} placeholder="שם האב" />
          <input style={inp} dir="rtl" value={p.identity.family.mother} onChange={e => set("identity.family.mother", e.target.value)} placeholder="שם האם" />
        </div>
        <div style={{ marginTop: 8 }}>
          <Chips label="ילדים" arr={p.identity.family.children} onAdd={v => pushArr("identity.family.children", v)} onDel={i => delArr("identity.family.children", i)} ph="שם ילד/ה + Enter" />
        </div>

        {/* ציר זמן */}
        <div style={{ ...lbl, marginTop: 14, fontSize: 13.5 }}>ציר זמן — אירועים משמעותיים</div>
        {p.timeline.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "0.9fr 1.6fr 1fr auto", gap: 6, marginBottom: 6 }}>
            <input style={inp} dir="rtl" value={e.date} onChange={ev => setEvent(i, "date", ev.target.value)} placeholder="תאריך" />
            <input style={inp} dir="rtl" value={e.title} onChange={ev => setEvent(i, "title", ev.target.value)} placeholder="מה קרה" />
            <select style={{ ...inp, cursor: "pointer" }} value={e.emotion} onChange={ev => setEvent(i, "emotion", ev.target.value)}>{EMOTIONS.map(t => <option key={t.key} value={t.key}>{t.sign} {t.label}</option>)}</select>
            <button onClick={() => delArr("timeline", i)} style={xbtn}>✕</button>
          </div>
        ))}
        <button onClick={addEvent} style={btn(false)}>➕ הוסף אירוע</button>

        {/* אנשים */}
        <div style={{ ...lbl, marginTop: 14, fontSize: 13.5 }}>אנשים משמעותיים</div>
        {p.entities.people.map((pe, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, marginBottom: 6 }}>
            <input style={inp} dir="rtl" value={pe.name} onChange={ev => setPerson(i, "name", ev.target.value)} placeholder="שם" />
            <input style={inp} dir="rtl" value={pe.status} onChange={ev => setPerson(i, "status", ev.target.value)} placeholder="קשר (בן/אם/חבר…)" />
            <button onClick={() => delArr("entities.people", i)} style={xbtn}>✕</button>
          </div>
        ))}
        <button onClick={addPerson} style={btn(false)}>➕ הוסף אדם</button>

        {/* ישויות + דפוסים */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 14 }}>
          <Chips label="מקומות (גרת/עבדת/טיילת)" arr={p.entities.places} onAdd={v => pushArr("entities.places", v)} onDel={i => delArr("entities.places", i)} ph="עיר/מדינה + Enter" />
          <Chips label="נושאי-חיים חוזרים" arr={p.patterns.life_themes} onAdd={v => pushArr("patterns.life_themes", v)} onDel={i => delArr("patterns.life_themes", i)} ph="חופש/שורשים/יצירה + Enter" />
          <Chips label="מספרים משמעותיים" arr={p.patterns.repeated_numbers} onAdd={v => pushArr("patterns.repeated_numbers", v)} onDel={i => delArr("patterns.repeated_numbers", i)} ph="מספר + Enter" />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={lbl}>הערות הקשר</div>
          <textarea style={{ ...inp, minHeight: 54, resize: "vertical" }} dir="rtl" value={p.context_notes} onChange={e => set("context_notes", e.target.value)} placeholder="כל דבר נוסף…" />
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => copy(json, "in")} style={btn(true)}>{copied === "in" ? "✓ הועתק" : "📋 העתק קלט (JSON)"}</button>
          <button onClick={() => { if (confirm("לאפס הכל?")) setP(emptyProfile()); }} style={xbtn}>אפס</button>
        </div>
      </div>

      {/* ===== ⚙️ פלט אחיד — מנוע מפת השדה ===== */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>🧭 מנוע «מפת השדה»</span>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--good)", background: "#e4f6ea", borderRadius: 999, padding: "2px 9px" }}>● מחושב · עובדה</span>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: lvlColor, marginInlineStart: "auto" }}>insight: {out.insight_level}</span>
        </div>
        <div className="rw-sub" style={{ marginTop: 4 }}>פלט בתקן האחיד — אותו פורמט שכל מנוע AI יחזיר.</div>

        <div style={{ marginTop: 10 }}>
          <div style={lbl}>core_axis</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--acc)" }}>{out.core_axis}</div>
        </div>

        {/* 🔵 מנוע הליבה — ערכי כל השיטות לציר הראשי (מקור-אמת יחיד) */}
        {out.axis?.text && <div style={{ marginTop: 12 }}>
          <div style={lbl}>🔵 מנוע הליבה · ערכי «{out.axis.text}» (כל השיטות)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(out.axis.values).filter(([, v]) => v).map(([k, v]) => (
              <Link key={k} to={`/number/${v}?from=life`} className="rw-chip" style={{ textDecoration: "none", color: "var(--ink)" }} title="פתח את דף המספר (חיבור לעולם/לגרף)">
                {k} <b style={{ color: "var(--acc)" }}>{v.toLocaleString("he")}</b>
              </Link>
            ))}
          </div>
        </div>}

        {/* 🌳 חיבור לציר הראשי */}
        {out.axisLinks?.length > 0 && <div style={{ marginTop: 12 }}>
          <div style={lbl}>🌳 מתחבר לציר הראשי «{out.axis.text}»</div>
          <div style={{ display: "grid", gap: 5 }}>
            {out.axisLinks.map((it, i) => (
              <div key={i} style={{ fontSize: 13.5 }}>
                <b>{it.kind}: {it.label}</b>{" "}
                {it.links.slice(0, 2).map((l, j) => (
                  <span key={j} className="rw-muted">{j > 0 && " · "}{l.entMethod}={l.axisMethod} <b style={{ color: "var(--acc)" }}>{l.value.toLocaleString("he")}</b></span>
                ))}
              </div>
            ))}
          </div>
        </div>}

        {out.clusters.length > 0 && <div style={{ marginTop: 12 }}>
          <div style={lbl}>clusters</div>
          {out.clusters.map((c, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><b>{c.name}</b><span className="rw-muted">{c.events.length} · {c.strength}</span></div>
              <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${c.strength}%`, height: "100%", background: "var(--acc)" }} /></div>
            </div>
          ))}
        </div>}

        {out.timeline_pressure.length > 0 && <div style={{ marginTop: 12 }}>
          <div style={lbl}>timeline_pressure</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{out.timeline_pressure.map((t, i) => <span key={i} className="rw-chip">{t.period} · {t.intensity}</span>)}</div>
        </div>}

        {out.relationships_graph.length > 0 && <div style={{ marginTop: 12 }}>
          <div style={lbl}>relationships_graph (עץ אחד)</div>
          <div style={{ display: "grid", gap: 4 }}>{out.relationships_graph.slice(0, 14).map((r, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--ink)" }}><b>{r.node_a}</b> <span style={{ color: "var(--ink3)" }}>—{r.relation}→</span> <b>{r.node_b}</b></div>
          ))}</div>
        </div>}

        <div style={{ marginTop: 12 }}>
          <div style={lbl}>summary</div>
          <div className="rw-muted" style={{ fontSize: 13.5 }}>{out.summary}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={() => copy(outJson, "out")} style={btn(false)}>{copied === "out" ? "✓ הועתק" : "📋 העתק פלט אחיד (JSON)"}</button>
        </div>
      </div>

      {/* ===== 🤖 מנועי AI — אותו פלט אחיד ===== */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>🤖 מנועי AI <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--acc)", background: "var(--accS)", borderRadius: 999, padding: "2px 9px", marginInlineStart: 6 }}>אותו תקן · השווה</span></div>
        <div className="rw-sub" style={{ marginTop: 4 }}>כל פרומפט מבקש את <b>אותו פלט אחיד</b>. העתק לכל מודל → הדבק את ה-JSON בחזרה → השוואה.</div>
        {LENSES.map(m => (
          <div key={m.key} style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 14 }}>{m.title}</b>
              <button onClick={() => copy(promptFor(input, m.lens), "pr" + m.key)} style={btn(true)}>{copied === "pr" + m.key ? "✓ הועתק" : "📋 העתק פרומפט"}</button>
            </div>
            <textarea style={{ ...inp, minHeight: 80, resize: "vertical", marginTop: 8 }} dir="rtl" value={p._engines[m.key] || ""} onChange={e => set("_engines." + m.key, e.target.value)} placeholder="הדבק כאן את ה-JSON שהמודל החזיר — להשוואה" />
          </div>
        ))}
        <div className="rw-sub" style={{ marginTop: 10 }}>↪ הפלט מ«מפת השדה» הוא קו-הבסיס. מה שחוזר גם אצל ה-AI = האות החזק ביותר (קונצנזוס).</div>
      </div>

      {/* ===== 🧠 Router — קונצנזוס בין מנועים ===== */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>🧠 Router · קונצנזוס</span>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--acc)", background: "var(--accS)", borderRadius: 999, padding: "2px 9px" }}>{consensus.engines} מנועים</span>
          {consensus.agreement != null && <span style={{ fontSize: 12, fontWeight: 800, color: "var(--good)", marginInlineStart: "auto" }}>הסכמה {consensus.agreement}%</span>}
        </div>
        <div className="rw-sub" style={{ marginTop: 4 }}>מאחד את כל המנועים לפלט אחד. מה שחוזר בין מנועים = חזק (✓ הסכמה); מה שסותר = מסומן.</div>

        {consensus.engines < 2 && <div className="rw-muted" style={{ marginTop: 8 }}>כרגע רץ רק מנוע השדה. הדבק פלט AI אחד או יותר למעלה → ה-Router יצליב וינקד הסכמה.</div>}

        {consensus.clusters.length > 0 && <div style={{ marginTop: 12 }}>
          <div style={lbl}>אשכולות מאוחדים</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {consensus.clusters.map((c, i) => <span key={i} className="rw-chip">{c.name} · {c.strength}{c.agree > 1 && <b style={{ color: "var(--good)" }}> ✓{c.agree}</b>}</span>)}
          </div>
        </div>}

        {consensus.edges.length > 0 && <div style={{ marginTop: 12 }}>
          <div style={lbl}>קצוות מאוחדים (עץ אחד)</div>
          <div style={{ display: "grid", gap: 4 }}>
            {consensus.edges.slice(0, 12).map((e, i) => (
              <div key={i} style={{ fontSize: 13, color: e.contradiction ? "#b4453a" : "var(--ink)" }}>
                <b>{e.a}</b> <span style={{ color: "var(--ink3)" }}>—{e.relations.join(" / ")}→</span> <b>{e.b}</b>
                {e.agree > 1 && <b style={{ color: "var(--good)" }}> ✓{e.agree}</b>}
                {e.contradiction && <span style={{ color: "#b4453a", fontWeight: 800 }}> ⚠ סתירה</span>}
              </div>
            ))}
          </div>
        </div>}

        {consensus.contradictions.length > 0 && <div style={{ marginTop: 12 }}>
          <div style={{ ...lbl, color: "#b4453a" }}>⚠ סתירות בין מנועים ({consensus.contradictions.length})</div>
          <div className="rw-muted" style={{ fontSize: 12.5 }}>{consensus.contradictions.slice(0, 5).map(c => `${c.a}⇄${c.b}: ${c.relations.join(" / ")}`).join(" · ")}</div>
        </div>}

        <div style={{ marginTop: 12 }}>
          <div style={lbl}>summary</div>
          <div className="rw-muted" style={{ fontSize: 13.5 }}>
            {consensus.engines} מנועים · {consensus.clusters.length} אשכולות · {consensus.edges.length} קצוות · {consensus.contradictions.length} סתירות · insight: {consensus.insight_level}
          </div>
        </div>
      </div>
    </div>
  );
}
