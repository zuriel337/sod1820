import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import TzofenEmbed from "../components/TzofenEmbed.jsx";

// ELS Lab Surface v2
// אותו מנוע קנוני בלבד. ה-iframe הישן משמש bridge חישובי מאחורי הקלעים;
// ה-React host אינו מחשב ELS ואינו ממציא אותיות מטריצה.
// state.matrix הוא חוזה additive עתידי: עד שיגיע, מוצג axis-evidence אמיתי בלבד.

const MODES = [
  { id: "discover", icon: "🔭", title: "גילוי" },
  { id: "investigate", icon: "🧬", title: "חקירה" },
  { id: "judge", icon: "⚖️", title: "שיפוט" },
];

const SEARCH_LABEL = {
  regular: "חיפוש רגיל",
  "cross-simple": "הצלבה פשוטה",
  "cross-free": "התכנסות חופשית",
  bridge: "גשר דו־מונחי",
  cross: "הצלבה",
};

const n = (v) => Number.isFinite(Number(v)) ? Number(v).toLocaleString("he-IL") : "—";
const dir = (v) => v === "back" ? "אחורה ↑" : "קדימה ↓";

export default function ElsWorkAreaPage() {
  const P = usePalette();
  const [engineState, setEngineState] = useState(null);
  const [mode, setMode] = useState("discover");
  const [query, setQuery] = useState("");
  const [seed, setSeed] = useState("");
  const [runNonce, setRunNonce] = useState(0);
  const [seen, setSeen] = useState(0);
  const [showEngine, setShowEngine] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);

  useEffect(() => {
    applySeo({
      title: "ELS Research Studio · סוד 1820",
      description: "סביבת המחקר החדשה של הצופן התנ״כי מעל מנוע ה-ELS הקנוני",
      path: "/lab/els",
    });
  }, []);

  const onState = useCallback((next) => {
    setEngineState(next);
    setSeen((x) => x + 1);
  }, []);

  const runSearch = (e) => {
    e?.preventDefault?.();
    const q = query.trim();
    if (q.length < 2) return;
    setEngineState(null);
    setSeed(q);
    setRunNonce((x) => x + 1);
  };

  const s = engineState;
  const ok = s?.status === "ok";
  const axis = s?.axis || {};
  const occ = s?.occurrence || {};
  const geo = s?.geometry || {};
  const prov = s?.provenance || {};
  const findings = Array.isArray(s?.findings) ? s.findings : [];
  const matrix = s?.matrix || null;

  const positions = useMemo(() => {
    if (!ok || !Number.isFinite(axis.start) || !Number.isFinite(axis.skip) || !Number.isFinite(s?.length)) return [];
    const sign = axis.direction === "back" ? -1 : 1;
    return Array.from({ length: s.length }, (_, i) => axis.start + sign * axis.skip * i);
  }, [ok, axis.start, axis.skip, axis.direction, s?.length]);

  const axisSet = useMemo(() => new Set(positions), [positions]);
  const marks = useMemo(() => {
    const m = new Map();
    if (Array.isArray(matrix?.marks)) matrix.marks.forEach((x) => m.set(Number(x.i), x));
    return m;
  }, [matrix]);

  const card = { background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 18, boxSizing: "border-box" };
  const soft = { background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 13 };
  const title = { color: P.accentText, fontFamily: F.heading, fontWeight: 900, fontSize: 13 };
  const muted = { color: P.inkSoft, fontFamily: F.body };

  const Fact = ({ label, value, mono = false }) => (
    <div style={{ padding: "8px 0", borderBottom: `1px solid ${P.border}`, minWidth: 0 }}>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 850 }}>{label}</div>
      <div style={{ color: P.ink, fontFamily: mono ? "ui-monospace,monospace" : F.body, fontSize: 13.5, fontWeight: 730, marginTop: 2, overflowWrap: "anywhere" }}>{value ?? "—"}</div>
    </div>
  );

  const Next = ({ children }) => (
    <div style={{ ...soft, padding: "10px 12px", color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65 }}>
      <b style={{ color: P.accentDim }}>השלב הבא · </b>{children}
    </div>
  );

  const renderMatrix = () => {
    if (!ok) {
      return <div style={{ minHeight: 360, display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
        <div>
          <div style={{ fontSize: 42, marginBottom: 10 }}>✦</div>
          <div style={{ ...title, fontSize: 18 }}>הבמה מוכנה</div>
          <div style={{ ...muted, fontSize: 13.5, marginTop: 7, lineHeight: 1.7 }}>הקלד מונח למעלה. החיפוש רץ במנוע הקנוני מאחורי הקלעים.</div>
        </div>
      </div>;
    }

    if (matrix?.rows?.length) {
      const r0 = Number(matrix.r0 ?? geo.r0 ?? 0);
      const c0 = Number(matrix.c0 ?? geo.c0 ?? 0);
      const S = Number(matrix.S ?? geo.S ?? 0);
      return <div style={{ overflow: "auto", padding: 12 }}>
        <div style={{ width: "max-content", minWidth: "100%", direction: "ltr", fontFamily: "serif" }}>
          {matrix.rows.map((row, ri) => (
            <div key={ri} style={{ display: "flex", justifyContent: "center" }}>
              {Array.from(row).map((letter, ci) => {
                const idx = (r0 + ri) * S + (c0 + ci);
                const mark = marks.get(idx);
                const isAxis = axisSet.has(idx) || mark?.type === "main";
                const bg = isAxis ? P.accentBtn : mark?.color || "transparent";
                return <span key={idx} title={`index ${idx}`} style={{
                  width: 27, height: 29, display: "inline-grid", placeItems: "center", flex: "0 0 27px",
                  color: isAxis ? P.onAccent : P.ink, background: bg, borderRadius: 5,
                  fontWeight: isAxis || mark ? 900 : 500, fontSize: 17,
                }}>{letter}</span>;
              })}
            </div>
          ))}
        </div>
      </div>;
    }

    return <div style={{ minHeight: 360, display: "grid", alignContent: "center", gap: 18, padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ ...title, fontSize: 17 }}>«{s.termRaw || s.term}» · דילוג {n(axis.skip)} · {dir(axis.direction)}</div>
        <div style={{ ...muted, fontSize: 12.5, marginTop: 5 }}>המנוע כבר החזיר Finding אמיתי. אותיות חלון המטריצה עדיין אינן חלק מ-state v1.</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap", direction: "ltr" }}>
        {Array.from(s.term || "").map((letter, i) => <div key={`${letter}-${i}`} style={{ ...soft, width: 56, padding: "10px 5px", textAlign: "center" }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 23, fontWeight: 900 }}>{letter}</div>
          <div style={{ color: P.accentDim, fontFamily: "ui-monospace,monospace", fontSize: 9.5, marginTop: 4 }}>{n(positions[i])}</div>
        </div>)}
      </div>
      <Next>Matrix Snapshot read-only יחבר כאן את חלון האותיות שהמנוע כבר חישב. עד אז איננו מציירים מטריצה מזויפת.</Next>
    </div>;
  };

  return (
    <div dir="rtl" style={{ position: "relative", zIndex: 1, maxWidth: 1540, margin: "0 auto", padding: "14px 12px 90px" }}>
      <style>{`
        .els-v2-grid{display:grid;grid-template-columns:minmax(0,1fr) 350px;gap:14px;align-items:start}
        .els-v2-inspector{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto}
        .els-v2-modes{display:flex;gap:7px;flex-wrap:wrap}
        @media(max-width:980px){.els-v2-grid{grid-template-columns:1fr}.els-v2-inspector{position:static;max-height:none}}
      `}</style>

      <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 900, letterSpacing: 1.1 }}>SOD1820 · NEXT ELS</div>
          <h1 style={{ margin: "2px 0 0", color: P.accentText, fontFamily: F.regal, fontSize: "clamp(25px,4vw,39px)", lineHeight: 1.05 }}>הצופן התנ״כי · Research Studio</h1>
        </div>
        <span style={{ ...soft, padding: "6px 10px", color: seen ? P.accentText : P.inkSoft, fontFamily: F.heading, fontSize: 11, fontWeight: 850 }}>{seen ? `● engine live · ${seen}` : "○ engine bridge"}</span>
        <Link to="/code" style={{ marginInlineStart: "auto", color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Legacy / Advanced Engine ←</Link>
      </header>

      <form onSubmit={runSearch} style={{ ...card, padding: 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, marginBottom: 10 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="מה לחפש בתורה?" aria-label="מונח לחיפוש ELS" style={{ minHeight: 48, borderRadius: 12, border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, padding: "0 14px", fontFamily: F.body, fontSize: 17, outline: "none" }} />
        <button type="submit" disabled={query.trim().length < 2} style={{ minHeight: 48, minWidth: 110, borderRadius: 12, border: 0, background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontWeight: 900, cursor: query.trim().length >= 2 ? "pointer" : "default", opacity: query.trim().length >= 2 ? 1 : .55 }}>חפש ✦</button>
      </form>

      <div className="els-v2-modes" style={{ marginBottom: 10 }}>
        {MODES.map((m) => <button key={m.id} onClick={() => setMode(m.id)} type="button" style={{ minHeight: 42, padding: "0 16px", borderRadius: 999, border: `1px solid ${mode === m.id ? "transparent" : P.border}`, background: mode === m.id ? P.accentBtn : P.cardSoft, color: mode === m.id ? P.onAccent : P.ink, fontFamily: F.heading, fontWeight: 850, cursor: "pointer" }}>{m.icon} {m.title}</button>)}
        <button onClick={() => setShowEngine((v) => !v)} type="button" style={{ marginInlineStart: "auto", minHeight: 42, padding: "0 12px", borderRadius: 999, border: `1px solid ${P.border}`, background: "transparent", color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, cursor: "pointer" }}>{showEngine ? "הסתר מנוע" : "Debug: הצג מנוע"}</button>
      </div>

      {/* canonical engine bridge: hidden by default, never forked */}
      <div aria-hidden={!showEngine} style={showEngine ? { ...card, padding: 8, marginBottom: 10 } : { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0.001, pointerEvents: "none", insetInlineStart: -10000 }}>
        <TzofenEmbed key={`${seed}-${runNonce}`} seed={seed || undefined} onState={onState} />
      </div>

      <div className="els-v2-grid">
        <main style={{ minWidth: 0 }}>
          <section style={{ ...card, overflow: "hidden", minHeight: 430 }}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${P.border}`, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div><div style={title}>מטריצת המחקר</div><div style={{ ...muted, fontSize: 11.5, marginTop: 2 }}>Surface חדש · Engine אחד מאחור</div></div>
              {ok && <div style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 900, fontSize: 12 }}>{n((occ.index ?? 0) + 1)} / {n(occ.count)} · S={n(geo.S)}</div>}
            </div>
            {s?.status === "empty" ? <div style={{ minHeight: 360, display: "grid", placeItems: "center", ...muted }}>לא נמצא דילוג למונח «{s.termRaw || seed}».</div> : renderMatrix()}
          </section>

          {mode === "discover" && <section style={{ ...card, padding: 14, marginTop: 12 }}>
            <div style={title}>🔭 גילוי</div>
            <div style={{ ...muted, fontSize: 12.5, lineHeight: 1.7, marginTop: 6 }}>כאן ייכנסו בהדרגה כלי החיפוש המתקדמים. כרגע החיפוש מפעיל את אותו מנוע קנוני דרך seed בלבד.</div>
            {findings.length > 0 && <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>{findings.map((f, i) => <span key={`${f.t}-${i}`} style={{ ...soft, padding: "6px 9px", color: P.ink, fontFamily: F.body, fontSize: 12 }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: f.color, marginInlineEnd: 5 }} />{f.t}</span>)}</div>}
          </section>}

          {mode === "investigate" && <section style={{ ...card, padding: 14, marginTop: 12 }}>
            <div style={title}>🧬 Finding Workspace</div>
            {!ok ? <div style={{ ...muted, marginTop: 8, fontSize: 13 }}>בחר Finding באמצעות חיפוש.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, marginTop: 10 }}>
              <div style={{ ...soft, padding: 11 }}><div style={title}>זהות</div><div style={{ ...muted, fontSize: 12, marginTop: 4 }}>{s.term} · {dir(axis.direction)} · {n(axis.skip)}</div></div>
              <div style={{ ...soft, padding: 11 }}><div style={title}>חלון</div><div style={{ ...muted, fontSize: 12, marginTop: 4 }}>rows {n(geo.r0)}–{n(geo.r1)} · cw {n(geo.cw)}</div></div>
              <div style={{ ...soft, padding: 11 }}><div style={title}>Provenance</div><div style={{ ...muted, fontSize: 12, marginTop: 4 }}>{prov.cipherSlug || prov.author || "ממצא חיפוש נוכחי"}</div></div>
            </div>}
            <div style={{ marginTop: 9 }}><Next>החיבור הבא כאן: פסוק/context on-demand, FindingID envelope, Crosses ו-Number DNA.</Next></div>
          </section>}

          {mode === "judge" && <section style={{ ...card, padding: 14, marginTop: 12 }}>
            <div style={title}>⚖️ Evidence Pack</div>
            <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
              <div style={{ ...soft, padding: 10, color: P.ink, fontFamily: F.body, fontSize: 12.5 }}><b style={{ color: P.accentText }}>FACT · </b>{ok ? `«${s.termRaw || s.term}» נמצא בדילוג ${n(axis.skip)}, ${dir(axis.direction)}, start ${n(axis.start)}.` : "אין Finding פעיל."}</div>
              <div style={{ ...soft, padding: 10, color: P.inkSoft, fontFamily: F.body, fontSize: 12.5 }}><b style={{ color: P.accentDim }}>RAZIEL · </b>עדיין לא מחובר; אין המלצה מומצאת.</div>
              <div style={{ ...soft, padding: 10, color: P.inkSoft, fontFamily: F.body, fontSize: 12.5 }}><b style={{ color: P.accentDim }}>HUMAN-GATE · </b>decision_ledger יחובר ב-Vertical Slice; Canonical נשאר צוריאל בלבד.</div>
            </div>
          </section>}
        </main>

        <aside className="els-v2-inspector" style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div><div style={title}>Research Inspector</div><div style={{ ...muted, fontSize: 11.5, marginTop: 2 }}>{ok ? "Finding חי מהמנוע" : s?.status === "empty" ? "אין ממצא" : "ממתין לחיפוש"}</div></div>
            <span style={{ ...soft, padding: "4px 7px", color: ok ? P.accentText : P.inkSoft, fontFamily: F.heading, fontSize: 10.5, fontWeight: 900 }}>{s?.status || "idle"}</span>
          </div>
          {ok && <div style={{ marginTop: 10 }}>
            <Fact label="מונח" value={`«${s.termRaw || s.term}»`} />
            <Fact label="מצב חיפוש" value={SEARCH_LABEL[s.search?.mode] || s.search?.mode || "—"} />
            <Fact label="דילוג / כיוון" value={`${n(axis.skip)} · ${dir(axis.direction)}`} />
            <Fact label="start / hitId" value={`${n(axis.start)} · ${axis.hitId || "—"}`} mono />
            <Fact label="מופע" value={`${n((occ.index ?? 0) + 1)} / ${n(occ.count)}${occ.capped ? "+" : ""}`} />
            <Fact label="מיקומי אותיות" value={positions.length ? positions.map(n).join(" · ") : "—"} mono />
            <Fact label="גאומטריה" value={`S ${n(geo.S)} · c0 ${n(geo.c0)} · cw ${n(geo.cw)}`} />
            <Fact label="ממצאים נוספים" value={findings.length ? findings.map((f) => f.t).join(" · ") : "אין"} />
            <Fact label="צופן / מחבר" value={[prov.cipherSlug, prov.author].filter(Boolean).join(" · ") || "—"} />
          </div>}
          {!ok && <div style={{ ...muted, fontSize: 13, lineHeight: 1.75, marginTop: 14 }}>ה-Inspector יתמלא רק מעובדות שהמנוע משדר.</div>}
          <button type="button" onClick={() => setRawOpen((v) => !v)} style={{ width: "100%", minHeight: 40, marginTop: 11, borderRadius: 11, border: `1px solid ${P.border}`, background: "transparent", color: P.accentText, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>{rawOpen ? "הסתר state" : "State גולמי"}</button>
          {rawOpen && <pre style={{ direction: "ltr", textAlign: "left", whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 280, overflow: "auto", margin: "7px 0 0", padding: 9, borderRadius: 11, background: P.cardSoft, color: P.inkSoft, fontSize: 10 }}>{JSON.stringify(s, null, 2)}</pre>}
        </aside>
      </div>
    </div>
  );
}
