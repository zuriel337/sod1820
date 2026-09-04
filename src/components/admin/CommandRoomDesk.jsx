import React, { useCallback, useEffect, useMemo, useState } from "react";
import { F } from "../../theme.js";
import {
  getChannelUpdates,
  dbFirstLookup,
  getWriterVerifiedClaims,
  getHubCounts,
  checkAxisData,
} from "../../lib/supabase.js";
import { analyzeTime } from "../../lib/timeFlow.js";
import { analyzeFull, buildMethodProfile } from "../../lib/analysisFlow.js";

const CHANNELS = [
  ["torat-haremez", "תורת הרמז"],
  ["gilui-yomi", "הגילוי היומי"],
  ["or-geula", "אור הגאולה"],
  ["sfot-vheker", "שפות וחקר מציאות"],
];
const CHANNEL_LABEL = Object.fromEntries(CHANNELS);
const CHANNEL_ICON = {
  "torat-haremez": "📜",
  "gilui-yomi": "✨",
  "or-geula": "🔥",
  "sfot-vheker": "🌍",
};

const C = {
  bg: "#07101d",
  panel: "rgba(12,24,40,.92)",
  panel2: "rgba(15,31,51,.82)",
  line: "rgba(133,163,198,.16)",
  lineStrong: "rgba(218,181,82,.28)",
  text: "#f3f6fb",
  soft: "#b4c0cf",
  dim: "#7f8ea2",
  gold: "#dfbf68",
  blue: "#74a7ff",
  green: "#68d5a3",
  orange: "#f0aa62",
  red: "#ef7f79",
};

function ageLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const days = Math.floor(h / 24);
  return days === 1 ? "אתמול" : `לפני ${days} ימים`;
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function preview(s, n = 150) {
  const t = stripHtml(s);
  return t.length > n ? t.slice(0, n).trim() + "…" : t;
}

function normalize(row) {
  return {
    id: row.id,
    key: `ch:${row.id}`,
    channel: row.channel,
    channelLabel: CHANNEL_LABEL[row.channel] || row.channel || "ערוץ",
    author: row.credit || "מקור לא מזוהה",
    raw: stripHtml(row.text),
    ts: row.created_at,
    image: row.image_url || row.thumb_url || null,
    link: row.link_url || null,
    source: row.source || null,
  };
}

function safeMembers(conv) {
  return Array.isArray(conv?.members) ? conv.members : [];
}

function rankMeta(rank) {
  if (rank === "high") return ["גבוה", C.green];
  if (rank === "axis") return ["ציר", C.blue];
  if (rank === "interp") return ["פרשני", C.orange];
  return ["בינוני", C.blue];
}

async function runExistingFullAnalysis(item) {
  const writerName = item?.author || null;
  const names = [writerName].filter(Boolean);
  const a0 = analyzeFull(item?.raw || "", { writerName });
  const t0 = analyzeTime(item?.raw || "", { sourceDate: item?.ts });
  const hubVal = a0.structure?.hub?.value ?? (a0.claims || []).find(c => c?.value != null)?.value ?? null;
  const clusterVals = [...new Set((a0.clusters || []).filter(c => c?.candidateConvergence && c?.value != null).map(c => c.value))];
  const tYears = (t0.years || []).map(y => y.year);
  const tIsos = [...(t0.gregs || []), ...(t0.hebrews || [])].map(d => d.iso).filter(Boolean);
  const tHeb = (t0.hebrews || []).map(h => h.raw);
  const [db, claims, hubCounts, axis] = await Promise.all([
    dbFirstLookup(a0.phrases || [], hubVal),
    names.length ? getWriterVerifiedClaims(names) : Promise.resolve([]),
    clusterVals.length ? getHubCounts(clusterVals) : Promise.resolve(new Map()),
    checkAxisData({ years: tYears, isoDates: tIsos, hebrew: tHeb }),
  ]);
  const profile = buildMethodProfile(claims || []);
  const a = analyzeFull(item?.raw || "", { writerName, dbHubKnown: db?.hubCount ?? null });
  return { a, db: db || {}, profile, hubVal, writerName, hubCounts, time: t0, axis };
}

function Metric({ value, label, accent = C.blue }) {
  return (
    <div className="ccv2-metric">
      <b style={{ color: accent }}>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function EmptyAnalysis({ onRun, loading }) {
  return (
    <div className="ccv2-empty-analysis">
      <div className="ccv2-orb">⌁</div>
      <h3>ההודעה מוכנה לניתוח</h3>
      <p>לחיצה אחת מפעילה את אותו “ניתוח מלא” שכבר קיים בחדר המפקדה — Extraction, DB‑First, התכנסויות, ציר־זמן והמלצות. אין כתיבה ואין קידום.</p>
      <button className="ccv2-primary" onClick={onRun} disabled={loading}>{loading ? "מנתח…" : "🔬 הרץ ניתוח מלא"}</button>
    </div>
  );
}

function AnalysisView({ result }) {
  const a = result?.a || {};
  const db = result?.db || {};
  const claims = Array.isArray(a.claims) ? a.claims : [];
  const conv = Array.isArray(a.engine?.convergences) ? a.engine.convergences : [];
  const suggestions = Array.isArray(a.suggestions) ? a.suggestions : [];
  const known = Array.isArray(db.known) ? db.known : [];
  const dates = [...(result?.time?.hebrews || []), ...(result?.time?.gregs || [])];

  return (
    <div className="ccv2-analysis">
      <div className="ccv2-analysis-head">
        <div>
          <span className="ccv2-eyebrow">ניתוח מלא · Preview</span>
          <h3>מה יש כאן באמת?</h3>
        </div>
        <span className="ccv2-truth">Claim ≠ Fact · אין WRITE</span>
      </div>

      <div className="ccv2-metrics">
        <Metric value={claims.length} label="טענות שחולצו" accent={C.gold} />
        <Metric value={(a.phrases || []).length} label="ביטויי מחקר" />
        <Metric value={conv.length} label="התכנסויות מנוע" accent={C.green} />
        <Metric value={known.length} label="כבר בבנק" accent={C.orange} />
      </div>

      {result?.hubVal != null && (
        <div className="ccv2-hub">
          <span>המספר המרכזי שזוהה</span>
          <strong>{result.hubVal}</strong>
          <small>{db?.hubCount != null ? `${db.hubCount} ביטויים קיימים סביב הערך בבנק` : "DB‑First נבדק"}</small>
        </div>
      )}

      <div className="ccv2-analysis-grid">
        <section className="ccv2-section">
          <div className="ccv2-section-title"><span>01</span><b>טענות שחולצו מהמקור</b></div>
          {claims.length ? claims.slice(0, 8).map((c, i) => (
            <div className="ccv2-finding" key={i}>
              <div className="ccv2-finding-main">{c.text || c.norm || "טענה"}</div>
              <div className="ccv2-finding-meta">
                {c.method && <span>{c.method}</span>}
                {c.value != null && <strong>{c.value}</strong>}
                {c.verifiedSum && <span className="ok">✓ חשבון</span>}
              </div>
            </div>
          )) : <p className="ccv2-muted">לא זוהתה טענה מספרית מפורשת. זה לא אומר שאין כאן חומר מחקרי.</p>}
        </section>

        <section className="ccv2-section">
          <div className="ccv2-section-title"><span>02</span><b>התכנסויות שהמנוע רואה</b></div>
          {conv.length ? conv.slice(0, 6).map((c, i) => {
            const terms = [...new Set(safeMembers(c).map(m => m?.term).filter(Boolean))];
            return <div className="ccv2-conv" key={i}><strong>{c.value ?? "—"}</strong><span>{terms.join(" ↔ ") || "התכנסות"}</span></div>;
          }) : <p className="ccv2-muted">אין כרגע התכנסות מנועית מובהקת בביטויי ההודעה.</p>}
        </section>

        <section className="ccv2-section">
          <div className="ccv2-section-title"><span>03</span><b>מה כבר קיים במערכת</b></div>
          {known.length ? known.slice(0, 8).map((k, i) => (
            <div className="ccv2-known" key={i}>
              <b>{k.phrase || k.word || k.text || "ביטוי קיים"}</b>
              {k.value != null && <span>{k.value}</span>}
            </div>
          )) : <p className="ccv2-muted">לא נמצאה חפיפה ישירה בבנק לביטויים שנבדקו.</p>}
          {dates.length > 0 && <div className="ccv2-date-note">🕐 זוהו גם {dates.length} עוגני זמן/תאריך לבדיקה בציר.</div>}
        </section>

        <section className="ccv2-section ccv2-suggestions">
          <div className="ccv2-section-title"><span>04</span><b>מה כדאי לבדוק עכשיו</b></div>
          {suggestions.slice(0, 7).map((s, i) => {
            const [label, color] = rankMeta(s.rank);
            return (
              <div className="ccv2-suggestion" key={i}>
                <span className="ccv2-rank" style={{ color, borderColor: color + "55" }}>{label}</span>
                <div><b>{s.t || "המשך מחקר"}</b><small>{s.why}</small></div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export default function CommandRoomDesk({ onOpenGate, onOpenAdvanced }) {
  const [state, setState] = useState({ loading: true, error: "", rows: [] });
  const [channel, setChannel] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: "" }));
    try {
      const batches = await Promise.all(CHANNELS.map(async ([key]) => {
        const rows = await getChannelUpdates(24, key, true);
        return (rows || []).map(normalize);
      }));
      const rows = batches.flat().sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
      setState({ loading: false, error: "", rows });
      setSelectedId(id => (id && rows.some(r => r.id === id)) ? id : rows[0]?.id || null);
    } catch (e) {
      setState({ loading: false, error: e?.message || "שגיאה בטעינת הקליטה", rows: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.rows.filter(r => (channel === "all" || r.channel === channel) && (!q || `${r.raw} ${r.author} ${r.channelLabel}`.toLowerCase().includes(q)));
  }, [state.rows, channel, query]);

  useEffect(() => {
    if (!filtered.length) return;
    if (!filtered.some(r => r.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = state.rows.find(r => r.id === selectedId) || filtered[0] || null;

  const choose = item => {
    setSelectedId(item.id);
    setAnalysis(null);
    setAnalysisError("");
  };

  const run = useCallback(async () => {
    if (!selected || analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisError("");
    try {
      const res = await runExistingFullAnalysis(selected);
      setAnalysis(res);
    } catch (e) {
      setAnalysisError(e?.message || "הניתוח נכשל");
    } finally {
      setAnalysisLoading(false);
    }
  }, [selected, analysisLoading]);

  return (
    <div className="ccv2" dir="rtl">
      <style>{`
        .ccv2{min-height:calc(100vh - 180px);color:${C.text};background:
          radial-gradient(circle at 73% -10%,rgba(82,126,211,.18),transparent 30%),
          radial-gradient(circle at 10% 0%,rgba(218,181,82,.10),transparent 26%),${C.bg};
          border:1px solid ${C.line};border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.24);font-family:${F.body},Arial,sans-serif}
        .ccv2 *{box-sizing:border-box}.ccv2 button,.ccv2 input{font-family:inherit}
        .ccv2-top{padding:22px 24px 18px;border-bottom:1px solid ${C.line};background:rgba(5,13,24,.72);backdrop-filter:blur(16px)}
        .ccv2-topline{display:flex;align-items:flex-start;gap:16px;justify-content:space-between;flex-wrap:wrap}.ccv2-title small{display:block;color:${C.gold};font-size:11px;font-weight:900;letter-spacing:.12em}.ccv2-title h2{font-family:${F.heading},Arial,sans-serif;font-size:28px;margin:4px 0 4px}.ccv2-title p{margin:0;color:${C.soft};font-size:13px}
        .ccv2-top-actions{display:flex;gap:8px;flex-wrap:wrap}.ccv2-ghost,.ccv2-primary{border-radius:12px;padding:10px 14px;border:1px solid ${C.line};cursor:pointer;font-weight:800}.ccv2-ghost{background:rgba(255,255,255,.035);color:${C.soft}}.ccv2-ghost:hover{border-color:${C.lineStrong};color:${C.text}}.ccv2-primary{background:linear-gradient(180deg,#e6c975,#bb9140);color:#161107;border-color:#efd98f;box-shadow:0 8px 24px rgba(218,181,82,.16)}.ccv2-primary:disabled{opacity:.55;cursor:wait}
        .ccv2-tools{margin-top:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ccv2-search{flex:1;min-width:230px;border:1px solid ${C.line};border-radius:12px;background:rgba(255,255,255,.035);color:${C.text};padding:10px 13px;outline:none}.ccv2-search:focus{border-color:rgba(116,167,255,.5);box-shadow:0 0 0 3px rgba(116,167,255,.08)}
        .ccv2-chip{border:1px solid ${C.line};border-radius:999px;background:transparent;color:${C.soft};padding:7px 11px;cursor:pointer;font-size:11px;font-weight:800}.ccv2-chip.on{border-color:${C.gold}88;color:${C.gold};background:rgba(218,181,82,.08)}
        .ccv2-body{display:grid;grid-template-columns:minmax(280px,360px) minmax(0,1fr);min-height:720px}.ccv2-list{border-left:1px solid ${C.line};background:rgba(7,16,29,.62);padding:12px;overflow:auto;max-height:calc(100vh - 250px)}
        .ccv2-list-head{display:flex;align-items:center;justify-content:space-between;padding:6px 5px 10px;color:${C.dim};font-size:11px}.ccv2-list-head b{color:${C.soft};font-size:12px}
        .ccv2-item{width:100%;text-align:right;border:1px solid transparent;border-radius:15px;background:transparent;color:${C.text};padding:12px;margin-bottom:7px;cursor:pointer;transition:.18s ease}.ccv2-item:hover{background:rgba(255,255,255,.035);border-color:${C.line}}.ccv2-item.on{background:linear-gradient(135deg,rgba(43,81,137,.27),rgba(14,30,50,.65));border-color:rgba(116,167,255,.35);box-shadow:0 10px 30px rgba(0,0,0,.14)}
        .ccv2-item-top{display:flex;gap:7px;align-items:center;font-size:10.5px;color:${C.dim}}.ccv2-item-top b{color:${C.blue}}.ccv2-item-author{margin-top:7px;font-weight:900;font-size:13px}.ccv2-item p{margin:5px 0 0;color:${C.soft};font-size:12px;line-height:1.55}.ccv2-item-analysis{margin-top:8px;color:${C.gold};font-size:10px;font-weight:900}
        .ccv2-focus{padding:24px;overflow:auto;max-height:calc(100vh - 250px)}.ccv2-sourcebar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:${C.dim};font-size:11px}.ccv2-sourcebar .source{color:${C.blue};font-weight:900}.ccv2-focus h1{font-family:${F.heading},Arial,sans-serif;margin:12px 0 4px;font-size:clamp(22px,3vw,36px)}.ccv2-focus .by{color:${C.gold};font-weight:800;font-size:12px}.ccv2-message{margin-top:18px;padding:20px;border:1px solid ${C.line};border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.015));font-size:16px;line-height:1.95;white-space:pre-wrap;color:#eaf0f7}.ccv2-message img{width:100%;max-height:420px;object-fit:contain;border-radius:14px;margin-top:15px;background:#050b13}
        .ccv2-focus-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:14px 0 4px}.ccv2-link{color:${C.blue};text-decoration:none;border:1px solid ${C.line};padding:9px 12px;border-radius:11px;font-size:12px}.ccv2-link:hover{border-color:${C.blue}66}.ccv2-note{color:${C.dim};font-size:10.5px;margin-right:auto}
        .ccv2-empty-analysis{text-align:center;border:1px dashed ${C.lineStrong};border-radius:20px;margin-top:22px;padding:32px 20px;background:rgba(218,181,82,.025)}.ccv2-empty-analysis h3{margin:6px 0;font-size:19px}.ccv2-empty-analysis p{max-width:640px;margin:0 auto 16px;color:${C.soft};font-size:12.5px;line-height:1.7}.ccv2-orb{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;margin:auto;background:radial-gradient(circle,rgba(218,181,82,.22),rgba(218,181,82,.04));border:1px solid ${C.gold}66;color:${C.gold};font-size:24px}
        .ccv2-analysis{margin-top:22px}.ccv2-analysis-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;border-bottom:1px solid ${C.line};padding-bottom:12px}.ccv2-eyebrow{font-size:10px;color:${C.gold};font-weight:900;letter-spacing:.1em}.ccv2-analysis h3{font-size:22px;margin:3px 0 0}.ccv2-truth{color:${C.orange};font-size:10.5px;border:1px solid rgba(240,170,98,.25);border-radius:999px;padding:5px 8px}.ccv2-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.ccv2-metric{border:1px solid ${C.line};background:${C.panel2};border-radius:14px;padding:12px}.ccv2-metric b{display:block;font-size:24px}.ccv2-metric span{font-size:10.5px;color:${C.dim}}
        .ccv2-hub{display:flex;align-items:center;gap:12px;border:1px solid ${C.lineStrong};border-radius:16px;padding:12px 15px;background:linear-gradient(90deg,rgba(218,181,82,.08),rgba(218,181,82,.015));color:${C.soft}}.ccv2-hub strong{font-size:30px;color:${C.gold}}.ccv2-hub small{color:${C.dim};margin-right:auto}.ccv2-analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.ccv2-section{border:1px solid ${C.line};border-radius:16px;background:${C.panel};padding:14px}.ccv2-section-title{display:flex;align-items:center;gap:8px;margin-bottom:10px}.ccv2-section-title span{color:${C.gold};font-size:10px;font-weight:900}.ccv2-section-title b{font-size:13px}.ccv2-muted{color:${C.dim};font-size:11px;line-height:1.6}.ccv2-finding,.ccv2-known,.ccv2-conv{border-top:1px solid ${C.line};padding:9px 0}.ccv2-finding:first-of-type,.ccv2-known:first-of-type,.ccv2-conv:first-of-type{border-top:0}.ccv2-finding-main{font-size:12px;font-weight:800;line-height:1.55}.ccv2-finding-meta{display:flex;gap:6px;align-items:center;margin-top:5px;color:${C.dim};font-size:10px}.ccv2-finding-meta strong{font-size:18px;color:${C.gold}}.ccv2-finding-meta .ok{color:${C.green}}.ccv2-conv{display:flex;gap:10px;align-items:center}.ccv2-conv strong{color:${C.green};font-size:19px}.ccv2-conv span{font-size:11px;color:${C.soft};line-height:1.5}.ccv2-known{display:flex;justify-content:space-between;gap:8px;font-size:11px}.ccv2-known span{color:${C.gold};font-weight:900}.ccv2-date-note{margin-top:8px;padding:8px;border-radius:10px;background:rgba(116,167,255,.06);color:${C.blue};font-size:10.5px}
        .ccv2-suggestion{display:flex;gap:8px;border-top:1px solid ${C.line};padding:9px 0}.ccv2-suggestion:first-of-type{border-top:0}.ccv2-rank{align-self:flex-start;border:1px solid;border-radius:999px;padding:2px 6px;font-size:9px;font-weight:900}.ccv2-suggestion div{min-width:0}.ccv2-suggestion b{display:block;font-size:11px;line-height:1.45}.ccv2-suggestion small{display:block;color:${C.dim};font-size:9.5px;line-height:1.5;margin-top:2px}.ccv2-error{margin-top:12px;border:1px solid rgba(239,127,121,.3);background:rgba(239,127,121,.06);color:${C.red};padding:10px;border-radius:12px;font-size:11px}
        .ccv2-state{padding:48px;text-align:center;color:${C.soft}}
        @media(max-width:900px){.ccv2-body{grid-template-columns:1fr}.ccv2-list{border-left:0;border-bottom:1px solid ${C.line};max-height:310px}.ccv2-focus{max-height:none}.ccv2-analysis-grid{grid-template-columns:1fr}.ccv2-metrics{grid-template-columns:1fr 1fr}.ccv2-note{width:100%;margin:0}}
        @media(max-width:520px){.ccv2{border-radius:16px}.ccv2-top,.ccv2-focus{padding:16px}.ccv2-title h2{font-size:23px}.ccv2-message{font-size:14px;padding:15px}.ccv2-metrics{grid-template-columns:1fr 1fr}.ccv2-hub{align-items:flex-start;flex-wrap:wrap}.ccv2-hub small{width:100%;margin:0}.ccv2-primary,.ccv2-ghost{min-height:44px}}
      `}</style>

      <div className="ccv2-top">
        <div className="ccv2-topline">
          <div className="ccv2-title">
            <small>COMMAND ROOM · HUMAN FIRST</small>
            <h2>🎛️ חדר המפקדה</h2>
            <p>הודעה אחת · ניתוח אחד · החלטה אחת בכל פעם. כל המערכות הישנות נשארות מתחת, לא משוכפלות.</p>
          </div>
          <div className="ccv2-top-actions">
            <button className="ccv2-ghost" onClick={onOpenGate}>⚖️ שולחן צוריאל</button>
            <button className="ccv2-ghost" onClick={onOpenAdvanced}>🧰 ממשק מתקדם</button>
            <button className="ccv2-ghost" onClick={load}>↻ רענן</button>
          </div>
        </div>
        <div className="ccv2-tools">
          <input className="ccv2-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="חפש בתוך ההודעות, הכותבים או הערוצים…" />
          <button className={`ccv2-chip ${channel === "all" ? "on" : ""}`} onClick={() => setChannel("all")}>הכול · {state.rows.length}</button>
          {CHANNELS.map(([key, label]) => <button key={key} className={`ccv2-chip ${channel === key ? "on" : ""}`} onClick={() => setChannel(key)}>{CHANNEL_ICON[key]} {label}</button>)}
        </div>
      </div>

      {state.loading ? <div className="ccv2-state">טוען את הקליטה החיה…</div> : state.error ? <div className="ccv2-state">{state.error}</div> : (
        <div className="ccv2-body">
          <aside className="ccv2-list">
            <div className="ccv2-list-head"><b>הודעות</b><span>{filtered.length} מוצגות</span></div>
            {filtered.map(item => (
              <button key={item.id} className={`ccv2-item ${selected?.id === item.id ? "on" : ""}`} onClick={() => choose(item)}>
                <div className="ccv2-item-top"><b>{CHANNEL_ICON[item.channel]} {item.channelLabel}</b><span>·</span><span>{ageLabel(item.ts)}</span></div>
                <div className="ccv2-item-author">{item.author}</div>
                <p>{preview(item.raw)}</p>
                {selected?.id === item.id && analysis && <div className="ccv2-item-analysis">✓ נותח בסשן הנוכחי</div>}
              </button>
            ))}
            {!filtered.length && <div className="ccv2-state">אין הודעות מתאימות לסינון.</div>}
          </aside>

          <main className="ccv2-focus">
            {selected ? <>
              <div className="ccv2-sourcebar">
                <span className="source">{CHANNEL_ICON[selected.channel]} {selected.channelLabel}</span>
                <span>·</span><span>{ageLabel(selected.ts)}</span>
                {selected.source && <><span>·</span><span>{selected.source}</span></>}
              </div>
              <h1>{preview(selected.raw, 72) || "הודעה ללא טקסט"}</h1>
              <div className="by">מאת {selected.author}</div>
              <div className="ccv2-message">
                {selected.raw}
                {selected.image && <img src={selected.image} alt="מדיה מקורית של ההודעה" />}
              </div>
              <div className="ccv2-focus-actions">
                <button className="ccv2-primary" onClick={run} disabled={analysisLoading}>{analysisLoading ? "מנתח…" : analysis ? "↻ הרץ שוב" : "🔬 הרץ ניתוח מלא"}</button>
                {selected.link && <a className="ccv2-link" href={selected.link} target="_blank" rel="noreferrer">↗ פתח מקור</a>}
                <button className="ccv2-ghost" onClick={onOpenGate}>⚖️ עבור לשולחן ההחלטות</button>
                <span className="ccv2-note">הניתוח הוא Preview בלבד. אישור/דחייה/קנוניזציה נשארים Human‑Gate.</span>
              </div>
              {analysisError && <div className="ccv2-error">{analysisError}</div>}
              {!analysis ? <EmptyAnalysis onRun={run} loading={analysisLoading} /> : <AnalysisView result={analysis} />}
            </> : <div className="ccv2-state">בחר הודעה כדי להתחיל.</div>}
          </main>
        </div>
      )}
    </div>
  );
}
