import React, { useEffect, useMemo, useState } from "react";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import TopicConvergenceContent from "../components/research/TopicConvergenceContent.jsx";
import { usePalette } from "../lib/palette.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import {
  fetchExplorerFacetDetail,
  fetchExplorerFacetPage,
  explorerCardSelection,
} from "../lib/research/explorerFacets.js";
import {
  classifyWorldPresentationDensity,
  worldProjectionCounts,
} from "../lib/research/world2029Presentation.js";
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

function NativeStateSection({ children }) {
  return <section className="sod29-section sod29-world-state-section">{children}</section>;
}

function LiveWorldLanding({ research, shell, context }) {
  const palette = usePalette();
  const [landing, setLanding] = useState({ loading: true, sections: {}, error: null });
  const [topicDetail, setTopicDetail] = useState({ loading: false, card: null, finding: null, error: null });

  const load = async () => {
    setLanding((prev) => ({ ...prev, loading: true, error: null }));
    const settled = await Promise.allSettled(
      WORLD_FACETS.map((facet) => fetchExplorerFacetPage(facet.key, { limit: facet.limit, offset: 0 }))
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

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const topicNumbers = useMemo(() => (
    (topicDetail.finding?.projection?.anchors || [])
      .filter((anchor) => anchor?.type === "number" && Number.isFinite(Number(anchor.value)))
      .map((anchor) => Number(anchor.value))
  ), [topicDetail.finding]);

  const openTopicNumber = (value) => {
    research.setResearchContext?.({
      subject: { id: String(value), type: "number", label: String(value), href: "/world" },
      selection: { entityId: String(value), entityType: "number" },
      lens: "world",
      returnTo: { href: "/world", label: topicDetail.card?.label || "העולם" },
    });
  };

  const populatedSections = WORLD_FACETS.filter((facet) => (landing.sections[facet.key] || []).length > 0);

  return <>
    <section className="sod29-focus-stage sod29-world-native-entry" id="world-entry">
      <div className="sod29-command-shell">
        <div className="sod29-command-copy">
          <div className="sod29-kicker">WORLD · ONE REALITY</div>
          <h2>המציאות המחקרית פתוחה.<br />בחר נקודה והעמק.</h2>
          <div className="sod29-muted">World הוא projection של הנתונים וה־Findings שכבר קיימים ב־Research OS וב־Reality Graph. חיפוש/פקודה, רזיאל, כלים, Quick Inspect והאזור האישי מגיעים מאותו System Frame — לא ממערכות World נפרדות.</div>
          <div className="sod29-actions">
            <button className="sod29-action primary" type="button" onClick={() => shell.openCommand()}>⌘ חיפוש / פקודה</button>
            <button className="sod29-action" type="button" onClick={() => shell.openAttention()}>◉ מה דורש תשומת לב</button>
          </div>
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

    {landing.loading ? <NativeStateSection><FrameState kind="loading" title="טוען את העולם החי">קורא רק דרך ה־2029 read models הפעילים.</FrameState></NativeStateSection> : null}
    {landing.error ? <NativeStateSection><FrameState kind="error" title="חלק מהעולם אינו זמין כרגע">מה שנטען בהצלחה נשאר גלוי; אין fallback שקט ל־Legacy.</FrameState></NativeStateSection> : null}
    {!landing.loading && !populatedSections.length ? <NativeStateSection><FrameState kind="empty" title="אין כרגע חומר זמין להקרנה">World אינו ממלא את המסך בנתוני דמו. נסה שוב מאוחר יותר או פתח עוגן דרך Command.</FrameState></NativeStateSection> : null}

    {!landing.loading && populatedSections.map((facet) => {
      const cards = landing.sections[facet.key] || [];
      return <section className="sod29-section" key={facet.key}>
        <div className="sod29-section-head">
          <div><div className="sod29-kicker">{facet.kicker}</div><h2>{facet.title}</h2></div>
          {facet.key === "book" ? <button className="sod29-action" type="button" onClick={() => shell.go("/books")}>לכל הספרים</button> : null}
        </div>
        <div className="sod29-book-grid">
          {cards.map((card) => <WorldCard key={`${card.facet}:${card.id}`} card={card} onOpen={openCard} />)}
        </div>
      </section>;
    })}

    {topicDetail.loading ? <NativeStateSection><FrameState kind="loading" title="פותח מחקר מתוך המאגר">טוען את ה־Finding הקנוני של ההתכנסות.</FrameState></NativeStateSection> : null}
    {topicDetail.error ? <NativeStateSection><FrameState kind="error" title="המחקר לא נטען כרגע">ה־World אינו מחליף אותו בנתון אחר.</FrameState></NativeStateSection> : null}
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
        {topicNumbers.map((value) => <button key={value} className="sod29-action primary" type="button" onClick={() => openTopicNumber(value)}>פתח את {value} בעולם</button>)}
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
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((error) => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [key, subject.id, subject.type]);

  const data = state.data;
  const counts = useMemo(() => worldProjectionCounts(data), [data]);
  const density = useMemo(() => classifyWorldPresentationDensity(data), [data]);

  const backToWorld = () => {
    research.clearResearchContext?.();
    research.updateResearchContext?.({ lens: "world" });
  };

  return <>
    <section className="sod29-section sod29-world-anchor-intro">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">העולם סביב העוגן</div>
          <h2>{subject.label || subject.id}</h2>
          <div className="sod29-muted">World מציג רק חומר שה־read models המחקריים החזירו לעוגן. פעולות רוחב כמו Inspect, Raziel, Tools, Share ו־Workspace נשארות ב־System Frame.</div>
        </div>
        <button className="sod29-action" type="button" onClick={backToWorld}>◌ נקה עוגן</button>
      </div>
    </section>

    {state.loading ? <NativeStateSection><FrameState kind="loading" title="טוען קשרים, מחקר ומקורות">העוגן נשמר בזמן הטעינה.</FrameState></NativeStateSection> : null}
    {state.error ? <NativeStateSection><FrameState kind="error" title="לא הצלחנו לפתוח את העוגן כרגע">{String(state.error?.message || state.error)} · אין fallback ל־Legacy.</FrameState></NativeStateSection> : null}
    {!state.loading && !state.error && !data ? <NativeStateSection><FrameState kind="unavailable" title="אין projection זמין לעוגן הזה">העוגן נשאר ב־Research Context; אפשר לחזור, Inspect או להעמיק בכלי אחר דרך ה־Frame.</FrameState></NativeStateSection> : null}

    {data ? <div className="sod29-world-native-projection" data-world-density={density}>
      <section className="sod29-section">
        <div className="sod29-section-head">
          <div><div className="sod29-kicker">מרכז העולם</div><h2>{data.identity.label}</h2></div>
          <span className="sod29-chip">{FACET_LABELS[data.identity.type] || data.identity.type}</span>
        </div>
        <div className="sod29-world-stage">
          <div className="sod29-anchor-core"><div><div className="sod29-kicker">עוגן פעיל</div><strong>{data.identity.label}</strong><small>{FACET_LABELS[data.identity.type] || data.identity.type}</small></div></div>
          <div className="sod29-orbit-metrics" aria-label="כמות חומר זמין לפי משפחה">
            <div className="sod29-card"><div className="sod29-stat">{counts.relations}</div><div className="sod29-stat-label">קשרים</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.findings}</div><div className="sod29-stat-label">ממצאי מחקר</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.sources}</div><div className="sod29-stat-label">מקורות</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.worlds}</div><div className="sod29-stat-label">עדשות</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.timeline}</div><div className="sod29-stat-label">נקודות זמן</div></div>
          </div>
        </div>
      </section>

      {density === "sparse" ? <NativeStateSection><FrameState kind="empty" title="העוגן קיים, אבל סביבו מעט חומר כרגע">זהו מצב World תקין. המערכת לא ממציאה קשרים, מקורות או Findings כדי לגרום לעולם להיראות מלא.</FrameState></NativeStateSection> : null}

      {data.graph?.relations?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">קשרים</div><h2>מה מחובר לכאן</h2></div></div><div className="sod29-list">{data.graph.relations.slice(0, 14).map((finding, index) => {
        const relation = finding.projection?.relations?.[0];
        return <div className="sod29-row" key={finding.id || index}><div><strong>{relation?.target || finding.subject?.label || "קשר"}</strong><small>{relation?.relation_type || relation?.type || finding.kind || "קשר בגרף"}</small></div></div>;
      })}</div></section> : null}

      {data.research?.findings?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">מחקר חי</div><h2>ממצאים סביב העוגן</h2></div></div><div className="sod29-list">{data.research.findings.slice(0, 12).map((finding, index) => <div className="sod29-row" key={finding.id || index}><div><strong>{finding.statement || finding.subject?.label || finding.kind}</strong><small>{finding.stage || finding.kind || "מחקר"}{finding.verification?.verification_state ? ` · ${finding.verification.verification_state}` : ""}</small></div></div>)}</div></section> : null}

      {data.sources?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">מקורות</div><h2>מאיפה זה מגיע</h2></div><button className="sod29-action" type="button" onClick={() => shell.go("/books")}>ספרים ומקורות</button></div><div className="sod29-list">{data.sources.slice(0, 10).map((source, index) => <div className="sod29-row" key={`${source.ref || source.label}-${index}`}><div><strong>{source.label || source.ref || "מקור"}</strong><small>{source.ref || "מקור מחקרי"}</small></div></div>)}</div></section> : null}

      {data.timeline?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">זמן</div><h2>ציר הזמן</h2></div></div><div className="sod29-list">{data.timeline.slice(-8).map((item, index) => <div className="sod29-row" key={`${item.id || index}-${item.at || ""}`}><div><strong>{item.label || item.kind || "שינוי"}</strong><small>{item.at ? new Date(item.at).toLocaleDateString("he-IL") : "זמן לא ידוע"}</small></div></div>)}</div></section> : null}
    </div> : null}
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
  useEffect(() => {
    applySeo({
      title: "העולם · SOD1820",
      description: "World 2029 — projection חי של Reality Graph ו־Research OS עם System Frame משותף",
      path: "/world",
    });
  }, []);

  return (
    <Sod2029Shell
      surface="world"
      symbol="◌"
      eyebrow="SOD1820 · ONE WORLD"
      title="העולם"
      description="משטח 2029 ראשון בתוך System Frame אחד: זהויות, קשרים, מחקר ומקורות מתוך ה־read models הקנוניים — בלי Legacy presentation ובלי מערכת World מקבילה."
      status="2029 · NATIVE PREVIEW"
    >
      <WorldBody />
    </Sod2029Shell>
  );
}
