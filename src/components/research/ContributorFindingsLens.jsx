import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FindingSurface from "./FindingSurface.jsx";

const clean = (value) => value == null ? "" : String(value).trim();

const FACET_LABELS = Object.freeze({
  source: "מקור",
  number: "מספרים",
  phrase: "ביטויים",
  relation: "קשרים",
  media: "מדיה",
  topic: "התכנסויות",
});

const KIND_LABELS = Object.freeze({
  fact: "עובדה/טענה עובדתית",
  relation: "קשר",
  observation: "תצפית",
  hypothesis: "השערה",
  question: "שאלה",
});

const box = {
  border: "1px solid var(--border, rgba(128,128,128,.22))",
  borderRadius: 16,
  background: "var(--card, rgba(255,255,255,.55))",
};

const pill = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid var(--border, rgba(128,128,128,.24))",
  borderRadius: 999,
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.2,
};

function dt(value) {
  if (!value) return "זמן לא צוין";
  try {
    return new Date(value).toLocaleString("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (_) {
    return "זמן לא צוין";
  }
}

function withinDays(value, days) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= Math.max(1, Number(days) || 7) * 86400000;
}

function SourceGroup({ group }) {
  const [expanded, setExpanded] = useState(false);
  const findings = group.universalFindings || [];
  const shown = expanded ? findings : findings.slice(0, 6);
  return <article style={{ ...box, padding: 16, display: "grid", gap: 13 }}>
    <header style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: "1 1 360px" }}>
        <div style={{ fontSize: 11, opacity: .68, marginBottom: 5 }}>
          {dt(group.createdAt)}
          {group.source?.channel ? ` · ${group.source.channel}` : ""}
          {group.source?.status ? ` · ${group.source.status}` : ""}
        </div>
        <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.35 }}>{group.title}</h3>
        <div style={{ marginTop: 7, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(group.facets || []).map((facet) => <span key={facet} style={pill}>{FACET_LABELS[facet] || facet}</span>)}
          {(group.lexicalWorlds || []).map((world) => <span key={`world:${world}`} style={{ ...pill, fontWeight: 900 }}>עולם: {world}</span>)}
        </div>
      </div>
      <div style={{ textAlign: "end", fontSize: 12, lineHeight: 1.55 }}>
        <strong>{group.findingCount}</strong> ממצאים<br />
        <strong>{group.verifiedCount}</strong> עם אימות מנוע
      </div>
    </header>

    {(group.values?.length || group.terms?.length) ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {group.values?.map((value) => <Link key={value} to={`/number/${value}`} style={{ ...pill, textDecoration: "none", color: "inherit" }}>{value}</Link>)}
      {group.terms?.slice(0, 14).map((term) => <span key={term} style={{ ...pill, opacity: .82 }}>{term}</span>)}
      {group.terms?.length > 14 ? <span style={{ fontSize: 11, opacity: .65 }}>+{group.terms.length - 14} ביטויים</span> : null}
    </div> : null}

    {group.source?.text ? <section style={{ borderInlineStart: "3px solid var(--accent, currentColor)", paddingInlineStart: 13 }}>
      <div style={{ fontSize: 11, fontWeight: 900, opacity: .7, marginBottom: 6 }}>המקור · דברי החוקר</div>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: 13.5 }}>{group.source.text}</div>
      {(group.source.imageUrl || group.source.thumbUrl) ? <div style={{ marginTop: 7, fontSize: 11, opacity: .72 }}>יש מדיה מקורית שמורה במקור.</div> : null}
    </section> : null}

    <section>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <strong style={{ fontSize: 13 }}>ניתוח המערכת</strong>
          <div style={{ fontSize: 10.5, opacity: .65 }}>המקור נשאר מקור; הממצאים למטה הם extraction / verification נפרדים.</div>
        </div>
        {findings.length > 6 ? <button type="button" onClick={() => setExpanded((value) => !value)} style={{ border: 0, background: "transparent", cursor: "pointer", fontWeight: 800 }}>
          {expanded ? "צמצם" : `כל ${findings.length} הממצאים`}
        </button> : null}
      </div>
      {shown.map((finding) => <FindingSurface key={finding.id} finding={finding} compact />)}
    </section>

    {(group.lexicalTags || []).length ? <footer style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 10.5, opacity: .62 }}>תגיות exact-match קיימות:</span>
      {group.lexicalTags.slice(0, 18).map((tag) => <span key={tag} style={{ ...pill, fontSize: 10, opacity: .75 }}>{tag}</span>)}
    </footer> : null}

    <div style={{ fontSize: 10.5, opacity: .58 }}>מצב: {group.topicState === "linked_topic" ? "מקושר ל־Topic קיים" : "Finding-first · עדיין לא Topic"}</div>
  </article>;
}

function TopicCard({ topic }) {
  return <Link to={topic.href || "#"} style={{ ...box, display: "block", padding: 14, color: "inherit", textDecoration: "none" }}>
    <div style={{ fontSize: 10.5, opacity: .62, marginBottom: 5 }}>Topic מאושר / היסטורי · {dt(topic.approvedAt || topic.createdAt)}</div>
    <strong style={{ fontSize: 15 }}>{topic.statement}</strong>
    {topic.secondary ? <div style={{ marginTop: 5, fontSize: 12, opacity: .75 }}>{topic.secondary}</div> : null}
    {(topic.values || []).length ? <div style={{ marginTop: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>{topic.values.map((value) => <span key={value} style={pill}>{value}</span>)}</div> : null}
  </Link>;
}

export default function ContributorFindingsLens({
  projection,
  loading = false,
  error = null,
  recentDays = 7,
}) {
  const [mode, setMode] = useState("recent");
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

  if (loading) return <div style={{ ...box, padding: 18 }}>טוען את ממצאי החוקר…</div>;
  if (error) return <div style={{ ...box, padding: 18 }}>ממצאי החוקר לא נטענו כרגע. לא יוצג חומר חלופי במקום הנתונים החסרים.</div>;
  if (!projection) return <div style={{ ...box, padding: 18 }}>לא נמצא חוקר לעדשה הזו.</div>;

  const worlds = Object.entries(projection.worldCounts || {}).sort((a, b) => b[1] - a[1]);

  return <section style={{ display: "grid", gap: 16 }}>
    <header style={{ ...box, padding: 18 }}>
      <div style={{ fontSize: 11, opacity: .62, fontWeight: 900 }}>CONTRIBUTOR FINDINGS LENS · ONE RESEARCH OS</div>
      <h2 style={{ margin: "5px 0 8px", fontSize: 26 }}>כל הממצאים של {projection.contributor.displayName}</h2>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, opacity: .78 }}>
        זו עדשת provenance על אותו Research OS. צבי הוא מי שהביא את החומר — לא “עולם צבי” נפרד.
        מקור, ממצא, אימות, Topic ופרסום נשארים שכבות שונות.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginTop: 14 }}>
        {[
          ["מקורות עם ממצאים", projection.counts.sourceGroups],
          ["ממצאים שחולצו", projection.counts.researchObjects],
          ["אימותי מנוע", projection.counts.engineVerified],
          ["Topics קיימים", projection.counts.topics],
          ["ערכים מספריים", projection.counts.uniqueValues],
        ].map(([label, value]) => <div key={label} style={{ ...box, padding: 10 }}><strong style={{ fontSize: 20 }}>{value}</strong><div style={{ fontSize: 10.5, opacity: .65 }}>{label}</div></div>)}
      </div>
    </header>

    <div style={{ ...box, padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {[
          ["recent", `חדש · ${recentDays} ימים`],
          ["all", "כל הממצאים"],
          ["verified", "עם אימות מנוע"],
          ["topics", `Topics · ${projection.counts.topics}`],
        ].map(([key, label]) => <button key={key} type="button" onClick={() => setMode(key)} aria-pressed={mode === key} style={{ ...pill, cursor: "pointer", fontWeight: mode === key ? 950 : 750 }}>{label}</button>)}
      </div>

      {worlds.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setWorld("all")} style={{ ...pill, cursor: "pointer", fontWeight: world === "all" ? 950 : 750 }}>כל העולמות</button>
        {worlds.map(([label, count]) => <button key={label} type="button" onClick={() => setWorld(label)} style={{ ...pill, cursor: "pointer", fontWeight: world === label ? 950 : 750 }}>{label} · {count}</button>)}
      </div> : null}

      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חפש ביטוי, מספר, ממצא, עולם או תגית…" style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--border, rgba(128,128,128,.25))", borderRadius: 10, padding: "10px 12px", background: "transparent", color: "inherit" }} />
    </div>

    {mode === "topics" ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
        {(projection.topics || []).map((topic) => <TopicCard key={topic.id} topic={topic} />)}
      </div>
    ) : groups.length ? (
      <div style={{ display: "grid", gap: 12 }}>
        {groups.map((group) => <SourceGroup key={group.id} group={group} />)}
      </div>
    ) : <div style={{ ...box, padding: 18 }}>אין חומר במסנן הזה.</div>}

    <footer style={{ fontSize: 10.5, lineHeight: 1.55, opacity: .6 }}>
      {projection.truthBoundary}<br />
      {projection.topicAdmission}
    </footer>
  </section>;
}
