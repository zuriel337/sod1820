import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { applySeo } from "../lib/seo.js";

const ACTIONS = [
  { id: "calculate", label: "חשב", detail: "Gematria Calculator", to: "/research?tool=gematria", live: true },
  { id: "sources", label: "חפש במקורות", detail: "Books / Sources", to: "/books", live: true },
  { id: "text", label: "חקור טקסט", detail: "ELS / Biblical Cipher", to: "/lab/els", live: true },
  { id: "world", label: "פתח בעולם", detail: "Research World", to: "/world", live: true },
  { id: "compare", label: "השווה", detail: "Compare research mode", live: false },
  { id: "patterns", label: "חקור דפוס", detail: "Pattern / Sequence workbench", live: false },
  { id: "person", label: "חקור אדם / חיים", detail: "Life Journey / Person", live: false },
];

function NoContextEntry() {
  const navigate = useNavigate();
  const research = useResearch();
  const shell = use2029Shell();
  const [query, setQuery] = useState("");

  const start = (e) => {
    e?.preventDefault?.();
    const raw = query.trim();
    if (!raw) return;
    const numeric = /^\d+$/.test(raw);
    const id = numeric ? String(Number(raw)) : raw;
    const type = numeric ? "number" : "phrase";
    research.setResearchContext?.({
      subject: { id, type, label: id, href: `/number/${encodeURIComponent(id)}` },
      selection: { entityId: id, entityType: type },
      lens: "heichal",
      locale: "he",
    });
  };

  return <>
    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">INTENTION FIRST</div><h2>מה נחקור עכשיו?</h2><div className="sod29-muted">ההיכל אינו קיר של כלים. הוא מתחיל מכוונת מחקר או מעוגן שכבר הבאת איתך.</div></div></div>
      <form className="sod29-input-row" onSubmit={start}>
        <input className="sod29-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="מספר, ביטוי או שאלה שממנה נתחיל" aria-label="נושא למחקר בהיכל" />
        <button className="sod29-action primary" type="submit">קבע עוגן מחקר</button>
      </form>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">ACTION FAMILIES</div><h2>או התחל מפעולה</h2><div className="sod29-muted">השמות הם כוונות כניסה. בתוך כל מסלול נשמרים שמות היכולות הקנוניים.</div></div></div>
      <div className="sod29-grid">
        {ACTIONS.map(a => a.live ? <Link className="sod29-card" to={a.to} key={a.id}><h3>{a.label}</h3><p>{a.detail}</p><div className="sod29-actions"><span className="sod29-chip">מחובר</span></div></Link> : <div className="sod29-card sod29-placeholder" key={a.id}><h3>{a.label}</h3><p>{a.detail}</p><div className="sod29-muted" style={{ marginTop: 10 }}>ה־Foundation קיים; adapter/runtime של המצב הזה עדיין לא מחובר ל־Heichal.</div></div>)}
        <button className="sod29-card" style={{ textAlign: "start", color: "inherit", font: "inherit", cursor: "pointer" }} onClick={() => shell.openRaziel()}><h3>שאל את רזיאל</h3><p>רזיאל פותח את אותו Research Context, לא צ׳אט נפרד של ההיכל.</p></button>
      </div>
    </section>
  </>;
}

function ActiveResearchEnvironment() {
  const research = useResearch();
  const shell = use2029Shell();
  const context = research.context || null;
  const subject = context?.subject;
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const key = subject ? `${subject.type}:${subject.id}` : null;

  useEffect(() => {
    research.updateResearchContext?.({ lens: "heichal" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    if (!subject?.id || !subject?.type) return () => { alive = false; };
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type: subject.type, key: subject.id, relationLimit: 100, researchLimit: 60, topicLimit: 12 })
      .then(data => alive && setState({ loading: false, data, error: null }))
      .catch(error => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [key]);

  const data = state.data;
  const counts = useMemo(() => ({
    findings: data?.research?.findings?.length || 0,
    relations: data?.graph?.relations?.length || 0,
    sources: data?.sources?.length || 0,
  }), [data]);

  const addSubject = () => {
    if (!subject) return;
    research.addToResearch?.({
      id: data?.identity?.nodeId ? `node:${data.identity.nodeId}` : `${subject.type}:${subject.id}`,
      type: subject.type,
      title: subject.label || subject.id,
      label: subject.label || subject.id,
      link: subject.href || "/heichal",
      metadata: { source: "heichal-2029", nodeId: data?.identity?.nodeId || null },
    });
  };

  const selectionText = [
    context?.selection?.entityType && context?.selection?.entityId ? `${context.selection.entityType}:${context.selection.entityId}` : null,
    context?.selection?.sourceRef || null,
    context?.selection?.locator || null,
  ].filter(Boolean).join(" · ");

  return <>
    <section className="sod29-section">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">RESEARCH CONTEXT COMPILED</div><h2>{subject.label || subject.id}</h2><div className="sod29-muted">העוגן נשאר יציב; ה־Canvas והפעולות מתחלפים סביבו. בחירה בכלי אינה פתיחת אפליקציה חדשה.</div></div>
        <div className="sod29-actions"><button className="sod29-action" onClick={addSubject}>＋ הוסף למחקר</button><button className="sod29-action" onClick={() => shell.openRaziel()}>✦ רזיאל</button><button className="sod29-action primary" onClick={() => shell.returnExact()}>↩ חזרה מדויקת</button></div>
      </div>
      <div className="sod29-spine" aria-label="Research Spine">
        <span>שורש · {subject.label || subject.id}</span>
        {selectionText ? <span>בחירה · {selectionText}</span> : null}
        <span>היכל · Deep Research</span>
      </div>
      <div className="sod29-muted" style={{ marginTop: 9 }}>Research Spine כאן מקרין את ה־Context הקיים. הוא לא טוען ל־research_path שמור אם runtime כזה עדיין לא נוצר.</div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">RESEARCH CANVAS</div><h2>משטח העבודה</h2></div></div>
      <div className="sod29-two">
        <div className="sod29-canvas">
          {state.loading ? <div className="sod29-state">מרכיב Canvas מה־Reality Graph, Research OS וה־Context הפעיל…</div> : null}
          {state.error ? <div className="sod29-state error">ה־Context נשמר, אבל ה־Entity adapter נכשל: {String(state.error?.message || state.error)}</div> : null}
          {!state.loading && !state.error && !data ? <div className="sod29-state warn">יש Research Context פעיל, אך אין Graph identity לקריאה דרך ה־Entity adapter. ההיכל לא ממציא ישות. אפשר לעבוד עם Calculator/ELS/Source ולשמור את אותו root.</div> : null}
          {data ? <>
            <div className="sod29-grid">
              <div className="sod29-card"><div className="sod29-stat">{counts.findings}</div><div className="sod29-stat-label">Findings</div></div>
              <div className="sod29-card"><div className="sod29-stat">{counts.relations}</div><div className="sod29-stat-label">Relations</div></div>
              <div className="sod29-card"><div className="sod29-stat">{counts.sources}</div><div className="sod29-stat-label">Sources</div></div>
            </div>
            {data.research?.findings?.length ? <div className="sod29-list" style={{ marginTop: 14 }}>{data.research.findings.slice(0, 8).map((f,i) => <div className="sod29-row" key={f.id || i}><div><strong>{f.statement || f.subject?.label || f.kind}</strong><small>{f.stage || f.kind || "research"} · {f.verification?.verification_state || "verification unknown"}</small></div></div>)}</div> : <div className="sod29-state" style={{ marginTop: 14 }}>אין Findings קריאים לעוגן הזה כרגע.</div>}
          </> : null}
        </div>

        <aside className="sod29-inspector">
          <div className="sod29-kicker">CONTEXT / EVIDENCE INSPECTOR</div>
          <h3 style={{ marginTop: 5 }}>מה ידוע על המצב הנוכחי</h3>
          <div className="sod29-divider" />
          <div className="sod29-muted">Subject</div><b>{subject.type}:{subject.id}</b>
          <div className="sod29-divider" />
          <div className="sod29-muted">Selection</div><b>{selectionText || "אין בחירה ממוקדת"}</b>
          <div className="sod29-divider" />
          <div className="sod29-muted">Access / Truth</div>
          <div className="sod29-actions">
            <span className="sod29-chip">projection ≠ truth</span>
            {data?.research?.access?.available === false ? <span className="sod29-chip">research protected</span> : null}
            {data?.truthLifecycle?.humanGateRequired ? <span className="sod29-chip">Human Gate</span> : null}
          </div>
          {data?.sources?.length ? <><div className="sod29-divider" /><div className="sod29-muted">מקורות זמינים</div>{data.sources.slice(0,5).map((s,i)=><div key={`${s.ref || s.label}-${i}`} style={{ fontSize: 12, marginTop: 6 }}>{s.label || s.ref}</div>)}</> : null}
        </aside>
      </div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">NEXT BEST ACTIONS</div><h2>מה אפשר לעשות עכשיו</h2><div className="sod29-muted">הפעולות נגזרות מהקשר ומהיכולות שכבר מחוברות; לא Toolbar קבוע של כל הכלים.</div></div></div>
      <div className="sod29-actions">
        <Link className="sod29-action primary" to="/research?tool=gematria">חשב / בדוק שיטה</Link>
        {data?.sources?.length ? <Link className="sod29-action" to="/books">פתח מקורות</Link> : null}
        <Link className="sod29-action" to="/lab/els">ELS</Link>
        <Link className="sod29-action" to="/world">פתח בעולם</Link>
        <button className="sod29-action" onClick={() => shell.openRaziel()}>✦ שאל את רזיאל</button>
      </div>
    </section>

    <section className="sod29-section sod29-placeholder">
      <h2>Journey persistence / Spatial renderer</h2>
      <p className="sod29-muted">ה־Foundation נעול, אבל research_path persistence וה־2029 Spatial renderer עדיין אינם מחוברים למסך הזה. לכן לא מוצג מסע או 3D מזויף. כשיתחברו, הם יצרכו את אותו Context/Result lineage ולא ידרשו Heichal חדש.</p>
    </section>
  </>;
}

export default function Heichal2029Page() {
  const research = useResearch();
  useEffect(() => { applySeo({ title: "היכל · SOD1820", description: "סביבת המחקר העמוקה של SOD1820 2029", path: "/heichal" }); }, []);
  const hasContext = Boolean(research.context?.subject);
  return <Sod2029Shell wide eyebrow="DEEP RESEARCH ENVIRONMENT" title="היכל" description="Context-Compiled Research Environment: אותו עוגן, אותו Research OS, אותו רזיאל — עם Canvas, Evidence, Findings ופעולות שמסתגלים למחקר.">{hasContext ? <ActiveResearchEnvironment /> : <NoContextEntry />}</Sod2029Shell>;
}
