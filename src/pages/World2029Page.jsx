import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import TopicConvergenceContent from "../components/research/TopicConvergenceContent.jsx";
import { usePalette } from "../lib/palette.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import {
  fetchExplorerFacetDetail,
  fetchExplorerFacetPage,
  explorerCardSelection,
} from "../lib/research/explorerFacets.js";
import { applySeo } from "../lib/seo.js";

const WORLD_FACETS = [
  { key: "topic", title: "התכנסויות חזקות", kicker: "מחקר חי", limit: 8 },
  { key: "number", title: "מספרים בעולם", kicker: "מספרים", limit: 10 },
  { key: "book", title: "ספרים ומקורות", kicker: "מקורות", limit: 6 },
  { key: "event", title: "אירועים", kicker: "זמן ומציאות", limit: 6 },
  { key: "phrase", title: "ביטויים", kicker: "שפה וביטוי", limit: 6 },
];

const FACET_LABELS = {
  topic: "התכנסות",
  number: "מספר",
  book: "ספר",
  event: "אירוע",
  phrase: "ביטוי",
  entity: "ישות",
  year: "שנה",
  word: "מילה",
  foreign_word: "מילה לועזית",
  language_bridge: "גשר שפה",
};

function subjectKey(subject) {
  if (!subject?.id || !subject?.type) return null;
  return `${subject.type}:${subject.id}`;
}

function WorldCard({ card, onOpen }) {
  return (
    <button type="button" className="sod29-card sod29-card-button" onClick={() => onOpen(card)}>
      <div className="sod29-kicker">{FACET_LABELS[card.facet] || card.facet}</div>
      <h3>{card.label}</h3>
      {card.sub ? <p>{card.sub}</p> : null}
      <div className="sod29-actions"><span className="sod29-chip">פתח בעולם ←</span></div>
    </button>
  );
}

function LiveWorldLanding({ research, shell, context }) {
  const palette = usePalette();
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [landing, setLanding] = useState({ loading: true, sections: {}, error: null });
  const [topicDetail, setTopicDetail] = useState({ loading: false, card: null, finding: null, error: null });

  const load = async (q = "") => {
    setLanding(prev => ({ ...prev, loading: true, error: null }));
    const settled = await Promise.allSettled(
      WORLD_FACETS.map(facet => fetchExplorerFacetPage(facet.key, { q: q || null, limit: facet.limit, offset: 0 }))
    );
    const sections = {};
    let firstError = null;
    settled.forEach((result, index) => {
      const key = WORLD_FACETS[index].key;
      if (result.status === "fulfilled") sections[key] = result.value?.cards || [];
      else if (!firstError) firstError = result.reason;
    });
    setLanding({ loading: false, sections, error: firstError });
  };

  useEffect(() => { load(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCard = async (card) => {
    if (!card) return;
    if (card.facet === "topic") {
      setTopicDetail({ loading: true, card, finding: null, error: null });
      try {
        const finding = await fetchExplorerFacetDetail("topic", card);
        setTopicDetail({ loading: false, card, finding, error: null });
      } catch (error) {
        setTopicDetail({ loading: false, card, finding: null, error });
      }
      return;
    }

    if (card.facet === "book") {
      shell.go(`/books/${encodeURIComponent(card.refId)}`);
      return;
    }

    const selection = explorerCardSelection(card);
    research.setResearchContext?.({
      subject: {
        id: String(card.refId),
        type: card.facet,
        label: card.label,
        href: "/world",
      },
      selection: selection || { entityId: String(card.refId), entityType: card.facet },
      lens: "world",
      returnTo: context?.returnTo || null,
    });
  };

  const submitSearch = (e) => {
    e?.preventDefault?.();
    const q = query.trim();
    setSearchedQuery(q);
    setTopicDetail({ loading: false, card: null, finding: null, error: null });
    load(q);
  };

  const clearSearch = () => {
    setQuery("");
    setSearchedQuery("");
    setTopicDetail({ loading: false, card: null, finding: null, error: null });
    load("");
  };

  const topicNumbers = useMemo(() => (
    (topicDetail.finding?.projection?.anchors || [])
      .filter(anchor => anchor?.type === "number" && Number.isFinite(Number(anchor.value)))
      .map(anchor => Number(anchor.value))
  ), [topicDetail.finding]);

  const openTopicNumber = (value) => {
    research.setResearchContext?.({
      subject: { id: String(value), type: "number", label: String(value), href: "/world" },
      selection: { entityId: String(value), entityType: "number" },
      lens: "world",
      returnTo: { href: "/world", label: topicDetail.card?.label || "העולם" },
    });
  };

  return <>
    <section className="sod29-focus-stage" id="world-entry">
      <div className="sod29-command-shell">
        <div className="sod29-command-copy">
          <div className="sod29-kicker">העולם החי של SOD1820</div>
          <h2>הנתונים כבר כאן.<br />בחר נקודה והיכנס פנימה.</h2>
          <div className="sod29-muted">העולם נפתח ישר מתוך הנתונים החיים של המערכת: התכנסויות, מספרים, ספרים, אירועים וביטויים. כל בחירה הופכת לעוגן מחקר וממנה אפשר להתגלגל לקשרים, מקורות, רזיאל והיכל.</div>
          <form className="sod29-command-bar" onSubmit={submitSearch}>
            <input className="sod29-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="חפש מספר, ביטוי, אירוע או נושא" aria-label="חיפוש בעולם" />
            <button className="sod29-action primary" type="submit">חפש בעולם</button>
          </form>
          {searchedQuery ? <div className="sod29-actions" style={{ marginTop: 10 }}><button type="button" className="sod29-action" onClick={clearSearch}>נקה חיפוש · {searchedQuery}</button></div> : null}
        </div>
        <div className="sod29-orbit-map" aria-hidden="true">
          <div className="sod29-orbit-center">SOD<br />1820</div>
          <span className="sod29-orbit-node n1">מספרים</span>
          <span className="sod29-orbit-node n2">מקורות</span>
          <span className="sod29-orbit-node n3">קשרים</span>
          <span className="sod29-orbit-node n4">מחקר</span>
        </div>
      </div>
    </section>

    {landing.loading ? <section className="sod29-section"><div className="sod29-state">טוען את העולם החי…</div></section> : null}
    {landing.error ? <section className="sod29-section"><div className="sod29-state warn">חלק מהנתונים לא נטענו כרגע. מה שכן זמין מוצג למטה.</div></section> : null}

    {!landing.loading && WORLD_FACETS.map(facet => {
      const cards = landing.sections[facet.key] || [];
      if (!cards.length) return null;
      return <section className="sod29-section" key={facet.key}>
        <div className="sod29-section-head">
          <div><div className="sod29-kicker">{facet.kicker}</div><h2>{facet.title}</h2></div>
          {facet.key === "book" ? <Link className="sod29-action" to="/books">לכל הספרים</Link> : null}
        </div>
        <div className="sod29-book-grid">
          {cards.map(card => <WorldCard key={`${card.facet}:${card.id}`} card={card} onOpen={openCard} />)}
        </div>
      </section>;
    })}

    {topicDetail.loading ? <section className="sod29-section"><div className="sod29-state">פותח את החידוש מתוך המקור החי…</div></section> : null}
    {topicDetail.error ? <section className="sod29-section"><div className="sod29-state error">החידוש לא נטען כרגע.</div></section> : null}
    {topicDetail.finding ? <section className="sod29-section">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">מחקר מתוך המאגר</div>
          <h2>{topicDetail.finding.subject?.label || topicDetail.card?.label}</h2>
          {topicDetail.finding.evidence?.score != null ? <div className="sod29-muted">עוצמת התכנסות לתצוגה: {topicDetail.finding.evidence.score}</div> : null}
        </div>
        <button className="sod29-action" type="button" onClick={() => setTopicDetail({ loading: false, card: null, finding: null, error: null })}>סגור</button>
      </div>
      {topicNumbers.length ? <div className="sod29-actions" style={{ marginBottom: 16 }}>
        {topicNumbers.map(value => <button key={value} className="sod29-action primary" type="button" onClick={() => openTopicNumber(value)}>פתח את {value} בעולם</button>)}
      </div> : null}
      <TopicConvergenceContent finding={topicDetail.finding} palette={palette} />
    </section> : null}
  </>;
}

function AnchoredWorld({ research, shell, subject }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const key = subjectKey(subject);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type: subject.type, key: subject.id, relationLimit: 80, researchLimit: 40, topicLimit: 10 })
      .then(data => alive && setState({ loading: false, data, error: null }))
      .catch(error => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [key, subject.id, subject.type]);

  const data = state.data;
  const counts = useMemo(() => ({
    relations: data?.graph?.relations?.length || 0,
    findings: data?.research?.findings?.length || 0,
    sources: data?.sources?.length || 0,
    worlds: data?.numberWorlds?.length || 0,
    timeline: data?.timeline?.length || 0,
  }), [data]);

  const backToWorld = () => {
    research.clearResearchContext?.();
    research.updateResearchContext?.({ lens: "world" });
  };

  const addRoot = () => {
    if (!data?.identity?.nodeId) return;
    research.addToResearch?.({
      id: `node:${data.identity.nodeId}`,
      type: data.identity.type,
      title: data.identity.label,
      label: data.identity.label,
      link: "/world",
      metadata: { nodeId: data.identity.nodeId, source: "world" },
    });
  };

  return <>
    <section className="sod29-section">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">העולם סביב העוגן</div>
          <h2>{subject.label || subject.id}</h2>
          <div className="sod29-muted">מכאן רואים את מה שכבר מחובר לעוגן במערכת — לא דמו ולא נתוני מילוי.</div>
        </div>
        <div className="sod29-actions">
          <button className="sod29-action" type="button" onClick={backToWorld}>◌ חזרה לעולם</button>
          <button className="sod29-action" type="button" onClick={() => shell.openRaziel()}>✦ רזיאל</button>
          <Link className="sod29-action primary" to="/heichal">◇ העמק בהיכל</Link>
        </div>
      </div>
    </section>

    {state.loading ? <section className="sod29-section"><div className="sod29-state">טוען קשרים, מחקר ומקורות…</div></section> : null}
    {state.error ? <section className="sod29-section"><div className="sod29-state error">לא הצלחנו לפתוח את העוגן כרגע: {String(state.error?.message || state.error)}</div></section> : null}
    {!state.loading && !state.error && !data ? <section className="sod29-section"><div className="sod29-state warn">העוגן קיים לבחירה, אבל עדיין אין לו זהות Graph עם עומק שניתן לפתוח כאן. חזור לעולם ובחר נקודה אחרת.</div></section> : null}

    {data ? <>
      <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">מרכז העולם</div><h2>{data.identity.label}</h2></div><button className="sod29-action" type="button" onClick={addRoot}>＋ הוסף למחקר</button></div>
        <div className="sod29-world-stage">
          <div className="sod29-anchor-core"><div><div className="sod29-kicker">עוגן פעיל</div><strong>{data.identity.label}</strong><small>{FACET_LABELS[data.identity.type] || data.identity.type}</small></div></div>
          <div className="sod29-orbit-metrics">
            <div className="sod29-card"><div className="sod29-stat">{counts.relations}</div><div className="sod29-stat-label">קשרים</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.findings}</div><div className="sod29-stat-label">ממצאי מחקר</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.sources}</div><div className="sod29-stat-label">מקורות</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.worlds}</div><div className="sod29-stat-label">עדשות</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.timeline}</div><div className="sod29-stat-label">נקודות זמן</div></div>
          </div>
        </div>
      </section>

      {data.graph?.relations?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">קשרים</div><h2>מה מחובר לכאן</h2></div></div><div className="sod29-list">{data.graph.relations.slice(0, 14).map((f, i) => {
        const relation = f.projection?.relations?.[0];
        return <div className="sod29-row" key={f.id || i}><div><strong>{relation?.target || f.subject?.label || "קשר"}</strong><small>{relation?.relation_type || relation?.type || f.kind || "קשר בגרף"}</small></div></div>;
      })}</div></section> : null}

      {data.research?.findings?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">מחקר חי</div><h2>ממצאים סביב העוגן</h2></div></div><div className="sod29-list">{data.research.findings.slice(0, 12).map((f, i) => <div className="sod29-row" key={f.id || i}><div><strong>{f.statement || f.subject?.label || f.kind}</strong><small>{f.stage || f.kind || "מחקר"}{f.verification?.verification_state ? ` · ${f.verification.verification_state}` : ""}</small></div></div>)}</div></section> : null}

      {data.sources?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">מקורות</div><h2>מאיפה זה מגיע</h2></div><Link className="sod29-action" to="/books">ספרים ומקורות</Link></div><div className="sod29-list">{data.sources.slice(0, 10).map((s, i) => <div className="sod29-row" key={`${s.ref || s.label}-${i}`}><div><strong>{s.label || s.ref || "מקור"}</strong><small>{s.ref || "מקור מחקרי"}</small></div></div>)}</div></section> : null}

      {data.timeline?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">זמן</div><h2>ציר הזמן</h2></div></div><div className="sod29-list">{data.timeline.slice(-8).map((item, i) => <div className="sod29-row" key={`${item.id || i}-${item.at || ""}`}><div><strong>{item.label || item.kind || "שינוי"}</strong><small>{item.at ? new Date(item.at).toLocaleDateString("he-IL") : "זמן לא ידוע"}</small></div></div>)}</div></section> : null}
    </> : null}
  </>;
}

function WorldBody() {
  const research = useResearch();
  const shell = use2029Shell();
  const context = research.context || null;
  const subject = context?.subject || null;

  useEffect(() => {
    research.updateResearchContext?.({ lens: "world" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!subject?.id || !subject?.type) return <LiveWorldLanding research={research} shell={shell} context={context} />;
  return <AnchoredWorld research={research} shell={shell} subject={subject} />;
}

export default function World2029Page() {
  useEffect(() => { applySeo({ title: "העולם · SOD1820", description: "העולם החי של SOD1820 — מספרים, התכנסויות, מקורות, אירועים וקשרים מתוך המערכת", path: "/world" }); }, []);
  return <Sod2029Shell surface="world" symbol="◌" eyebrow="SOD1820 · העולם החי" title="העולם" description="פותחים ישר את המציאות המחקרית שכבר קיימת במערכת, בוחרים נקודה ומתגלגלים ממנה לקשרים, מקורות, מחקר, רזיאל והיכל." status="LIVE"><WorldBody /></Sod2029Shell>;
}
