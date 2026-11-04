import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FindingSurface from "./FindingSurface.jsx";
import { use2029Palette } from "../../lib/palette.js";
import { LAYOUT, RADIUS, SPACE, TYPE_SCALE_V2 as TYPE_SCALE, TYPEFACE as F } from "../../lib/designTokens.js";
import { recordTimeLabel } from "../../lib/relativeTime2029.js";
import { galThumb } from "../../lib/img.js";
import { sourceOccurrenceElementId } from "../../lib/research/worldContributorSourceLocator.js";

const clean = (value) => value == null ? "" : String(value).trim();
const genericSourceLabel = (text) => ["📷 עדכון", "🎬 עדכון וידאו", "עדכון"].includes(clean(text));
const safeHttps = (value) => /^https:\/\/[^\s]+$/i.test(clean(value)) ? clean(value) : null;
const videoMedia = (url) => /\.(mp4|mov|webm|m4v)([?#]|$)/i.test(url || "");
const groupHasSource = (group, sourceRef) => {
  const wanted = clean(sourceRef).split("#")[0];
  if (!wanted) return false;
  return clean(group?.sourceRef).split("#")[0] === wanted
    || (group?.linkedSourceRefs || []).some((ref) => clean(ref).split("#")[0] === wanted)
    || (group?.sourceOccurrences || []).some((source) => clean(source?.sourceRef).split("#")[0] === wanted);
};

const FACET_LABELS = Object.freeze({
  source: "מקור",
  number: "מספרים",
  phrase: "ביטויים",
  relation: "קשרים",
  media: "מדיה",
  topic: "התכנסויות",
});

function dt(value, mode) {
  return recordTimeLabel(value, mode, "זמן לא צוין");
}

function withinDays(value, days) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= Math.max(1, Number(days) || 7) * 86400000;
}

function contributorReviewHref(contributor, { strongest = false } = {}) {
  const params = new URLSearchParams({
    view: "admin",
    contributorId: clean(contributor?.id),
    contributorLabel: clean(contributor?.displayName),
    sort: "strength",
  });
  if (strongest) {
    params.set("strength", "חזק");
    params.set("recommendation", "מתאים לעץ");
  }
  return `/world?${params.toString()}#world-all-research`;
}

function makeStyles(P) {
  const box = {
    border: `1px solid ${P.border}`,
    borderRadius: RADIUS.lg,
    background: P.card,
    color: P.ink,
  };
  const pill = {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    border: `1px solid ${P.border}`,
    borderRadius: RADIUS.pill,
    padding: `${SPACE[1]}px ${SPACE[2]}px`,
    fontFamily: F.ui,
    fontSize: TYPE_SCALE.micro.fontSize,
    lineHeight: TYPE_SCALE.micro.lineHeight,
    fontWeight: 800,
  };
  const action = {
    ...pill,
    minHeight: LAYOUT.controlMinHeight,
    cursor: "pointer",
    background: P.cardSoft,
    color: P.ink,
  };
  return { box, pill, action };
}

function SourceGroup({ group, P, S, researchUnavailable, timeMode, showDuplicateAudit = false, focusSourceRef = null }) {
  const [expanded, setExpanded] = useState(false);
  const findings = group.universalFindings || [];
  const shown = expanded ? findings : findings.slice(0, 6);
  const mediaSource = group.mediaSource || group.source;
  const duplicateClusters = Array.isArray(group.duplicateFindingClusters) ? group.duplicateFindingClusters : [];
  const duplicateOccurrences = duplicateClusters.reduce((sum, cluster) => sum + Number(cluster.hiddenOccurrenceCount || 0), 0);
  const focused = groupHasSource(group, focusSourceRef);

  return <article
    id={focused ? sourceOccurrenceElementId(focusSourceRef) : undefined}
    data-experience-capability="contributor-source-finding-group"
    data-source-focused={focused ? "true" : undefined}
    style={{ ...S.box, padding: SPACE[4], display: "grid", gap: SPACE[3], outline: focused ? `2px solid ${P.accent}` : undefined, outlineOffset: focused ? 3 : undefined }}
  >
    <header style={{ display: "flex", gap: SPACE[3], alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: "1 1 360px" }}>
        <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft, marginBottom: SPACE[1] }}>
          {dt(group.createdAt, timeMode)}

        </div>
        <h3 style={{ margin: 0, ...TYPE_SCALE.lead, fontFamily: F.ui, color: P.ink }}>{group.title}</h3>
        <div style={{ marginTop: SPACE[2], display: "flex", gap: SPACE[1], flexWrap: "wrap" }}>
          {(group.facets || []).map((facet) => <span key={facet} style={S.pill}>{FACET_LABELS[facet] || facet}</span>)}
          {(group.lexicalWorlds || []).map((world) => <span
            key={`world:${world}`}
            style={{ ...S.pill, borderColor: P.border, color: P.accentText }}
          >עולם: {world}</span>)}
        </div>
      </div>
      <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft, textAlign: "end" }}>
        {findings.length ? <>
          <strong style={{ color: P.ink }}>{group.findingCount}</strong> ממצאים<br />
          <strong style={{ color: P.ink }}>{group.verifiedCount}</strong> עם אימות מנוע
        </> : <span data-experience-capability="contributor-source-only">מקור פתוח לקריאה</span>}
      </div>
    </header>

    {(group.values?.length || group.terms?.length) ? <div style={{ display: "flex", gap: SPACE[2], flexWrap: "wrap", alignItems: "center" }}>
      {group.values?.map((value) => <Link
        key={value}
        to={`/2029/number/${value}`}
        style={{ ...S.pill, textDecoration: "none", color: P.accentText, fontFamily: F.numeric }}
      >{value}</Link>)}
      {group.terms?.slice(0, 14).map((term) => <span key={term} style={{ ...S.pill, color: P.inkSoft }}>{term}</span>)}
      {group.terms?.length > 14 ? <span style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft }}>+{group.terms.length - 14} ביטויים</span> : null}
    </div> : null}

    {group.source?.text && !genericSourceLabel(group.source.text) ? <section
      data-experience-capability="contributor-source-fidelity"
      style={{ borderInlineStart: `3px solid ${P.accent}`, paddingInlineStart: SPACE[3] }}
    >
      <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, fontWeight: 900, color: P.accentText, marginBottom: SPACE[1] }}>מתוך המקור</div>
      <div style={{ ...TYPE_SCALE.body, fontFamily: F.body, whiteSpace: "pre-wrap", color: P.ink }}>{group.source.text}</div>
    </section> : null}
    {group.mediaPair ? <div data-experience-capability="contributor-source-media-pair" style={{ ...TYPE_SCALE.micro, fontFamily: F.body, color: P.inkSoft }}>
      {group.mediaPair.basis === "explicit_image_reference"
        ? "התמונה וההודעה מוצגות יחד לפי הפניית התמונה שבמקור."
        : "התמונה וההודעה מוצגות יחד לפי רצף מקור סמוך וחפיפת מספרים וביטויים."}
    </div> : null}
    {duplicateOccurrences ? <div data-experience-capability="contributor-exact-duplicate-summary" style={{ ...TYPE_SCALE.micro, fontFamily: F.body, color: P.inkSoft }}>
      אוחדו {duplicateOccurrences} {duplicateOccurrences === 1 ? "הופעה כפולה" : "הופעות כפולות"}; מוצגת הגרסה הארוכה והמלאה ביותר, בלי למחוק את המקורות.
    </div> : null}
    {showDuplicateAudit && duplicateClusters.length ? <details data-experience-capability="contributor-exact-duplicate-audit">
      <summary style={{ ...TYPE_SCALE.small, fontFamily: F.ui, color: P.ink, cursor: "pointer", fontWeight: 800 }}>
        ביקורת כפילויות · {duplicateClusters.length} {duplicateClusters.length === 1 ? "אשכול" : "אשכולות"}
      </summary>
      {duplicateClusters.map((cluster) => <section key={cluster.representativeFindingId} style={{ marginTop: SPACE[2] }}>
        <div style={{ ...TYPE_SCALE.micro, fontFamily: F.body, color: P.inkSoft }}>
          נציג: <code dir="ltr">{cluster.representativeFindingId}</code> · {cluster.occurrenceCount} הופעות שמורות
        </div>
        <ol style={{ marginBlock: SPACE[1], paddingInlineStart: SPACE[4] }}>
          {(cluster.occurrences || []).map((occurrence, index) => <li key={`${occurrence.findingId}:${occurrence.sourceRef || index}`} style={{ ...TYPE_SCALE.micro, fontFamily: F.body, marginBlock: SPACE[1] }}>
            <code dir="ltr">{occurrence.findingId}</code>
            {occurrence.sourceRef ? <> · <code dir="ltr">{occurrence.sourceRef}</code></> : null}
            {safeHttps(occurrence.source?.linkUrl) ? <> · <a href={occurrence.source.linkUrl} target="_blank" rel="noopener noreferrer">פתח מקור</a></> : null}
          </li>)}
        </ol>
      </section>)}
    </details> : null}
    {(safeHttps(mediaSource?.thumbUrl) || safeHttps(mediaSource?.imageUrl)) ? <div className="sod29-contributor-public-media">
      {videoMedia(mediaSource?.imageUrl)
        ? <video controls preload="none" poster={safeHttps(mediaSource?.thumbUrl) || undefined} src={safeHttps(mediaSource?.imageUrl) || undefined} aria-label="סרטון המקור" />
        : <img src={safeHttps(mediaSource?.thumbUrl) || galThumb(safeHttps(mediaSource?.imageUrl), 320)}
            width="220" height="145" loading="lazy" alt={group.title} />}
    </div> : !group.source?.text ? <p style={{ ...TYPE_SCALE.small, fontFamily: F.body, color: P.inkSoft }}>אין תיאור זמין לעדכון הזה.</p> : null}

    {findings.length ? <details data-experience-capability="contributor-system-analysis">
      <summary style={{ ...TYPE_SCALE.small, fontFamily: F.ui, color: P.ink, cursor: "pointer", fontWeight: 800, marginBottom: SPACE[2] }}>ניתוח המערכת · {findings.length} ממצאים</summary>
      <div style={{ display: "flex", gap: SPACE[2], justifyContent: "space-between", alignItems: "center", marginBottom: SPACE[2], flexWrap: "wrap" }}>
        <div>
          <div style={{ ...TYPE_SCALE.micro, fontFamily: F.body, color: P.inkSoft }}>המקור נשאר מקור; הממצאים למטה הם חילוץ ואימות נפרדים.</div>
        </div>
        {findings.length > 6 ? <button type="button" onClick={() => setExpanded((value) => !value)} style={S.action}>
          {expanded ? "צמצם" : `כל ${findings.length} הממצאים`}
        </button> : null}
      </div>
      {shown.map((finding) => <FindingSurface key={finding.id} finding={finding} projector />)}
    </details> : null}

    {(group.lexicalTags || []).length ? <footer style={{ display: "flex", gap: SPACE[1], flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft }}>תגיות קשורות:</span>
      {group.lexicalTags.slice(0, 18).map((tag) => <span key={tag} style={{ ...S.pill, color: P.inkSoft }}>{tag}</span>)}
    </footer> : null}

    {group.topicState === "linked_topic" ? <span style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft }}>קשור לנושא קיים</span> : null}
  </article>;
}

function TopicCard({ topic, P, S, timeMode }) {
  return <Link
    to={topic.href || "#"}
    data-experience-capability="contributor-approved-topic"
    style={{ ...S.box, display: "block", padding: SPACE[3], color: P.ink, textDecoration: "none" }}
  >
    <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft, marginBottom: SPACE[1] }}>התכנסות מאושרת / היסטורית · {dt(topic.approvedAt || topic.createdAt, timeMode)}</div>
    <strong style={{ ...TYPE_SCALE.small, fontFamily: F.ui }}>{topic.statement}</strong>
    {topic.secondary ? <div style={{ ...TYPE_SCALE.micro, fontFamily: F.body, color: P.inkSoft, marginTop: SPACE[1] }}>{topic.secondary}</div> : null}
    {(topic.values || []).length ? <div style={{ marginTop: SPACE[2], display: "flex", gap: SPACE[1], flexWrap: "wrap" }}>
      {topic.values.map((value) => <span key={value} style={{ ...S.pill, fontFamily: F.numeric, color: P.accentText }}>{value}</span>)}
    </div> : null}
  </Link>;
}

export default function ContributorFindingsLens({
  projection,
  loading = false,
  error = null,
  recentDays = 7,
  canReview = false,
  focusSourceRef = null,
  timeMode = "bilingual", // Home opts into "relative"; World and every other surface stay Hebrew + Gregorian.
}) {
  const P = use2029Palette();
  const S = useMemo(() => makeStyles(P), [P]);
  const [mode, setMode] = useState("all");
  const [world, setWorld] = useState("all");
  const [facet, setFacet] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const groups = useMemo(() => {
    let rows = Array.isArray(projection?.sourceGroups) ? projection.sourceGroups : [];
    if (mode === "recent") rows = rows.filter((group) => withinDays(group.createdAt, recentDays));
    if (mode === "verified") rows = rows.filter((group) => group.verifiedCount > 0);
    if (world !== "all") rows = rows.filter((group) => (group.lexicalWorlds || []).includes(world));
    if (facet !== "all") rows = rows.filter((group) => (group.facets || []).includes(facet));
    const q = clean(query).toLowerCase();
    if (q) rows = rows.filter((group) => [
      group.title,
      group.source?.text,
      ...(group.terms || []),
      ...(group.lexicalWorlds || []),
      ...(group.lexicalTags || []),
      ...((group.rows || []).map((row) => row.statement)),
    ].filter(Boolean).join(" ").toLowerCase().includes(q));
    if (focusSourceRef) rows = [...rows].sort((left, right) => Number(groupHasSource(right, focusSourceRef)) - Number(groupHasSource(left, focusSourceRef)));
    return rows;
  }, [projection, mode, world, facet, query, recentDays, focusSourceRef]);

  useEffect(() => {
    const id = sourceOccurrenceElementId(focusSourceRef);
    const focusedGroup = groups.find((group) => groupHasSource(group, focusSourceRef));
    if (!id || !focusedGroup) return undefined;
    if (selectedId !== focusedGroup.id) setSelectedId(focusedGroup.id);
    const frame = window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [focusSourceRef, groups, selectedId]);

  if (loading) return <div style={{ ...S.box, padding: SPACE[4], ...TYPE_SCALE.body, fontFamily: F.body }}>טוען את חומרי המקור…</div>;
  if (error) return <div style={{ ...S.box, padding: SPACE[4], ...TYPE_SCALE.body, fontFamily: F.body }}>המקורות לא נטענו כרגע. נסו שוב מאוחר יותר.</div>;
  if (!projection) return <div style={{ ...S.box, padding: SPACE[4], ...TYPE_SCALE.body, fontFamily: F.body }}>לא נמצאו מקורות להצגה.</div>;

  const availability = projection.availability || {};
  const unavailable = [
    availability.research === "unavailable" && projection.mode === "admin_all" ? "נתונים נוספים" : null,
    availability.sources === "unavailable" ? "הודעות המקור" : null,
    availability.contributions === "unavailable" ? "התרומות" : null,
    availability.topics === "unavailable" ? "הנושאים" : null,
  ].filter(Boolean);
  const countOrUnknown = (key, value) => (availability[key] === "unavailable" ? "—" : value);
  const worlds = Object.entries(projection.worldCounts || {}).sort((a, b) => b[1] - a[1]);

  return <section
    data-experience-surface="contributor-findings-lens"
    data-experience-capability="contributor-findings-projection"
    dir="rtl"
    style={{ display: "grid", gap: SPACE[4], color: P.ink, minWidth: 0, overflowWrap: "anywhere" }}
  >
    <header style={{ ...S.box, padding: SPACE[4] }}>
      <h2 style={{ margin: 0, ...TYPE_SCALE.title, fontFamily: F.ui }}>המקורות של {projection.contributor.displayName}</h2>
      <p style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft, marginBottom: 0 }}>
        {countOrUnknown("sources", projection.counts.sourceRecords ?? projection.counts.sourceGroups)} רשומות מקור זמינות
        {projection.counts.linkedImageMessages ? ` · ${projection.counts.linkedImageMessages} תמונות קושרו להודעה שלהן` : ""}
        {projection.counts.duplicateFindingsHidden ? ` · ${projection.counts.duplicateFindingsHidden} כפילויות אוחדו והוסתרו` : ""}
        {` · ${projection.counts.sourceGroups} פרסומים לקריאה.`}
      </p>
      {focusSourceRef ? <p data-experience-capability="contributor-exact-source-focus"
        style={{ ...TYPE_SCALE.small, fontFamily: F.body, color: P.accentText, marginBottom: 0 }}>
        נפתחה הופעת המקור המדויקת בספרייה הציבורית. הופעה נוספת של אותו חומר אינה נספרת כמקור עצמאי.
      </p> : null}
      {canReview ? <div data-experience-capability="contributor-admin-triage-links"
        style={{ display: "flex", gap: SPACE[2], flexWrap: "wrap", marginTop: SPACE[3] }}>
        <Link to={contributorReviewHref(projection.contributor)} style={{ ...S.action, textDecoration: "none" }}>
          מיין את כל הממצאים
        </Link>
        <Link to={contributorReviewHref(projection.contributor, { strongest: true })}
          style={{ ...S.action, textDecoration: "none", color: P.accentText, borderColor: P.borderStrong }}>
          החזקים שמומלצים לעץ
        </Link>
      </div> : null}
    </header>

    {unavailable.length ? <div role="status" data-experience-capability="contributor-availability-warning" style={{ ...S.box, padding: SPACE[3], ...TYPE_SCALE.small, fontFamily: F.body }}>
      {unavailable.join(", ")} אינם זמינים כרגע בתצוגה זו — זה אינו אומר שאין כאלה. המקורות והחומר שנטענו מוצגים כמות שהם.
    </div> : null}

    <div style={{ ...S.box, padding: SPACE[3], display: "grid", gap: SPACE[2] }}>
      <div style={{ display: "flex", gap: SPACE[2], flexWrap: "wrap" }}>
        {[
          ["recent", `חדש · ${recentDays} ימים`],
          ["all", "כל המקורות"],
          ["verified", "עם נתונים נוספים"],
          ["topics", `נושאים · ${projection.counts.topics}`],
        ].filter(([key]) => key !== "verified" || projection.counts.engineVerified > 0).map(([key, label]) => <button
          key={key}
          type="button"
          onClick={() => setMode(key)}
          aria-pressed={mode === key}
          style={{ ...S.action, borderColor: mode === key ? P.borderStrong : P.border, color: mode === key ? P.accentText : P.ink }}
        >{label}</button>)}
      </div>

      {worlds.length ? <div style={{ display: "flex", gap: SPACE[1], flexWrap: "wrap" }}>
        <button type="button" onClick={() => setWorld("all")} style={{ ...S.action, minHeight: 44, color: world === "all" ? P.accentText : P.ink }}>כל העולמות</button>
        {worlds.map(([label, count]) => <button
          key={label}
          type="button"
          onClick={() => setWorld(label)}
          style={{ ...S.action, minHeight: 44, borderColor: P.border, color: world === label ? P.accentText : P.ink }}
        >{label} · {count}</button>)}
      </div> : null}

      <div data-experience-capability="contributor-structured-sort" style={{ display: "grid", gap: SPACE[1] }}>
        <span style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft }}>
          מיון לפי נתון קיים — בלי להסיק קטגוריה מהטקסט
        </span>
        <div style={{ display: "flex", gap: SPACE[1], flexWrap: "wrap" }}>
          <button type="button" onClick={() => setFacet("all")}
            aria-pressed={facet === "all"}
            style={{ ...S.action, minHeight: 44, color: facet === "all" ? P.accentText : P.ink }}>
            כל הסוגים
          </button>
          {["number", "phrase", "relation", "media", "topic"]
            .filter((key) => Number(projection.facetCounts?.[key] || 0) > 0)
            .map((key) => <button key={key} type="button" onClick={() => setFacet(key)}
              aria-pressed={facet === key}
              style={{ ...S.action, minHeight: 44, color: facet === key ? P.accentText : P.ink }}>
              {FACET_LABELS[key]} · {projection.facetCounts[key]} פרסומים
            </button>)}
        </div>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="חפש נושא, מספר, ביטוי או תגית…"
        aria-label="חיפוש במקורות"
        style={{
          width: "100%",
          minHeight: LAYOUT.controlMinHeight,
          boxSizing: "border-box",
          border: `1px solid ${P.border}`,
          borderRadius: RADIUS.md,
          padding: `${SPACE[2]}px ${SPACE[3]}px`,
          background: P.cardSoft,
          color: P.ink,
          fontFamily: F.body,
          ...TYPE_SCALE.small,
        }}
      />
    </div>

    {mode === "topics" ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: SPACE[2] }}>
        {(projection.topics || []).map((topic) => <TopicCard key={topic.id} topic={topic} P={P} S={S} timeMode={timeMode} />)}
      </div>
    ) : groups.length ? (
      <div style={{ display: "grid", gap: SPACE[3] }}>
        <label style={{ ...TYPE_SCALE.small, fontFamily: F.ui }}>בחירת פרסום · {groups.length} תוצאות
          <select aria-label="בחירת מקור לקריאה" value={groups.some((g) => g.id === selectedId) ? selectedId : groups[0].id}
            onChange={(event) => setSelectedId(event.target.value)} style={{ ...S.action, display: "block", width: "100%", maxWidth: "100%", marginTop: SPACE[2] }}>
            {groups.map((group) => {
              const hidden = (group.duplicateFindingClusters || []).reduce((sum, cluster) => sum + Number(cluster.hiddenOccurrenceCount || 0), 0);
              return <option key={group.id} value={group.id}>
                {dt(group.createdAt, timeMode)} · {group.title}{hidden ? ` · אוחדו ${hidden}` : ""}
              </option>;
            })}
          </select>
        </label>
        {groups.filter((g) => g.id === (groups.some((row) => row.id === selectedId) ? selectedId : groups[0].id)).map((group) => <SourceGroup key={group.id} group={group} P={P} S={S} timeMode={timeMode} researchUnavailable={availability.research === "unavailable"} showDuplicateAudit={projection.mode === "admin_all"} focusSourceRef={focusSourceRef} />)}
      </div>
    ) : <div style={{ ...S.box, padding: SPACE[4], ...TYPE_SCALE.body, fontFamily: F.body }}>אין חומר במסנן הזה.</div>}

    <footer style={{ ...TYPE_SCALE.micro, fontFamily: F.body, color: P.inkSoft }}>
      ניתן לפתוח את הפרסום המקורי או נושא קיים.
    </footer>
  </section>;
}
