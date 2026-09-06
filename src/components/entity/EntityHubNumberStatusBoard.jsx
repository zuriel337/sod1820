import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNumberStatusProjection } from "../../lib/research/numberStatusProjection.js";
import "./EntityHubNumberStatusBoard.css";

// Research Command Tile — same data/readers as before (fetchNumberStatusProjection +
// convergence_meter/view_count/search_log/graph/gallery/ELS via the projection prop), same
// facet/onFacet contract. This file is a presentation refactor only: composition, hierarchy,
// typography, interaction, depth. No new metric, no method hardcoding, no truth change.

const fmt = value => value == null ? "—" : new Intl.NumberFormat("he-IL").format(Number(value));
const numFromDetail = detail => {
  const m = String(detail || "").match(/\d+/);
  return m ? Number(m[0]) : null;
};

function meterLayer(meter, name) {
  return (meter?.layers || []).find(layer => layer?.name === name) || null;
}

// ---- Pulse Core: same score/tier semantics as the old PulseTier, SVG ring instead of a plain disc.
function PulseCore({ score }) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const title = s >= 90 ? "מלכותי" : s >= 50 ? "חזק" : s >= 20 ? "מתהווה" : "שקט";
  const mark = s >= 90 ? "👑" : s >= 50 ? "🥈" : s >= 20 ? "🥉" : "·";
  const r = 42, c = 2 * Math.PI * r;
  const offset = c * (1 - s / 100);
  return (
    <div className="rct-pulse rct-pulse-glow">
      <svg viewBox="0 0 96 96" aria-hidden>
        <circle className="rct-pulse-track" cx="48" cy="48" r={r} />
        <circle className="rct-pulse-arc" cx="48" cy="48" r={r} strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="rct-pulse-core">
        <div style={{ fontSize: 14 }}>{mark}</div>
        <div className="rct-pulse-score">{s}</div>
        <div className="rct-pulse-label">/100 · {title}</div>
      </div>
    </div>
  );
}

function PrimaryStat({ value, label, sub }) {
  return (
    <div className="rct-primary-stat">
      <b>{value}</b>
      <span>{label}{sub ? ` · ${sub}` : ""}</span>
    </div>
  );
}

function Facet({ active, icon, value, label, sub, tier, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rct-facet${tier === 3 ? " tier3" : ""}${active ? " active" : ""}`}>
      <div className="rct-facet-row">
        <span className="rct-facet-label">{icon} {label}</span>
        <b className="rct-facet-value">{value}</b>
      </div>
      {sub ? <div className="rct-facet-sub">{sub}</div> : null}
    </button>
  );
}

function Chip({ children, gold = false }) {
  return <span className={`rct-chip ${gold ? "gold" : "plain"}`}>{children}</span>;
}

// ---- DNA strip: compact fingerprint over already-available counts. Caps are visual-scaling only
// (never shown as truth) — the real number is always printed beside the bar.
function DnaStrip({ segments }) {
  const real = segments.filter(s => s.value != null);
  if (!real.length) return null;
  return (
    <div className="rct-dna">
      <div className="rct-dna-title">DNA · טביעת-אצבע של המספר</div>
      <div className="rct-dna-row">
        {real.map(s => (
          <div key={s.key} className="rct-dna-seg" title={`${s.label}: ${fmt(s.value)}`}>
            <div className="rct-dna-bar"><div className="rct-dna-fill" style={{ width: `${Math.min(100, (Number(s.value) / s.cap) * 100)}%` }} /></div>
            <div className="rct-dna-meta"><span>{s.label}</span><b>{fmt(s.value)}</b></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EntityHubNumberStatusBoard({ data, relationGroups = [], onFacet }) {
  const number = Number(data?.identity?.label);
  const nodeId = data?.identity?.nodeId || null;
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState("pulse");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setStatus(null);
    fetchNumberStatusProjection({ number, nodeId })
      .then(next => { if (alive) { setStatus(next); setLoading(false); } })
      .catch(() => { if (alive) { setStatus(null); setLoading(false); } });
    return () => { alive = false; };
  }, [number, nodeId]);

  const meter = status?.meter || null;
  const surface = data?.surface || {};
  const worlds = Array.isArray(data?.numberWorlds) ? data.numberWorlds : [];
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const journey = data?.journeys?.numberKnowledgeJourney || null;
  const zero = data?.zeroScale || null;
  const zeroChain = Array.isArray(zero?.scale_chain) ? zero.scale_chain : [];
  const posts = Array.isArray(surface.posts) ? surface.posts : [];
  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];

  const wordLayer = meterLayer(meter, "התכנסות מילים");
  const methodsLayer = meterLayer(meter, "רב-שיטתי");
  const sameWorldLayer = meterLayer(meter, "אשכול אותו-עולם");
  const markedLayer = meterLayer(meter, "ישות מסומנת");
  const meterGraphLayer = meterLayer(meter, "קשרי גרף");
  const meterGalleryLayer = meterLayer(meter, "ראשי בגלריות");
  const activeSignals = (meter?.layers || []).filter(l => l?.ok).slice(0, 4);

  const entityCount = meter?.evidence_governance?.entities_scored ?? numFromDetail(wordLayer?.detail);
  const governedMethods = meter?.evidence_governance?.methods_scored_after_dependency || [];
  const methodCount = governedMethods.length || numFromDetail(methodsLayer?.detail);
  const worldEntityCount = worlds.reduce((sum, world) => sum + Number(world?.count || 0), 0);
  const galleryMentions = surface.galleriesCount ?? surface.galleries?.length ?? null;
  const postCount = status?.counts?.strictPosts;
  const postValue = status?.counts?.strictPostsCapped && postCount != null ? `${fmt(postCount)}+` : fmt(postCount);
  const phrasesCount = surface.phrasesCount ?? surface.phrases?.length;

  const analytics = status?.analytics || {};
  const score = meter?.score ?? 0;
  const indexable = status?.discovery?.indexable;

  // Tier 2 — secondary signals (Rank, Don't Hide: still full-size tiles, one level quieter than Pulse/Views/Searches).
  const secondaryFacets = useMemo(() => [
    { key: "graph", icon: "🕸", label: "Reality Graph", value: fmt(status?.counts?.graphEdges), sub: "כל ה־edges הציבוריים", dna: "links" },
    { key: "reality", icon: "🖼", label: "מציאות / תמונות", value: `${fmt(status?.counts?.galleryPrimary)}/${fmt(galleryMentions)}`, sub: "ראשי / כל המופעים" },
    { key: "methods", icon: "🧮", label: "שיטות מחזקות", value: fmt(methodCount), sub: "governed evidence", dna: "multi" },
    { key: "worlds", icon: "🌍", label: "עולמות", value: fmt(worlds.length), sub: `${fmt(worldEntityCount)} שיוכים`, dna: "worlds" },
  ], [status, galleryMentions, methodCount, worlds.length, worldEntityCount]);

  // Tier 3 — tertiary/supporting signals. Smaller, denser, still fully visible and clickable.
  const tertiaryFacets = useMemo(() => [
    { key: "entities", icon: "🔢", label: "ישויות", value: fmt(entityCount), sub: "התכנסות מנועית", dna: "expressions" },
    { key: "phrases", icon: "🧬", label: "ביטויים", value: fmt(phrasesCount), sub: "מאגר הביטויים", dna: "expressions" },
    { key: "posts", icon: "📖", label: "פוסטים", value: postValue, sub: "סינון מחמיר" },
    { key: "topics", icon: "🧩", label: "התכנסויות", value: fmt(topics.length), sub: "Topic Cards מאושרים" },
    { key: "sources", icon: "📚", label: "מקורות", value: fmt(sources.length), sub: "מקורות מחוברים" },
    { key: "journey", icon: "🧭", label: "מסע", value: journey ? fmt(journey.branches?.length || 1) : "—", sub: journey ? "ענפים/תחנות" : "אין מסע" },
    { key: "els", icon: "🔠", label: "ELS", value: fmt(status?.counts?.ciphers), sub: "published" },
    { key: "zero", icon: "0️⃣", label: "סדרת האפס", value: zero?.applicable ? fmt(zeroChain.length) : "—", sub: zero?.applicable ? `שורש ${zero.core_root}` : "לא ישים" },
    { key: "collective", icon: "👥", label: "חוקרים", value: loading ? "…" : fmt(analytics.collective), sub: "אוספים את הישות" },
  ], [entityCount, phrasesCount, postValue, topics.length, sources.length, journey, status, zero, zeroChain.length, loading, analytics.collective]);

  const allFacets = [...secondaryFacets, ...tertiaryFacets];
  const selectFacet = item => {
    setFocus(item.key);
    if (item.dna) onFacet?.(item.dna);
  };

  const dnaSegments = [
    { key: "worlds", label: "עולמות", value: worlds.length, cap: 8 },
    { key: "methods", label: "שיטות", value: methodCount, cap: 10 },
    { key: "graph", label: "Graph", value: status?.counts?.graphEdges, cap: 30 },
    { key: "phrases", label: "ביטויים", value: phrasesCount, cap: 40 },
    { key: "reality", label: "מציאות", value: status?.counts?.galleryPrimary, cap: 20 },
  ];

  const detail = (() => {
    if (focus === "entities") {
      const evidence = Array.isArray(wordLayer?.evidence) ? wordLayer.evidence : [];
      return <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{evidence.slice(0, 16).map((item, i) => {
        const label = typeof item === "string" ? item : item?.label;
        if (!label) return null;
        return <Link key={`${label}-${i}`} to={`/number/${encodeURIComponent(label)}`} style={{ textDecoration: "none", color: "inherit" }}><Chip gold={Boolean(item?.tier)}>{item?.tier === "silver" ? "🥈 " : item?.tier === "gold" ? "👑 " : ""}{label}{item?.method ? ` · ${item.method}` : ""}</Chip></Link>;
      })}</div>;
    }
    if (focus === "methods") {
      // Method Squares — real registry-derived data.gematria.families (same source the downstream
      // Method Explorer uses), not a hardcoded method list.
      if (!families.length) return governedMethods.length
        ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{governedMethods.map(method => <Chip key={method} gold>{method}</Chip>)}</div>
        : <span style={{ color: "var(--eh-muted)" }}>אין פירוט שיטות זמין כרגע.</span>;
      return <div className="rct-methods">{families.map(g => (
        <div key={g.method} className={`rct-method-sq${g.governed ? " governed" : ""}`}>
          <b>{g.registry?.display_label || g.method}</b>
          <div className="n">{fmt(g.count)}</div>
          <div className="g">{g.governed ? "governed" : "היסטורי"}</div>
        </div>
      ))}</div>;
    }
    if (focus === "worlds") return <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{worlds.length ? worlds.map(world => <Chip key={world.world} gold={world.world === "גאולה"}>{world.world} · {world.count}</Chip>) : <span style={{ color: "var(--eh-muted)" }}>אין שיוך עולם חי.</span>}</div>;
    if (focus === "reality") return <div style={{ display: "grid", gap: 5, fontSize: 11.5 }}><div>🖼 ציבורי: <b>{fmt(status?.counts?.galleryPrimary)}</b> תמונות שבהן {number} הוא מספר ראשי · <b>{fmt(galleryMentions)}</b> מופעים בכלל.</div>{meterGalleryLayer?.detail ? <div style={{ color: "var(--eh-muted)" }}>מד ההתכנסות מחזיק scope דירוג משלו: {meterGalleryLayer.detail}. הוא נשמר בנפרד מה־Projection הציבורי.</div> : null}<Link to="/gallery" style={{ color: "var(--eh-gold)", fontWeight: 850, textDecoration: "none" }}>פתח את שכבת המציאות ←</Link></div>;
    if (focus === "posts") return <div style={{ display: "grid", gap: 6 }}>{posts.length ? posts.slice(0, 3).map(post => <Link key={post.id || post.wp_id || post.slug} to={`/${post.slug}`} style={{ color: "var(--eh-ink)", textDecoration: "none", fontSize: 11.5 }}>{post.title?.rendered || post.title || post.slug} ←</Link>) : <span style={{ color: "var(--eh-muted)" }}>אין דוגמת פוסט בחלון הנוכחי.</span>}</div>;
    if (focus === "topics") return <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{topics.length ? topics.map(topic => <Link key={topic.slug} to={`/topic/${encodeURIComponent(topic.slug)}`} style={{ textDecoration: "none", color: "inherit" }}><Chip gold>{topic.title || topic.slug}</Chip></Link>) : <span style={{ color: "var(--eh-muted)" }}>אין Topic מאושר כרגע.</span>}</div>;
    if (focus === "graph") return <div style={{ display: "grid", gap: 6 }}><div style={{ fontSize: 11.5 }}>🕸 <b>{fmt(status?.counts?.graphEdges)}</b> edges ציבוריים מחוברים ל־Node של {number}.</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{relationGroups.map(([name, rows]) => <Chip key={name}>{name} · {rows.length}</Chip>)}</div>{meterGraphLayer?.detail ? <div style={{ fontSize: 10, color: "var(--eh-muted)" }}>שכבת הדירוג של convergence_meter מציגה בנפרד: {meterGraphLayer.detail}.</div> : null}</div>;
    if (focus === "phrases") return <div style={{ fontSize: 11.5 }}>מאגר הישות מחזיר <b>{fmt(phrasesCount)}</b> ביטויים בחלון הציבורי. פירוק לפי שיטה נמצא מיד מתחת בלשונית ביטויים/רב־שיטתי.</div>;
    if (focus === "sources") return <div style={{ display: "grid", gap: 5 }}>{sources.length ? sources.slice(0, 10).map((source, i) => <div key={`${source.ref || source.label}-${i}`} style={{ fontSize: 10.8 }}>• {source.label}</div>) : <span style={{ color: "var(--eh-muted)" }}>אין מקור ציבורי מוקרן כרגע.</span>}</div>;
    if (focus === "journey") return journey ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(journey.branches || []).slice(0, 10).map((branch, i) => <Chip key={branch.id || i}>{branch.label || branch.value || branch.kind || `תחנה ${i + 1}`}</Chip>)}</div> : <span style={{ color: "var(--eh-muted)" }}>אין Journey קנוני כרגע — לא ממציאים אחד.</span>;
    if (focus === "els") return <div style={{ fontSize: 11.5 }}>🔠 <b>{fmt(status?.counts?.ciphers)}</b> צפנים מפורסמים מחוברים ישירות ל־{number} דרך primary_number/anchor_numbers. אפס נשאר גלוי — Rank, Don't Hide.</div>;
    if (focus === "zero") return zero?.applicable ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{zeroChain.map(value => <Link key={value} to={`/number/${value}`} style={{ textDecoration: "none", color: "inherit" }}><Chip gold={value === number}>{value}</Chip></Link>)}</div> : <span style={{ color: "var(--eh-muted)" }}>סדרת האפס אינה ישימה לפי fn_zero_scale.</span>;
    if (focus === "collective") return <div style={{ fontSize: 11.5 }}>👥 <b>{fmt(analytics.collective)}</b> חוקרים אספו/עוקבים אחרי הישות דרך entity_collective_count.</div>;

    return <div style={{ display: "grid", gap: 7 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(meter?.layers || []).map((layer, i) => <Chip key={`${layer.name}-${i}`} gold={layer.ok}>{layer.icon} {layer.name} · {layer.detail || "—"}</Chip>)}</div>
      {markedLayer?.detail ? <div style={{ fontSize: 10.5, color: "var(--eh-muted)" }}>ישות מסומנת: {markedLayer.detail} · אותו־עולם: {sameWorldLayer?.detail || "—"}</div> : null}
    </div>;
  })();

  if (!Number.isSafeInteger(number) || number < 1) return null;

  return (
    <section className="rct">
      <div className="rct-top">
        <PulseCore score={score} />
        <div style={{ minWidth: 0 }}>
          <div className="rct-identity-eyebrow">LIVE ENTITY STATUS · ONE REALITY</div>
          <div className="rct-identity-row"><h2>{number}</h2><span style={{ fontSize: 11.5, fontWeight: 850, color: "var(--eh-gold)" }}>● מספר חי במערכת</span></div>
          <div className="rct-anchor">{meter?.anchor || "מרכז מצב דינמי — כל הנתונים נקראים מהמערכת החיה"}</div>
          <div className="rct-primary-stats">
            <PrimaryStat value={loading ? "…" : fmt(analytics.viewsAll)} label="צפיות" sub={analytics.views30 != null ? `${fmt(analytics.views30)} ב־30 יום` : null} />
            <PrimaryStat value={loading ? "…" : fmt(analytics.searches)} label="חיפושים" sub="search_log" />
          </div>
          <div className="rct-quiet-badges">
            {indexable === true ? <Chip>SEO · ניתן לאינדוקס</Chip> : indexable === false ? <Chip>SEO · לא מאונדקס</Chip> : null}
          </div>
        </div>
      </div>

      {activeSignals.length ? (
        <div className="rct-signal">
          {activeSignals.map((l, i) => <span key={`${l.name}-${i}`} className="rct-signal-chip">{l.icon} {l.name}</span>)}
        </div>
      ) : null}

      <DnaStrip segments={dnaSegments} />

      <div className="rct-tier-label">אותות מרכזיים</div>
      <div className="rct-tier2">
        {secondaryFacets.map(item => <Facet key={item.key} icon={item.icon} label={item.label} value={item.value} sub={item.sub} active={focus === item.key} onClick={() => selectFacet(item)} />)}
      </div>

      <div className="rct-tier-label">אותות תומכים</div>
      <div className="rct-tier3">
        {tertiaryFacets.map(item => <Facet key={item.key} icon={item.icon} label={item.label} value={item.value} sub={item.sub} tier={3} active={focus === item.key} onClick={() => selectFacet(item)} />)}
      </div>

      <div className="rct-detail">
        <div className="rct-detail-head">
          <b className="rct-detail-title">{focus === "pulse" ? "שכבות הדופק" : "פירוט · " + (allFacets.find(item => item.key === focus)?.label || focus)}</b>
          <button type="button" onClick={() => setFocus("pulse")} className="rct-detail-reset">שכבות הדופק</button>
        </div>
        {loading ? <div style={{ color: "var(--eh-muted)", fontSize: 11 }}>טוען Readers חיים…</div> : detail}
      </div>

      <div className="rct-footnote">הציון והשכבות מגיעים מ־convergence_meter · צפיות מ־view_count · חיפושים מ־search_log · Graph/גלריה/ELS נקראים דרך ה־RLS הציבורי. ספירות בעלות scope שונה אינן מאוחדות זו בזו.</div>
    </section>
  );
}
