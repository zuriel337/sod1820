import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { resolveExpressionFocus } from "../lib/research/numberExpressionFocus.js";
import { composeResearchW2 } from "../lib/research/researchComposerW2.js";
import { createCanonicalNumberW2Executors } from "../lib/research/researchW2Executors.js";
import { RESEARCH_IDENTITY_CONFIDENCE, RESEARCH_IDENTITY_SOURCE } from "../lib/research/researchIdentityResolver.js";
import { isRazielNextAction } from "../lib/research/razielActionContract.js";
import { supabase } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";
import GematriaOpeningProjection from "../components/heichal/GematriaOpeningProjection.jsx";

const ACTIONS = [
  { id: "calculate", label: "חשב", detail: "Gematria Calculator", to: "/research?tool=gematria", live: true },
  { id: "sources", label: "חפש במקורות", detail: "Books / Sources", to: "/books", live: true },
  { id: "text", label: "חקור טקסט", detail: "ELS / Biblical Cipher", to: "/els", live: true },
  { id: "world", label: "פתח בעולם", detail: "Research World", to: "/world", live: true },
  { id: "compare", label: "השווה", detail: "Compare research mode", live: false },
  { id: "patterns", label: "חקור דפוס", detail: "Pattern / Sequence workbench", live: false },
  { id: "person", label: "חקור אדם / חיים", detail: "Life Journey / Person", live: false },
];

function NoContextEntry() {
  const research = useResearch();
  const shell = use2029Shell();
  const [query, setQuery] = useState("");

  const start = async (e) => {
    e?.preventDefault?.();
    const raw = query.trim();
    if (!raw) return;
    const numeric = /^\d+$/.test(raw);
    if (numeric) {
      const id = String(Number(raw));
      research.setResearchContext?.({
        subject: { id, type: "number", label: id, href: `/2029/number/${id}` },
        selection: { entityId: id, entityType: "number" },
        lens: "heichal",
        locale: "he",
      });
      return;
    }

    try {
      const focus = await resolveExpressionFocus(raw);
      if (focus?.href) {
        research.setResearchContext?.({
          subject: { id: String(focus.root), type: "number", label: String(focus.root), href: focus.href },
          selection: {
            entityId: String(focus.root),
            entityType: "number",
            expression: focus.expression,
            method: focus.method,
            resultValue: focus.resultValue,
            focusKind: "expression",
          },
          lens: "heichal",
          locale: "he",
          dimensions: { expressionFocusExplicit: true, focusOrigin: "heichal-entry" },
        });
        return;
      }
    } catch { /* honest phrase fallback below */ }

    research.setResearchContext?.({
      subject: { id: raw, type: "phrase", label: raw, href: "/heichal" },
      selection: { entityId: raw, entityType: "phrase" },
      lens: "heichal",
      locale: "he",
    });
  };

  return <>
    <section className="sod29-focus-stage">
      <div className="sod29-command-shell">
        <div className="sod29-command-copy">
          <div className="sod29-kicker">INTENTION FIRST</div>
          <h2>היכל מתחיל משאלה,<br />לא מקיר של כלים.</h2>
          <div className="sod29-muted">קבע עוגן או כוונת מחקר. ה־Context Compiler ירכיב סביבם את היכולות המחוברות בלי לפתוח מערכת נפרדת לכל פעולה.</div>
          <form className="sod29-command-bar" onSubmit={start}>
            <input className="sod29-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="מספר, ביטוי או שאלה שממנה נתחיל" aria-label="נושא למחקר בהיכל" />
            <button className="sod29-action primary" type="submit">קבע עוגן מחקר</button>
          </form>
        </div>
        <div className="sod29-orbit-map" aria-hidden="true">
          <div className="sod29-orbit-center">כוונה<br />אחת</div>
          <span className="sod29-orbit-node n1">חשב</span>
          <span className="sod29-orbit-node n2">מקורות</span>
          <span className="sod29-orbit-node n3">ELS</span>
          <span className="sod29-orbit-node n4">רזיאל</span>
        </div>
      </div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">ACTION FAMILIES</div><h2>או התחל מפעולה</h2><div className="sod29-muted">אלה כוונות כניסה, לא אפליקציות נפרדות. ה־Research Context נשאר אותו Context.</div></div></div>
      <div className="sod29-constellation">
        {ACTIONS.map(a => a.live
          ? <Link className="sod29-card sod29-action-card" to={a.to} key={a.id}><h3>{a.label}</h3><p>{a.detail}</p><div className="sod29-actions"><span className="sod29-chip">מחובר</span></div></Link>
          : <div className="sod29-card sod29-action-card sod29-placeholder" key={a.id}><h3>{a.label}</h3><p>{a.detail}</p><div className="sod29-muted">ה־Foundation קיים; adapter/runtime של המצב הזה עדיין לא מחובר להיכל.</div></div>)}
        <button className="sod29-card sod29-action-card sod29-card-button" onClick={() => shell.openRaziel()}><h3>✦ שאל את רזיאל</h3><p>אותו רזיאל ואותו Research Context — לא צ׳אט מקביל של ההיכל.</p></button>
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

  const openRazielFromCanonicalResult = async () => {
    // First real W2 consumer is intentionally bounded to a canonical numeric identity.
    // Other Heichal subjects keep the existing generic Raziel entry until their own W2
    // executor path is real; no local adapter or route mapper is invented here.
    const numericValue = subject?.type === "number" ? Number(subject.id) : null;
    if (!Number.isSafeInteger(numericValue) || numericValue < 0) {
      shell.openRaziel();
      return;
    }

    try {
      const bundle = await composeResearchW2({
        question: "",
        intent: "research",
        rawInput: String(numericValue),
        identityCandidates: [{
          type: "number",
          id: String(numericValue),
          ref: `number:${numericValue}`,
          value: numericValue,
          label: subject.label || String(numericValue),
          source: RESEARCH_IDENTITY_SOURCE.SURFACE_CONTEXT,
          confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
        }],
        contextType: "public_user",
        surfaceContext: {
          surface: "heichal",
          subject: { type: "number", id: String(numericValue) },
        },
        executors: createCanonicalNumberW2Executors({ supabase }),
      });

      const razielRouteAction = (Array.isArray(bundle?.next_actions) ? bundle.next_actions : [])
        .find((item) => isRazielNextAction(item)) || null;

      // Invalid/missing action fails closed: generic Raziel may still open on the SAME
      // Research Context, but no caller-supplied or locally synthesized action is forwarded.
      shell.openRaziel(razielRouteAction ? { razielRouteAction } : null);
    } catch {
      // The existing context survives a failed W2 run; there is no local answer/fallback text.
      shell.openRaziel();
    }
  };

  const selectionText = [
    context?.selection?.entityType && context?.selection?.entityId ? `${context.selection.entityType}:${context.selection.entityId}` : null,
    context?.selection?.expression ? `ביטוי: ${context.selection.expression}` : null,
    context?.selection?.method ? `שיטה: ${context.selection.method}` : null,
    context?.selection?.crossingPartner ? `הצלבה: ${context.selection.crossingPartner}` : null,
    context?.selection?.sourceRef || null,
    context?.selection?.locator || null,
  ].filter(Boolean).join(" · ");

  return <>
    <section className="sod29-section sod29-resume-panel">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">RESEARCH CONTEXT COMPILED</div><h2>{subject.label || subject.id}</h2><div className="sod29-muted">העוגן נשאר יציב; ה־Canvas והפעולות מתחלפים סביבו. בחירה בכלי אינה פתיחת אפליקציה חדשה.</div></div>
        <div className="sod29-actions"><button className="sod29-action" onClick={addSubject}>＋ הוסף למחקר</button><button className="sod29-action" onClick={openRazielFromCanonicalResult}>✦ רזיאל</button><button className="sod29-action primary" onClick={() => shell.returnExact()}>↩ חזרה מדויקת</button></div>
      </div>
      <div className="sod29-spine" aria-label="Research Spine">
        <span>שורש · {subject.label || subject.id}</span>
        {selectionText ? <span>בחירה · {selectionText}</span> : null}
        <span>היכל · Deep Research</span>
      </div>
      <div className="sod29-muted" style={{ marginTop: 9 }}>Research Spine מקרין את ה־Context הקיים. הוא לא טוען ל־research_path שמור אם runtime כזה עדיין לא נוצר.</div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">RESEARCH CANVAS</div><h2>משטח העבודה</h2><div className="sod29-muted">זהו המוקד: עובדות, ממצאים, מקורות וקשרים נאספים סביב אותו Root, עם Evidence Inspector לצדם.</div></div></div>
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

    {context?.selection?.expression ? (
      <GematriaOpeningProjection
        expression={context.selection.expression}
        initialMethodKey={context.selection.method || null}
      />
    ) : null}

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">NEXT BEST ACTIONS</div><h2>מה אפשר לעשות עכשיו</h2><div className="sod29-muted">הפעולות נגזרות מההקשר ומהיכולות שכבר מחוברות; לא Toolbar קבוע של כל הכלים.</div></div></div>
      <div className="sod29-actions">
        <Link className="sod29-action primary" to="/research?tool=gematria">חשב / בדוק שיטה</Link>
        {data?.sources?.length ? <Link className="sod29-action" to="/books">פתח מקורות</Link> : null}
        <Link className="sod29-action" to="/els">ELS</Link>
        <Link className="sod29-action" to="/world">פתח בעולם</Link>
        <button className="sod29-action" onClick={openRazielFromCanonicalResult}>✦ שאל את רזיאל</button>
      </div>
    </section>

    <section className="sod29-section sod29-placeholder">
      <div className="sod29-section-head"><div><div className="sod29-kicker">FUTURE RENDERERS</div><h2>Journey persistence / Spatial renderer</h2></div></div>
      <p className="sod29-muted">ה־Foundation נעול, אבל research_path persistence וה־2029 Spatial renderer עדיין אינם מחוברים למסך הזה. לכן לא מוצג מסע או 3D מזויף. כשיתחברו, הם יצרכו את אותו Context/Result lineage ולא ידרשו Heichal חדש.</p>
    </section>
  </>;
}

export default function Heichal2029Page() {
  const research = useResearch();
  useEffect(() => { applySeo({ title: "היכל · SOD1820", description: "סביבת המחקר העמוקה של SOD1820 2029", path: "/heichal" }); }, []);
  const hasContext = Boolean(research.context?.subject);
  return <Sod2029Shell wide surface="heichal" symbol="◇" eyebrow="DEEP RESEARCH ENVIRONMENT" title="היכל" description="Context-Compiled Research Environment: אותו עוגן, אותו Research OS ואותו רזיאל — עם Canvas, Evidence, Findings ופעולות שמסתגלים למחקר.">{hasContext ? <ActiveResearchEnvironment /> : <NoContextEntry />}</Sod2029Shell>;
}
