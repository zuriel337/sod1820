import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { fetchNumberStatusProjection } from "../lib/research/numberStatusProjection.js";
import { fetchMathDimensions, fetchRealityHintIdSet } from "../lib/research/goldenCase1237Extras.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import EntityHubNumberStatusBoard from "../components/entity/EntityHubNumberStatusBoard.jsx";
import QuickActions from "../components/QuickActions.jsx";
import WatchButton from "../components/WatchButton.jsx";
import "./NumberPortalV3.css";

const WORLDS = [
  { key: "gematria", label: "גימטריה", icon: "✦" },
  { key: "reality", label: "מציאות", icon: "◉" },
  { key: "time", label: "זמן", icon: "◷" },
  { key: "math", label: "מתמטיקה", icon: "π" },
  { key: "research", label: "מחקר", icon: "⌘" },
];

const fmt = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("he-IL").format(n) : "—";
};

const safeArray = (v) => (Array.isArray(v) ? v : []);

function Loading({ value }) {
  return (
    <main className="np3" dir="rtl">
      <div className="np3-shell">
        <section className="np3-portal">
          <div className="np3-stage">
            <div className="np3-ring np3-r1" /><div className="np3-ring np3-r2" />
            <div className="np3-core"><div className="np3-number">{value}</div><div className="np3-sub">טוען עולם חי…</div></div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NotFound({ value }) {
  return <main className="np3" dir="rtl"><div className="np3-shell"><div className="np3-world"><h2>לא נמצא מספר חי בשם {value}</h2></div></div></main>;
}

function ZeroAxis({ zero, current }) {
  const chain = safeArray(zero?.scale_chain);
  if (!zero?.applicable || !chain.length) return null;
  return (
    <div className="np3-axis" aria-label="זיקת האפס">
      {chain.map((v, i) => (
        <React.Fragment key={String(v)}>
          {i > 0 && <i>←</i>}
          <Link className={Number(v) === current ? "current" : ""} to={`/number/${v}`}>{v}</Link>
        </React.Fragment>
      ))}
    </div>
  );
}

function strongestCentralPhrase(data) {
  const families = safeArray(data?.gematria?.families);
  const phraseEntities = data?.gematria?.phraseEntities || {};
  for (const preferred of ["מסתתר", "רגיל"]) {
    const family = families.find((g) => g?.method === preferred);
    const hit = safeArray(family?.phrases).find((p) => phraseEntities?.[p?.phrase]);
    if (hit?.phrase) return hit.phrase;
  }
  return null;
}

function PortalHero({ data, status, activeWorld, setActiveWorld, entity }) {
  const n = Number(data?.identity?.label);
  const central = strongestCentralPhrase(data);
  const counts = status?.counts || {};
  const worldsCount = new Set(safeArray(data?.gematria?.families).flatMap((g) => safeArray(g?.phrases).map((p) => p?.world).filter(Boolean))).size;
  const edges = safeArray(data?.graph?.relations).length;
  const images = data?.surface?.galleriesCount ?? safeArray(data?.surface?.galleries).length;
  const pulse = status?.convergence?.score ?? status?.score ?? counts?.convergence ?? null;
  const views = status?.views?.all ?? status?.views?.total ?? counts?.views ?? null;
  const searches = status?.searches?.all ?? status?.searches?.total ?? counts?.searches ?? null;

  const satellites = [
    { title: central || "ישות מרכזית", value: central ? "מחובר" : "—" },
    { title: "דופק", value: pulse == null ? "חי" : fmt(pulse) },
    { title: "עולמות", value: worldsCount || "—" },
    { title: "קשרים", value: edges || "—" },
    { title: "תמונות", value: fmt(images) },
    { title: "צפיות / חיפושים", value: `${fmt(views)} · ${fmt(searches)}` },
  ];

  return (
    <section className="np3-portal">
      <div className="np3-topline">
        <div><div className="np3-kicker">NUMBER PORTAL · V3</div><div>אותו מספר · חמישה עולמות · מציאות אחת</div></div>
        <div className="np3-actions"><QuickActions entity={entity} hideAnalyze hidePin extra={<WatchButton topic={`number:${data.identity.label}`} source="number-portal-v3" label="עקוב" compact noPush />} /></div>
      </div>
      <div className="np3-stage">
        <div className="np3-ring np3-r1" /><div className="np3-ring np3-r2" /><div className="np3-ring np3-r3" />
        <div className="np3-core">
          <div className="np3-number">{data.identity.label}</div>
          {central && <div className="np3-entity">{central}</div>}
          <div className="np3-sub">בחר עולם — המרכז נשאר, המציאות סביבו משתנה</div>
        </div>
        {satellites.map((s, i) => <div className={`np3-satellite np3-s${i + 1}`} key={`${s.title}-${i}`}><strong>{s.value}</strong><span>{s.title}</span></div>)}
      </div>
      <div className="np3-modebar" role="tablist" aria-label="עולמות המספר">
        {WORLDS.map((w) => <button type="button" key={w.key} className={`np3-mode ${activeWorld === w.key ? "active" : ""}`} onClick={() => setActiveWorld(w.key)}>{w.icon} {w.label}</button>)}
      </div>
      <ZeroAxis zero={data.zeroScale} current={n} />
    </section>
  );
}

function PhraseCloud({ data }) {
  const regular = safeArray(data?.gematria?.families).find((g) => g?.method === "רגיל");
  const rows = safeArray(regular?.phrases).slice(0, 12);
  const entities = data?.gematria?.phraseEntities || {};
  if (!rows.length) return <div className="np3-empty">אין כרגע ביטויים רגילים מוצגים למספר הזה.</div>;
  return <div className="np3-cloud">{rows.map((p, i) => {
    const level = p?.world || safeArray(p?.tags).length ? (i < 2 ? "l1" : i < 6 ? "l2" : "l3") : "l3";
    const href = entities?.[p.phrase]?.href || `/number/${encodeURIComponent(p.phrase)}`;
    return <Link className={`np3-phrase ${level}`} key={`${p.phrase}-${i}`} to={href}>{p.phrase}{p.world ? <small>· {p.world}</small> : null}</Link>;
  })}</div>;
}

function MethodExplorer({ data }) {
  const families = safeArray(data?.gematria?.families);
  const [method, setMethod] = useState(() => families?.[0]?.method || null);
  const [openPhrase, setOpenPhrase] = useState(null);
  const [trace, setTrace] = useState(null);
  const group = families.find((g) => g?.method === method) || families[0];
  const rows = safeArray(group?.phrases).slice(0, 8);

  useEffect(() => { setOpenPhrase(null); setTrace(null); }, [method]);

  async function toggleTrace(phrase) {
    if (openPhrase === phrase) { setOpenPhrase(null); setTrace(null); return; }
    setOpenPhrase(phrase); setTrace({ loading: true });
    try { const finding = await fetchGematriaMethodTrace(group?.method, phrase); setTrace({ finding }); }
    catch { setTrace({ error: true }); }
  }

  return (
    <div>
      <div className="np3-methods">{families.map((g) => <button type="button" key={g.method} className={g.method === group?.method ? "active" : ""} onClick={() => setMethod(g.method)}>{g.registry?.display_label || g.method}</button>)}</div>
      <div className="np3-trace-list">{rows.map((p) => <div className="np3-trace-row" key={p.phrase}>
        <button type="button" onClick={() => toggleTrace(p.phrase)}><strong>{p.phrase}</strong>{p.world ? <span style={{ color: "var(--muted)", marginInlineStart: 8 }}>· {p.world}</span> : null}</button><span>{openPhrase === p.phrase ? "▲" : "Trace ▾"}</span>
        {openPhrase === p.phrase && <div className="np3-trace">{trace?.loading ? <span>טוען Trace…</span> : (() => {
          const t = trace?.finding?.projection?.dimensions?.trace;
          if (!t) return <span>אין Trace מובנה זמין.</span>;
          const steps = safeArray(t.steps);
          return <>{steps.length ? steps.map((s, idx) => <React.Fragment key={idx}><span className="np3-step">{typeof s === "string" ? s : (s?.label || s?.operation || s?.value || JSON.stringify(s))}</span>{idx < steps.length - 1 && <span className="np3-arrow">←</span>}</React.Fragment>) : <span className="np3-step">{p.phrase}</span>}<span className="np3-arrow">←</span><span className="np3-step">{t.value ?? data.identity.label}</span></>;
        })()}</div>}
      </div>)}</div>
    </div>
  );
}

function GematriaWorld({ data }) {
  return <section className="np3-world"><div className="np3-world-head"><div><h2>✦ היקום הסמנטי של {data.identity.label}</h2><p>הביטויים החזקים נפתחים סביב אותו מרכז; השיטות משנות את העדשה, לא את האמת.</p></div></div><PhraseCloud data={data} /><div style={{ marginTop: 16 }}><MethodExplorer data={data} /></div></section>;
}

function EvidenceWall({ data, hintIds }) {
  const [lightbox, setLightbox] = useState(null);
  const images = safeArray(data?.surface?.galleries).slice(0, 7);
  if (!images.length) return <div className="np3-empty">אין כרגע תמונות מחוברות למספר הזה.</div>;
  return <><div className="np3-evidence">{images.map((img, i) => {
    const src = img?.image_url || img?.thumb_url; if (!src) return null;
    const hint = hintIds?.has?.(img.id);
    const content = <>{i === 0 ? null : null}<img src={src} alt={img?.name || img?.description || "תמונת ראיה"} loading="lazy" />{hint && <em>רמז מציאות</em>}</>;
    if (hint) return <Link className={i === 0 ? "hero" : ""} key={img.id} to={`/archive?tab=pool&nums=${data.identity.label}`}>{content}</Link>;
    return <button className={i === 0 ? "hero" : ""} key={img.id} type="button" onClick={() => setLightbox(img)}>{content}</button>;
  })}</div>{lightbox && <button type="button" className="np3-lightbox" onClick={() => setLightbox(null)}><img src={lightbox.image_url || lightbox.thumb_url} alt={lightbox.name || ""} /></button>}</>;
}

function RealityWorld({ data, hintIds }) {
  return <section className="np3-world"><div className="np3-world-head"><div><h2>◉ {data.identity.label} במציאות</h2><p>ראיות מלאות, לא thumbnails חתוכים. רמזים נשארים מחוברים להקשר שלהם בגלריה.</p></div><Link to={`/archive?tab=pool&nums=${data.identity.label}`}>פתח הקשר מלא</Link></div><EvidenceWall data={data} hintIds={hintIds} /></section>;
}

function TimeWorld({ data }) {
  const timeline = safeArray(data?.timeline);
  const points = timeline.slice(0, 12).map((row, i) => ({ label: row?.year || row?.date || row?.occurred_at || row?.label || `נקודה ${i + 1}`, raw: row }));
  return <section className="np3-world"><div className="np3-world-head"><div><h2>◷ {data.identity.label} לאורך הזמן</h2><p>רק נקודות שקיימות ב־projection החי. אין כרונולוגיה מומצאת.</p></div></div>{points.length ? <div className="np3-timeline">{points.map((p, i) => <div className="np3-tick" key={`${p.label}-${i}`}><div className="np3-dot" /><strong>{String(p.label).slice(0, 18)}</strong></div>)}</div> : <div className="np3-empty">עדיין אין מספיק Timeline data לחוויה אמינה במספר הזה.</div>}</section>;
}

function MathWorld({ data, math }) {
  const n = Number(data.identity.label);
  const fib = math?.fibonacci;
  const pi = math?.pi;
  return <section className="np3-world"><div className="np3-world-head"><div><h2>π ה־DNA המתמטי של {data.identity.label}</h2><p>אי־שייכות היא גם עובדה. אין מילוי חורים בקשרים מומצאים.</p></div></div><div className="np3-dna">
    <div className="np3-dna-card"><b>π</b>{pi?.status === "ok" ? <><strong>{pi.result?.found ? fmt(pi.result.first_position) : "לא נמצא"}</strong><span> {pi.result?.found ? "מיקום ראשון אחרי הנקודה" : `ב־${fmt(pi.search_depth)} ספרות`}</span></> : <span>מחשב…</span>}</div>
    <div className="np3-dna-card"><b>Fibonacci</b>{fib?.status === "ok" ? <><strong>{fib.result?.found ? "כן" : "לא"}</strong><span>{fib.result?.found ? ` איבר #${fmt(fib.result.first_position)}` : " אינו איבר בטווח שנבדק"}</span></> : <span>מחשב…</span>}</div>
    <div className="np3-dna-card"><b>Digit DNA</b><strong>{String(n).split("").join(" · ")}</strong><span>ייצוג ספרתי בלבד</span></div>
    <div className="np3-dna-card"><b>Zero axis</b><strong>{safeArray(data.zeroScale?.scale_chain).length || "—"}</strong><span>מצבי־סקאלה קנוניים זמינים</span></div>
  </div></section>;
}

function strengthClass(value, max) {
  if (max <= 0) return "small";
  const ratio = value / max;
  return ratio >= .66 ? "big" : ratio >= .28 ? "mid" : "small";
}

function ResearchWorld({ data, status }) {
  const raw = [
    { label: "Reality", value: Number(data?.surface?.galleriesCount || 0), to: `/archive?tab=pool&nums=${data.identity.label}` },
    { label: "Graph", value: safeArray(data?.graph?.relations).length, to: null },
    { label: "Topics", value: safeArray(data?.topics?.rows).length, to: null },
    { label: "Sources", value: safeArray(data?.sources).length, to: null },
    { label: "Research", value: safeArray(data?.research?.rows).length, to: "/research" },
    { label: "ELS", value: Number(status?.counts?.ciphers || 0), to: "/code" },
    { label: "Timeline", value: safeArray(data?.timeline).length, to: null },
    { label: "Cross", value: 1, to: "/cross" },
  ];
  const max = Math.max(1, ...raw.map((x) => x.value));
  return <section className="np3-world"><div className="np3-world-head"><div><h2>⌘ מערכת המחקר סביב {data.identity.label}</h2><p>הכניסות מדורגות לפי עוצמת הנתונים — Rank, Don’t Hide.</p></div></div><div className="np3-lenses">{raw.map((x) => {
    const cls = strengthClass(x.value, max);
    const inner = <><strong>{x.label}</strong><span>{fmt(x.value)} מחובר</span></>;
    return x.to ? <Link className={`np3-lens ${cls}`} key={x.label} to={x.to}>{inner}</Link> : <div className={`np3-lens ${cls}`} key={x.label}>{inner}</div>;
  })}</div></section>;
}

function SemanticLayer({ data }) {
  const regular = safeArray(data?.gematria?.families).find((g) => g?.method === "רגיל");
  const phrases = safeArray(regular?.phrases).slice(0, 16);
  const chain = safeArray(data?.zeroScale?.scale_chain);
  return <section className="np3-semantic"><h3>{data.identity.label} — תוכן סמנטי</h3><p>שכבה זו נשארת HTML גלוי גם כאשר חוויית ה־Portal משתנה, כדי שהמספר יישאר נגיש, קישורי ושימושי גם ללא האינטראקציה.</p><h3>ביטויים השווים ל־{data.identity.label} בגימטריה רגילה</h3><div className="np3-semantic-links">{phrases.map((p) => <Link key={p.phrase} to={`/number/${encodeURIComponent(p.phrase)}`}>{p.phrase}</Link>)}</div>{chain.length > 0 && <><h3>זיקת האפס</h3><div className="np3-semantic-links">{chain.map((v) => <Link key={v} to={`/number/${v}`}>{v}</Link>)}</div></>}</section>;
}

export default function NumberGoldenCase1237Page() {
  const { value: rawValue } = useParams();
  const value = rawValue || "1237";
  const number = Number(value);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [math, setMath] = useState(null);
  const [hintIds, setHintIds] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [activeWorld, setActiveWorld] = useState("gematria");
  const { setResearchContext, clearResearchContext } = useResearch();

  useEffect(() => { document.title = `${value} · Number Portal V3`; }, [value]);
  useEffect(() => {
    let alive = true; setLoadState("loading"); setData(null);
    fetchEntityHubProjection({ type: "number", key: value, relationLimit: 140, researchLimit: 60, topicLimit: 18 })
      .then((next) => { if (!alive) return; if (!next) return setLoadState("notfound"); setData(next); setLoadState("ready"); })
      .catch(() => alive && setLoadState("error"));
    return () => { alive = false; };
  }, [value]);

  useEffect(() => {
    if (!Number.isFinite(number) || number < 1) return;
    let alive = true;
    Promise.all([fetchMathDimensions(number), fetchRealityHintIdSet(number)]).then(([m, h]) => { if (alive) { setMath(m); setHintIds(h); } });
    return () => { alive = false; };
  }, [number]);

  useEffect(() => {
    if (!data?.identity?.nodeId) return;
    let alive = true;
    fetchNumberStatusProjection({ number, nodeId: data.identity.nodeId }).then((next) => alive && setStatus(next)).catch(() => {});
    return () => { alive = false; };
  }, [data?.identity?.nodeId, number]);

  useEffect(() => {
    if (!data) return;
    setResearchContext({ subject: { type: "number", key: value, label: data.identity.label }, lens: `number-portal-v3:${activeWorld}`, returnTo: typeof window !== "undefined" ? window.location.pathname : null });
    return () => clearResearchContext();
  }, [data, value, activeWorld, setResearchContext, clearResearchContext]);

  const entity = useMemo(() => data ? ({ id: `number:${data.identity.label}`, type: "number", title: data.identity.label, link: `/number/${data.identity.label}`, metadata: { source: "number-portal-v3", node_id: data.identity.nodeId } }) : null, [data]);

  if (loadState === "loading") return <Loading value={value} />;
  if (loadState !== "ready" || !data) return <NotFound value={value} />;

  return <main className="np3" dir="rtl"><div className="np3-shell"><PortalHero data={data} status={status} activeWorld={activeWorld} setActiveWorld={setActiveWorld} entity={entity} />
    {activeWorld === "gematria" && <GematriaWorld data={data} />}
    {activeWorld === "reality" && <RealityWorld data={data} hintIds={hintIds} />}
    {activeWorld === "time" && <TimeWorld data={data} />}
    {activeWorld === "math" && <MathWorld data={data} math={math} />}
    {activeWorld === "research" && <ResearchWorld data={data} status={status} />}
    <details className="np3-advanced"><summary>Readers מתקדמים · פתח את הדשבורד המלא</summary><div className="np3-advanced-body"><EntityHubNumberStatusBoard data={data} relationGroups={[]} /></div></details>
    <SemanticLayer data={data} />
  </div></main>;
}
