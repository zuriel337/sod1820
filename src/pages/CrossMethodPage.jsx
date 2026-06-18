import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F, KEY_NUMBERS } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";

// ===== הצלבת שיטות — "מסר מצטרף לפי מספר" =====
// מזינים מספר. המערכת שולפת את כל הביטויים *המאומתים* שנופלים על המספר הזה בכל שיטה,
// ומציגה אותם מקובצים לפי שיטה — כך שמתקבל מסר אחד שכל השיטות מתכנסות אליו.
// מקור: gematria_words (is_verified=true). השדות הם עמודות-השיטה במסד.

// סדר התצוגה + השמות התואמים לעמודות המסד.
const METHOD_COLS = [
  { col: "ragil",    name: "רגיל",   sub: "חיבור ערכי האותיות", soul: "המהות הגלויה", icon: "✦" },
  { col: "miluy",    name: "מילוי",  sub: "ערך שֵם האות המלא", soul: "הפנימיות — מה שמתמלא בפנים", icon: "🫧" },
  { col: "misratar", name: "מסתתר",  sub: "הפרשים בין אותיות", soul: "מה שמסתתר בין האותיות", icon: "🔍" },
  { col: "kadmi",    name: "קדמי",   sub: "סכום מצטבר עד האות", soul: "השורש המצטבר", icon: "🌱" },
  { col: "gadol",    name: "גדול",   sub: "סופיות 500–900", soul: "ההתפשטות הגדולה", icon: "🔥" },
  { col: "siduri",   name: "סידורי", sub: "מיקום האות 1–22", soul: "הסדר והמיקום", icon: "🔢" },
  { col: "atbash",   name: "אתבש",   sub: "היפוך הא״ב", soul: "המראה — הצד הנגדי", icon: "🪞" },
  { col: "albam",    name: "אלבם",   sub: "חצי מול חצי", soul: "בן/בת הזוג — הזיווג המשלים", icon: "💍" },
  { col: "ribua",    name: "ריבוע",  sub: "ערך בריבוע", soul: "העָצמה — הערך בריבוע", icon: "💠" },
];
const METHOD_BY_COL = Object.fromEntries(METHOD_COLS.map(m => [m.col, m]));
const SELECT = "phrase,category," + METHOD_COLS.map(m => m.col).join(",");
const TOTAL_METHODS = METHOD_COLS.length;

const SAMPLES = [1820, 313, 326, 322, 1234, 776, 86];

export default function CrossMethodPage() {
  const P = usePalette();
  const btn = { cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "10px 20px" };
  const chip = { cursor: "pointer", background: P.card, color: P.ink, border: `1px solid ${P.border}`, borderRadius: 999, fontFamily: F.mono, fontSize: 14, padding: "7px 16px" };
  const chipOn = { borderColor: P.accent, color: P.accentText, background: P.cardSoft };
  const phraseChip = { background: P.cardSoft, color: P.ink, border: `1px solid ${P.border}`, borderRadius: 999, fontFamily: F.body, fontSize: 13.5, padding: "5px 12px", textDecoration: "none" };
  const [params] = useSearchParams();
  const initN = Number(params.get("n")) || 1820;   // עומק-לינק: /cross?n=1820 (מ-/topic)
  const [input, setInput] = useState(String(initN));
  const [num, setNum] = useState(initN);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState([]);   // ישויות מאומתות שנופלות על המספר (מדורגות לפי משמעות)
  const [related, setRelated] = useState([]);     // ישויות קרובות דרך הגרף (edges)
  const [cards, setCards] = useState([]);         // כרטיסי התכנסות שמכילים את המספר (גשר ל-/topic)

  // כרטיסי התכנסות שמכילים את המספר — הגשר לציר ההתכנסות
  useEffect(() => {
    let live = true; setCards([]);
    if (!num || num <= 0) return;
    import("../lib/supabase.js").then(({ getTopicCards }) =>
      getTopicCards({ approvedOnly: true }).then(all => {
        if (live) setCards((all || []).filter(c => (c.numbers || []).includes(num)));
      })).catch(() => {});
    return () => { live = false; };
  }, [num]);

  useEffect(() => { document.title = `הצלבת שיטות · ${num} · סוד 1820`; }, [num]);

  useEffect(() => {
    let live = true;
    if (!num || num <= 0) { setRows([]); return; }
    setLoading(true);
    const orFilter = METHOD_COLS.map(m => `${m.col}.eq.${num}`).join(",");
    supabase.from("gematria_words").select(SELECT)
      .eq("is_verified", true).or(orFilter).limit(800)
      .then(({ data }) => { if (live) { setRows(data || []); setLoading(false); } });
    return () => { live = false; };
  }, [num]);

  // שכבת הישויות: מאילו מהביטויים שנפלו על המספר הם ישויות-זהב (node), ומה הקשרים שלהן.
  useEffect(() => {
    let live = true;
    const phrases = [...new Set(rows.map(r => r.phrase))];
    if (!phrases.length) { setEntities([]); setRelated([]); return; }
    (async () => {
      const { data: ents } = await supabase.from("nodes")
        .select("id,label,weight,description,metadata").eq("type", "entity").eq("is_active", true).in("label", phrases);
      if (!live) return;
      const E = (ents || []).map(n => ({ id: n.id, label: n.label, weight: n.weight || 3, world: n.metadata?.world, desc: n.description, tier: n.metadata?.tier || null, display: n.metadata?.display || null }))
        .sort((a, b) => (b.tier === "gold" ? 1 : 0) - (a.tier === "gold" ? 1 : 0) || b.weight - a.weight);
      setEntities(E);
      if (!E.length) { setRelated([]); return; }
      const { data: eg } = await supabase.from("edges")
        .select("to_node").eq("relation_type", "related").in("from_node", E.map(e => e.id));
      const toIds = [...new Set((eg || []).map(x => x.to_node))];
      if (!toIds.length) { setRelated([]); return; }
      const { data: rn } = await supabase.from("nodes")
        .select("label,weight,metadata").eq("is_active", true).in("id", toIds);
      if (!live) return;
      const have = new Set(E.map(e => e.label));
      setRelated((rn || [])
        .filter(n => !have.has(n.label))
        .map(n => ({ label: n.label, weight: n.weight || 3, world: n.metadata?.world }))
        .sort((a, b) => b.weight - a.weight));
    })();
    return () => { live = false; };
  }, [rows]);

  // קיבוץ לפי שיטה — לכל שיטה רשימת הביטויים שנופלים על המספר בה.
  const groups = useMemo(() => {
    return METHOD_COLS
      .map(m => ({ ...m, phrases: [...new Set(rows.filter(r => r[m.col] === num).map(r => r.phrase))] }))
      .filter(g => g.phrases.length > 0)
      .sort((a, b) => b.phrases.length - a.phrases.length);
  }, [rows, num]);

  const allPhrases = useMemo(() => [...new Set(rows.map(r => r.phrase))], [rows]);
  const methodsHit = groups.length;
  const meaning = KEY_NUMBERS[num];

  // לכל ביטוי — דרך אילו שיטות הוא נפל על המספר (נשמת השיטה).
  const phraseMethods = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const hits = METHOD_COLS.filter(m => r[m.col] === num).map(m => m.col);
      if (hits.length) map[r.phrase] = [...new Set([...(map[r.phrase] || []), ...hits])];
    }
    return map;
  }, [rows, num]);

  // מסר נרטיבי — נבנה מהעולמות והקשרים של הישויות.
  const narrative = useMemo(() => {
    if (!entities.length) return null;
    const worlds = [...new Set(entities.map(e => e.world).filter(Boolean))].slice(0, 3);
    const tops = entities.slice(0, 3).map(e => e.label);
    const rel = related.slice(0, 4).map(r => r.label);
    let s = `המספר ${num} נע סביב ` + (worlds.length ? `עולמות של ${worlds.join(" · ")}` : "ציר משמעות אחד");
    if (tops.length) s += `, ומתכנס אל ${tops.join(" · ")}`;
    s += rel.length ? `. קשריו מובילים גם אל ${rel.join(" · ")}.` : ".";
    return s;
  }, [entities, related, num]);

  function go(v) {
    const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
    if (n > 0) { setNum(n); setInput(String(n)); }
  }
  function submit(e) { e.preventDefault(); go(input); }

  return (
    <div style={{ direction: "rtl", maxWidth: 1040, margin: "0 auto", padding: "26px 16px 80px", color: P.inkSoft, background: P.pageBg }}>

      {/* כותרת */}
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>הצלבת שיטות</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, margin: "6px 0 8px", textShadow: `0 0 40px ${P.glow}` }}>
          המסר המצטרף שמאחורי המספר
        </h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, maxWidth: 640, margin: "0 auto" }}>
          כל הביטויים <b style={{ color: P.ink }}>המאומתים</b> שנופלים על אותו מספר — בכל שיטה ושיטה.
          כשמספר אחד הוא נקודת מפגש של שיטות רבות, הביטויים סביבו נקראים יחד כמסר.
        </p>
      </header>

      {/* קלט */}
      <form onSubmit={submit} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} inputMode="numeric"
          placeholder="הקלידו מספר…"
          style={{ background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.accentText, fontFamily: F.mono, fontSize: 18, padding: "10px 22px", outline: "none", textAlign: "center", width: 160, letterSpacing: 1 }} />
        <button type="submit" style={btn}>הצלב ✦</button>
      </form>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
        {SAMPLES.map(s => (
          <button key={s} onClick={() => go(s)} style={{ ...chip, ...(s === num ? chipOn : {}) }}>{s}</button>
        ))}
      </div>

      {/* 🧩 גשר לציר ההתכנסות — אם יש כרטיס על המספר */}
      {cards.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {cards.map(c => (
            <Link key={c.id} to={`/topic/${encodeURIComponent(c.slug)}`} style={{
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7,
              background: P.cardGrad,
              border: `1px solid ${P.accent}`, borderRadius: 999, padding: "7px 16px",
              color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700,
            }}>🧩 ציר התכנסות: {c.title} →</Link>
          ))}
        </div>
      )}

      {/* המספר + סיכום */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(44px,11vw,84px)", fontWeight: 800, lineHeight: 1, textShadow: `0 0 50px ${P.glow}` }}>{num}</div>
        {meaning && <div style={{ color: P.accent, fontFamily: F.regal, fontSize: 16, marginTop: 6 }}>{meaning}</div>}
        <div style={{ marginTop: 12, display: "inline-flex", gap: 18, flexWrap: "wrap", justifyContent: "center", color: P.inkSoft, fontFamily: F.body, fontSize: 13.5 }}>
          <span>מתכנס ב־<b style={{ color: P.ink, fontFamily: F.mono, fontSize: 16 }}>{methodsHit}</b> מתוך {TOTAL_METHODS} שיטות</span>
          <span>·</span>
          <span><b style={{ color: P.ink, fontFamily: F.mono, fontSize: 16 }}>{allPhrases.length}</b> ביטויים מאומתים</span>
          {methodsHit === TOTAL_METHODS && (
            <span style={{ color: P.accentText, fontWeight: 700 }}>✦ התכנסות מלאה</span>
          )}
        </div>
      </div>

      {/* ✨ המסר המרכזי — ישויות-זהב מדורגות לפי משמעות */}
      {!loading && entities.length > 0 && (
        <section style={{ marginBottom: 18, background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "16px 20px" }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>✨ המסר המרכזי</div>
          {/* מסר מהמספרים (AI) — סגור עד שהמנוע יושלם */}
          <div style={{ textAlign: "center", margin: "0 auto 14px", maxWidth: 600, color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, letterSpacing: 1, border: `1px dashed ${P.borderStrong}`, borderRadius: 10, padding: "11px 14px" }}>
            🔒 מסר מהמספרים (AI) — המנוע עדיין בפיתוח
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, maxWidth: 480, margin: "0 auto" }}>
            {entities.map(e => {
              const vias = (phraseMethods[e.label] || []).map(c => METHOD_BY_COL[c]).filter(Boolean);
              const isGold = e.tier === "gold";
              return (
              <Link key={e.label} to={`/number/${encodeURIComponent(e.label)}`} style={{ display: "block", textDecoration: "none",
                padding: isGold ? "13px 15px" : "9px 13px", borderRadius: isGold ? 13 : 10,
                background: isGold ? P.cardGrad : P.card,
                border: isGold ? `1.5px solid ${P.accent}` : `1px solid ${P.border}`,
                boxShadow: isGold ? `0 0 28px ${P.glow}` : "none" }}>
                {isGold && <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 11, letterSpacing: 2.5, marginBottom: 5 }}>👑 ישות זהב</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: isGold ? 22 : 19, fontWeight: 700, minWidth: 96 }}>{e.display || e.label}</span>
                  {isGold ? <span style={{ fontSize: 18 }} title="ישות זהב">👑</span> : <Stars n={e.weight} P={P} />}
                  {e.world && <span style={{ marginInlineStart: "auto", color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>{e.world}</span>}
                </div>
                {isGold && e.display && e.display !== e.label && (
                  <div style={{ color: P.ink, fontFamily: F.body, fontSize: 12.5, marginTop: 5, opacity: 0.9 }}>{e.label} = {num}</div>
                )}
                {e.desc && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, marginTop: 3 }}>{e.desc}</div>}
                {vias.length > 0 && (
                  <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {vias.map(m => (
                      <span key={m.col} title={m.soul} style={{ color: (m.col === "atbash" || m.col === "albam") ? P.accentText : P.accentDim, fontFamily: F.body, fontSize: 11, border: `1px solid ${P.border}`, borderRadius: 999, padding: "1px 8px" }}>
                        {m.icon} {m.name}{(m.col === "atbash" || m.col === "albam") ? ` · ${m.soul}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );})}
          </div>
          {related.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${P.border}` }}>
              <div style={{ color: P.accent, fontFamily: F.heading, fontSize: 12.5, marginBottom: 8 }}>🌳 ישויות קרובות</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {related.slice(0, 12).map(r => (
                  <Link key={r.label} to={`/number/${encodeURIComponent(r.label)}`} style={{ ...phraseChip, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {r.label} <span style={{ color: P.accentDim, fontSize: 10 }}>{"★".repeat(r.weight)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* מצב */}
      {loading && <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 30 }}>טוען…</div>}
      {!loading && allPhrases.length === 0 && (
        <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: 30 }}>
          אין ביטוי מאומת שנופל על {num} באף שיטה. נסו מספר אחר.
        </div>
      )}

      {/* טבלת השיטות */}
      {!loading && groups.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {groups.map(g => (
            <section key={g.col} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ borderBottom: `1px solid ${P.border}`, paddingBottom: 8, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>{g.icon} {g.name}</span>
                  <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5 }}>{g.sub}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ color: P.accent, fontFamily: F.mono, fontSize: 13 }}>{g.phrases.length}</span>
                </div>
                <div style={{ color: P.accent, fontFamily: F.body, fontSize: 11.5, fontStyle: "italic", marginTop: 2 }}>{g.soul}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {g.phrases.map(p => (
                  <Link key={p} to={`/number/${encodeURIComponent(p)}`} style={phraseChip}>{p}</Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* רצועת המסר — כל הביטויים יחד */}
      {!loading && allPhrases.length > 1 && (
        <section style={{ marginTop: 26, background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>
            המסר המצטרף · {num}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", lineHeight: 2 }}>
            {allPhrases.map((p, i) => (
              <React.Fragment key={p}>
                <Link to={`/number/${encodeURIComponent(p)}`} style={{ color: P.ink, fontFamily: F.regal, fontSize: 17, textDecoration: "none" }}>{p}</Link>
                {i < allPhrases.length - 1 && <span style={{ color: P.accentDim }}>·</span>}
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      <div style={{ textAlign: "center", marginTop: 26, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/journey" style={{ textDecoration: "none", background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "9px 22px", borderRadius: 999 }}>🎲 קחו אותי למסע</Link>
        <Link to="/beit-midrash" style={{ ...chip, textDecoration: "none" }}>← לבית המדרש</Link>
      </div>
    </div>
  );
}

function Stars({ n = 3, P }) {
  return (
    <span style={{ color: P.accent, fontSize: 13, letterSpacing: 1, whiteSpace: "nowrap" }} title={`משמעות ${n}/5`}>
      {"★".repeat(n)}<span style={{ color: P.border }}>{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}
