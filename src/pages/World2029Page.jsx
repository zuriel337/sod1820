import React, { useEffect, useMemo, useState } from "react";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import TopicConvergenceContent from "../components/research/TopicConvergenceContent.jsx";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { EXPERIENCE_SURFACE, resolveExperienceContext } from "../lib/experienceContext.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import {
  fetchExplorerFacetDetail,
  fetchExplorerFacetPage,
  explorerCardSelection,
} from "../lib/research/explorerFacets.js";
import {
  classifyWorldPresentationDensity,
  explainWorldRelation,
  filterWorldRelations,
  orderWorldRelations,
  worldProjectionCounts,
  worldRelationCounterpart,
  worldRelationFacets,
} from "../lib/research/world2029Presentation.js";
import { applySeo } from "../lib/seo.js";

const WORLD_EXPERIENCE = resolveExperienceContext({
  surface: EXPERIENCE_SURFACE.WORLD,
  locale: "he",
});

const WORLD_FACETS = [
  { key: "topic", title: "נקודות מפגש", kicker: "חיבורים", limit: 8 },
  { key: "number", title: "מספרים בעולם", kicker: "מספרים", limit: 10 },
  { key: "book", title: "ספרים ומקורות", kicker: "מקורות", limit: 6 },
  { key: "event", title: "אירועים", kicker: "זמן ומציאות", limit: 6 },
  { key: "phrase", title: "ביטויים", kicker: "שפה וביטוי", limit: 6 },
];

const FACET_LABELS = {
  topic: "חיבור",
  number: "מספר",
  book: "ספר",
  event: "אירוע",
  phrase: "ביטוי",
  entity: "ישות",
  image: "מדיה",
  media: "מדיה",
  convergence: "נקודת מפגש",
  post: "פוסט",
  year: "שנה",
  word: "מילה",
  foreign_word: "מילה לועזית",
  language_bridge: "גשר שפה",
};

const FACET_FILTER_LABELS = {
  number: "מספרים",
  phrase: "ביטויים",
  word: "מילים",
  book: "ספרים",
  event: "אירועים",
  image: "מדיה",
  media: "מדיה",
  convergence: "נקודות מפגש",
  entity: "ישויות",
  post: "פוסטים",
};

const VERIFICATION_LABELS = {
  match: "אומת מול החישוב",
  mismatch: "נמצאה אי־התאמה",
  method_unknown: "השיטה אינה זמינה לבדיקה",
  not_tested: "טרם נבדק",
};

const RELATION_LABELS = Object.freeze({
  equals: "שוויון",
  cross: "הצטלבות",
  related: "קשר",
  contains: "מכיל",
  mentions: "אזכור",
  converges_on: "נפגש כאן",
  cipher_link: "קשר לצופן",
  demand_signal: "אות ביקוש",
  scale_x10: "קשר של ×10",
  zero_scale: "קשר של שינוי קנה־מידה",
});

const SORT_LABELS = Object.freeze({
  recommended: "מומלץ כאן",
  newest: "חדש קודם",
  relation: "לפי סוג קשר",
  number_asc: "מספר עולה",
  number_desc: "מספר יורד",
});

function subjectKey(subject) {
  if (!subject?.id || !subject?.type) return null;
  return `${subject.type}:${subject.id}`;
}

function relationLabel(relationType) {
  return RELATION_LABELS[relationType] || "קשר נוסף";
}

function looksLikeFilename(value) {
  return /\.(?:jpe?g|png|webp|gif|svg|avif)$/i.test(String(value || "").trim());
}

function publicCounterpartLabel(counterpart) {
  if (!counterpart) return "קשר";
  if (["image", "media"].includes(counterpart.type) && looksLikeFilename(counterpart.label)) return "פריט מדיה";
  return counterpart.label || FACET_LABELS[counterpart.type] || "קשר";
}

function humanRelationReason(reason) {
  const match = /^קשר ישיר מסוג (.+) לעוגן הנוכחי$/.exec(String(reason || ""));
  return match ? `קשר ישיר: ${relationLabel(match[1])}` : reason;
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
    <section
      className="sod29-focus-stage sod29-world-native-entry"
      id="world-entry"
      data-experience-surface={WORLD_EXPERIENCE.surface}
      data-experience-question={WORLD_EXPERIENCE.experience.question}
      data-spatial-default={WORLD_EXPERIENCE.spatial.defaultLevel}
    >
      <div className="sod29-command-shell">
        <div className="sod29-command-copy">
          <div className="sod29-kicker">{WORLD_EXPERIENCE.brand.identity} · {WORLD_EXPERIENCE.experience.question}</div>
          <h2>העולם פתוח.<br />בחר נקודה וגלה מה מתחבר אליה.</h2>
          <div className="sod29-muted">מספרים, ביטויים, מקורות, אירועים וקשרים נפגשים כאן סביב דברים שכבר קיימים במערכת. אפשר להתחיל מנקודה שמסקרנת אותך, לחפש דבר חדש או לעבור מחיבור לחיבור בלי לאבד את המקום שממנו הגעת.</div>
          <div className="sod29-actions">
            <button className="sod29-action primary" type="button" onClick={() => shell.openCommand()}>⌘ חיפוש / פקודה</button>
            <button className="sod29-action" type="button" onClick={() => shell.openAttention()}>◉ מה השתנה</button>
          </div>
        </div>
        <div className="sod29-orbit-map" aria-hidden="true">
          <div className="sod29-orbit-center">{WORLD_EXPERIENCE.brand.canonicalLatinIdentity}</div>
          <span className="sod29-orbit-node n1">מספרים</span>
          <span className="sod29-orbit-node n2">מקורות</span>
          <span className="sod29-orbit-node n3">קשרים</span>
          <span className="sod29-orbit-node n4">אירועים</span>
        </div>
      </div>
    </section>

    {landing.loading ? <NativeStateSection><FrameState kind="loading" title="מחבר את העולם">קשרים, מקורות ונקודות נוספות נטענים עכשיו.</FrameState></NativeStateSection> : null}
    {landing.error ? <NativeStateSection><FrameState kind="error" title="חלק מהעולם אינו זמין כרגע">מה שהגיע בשלמותו נשאר גלוי; חומר שלא נטען אינו מוחלף במידע אחר.</FrameState></NativeStateSection> : null}
    {!landing.loading && !populatedSections.length ? <NativeStateSection><FrameState kind="empty" title="אין כרגע חומר זמין להצגה">העולם נשאר שקט כשאין חומר אמיתי. אפשר לנסות שוב או לפתוח נקודה דרך החיפוש.</FrameState></NativeStateSection> : null}

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

    {topicDetail.loading ? <NativeStateSection><FrameState kind="loading" title="פותח את החיבור">טוען את מה שנמצא סביב נקודת המפגש.</FrameState></NativeStateSection> : null}
    {topicDetail.error ? <NativeStateSection><FrameState kind="error" title="החיבור לא נטען כרגע">לא יוצג חומר חלופי במקום מה שביקשת לפתוח.</FrameState></NativeStateSection> : null}
    {topicDetail.finding ? <section className="sod29-section">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">מה מתחבר כאן</div>
          <h2>{topicDetail.finding.subject?.label || topicDetail.card?.label}</h2>
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

function AnchoredWorld({ research, shell, subject, context }) {
  const { isAdmin } = useAuth();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [deepening, setDeepening] = useState({ id: null, error: false });
  const [relationFilter, setRelationFilter] = useState("all");
  const [relationSort, setRelationSort] = useState("recommended");
  const [whyOpen, setWhyOpen] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const key = subjectKey(subject);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: null });
    setDeepening({ id: null, error: false });
    setRelationFilter("all");
    setRelationSort("recommended");
    setWhyOpen(null);
    fetchEntityHubProjection({ type: subject.type, key: subject.id, relationLimit: 80, researchLimit: 40, topicLimit: 10 })
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((error) => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [key, subject.id, subject.type]);

  useEffect(() => {
    if (!isAdmin) setAdminMode(false);
  }, [isAdmin]);

  const data = state.data;
  const counts = useMemo(() => worldProjectionCounts(data), [data]);
  const density = useMemo(() => classifyWorldPresentationDensity(data), [data]);
  const currentNodeId = data?.identity?.nodeId || null;
  const graphRelations = data?.graph?.relations || [];
  const relationFacets = useMemo(() => worldRelationFacets(graphRelations, currentNodeId), [graphRelations, currentNodeId]);
  const visibleRelations = useMemo(() => orderWorldRelations(
    filterWorldRelations(graphRelations, { currentNodeId, filter: relationFilter }),
    { currentNodeId, sort: relationSort }
  ), [graphRelations, currentNodeId, relationFilter, relationSort]);

  const researchFindings = data?.research?.findings || [];
  const adminSummary = useMemo(() => {
    const byAccess = {};
    const byGovernance = {};
    const byVerification = {};
    researchFindings.forEach((finding) => {
      const access = finding?.access?.tier || "לא צוין";
      const governance = finding?.status || "לא צוין";
      const verification = finding?.verification?.verification_state || "לא צוין";
      byAccess[access] = (byAccess[access] || 0) + 1;
      byGovernance[governance] = (byGovernance[governance] || 0) + 1;
      byVerification[verification] = (byVerification[verification] || 0) + 1;
    });
    return { byAccess, byGovernance, byVerification };
  }, [researchFindings]);

  const backToWorld = () => {
    research.clearResearchContext?.();
    research.updateResearchContext?.({ lens: "world" });
  };

  const inspectFinding = (finding) => {
    shell.openInspect({
      id: String(finding?.id || finding?.subject?.key || "finding"),
      type: finding?.subject?.type || "finding",
      label: finding?.statement || finding?.subject?.label || "ממצא מחקרי",
      href: "/world",
    });
  };

  const inspectSource = (source) => {
    shell.openInspect({
      id: String(source?.ref || source?.label || "source"),
      type: "source",
      label: source?.label || source?.ref || "מקור",
      href: "/world",
    });
  };

  const deepenRelation = async (finding) => {
    const relation = finding?.projection?.relations?.[0];
    const fromNodeId = relation?.fromNodeId ? String(relation.fromNodeId) : null;
    const toNodeId = relation?.toNodeId ? String(relation.toNodeId) : null;
    const targetNodeId = fromNodeId === String(currentNodeId || "") ? toNodeId : fromNodeId;
    if (!targetNodeId) return;

    setDeepening({ id: finding?.id || targetNodeId, error: false });
    try {
      const target = await fetchEntityHubProjection({ nodeId: targetNodeId, relationLimit: 1, researchLimit: 1, topicLimit: 1 });
      if (!target?.identity) throw new Error("target unavailable");
      research.setResearchContext?.({
        subject: {
          id: String(target.identity.label),
          type: target.identity.type,
          label: target.identity.label,
          href: "/world",
        },
        selection: { entityId: String(target.identity.nodeId), entityType: target.identity.type },
        lens: "world",
        dimensions: context?.dimensions || {},
        journey: context?.journey || null,
        returnTo: {
          href: "/world",
          label: data.identity.label,
          subject: context?.subject || subject,
          selection: context?.selection || null,
          lens: context?.lens || "world",
          dimensions: context?.dimensions || {},
          journey: context?.journey || null,
        },
      });
    } catch (_) {
      setDeepening({ id: null, error: true });
      return;
    }
    setDeepening({ id: null, error: false });
  };

  return <>
    <section className="sod29-section sod29-world-anchor-intro">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">{WORLD_EXPERIENCE.experience.question}</div>
          <h2>{subject.label || subject.id}</h2>
          <div className="sod29-muted">כאן אפשר לראות מה מתחבר לנקודה הזאת — קשרים, מקורות, אירועים, דברים שנמצאו וזמן. הסינון והמיון משנים רק את התצוגה; הם אינם משנים את האמת או את הקשרים עצמם.</div>
        </div>
        <button className="sod29-action" type="button" onClick={backToWorld}>◌ חזרה לעולם</button>
      </div>
    </section>

    {state.loading ? <NativeStateSection><FrameState kind="loading" title="אוסף את מה שמתחבר לכאן">הנקודה נשמרת בזמן שהחומר נטען.</FrameState></NativeStateSection> : null}
    {state.error ? <NativeStateSection><FrameState kind="error" title="לא הצלחנו לפתוח את הנקודה כרגע">לא מוצג חומר חלופי במקום המידע שלא נטען.</FrameState></NativeStateSection> : null}
    {!state.loading && !state.error && !data ? <NativeStateSection><FrameState kind="unavailable" title="אין חומר זמין לנקודה הזאת">המקום נשאר שמור ואפשר לחזור, לחפש או לבחור נקודה אחרת.</FrameState></NativeStateSection> : null}
    {deepening.error ? <NativeStateSection><FrameState kind="unavailable" title="החיבור קיים אך היעד לא נפתח כרגע">אפשר להמשיך לעיין כאן או לנסות שוב.</FrameState></NativeStateSection> : null}

    {data ? <div
      className="sod29-world-native-projection"
      data-world-density={density}
      data-experience-surface={WORLD_EXPERIENCE.surface}
      data-experience-question={WORLD_EXPERIENCE.experience.question}
      data-truth-safe={String(WORLD_EXPERIENCE.experience.truthSafe)}
    >
      <section className="sod29-section">
        <div className="sod29-section-head">
          <div><div className="sod29-kicker">מרכז העולם</div><h2>{data.identity.label}</h2></div>
          <div className="sod29-actions">
            <span className="sod29-chip">{FACET_LABELS[data.identity.type] || data.identity.type}</span>
            {isAdmin ? <button className={`sod29-action${adminMode ? " primary" : ""}`} type="button" aria-pressed={adminMode} onClick={() => setAdminMode((value) => !value)}>{adminMode ? "מצב מנהל פעיל" : "מצב מנהל"}</button> : null}
          </div>
        </div>
        <div className="sod29-world-stage">
          <div className="sod29-anchor-core"><div><div className="sod29-kicker">הנקודה שבמרכז</div><strong>{data.identity.label}</strong><small>{FACET_LABELS[data.identity.type] || data.identity.type}</small></div></div>
          <div className="sod29-orbit-metrics" aria-label="כמות חומר זמין לפי משפחה">
            <div className="sod29-card"><div className="sod29-stat">{counts.relations}</div><div className="sod29-stat-label">קשרים</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.findings}</div><div className="sod29-stat-label">מה מצאנו</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.sources}</div><div className="sod29-stat-label">מקורות</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.worlds}</div><div className="sod29-stat-label">משפחות תוכן</div></div>
            <div className="sod29-card"><div className="sod29-stat">{counts.timeline}</div><div className="sod29-stat-label">נקודות זמן</div></div>
          </div>
        </div>
      </section>

      {adminMode ? <section className="sod29-section" aria-label="מצב מנהל">
        <div className="sod29-section-head"><div><div className="sod29-kicker">מצב מנהל</div><h2>ראות ובקרה על מה שהשרת החזיר</h2></div></div>
        <FrameState title="הרשאות נשארות בשרת">מצב מנהל אינו עוקף הרשאות בדפדפן ואינו מסדר את העולם ידנית. הוא מציג בנפרד Access, Governance ו־Verification לחומר שהחשבון המנהל מורשה לקרוא.</FrameState>
        <div className="sod29-book-grid">
          <div className="sod29-card"><div className="sod29-kicker">גישה</div><h3>{Object.entries(adminSummary.byAccess).map(([name, count]) => `${name}: ${count}`).join(" · ") || "אין ממצאי מחקר"}</h3></div>
          <div className="sod29-card"><div className="sod29-kicker">ממשל</div><h3>{Object.entries(adminSummary.byGovernance).map(([name, count]) => `${name}: ${count}`).join(" · ") || "אין מצב ממשל להצגה"}</h3></div>
          <div className="sod29-card"><div className="sod29-kicker">אימות</div><h3>{Object.entries(adminSummary.byVerification).map(([name, count]) => `${name}: ${count}`).join(" · ") || "אין מצב אימות להצגה"}</h3></div>
        </div>
      </section> : null}

      {density === "sparse" ? <NativeStateSection><FrameState kind="empty" title="הנקודה קיימת, אבל סביבה מעט חומר כרגע">זהו מצב תקין. העולם נשאר שקט במקום להמציא קשרים, מקורות או דברים שלא נמצאו.</FrameState></NativeStateSection> : null}
      {data.research?.access?.available === false ? <NativeStateSection><FrameState kind="unavailable" title="חלק מהחומר אינו זמין בהרשאה הנוכחית">שאר החומר שנגיש ממשיך להופיע כרגיל.</FrameState></NativeStateSection> : null}

      {graphRelations.length ? <section className="sod29-section">
        <div className="sod29-section-head">
          <div><div className="sod29-kicker">קשרים</div><h2>מה מחובר לכאן</h2></div>
          <label className="sod29-chip">מיון&nbsp;
            <select aria-label="מיון קשרים" value={relationSort} onChange={(event) => setRelationSort(event.target.value)}>
              {Object.entries(SORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="sod29-actions" role="group" aria-label="סינון קשרים" style={{ marginBottom: 16 }}>
          <button className={`sod29-action${relationFilter === "all" ? " primary" : ""}`} type="button" aria-pressed={relationFilter === "all"} onClick={() => setRelationFilter("all")}>הכול · {graphRelations.length}</button>
          {relationFacets.map(({ type, count }) => <button key={type} className={`sod29-action${relationFilter === type ? " primary" : ""}`} type="button" aria-pressed={relationFilter === type} onClick={() => setRelationFilter(type)}>{FACET_FILTER_LABELS[type] || FACET_LABELS[type] || type} · {count}</button>)}
        </div>
        {!visibleRelations.length ? <FrameState kind="empty" title="אין קשרים במסנן הזה">הסינון משנה את התצוגה בלבד. אפשר לבחור סוג אחר או לחזור ל״הכול״.</FrameState> : null}
        <div className="sod29-list">{visibleRelations.slice(0, 18).map((finding, index) => {
          const relation = finding.projection?.relations?.[0];
          const counterpart = worldRelationCounterpart(finding, currentNodeId);
          const explanation = explainWorldRelation(finding, currentNodeId);
          const rowId = finding.id || relation?.id || String(index);
          const busy = deepening.id === rowId;
          const label = publicCounterpartLabel(counterpart);
          const exactAdminLabel = adminMode && counterpart?.label && label !== counterpart.label ? counterpart.label : null;
          return <div className="sod29-row" key={rowId} style={{ alignItems: "flex-start" }}>
            <div>
              <strong>{label}</strong>
              <small>{relationLabel(relation?.relationType)} · {FACET_LABELS[counterpart?.type] || counterpart?.type || "ישות"}</small>
              {exactAdminLabel ? <small>שם מקור למנהל: {exactAdminLabel}</small> : null}
              {adminMode && counterpart?.space && counterpart.space !== "core" ? <small>גישה בגרף: {counterpart.space}</small> : null}
              {whyOpen === rowId ? <div className="sod29-muted" style={{ marginTop: 8 }}>
                {explanation.reasons.map((reason) => <div key={reason}>• {humanRelationReason(reason)}</div>)}
                <div><b>{explanation.disclaimer}</b></div>
              </div> : null}
            </div>
            <div className="sod29-actions">
              <button className="sod29-action" type="button" aria-expanded={whyOpen === rowId} onClick={() => setWhyOpen((value) => value === rowId ? null : rowId)}>למה כאן?</button>
              <button className="sod29-action" type="button" disabled={busy} onClick={() => deepenRelation(finding)}>{busy ? "פותח…" : "העמק"}</button>
            </div>
          </div>;
        })}</div>
      </section> : null}

      {researchFindings.length ? <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">מה מצאנו</div><h2>דברים שנמצאו סביב הנקודה הזאת</h2></div></div>
        <div className="sod29-list">{researchFindings.slice(0, 12).map((finding, index) => {
          const verificationState = finding.verification?.verification_state || null;
          const verification = VERIFICATION_LABELS[verificationState] || "מצב אימות לא צוין";
          return <div className="sod29-row" key={finding.id || index}>
            <div>
              <strong>{finding.statement || finding.subject?.label || "נקודה לבדיקה"}</strong>
              <small>{verification}</small>
              {adminMode ? <div className="sod29-actions" style={{ marginTop: 6 }}>
                <span className="sod29-chip">גישה · {finding.access?.tier || "לא צוין"}</span>
                <span className="sod29-chip">ממשל · {finding.status || "לא צוין"}</span>
                <span className="sod29-chip">אימות · {verificationState || "לא צוין"}</span>
              </div> : null}
            </div>
            <button className="sod29-action" type="button" onClick={() => inspectFinding(finding)}>בדוק</button>
          </div>;
        })}</div>
      </section> : null}

      {data.topics?.findings?.length ? <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">נקודות מפגש</div><h2>חיבורים שנפגשים כאן</h2></div></div>
        <div className="sod29-list">{data.topics.findings.slice(0, 8).map((finding, index) => <div className="sod29-row" key={finding.id || index}><div><strong>{finding.subject?.label || "חיבור"}</strong><small>חיבור קשור לנקודה הזאת</small></div><button className="sod29-action" type="button" onClick={() => inspectFinding(finding)}>בדוק</button></div>)}</div>
      </section> : null}

      {data.sources?.length ? <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">מקורות</div><h2>מאיפה החומר מגיע</h2></div><button className="sod29-action" type="button" onClick={() => shell.go("/books")}>ספרים ומקורות</button></div>
        <div className="sod29-list">{data.sources.slice(0, 10).map((source, index) => <div className="sod29-row" key={`${source.ref || source.label}-${index}`}><div><strong>{source.label || source.ref || "מקור"}</strong><small>{source.type === "verse" ? "פסוק" : "מקור"}</small></div><button className="sod29-action" type="button" onClick={() => inspectSource(source)}>בדוק</button></div>)}</div>
      </section> : null}

      {data.numberWorlds?.length ? <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">משפחות תוכן</div><h2>עוד הקשרים סביב המספר</h2></div></div>
        <div className="sod29-book-grid">{data.numberWorlds.slice(0, 8).map((group) => <div className="sod29-card" key={group.world}><div className="sod29-kicker">{group.count} פריטים</div><h3>{group.world}</h3></div>)}</div>
      </section> : null}

      {data.timeline?.length ? <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">זמן</div><h2>ציר הזמן</h2></div></div>
        <div className="sod29-list">{data.timeline.slice(-8).map((item, index) => <div className="sod29-row" key={`${item.id || index}-${item.at || ""}`}><div><strong>{item.label || "נקודת זמן"}</strong><small>{item.at ? new Date(item.at).toLocaleDateString("he-IL") : "זמן לא ידוע"}</small></div></div>)}</div>
      </section> : null}
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
  return <AnchoredWorld research={research} shell={shell} subject={subject} context={context} />;
}

export default function World2029Page() {
  useEffect(() => {
    applySeo({
      title: `העולם · ${WORLD_EXPERIENCE.brand.canonicalLatinIdentity}`,
      description: "העולם של סוד 1820 — מספרים, ביטויים, מקורות, אירועים וקשרים שנפתחים מתוך נקודה שמסקרנת אותך.",
      path: "/world",
    });
  }, []);

  return (
    <Sod2029Shell
      surface={WORLD_EXPERIENCE.surface}
      symbol="◌"
      eyebrow={`${WORLD_EXPERIENCE.brand.identity} · ${WORLD_EXPERIENCE.experience.question}`}
      title="העולם"
      description="ראה מה מתחבר לנקודה שמסקרנת אותך — מספרים, ביטויים, מקורות, אירועים וקשרים. פתח חיבור, העמק בו וחזור בדיוק למקום שממנו יצאת."
      status="עולם · גילוי"
    >
      <WorldBody />
    </Sod2029Shell>
  );
}
