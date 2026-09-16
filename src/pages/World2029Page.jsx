import React, { useEffect, useMemo, useState } from "react";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import TopicConvergenceContent from "../components/research/TopicConvergenceContent.jsx";
import { usePalette } from "../lib/palette.js";
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

const FACET_ORDER = Object.freeze([
  "topic",
  "number",
  "book",
  "event",
  "phrase",
  "entity",
  "year",
  "word",
  "foreign_word",
  "language_bridge",
]);

const AVAILABLE_FACETS = FACET_ORDER
  .filter(key => EXPLORER_FACETS.some(facet => facet.key === key))
  .map(key => ({ key, ...(FACET_META[key] || { label: key, short: key, icon: "•", note: "" }) }));

function subjectKey(subject) {
  if (!subject?.id || !subject?.type) return null;
  return `${subject.type}:${subject.id}`;
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
    id: String(row.id || refId),
    facet: "topic",
    label: row.title || row.label || String(refId),
    sub: row.subtitle || row.description || "",
    refId: String(refId),
    rank: {
      score: Number.isFinite(score) ? score : 0,
      neutral: !Number.isFinite(score),
      evidenceQuality: Number.isFinite(score) ? score : null,
      signals: Number.isFinite(score) ? [{ axis: "evidence_quality", label: "מד התכנסות", value: score }] : [],
    },
  };
}

async function fetchAllTopicCards({ q = null, number = null, from = null, to = null } = {}) {
  const cards = [];
  const pageSize = 80;
  let offset = 0;
  let hasMore = false;

  for (let page = 0; page < 16; page += 1) {
    const result = await fetchExplorerFacetPage("topic", {
      q: q || null,
      number: number || null,
      from: from || null,
      to: to || null,
      limit: pageSize,
      offset,
    });
    const next = Array.isArray(result?.cards) ? result.cards : [];
    cards.push(...next);
    hasMore = Boolean(result?.hasMore);
    if (!hasMore || next.length === 0) break;
    offset += next.length;
  }

  return { cards, hasMore };
}

function FacetButton({ facet, active, count, onClick, compact = false }) {
  return (
    <button
      type="button"
      className={`world-facet-button${active ? " active" : ""}${compact ? " compact" : ""}`}
      onClick={onClick}
    >
      <span className="world-facet-icon">{facet.icon}</span>
      <span className="world-facet-label">{compact ? facet.short : facet.label}</span>
      {count != null ? <span className="world-facet-count">{Number(count).toLocaleString("he-IL")}</span> : null}
    </button>
  );
}

function WorldListRow({ card, onOpen }) {
  const meta = FACET_META[card.facet] || { label: card.facet, icon: "•" };
  const score = scoreOf(card);

  return (
    <button className="world-result-row" type="button" onClick={() => onOpen(card)}>
      <div className="world-result-icon">{meta.icon}</div>
      <div className="world-result-copy">
        <div className="world-result-meta">
          <span>{meta.label}</span>
          {score != null ? <span className="world-score-label">מד התכנסות {Math.round(score)}</span> : null}
        </div>
        <strong>{card.label}</strong>
        {card.sub ? <small>{card.sub}</small> : null}
      </div>
      <div className="world-result-tail">
        {score != null ? (
          <div className="world-score" aria-label={`מד התכנסות ${score}`}>
            <i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
          </div>
        ) : null}
        <span className="world-open-label">פתח</span>
      </div>
    </button>
  );
}

function WorldInspector({ inspector, onClose, research, shell, context }) {
  const palette = usePalette();
  const card = inspector.card;
  const finding = inspector.finding;
  const entityData = inspector.entityData;
  const isTopic = card?.facet === "topic";

  useEffect(() => {
    if (!inspector.open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = event => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [inspector.open, onClose]);

  if (!inspector.open || !card) return null;

  const score = finding?.evidence?.score ?? scoreOf(card);
  const topicNumbers = (finding?.projection?.anchors || [])
    .filter(anchor => anchor?.type === "number" && Number.isFinite(Number(anchor.value)))
    .map(anchor => Number(anchor.value));
  const researchRows = entityData?.research?.findings || entityData?.research?.rows || [];
  const relations = entityData?.graph?.relations || [];
  const sources = entityData?.sources || [];
  const timeline = entityData?.timeline || [];
  const relatedTopics = (entityData?.topics?.rows || []).map(topicCardFromRow).filter(Boolean);

  const activateCard = () => {
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
    onClose();
  };

  const activateNumber = value => {
    research.setResearchContext?.({
      subject: { id: String(value), type: "number", label: String(value), href: "/world" },
      selection: { entityId: String(value), entityType: "number" },
      lens: "world",
      returnTo: { href: "/world", label: card.label || "העולם" },
    });
    onClose();
  };

  return (
    <>
      <div className="world-inspector-backdrop" onMouseDown={onClose} />
      <aside className="world-inspector" aria-label={`פרטי ${card.label}`}>
        <header className="world-inspector-head">
          <div>
            <div className="world-kicker">{FACET_META[card.facet]?.label || card.facet}</div>
            <h2>{finding?.subject?.label || entityData?.identity?.label || card.label}</h2>
            {score != null ? <div className="world-inspector-score">מד התכנסות · {Math.round(Number(score))}</div> : null}
          </div>
          <button className="world-icon-button" type="button" onClick={onClose} aria-label="סגור">×</button>
        </header>

        <div className="world-inspector-scroll">
          {inspector.loading ? <div className="world-state">טוען את הנתונים החיים…</div> : null}
          {inspector.error ? <div className="world-state error">הפריט לא נטען במלואו כרגע.</div> : null}

          {!inspector.loading && isTopic && finding ? (
            <>
              {topicNumbers.length ? (
                <section className="world-inspector-block">
                  <div className="world-kicker">עוגנים במספר</div>
                  <div className="world-chip-row">
                    {topicNumbers.map(value => (
                      <button key={value} type="button" className="world-chip primary" onClick={() => activateNumber(value)}>
                        {value} · פתח בעולם
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              <section className="world-inspector-content">
                <TopicConvergenceContent finding={finding} palette={palette} />
              </section>
            </>
          ) : null}

          {!inspector.loading && !isTopic ? (
            <>
              {card.sub ? <p className="world-inspector-summary">{card.sub}</p> : null}

              <div className="world-inspector-actions">
                <button className="world-btn primary" type="button" onClick={activateCard}>פתח כעוגן בעולם</button>
                {card.facet === "book" ? <button className="world-btn" type="button" onClick={() => { onClose(); shell.go(`/books/${encodeURIComponent(card.refId)}`); }}>פתח את הספר</button> : null}
                <button className="world-btn" type="button" onClick={() => shell.openRaziel()}>✦ רזיאל</button>
                <button className="world-btn" type="button" onClick={() => { activateCard(); shell.go("/heichal"); }}>◇ היכל</button>
              </div>

              {entityData ? (
                <>
                  <section className="world-metric-grid compact">
                    <div><strong>{relations.length}</strong><span>קשרים</span></div>
                    <div><strong>{researchRows.length}</strong><span>ממצאים</span></div>
                    <div><strong>{sources.length}</strong><span>מקורות</span></div>
                    <div><strong>{timeline.length}</strong><span>זמן</span></div>
                  </section>

                  {relatedTopics.length ? (
                    <section className="world-inspector-block">
                      <div className="world-kicker">התכנסויות קשורות</div>
                      <div className="world-mini-list">
                        {relatedTopics.slice(0, 8).map(topic => (
                          <div key={topic.id} className="world-mini-item">
                            <strong>{topic.label}</strong>
                            <small>{topic.sub || "התכנסות מחקר"}</small>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {researchRows.length ? (
                    <section className="world-inspector-block">
                      <div className="world-kicker">מחקר חי</div>
                      <div className="world-mini-list">
                        {researchRows.slice(0, 10).map((row, index) => (
                          <div key={row.id || index} className="world-mini-item">
                            <strong>{row.statement || row.subject?.label || row.kind || "ממצא"}</strong>
                            <small>{row.stage || row.kind || "research"}</small>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {sources.length ? (
                    <section className="world-inspector-block">
                      <div className="world-kicker">מקורות</div>
                      <div className="world-mini-list">
                        {sources.slice(0, 10).map((source, index) => (
                          <div key={`${source.ref || source.label}-${index}`} className="world-mini-item">
                            <strong>{source.label || source.ref || "מקור"}</strong>
                            <small>{source.ref || "Source"}</small>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
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
        const result = await fetchAllTopicCards({
          q: query || null,
          number: numberFilter || null,
          from: fromFilter || null,
          to: toFilter || null,
        });
        setState({ loading: false, cards: result.cards, hasMore: result.hasMore, error: null });
        return;
      }

      const offset = append ? state.cards.length : 0;
      const result = await fetchExplorerFacetPage(activeFacet, {
        q: query || null,
        limit: 60,
        offset,
      });
      const next = Array.isArray(result?.cards) ? result.cards : [];
      setState(prev => ({
        loading: false,
        cards: append ? [...prev.cards, ...next] : next,
        hasMore: Boolean(result?.hasMore),
        error: null,
      }));
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error }));
    }
  };

  useEffect(() => {
    loadFacet({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFacet, query, numberFilter, fromFilter, toFilter]);

  const visibleCards = useMemo(() => {
    if (activeFacet !== "topic") return state.cards;
    if (strength === "90") return state.cards.filter(card => (scoreOf(card) || 0) >= 90);
    if (strength === "80") return state.cards.filter(card => (scoreOf(card) || 0) >= 80);
    if (strength === "unrated") return state.cards.filter(card => scoreOf(card) == null);
    return state.cards;
  }, [activeFacet, state.cards, strength]);

  const submitSearch = event => {
    event?.preventDefault?.();
    setQuery(searchDraft.trim());
  };

  const applyAdvanced = event => {
    event?.preventDefault?.();
    setNumberFilter(numberDraft.trim());
    setFromFilter(fromDraft.trim());
    setToFilter(toDraft.trim());
  };

  const clearAll = () => {
    setSearchDraft("");
    setQuery("");
    setNumberDraft("");
    setNumberFilter("");
    setFromDraft("");
    setFromFilter("");
    setToDraft("");
    setToFilter("");
    setStrength("all");
  };

  const hasFilters = Boolean(query || numberFilter || fromFilter || toFilter || strength !== "all");

  return (
    <div className="world-app">
      <section className="world-titlebar">
        <div>
          <div className="world-kicker">ONE REALITY · LIVE RESEARCH</div>
          <h1>העולם</h1>
          <p>כל מה שכבר חי ב־SOD1820 במקום אחד. מסננים, פותחים התכנסות, נכנסים לעוגן — וממשיכים מאותו Research Context.</p>
        </div>
        <div className="world-title-stats">
          <div><strong>{activeFacet === "topic" && !state.loading ? state.cards.length.toLocaleString("he-IL") : "חי"}</strong><span>{activeFacet === "topic" ? "התכנסויות שנקראו" : meta.short || meta.label}</span></div>
          <div><strong>1</strong><span>Reality Graph</span></div>
          <div><strong>1</strong><span>Research OS</span></div>
        </div>
      </section>

      <section className="world-control-panel">
        <form className="world-search" onSubmit={submitSearch}>
          <span className="world-search-icon">⌕</span>
          <input
            value={searchDraft}
            onChange={event => setSearchDraft(event.target.value)}
            placeholder={`חפש בתוך ${meta.label}`}
            aria-label={`חיפוש בתוך ${meta.label}`}
          />
          <button className="world-btn primary" type="submit">חפש</button>
        </form>

        <div className="world-mobile-facets" aria-label="סוגי מידע">
          {AVAILABLE_FACETS.map(facet => (
            <FacetButton
              key={facet.key}
              facet={facet}
              compact
              active={activeFacet === facet.key}
              count={activeFacet === facet.key && !state.loading ? state.cards.length : null}
              onClick={() => { setActiveFacet(facet.key); setStrength("all"); }}
            />
          ))}
        </div>

        {activeFacet === "topic" ? (
          <div className="world-topic-tools">
            <div className="world-chip-row">
              <button className={`world-chip${strength === "all" ? " active" : ""}`} type="button" onClick={() => setStrength("all")}>הכול</button>
              <button className={`world-chip${strength === "90" ? " active" : ""}`} type="button" onClick={() => setStrength("90")}>90+</button>
              <button className={`world-chip${strength === "80" ? " active" : ""}`} type="button" onClick={() => setStrength("80")}>80+</button>
              <button className={`world-chip${strength === "unrated" ? " active" : ""}`} type="button" onClick={() => setStrength("unrated")}>ללא מדד</button>
              <button className={`world-chip${advancedOpen ? " active" : ""}`} type="button" onClick={() => setAdvancedOpen(value => !value)}>סינון מתקדם</button>
              {hasFilters ? <button className="world-chip clear" type="button" onClick={clearAll}>נקה הכול</button> : null}
            </div>

            {advancedOpen ? (
              <form className="world-advanced" onSubmit={applyAdvanced}>
                <label><span>מספר</span><input inputMode="numeric" value={numberDraft} onChange={event => setNumberDraft(event.target.value)} placeholder="למשל 1820" /></label>
                <label><span>מתאריך</span><input type="date" value={fromDraft} onChange={event => setFromDraft(event.target.value)} /></label>
                <label><span>עד תאריך</span><input type="date" value={toDraft} onChange={event => setToDraft(event.target.value)} /></label>
                <button className="world-btn" type="submit">החל סינון</button>
              </form>
            ) : null}
          </div>
        ) : hasFilters ? (
          <div className="world-chip-row"><button className="world-chip clear" type="button" onClick={clearAll}>נקה חיפוש</button></div>
        ) : null}
      </section>

      <div className="world-workspace">
        <aside className="world-facet-rail">
          <div className="world-facet-rail-title">סינון עולם</div>
          {AVAILABLE_FACETS.map(facet => (
            <FacetButton
              key={facet.key}
              facet={facet}
              active={activeFacet === facet.key}
              count={activeFacet === facet.key && !state.loading ? state.cards.length : null}
              onClick={() => { setActiveFacet(facet.key); setStrength("all"); }}
            />
          ))}
        </aside>

        <section className="world-results-panel">
          <header className="world-results-head">
            <div>
              <div className="world-kicker">{activeFacet === "topic" ? "ALL CONVERGENCES" : "LIVE FACET"}</div>
              <h2>{meta.label}</h2>
              <p>{meta.note}</p>
            </div>
            <div className="world-results-count">
              <strong>{visibleCards.length.toLocaleString("he-IL")}</strong>
              <span>{activeFacet === "topic" ? "מוצגות" : "נטענו"}</span>
            </div>
          </header>

          {state.loading && !state.cards.length ? <div className="world-state">טוען נתונים חיים…</div> : null}
          {state.error ? <div className="world-state error">חלק מהנתונים לא נטענו כרגע.</div> : null}
          {!state.loading && !visibleCards.length ? <div className="world-state">לא נמצאו תוצאות בסינון הזה.</div> : null}

          <div className="world-result-list">
            {visibleCards.map(card => <WorldListRow key={`${card.facet}:${card.id}`} card={card} onOpen={onOpenCard} />)}
          </div>

          {state.loading && state.cards.length ? <div className="world-loading-more">טוען עוד…</div> : null}
          {activeFacet !== "topic" && state.hasMore && !state.loading ? (
            <button className="world-load-more" type="button" onClick={() => loadFacet({ append: true })}>עוד {meta.label}</button>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function AnchoredWorld({ research, shell, subject, onOpenCard }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const key = subjectKey(subject);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type: subject.type, key: subject.id, relationLimit: 100, researchLimit: 60, topicLimit: 18 })
      .then(data => alive && setState({ loading: false, data, error: null }))
      .catch(error => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [key, subject.id, subject.type]);

  const data = state.data;
  const relations = data?.graph?.relations || [];
  const researchRows = data?.research?.findings || data?.research?.rows || [];
  const sources = data?.sources || [];
  const timeline = data?.timeline || [];
  const topics = (data?.topics?.rows || []).map(topicCardFromRow).filter(Boolean);
  const methods = data?.gematria?.families || [];

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

  return (
    <div className="world-app anchored">
      <section className="world-anchor-head">
        <div className="world-anchor-title">
          <button className="world-back" type="button" onClick={backToWorld}>← העולם</button>
          <div className="world-kicker">RESEARCH ANCHOR</div>
          <h1>{data?.identity?.label || subject.label || subject.id}</h1>
          <p>{data?.identity?.description || `העולם סביב ${subject.label || subject.id}`}</p>
        </div>
        <div className="world-anchor-actions">
          <button className="world-btn" type="button" onClick={addRoot} disabled={!data?.identity?.nodeId}>＋ למחקר</button>
          <button className="world-btn" type="button" onClick={() => shell.openRaziel()}>✦ רזיאל</button>
          <button className="world-btn primary" type="button" onClick={() => shell.go("/heichal")}>◇ היכל</button>
        </div>
      </section>

      {state.loading ? <div className="world-state">טוען את העולם סביב העוגן…</div> : null}
      {state.error ? <div className="world-state error">לא הצלחנו לפתוח את העוגן כרגע.</div> : null}
      {!state.loading && !state.error && !data ? <div className="world-state">העוגן קיים, אבל עדיין אין לו עומק מחקר שמספיק להקרנה.</div> : null}

      {data ? (
        <>
          <section className="world-metric-grid">
            <div><strong>{relations.length}</strong><span>קשרים</span></div>
            <div><strong>{researchRows.length}</strong><span>ממצאים</span></div>
            <div><strong>{sources.length}</strong><span>מקורות</span></div>
            <div><strong>{topics.length}</strong><span>התכנסויות</span></div>
            <div><strong>{methods.length}</strong><span>שיטות</span></div>
            <div><strong>{timeline.length}</strong><span>זמן</span></div>
          </section>

          {methods.length ? (
            <section className="world-anchor-section compact-section">
              <header><div><div className="world-kicker">METHODS</div><h2>שיטות פעילות</h2></div></header>
              <div className="world-chip-row">
                {methods.slice(0, 18).map((method, index) => (
                  <span className="world-chip static" key={method.method || index}>{method.registry?.display_label || method.method || "שיטה"} · {method.count ?? method.phrases?.length ?? 0}</span>
                ))}
              </div>
            </section>
          ) : null}

          {topics.length ? (
            <section className="world-anchor-section">
              <header><div><div className="world-kicker">CONVERGENCES</div><h2>התכנסויות סביב העוגן</h2></div><span>{topics.length}</span></header>
              <div className="world-result-list">
                {topics.map(card => <WorldListRow key={card.id} card={card} onOpen={onOpenCard} />)}
              </div>
            </section>
          ) : null}

          <div className="world-anchor-columns">
            {researchRows.length ? (
              <section className="world-anchor-section">
                <header><div><div className="world-kicker">RESEARCH</div><h2>מחקר חי</h2></div><span>{researchRows.length}</span></header>
                <div className="world-mini-list">
                  {researchRows.slice(0, 16).map((row, index) => (
                    <div className="world-mini-item" key={row.id || index}>
                      <strong>{row.statement || row.subject?.label || row.kind || "ממצא"}</strong>
                      <small>{row.stage || row.kind || "research"}{row.verification?.verification_state ? ` · ${row.verification.verification_state}` : ""}</small>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {relations.length ? (
              <section className="world-anchor-section">
                <header><div><div className="world-kicker">RELATIONS</div><h2>קשרים</h2></div><span>{relations.length}</span></header>
                <div className="world-mini-list">
                  {relations.slice(0, 16).map((row, index) => (
                    <div className="world-mini-item" key={row.id || index}>
                      <strong>{row.subject?.label || row.projection?.relations?.[0]?.target || row.kind || "קשר"}</strong>
                      <small>{row.projection?.relations?.[0]?.type || row.projection?.relations?.[0]?.relation_type || row.kind || "relation"}</small>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {sources.length ? (
              <section className="world-anchor-section">
                <header><div><div className="world-kicker">SOURCES</div><h2>מקורות</h2></div><span>{sources.length}</span></header>
                <div className="world-mini-list">
                  {sources.slice(0, 16).map((source, index) => (
                    <div className="world-mini-item" key={`${source.ref || source.label}-${index}`}>
                      <strong>{source.label || source.ref || "מקור"}</strong>
                      <small>{source.ref || "Source"}</small>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {timeline.length ? (
              <section className="world-anchor-section">
                <header><div><div className="world-kicker">TIME</div><h2>ציר זמן</h2></div><span>{timeline.length}</span></header>
                <div className="world-mini-list">
                  {timeline.slice(-12).reverse().map((item, index) => (
                    <div className="world-mini-item" key={`${item.id || index}-${item.at || ""}`}>
                      <strong>{item.label || item.kind || "שינוי"}</strong>
                      <small>{item.at ? new Date(item.at).toLocaleDateString("he-IL") : "זמן לא ידוע"}</small>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function WorldBody() {
  const research = useResearch();
  const shell = use2029Shell();
  const context = research.context || null;
  const subject = context?.subject || null;
  const [inspector, setInspector] = useState({ open: false, loading: false, card: null, finding: null, entityData: null, error: null });

  useEffect(() => {
    research.updateResearchContext?.({ lens: "world" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeInspector = () => setInspector({ open: false, loading: false, card: null, finding: null, entityData: null, error: null });

  const openCard = async card => {
    if (!card) return;
    setInspector({ open: true, loading: true, card, finding: null, entityData: null, error: null });
    try {
      if (card.facet === "topic") {
        const finding = await fetchExplorerFacetDetail("topic", card);
        setInspector({ open: true, loading: false, card, finding, entityData: null, error: null });
        return;
      }
      const entityData = await fetchEntityHubProjection({
        type: card.facet,
        key: card.refId,
        relationLimit: 80,
        researchLimit: 40,
        topicLimit: 12,
      });
      setInspector({ open: true, loading: false, card, finding: null, entityData, error: null });
    } catch (error) {
      setInspector({ open: true, loading: false, card, finding: null, entityData: null, error });
    }
  };

  return (
    <>
      {subject ? (
        <AnchoredWorld research={research} shell={shell} subject={subject} onOpenCard={openCard} />
      ) : (
        <LiveWorldLanding onOpenCard={openCard} />
      )}
      <WorldInspector inspector={inspector} onClose={closeInspector} research={research} shell={shell} context={context} />
    </>
  );
}

export default function World2029Page() {
  useEffect(() => {
    applySeo({
      title: "העולם · SOD1820",
      description: "עולם המחקר החי של SOD1820 — התכנסויות, מספרים, מקורות, אירועים וביטויים מעל One Reality Graph.",
      path: "/world",
    });
  }, []);

  return (
    <Sod2029Shell
      wide
      surface="world"
      symbol="◌"
      eyebrow="ONE REALITY · LIVE WORLD"
      title="העולם"
      description="עולם מחקר חי מעל הנתונים הקנוניים של SOD1820."
    >
      <WorldBody />
    </Sod2029Shell>
  );
}
