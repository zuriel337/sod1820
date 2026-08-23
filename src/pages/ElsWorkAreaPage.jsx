import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import TzofenEmbed from "../components/TzofenEmbed.jsx";

// 🧭 ELS Research Studio — /lab/els
// UI בלבד מעל אותו TzofenEmbed / אותו מנוע קנוני. אין fork ואין חישוב ELS ב-React.
// כל FACT שמוצג מגיע מ-type:"state" של המנוע. יכולות שטרם מחוברות מסומנות במפורש כ"השלב הבא".

const MODES = [
  { id: "discover", icon: "🔭", title: "גילוי", sub: "חיפוש ומטריצה" },
  { id: "investigate", icon: "🧬", title: "חקירה", sub: "Finding במרכז" },
  { id: "judge", icon: "⚖️", title: "שיפוט", sub: "ראיות לפני החלטה" },
];

const SEARCH_LABEL = {
  regular: "חיפוש רגיל",
  "cross-simple": "הצלבה פשוטה",
  "cross-free": "התכנסות חופשית",
  bridge: "גשר דו־מונחי",
  cross: "הצלבה",
};

const num = (v) => Number.isFinite(Number(v)) ? Number(v).toLocaleString("he-IL") : "—";
const direction = (v) => v === "back" ? "אחורה ↑" : "קדימה ↓";

export default function ElsWorkAreaPage() {
  const P = usePalette();
  const [state, setState] = useState(null);
  const [mode, setMode] = useState("investigate");
  const [seen, setSeen] = useState(0);
  const [rawOpen, setRawOpen] = useState(false);

  useEffect(() => {
    applySeo({
      title: "Research Studio · הצופן התנ״כי",
      description: "סביבת המחקר החדשה של SOD1820 מעל מנוע ה-ELS הקנוני",
      path: "/lab/els",
    });
  }, []);

  const onState = useCallback((next) => {
    setState(next);
    setSeen((n) => n + 1);
  }, []);

  const ok = state?.status === "ok";
  const axis = state?.axis || {};
  const occurrence = state?.occurrence || {};
  const geometry = state?.geometry || {};
  const provenance = state?.provenance || {};
  const search = state?.search || {};
  const findings = Array.isArray(state?.findings) ? state.findings : [];

  const positions = useMemo(() => {
    if (!ok || !Number.isFinite(axis.start) || !Number.isFinite(axis.skip) || !Number.isFinite(state?.length)) return [];
    const sign = axis.direction === "back" ? -1 : 1;
    return Array.from({ length: state.length }, (_, i) => axis.start + sign * axis.skip * i);
  }, [ok, axis.start, axis.skip, axis.direction, state?.length]);

  const card = {
    background: P.cardGrad,
    border: `1px solid ${P.border}`,
    borderRadius: 18,
    boxSizing: "border-box",
  };
  const soft = {
    background: P.cardSoft,
    border: `1px solid ${P.border}`,
    borderRadius: 14,
  };
  const sectionTitle = {
    color: P.accentText,
    fontFamily: F.heading,
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: 0.2,
  };
  const muted = { color: P.inkSoft, fontFamily: F.body };

  const Fact = ({ label, value, mono = false }) => (
    <div style={{ minWidth: 0, padding: "9px 0", borderBottom: `1px solid ${P.border}` }}>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800 }}>{label}</div>
      <div style={{ color: P.ink, fontFamily: mono ? "ui-monospace,monospace" : F.body, fontSize: 13.5, fontWeight: 750, marginTop: 3, overflowWrap: "anywhere" }}>{value ?? "—"}</div>
    </div>
  );

  const Next = ({ children }) => (
    <div style={{ ...soft, padding: "10px 12px", color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65 }}>
      <b style={{ color: P.accentDim }}>השלב הבא · </b>{children}
    </div>
  );

  return (
    <div dir="rtl" style={{ position: "relative", zIndex: 1, maxWidth: 1480, margin: "0 auto", padding: "16px 12px 90px" }}>
      <style>{`
        .els-studio-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start}
        .els-studio-inspector{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto}
        .els-mode-row{display:flex;gap:8px;flex-wrap:wrap}
        .els-mode-btn{min-height:46px;cursor:pointer}
        .els-findings{display:flex;flex-wrap:wrap;gap:7px}
        @media(max-width:980px){.els-studio-grid{grid-template-columns:1fr}.els-studio-inspector{position:static;max-height:none;overflow:visible}}
      `}</style>

      <header style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 13 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 900, letterSpacing: 1.1 }}>SOD1820 · ELS LAB</div>
          <h1 style={{ margin: "3px 0 0", color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,4vw,38px)", lineHeight: 1.05 }}>
            הצופן התנ״כי · Research Studio
          </h1>
        </div>
        <span style={{ ...soft, padding: "6px 10px", color: seen ? P.accentText : P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800 }}>
          {seen ? `● חוט חי · ${seen} state` : "○ ממתין ל-state"}
        </span>
        <Link to="/code" style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
          פתח את כלי הצופן המלא ←
        </Link>
      </header>

      <div className="els-mode-row" style={{ marginBottom: 14 }}>
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button key={m.id} type="button" className="els-mode-btn" onClick={() => setMode(m.id)} style={{
              flex: "1 1 180px", borderRadius: 14, padding: "8px 13px", textAlign: "right",
              border: `1px solid ${active ? "transparent" : P.border}`,
              background: active ? P.accentBtn : P.cardSoft,
              color: active ? P.onAccent : P.ink,
              fontFamily: F.body,
            }}>
              <b style={{ fontFamily: F.heading, fontSize: 14 }}>{m.icon} {m.title}</b>
              <span style={{ display: "block", fontSize: 11.5, marginTop: 2, opacity: 0.8 }}>{m.sub}</span>
            </button>
          );
        })}
      </div>

      <div className="els-studio-grid">
        <main style={{ minWidth: 0 }}>
          <section style={{ ...card, padding: 10, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "3px 5px 10px", flexWrap: "wrap" }}>
              <div>
                <div style={sectionTitle}>מנוע ELS קנוני</div>
                <div style={{ ...muted, fontSize: 11.5, marginTop: 2 }}>אותו TzofenEmbed · אין מנוע שני · אין חישוב ב-React</div>
              </div>
              {ok && <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 900 }}>«{state.termRaw || state.term}» · דילוג {num(axis.skip)}</div>}
            </div>
            <TzofenEmbed onState={onState} />
          </section>

          {mode === "discover" && (
            <section style={{ ...card, marginTop: 14, padding: 16 }}>
              <div style={sectionTitle}>🔭 שכבת גילוי</div>
              <p style={{ ...muted, fontSize: 13, lineHeight: 1.75, margin: "7px 0 12px" }}>המסך הזה משאיר את המטריצה והחיפוש במרכז. ה-Inspector מתעדכן בכל מעבר מופע ורינדור בלי להריץ שאילתה נוספת.</p>
              <div className="els-findings">
                {findings.length ? findings.map((f, i) => <span key={`${f.t}-${i}`} style={{ ...soft, padding: "7px 10px", color: P.ink, fontFamily: F.body, fontSize: 12.5 }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: f.color, marginInlineEnd: 6 }} />{f.t} · {num(f.shown?.length)}/{num(f.total)}</span>) : <span style={{ ...muted, fontSize: 13 }}>חפש מונח או הוסף ממצאים במנוע כדי להתחיל.</span>}
              </div>
              <div style={{ marginTop: 12 }}><Next>FORMS, Split/Join, arbitrary skips ו-lenses ייכנסו רק אחרי שער נפרד; הם לא מזויפים כאן כפעילים.</Next></div>
            </section>
          )}

          {mode === "investigate" && (
            <section style={{ ...card, marginTop: 14, padding: 16 }}>
              <div style={sectionTitle}>🧬 חבילת המחקר של ה-Finding</div>
              {!ok ? <p style={{ ...muted, fontSize: 13.5, lineHeight: 1.8 }}>בצע חיפוש במנוע. כאשר מתקבל Finding, החבילה כאן נוצרת רק מה-state האמיתי.</p> : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 10 }}>
                    <div style={{ ...soft, padding: 12 }}><div style={sectionTitle}>זהות מנוע</div><div style={{ ...muted, fontSize: 12.5, marginTop: 5 }}>{state.term} · {direction(axis.direction)} · skip {num(axis.skip)} · start {num(axis.start)}</div></div>
                    <div style={{ ...soft, padding: 12 }}><div style={sectionTitle}>מופע</div><div style={{ ...muted, fontSize: 12.5, marginTop: 5 }}>{num((occurrence.index ?? 0) + 1)} מתוך {num(occurrence.count)}{occurrence.capped ? "+" : ""}</div></div>
                    <div style={{ ...soft, padding: 12 }}><div style={sectionTitle}>חלון</div><div style={{ ...muted, fontSize: 12.5, marginTop: 5 }}>S={num(geometry.S)} · rows {num(geometry.r0)}–{num(geometry.r1)}</div></div>
                  </div>
                  <div style={{ marginTop: 10 }}><Next>פסוק/context מלא אינו חלק מ-state v1 בכוונה. נחבר אותו on-demand ב-Vertical Slice הבא, בלי להמציא פסוק בצד ה-UI.</Next></div>
                </>
              )}
            </section>
          )}

          {mode === "judge" && (
            <section style={{ ...card, marginTop: 14, padding: 16 }}>
              <div style={sectionTitle}>⚖️ חבילת ראיות לפני Human-Gate</div>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <div style={{ ...soft, padding: 11, color: P.ink, fontFamily: F.body, fontSize: 12.5 }}><b style={{ color: P.accentText }}>FACT · </b>{ok ? `המנוע מצא «${state.termRaw || state.term}» בדילוג ${num(axis.skip)}, ${direction(axis.direction)}, start ${num(axis.start)}.` : "עדיין אין Finding פעיל."}</div>
                <div style={{ ...soft, padding: 11, color: P.ink, fontFamily: F.body, fontSize: 12.5 }}><b style={{ color: P.accentText }}>PROVENANCE · </b>{provenance.cipherSlug || provenance.author ? `${provenance.cipherSlug || "צופן לא-שמור"}${provenance.author ? ` · ${provenance.author}` : ""}` : "אין provenance של צופן שמור ב-state הנוכחי."}</div>
                <div style={{ ...soft, padding: 11, color: P.inkSoft, fontFamily: F.body, fontSize: 12.5 }}><b style={{ color: P.accentDim }}>AI/RAZIEL · </b>לא מחובר בשלב הזה; לא מוצגת המלצה מומצאת.</div>
              </div>
              <button type="button" disabled style={{ width: "100%", marginTop: 12, minHeight: 48, borderRadius: 13, border: `1px solid ${P.border}`, background: P.cardSoft, color: P.inkSoft, fontFamily: F.heading, fontWeight: 900, opacity: 0.75 }}>שלח לשיפוט · ייפתח ב-Vertical Slice</button>
            </section>
          )}
        </main>

        <aside className="els-studio-inspector" style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div>
              <div style={sectionTitle}>Research Inspector</div>
              <div style={{ ...muted, fontSize: 11.5, marginTop: 2 }}>{ok ? "Finding פעיל" : state?.status === "empty" ? "אין ממצא בחיפוש האחרון" : "ממתין למנוע"}</div>
            </div>
            <span style={{ ...soft, padding: "5px 8px", color: ok ? P.accentText : P.inkSoft, fontFamily: F.heading, fontSize: 10.5, fontWeight: 900 }}>{state?.status || "idle"}</span>
          </div>

          {state?.status === "empty" && (
            <div style={{ marginTop: 12 }}>
              <Fact label="מונח" value={`«${state.termRaw || "—"}»`} />
              <Fact label="היקף" value={state.scope === "tanakh" ? "כל התנ״ך" : "תורה"} />
              <Fact label="אותיות בקורפוס" value={num(state.corpusLetters)} />
            </div>
          )}

          {ok && (
            <div style={{ marginTop: 12 }}>
              <Fact label="מונח" value={`«${state.termRaw || state.term}»`} />
              <Fact label="מצב חיפוש" value={SEARCH_LABEL[search.mode] || search.mode || "—"} />
              <Fact label="דילוג / כיוון" value={`${num(axis.skip)} · ${direction(axis.direction)}`} />
              <Fact label="start / hitId" value={`${num(axis.start)} · ${axis.hitId || "—"}`} mono />
              <Fact label="מופע" value={`${num((occurrence.index ?? 0) + 1)} / ${num(occurrence.count)}${occurrence.capped ? "+" : ""}`} />
              <Fact label="מיקומי האותיות" value={positions.length ? positions.map(num).join(" · ") : "—"} mono />
              <Fact label="גאומטריה" value={`S ${num(geometry.S)} · col ${num(geometry.mainCol)} · c0 ${num(geometry.c0)} · cw ${num(geometry.cw)}`} />
              <Fact label="ממצאים נוספים" value={findings.length ? findings.map((f) => f.t).join(" · ") : "אין"} />
              <Fact label="צופן שמור" value={provenance.cipherSlug || "—"} />
              <Fact label="מחבר" value={provenance.author || "—"} />
              <Fact label="תיאור" value={provenance.desc || "—"} />
            </div>
          )}

          {!state && <div style={{ ...muted, fontSize: 13, lineHeight: 1.8, marginTop: 14 }}>חפש מונח בכלי. ה-Inspector יתמלא אוטומטית מה-engine state.</div>}

          <button type="button" onClick={() => setRawOpen((v) => !v)} style={{ width: "100%", minHeight: 42, marginTop: 12, borderRadius: 12, border: `1px solid ${P.border}`, background: "transparent", color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            {rawOpen ? "הסתר state גולמי" : "פתח state גולמי"}
          </button>
          {rawOpen && <pre style={{ direction: "ltr", textAlign: "left", whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 300, overflow: "auto", margin: "8px 0 0", padding: 10, borderRadius: 12, background: P.cardSoft, color: P.inkSoft, fontSize: 10.5 }}>{JSON.stringify(state, null, 2)}</pre>}

          <div style={{ marginTop: 12 }}><Next>החיבור הבא: verse/context + FindingID הקנוני + provenance envelope + decision_ledger. ה-Inspector הזה הוא הבית שאליו הם ייכנסו.</Next></div>
        </aside>
      </div>
    </div>
  );
}
