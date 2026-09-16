import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { applySeo } from "../lib/seo.js";

function subjectKey(subject) {
  if (!subject?.id || !subject?.type) return null;
  return `${subject.type}:${subject.id}`;
}

function WorldBody() {
  const research = useResearch();
  const shell = use2029Shell();
  const context = research.context || null;
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const subject = context?.subject || null;
  const key = subjectKey(subject);

  useEffect(() => {
    research.updateResearchContext?.({ lens: "world" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    if (!subject?.id || !subject?.type) {
      setState({ loading: false, data: null, error: null });
      return () => { alive = false; };
    }
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type: subject.type, key: subject.id, relationLimit: 80, researchLimit: 40, topicLimit: 10 })
      .then(data => alive && setState({ loading: false, data, error: null }))
      .catch(error => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [key]);

  const setAnchor = (e) => {
    e?.preventDefault?.();
    const raw = query.trim();
    if (!raw) return;
    const numeric = /^\d+$/.test(raw);
    const id = numeric ? String(Number(raw)) : raw;
    const type = numeric ? "number" : "phrase";
    research.setResearchContext?.({
      subject: { id, type, label: id, href: `/number/${encodeURIComponent(id)}` },
      selection: { entityId: id, entityType: type },
      lens: "world",
      returnTo: context?.returnTo || null,
    });
  };

  const data = state.data;
  const counts = useMemo(() => ({
    relations: data?.graph?.relations?.length || 0,
    findings: data?.research?.findings?.length || 0,
    sources: data?.sources?.length || 0,
    worlds: data?.numberWorlds?.length || 0,
    timeline: data?.timeline?.length || 0,
  }), [data]);
  const hasWorldDepth = Object.values(counts).filter(v => v > 0).length >= 2;

  const addRoot = () => {
    if (!data?.identity?.nodeId) return;
    research.addToResearch?.({
      id: `node:${data.identity.nodeId}`,
      type: data.identity.type,
      title: data.identity.label,
      label: data.identity.label,
      link: "/world",
      metadata: { nodeId: data.identity.nodeId, source: "world-2029" },
    });
  };

  return <>
    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">ANCHOR FIRST</div><h2>פתח עולם סביב עוגן</h2><div className="sod29-muted">World אינו מאגר עצמאי. הוא קומפוזיציה חיה סביב Number, Book, Event, Person או זהות כשירה אחרת. עוגן דל נשאר Hub דל; לא ממלאים אותו בפייק.</div></div></div>
      <form className="sod29-input-row" onSubmit={setAnchor}>
        <input className="sod29-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="מספר או ביטוי" aria-label="עוגן לעולם" />
        <button className="sod29-action primary" type="submit">פתח בעולם</button>
      </form>
    </section>

    {!subject ? <section className="sod29-section"><div className="sod29-state">אין כרגע Research Anchor פעיל. זה מצב אמיתי — העולם לא ממציא ישות רק כדי למלא מסך. התחל במספר/ביטוי למעלה, או היכנס מספר/ספר ואז חזור לעולם.</div></section> : null}
    {state.loading ? <section className="sod29-section"><div className="sod29-state">מרכיב את העולם מה־Reality Graph וה־Research OS…</div></section> : null}
    {state.error ? <section className="sod29-section"><div className="sod29-state error">ה־World adapter לא הצליח לקרוא את העוגן: {String(state.error?.message || state.error)}</div></section> : null}
    {subject && !state.loading && !state.error && !data ? <section className="sod29-section"><div className="sod29-state warn">הביטוי קיים כ־Research Context, אבל עדיין אין לו זהות Graph שניתנת להקרנה כ־World. לא נוצר Node אוטומטית. אפשר לפתוח אותו בדף המספר/ביטוי או להעמיק בהיכל.</div><div className="sod29-actions"><Link className="sod29-action" to={subject.href || `/number/${encodeURIComponent(subject.id)}`}>פתח דף מספר/ביטוי</Link><Link className="sod29-action primary" to="/heichal">העמק בהיכל</Link></div></section> : null}

    {data ? <>
      <section className="sod29-section">
        <div className="sod29-section-head"><div><div className="sod29-kicker">ONE REALITY · MANY VIEWS</div><h2>{data.identity.label}</h2><div className="sod29-muted">זהות אחת. העולם מציג רק שכבות שקיימות באמת כרגע.</div></div><div className="sod29-actions"><button className="sod29-action" onClick={addRoot}>＋ הוסף למחקר</button><button className="sod29-action" onClick={() => shell.openRaziel()}>✦ רזיאל</button><Link className="sod29-action primary" to="/heichal">◇ היכל</Link></div></div>
        <div className="sod29-grid">
          <div className="sod29-card"><div className="sod29-stat">{counts.relations}</div><div className="sod29-stat-label">קשרים חיים</div></div>
          <div className="sod29-card"><div className="sod29-stat">{counts.findings}</div><div className="sod29-stat-label">Research Findings</div></div>
          <div className="sod29-card"><div className="sod29-stat">{counts.sources}</div><div className="sod29-stat-label">מקורות</div></div>
          <div className="sod29-card"><div className="sod29-stat">{counts.worlds}</div><div className="sod29-stat-label">World lenses</div></div>
          <div className="sod29-card"><div className="sod29-stat">{counts.timeline}</div><div className="sod29-stat-label">נקודות זמן</div></div>
          <div className="sod29-card"><div className="sod29-stat">{hasWorldDepth ? "חי" : "דל"}</div><div className="sod29-stat-label">עומק הקרנה נוכחי</div></div>
        </div>
      </section>

      {data.graph?.relations?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">TYPED RELATIONS</div><h2>קשרים</h2></div></div><div className="sod29-list">{data.graph.relations.slice(0, 12).map((f, i) => <div className="sod29-row" key={f.id || i}><div><strong>{f.subject?.label || f.projection?.relations?.[0]?.type || "קשר"}</strong><small>{f.projection?.relations?.[0]?.type || f.kind || "graph-relation"}</small></div></div>)}</div></section> : null}

      {data.research?.findings?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">LIVING RESEARCH</div><h2>מחקר חי</h2><div className="sod29-muted">Finding, Claim, Interpretation ו־Candidate אינם אותה דרגה. התצוגה אינה משנה את ה־Truth Axes.</div></div></div><div className="sod29-list">{data.research.findings.slice(0, 10).map((f, i) => <div className="sod29-row" key={f.id || i}><div><strong>{f.statement || f.subject?.label || f.kind}</strong><small>{f.stage || f.kind || "research"} · {f.verification?.verification_state || "verification unknown"}</small></div></div>)}</div></section> : null}

      {data.sources?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">SOURCES</div><h2>מקורות</h2></div><Link className="sod29-action" to="/books">פתח ספרים ומקורות</Link></div><div className="sod29-list">{data.sources.slice(0, 10).map((s, i) => <div className="sod29-row" key={`${s.ref || s.label}-${i}`}><div><strong>{s.label || s.ref || "מקור"}</strong><small>{s.ref || "Source ref"}</small></div></div>)}</div></section> : null}

      {data.timeline?.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">TEMPORAL LENS</div><h2>ציר זמן מחקרי</h2></div></div><div className="sod29-list">{data.timeline.slice(-8).map((item, i) => <div className="sod29-row" key={`${item.id || i}-${item.at || ""}`}><div><strong>{item.label || item.kind || "שינוי"}</strong><small>{item.at ? new Date(item.at).toLocaleDateString("he-IL") : "זמן לא ידוע"}</small></div></div>)}</div></section> : null}
    </> : null}
  </>;
}

export default function World2029Page() {
  useEffect(() => { applySeo({ title: "העולם · SOD1820", description: "Research World דינמי מעל One Reality", path: "/world" }); }, []);
  return <Sod2029Shell eyebrow="ONE REALITY · DYNAMIC WORLD" title="העולם" description="העולם אינו Topic tree ואינו גרף שני. הוא Research World שמורכב בזמן אמת סביב עוגן וקונטקסט אמיתיים."><WorldBody /></Sod2029Shell>;
}
