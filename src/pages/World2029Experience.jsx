import React, { useEffect, useMemo, useState } from "react";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ResearchInspector2029 from "../components/research/ResearchInspector2029.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import {
  EXPLORER_FACETS,
  fetchExplorerFacetDetail,
  fetchExplorerFacetPage,
  explorerCardSelection,
} from "../lib/research/explorerFacets.js";
import { applySeo } from "../lib/seo.js";
import "./world2029.css";
import "../components/research/researchInspector2029.css";

const FACET_META = Object.freeze({
  topic: { label: "התכנסויות", short: "התכנסויות", icon: "◎", note: "חידושים והתכנסויות מחקר מתוך המאגר החי" },
  number: { label: "מספרים", short: "מספרים", icon: "123", note: "מספרים פעילים ב־Reality Graph" },
  book: { label: "ספרים ומקורות", short: "ספרים", icon: "▤", note: "מקורות וספרים פעילים" },
  event: { label: "אירועים", short: "אירועים", icon: "◷", note: "אירועים וזהויות זמן" },
  phrase: { label: "ביטויים", short: "ביטויים", icon: "אב", note: "ביטויים מחקריים פעילים" },
  entity: { label: "ישויות", short: "ישויות", icon: "◇", note: "ישויות פעילות בגרף" },
  year: { label: "שנים", short: "שנים", icon: "◫", note: "זהויות שנה פעילות" },
  word: { label: "מילים", short: "מילים", icon: "א", note: "מילים פעילות" },
  foreign_word: { label: "מילים לועזיות", short: "לועזי", icon: "A", note: "ייצוגים לשוניים פעילים" },
  language_bridge: { label: "גשרי שפה", short: "גשרי שפה", icon: "↔", note: "קשרים בין ייצוגים לשוניים" },
});

const FACET_ORDER = ["topic", "number", "book", "event", "phrase", "entity", "year", "word", "foreign_word", "language_bridge"];
const AVAILABLE_FACETS = FACET_ORDER
  .filter(key => EXPLORER_FACETS.some(facet => facet.key === key))
  .map(key => ({ key, ...(FACET_META[key] || { label: key, short: key, icon: "•", note: "" }) }));

function subjectKey(subject) {
  return subject?.id && subject?.type ? `${subject.type}:${subject.id}` : null;
}
function scoreOf(card) {
  const score = Number(card?.rank?.score);
  return Number.isFinite(score) && score > 0 ? score : null;
}
function topicCardFromRow(row) {
  if (!row) return null;
  const refId = row.slug || row.identity_key || row.id;
  if (!refId) return null;
  const score = Number(row.meter_score);
  return {
    id: String(row.id || refId), facet: "topic", label: row.title || row.label || String(refId),
    sub: row.subtitle || row.description || "", refId: String(refId),
    rank: { score: Number.isFinite(score) ? score : 0, neutral: !Number.isFinite(score) },
  };
}
async function fetchAllTopics(filters) {
  const cards = [];
  let offset = 0;
  let hasMore = false;
  for (let page = 0; page < 16; page += 1) {
    const result = await fetchExplorerFacetPage("topic", { ...filters, limit: 80, offset });
    const next = Array.isArray(result?.cards) ? result.cards : [];
    cards.push(...next);
    hasMore = Boolean(result?.hasMore);
    if (!hasMore || !next.length) break;
    offset += next.length;
  }
  return { cards, hasMore };
}

function FacetButton({ facet, active, count, onClick, compact = false }) {
  return <button type="button" className={`world-facet-button${active ? " active" : ""}${compact ? " compact" : ""}`} onClick={onClick}>
    <span className="world-facet-icon">{facet.icon}</span>
    <span className="world-facet-label">{compact ? facet.short : facet.label}</span>
    {count != null ? <span className="world-facet-count">{Number(count).toLocaleString("he-IL")}</span> : null}
  </button>;
}

function WorldListRow({ card, onOpen }) {
  const meta = FACET_META[card.facet] || { label: card.facet, icon: "•" };
  const score = scoreOf(card);
  return <button className="world-result-row" type="button" onClick={() => onOpen(card)}>
    <div className="world-result-icon">{meta.icon}</div>
    <div className="world-result-copy">
      <div className="world-result-meta"><span>{meta.label}</span>{score != null ? <span className="world-score-label">מד התכנסות {Math.round(score)}</span> : null}</div>
      <strong>{card.label}</strong>
      {card.sub ? <small>{card.sub}</small> : null}
    </div>
    <div className="world-result-tail">
      {score != null ? <div className="world-score"><i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div> : null}
      <span className="world-open-label">פתח</span>
    </div>
  </button>;
}

function WorldInspectorDrawer({ inspector, onClose, research, shell, context, onOpenNumber }) {
  const card = inspector.card;
  useEffect(() => {
    if (!inspector.open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = event => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", key); };
  }, [inspector.open, onClose]);
  if (!inspector.open || !card) return null;

  const activate = () => {
    const selection = explorerCardSelection(card);
    research.setResearchContext?.({
      subject: { id: String(card.refId), type: card.facet, label: card.label, href: "/world" },
      selection: selection || { entityId: String(card.refId), entityType: card.facet },
      lens: "world",
      returnTo: context?.returnTo || null,
    });
    onClose();
  };

  return <>
    <div className="world-inspector-backdrop" onMouseDown={onClose} />
    <aside className="world-inspector" aria-label={`פרטי ${card.label}`}>
      <header className="world-inspector-head">
        <div>
          <div className="world-kicker">{FACET_META[card.facet]?.label || card.facet}</div>
          <h2>{inspector.finding?.subject?.label || inspector.entityData?.identity?.label || card.label}</h2>
          <div className="world-inspector-score">Research Inspector · One Context</div>
        </div>
        <button className="world-icon-button" type="button" onClick={onClose} aria-label="סגור">×</button>
      </header>
      <div className="world-inspector-scroll">
        <ResearchInspector2029
          card={card}
          finding={inspector.finding}
          entityData={inspector.entityData}
          loading={inspector.loading}
          error={inspector.error}
          currentContext={context}
          onOpenNumber={onOpenNumber}
          onActivate={activate}
          onOpenBook={() => { onClose(); shell.go(`/books/${encodeURIComponent(card.refId)}`); }}
          onOpenHeichal={() => { activate(); shell.go("/heichal"); }}
        />
      </div>
    </aside>
  </>;
}

function LiveWorldLanding({ onOpenCard }) {
  const [activeFacet, setActiveFacet] = useState("topic");
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [numberDraft, setNumberDraft] = useState("");
  const [numberFilter, setNumberFilter] = useState("");
  const [fromDraft, setFromDraft] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [strength, setStrength] = useState("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [state, setState] = useState({ loading: true, cards: [], hasMore: false, error: null });
  const meta = FACET_META[activeFacet] || { label: activeFacet, note: "" };

  const loadFacet = async ({ append = false } = {}) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      if (activeFacet === "topic") {
        const result = await fetchAllTopics({ q: query || null, number: numberFilter || null, from: fromFilter || null, to: toFilter || null });
        setState({ loading: false, cards: result.cards, hasMore: result.hasMore, error: null });
        return;
      }
      const result = await fetchExplorerFacetPage(activeFacet, { q: query || null, limit: 60, offset: append ? state.cards.length : 0 });
      const next = Array.isArray(result?.cards) ? result.cards : [];
      setState(prev => ({ loading: false, cards: append ? [...prev.cards, ...next] : next, hasMore: Boolean(result?.hasMore), error: null }));
    } catch (error) { setState(prev => ({ ...prev, loading: false, error })); }
  };

  useEffect(() => { loadFacet({ append: false }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeFacet, query, numberFilter, fromFilter, toFilter]);

  const visibleCards = useMemo(() => {
    if (activeFacet !== "topic") return state.cards;
    if (strength === "90") return state.cards.filter(card => (scoreOf(card) || 0) >= 90);
    if (strength === "80") return state.cards.filter(card => (scoreOf(card) || 0) >= 80);
    if (strength === "unrated") return state.cards.filter(card => scoreOf(card) == null);
    return state.cards;
  }, [activeFacet, state.cards, strength]);

  const clearAll = () => { setSearchDraft(""); setQuery(""); setNumberDraft(""); setNumberFilter(""); setFromDraft(""); setFromFilter(""); setToDraft(""); setToFilter(""); setStrength("all"); };
  const hasFilters = Boolean(query || numberFilter || fromFilter || toFilter || strength !== "all");

  return <div className="world-app">
    <section className="world-titlebar">
      <div><div className="world-kicker">ONE REALITY · LIVE RESEARCH</div><h1>העולם</h1><p>מסננים, פותחים יחידת מחקר, ונעים באותו Research Context — בלי לייצר מערכת אחרת לכל סוג.</p></div>
      <div className="world-title-stats"><div><strong>{activeFacet === "topic" && !state.loading ? state.cards.length.toLocaleString("he-IL") : "חי"}</strong><span>{activeFacet === "topic" ? "התכנסויות" : meta.short}</span></div><div><strong>1</strong><span>Reality Graph</span></div><div><strong>1</strong><span>Research OS</span></div></div>
    </section>

    <section className="world-control-panel">
      <form className="world-search" onSubmit={event => { event.preventDefault(); setQuery(searchDraft.trim()); }}><span className="world-search-icon">⌕</span><input value={searchDraft} onChange={e => setSearchDraft(e.target.value)} placeholder={`חפש בתוך ${meta.label}`} /><button className="world-btn primary" type="submit">חפש</button></form>
      <div className="world-mobile-facets">{AVAILABLE_FACETS.map(facet => <FacetButton key={facet.key} facet={facet} compact active={activeFacet === facet.key} count={activeFacet === facet.key && !state.loading ? state.cards.length : null} onClick={() => { setActiveFacet(facet.key); setStrength("all"); }} />)}</div>
      {activeFacet === "topic" ? <div className="world-topic-tools">
        <div className="world-chip-row">{[["all","הכול"],["90","90+"],["80","80+"],["unrated","ללא מדד"]].map(([key,label]) => <button key={key} className={`world-chip${strength === key ? " active" : ""}`} type="button" onClick={() => setStrength(key)}>{label}</button>)}<button className={`world-chip${advancedOpen ? " active" : ""}`} type="button" onClick={() => setAdvancedOpen(v => !v)}>סינון מתקדם</button>{hasFilters ? <button className="world-chip clear" type="button" onClick={clearAll}>נקה הכול</button> : null}</div>
        {advancedOpen ? <form className="world-advanced" onSubmit={event => { event.preventDefault(); setNumberFilter(numberDraft.trim()); setFromFilter(fromDraft); setToFilter(toDraft); }}><label><span>מספר</span><input inputMode="numeric" value={numberDraft} onChange={e => setNumberDraft(e.target.value)} placeholder="למשל 1820" /></label><label><span>מתאריך</span><input type="date" value={fromDraft} onChange={e => setFromDraft(e.target.value)} /></label><label><span>עד תאריך</span><input type="date" value={toDraft} onChange={e => setToDraft(e.target.value)} /></label><button className="world-btn" type="submit">החל</button></form> : null}
      </div> : hasFilters ? <div className="world-chip-row"><button className="world-chip clear" type="button" onClick={clearAll}>נקה חיפוש</button></div> : null}
    </section>

    <div className="world-workspace">
      <aside className="world-facet-rail"><div className="world-facet-rail-title">סינון עולם</div>{AVAILABLE_FACETS.map(facet => <FacetButton key={facet.key} facet={facet} active={activeFacet === facet.key} count={activeFacet === facet.key && !state.loading ? state.cards.length : null} onClick={() => { setActiveFacet(facet.key); setStrength("all"); }} />)}</aside>
      <section className="world-results-panel">
        <header className="world-results-head"><div><div className="world-kicker">{activeFacet === "topic" ? "ALL CONVERGENCES" : "LIVE FACET"}</div><h2>{meta.label}</h2><p>{meta.note}</p></div><div className="world-results-count"><strong>{visibleCards.length.toLocaleString("he-IL")}</strong><span>מוצגות</span></div></header>
        {state.loading && !state.cards.length ? <div className="world-state">טוען נתונים חיים…</div> : null}{state.error ? <div className="world-state error">חלק מהנתונים לא נטענו כרגע.</div> : null}{!state.loading && !visibleCards.length ? <div className="world-state">לא נמצאו תוצאות.</div> : null}
        <div className="world-result-list">{visibleCards.map(card => <WorldListRow key={`${card.facet}:${card.id}`} card={card} onOpen={onOpenCard} />)}</div>
        {activeFacet !== "topic" && state.hasMore && !state.loading ? <button className="world-load-more" type="button" onClick={() => loadFacet({ append: true })}>עוד {meta.label}</button> : null}
      </section>
    </div>
  </div>;
}

function AnchoredWorld({ research, shell, subject, onOpenCard }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const key = subjectKey(subject);
  useEffect(() => {
    let live = true;
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type: subject.type, key: subject.id, relationLimit: 100, researchLimit: 60, topicLimit: 18 }).then(data => live && setState({ loading: false, data, error: null })).catch(error => live && setState({ loading: false, data: null, error }));
    return () => { live = false; };
  }, [key, subject.id, subject.type]);
  const data = state.data;
  const relations = data?.graph?.relations || [];
  const researchRows = data?.research?.findings || data?.research?.rows || [];
  const sources = data?.sources || [];
  const timeline = data?.timeline || [];
  const topics = (data?.topics?.rows || []).map(topicCardFromRow).filter(Boolean);
  const methods = data?.gematria?.families || [];
  const back = () => { research.clearResearchContext?.(); research.updateResearchContext?.({ lens: "world" }); };

  return <div className="world-app anchored">
    <section className="world-anchor-head"><div className="world-anchor-title"><button className="world-back" type="button" onClick={back}>← העולם</button><div className="world-kicker">RESEARCH ANCHOR</div><h1>{data?.identity?.label || subject.label || subject.id}</h1><p>{data?.identity?.description || `העולם סביב ${subject.label || subject.id}`}</p></div><div className="world-anchor-actions"><button className="world-btn" type="button" onClick={() => shell.openRaziel()}>✦ רזיאל</button><button className="world-btn primary" type="button" onClick={() => shell.go("/heichal")}>◇ היכל</button></div></section>
    {state.loading ? <div className="world-state">טוען את העולם סביב העוגן…</div> : null}{state.error ? <div className="world-state error">לא הצלחנו לפתוח את העוגן כרגע.</div> : null}
    {data ? <><section className="world-metric-grid"><div><strong>{relations.length}</strong><span>קשרים</span></div><div><strong>{researchRows.length}</strong><span>ממצאים</span></div><div><strong>{sources.length}</strong><span>מקורות</span></div><div><strong>{topics.length}</strong><span>התכנסויות</span></div><div><strong>{methods.length}</strong><span>שיטות</span></div><div><strong>{timeline.length}</strong><span>זמן</span></div></section>
      {topics.length ? <section className="world-anchor-section"><header><div><div className="world-kicker">CONVERGENCES</div><h2>התכנסויות סביב העוגן</h2></div><span>{topics.length}</span></header><div className="world-result-list">{topics.map(card => <WorldListRow key={card.id} card={card} onOpen={onOpenCard} />)}</div></section> : null}
      <div className="world-anchor-columns">{[["RESEARCH","מחקר חי",researchRows],["RELATIONS","קשרים",relations],["SOURCES","מקורות",sources],["TIME","זמן",timeline]].map(([kicker,title,rows]) => rows.length ? <section className="world-anchor-section" key={kicker}><header><div><div className="world-kicker">{kicker}</div><h2>{title}</h2></div><span>{rows.length}</span></header><div className="world-mini-list">{rows.slice(0,16).map((row,index) => <div className="world-mini-item" key={row.id || `${kicker}-${index}`}><strong>{row.statement || row.subject?.label || row.label || row.ref || row.kind || title}</strong><small>{row.verification?.verification_state || row.stage || row.kind || row.ref || ""}</small></div>)}</div></section> : null)}</div>
    </> : null}
  </div>;
}

function WorldBody() {
  const research = useResearch();
  const shell = use2029Shell();
  const context = research.context || null;
  const subject = context?.subject || null;
  const [inspector, setInspector] = useState({ open: false, loading: false, card: null, finding: null, entityData: null, error: null });
  useEffect(() => { research.updateResearchContext?.({ lens: "world" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const closeInspector = () => setInspector({ open: false, loading: false, card: null, finding: null, entityData: null, error: null });
  const openNumber = value => setInspector({ open: true, loading: false, card: { id: `number:${value}`, facet: "number", label: String(value), sub: "Number Core", refId: String(value) }, finding: null, entityData: null, error: null });
  const openCard = async card => {
    if (!card) return;
    if (card.facet === "number") { openNumber(Number(card.refId)); return; }
    setInspector({ open: true, loading: true, card, finding: null, entityData: null, error: null });
    try {
      if (card.facet === "topic") {
        const finding = await fetchExplorerFacetDetail("topic", card);
        setInspector({ open: true, loading: false, card, finding, entityData: null, error: null });
      } else {
        const entityData = await fetchEntityHubProjection({ type: card.facet, key: card.refId, relationLimit: 80, researchLimit: 40, topicLimit: 12 });
        setInspector({ open: true, loading: false, card, finding: null, entityData, error: null });
      }
    } catch (error) { setInspector({ open: true, loading: false, card, finding: null, entityData: null, error }); }
  };
  return <>{subject ? <AnchoredWorld research={research} shell={shell} subject={subject} onOpenCard={openCard} /> : <LiveWorldLanding onOpenCard={openCard} />}<WorldInspectorDrawer inspector={inspector} onClose={closeInspector} research={research} shell={shell} context={context} onOpenNumber={openNumber} /></>;
}

export default function World2029Experience() {
  useEffect(() => { applySeo({ title: "העולם · SOD1820", description: "עולם המחקר החי של SOD1820 — התכנסויות, מספרים, מקורות, אירועים וביטויים מעל One Reality Graph.", path: "/world" }); }, []);
  return <Sod2029Shell wide surface="world" symbol="◌" eyebrow="ONE REALITY · LIVE WORLD" title="העולם" description="עולם מחקר חי מעל הנתונים הקנוניים של SOD1820."><WorldBody /></Sod2029Shell>;
}
