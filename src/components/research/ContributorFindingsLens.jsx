import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FindingSurface from "./FindingSurface.jsx";
import { usePalette } from "../../lib/palette.js";
import { worldColor } from "../../lib/worlds.js";
import { F } from "../../theme.js";
import { LAYOUT, RADIUS, SPACE, TYPE_SCALE } from "../../lib/designTokens.js";

const clean = (value) => value == null ? "" : String(value).trim();

const FACET_LABELS = Object.freeze({
  source: "מקור",
  number: "מספרים",
  phrase: "ביטויים",
  relation: "קשרים",
  media: "מדיה",
  topic: "התכנסויות",
});

function dt(value) {
  if (!value) return "זמן לא צוין";
  try {
    return new Date(value).toLocaleString("he-IL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return "זמן לא צוין";
  }
}

function withinDays(value, days) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= Math.max(1, Number(days) || 7) * 86400000;
}

function makeStyles(P) {
  const box = {
    border: `1px solid ${P.border}`,
    borderRadius: RADIUS.lg,
    background: P.cardGrad,
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

function SourceGroup({ group, P, S }) {
  const [expanded, setExpanded] = useState(false);
  const findings = group.universalFindings || [];
  const shown = expanded ? findings : findings.slice(0, 6);

  return <article
    data-experience-capability="contributor-source-finding-group"
    style={{ ...S.box, padding: SPACE[4], display: "grid", gap: SPACE[3] }}
  >
    <header style={{ display: "flex", gap: SPACE[3], alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: "1 1 360px" }}>
        <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft, marginBottom: SPACE[1] }}>
          {dt(group.createdAt)}
          {group.source?.channel ? ` · ${group.source.channel}` : ""}
          {group.source?.status ? ` · ${group.source.status}` : ""}
        </div>
        <h3 style={{ margin: 0, ...TYPE_SCALE.lead, fontFamily: F.ui, color: P.ink }}>{group.title}</h3>
        <div style={{ marginTop: SPACE[2], display: "flex", gap: SPACE[1], flexWrap: "wrap" }}>
          {(group.facets || []).map((facet) => <span key={facet} style={S.pill}>{FACET_LABELS[facet] || facet}</span>)}
          {(group.lexicalWorlds || []).map((world) => <span
            key={`world:${world}`}
            style={{ ...S.pill, borderColor: worldColor(world), color: worldColor(world) }}
          >עולם: {world}</span>)}
        </div>
      </div>
      <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft, textAlign: "end" }}>
        {findings.length ? <>
          <strong style={{ color: P.ink }}>{group.findingCount}</strong> ממצאים<br />
          <strong style={{ color: P.ink }}>{group.verifiedCount}</strong> עם אימות מנוע
        </> : <span data-experience-capability="contributor-source-only">מקור בלבד · עדיין ללא ממצא מחקר</span>}
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

    {group.source?.text ? <section
      data-experience-capability="contributor-source-fidelity"
      style={{ borderInlineStart: `3px solid ${P.accent}`, paddingInlineStart: SPACE[3] }}
    >
      <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, fontWeight: 900, color: P.accentText, marginBottom: SPACE[1] }}>המקור · דברי החוקר</div>
      <div style={{ ...TYPE_SCALE.body, fontFamily: F.body, whiteSpace: "pre-wrap", color: P.ink }}>{group.source.text}</div>
      {(group.source.imageUrl || group.source.thumbUrl) ? <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft, marginTop: SPACE[2] }}>יש מדיה מקורית שמורה במקור.</div> : null}
    </section> : <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft }}>מקור ללא טקסט שמור{group.source?.channel ? ` · ${group.source.channel}` : ""}</div>}

    {findings.length ? <details data-experience-capability="contributor-system-analysis">
      <summary style={{ ...TYPE_SCALE.small, fontFamily: F.ui, color: P.ink, cursor: "pointer", fontWeight: 800, marginBottom: SPACE[2] }}>ניתוח המערכת · {findings.length} ממצאים (סגור כברירת מחדל)</summary>
      <div style={{ display: "flex", gap: SPACE[2], justifyContent: "space-between", alignItems: "center", marginBottom: SPACE[2], flexWrap: "wrap" }}>
        <div>
          <div style={{ ...TYPE_SCALE.micro, fontFamily: F.body, color: P.inkSoft }}>המקור נשאר מקור; הממצאים למטה הם חילוץ ואימות נפרדים.</div>
        </div>
        {findings.length > 6 ? <button type="button" onClick={() => setExpanded((value) => !value)} style={S.action}>
          {expanded ? "צמצם" : `כל ${findings.length} הממצאים`}
        </button> : null}
      </div>
      {shown.map((finding) => <FindingSurface key={finding.id} finding={finding} compact />)}
    </details> : null}

    {(group.lexicalTags || []).length ? <footer style={{ display: "flex", gap: SPACE[1], flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft }}>תגיות קשורות:</span>
      {group.lexicalTags.slice(0, 18).map((tag) => <span key={tag} style={{ ...S.pill, color: P.inkSoft }}>{tag}</span>)}
    </footer> : null}

    <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft }}>
      {findings.length ? null : "מקור ציבורי כפי שנשלח; פרסום מקור אינו אימות מחקרי. "}מצב: {group.topicState === "linked_topic" ? "מקושר להתכנסות" : "טרם צורף להתכנסות"}
    </div>
  </article>;
}

function TopicCard({ topic, P, S }) {
  return <Link
    to={topic.href || "#"}
    data-experience-capability="contributor-approved-topic"
    style={{ ...S.box, display: "block", padding: SPACE[3], color: P.ink, textDecoration: "none" }}
  >
    <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft, marginBottom: SPACE[1] }}>התכנסות מאושרת / היסטורית · {dt(topic.approvedAt || topic.createdAt)}</div>
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
}) {
  const P = usePalette();
  const S = useMemo(() => makeStyles(P), [P]);
  const [mode, setMode] = useState("all");
  const [world, setWorld] = useState("all");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    let rows = Array.isArray(projection?.sourceGroups) ? projection.sourceGroups : [];
    if (mode === "recent") rows = rows.filter((group) => withinDays(group.createdAt, recentDays));
    if (mode === "verified") rows = rows.filter((group) => group.verifiedCount > 0);
    if (world !== "all") rows = rows.filter((group) => (group.lexicalWorlds || []).includes(world));
    const q = clean(query).toLowerCase();
    if (q) rows = rows.filter((group) => [
      group.title,
      group.source?.text,
      ...(group.terms || []),
      ...(group.lexicalWorlds || []),
      ...(group.lexicalTags || []),
      ...((group.rows || []).map((row) => row.statement)),
    ].filter(Boolean).join(" ").toLowerCase().includes(q));
    return rows;
  }, [projection, mode, world, query, recentDays]);

  if (loading) return <div style={{ ...S.box, padding: SPACE[4], ...TYPE_SCALE.body, fontFamily: F.body }}>טוען את ממצאי החוקר…</div>;
  if (error) return <div style={{ ...S.box, padding: SPACE[4], ...TYPE_SCALE.body, fontFamily: F.body }}>ממצאי החוקר לא נטענו כרגע. לא יוצג חומר חלופי במקום הנתונים החסרים.</div>;
  if (!projection) return <div style={{ ...S.box, padding: SPACE[4], ...TYPE_SCALE.body, fontFamily: F.body }}>לא נמצא חוקר לעדשה הזו.</div>;

  const availability = projection.availability || {};
  const unavailable = [
    availability.research === "unavailable" ? "ממצאי המחקר" : null,
    availability.sources === "unavailable" ? "הודעות המקור" : null,
    availability.contributions === "unavailable" ? "התרומות" : null,
    availability.topics === "unavailable" ? "ההתכנסויות" : null,
  ].filter(Boolean);
  const countOrUnknown = (key, value) => (availability[key] === "unavailable" ? "—" : value);
  const worlds = Object.entries(projection.worldCounts || {}).sort((a, b) => b[1] - a[1]);

  return <section
    data-experience-surface="contributor-findings-lens"
    data-experience-capability="contributor-findings-projection"
    style={{ display: "grid", gap: SPACE[4], color: P.ink }}
  >
    <header style={{ ...S.box, padding: SPACE[4] }}>
      <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.accentDim, fontWeight: 900 }}>CONTRIBUTOR FINDINGS · ONE RESEARCH OS</div>
      <h2 style={{ margin: `${SPACE[1]}px 0 ${SPACE[2]}px`, ...TYPE_SCALE.title, fontFamily: F.ui }}>כל הממצאים של {projection.contributor.displayName}</h2>
      <div style={{ ...TYPE_SCALE.body, fontFamily: F.body, color: P.inkSoft, maxWidth: LAYOUT.readingMax }}>
        זו עדשת provenance על אותו Research OS. החוקר הוא מי שהביא את החומר — לא “עולם” נפרד.
        מקור, ממצא, אימות, התכנסות ופרסום נשארים שכבות שונות.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: SPACE[2], marginTop: SPACE[3] }}>
        {[
          ["מקורות", countOrUnknown("sources", projection.counts.sourceGroups)],
          ["מהם עם ממצאים", countOrUnknown("research", projection.counts.sourceGroupsWithFindings)],
          ["ממצאים שחולצו", countOrUnknown("research", projection.counts.researchObjects)],
          ["אימותי מנוע", countOrUnknown("research", projection.counts.engineVerified)],
          ["התכנסויות", countOrUnknown("topics", projection.counts.topics)],
          ["ערכים מספריים", projection.counts.uniqueValues],
        ].map(([label, value]) => <div key={label} style={{ ...S.box, padding: SPACE[2] }}>
          <strong style={{ ...TYPE_SCALE.title, fontFamily: F.numeric, color: P.accentText }}>{value}</strong>
          <div style={{ ...TYPE_SCALE.micro, fontFamily: F.ui, color: P.inkSoft }}>{label}</div>
        </div>)}
      </div>
    </header>

    {unavailable.length ? <div role="status" data-experience-capability="contributor-availability-warning" style={{ ...S.box, padding: SPACE[3], ...TYPE_SCALE.small, fontFamily: F.body }}>
      {unavailable.join(", ")} אינם זמינים כרגע בתצוגה זו — זה אינו אומר שאין כאלה. המקורות והחומר שנטענו מוצגים כמות שהם.
    </div> : null}

    <div style={{ ...S.box, padding: SPACE[3], display: "grid", gap: SPACE[2] }}>
      <div style={{ display: "flex", gap: SPACE[2], flexWrap: "wrap" }}>
        {[
          ["recent", `חדש · ${recentDays} ימים`],
          ["all", "כל המקורות"],
          ["verified", "עם אימות מנוע"],
          ["topics", `התכנסויות · ${projection.counts.topics}`],
        ].map(([key, label]) => <button
          key={key}
          type="button"
          onClick={() => setMode(key)}
          aria-pressed={mode === key}
          style={{ ...S.action, borderColor: mode === key ? P.borderStrong : P.border, color: mode === key ? P.accentText : P.ink }}
        >{label}</button>)}
      </div>

      {worlds.length ? <div style={{ display: "flex", gap: SPACE[1], flexWrap: "wrap" }}>
        <button type="button" onClick={() => setWorld("all")} style={{ ...S.action, minHeight: 36, color: world === "all" ? P.accentText : P.ink }}>כל העולמות</button>
        {worlds.map(([label, count]) => <button
          key={label}
          type="button"
          onClick={() => setWorld(label)}
          style={{ ...S.action, minHeight: 36, borderColor: worldColor(label), color: world === label ? worldColor(label) : P.ink }}
        >{label} · {count}</button>)}
      </div> : null}

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="חפש ביטוי, מספר, ממצא, עולם או תגית…"
        aria-label="חיפוש בממצאי החוקר"
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
        {(projection.topics || []).map((topic) => <TopicCard key={topic.id} topic={topic} P={P} S={S} />)}
      </div>
    ) : groups.length ? (
      <div style={{ display: "grid", gap: SPACE[3] }}>
        {groups.map((group) => <SourceGroup key={group.id} group={group} P={P} S={S} />)}
      </div>
    ) : <div style={{ ...S.box, padding: SPACE[4], ...TYPE_SCALE.body, fontFamily: F.body }}>אין חומר במסנן הזה.</div>}

    <footer style={{ ...TYPE_SCALE.micro, fontFamily: F.body, color: P.inkSoft }}>
      {projection.truthBoundary}<br />
      {projection.topicAdmission}
    </footer>
  </section>;
}
