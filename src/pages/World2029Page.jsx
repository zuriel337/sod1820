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
  buildWorldContextualProminence,
  classifyWorldPresentationDensity,
  explainWorldRelation,
  filterWorldRelations,
  orderWorldRelations,
  worldProjectionCounts,
  worldRelationCounterpart,
  worldRelationFacets,
} from "../lib/research/world2029Presentation.js";
import { fetchWorldProminenceInputs } from "../lib/research/worldProminenceInputs.js";
import { applySeo } from "../lib/seo.js";
import "./world2029-human.css";

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

const WORLD_LANES = Object.freeze([
  { key: "overview", label: "מבט כללי" },
  { key: "media", label: "תמונות" },
  { key: "calculations", label: "גימטריה" },
  { key: "sources", label: "מקורות" },
  { key: "relations", label: "קשרים" },
  { key: "research", label: "מחקר" },
  { key: "timeline", label: "זמן" },
]);

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
  const label = String(counterpart.label || "").trim();
  if (["image", "media"].includes(counterpart.type) && looksLikeFilename(label)) return "פריט מדיה";
  if (counterpart.type !== "foreign_word" && looksTechnicalResearchTitle(label)) {
    return FACET_LABELS[counterpart.type] || "חיבור";
  }
  return label || FACET_LABELS[counterpart.type] || "קשר";
}

function humanFacetLabel(type) {
  return FACET_FILTER_LABELS[type] || FACET_LABELS[type] || "אחר";
}

function humanRelationReason(reason) {
  const match = /^קשר ישיר מסוג (.+) לעוגן הנוכחי$/.exec(String(reason || ""));
  return match ? `קשר ישיר: ${relationLabel(match[1])}` : reason;
}

function looksTechnicalSource(value) {
  const text = String(value || "").trim();
  return !text
    || /^(?:chat|channel_updates|wa_bot_log|work_log|gallery(?:_images)?|posts?|book):/i.test(text)
    || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text)
    || /^\+?\d{8,}$/.test(text);
}

function humanSourceLabel(source) {
  const label = String(source?.label || "").trim();
  const ref = String(source?.ref || "").trim();
  if (source?.type === "verse" && label) return label;
  if (label && label !== ref && !looksTechnicalSource(label)) return label;
  if (/^https?:\/\//i.test(label || ref)) {
    try { return new URL(label || ref).hostname.replace(/^www\./, ""); } catch (_) { return "מקור חיצוני"; }
  }
  if (/^book:/i.test(ref || label)) return "ספר / מקור";
  if (/^posts?:/i.test(ref || label)) return "פוסט / מקור";
  return "מקור מחקר";
}

function looksTechnicalResearchTitle(value) {
  const text = String(value || "").trim();
  return /\b(?:DOSSIER|CHAIN|ENGINE|PROCEDURE|FAMILY|SYNTHESIS|UUID|CANONICAL)\b/i.test(text)
    || /[0-9a-f]{8}-[0-9a-f-]{27,}/i.test(text)
    || /\w+_\w+/.test(text);
}

function humanFindingPresentation(finding, anchorLabel) {
  const presentation = finding?.view?.rendererHints?.presentation || {};
  const projectedTitle = presentation.title || finding?.subject?.label || null;
  const fallbackMode = presentation.fallbackMode || finding?.projection?.dimensions?.presentation?.fallbackMode || null;
  const hideRawTechnical = fallbackMode === "raw_statement"
    && (looksTechnicalResearchTitle(projectedTitle) || /[A-Za-z]{3}/.test(String(projectedTitle || "")));
  return {
    title: hideRawTechnical ? `מחקר נוסף סביב ${anchorLabel || "הנקודה"}` : (projectedTitle || "נקודת מחקר"),
    summary: hideRawTechnical ? null : (presentation.summary || null),
    sourceLabel: presentation.sourceLabel || null,
    fallbackMode,
  };
}

function prominenceTypeLabel(item) {
  if (item?.explainWhy?.uncertainty) return "דורש בירור";
  if (item?.familyKey === "verse-source" || item?.type === "verse") return "פסוק";
  if (item?.kind === "research") return "מחקר";
  if (item?.kind === "topic" || item?.type === "convergence") return "נקודת מפגש";
  if (item?.kind === "source") return "מקור";
  return FACET_LABELS[item?.type] || "חיבור";
}

function humanProminenceLabel(item, anchorLabel) {
  const label = String(item?.label || "").trim();
  if (item?.kind === "research" && (looksTechnicalResearchTitle(label) || /[A-Za-z]{3}/.test(label))) {
    return `מחקר נוסף סביב ${anchorLabel || "הנקודה"}`;
  }
  if (item?.kind === "source") {
    return humanSourceLabel({ label, ref: item?.sourceRef, type: item?.type });
  }
  if (["image", "media"].includes(item?.type) && looksLikeFilename(label)) return "פריט מדיה";
  if (item?.type !== "foreign_word" && looksTechnicalResearchTitle(label)) return prominenceTypeLabel(item);
  return label || prominenceTypeLabel(item);
}

function prominenceWhyLines(item) {
  const why = item?.explainWhy || {};
  const lines = [];
  if (why.uncertainty) lines.push("יש כאן אי־התאמה או שאלה שיכולה לשנות את ההבנה.");
  if (String(why.directness || "").includes("direct")) lines.push("הקשר ישיר לעוגן הנוכחי.");
  if (why.researchStrengthSignals?.includes("engine_match")) lines.push("קיימת בדיקת מנוע תואמת.");
  if (why.researchStrengthSignals?.includes("provenance_present")) lines.push("יש מקור או provenance מתועד.");
  if (why.researchStrengthSignals?.includes("dependency_grouped_before_rank")) lines.push("פריטים תלויים קובצו לפני בחירת העיקר.");
  if (why.humanCuration?.tier === "gold") lines.push("סומן באוצרות האנושי כ־Gold; זהו אות אוצרות, לא דירוג אמת.");
  else if (why.humanCuration?.tier === "silver") lines.push("סומן באוצרות האנושי כ־Silver; זהו שובר שוויון בלבד.");
  if (why.informationGain === "adds_a_new_evidence_or_content_family_to_the_attention_bundle") lines.push("הפריט מוסיף סוג מידע נוסף לתמונה.");
  if (why.temporalRelevance?.occurredAt) lines.push(`זמן אירוע מתועד: ${new Date(why.temporalRelevance.occurredAt).toLocaleDateString("he-IL")}.`);
  return lines.length ? lines : ["הפריט נבחר בגלל הרלוונטיות שלו לנקודה הזאת."];
}

function worldGematriaRows(data) {
  const out = [];
  const seen = new Set();
  const lookupFindings = data?.lenses?.numberResearch?.universal_findings || [];
  for (const finding of lookupFindings) {
    if (finding?.view?.rendererHints?.role !== "number-lookup-row") continue;
    const phrase = String(finding?.subject?.label || "").trim();
    const method = String(finding?.source?.method || "").trim();
    const value = finding?.subject?.value;
    if (!phrase || !method || value == null) continue;
    const key = `${method}:${phrase}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: finding.id || key,
      phrase,
      method,
      value,
      verificationState: finding?.verification?.verification_state || null,
      methodGoverned: finding?.projection?.dimensions?.numberLookup?.methodGoverned ?? null,
    });
    if (out.length >= 10) break;
  }
  if (out.length) return out;

  for (const result of data?.methodBridge?.results || []) {
    const phrase = String(data?.identity?.label || "").trim();
    if (!phrase || result?.engineValue == null) continue;
    out.push({
      id: result?.finding?.id || `${result.methodKey}:${result.engineValue}`,
      phrase,
      method: result.displayLabel || result.methodKey || result.dbColumn || "שיטה",
      value: result.engineValue,
      verificationState: result.verificationState || null,
      methodGoverned: result.governed ?? null,
    });
    if (out.length >= 10) break;
  }
  return out;
}

function researchAddedDate(value) {
  if (!value) return "זמן הוספה לא ידוע";
  try { return new Date(value).toLocaleDateString("he-IL"); } catch (_) { return "זמן הוספה לא ידוע"; }
}

function humanTimelineLabel(item) {
  const label = String(item?.label || "").trim();
  if (/\.(?:jpe?g|png|webp|gif|svg|avif)(?:\s|—|$)/i.test(label)) return "פריט מדיה נוסף למחקר";
  if (looksTechnicalSource(label)) return "מקור מחקר נוסף";
  if (looksTechnicalResearchTitle(label)) return "חיבור מחקרי נוסף";
  const withoutTechnicalRelation = label.replace(/\s+—\s+[A-Za-z_]+\s+→\s+.+$/u, "").trim();
  return withoutTechnicalRelation || label || "נקודת מחקר";
}

function humanMediaLabel(item, anchorLabel) {
  const label = String(item?.label || "").replace(/^#+\s*/, "").trim();
  if (!label || looksLikeFilename(label) || /^עדכון\b/u.test(label) || looksTechnicalResearchTitle(label)) {
    return `תמונה סביב ${anchorLabel || "הנקודה"}`;
  }
  return label;
}

function mediaDate(item) {
  const value = item?.occurredAt || item?.createdAt || null;
  if (!value) return null;
  try { return new Date(value).toLocaleDateString("he-IL"); } catch (_) { return null; }
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
  const [state, setState] = useState({ loading: true, data: null, prominenceInputs: null, prominenceError: null, error: null });
  const [deepening, setDeepening] = useState({ id: null, error: false });
  const [relationFilter, setRelationFilter] = useState("all");
  const [relationSort, setRelationSort] = useState("recommended");
  const [whyOpen, setWhyOpen] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [activeLane, setActiveLane] = useState("overview");
  const key = subjectKey(subject);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, prominenceInputs: null, prominenceError: null, error: null });
    setDeepening({ id: null, error: false });
    setRelationFilter("all");
    setRelationSort("recommended");
    setWhyOpen(null);
    setActiveLane("overview");
    fetchEntityHubProjection({ type: subject.type, key: subject.id, relationLimit: 80, researchLimit: 40, topicLimit: 10 })
      .then(async (data) => {
        if (!alive) return;
        let prominenceInputs = null;
        let prominenceError = null;
        try {
          prominenceInputs = data ? await fetchWorldProminenceInputs(data) : null;
        } catch (error) {
          prominenceError = error;
        }
        if (alive) setState({ loading: false, data, prominenceInputs, prominenceError, error: null });
      })
      .catch((error) => alive && setState({ loading: false, data: null, prominenceInputs: null, prominenceError: null, error }));
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
  const prominence = useMemo(() => data
    ? buildWorldContextualProminence(data, state.prominenceInputs || {}, { limit: 7, timeAware: data.identity?.type === "event" })
    : null, [data, state.prominenceInputs]);
  const prominenceItems = prominence?.items || [];
  const gematriaRows = useMemo(() => worldGematriaRows(data), [data]);
  const sourceRows = data?.sources || [];
  const mediaItems = data?.media?.items || [];
  const anchorProfile = data?.anchorProfile?.finding?.projection?.dimensions?.legacyNumberAnchor || null;
  const laneCounts = {
    overview: prominenceItems.length,
    media: mediaItems.length,
    calculations: gematriaRows.length,
    sources: sourceRows.length,
    relations: graphRelations.length,
    research: researchFindings.length + (data?.topics?.findings?.length || 0) + (data?.numberWorlds?.length || 0),
    timeline: data?.timeline?.length || 0,
  };
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

  const openNumberPage = () => {
    if (data?.identity?.type !== "number") return;
    shell.go(`/number/${encodeURIComponent(data.identity.label)}`);
  };

  const inspectFinding = (finding) => {
    const presentation = humanFindingPresentation(finding, data?.identity?.label || subject.label || subject.id);
    shell.openInspect({
      id: String(finding?.id || finding?.subject?.key || "finding"),
      type: finding?.subject?.type || "finding",
      label: presentation.title,
      href: "/world",
    });
  };

  const inspectSource = (source) => {
    shell.openInspect({
      id: String(source?.ref || source?.label || "source"),
      type: source?.type === "verse" ? "verse" : "source",
      label: humanSourceLabel(source),
      href: "/world",
    });
  };

  const inspectProminenceItem = (item) => {
    shell.openInspect({
      id: String(item?.id || item?.sourceRef || item?.label || "world-item"),
      type: item?.type || item?.kind || "finding",
      label: humanProminenceLabel(item, data?.identity?.label || subject.label || subject.id),
      href: "/world",
    });
  };

  const inspectMedia = (item) => {
    shell.openInspect({
      id: String(item?.nodeId || item?.galleryImageId || "media"),
      type: "image",
      label: humanMediaLabel(item, data?.identity?.label || subject.label || subject.id),
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

      {anchorProfile ? <section className="sod29-section sod29-world-anchor-profile" aria-label={`פרופיל עוגן ${data.identity.label}`}>
        <div className="sod29-section-head">
          <div>
            <div className="sod29-kicker">פרופיל עוגן · אוצרות מחקרית מתפתחת</div>
            <h2>מה חשוב לדעת על {data.identity.label}</h2>
          </div>
          <button className="sod29-action" type="button" onClick={openNumberPage}>לדף המספר ←</button>
        </div>
        <div className="sod29-world-anchor-profile-grid">
          <div className="sod29-world-anchor-profile-main">
            {anchorProfile.category ? <span className="sod29-chip">{anchorProfile.category}</span> : null}
            {anchorProfile.fact ? <strong>{anchorProfile.fact}</strong> : <strong>עוגן מחקרי ל־{data.identity.label}</strong>}
            {anchorProfile.hint ? <p>{anchorProfile.hint}</p> : null}
          </div>
          <aside className="sod29-world-anchor-profile-note">
            <b>איך לקרוא את זה?</b>
            <p>זהו תיאור אוצרות מחקרי שמתעדכן עם העבודה. חישובי המנוע, המקורות והאימותים מוצגים בנפרד. דף המספר נשאר הבית הייעודי לחישוב ולביטוי; העולם מציג את ההקשר סביב המספר.</p>
          </aside>
        </div>
      </section> : null}

      <section className="sod29-section sod29-world-orientation" aria-label="התמצאות בעולם">
        <div className="sod29-section-head">
          <div>
            <div className="sod29-kicker">התמצאות</div>
            <h2>מה אתה רוצה לראות עכשיו?</h2>
          </div>
        </div>
        <div className="sod29-world-lanes" role="group" aria-label="בחירת שכבה בעולם">
          {WORLD_LANES.map((lane) => <button
            key={lane.key}
            className={`sod29-action sod29-world-lane${activeLane === lane.key ? " primary" : ""}`}
            type="button"
            aria-pressed={activeLane === lane.key}
            onClick={() => setActiveLane(lane.key)}
          >
            <span>{lane.label}</span>
            <small>{laneCounts[lane.key] || 0}</small>
          </button>)}
        </div>
        <div className="sod29-muted sod29-world-orientation-note">הבחירה משנה רק את מה שמוצג על המסך. היא לא משנה קשרים, דירוג אמת, אימות או מצב מחקר.</div>
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

      {activeLane === "overview" && state.prominenceError ? <NativeStateSection><FrameState kind="unavailable" title="העיקר עדיין לא זמין">שאר שכבות העולם ממשיכות להופיע. לא נבחר תחליף מלאכותי.</FrameState></NativeStateSection> : null}

      {activeLane === "overview" && prominenceItems.length ? <section className="sod29-section sod29-world-primary-section" aria-label={`העיקר סביב ${data.identity.label}`}>
        <div className="sod29-world-primary-head">
          <div>
            <div className="sod29-kicker">קודם מה שמשנה את התמונה</div>
            <h2>העיקר סביב {data.identity.label}</h2>
            <p>עד שבעה חיבורים שנבחרו בהקשר הזה אחרי סינון הרשאות וקיבוץ כפילויות ותלויות. הבולטות כאן היא רלוונטיות מחקרית — לא דירוג אמת.</p>
          </div>
          <span className="sod29-world-primary-count">{prominenceItems.length}</span>
        </div>
        <div className="sod29-world-primary-grid">
          {prominenceItems.map((item, index) => {
            const whyLines = prominenceWhyLines(item);
            const uncertainty = Boolean(item.explainWhy?.uncertainty);
            const tier = item.explainWhy?.humanCuration?.tier || null;
            return <article className={`sod29-world-primary-item${index === 0 ? " is-lead" : ""}${uncertainty ? " is-question" : ""}`} key={item.id}>
              <div className="sod29-world-primary-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
              <div className="sod29-world-primary-copy">
                <div className="sod29-world-primary-meta">
                  <span>{prominenceTypeLabel(item)}</span>
                  {tier ? <span>אוצרות · {tier === "gold" ? "זהב" : "כסף"}</span> : null}
                </div>
                <h3>{humanProminenceLabel(item, data.identity.label)}</h3>
                {item.summary ? <p>{item.summary}</p> : null}
                {whyOpen === `primary:${item.id}` ? <div className="sod29-world-why">
                  {whyLines.map((line) => <div key={line}>• {line}</div>)}
                  <div><b>סדר התצוגה כאן אינו דירוג אמת, אימות או קנוניות.</b></div>
                </div> : null}
              </div>
              <div className="sod29-actions sod29-world-primary-actions">
                <button className="sod29-action" type="button" aria-expanded={whyOpen === `primary:${item.id}`} onClick={() => setWhyOpen((value) => value === `primary:${item.id}` ? null : `primary:${item.id}`)}>למה כאן?</button>
                <button className="sod29-action" type="button" onClick={() => inspectProminenceItem(item)}>בדוק</button>
              </div>
            </article>;
          })}
        </div>
      </section> : null}

      {activeLane === "calculations" && gematriaRows.length ? <section className="sod29-section sod29-world-human-section">
        <div className="sod29-section-head">
          <div><div className="sod29-kicker">גימטריות וביטויים</div><h2>חישובים שנפתחים מהנקודה הזאת</h2></div>
        </div>
        <div className="sod29-world-gematria-list">
          {gematriaRows.map((row) => <div className="sod29-world-gematria-row" key={row.id}>
            <div className="sod29-world-gematria-expression"><strong>{row.phrase}</strong><small>{row.method}{row.methodGoverned === false ? " · שיטה היסטורית" : ""}</small></div>
            <div className="sod29-world-gematria-value" aria-label={`${row.phrase} בשיטת ${row.method} שווה ${row.value}`}><span>=</span><b>{row.value}</b></div>
            <span className="sod29-world-verification">{row.verificationState === "not_tested" ? "חישוב מנוע · אין טענה נפרדת לבדיקה" : (VERIFICATION_LABELS[row.verificationState] || "מצב אימות לא צוין")}</span>
          </div>)}
        </div>
      </section> : null}

      {activeLane === "sources" && sourceRows.length ? <section className="sod29-section sod29-world-human-section">
        <div className="sod29-section-head">
          <div><div className="sod29-kicker">פסוקים ומקורות</div><h2>מאיפה החומר מגיע</h2></div>
          <button className="sod29-action" type="button" onClick={() => shell.go("/books")}>ספרים ומקורות</button>
        </div>
        <div className="sod29-list">
          {sourceRows.slice(0, 12).map((source, index) => {
            const label = humanSourceLabel(source);
            const rawRef = source.ref || source.label || null;
            return <div className="sod29-row sod29-world-source-row" key={`${source.ref || source.label}-${index}`}>
              <div>
                <strong>{label}</strong>
                <small>{source.type === "verse" ? "פסוק · מקור טקסטואלי" : "מקור מחקר"}</small>
                {adminMode && rawRef && label !== rawRef ? <small>Trace · {rawRef}</small> : null}
              </div>
              <button className="sod29-action" type="button" onClick={() => inspectSource(source)}>בדוק</button>
            </div>;
          })}
        </div>
      </section> : null}

      {activeLane === "media" ? <section className="sod29-section sod29-world-media-section">
        <div className="sod29-section-head">
          <div>
            <div className="sod29-kicker">תמונות ומדיה</div>
            <h2>החומר החזותי שמחובר ל־{data.identity.label}</h2>
          </div>
          {data?.media?.totalEligible > mediaItems.length ? <span className="sod29-chip">מוצגות {mediaItems.length} מתוך {data.media.totalEligible}</span> : null}
        </div>
        {data?.media?.access?.available === false ? <FrameState kind="unavailable" title="המדיה אינה זמינה בהרשאה הנוכחית">שאר שכבות העולם נשארות זמינות.</FrameState> : null}
        {data?.media?.access?.available !== false && !mediaItems.length ? <FrameState kind="empty" title="אין כרגע תמונות מחוברות לנקודה הזאת">לא מוצגת תמונה חלופית אם אין ייצוג חזותי מחובר וגלוי.</FrameState> : null}
        {mediaItems.length ? <div className="sod29-world-media-grid">
          {mediaItems.map((item) => {
            const label = humanMediaLabel(item, data.identity.label);
            const date = mediaDate(item);
            return <article className="sod29-world-media-card" key={item.galleryImageId}>
              <div className="sod29-world-media-frame">
                <img src={item.thumbUrl || item.imageUrl} alt={label} loading="lazy" />
              </div>
              <div className="sod29-world-media-copy">
                <div className="sod29-world-primary-meta">
                  <span>{relationLabel(item.relationType)}</span>
                  {date ? <span>{date}</span> : null}
                </div>
                <h3>{label}</h3>
                <div className="sod29-muted">מוצג כאן בגלל קשר ישיר בגרף אל הנקודה הזאת; התמונה עצמה אינה הוכחה או דירוג אמת.</div>
                <div className="sod29-actions">
                  <button className="sod29-action" type="button" onClick={() => inspectMedia(item)}>בדוק</button>
                </div>
              </div>
            </article>;
          })}
        </div> : null}
      </section> : null}

      {activeLane === "relations" && graphRelations.length ? <section className="sod29-section">
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
          {relationFacets.map(({ type, count }) => <button key={type} className={`sod29-action${relationFilter === type ? " primary" : ""}`} type="button" aria-pressed={relationFilter === type} onClick={() => setRelationFilter(type)}>{humanFacetLabel(type)} · {count}</button>)}
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
              <small>{relationLabel(relation?.relationType)} · {humanFacetLabel(counterpart?.type)}</small>
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

      {activeLane === "research" && data.topics?.findings?.length ? <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">נקודות מפגש</div><h2>חיבורים שנפגשים כאן</h2></div></div>
        <div className="sod29-list">{data.topics.findings.slice(0, 8).map((finding, index) => <div className="sod29-row" key={finding.id || index}><div><strong>{finding.subject?.label || "חיבור"}</strong><small>חיבור קשור לנקודה הזאת</small></div><button className="sod29-action" type="button" onClick={() => inspectFinding(finding)}>בדוק</button></div>)}</div>
      </section> : null}

      {activeLane === "research" && data.numberWorlds?.length ? <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">משפחות תוכן</div><h2>עוד הקשרים סביב המספר</h2></div></div>
        <div className="sod29-book-grid">{data.numberWorlds.slice(0, 8).map((group) => <div className="sod29-card" key={group.world}><div className="sod29-kicker">{group.count} פריטים</div><h3>{group.world}</h3></div>)}</div>
      </section> : null}

      {activeLane === "research" && researchFindings.length ? <section className="sod29-section sod29-world-human-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">עוד מחקר</div><h2>דברים שנמצאו סביב הנקודה הזאת</h2></div></div>
        <div className="sod29-list">{researchFindings.slice(0, 12).map((finding, index) => {
          const verificationState = finding.verification?.verification_state || null;
          const verification = VERIFICATION_LABELS[verificationState] || "מצב אימות לא צוין";
          const presentation = humanFindingPresentation(finding, data.identity.label);
          return <div className="sod29-row sod29-world-research-row" key={finding.id || index}>
            <div>
              <strong>{presentation.title}</strong>
              {presentation.summary ? <p className="sod29-world-row-summary">{presentation.summary}</p> : null}
              <small>{verification}{presentation.sourceLabel ? ` · ${presentation.sourceLabel}` : ""}</small>
              {adminMode ? <div className="sod29-actions" style={{ marginTop: 6 }}>
                <span className="sod29-chip">גישה · {finding.access?.tier || "לא צוין"}</span>
                <span className="sod29-chip">ממשל · {finding.status || "לא צוין"}</span>
                <span className="sod29-chip">אימות · {verificationState || "לא צוין"}</span>
                {presentation.fallbackMode === "raw_statement" ? <span className="sod29-chip">Raw זמין ב־Trace</span> : null}
              </div> : null}
            </div>
            <button className="sod29-action" type="button" onClick={() => inspectFinding(finding)}>בדוק</button>
          </div>;
        })}</div>
      </section> : null}

      {activeLane === "timeline" && data.timeline?.length ? <section className="sod29-section sod29-world-human-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">זמן מחקר</div><h2>נוסף למחקר</h2></div></div>
        <div className="sod29-muted sod29-world-time-note">התאריכים כאן מציינים מתי החומר או הייצוג נכנסו למערכת. הם אינם מוצגים כזמן היסטורי של האירוע אלא אם מקור זמן ייעודי מציין זאת במפורש.</div>
        <div className="sod29-list">{data.timeline.slice(-8).map((item, index) => {
          const label = humanTimelineLabel(item);
          const rawLabel = String(item?.label || "").trim();
          return <div className="sod29-row" key={`${item.id || index}-${item.at || ""}`}><div><strong>{label}</strong><small>נוסף למחקר · {researchAddedDate(item.at)}</small>{adminMode && rawLabel && label !== rawLabel ? <small>Trace · {rawLabel}</small> : null}</div></div>;
        })}</div>
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
