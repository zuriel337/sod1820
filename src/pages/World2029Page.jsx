import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import TopicConvergenceContent from "../components/research/TopicConvergenceContent.jsx";
import WorldAllResearchTable from "../components/research/WorldAllResearchTable.jsx";
import WorldConvergenceCatalog from "../components/research/WorldConvergenceCatalog.jsx";
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
  worldRelationCounterpart,
  worldRelationFacets,
} from "../lib/research/world2029Presentation.js";
import { fetchWorldProminenceInputs } from "../lib/research/worldProminenceInputs.js";
import {
  fetchWorldContributorLens,
  fetchWorldLandingContributorProjection,
} from "../lib/research/worldContributorLens.js";
import {
  fetchGoldenWorldJourney878,
  GOLDEN_WORLD_JOURNEY_878,
} from "../lib/research/worldJourneyProjection.js";
import { fetchCanonicalTopicConvergenceFinding, fetchTopicCreatorOptions } from "../lib/research/topicConvergence.js";
import { fetchWorldDiscoveryStream } from "../lib/research/worldDiscoveryStream.js";
import {
  WORLD_RESEARCH_ATTENTION,
  WORLD_RESEARCH_FILTER_DEFAULTS,
  buildWorldResearchControl,
  filterWorldResearchFindings,
} from "../lib/research/worldResearchControl.js";
import { canonicalResearchPublicLabel } from "../lib/presentation/canonicalPresentation.js";
import { fetchWorldAllResearchProjection } from "../lib/research/worldAllResearchProjection.js";
import { fetchWorldConvergenceCatalog } from "../lib/research/worldConvergenceCatalog.js";
import { applySeo } from "../lib/seo.js";
import "./world2029-human.css";

const WORLD_EXPERIENCE = resolveExperienceContext({
  surface: EXPERIENCE_SURFACE.WORLD,
  locale: "he",
});
const CONVERGENCE_LABEL = canonicalResearchPublicLabel("convergence");
const CONVERGENCES_LABEL = canonicalResearchPublicLabel("convergence", { plural: true });
const ALL_CONVERGENCES_PAGE_SIZE = 24;

const WORLD_FACETS = [
  { key: "topic", title: CONVERGENCES_LABEL, kicker: "מה מתכנס כאן", limit: 8 },
  { key: "number", title: "מספרים בעולם", kicker: "מספרים", limit: 10 },
  { key: "book", title: "ספרים ומקורות", kicker: "מקורות", limit: 6 },
  { key: "event", title: "אירועים", kicker: "זמן ומציאות", limit: 6 },
  { key: "phrase", title: "ביטויים", kicker: "שפה וביטוי", limit: 6 },
];

const WORLD_CORE_FACETS = Object.freeze({
  topic: { label: CONVERGENCES_LABEL, symbol: "✦" },
  number: { label: "מספרים", symbol: "123" },
  book: { label: "מקורות", symbol: "▤" },
  event: { label: "אירועים", symbol: "◷" },
  phrase: { label: "ביטויים", symbol: "א" },
});

const landingSectionId = (key) => `world-facet-${key}`;

const FACET_LABELS = {
  topic: CONVERGENCE_LABEL,
  number: "מספר",
  book: "ספר",
  event: "אירוע",
  phrase: "ביטוי",
  entity: "ישות",
  image: "מדיה",
  media: "מדיה",
  convergence: CONVERGENCE_LABEL,
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
  convergence: CONVERGENCES_LABEL,
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
  if (item?.kind === "topic" || item?.type === "convergence") return CONVERGENCE_LABEL;
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
    const lookup = finding?.projection?.dimensions?.numberLookup || {};
    out.push({
      id: finding.id || key,
      phrase,
      method,
      value,
      verificationState: finding?.verification?.verification_state || null,
      methodGoverned: lookup.methodGoverned ?? null,
      atomicOrComposite: lookup.atomicOrComposite || null,
      mathematicalFamily: lookup.mathematicalFamily || null,
      methodEvidenceClass: lookup.methodEvidenceClass || null,
    });
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
      atomicOrComposite: null,
      mathematicalFamily: null,
      methodEvidenceClass: null,
    });
  }
  return out;
}

function researchObjectIdFromFinding(finding) {
  return String(finding?.identity?.sourceIdentity?.researchObjectId || "");
}

function topicSlugFromFinding(finding) {
  return String(finding?.projection?.dimensions?.graph?.slug || "");
}

function contributionDisplay(row) {
  const claim = row?.gematria_claim || {};
  return {
    title: String(row?.title || claim.claim || row?.body || "תרומת מחקר").trim(),
    method: String(claim.method || "").trim() || null,
    value: Number.isFinite(Number(claim.value)) ? Number(claim.value) : null,
    status: row?.status || null,
    convergenceSlug: row?.convergence_slug || null,
  };
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

function WorldMeetingCard({ meeting, onOpen }) {
  return <button type="button" className="sod29-card sod29-card-button sod29-world-meeting-card" onClick={() => onOpen(meeting)}>
    <div className="sod29-world-meeting-card-top">
      <span className="sod29-kicker">{CONVERGENCE_LABEL}</span>
      {meeting?.value != null ? <b>{meeting.value}</b> : null}
    </div>
    <h3>{meeting?.title || CONVERGENCE_LABEL}</h3>
    {meeting?.summary ? <p>{meeting.summary}</p> : null}
    <div className="sod29-world-meeting-meta">
      <span>{meeting?.authorName || "חוקר"}</span>
      {meeting?.method ? <span>{meeting.method}</span> : null}
      {meeting?.groupSize ? <span>{meeting.groupSize} ביטויים</span> : null}
    </div>
    <div className="sod29-actions"><span className="sod29-chip">פתח {CONVERGENCE_LABEL} ←</span></div>
  </button>;
}

function NativeStateSection({ children }) {
  return <section className="sod29-section sod29-world-state-section">{children}</section>;
}

function WorldCoreMap({ sections, loading, onSearch, onOpenFacet }) {
  const activeFacets = WORLD_FACETS.filter((facet) => (sections?.[facet.key] || []).length > 0).slice(0, 5);
  return (
    <div className="sod29-world-core-map" aria-label="לב העולם">
      <span className="sod29-world-core-ring ring-a" aria-hidden="true" />
      <span className="sod29-world-core-ring ring-b" aria-hidden="true" />
      <button className="sod29-world-core-center" type="button" onClick={onSearch} aria-label="פתח חיפוש בעולם">
        <span>לב העולם</span>
        <strong>{WORLD_EXPERIENCE.brand.canonicalLatinIdentity}</strong>
        <small>{loading ? "מחבר שערים…" : activeFacets.length ? `${activeFacets.length} שערים פתוחים` : "פתח חיפוש"}</small>
      </button>
      {activeFacets.map((facet, index) => {
        const meta = WORLD_CORE_FACETS[facet.key] || { label: facet.title, symbol: "•" };
        const shown = sections?.[facet.key]?.length || 0;
        return <button
          key={facet.key}
          className={`sod29-world-core-node p${index + 1}`}
          type="button"
          aria-controls={landingSectionId(facet.key)}
          onClick={() => onOpenFacet(facet)}
        >
          <span className="sod29-world-core-symbol" aria-hidden="true">{meta.symbol}</span>
          <strong>{meta.label}</strong>
          <small>{shown} מוצגים</small>
        </button>;
      })}
      <div className="sod29-world-core-hint">בחר שער כדי לקפוץ ישר אליו</div>
    </div>
  );
}

function LiveWorldLanding({ research, shell, context }) {
  const palette = usePalette();
  const { isAdmin } = useAuth();
  const [landing, setLanding] = useState({
    loading: true,
    sections: {},
    contributors: null,
    discovery: null,
    journey: null,
    error: null,
    contributorError: null,
    discoveryError: null,
    journeyError: null,
  });
  const [writerFilter, setWriterFilter] = useState("all");
  const [discoveryCreator, setDiscoveryCreator] = useState("all");
  const [allQuery, setAllQuery] = useState("");
  const [allCreator, setAllCreator] = useState("all");
  const [allCreatorOptions, setAllCreatorOptions] = useState([]);
  const [allConvergences, setAllConvergences] = useState({
    loading: true, loadingMore: false, cards: [], hasMore: false, total: null, error: null,
  });
  const [topicDetail, setTopicDetail] = useState({ loading: false, card: null, finding: null, error: null });
  const [allResearchOpen, setAllResearchOpen] = useState(false);
  const [allResearchState, setAllResearchState] = useState({ enabled: false, loading: false, projection: null, error: null });
  const [convergenceCatalogState, setConvergenceCatalogState] = useState({ enabled: false, loading: false, projection: null, error: null });

  const load = async () => {
    setLanding((prev) => ({
      ...prev,
      loading: true,
      error: null,
      contributorError: null,
      discoveryError: null,
      journeyError: null,
    }));

    const contributorPromise = fetchWorldLandingContributorProjection();
    const [facetResults, extras] = await Promise.all([
      Promise.allSettled(
        WORLD_FACETS.map((facet) => fetchExplorerFacetPage(facet.key, { limit: facet.limit, offset: 0 }))
      ),
      Promise.allSettled([
        contributorPromise,
        contributorPromise.then((projection) => fetchWorldDiscoveryStream({ limit: 24, publicPeople: projection?.people || [] })),
        fetchGoldenWorldJourney878(),
      ]),
    ]);

    const sections = {};
    let firstError = null;
    facetResults.forEach((result, index) => {
      const key = WORLD_FACETS[index].key;
      if (result.status === "fulfilled") sections[key] = result.value?.cards || [];
      else if (!firstError) firstError = result.reason;
    });

    setLanding({
      loading: false,
      sections,
      contributors: extras[0]?.status === "fulfilled" ? extras[0].value : null,
      discovery: extras[1]?.status === "fulfilled" ? extras[1].value : null,
      journey: extras[2]?.status === "fulfilled" ? extras[2].value : null,
      error: firstError,
      contributorError: extras[0]?.status === "rejected" ? extras[0].reason : null,
      discoveryError: extras[1]?.status === "rejected" ? extras[1].reason : null,
      journeyError: extras[2]?.status === "rejected" ? extras[2].reason : null,
    });
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    if (!isAdmin) {
      setAllResearchOpen(false);
      setAllResearchState({ enabled: false, loading: false, projection: null, error: null });
      return () => { alive = false; };
    }
    if (!allResearchOpen) {
      setAllResearchState((prev) => ({ ...prev, enabled: false, loading: false, error: null }));
      return () => { alive = false; };
    }
    setAllResearchState((prev) => ({ ...prev, enabled: true, loading: true, error: null }));
    fetchWorldAllResearchProjection()
      .then((projection) => {
        if (alive) setAllResearchState({ enabled: true, loading: false, projection, error: null });
      })
      .catch((error) => {
        if (alive) setAllResearchState((prev) => ({ ...prev, enabled: true, loading: false, error }));
      });
    return () => { alive = false; };
  }, [isAdmin, allResearchOpen]);

  useEffect(() => {
    let alive = true;
    if (!isAdmin) {
      setConvergenceCatalogState({ enabled: false, loading: false, projection: null, error: null });
      return () => { alive = false; };
    }
    setConvergenceCatalogState({ enabled: true, loading: true, projection: null, error: null });
    fetchWorldConvergenceCatalog()
      .then((projection) => {
        if (alive) setConvergenceCatalogState({ enabled: true, loading: false, projection, error: null });
      })
      .catch((error) => {
        if (alive) setConvergenceCatalogState({ enabled: true, loading: false, projection: null, error });
      });
    return () => { alive = false; };
  }, [isAdmin]);

  useEffect(() => {
    let alive = true;
    fetchTopicCreatorOptions()
      .then((rows) => { if (alive) setAllCreatorOptions(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (alive) setAllCreatorOptions([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      setAllConvergences((prev) => ({ ...prev, loading: true, loadingMore: false, cards: [], error: null }));
      try {
        const result = await fetchExplorerFacetPage("topic", {
          q: allQuery.trim() || null,
          creator: allCreator === "all" ? null : allCreator,
          includeTotal: true,
          limit: ALL_CONVERGENCES_PAGE_SIZE,
          offset: 0,
        });
        if (!alive) return;
        setAllConvergences({
          loading: false,
          loadingMore: false,
          cards: result?.cards || [],
          hasMore: Boolean(result?.hasMore),
          total: result?.total != null && Number.isFinite(Number(result.total)) ? Number(result.total) : null,
          error: null,
        });
      } catch (error) {
        if (alive) setAllConvergences({ loading: false, loadingMore: false, cards: [], hasMore: false, total: null, error });
      }
    }, allQuery ? 260 : 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [allQuery, allCreator]);

  const loadMoreConvergences = async () => {
    if (allConvergences.loading || allConvergences.loadingMore || !allConvergences.hasMore) return;
    setAllConvergences((prev) => ({ ...prev, loadingMore: true, error: null }));
    try {
      const result = await fetchExplorerFacetPage("topic", {
        q: allQuery.trim() || null,
        creator: allCreator === "all" ? null : allCreator,
        includeTotal: true,
        limit: ALL_CONVERGENCES_PAGE_SIZE,
        offset: allConvergences.cards.length,
      });
      setAllConvergences((prev) => ({
        ...prev,
        loadingMore: false,
        cards: [...prev.cards, ...(result?.cards || [])],
        hasMore: Boolean(result?.hasMore),
        total: result?.total != null && Number.isFinite(Number(result.total)) ? Number(result.total) : prev.total,
      }));
    } catch (error) {
      setAllConvergences((prev) => ({ ...prev, loadingMore: false, error }));
    }
  };

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

  const openWriterMeeting = async (meeting) => {
    if (!meeting) return;
    if (meeting.kind === "topic" && meeting.slug) {
      const card = { label: meeting.title, facet: "topic", refId: meeting.slug };
      setTopicDetail({ loading: true, card, finding: null, error: null });
      try {
        const finding = await fetchCanonicalTopicConvergenceFinding(meeting.slug);
        if (!finding) throw new Error("meeting unavailable");
        setTopicDetail({ loading: false, card, finding, error: null });
      } catch (error) {
        setTopicDetail({ loading: false, card, finding: null, error });
      }
      return;
    }
    if (meeting.value == null) return;
    research.setResearchContext?.({
      subject: { id: String(meeting.value), type: "number", label: String(meeting.value), href: "/world" },
      selection: { entityId: String(meeting.value), entityType: "number" },
      lens: "world",
      returnTo: { href: "/world", label: meeting.authorName || "העולם" },
    });
  };

  const startJourney = (journey) => {
    const root = Number(journey?.rootValue);
    if (!Number.isSafeInteger(root)) return;
    research.addJourney?.({
      root,
      path: [{ type: "number", value: root }],
      world: "world",
      msg: journey.id,
    });
    research.setResearchContext?.({
      subject: { id: String(root), type: "number", label: String(root), href: "/world" },
      selection: { entityId: String(root), entityType: "number" },
      lens: "world",
      journey: { id: journey.id, kind: journey.kind || "golden", position: 0 },
      dimensions: {
        journeySource: "world-landing",
        journeyRoot: root,
        journeyVisitedValues: [root],
        journeyMeetingSlugs: [],
      },
      returnTo: { href: "/world", label: "העולם" },
    });
  };

  const resumeJourney = (savedJourney) => {
    const root = Number(savedJourney?.root);
    if (root !== GOLDEN_WORLD_JOURNEY_878.rootValue) return;
    const pathValues = (Array.isArray(savedJourney.path) ? savedJourney.path : [])
      .map((step) => Number(step?.value ?? step))
      .filter(Number.isSafeInteger);
    const visited = [...new Set([root, ...pathValues])];
    const current = visited[visited.length - 1] || root;
    research.setResearchContext?.({
      subject: { id: String(current), type: "number", label: String(current), href: "/world" },
      selection: { entityId: String(current), entityType: "number" },
      lens: "world",
      journey: {
        id: GOLDEN_WORLD_JOURNEY_878.id,
        kind: GOLDEN_WORLD_JOURNEY_878.kind,
        position: Math.max(0, visited.length - 1),
      },
      dimensions: {
        journeySource: "saved-research",
        journeyRoot: root,
        journeyVisitedValues: visited,
        journeyMeetingSlugs: [],
      },
      returnTo: { href: "/world", label: "העולם" },
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
  const selectedWriter = writerFilter === "all" ? null : landing.contributors?.bySlug?.[writerFilter] || null;
  const writerMeetings = selectedWriter ? selectedWriter.meetings || [] : landing.contributors?.meetings || [];
  const topicFacet = WORLD_FACETS.find((facet) => facet.key === "topic");
  const otherPopulatedSections = populatedSections.filter((facet) => facet.key !== "topic");
  const lastJourney = Array.isArray(research.journeys)
    ? research.journeys.find((journey) => Number(journey?.root) === GOLDEN_WORLD_JOURNEY_878.rootValue) || null
    : null;

  const discoveryItems = useMemo(() => {
    const items = Array.isArray(landing.discovery?.items) ? landing.discovery.items : [];
    if (discoveryCreator === "all") return items;
    return items.filter((item) => item.creator === discoveryCreator);
  }, [landing.discovery, discoveryCreator]);
  const discoveryCreators = Array.isArray(landing.discovery?.creators) ? landing.discovery.creators : [];
  const openDiscoveryItem = (item) => {
    if (!item?.slug) return;
    openCard({ id: item.id, facet: "topic", label: item.label, sub: item.summary, refId: item.slug });
  };
  const discoveryDate = (value) => {
    if (!value) return "זמן לא צוין";
    try { return new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "short" }); }
    catch (_) { return "זמן לא צוין"; }
  };

  const creatorLabel = (value) => {
    if (!value) return "מקור לא צוין";
    if (value === "ai") return "AI";
    if (value === "agent:sod1820") return "SOD1820 · Agent";
    return value;
  };

  const openLandingFacet = (facet) => {
    if (!facet?.key || typeof document === "undefined") return;
    const section = document.getElementById(landingSectionId(facet.key));
    if (!section) return;
    section.focus?.({ preventScroll: true });
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return <>
    <section
      className="sod29-focus-stage sod29-world-native-entry sod29-world-discovery-entrance"
      id="world-entry"
      data-experience-surface={WORLD_EXPERIENCE.surface}
      data-experience-question={WORLD_EXPERIENCE.experience.question}
      data-spatial-default={WORLD_EXPERIENCE.spatial.defaultLevel}
    >
      <div className="sod29-world-discovery-sky" aria-hidden="true" />
      <div className="sod29-world-discovery-head">
        <div>
          <div className="sod29-kicker">{WORLD_EXPERIENCE.brand.identity} · DISCOVERY WORLD</div>
          <h2>מה חדש בעולם?</h2>
          <p>כל ההתכנסויות הציבוריות האחרונות במקום אחד. מתחילים מהכול, ואז מסננים לפי מי שהביא את החומר.</p>
        </div>
        <div className="sod29-actions">
          <button className="sod29-action primary" type="button" onClick={() => shell.openCommand()}>⌘ חפש בעולם</button>
          <button className="sod29-action" type="button" onClick={() => shell.openAttention()}>◉ עכשיו</button>
        </div>
      </div>

      <div className="sod29-world-discovery-grid">
        <div className="sod29-world-live-stream">
          <div className="sod29-world-stream-filters" role="group" aria-label="סינון מה חדש בעולם לפי יוצר">
            <button type="button" className={`sod29-world-stream-filter${discoveryCreator === "all" ? " is-active" : ""}`} aria-pressed={discoveryCreator === "all"} onClick={() => setDiscoveryCreator("all")}>הכול</button>
            {discoveryCreators.map((creator) => <button
              type="button"
              key={creator}
              className={`sod29-world-stream-filter${discoveryCreator === creator ? " is-active" : ""}`}
              aria-pressed={discoveryCreator === creator}
              onClick={() => setDiscoveryCreator(creator)}
            >{creator}</button>)}
          </div>

          {landing.discoveryError ? <FrameState kind="unavailable" title="הזרם החי לא זמין כרגע">העולם עצמו נשאר פתוח. לא נחליף חידושים חסרים בחומר מומצא.</FrameState> : null}
          {!landing.loading && !landing.discoveryError && !discoveryItems.length ? <FrameState kind="empty" title="אין כרגע חידושים במסנן הזה">אפשר לחזור ל״הכול״ או לפתוח שער אחר בעולם.</FrameState> : null}

          {discoveryItems.length ? <div className="sod29-world-stream-list">
            {discoveryItems.slice(0, 12).map((item, index) => <button type="button" className={`sod29-world-stream-item${index === 0 ? " is-lead" : ""}`} key={item.id} onClick={() => openDiscoveryItem(item)}>
              <span className="sod29-world-stream-pulse" aria-hidden="true" />
              <div className="sod29-world-stream-copy">
                <div className="sod29-world-stream-meta">
                  <span>{CONVERGENCE_LABEL}</span>
                  <span>{item.creator}</span>
                  <span>{discoveryDate(item.at)}</span>
                </div>
                <strong>{item.label}</strong>
                {item.summary ? <small>{item.summary}</small> : null}
              </div>
              {Number.isFinite(item.value) ? <b>{item.value}</b> : <span className="sod29-world-stream-open">פתח ←</span>}
            </button>)}
          </div> : null}
          <div className="sod29-world-stream-truth-note">הזרם מציג חומר ציבורי מאושר לפי זמן אישור/יצירה. סדר חדש ≠ דירוג אמת.</div>
        </div>

        <div className="sod29-world-spatial-gateway">
          <div className="sod29-world-spatial-copy">
            <span className="sod29-kicker">לב העולם</span>
            <h3>לא רשימה — מרחב.</h3>
            <p>כל שער הוא projection של אותה מציאות: מספרים, מקורות, אירועים, ספרים והתכנסויות.</p>
          </div>
          <WorldCoreMap
            sections={landing.sections}
            loading={landing.loading}
            onSearch={() => shell.openCommand()}
            onOpenFacet={openLandingFacet}
          />
        </div>
      </div>
    </section>

    {landing.loading ? <NativeStateSection><FrameState kind="loading" title="מחבר את העולם">התכנסויות, חוקרים, מסעות, קשרים ומקורות נטענים עכשיו.</FrameState></NativeStateSection> : null}
    {landing.error ? <NativeStateSection><FrameState kind="error" title="חלק מהעולם אינו זמין כרגע">מה שהגיע בשלמותו נשאר גלוי; חומר שלא נטען אינו מוחלף במידע אחר.</FrameState></NativeStateSection> : null}
    {!landing.loading && !populatedSections.length ? <NativeStateSection><FrameState kind="empty" title="אין כרגע חומר זמין להצגה">העולם נשאר שקט כשאין חומר אמיתי. אפשר לנסות שוב או לפתוח נקודה דרך החיפוש.</FrameState></NativeStateSection> : null}

    <WorldConvergenceCatalog state={convergenceCatalogState} />

    {isAdmin ? <section className="sod29-section sod29-world-raw-research-gate" aria-label="חומר המחקר הגולמי">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">RAW RESEARCH · DRILL-DOWN</div>
          <h2>כל חומר המחקר</h2>
          <div className="sod29-muted">החומר המלא נשאר זמין לך, אבל אינו נטען אוטומטית. פתח אותו רק כשצריך לעבור מה-Rank Profile אל המקורות והשכבות הגולמיות.</div>
        </div>
        <button
          className={`sod29-action${allResearchOpen ? "" : " primary"}`}
          type="button"
          aria-expanded={allResearchOpen}
          onClick={() => setAllResearchOpen((open) => !open)}
        >{allResearchOpen ? "סגור חומר גלם" : "פתח את כל חומר המחקר"}</button>
      </div>
      {!allResearchOpen && allResearchState.projection ? <div className="sod29-muted">הנתונים שכבר נטענו נשמרו בזיכרון המסך; פתיחה מחדש תציג את שכבת ה-drill-down.</div> : null}
    </section> : null}

    {allResearchOpen ? <WorldAllResearchTable state={allResearchState} /> : null}

    <section className="sod29-section sod29-world-all-convergences" id="world-all-convergences" aria-label="כל ההתכנסויות">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">CANONICAL CONVERGENCE INDEX</div>
          <h2>כל ההתכנסויות</h2>
          <div className="sod29-muted">זהו הקטלוג המלא של ההתכנסויות הציבוריות. “מה חדש” מציג זמן; “בולטות” מציגה סדר גילוי; כאן אפשר להגיע לכל זהות קנונית. הסדר הוא סדר תצוגה בלבד — לא דירוג אמת.</div>
        </div>
        <span className="sod29-chip">
          {allConvergences.total != null ? `${allConvergences.cards.length} מתוך ${allConvergences.total}` : `${allConvergences.cards.length} נטענו`}
        </span>
      </div>

      <div className="sod29-world-catalog-controls">
        <label className="sod29-world-catalog-search">
          <span>חיפוש</span>
          <input value={allQuery} onChange={(e) => setAllQuery(e.target.value)} placeholder="חפש בכותרת או בתיאור…" aria-label="חיפוש בכל ההתכנסויות" />
        </label>
        <div className="sod29-world-catalog-creators" role="group" aria-label="סינון כל ההתכנסויות לפי יוצר">
          <button type="button" className={`sod29-world-stream-filter${allCreator === "all" ? " is-active" : ""}`} aria-pressed={allCreator === "all"} onClick={() => setAllCreator("all")}>הכול</button>
          {allCreatorOptions.map((creator) => <button
            type="button"
            key={creator}
            className={`sod29-world-stream-filter${allCreator === creator ? " is-active" : ""}`}
            aria-pressed={allCreator === creator}
            onClick={() => setAllCreator(creator)}
          >{creatorLabel(creator)}</button>)}
        </div>
      </div>

      {allConvergences.loading ? <FrameState kind="loading" title="טוען את כל ההתכנסויות">החיפוש והסינון מתבצעים מול אותו מקור ציבורי קנוני.</FrameState> : null}
      {allConvergences.error && !allConvergences.cards.length ? <FrameState kind="error" title="הקטלוג לא נטען כרגע">לא נחליף רשימה חסרה בחומר אחר.</FrameState> : null}
      {!allConvergences.loading && !allConvergences.cards.length && !allConvergences.error ? <FrameState kind="empty" title="לא נמצאו התכנסויות במסנן הזה">שנה את החיפוש או חזור ל״הכול״.</FrameState> : null}

      {allConvergences.cards.length ? <div className="sod29-world-catalog-grid">
        {allConvergences.cards.map((card) => <Link className="sod29-world-catalog-card" to={card.href} key={`all:${card.id}`}>
          <div className="sod29-world-catalog-meta">
            <span>{CONVERGENCE_LABEL}</span>
            {card.creator ? <span>{creatorLabel(card.creator)}</span> : null}
          </div>
          <strong>{card.label}</strong>
          {card.sub ? <p>{card.sub}</p> : null}
          {card.numbers?.length ? <div className="sod29-world-catalog-numbers">{card.numbers.slice(0, 5).map((n) => <span key={n}>{n}</span>)}</div> : null}
          <small>פתח התכנסות ←</small>
        </Link>)}
      </div> : null}

      {allConvergences.hasMore ? <div className="sod29-world-catalog-more">
        <button className="sod29-action primary" type="button" disabled={allConvergences.loadingMore} onClick={loadMoreConvergences}>
          {allConvergences.loadingMore ? "טוען עוד…" : "טען עוד התכנסויות"}
        </button>
      </div> : null}
      {allConvergences.error && allConvergences.cards.length ? <div className="sod29-muted sod29-world-catalog-error">טעינת העמוד הבא נכשלה. מה שכבר נטען נשאר גלוי.</div> : null}
    </section>

    {!landing.loading ? <section className="sod29-section sod29-world-people-section" aria-label="חוקרים וכתבים">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">מי מביא את החומר</div>
          <h2>חוקרים וכתבים</h2>
          <div className="sod29-muted">בחר אדם כדי לראות את ההתכנסויות שמיוחסות אליו. שאר העולם נשאר גלוי — אנחנו לא מסתירים מספרים, מקורות או חומר שאין לו attribution מוכח.</div>
        </div>
      </div>
      {landing.contributorError ? <FrameState kind="unavailable" title="שכבת החוקרים לא זמינה כרגע">העולם נשאר פתוח בלי לנחש זהות או שיוך.</FrameState> : null}
      {landing.contributors?.people?.length ? <div className="sod29-world-people-strip" role="group" aria-label="סינון התכנסויות לפי חוקר או כותב">
        <button type="button" className={`sod29-world-person-card${writerFilter === "all" ? " is-active" : ""}`} aria-pressed={writerFilter === "all"} onClick={() => setWriterFilter("all")}>
          <strong>הכול</strong><small>כל ההתכנסויות</small>
        </button>
        {landing.contributors.people.map((person) => <button
          type="button"
          key={person.slug}
          className={`sod29-world-person-card${writerFilter === person.slug ? " is-active" : ""}`}
          aria-pressed={writerFilter === person.slug}
          onClick={() => setWriterFilter(person.slug)}
        >
          <strong>{person.displayName}</strong>
          <small>{person.role || "חוקר / כותב"}</small>
          {person.meetingCount ? <span>{person.meetingCount} {CONVERGENCES_LABEL}</span> : <span>החומר שלו בעולם</span>}
        </button>)}
      </div> : null}
    </section> : null}

    {!landing.loading && topicFacet ? <section className="sod29-section sod29-world-facet-section sod29-world-meetings-section" id={landingSectionId("topic")} tabIndex={-1}>
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">מה נפגש כאן</div>
          <h2>{selectedWriter ? `${CONVERGENCES_LABEL} של ${selectedWriter.displayName}` : `${CONVERGENCES_LABEL} בולטות`}</h2>
          <div className="sod29-muted">התכנסות היא מקום שבו כמה ביטויים, מספרים, מקורות או שכבות מחקר מתכנסים סביב אותו עוגן. קשר הוא יחס נקודתי בין דברים; הצלבה היא תוצאה חישובית מסוג אחר; התכנסות היא התמונה המחקרית הרחבה.</div>
        </div>
      </div>
      {selectedWriter ? (
        writerMeetings.length ? <div className="sod29-book-grid">
          {writerMeetings.map((meeting) => <WorldMeetingCard key={meeting.id} meeting={meeting} onOpen={openWriterMeeting} />)}
        </div> : <FrameState kind="empty" title={`אין כרגע התכנסות ציבורית מיוחסת ל${selectedWriter.displayName}`}>החוקר נשאר זמין לסינון, אבל לא ננחש התכנסות שאין לה attribution ציבורי.</FrameState>
      ) : (
        (landing.sections.topic || []).length ? <div className="sod29-book-grid">
          {(landing.sections.topic || []).map((card) => <WorldCard key={`${card.facet}:${card.id}`} card={card} onOpen={openCard} />)}
        </div> : <FrameState kind="empty" title="אין כרגע התכנסויות זמינות">לא נוצרת התכנסות חלופית כשאין חומר אמיתי.</FrameState>
      )}
    </section> : null}

    {!landing.loading && (landing.journey || lastJourney || landing.journeyError) ? <section className="sod29-section sod29-world-journey-section" aria-label="מסעות בעולם">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">המסע הראשון של 2029</div>
          <h2>מסע 878</h2>
          <div className="sod29-muted">מסע הוא תנועה בתוך העולם: עוגן, התכנסות, שביל ותחנה. הוא לא קובע מסקנה; הוא שומר את הדרך שעברת ומראה לאן אפשר להמשיך.</div>
        </div>
        {lastJourney ? <button className="sod29-action" type="button" onClick={() => resumeJourney(lastJourney)}>המשך את מסע 878</button> : null}
      </div>
      {landing.journeyError ? <FrameState kind="unavailable" title="מסע 878 לא זמין כרגע">אפשר להמשיך דרך חיפוש, חוקר או התכנסות בלי להמציא מסלול חלופי.</FrameState> : null}
      {landing.journey ? <div className="sod29-world-journey-invitation">
        <div className="sod29-world-journey-number" aria-hidden="true">{landing.journey.rootValue}</div>
        <div className="sod29-world-journey-copy">
          <span className="sod29-kicker">Golden Journey · פתוח בבנייה</span>
          <h3>המסע מתחיל ב־{landing.journey.rootValue}</h3>
          <p>{landing.journey.subtitle}</p>
          <div className="sod29-world-journey-paths" aria-label="שבילים ממסע 878">
            {landing.journey.paths.map((path) => <div className="sod29-world-journey-path-preview" key={path.id}>
              <span>878</span><b aria-hidden="true">←</b><strong>{path.targetValue}</strong>
              <small>{path.meetingTitle}</small>
            </div>)}
          </div>
          <div className="sod29-muted sod29-world-journey-truth-note">{landing.journey.truthNote}</div>
        </div>
        <button className="sod29-action primary" type="button" onClick={() => startJourney(landing.journey)}>פתח 878 והתחל מסע</button>
      </div> : null}
    </section> : null}

    {!landing.loading && otherPopulatedSections.map((facet) => {
      const cards = landing.sections[facet.key] || [];
      return <section className="sod29-section sod29-world-facet-section" id={landingSectionId(facet.key)} tabIndex={-1} key={facet.key}>
        <div className="sod29-section-head">
          <div><div className="sod29-kicker">{facet.kicker}</div><h2>{facet.title}</h2></div>
          {facet.key === "book" ? <button className="sod29-action" type="button" onClick={() => shell.go("/books")}>לכל הספרים</button> : null}
        </div>
        <div className="sod29-book-grid">
          {cards.map((card) => <WorldCard key={`${card.facet}:${card.id}`} card={card} onOpen={openCard} />)}
        </div>
      </section>;
    })}

    {topicDetail.loading ? <NativeStateSection><FrameState kind="loading" title="פותח את ההתכנסות">טוען את מה שנמצא סביב ההתכנסות.</FrameState></NativeStateSection> : null}
    {topicDetail.error ? <NativeStateSection><FrameState kind="error" title="ההתכנסות לא נטענה כרגע">לא יוצג חומר חלופי במקום מה שביקשת לפתוח.</FrameState></NativeStateSection> : null}
    {topicDetail.finding ? <section className="sod29-section">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">מה נפגש כאן</div>
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
  const [adminView, setAdminView] = useState("research");
  const [researchFilters, setResearchFilters] = useState(() => ({ ...WORLD_RESEARCH_FILTER_DEFAULTS }));
  const [activeLane, setActiveLane] = useState("overview");
  const [contributorFilter, setContributorFilter] = useState("all");
  const [contributorLensState, setContributorLensState] = useState({ loading: false, data: null, error: null });
  const [gematriaMethodFilter, setGematriaMethodFilter] = useState("all");
  const [gematriaTypeFilter, setGematriaTypeFilter] = useState("all");
  const [gematriaQuery, setGematriaQuery] = useState("");
  const [journeyState, setJourneyState] = useState({ loading: false, data: null, error: null });
  const key = subjectKey(subject);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, prominenceInputs: null, prominenceError: null, error: null });
    setDeepening({ id: null, error: false });
    setRelationFilter("all");
    setRelationSort("recommended");
    setWhyOpen(null);
    setActiveLane("overview");
    setAdminView("research");
    setResearchFilters({ ...WORLD_RESEARCH_FILTER_DEFAULTS });
    setContributorFilter("all");
    setContributorLensState({ loading: false, data: null, error: null });
    setGematriaMethodFilter("all");
    setGematriaTypeFilter("all");
    setGematriaQuery("");
    fetchEntityHubProjection({ type: subject.type, key: subject.id, relationLimit: 80, researchLimit: 120, topicLimit: 40 })
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
    if (isAdmin) {
      setAdminMode(true);
      setAdminView("research");
      setResearchFilters({ ...WORLD_RESEARCH_FILTER_DEFAULTS });
      setContributorFilter("all");
      return;
    }
    if (!isAdmin) {
      setAdminMode(false);
      setAdminView("research");
      setResearchFilters({ ...WORLD_RESEARCH_FILTER_DEFAULTS });
      setContributorFilter("all");
    }
  }, [isAdmin]);

  const goldenJourneyRelevant = (
    (subject.type === "number" && Number(subject.id) === GOLDEN_WORLD_JOURNEY_878.rootValue)
    || context?.journey?.id === GOLDEN_WORLD_JOURNEY_878.id
  );

  useEffect(() => {
    if (!goldenJourneyRelevant) {
      setJourneyState({ loading: false, data: null, error: null });
      return undefined;
    }
    let alive = true;
    setJourneyState({ loading: true, data: null, error: null });
    fetchGoldenWorldJourney878()
      .then((journey) => {
        if (alive) setJourneyState({ loading: false, data: journey, error: null });
      })
      .catch((error) => {
        if (alive) setJourneyState({ loading: false, data: null, error });
      });
    return () => { alive = false; };
  }, [goldenJourneyRelevant, subject.id]);

  const data = state.data;

  useEffect(() => {
    if (!adminMode || !isAdmin || !data?.identity) return undefined;
    let alive = true;
    setContributorLensState({ loading: true, data: null, error: null });
    fetchWorldContributorLens({
      anchorType: data.identity.type,
      anchorLabel: data.identity.label,
      researchRows: data.research?.rows || [],
      topicRows: data.topics?.rows || [],
    }).then((lens) => {
      if (alive) setContributorLensState({ loading: false, data: lens, error: null });
    }).catch((error) => {
      if (alive) setContributorLensState({ loading: false, data: null, error });
    });
    return () => { alive = false; };
  }, [adminMode, isAdmin, data?.identity?.nodeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const density = useMemo(() => classifyWorldPresentationDensity(data), [data]);
  const currentNodeId = data?.identity?.nodeId || null;
  const graphRelations = data?.graph?.relations || [];
  const relationFacets = useMemo(() => worldRelationFacets(graphRelations, currentNodeId), [graphRelations, currentNodeId]);
  const visibleRelations = useMemo(() => orderWorldRelations(
    filterWorldRelations(graphRelations, { currentNodeId, filter: relationFilter }),
    { currentNodeId, sort: relationSort }
  ), [graphRelations, currentNodeId, relationFilter, relationSort]);

  const researchFindings = data?.research?.findings || [];
  const contributorLens = contributorLensState.data;
  const selectedContributor = contributorFilter === "all" ? null : contributorLens?.bySlug?.[contributorFilter] || null;
  const selectedResearchIds = useMemo(() => new Set(selectedContributor?.researchObjectIds || []), [selectedContributor]);
  const visibleResearchFindings = useMemo(() => selectedContributor
    ? researchFindings.filter((finding) => selectedResearchIds.has(researchObjectIdFromFinding(finding)))
    : researchFindings,
  [researchFindings, selectedContributor, selectedResearchIds]);
  const researchControl = useMemo(() => buildWorldResearchControl(visibleResearchFindings), [visibleResearchFindings]);
  const filteredResearchFindings = useMemo(
    () => filterWorldResearchFindings(visibleResearchFindings, researchFilters),
    [visibleResearchFindings, researchFilters],
  );
  const topicFindings = data?.topics?.findings || [];
  const selectedTopicSlugs = useMemo(() => new Set(selectedContributor?.topicSlugs || []), [selectedContributor]);
  const visibleTopicFindings = useMemo(() => selectedContributor
    ? topicFindings.filter((finding) => selectedTopicSlugs.has(topicSlugFromFinding(finding)))
    : topicFindings,
  [topicFindings, selectedContributor, selectedTopicSlugs]);
  const contributorConvergences = useMemo(() => {
    if (!contributorLens) return [];
    if (selectedContributor) return selectedContributor.convergences || [];
    return contributorLens.contributors.flatMap((row) => contributorLens.bySlug?.[row.slug]?.convergences || []);
  }, [contributorLens, selectedContributor]);
  const contributorContributions = useMemo(() => {
    if (!contributorLens) return [];
    if (selectedContributor) return selectedContributor.relevantContributions || [];
    return contributorLens.contributors.flatMap((row) => (contributorLens.bySlug?.[row.slug]?.relevantContributions || []).map((item) => ({ ...item, _contributorSlug: row.slug, _contributorName: row.displayName })));
  }, [contributorLens, selectedContributor]);
  const prominence = useMemo(() => data
    ? buildWorldContextualProminence(data, state.prominenceInputs || {}, { limit: 7, timeAware: data.identity?.type === "event" })
    : null, [data, state.prominenceInputs]);
  const prominenceItems = prominence?.items || [];
  const gematriaRows = useMemo(() => worldGematriaRows(data), [data]);
  const gematriaMethods = useMemo(() => [...new Set(gematriaRows.map((row) => row.method).filter(Boolean))], [gematriaRows]);
  const visibleGematriaRows = useMemo(() => {
    const q = gematriaQuery.trim().toLocaleLowerCase("he");
    return gematriaRows.filter((row) => {
      if (gematriaMethodFilter !== "all" && row.method !== gematriaMethodFilter) return false;
      if (gematriaTypeFilter !== "all" && row.atomicOrComposite !== gematriaTypeFilter) return false;
      if (q && !`${row.phrase} ${row.method} ${row.value}`.toLocaleLowerCase("he").includes(q)) return false;
      return true;
    });
  }, [gematriaRows, gematriaMethodFilter, gematriaTypeFilter, gematriaQuery]);
  const gematriaBounds = data?.lenses?.numberResearch?.bounds?.number_lookup || null;
  const sourceRows = data?.sources || [];
  const mediaItems = data?.media?.items || [];
  const anchorProfile = data?.anchorProfile?.finding?.projection?.dimensions?.legacyNumberAnchor || null;
  const goldenJourney = journeyState.data;
  const journeyIsActive = context?.journey?.id === GOLDEN_WORLD_JOURNEY_878.id;
  const currentJourneyValue = subject.type === "number" && Number.isSafeInteger(Number(subject.id)) ? Number(subject.id) : null;
  const savedGoldenJourney = useMemo(() => (
    Array.isArray(research.journeys)
      ? research.journeys.find((journey) => Number(journey?.root) === GOLDEN_WORLD_JOURNEY_878.rootValue) || null
      : null
  ), [research.journeys]);
  const journeyVisitedValues = useMemo(() => {
    const contextRaw = Array.isArray(context?.dimensions?.journeyVisitedValues) ? context.dimensions.journeyVisitedValues : [];
    const contextValues = contextRaw.map(Number).filter(Number.isSafeInteger);
    const savedValues = (Array.isArray(savedGoldenJourney?.path) ? savedGoldenJourney.path : [])
      .map((step) => Number(step?.value ?? step))
      .filter(Number.isSafeInteger);
    const values = savedValues.length > contextValues.length ? savedValues : contextValues;
    return [...new Set(values.length ? values : (journeyIsActive ? [GOLDEN_WORLD_JOURNEY_878.rootValue] : []))];
  }, [context?.dimensions?.journeyVisitedValues, journeyIsActive, savedGoldenJourney]);
  const journeyMeetingSlugs = useMemo(() => {
    const raw = Array.isArray(context?.dimensions?.journeyMeetingSlugs) ? context.dimensions.journeyMeetingSlugs : [];
    return [...new Set(raw.map((value) => String(value || "").trim()).filter(Boolean))];
  }, [context?.dimensions?.journeyMeetingSlugs]);
  const laneCounts = {
    overview: prominenceItems.length,
    media: mediaItems.length,
    calculations: visibleGematriaRows.length,
    sources: sourceRows.length,
    relations: graphRelations.length,
    research: (adminMode ? filteredResearchFindings.length : visibleResearchFindings.length) + visibleTopicFindings.length + contributorConvergences.length + contributorContributions.length + (data?.numberWorlds?.length || 0),
    timeline: data?.timeline?.length || 0,
  };
  const adminSummary = researchControl;
  const updateResearchFilter = (key, value) => setResearchFilters((current) => ({ ...current, [key]: value }));
  const resetResearchFilters = () => setResearchFilters({ ...WORLD_RESEARCH_FILTER_DEFAULTS });

  const backToWorld = () => {
    research.clearResearchContext?.();
    research.updateResearchContext?.({ lens: "world" });
  };

  const openNumberPage = () => {
    if (data?.identity?.type !== "number") return;
    shell.go(`/number/${encodeURIComponent(data.identity.label)}`);
  };

  const activateGoldenJourney = () => {
    if (!goldenJourney) return;
    const root = GOLDEN_WORLD_JOURNEY_878.rootValue;
    research.addJourney?.({
      root,
      path: [{ type: "number", value: root }],
      world: "world",
      msg: GOLDEN_WORLD_JOURNEY_878.id,
    });
    research.setResearchContext?.({
      subject: { id: String(root), type: "number", label: String(root), href: "/world" },
      selection: { entityId: String(root), entityType: "number" },
      lens: "world",
      journey: { id: GOLDEN_WORLD_JOURNEY_878.id, kind: GOLDEN_WORLD_JOURNEY_878.kind, position: 0 },
      dimensions: {
        ...(context?.dimensions || {}),
        journeySource: "world-golden-878",
        journeyRoot: root,
        journeyVisitedValues: [root],
        journeyMeetingSlugs: [],
      },
      returnTo: context?.subject ? {
        href: "/world",
        label: subject.label || subject.id,
        subject: context.subject,
        selection: context.selection || null,
        lens: context.lens || "world",
        dimensions: context.dimensions || {},
        journey: context.journey || null,
      } : { href: "/world", label: "העולם" },
    });
  };

  const followGoldenJourneyPath = (path) => {
    if (!goldenJourney || !path?.targetValue) return;
    const root = GOLDEN_WORLD_JOURNEY_878.rootValue;
    const target = Number(path.targetValue);
    if (!Number.isSafeInteger(target)) return;
    const baseVisited = journeyIsActive && journeyVisitedValues.length ? journeyVisitedValues : [root];
    const visited = [...new Set([...baseVisited, target])];
    const meetingSlugs = [...new Set([
      ...(journeyIsActive ? journeyMeetingSlugs : []),
      ...(path.meetingSlug ? [path.meetingSlug] : []),
    ])];

    research.addJourney?.({
      root,
      path: visited.map((value) => ({ type: "number", value })),
      world: "world",
      msg: GOLDEN_WORLD_JOURNEY_878.id,
    });
    research.setResearchContext?.({
      subject: { id: String(target), type: "number", label: String(target), href: "/world" },
      selection: { entityId: String(target), entityType: "number" },
      lens: "world",
      journey: {
        id: GOLDEN_WORLD_JOURNEY_878.id,
        kind: GOLDEN_WORLD_JOURNEY_878.kind,
        position: Math.max(0, visited.length - 1),
        findingId: path.meetingSlug || null,
      },
      dimensions: {
        ...(context?.dimensions || {}),
        journeySource: "world-golden-878",
        journeyRoot: root,
        journeyVisitedValues: visited,
        journeyMeetingSlugs: meetingSlugs,
      },
      returnTo: {
        href: "/world",
        label: subject.label || subject.id,
        subject: context?.subject || subject,
        selection: context?.selection || null,
        lens: context?.lens || "world",
        dimensions: context?.dimensions || {},
        journey: context?.journey || null,
      },
    });
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
          <div className="sod29-muted">כאן רואים מה מתחבר לנקודה הזאת. מתחילים במהות, ואז בוחרים את השכבה שרוצים לחקור — תמונות, גימטריה, מקורות, קשרים, מחקר או זמן.</div>
        </div>
        <div className="sod29-actions">
          {data?.identity ? <span className="sod29-chip">{FACET_LABELS[data.identity.type] || data.identity.type}</span> : null}
          {isAdmin && data ? <button className={`sod29-action${adminMode ? " primary" : ""}`} type="button" aria-pressed={adminMode} onClick={() => setAdminMode((value) => !value)}>{adminMode ? "מצב מנהל פעיל" : "מצב מנהל"}</button> : null}
          <button className="sod29-action" type="button" onClick={backToWorld}>◌ חזרה לעולם</button>
        </div>
      </div>
    </section>

    {state.loading ? <NativeStateSection><FrameState kind="loading" title="אוסף את מה שמתחבר לכאן">הנקודה נשמרת בזמן שהחומר נטען.</FrameState></NativeStateSection> : null}
    {state.error ? <NativeStateSection><FrameState kind="error" title="לא הצלחנו לפתוח את הנקודה כרגע">לא מוצג חומר חלופי במקום המידע שלא נטען.</FrameState></NativeStateSection> : null}
    {!state.loading && !state.error && !data ? <NativeStateSection><FrameState kind="unavailable" title="אין חומר זמין לנקודה הזאת">המקום נשאר שמור ואפשר לחזור, לחפש או לבחור נקודה אחרת.</FrameState></NativeStateSection> : null}
    {deepening.error ? <NativeStateSection><FrameState kind="unavailable" title="החיבור קיים אך היעד לא נפתח כרגע">אפשר להמשיך לעיין כאן או לנסות שוב.</FrameState></NativeStateSection> : null}

    {journeyState.loading ? <NativeStateSection><FrameState kind="loading" title="פותח את מסע 878">מחבר את העוגן להתכנסויות הציבוריות שלו.</FrameState></NativeStateSection> : null}
    {journeyState.error ? <NativeStateSection><FrameState kind="unavailable" title="מסע 878 לא זמין כרגע">העולם עצמו נשאר פתוח. לא נוצר מסלול חלופי ללא מקור.</FrameState></NativeStateSection> : null}
    {goldenJourney ? <section className="sod29-section sod29-world-journey-rail" aria-label="מסע 878">
      <div className="sod29-world-journey-rail-head">
        <div>
          <div className="sod29-kicker">Golden Journey · 878</div>
          <h2>{journeyIsActive ? "אתה בתוך מסע 878" : "מסע 878"}</h2>
          <p>878 הוא העוגן. כל שביל למטה מגיע מהתכנסות ציבורית קיימת שמכילה את 878 ומצביעה גם למספר נוסף.</p>
        </div>
        {!journeyIsActive
          ? <button className="sod29-action primary" type="button" onClick={activateGoldenJourney}>התחל ב־878</button>
          : <span className="sod29-chip">תחנה {Math.max(1, Number(context?.journey?.position || 0) + 1)}</span>}
      </div>

      <div className="sod29-world-journey-track" aria-label="התחנות שעברת">
        {(journeyVisitedValues.length ? journeyVisitedValues : [GOLDEN_WORLD_JOURNEY_878.rootValue]).map((value, index) => <React.Fragment key={value}>
          {index > 0 ? <span className="sod29-world-journey-track-line" aria-hidden="true" /> : null}
          <button
            type="button"
            className={`sod29-world-journey-track-stop${currentJourneyValue === value ? " is-current" : ""}`}
            onClick={() => {
              if (value === GOLDEN_WORLD_JOURNEY_878.rootValue) activateGoldenJourney();
              else followGoldenJourneyPath(goldenJourney.paths.find((path) => path.targetValue === value) || { targetValue: value });
            }}
          >
            <strong>{value}</strong>
            <small>{index === 0 ? "עוגן" : "תחנה"}</small>
          </button>
        </React.Fragment>)}
      </div>

      <div className="sod29-world-journey-path-grid">
        {goldenJourney.paths.map((path) => {
          const visited = journeyVisitedValues.includes(path.targetValue);
          const current = currentJourneyValue === path.targetValue;
          return <button
            type="button"
            className={`sod29-world-journey-path-card${current ? " is-current" : ""}${visited ? " is-visited" : ""}`}
            key={path.id}
            onClick={() => followGoldenJourneyPath(path)}
          >
            <span className="sod29-kicker">{visited ? "תחנה שנפתחה" : "שביל"}</span>
            <div className="sod29-world-journey-path-values"><b>878</b><span aria-hidden="true">←</span><strong>{path.targetValue}</strong></div>
            <h3>{path.meetingTitle}</h3>
            {path.meetingSubtitle ? <p>{path.meetingSubtitle}</p> : null}
            <small>המסלול מוצע לפי התכנסות קיימת; סדר ההצגה אינו דירוג אמת.</small>
          </button>;
        })}
      </div>
    </section> : null}

    {data ? <div
      className="sod29-world-native-projection"
      data-world-density={density}
      data-experience-surface={WORLD_EXPERIENCE.surface}
      data-experience-question={WORLD_EXPERIENCE.experience.question}
      data-truth-safe={String(WORLD_EXPERIENCE.experience.truthSafe)}
    >
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

      {adminMode ? <section className="sod29-section sod29-world-research-control" aria-label="מצב מחקר וממשל">
        <div className="sod29-section-head">
          <div>
            <div className="sod29-kicker">WORLD RESEARCH CONTROL</div>
            <h2>{adminView === "research" ? "מצב מחקר" : "מצב ממשל"}</h2>
            <p className="sod29-muted">אותו עולם, אותה מציאות. המצב הזה חושף רק צירים שה־owners החיים כבר מחזיקים; הוא לא ממציא Processing או Publication state.</p>
          </div>
          <div className="sod29-actions" role="group" aria-label="מצב עבודה בעולם">
            <button className={`sod29-action${adminView === "research" ? " primary" : ""}`} type="button" aria-pressed={adminView === "research"} onClick={() => setAdminView("research")}>מחקר</button>
            <button className={`sod29-action${adminView === "govern" ? " primary" : ""}`} type="button" aria-pressed={adminView === "govern"} onClick={() => setAdminView("govern")}>ממשל</button>
          </div>
        </div>

        <FrameState title="הרשאות נשארות בשרת">מצב מנהל אינו עוקף הרשאות בדפדפן. World מציג רק חומר שהחשבון הנוכחי מורשה לקרוא. Access, Governance, Verification ו־Kind נשארים צירים נפרדים; מצב מחקר אינו עוקף RLS ואינו מפרסם דבר.</FrameState>

        {adminView === "research" ? <>
          <div className="sod29-world-research-inbox">
            <div>
              <div className="sod29-kicker">RESEARCH INBOX</div>
              <h3>מה דורש תשומת לב סביב {data.identity.label}</h3>
            </div>
            <div className="sod29-world-attention-buttons" role="group" aria-label="סינון לפי תשומת לב מחקרית">
              {Object.entries(WORLD_RESEARCH_ATTENTION).map(([key, item]) => <button
                key={key}
                type="button"
                className={`sod29-action${researchFilters.attention === key ? " primary" : ""}`}
                aria-pressed={researchFilters.attention === key}
                onClick={() => updateResearchFilter("attention", key)}
              >{item.label}<small>{adminSummary.attention[key] || 0}</small></button>)}
            </div>
          </div>

          <div className="sod29-world-research-filters">
            <label><span>סוג חומר</span><select value={researchFilters.kind} onChange={(event) => updateResearchFilter("kind", event.target.value)}>
              <option value="all">כל הסוגים · {adminSummary.total}</option>
              {Object.entries(adminSummary.byKind).map(([value, count]) => <option key={value} value={value}>{value} · {count}</option>)}
            </select></label>
            <label><span>גישה</span><select value={researchFilters.access} onChange={(event) => updateResearchFilter("access", event.target.value)}>
              <option value="all">כל רמות הגישה</option>
              {Object.entries(adminSummary.byAccess).map(([value, count]) => <option key={value} value={value}>{value} · {count}</option>)}
            </select></label>
            <label><span>ממשל</span><select value={researchFilters.governance} onChange={(event) => updateResearchFilter("governance", event.target.value)}>
              <option value="all">כל מצבי הממשל</option>
              {Object.entries(adminSummary.byGovernance).map(([value, count]) => <option key={value} value={value}>{value} · {count}</option>)}
            </select></label>
            <label><span>אימות</span><select value={researchFilters.verification} onChange={(event) => updateResearchFilter("verification", event.target.value)}>
              <option value="all">כל מצבי האימות</option>
              {Object.entries(adminSummary.byVerification).map(([value, count]) => <option key={value} value={value}>{value} · {count}</option>)}
            </select></label>
            <button className="sod29-action" type="button" onClick={resetResearchFilters}>אפס סינון</button>
          </div>
          <div className="sod29-muted sod29-world-research-result-count">מוצגים {filteredResearchFindings.length} מתוך {visibleResearchFindings.length} ממצאי מחקר מורשים.</div>
        </> : <>
          <div className="sod29-book-grid sod29-world-govern-grid">
            <div className="sod29-card"><div className="sod29-kicker">גישה</div><h3>{Object.entries(adminSummary.byAccess).map(([name, count]) => `${name}: ${count}`).join(" · ") || "אין ממצאי מחקר"}</h3><p>מי רשאי לקרוא את החומר. זה אינו מצב פרסום.</p></div>
            <div className="sod29-card"><div className="sod29-kicker">ממשל</div><h3>{Object.entries(adminSummary.byGovernance).map(([name, count]) => `${name}: ${count}`).join(" · ") || "אין מצב ממשל להצגה"}</h3><p>Candidate / Approved / Canonical נשארים נפרדים מאימות ומנראות.</p></div>
            <div className="sod29-card"><div className="sod29-kicker">אימות</div><h3>{Object.entries(adminSummary.byVerification).map(([name, count]) => `${name}: ${count}`).join(" · ") || "אין מצב אימות להצגה"}</h3><p>תוצאת בדיקה אינה אישור פרסום ואינה קנוניזציה.</p></div>
          </div>
          <div className="sod29-world-govern-boundaries">
            <FrameState kind={adminSummary.capabilities.rawSource ? "empty" : "unavailable"} title="מקור גולמי / provenance">{adminSummary.capabilities.rawSource ? "לפחות לחלק מהפריטים יש sourceRef/inputRef שניתן לעקוב אחריו. פתיחת raw מלאה תחובר דרך Research Intake owner." : "ב־projection הנוכחי אין sourceRef שמאפשר לפתוח raw; World לא ימציא מקור."}</FrameState>
            <FrameState kind="unavailable" title="Processing state עדיין לא מחובר">Raw → Extracted → Processed חייב להגיע מ־Research Intake v11. אין שדה כזה ב־research_objects ולכן הוא לא מוצג כאילו קיים.</FrameState>
            <FrameState kind="unavailable" title="Publication state עדיין לא מחובר">privacy_scope=public_candidate אינו Published. פרסום יישאר Human Gate נפרד כאשר owner הפרסום יחובר ל־World.</FrameState>
          </div>
        </>}

        <div className="sod29-world-contributor-filter">
          <div>
            <div className="sod29-kicker">חוקר / כותב</div>
            <h3>סנן חומר מיוחס</h3>
            <p className="sod29-muted">כרגע מאושרים ב־World רק צבי, שמעון חיימוב, יניב לוי ויצחק שחר קנדרו. ברירת המחדל היא הכול. הסינון משתמש רק ב־attribution קיים; חומר בלי שיוך מוכח אינו מיוחס לאדם.</p>
          </div>
          {contributorLensState.loading ? <FrameState kind="loading" title="טוען שיוך חוקרים">קורא attribution והרשאות מנהל.</FrameState> : null}
          {contributorLensState.error ? <FrameState kind="unavailable" title="סינון החוקרים לא זמין כרגע">שאר ה־World ממשיך לפעול ללא ניחוש attribution.</FrameState> : null}
          {contributorLens?.contributors?.length ? <div className="sod29-world-contributor-buttons" role="group" aria-label="סינון לפי חוקר או כותב">
            <button className={`sod29-action${contributorFilter === "all" ? " primary" : ""}`} type="button" aria-pressed={contributorFilter === "all"} onClick={() => setContributorFilter("all")}>הכול</button>
            {contributorLens.contributors.map((person) => {
              const count = person.counts.research + person.counts.contributions + person.counts.topicConvergences + person.counts.convergenceRows;
              return <button key={person.slug} className={`sod29-action${contributorFilter === person.slug ? " primary" : ""}`} type="button" aria-pressed={contributorFilter === person.slug} onClick={() => setContributorFilter(person.slug)}>
                {person.displayName}<small>{count}</small>
              </button>;
            })}
          </div> : null}
          {selectedContributor ? <div className="sod29-muted">מסנן כעת: <b>{selectedContributor.displayName}</b> · מחקר {selectedContributor.researchObjectIds.length} · תרומות רלוונטיות {selectedContributor.relevantContributions.length} · התכנסויות {selectedContributor.convergences.length + selectedContributor.topicSlugs.length}</div> : null}
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
            <p>עד שבע התכנסויות וקשרים בולטים שנבחרו בהקשר הזה אחרי סינון הרשאות וקיבוץ כפילויות ותלויות. הבולטות כאן היא רלוונטיות מחקרית — לא דירוג אמת.</p>
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
          <div>
            <div className="sod29-kicker">גימטריות וביטויים</div>
            <h2>כל רשימת הגימטריות של {data.identity.label}</h2>
            <div className="sod29-muted">{gematriaBounds?.source_exhaustive === false ? `מוצגות ${gematriaRows.length} מתוך ${gematriaBounds.total_count || "?"} רשומות במקור הקנוני.` : `${gematriaRows.length} רשומות · מקור קנוני מלא לפי סדר fn_number_lookup.`} הסדר כאן אינו דירוג אמת.</div>
          </div>
          <span className="sod29-chip">{visibleGematriaRows.length} מוצגות</span>
        </div>
        <div className="sod29-world-gematria-controls">
          <label>
            <span>חיפוש</span>
            <input value={gematriaQuery} onChange={(event) => setGematriaQuery(event.target.value)} placeholder="מילה, ביטוי או מספר" />
          </label>
          <label>
            <span>שיטת גימטריה</span>
            <select aria-label="סינון גימטריה לפי שיטה" value={gematriaMethodFilter} onChange={(event) => setGematriaMethodFilter(event.target.value)}>
              <option value="all">כל השיטות · {gematriaRows.length}</option>
              {gematriaMethods.map((method) => <option key={method} value={method}>{method} · {gematriaRows.filter((row) => row.method === method).length}</option>)}
            </select>
          </label>
          <label>
            <span>סוג רשומה</span>
            <select aria-label="סינון גימטריה לפי סוג" value={gematriaTypeFilter} onChange={(event) => setGematriaTypeFilter(event.target.value)}>
              <option value="all">הכול</option>
              <option value="atomic">אטומי</option>
              <option value="composite">מורכב</option>
            </select>
          </label>
        </div>
        {!visibleGematriaRows.length ? <FrameState kind="empty" title="אין גימטריות במסנן הזה">שנה שיטה, סוג או חיפוש. הרשימה המקורית לא משתנה.</FrameState> : null}
        <div className="sod29-world-gematria-list">
          {visibleGematriaRows.map((row) => <div className="sod29-world-gematria-row" key={row.id}>
            <div className="sod29-world-gematria-expression"><strong>{row.phrase}</strong><small>{row.method}{row.atomicOrComposite ? ` · ${row.atomicOrComposite === "composite" ? "מורכב" : "אטומי"}` : ""}{row.methodGoverned === false ? " · שיטה היסטורית" : ""}</small></div>
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

      {activeLane === "research" && adminMode && contributorConvergences.length ? <section className="sod29-section sod29-world-human-section">
        <div className="sod29-section-head">
          <div><div className="sod29-kicker">התכנסויות לפי חוקר</div><h2>{selectedContributor ? `${CONVERGENCES_LABEL} של ${selectedContributor.displayName}` : "התכנסויות מיוחסות לארבעת החוקרים"}</h2></div>
          <span className="sod29-chip">{contributorConvergences.length}</span>
        </div>
        <div className="sod29-list">{contributorConvergences.map((item) => <div className="sod29-row" key={item.id}>
          <div>
            <strong>{item.value != null ? `${item.value} · ` : ""}{item.author || "חוקר"}</strong>
            <small>{item.method || "שיטה לא צוינה"} · {item.kind || CONVERGENCE_LABEL} · {item.group_size || item.author_phrases?.length || 0} ביטויים</small>
            {item.note ? <p className="sod29-world-row-summary">{item.note}</p> : null}
          </div>
          {item.value != null ? <button className="sod29-action" type="button" onClick={() => research.setResearchContext?.({ subject: { id: String(item.value), type: "number", label: String(item.value), href: "/world" }, selection: { entityId: String(item.value), entityType: "number" }, lens: "world", returnTo: { href: "/world", label: data.identity.label } })}>פתח {item.value}</button> : null}
        </div>)}</div>
      </section> : null}

      {activeLane === "research" && adminMode && contributorContributions.length ? <section className="sod29-section sod29-world-human-section">
        <div className="sod29-section-head">
          <div><div className="sod29-kicker">תרומות מיוחסות</div><h2>{selectedContributor ? `חומר של ${selectedContributor.displayName} סביב ${data.identity.label}` : "חומר מארבעת החוקרים סביב הנקודה"}</h2></div>
          <span className="sod29-chip">{contributorContributions.length}</span>
        </div>
        <div className="sod29-list">{contributorContributions.map((row) => {
          const view = contributionDisplay(row);
          const contributorName = selectedContributor?.displayName || row._contributorName || "חוקר";
          return <div className="sod29-row" key={row.id}>
            <div>
              <strong>{view.title}</strong>
              <small>{contributorName}{view.method ? ` · ${view.method}` : ""}{view.status ? ` · ${view.status}` : ""}</small>
            </div>
            {view.value != null ? <button className="sod29-action" type="button" onClick={() => research.setResearchContext?.({ subject: { id: String(view.value), type: "number", label: String(view.value), href: "/world" }, selection: { entityId: String(view.value), entityType: "number" }, lens: "world", returnTo: { href: "/world", label: data.identity.label } })}>פתח {view.value}</button> : null}
          </div>;
        })}</div>
      </section> : null}

      {activeLane === "research" && visibleTopicFindings.length ? <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">{CONVERGENCES_LABEL}</div><h2>{selectedContributor ? `${CONVERGENCES_LABEL} של ${selectedContributor.displayName}` : `${CONVERGENCES_LABEL} סביב הנקודה`}</h2></div><span className="sod29-chip">{visibleTopicFindings.length}</span></div>
        <div className="sod29-list">{visibleTopicFindings.map((finding, index) => <div className="sod29-row" key={finding.id || index}><div><strong>{finding.subject?.label || CONVERGENCE_LABEL}</strong><small>{CONVERGENCE_LABEL} שקשורה לנקודה הזאת</small></div><button className="sod29-action" type="button" onClick={() => inspectFinding(finding)}>בדוק</button></div>)}</div>
      </section> : null}

      {activeLane === "research" && data.numberWorlds?.length ? <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">משפחות תוכן</div><h2>עוד הקשרים סביב המספר</h2></div></div>
        <div className="sod29-book-grid">{data.numberWorlds.slice(0, 8).map((group) => <div className="sod29-card" key={group.world}><div className="sod29-kicker">{group.count} פריטים</div><h3>{group.world}</h3></div>)}</div>
      </section> : null}

      {activeLane === "research" && (adminMode ? filteredResearchFindings.length : visibleResearchFindings.length) ? <section className="sod29-section sod29-world-human-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">עוד מחקר</div><h2>{adminMode ? "ממצאי המחקר לפי הסינון הנוכחי" : "דברים שנמצאו סביב הנקודה הזאת"}</h2></div>{adminMode ? <span className="sod29-chip">{filteredResearchFindings.length} / {visibleResearchFindings.length}</span> : null}</div>
        <div className="sod29-list">{(adminMode ? filteredResearchFindings : visibleResearchFindings).map((finding, index) => {
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
      description="ראה מה מתחבר לנקודה שמסקרנת אותך — מספרים, ביטויים, מקורות, אירועים וקשרים. פתח התכנסות, צא למסע וחזור בדיוק למקום שממנו יצאת."
      status="עולם · גילוי"
    >
      <WorldBody />
    </Sod2029Shell>
  );
}
