import React, { useEffect, useState } from "react";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import ConvergenceGolden2029 from "../components/experience2029/ConvergenceGolden2029.jsx";
import "../components/experience2029/convergenceGolden2029.css";
import { supabase } from "../lib/supabase.js";
import { compileConvergenceScene, compileMotionProjection } from "../lib/spatial/semanticSceneCompiler.js";
import { Link, useParams } from "react-router-dom";
import ResearchIcon from "../components/ResearchIcon.jsx";
import SignatureResearchIcon from "../components/SignatureResearchIcon.jsx";
import "./EntityHubIconNorthStar.css";
import "./EntityHubMicroMotion.css";
import "./EntityHubSpatial2029.css";
import "./EntityHubLivingDoorway.css";
import "./EntityHubSpatialModes.css";

const tools = [
  { name: "gematria", label: "גימטריה", sub: "אות ⇄ מספר", tone: "heritage", tier: "T2" },
  { name: "els", label: "דילוגי אותיות", sub: "מסלול חי בתוך הטקסט", tone: "connection", tier: "T3" },
  { name: "cipher", label: "צופן", sub: "שכבות וקשרים", tone: "research", tier: "T2" },
  { name: "book", label: "ספרים", sub: "מקור · עד · הקשר", tone: "heritage", tier: "T1" },
  { name: "spatial", label: "מרחב", sub: "צירים · עומק · מבנה", tone: "intelligence", tier: "T3" },
];

const mini = [
  ["graph", "קשרים", "connection"], ["time", "זמן", "connection"], ["layers", "שכבות", "research"],
  ["gallery", "גלריה", "connection"], ["dna", "DNA", "intelligence"], ["globe", "עולם", "connection"],
  ["scan", "סריקה", "research"], ["spark", "גילוי", "heritage"],
];

const GOLDEN_METHOD_FOCUS = Object.freeze({
  milui: Object.freeze({ expression: "אופק אדנק", methodKey: "מילוי", label: "אופק אדנק · מילוי" }),
  mistater: Object.freeze({ expression: "התגלות", methodKey: "מסתתר", label: "התגלות · מסתתר" }),
  regular: Object.freeze({ expression: "וראית את אחרי", methodKey: "רגיל", label: "וראית את אחרי · רגיל" }),
});

function EntityHubPreviewBody() {
  const { key = "1237" } = useParams();
  const label = decodeURIComponent(String(key || "1237"));
  const requestedMode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mode") : null;
  const mode = requestedMode === "light" || requestedMode === "lab" ? requestedMode : "dark";
  const shell = use2029Shell();
  const research = useResearch();
  const [goldenFocus,setGoldenFocus]=useState("milui");
  const [regularSource,setRegularSource]=useState(null);
  const [regularSourceStatus,setRegularSourceStatus]=useState("idle");
  const [convergenceScene,setConvergenceScene]=useState(null);
  const [convergenceMotion,setConvergenceMotion]=useState(null);
  const [convergenceStatus,setConvergenceStatus]=useState("idle");

  useEffect(() => {
    let active=true;
    if(label!=="1237" || goldenFocus!=="regular"){
      setRegularSource(null);
      setRegularSourceStatus("idle");
      return () => { active=false; };
    }
    setRegularSource(null);
    setRegularSourceStatus("loading");
    supabase.from("tanach_verses")
      .select("book,chapter,verse,text")
      .eq("book","שמות")
      .eq("chapter",33)
      .eq("verse",23)
      .maybeSingle()
      .then(({data,error})=>{
        if(!active) return;
        if(error || data?.book!=="שמות" || Number(data?.chapter)!==33 || Number(data?.verse)!==23){
          setRegularSourceStatus("unverified");
          return;
        }
        setRegularSource(data);
        setRegularSourceStatus("ready");
      });
    return () => { active=false; };
  }, [label,goldenFocus]);

  useEffect(() => {
    let active=true;
    if(label!=="1237" || goldenFocus!=="convergence"){
      setConvergenceScene(null);
      setConvergenceMotion(null);
      setConvergenceStatus("idle");
      return () => { active=false; };
    }

    setConvergenceScene(null);
    setConvergenceMotion(null);
    setConvergenceStatus("loading");

    Promise.all([
      supabase.rpc("gematria_method_trace", { p_method_key: "מילוי", p_phrase: "אופק אדנק" }),
      supabase.rpc("gematria_method_trace", { p_method_key: "מסתתר", p_phrase: "התגלות" }),
      supabase.rpc("gematria_method_trace", { p_method_key: "רגיל", p_phrase: "וראית את אחרי" }),
    ]).then((responses)=>{
      if(!active) return;
      const [ofek,hitgalut,achorai]=responses;
      if(ofek.error||hitgalut.error||achorai.error){
        setConvergenceStatus("unverified");
        return;
      }
      const traces=[ofek.data,hitgalut.data,achorai.data];
      const valid=traces.every((trace)=>
        trace?.verification?.parity===true &&
        Number(trace?.result)===Number(label)
      );
      if(!valid){
        setConvergenceStatus("unverified");
        return;
      }

      try{
        const routes=[
          {expression:"אופק אדנק",methodKey:"מילוי",variantSource:"engine_default",engineTrace:{...traces[0],engine_verified:true,value:Number(traces[0].result)}},
          {expression:"התגלות",methodKey:"מסתתר",engineTrace:{...traces[1],engine_verified:true,value:Number(traces[1].result)}},
          {expression:"וראית את אחרי",methodKey:"רגיל",engineTrace:{...traces[2],engine_verified:true,value:Number(traces[2].result)}},
        ];
        const scene=compileConvergenceScene({
          convergenceId:"golden-1237-ofek-hitgalut-achorai",
          value:Number(label),
          routes,
        });
        const motion=compileMotionProjection(scene,{projectionId:"tzofen-batarbut-001-1237"});
        setConvergenceScene(scene);
        setConvergenceMotion(motion);
        setConvergenceStatus("ready");
      }catch{
        setConvergenceStatus("unverified");
      }
    });

    return () => { active=false; };
  }, [label,goldenFocus]);

  const activeMethodFocus = GOLDEN_METHOD_FOCUS[goldenFocus] || null;

  const openGoldenMethodFocus = (focusKey) => {
    const spec = GOLDEN_METHOD_FOCUS[focusKey];
    const root = Number(label);
    if (!spec || !Number.isSafeInteger(root)) return;

    setGoldenFocus(focusKey);
    const current = research.context || null;
    const selection = {
      entityId: String(root),
      entityType: "number",
      expression: spec.expression,
      method: spec.methodKey,
      resultValue: root,
    };
    const dimensions = {
      ...(current?.dimensions || {}),
      contextualGolden: {
        id: "1237",
        source: "entity-hub-preview",
        focus: focusKey,
      },
    };

    if (current?.subject?.type === "number" && String(current.subject.id) === String(root)) {
      research.updateResearchContext?.({ selection, lens: "number", dimensions });
    } else {
      research.setResearchContext?.({
        subject: { id: String(root), type: "number", label: String(root), href: `/2029/number/${root}` },
        selection,
        lens: "number",
        locale: current?.locale || "he",
        dimensions,
        journey: current?.journey || null,
        returnTo: current?.returnTo || null,
      });
    }

    shell.openCapability?.("number", {
      id: spec.expression,
      type: "phrase",
      label: spec.expression,
      source: "golden-1237",
    });
  };

  const selectGoldenFocus = (focusKey) => {
    if (focusKey === "convergence") {
      shell.closeTransient?.();
      setGoldenFocus("convergence");
      return;
    }
    openGoldenMethodFocus(focusKey);
  };

  useEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.getAttribute("data-theme");
    const previousEnvironment = root.getAttribute("data-environment");

    if (mode === "light") {
      root.setAttribute("data-theme", "light");
      root.removeAttribute("data-environment");
    } else if (mode === "lab") {
      root.removeAttribute("data-theme");
      root.setAttribute("data-environment", "research_lab");
    }

    return () => {
      if (previousTheme == null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", previousTheme);
      if (previousEnvironment == null) root.removeAttribute("data-environment");
      else root.setAttribute("data-environment", previousEnvironment);
    };
  }, [mode]);

  return <div className={`sp29 sp29--${mode}`} dir="rtl" data-projection-mode={mode}>
    <div className="sp29-space" aria-hidden="true">
      <i className="sp29-nebula sp29-nebula-a"/><i className="sp29-nebula sp29-nebula-b"/>
      <i className="sp29-star s1"/><i className="sp29-star s2"/><i className="sp29-star s3"/><i className="sp29-star s4"/><i className="sp29-star s5"/>
      <div className="sp29-horizon"/>
    </div>

    <section className="sp29-hero" aria-labelledby="sp29-title">
      <div className="sp29-copy">
        <span className="sp29-kicker">ONE REALITY GRAPH · ONE RESEARCH OS</span>
        <h1 id="sp29-title">לא דף. <strong>מרחב מחקר.</strong></h1>
        <p>הישות נשארת אחת. רק הייצוג עולה ויורד בעומק לפי ההקשר, המכשיר והערך המחקרי.</p>
        <div className="sp29-actions"><a href="#doorways" className="primary">ראה דלתות חיות</a><Link to="/cross">מצא קשר</Link></div>
        <div className="sp29-rule"><b>2029 RULE</b><span>עומק כשיש משמעות · מהירות כשאין צורך בעומק</span></div>
      </div>

      <div className="sp29-stage" aria-label={`ישות ${label} במרחב מחקר`}>
        <div className="sp29-orbit orbit-a"/><div className="sp29-orbit orbit-b"/><div className="sp29-orbit orbit-c"/>
        <div className="sp29-axis axis-x"/><div className="sp29-axis axis-y"/>
        <div className="sp29-core"><span className="sp29-core-label">ENTITY</span><strong>{label}</strong><small>Research Context</small></div>
        <div className="sp29-node node-a"><ResearchIcon name="graph" tone="connection" size={20}/><span>12 קשרים</span></div>
        <div className="sp29-node node-b"><ResearchIcon name="time" tone="connection" size={20}/><span>ציר זמן</span></div>
        <div className="sp29-node node-c"><ResearchIcon name="dna" tone="intelligence" size={20}/><span>Research DNA</span></div>
        <div className="sp29-node node-d"><ResearchIcon name="source" tone="heritage" size={20}/><span>מקורות</span></div>
      </div>
    </section>

    {label === "1237" ? <section className="sp29-tools" aria-labelledby="golden-1237-focus-title" data-experience-surface="golden-1237-focus">
      <div className="sp29-section-head">
        <div><span>GOLDEN 1237 · ONE ACTIVE VIEW</span><h2 id="golden-1237-focus-title">1237 — אותה אמת, נתיב אחד פעיל בכל רגע</h2></div>
        <p>בוחרים נתיב אחד. רק התצוגה הפעילה נטענת; שאר הנתיבים נשארים שקטים עד שבוחרים אותם.</p>
      </div>

      <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap",marginBottom:18}}>
        {[
          ["milui","אופק אדנק · מילוי"],
          ["mistater","התגלות · מסתתר"],
          ["regular","וראית את אחרי · רגיל"],
          ["convergence","שלושת הנתיבים"],
        ].map(([key,text])=><button
          key={key}
          type="button"
          aria-pressed={goldenFocus===key}
          onClick={()=>selectGoldenFocus(key)}
        >{text}</button>)}
      </div>

      {activeMethodFocus ? <div
        data-experience-surface={`golden-1237-${goldenFocus}`}
        data-contextual-entry="sidecar"
      >
        <div className="sp29-section-head">
          <div><span>CONTEXTUAL SIDECAR · FOCUS</span><h3>{activeMethodFocus.label}</h3></div>
          <p>ה־Spatial Method Stage החי שייך לחלונית ההקשר. כאן נשאר רק שער הכניסה — בלי renderer מקביל ובלי Trace כפול.</p>
        </div>
        {goldenFocus === "regular" && regularSource ? <>
          <p className="sod29-spatial-source-note">שמות לג:כג · מקור הפסוק אומת לפני הצגתו.</p>
          <blockquote className="sod29-regular-verse__verse">והסרתי את כפי <mark>וראית את אחרי</mark> ופני לא יראו</blockquote>
        </> : null}
        {goldenFocus === "regular" && regularSourceStatus === "unverified" ? <p aria-live="polite">מקור הפסוק לא אומת כרגע ולכן אינו מוצג.</p> : null}
        <button
          type="button"
          data-experience-action="golden-contextual-focus"
          onClick={()=>openGoldenMethodFocus(goldenFocus)}
        >פתח FOCUS · {activeMethodFocus.label}</button>
      </div> : null}

      {goldenFocus === "convergence" ? <div data-experience-surface="golden-1237-convergence">
        <div className="sp29-section-head"><div><span>CONVERGENCE</span><h3>שלושה נתיבים — 1237 אחד</h3></div><p>רק כאן נטענים שלושת ה־Traces יחד, מאומתים בנפרד ואז נפגשים.</p></div>
        <ConvergenceGolden2029 scene={convergenceScene} motion={convergenceMotion}/>
        {convergenceStatus === "loading" ? <p aria-live="polite">מאמת את שלושת הנתיבים מול המנוע הקנוני…</p> : null}
        {convergenceStatus === "unverified" ? <p aria-live="polite">ההתכנסות לא מוצגת עד שכל שלושת הנתיבים מאומתים לאותו ערך.</p> : null}
      </div> : null}
    </section> : null}

    <section id="tools" className="sp29-tools" aria-labelledby="sp29-tools-title">
      <div className="sp29-section-head"><div><span>PRODUCT SIGNATURES · SPATIAL READY</span><h2 id="sp29-tools-title">כל כלי מקבל נוכחות משלו במרחב</h2></div><p>אותו glyph עובר מאייקון קטן → Signature → ייצוג מרחבי, בלי להחליף זהות.</p></div>
      <div className="sp29-tool-deck">{tools.map((tool, i) => <article className={`sp29-tool-card card-${i+1}`} key={tool.name} tabIndex={0}><div className="sp29-tool-depth" aria-hidden="true"/><div className="sp29-tool-icon"><SignatureResearchIcon name={tool.name} tone={tool.tone} label={tool.label}/></div><div className="sp29-tool-copy"><span>{tool.tier}</span><h3>{tool.label}</h3><p>{tool.sub}</p></div><ResearchIcon name="portal" tone={tool.tone} size={19}/></article>)}</div>
    </section>

    <section id="doorways" className="sp29-doorways" aria-labelledby="sp29-doorways-title">
      <div className="sp29-section-head"><div><span>LIVING DOORWAY · EXPERIENCE v8</span><h2 id="sp29-doorways-title">הדלת מראה רק רמז אחד למה שמחכה מאחוריה</h2></div><p>One doorway = one dominant preview signal. בלי מיני־דף ובלי עומס.</p></div>
      <div className="sp29-doorway-grid">
        <article className="living-door living-door--featured" tabIndex={0}>
          <span className="living-door__hint">FOCUS TO OPEN</span><div className="living-door__frame" aria-hidden="true"/>
          <div className="living-door__preview"><div className="living-door__content"><small>GEMATRIA</small><strong>{label}</strong><div className="living-door__space" aria-hidden="true"><i/><i/><b/></div></div><div className="living-door__veil"/></div>
          <div className="living-door__meta"><b>T2 · ONE SIGNAL</b><span><ResearchIcon name="gematria" tone="heritage" size={18}/>מספר + קשר אחד</span></div>
        </article>

        <article className="living-door" tabIndex={0}>
          <span className="living-door__hint">LIVE FRAGMENT</span><div className="living-door__frame" aria-hidden="true"/>
          <div className="living-door__preview"><div className="living-door__content"><small>ELS</small><div className="living-door__els-grid" aria-hidden="true"><span className="living-door__els-path"/></div></div><div className="living-door__veil"/></div>
          <div className="living-door__meta"><b>T2 · ONE SIGNAL</b><span><ResearchIcon name="els" tone="connection" size={18}/>מטריצה + מסלול</span></div>
        </article>

        <article className="living-door" tabIndex={0}>
          <span className="living-door__hint">SOURCE PREVIEW</span><div className="living-door__frame" aria-hidden="true"/>
          <div className="living-door__preview"><div className="living-door__content"><small>BOOK / SOURCE</small><div className="living-door__book" aria-hidden="true"><i className="living-door__page left"/><i className="living-door__page right"/></div></div><div className="living-door__veil"/></div>
          <div className="living-door__meta"><b>T1 · ONE SIGNAL</b><span><ResearchIcon name="book" tone="heritage" size={18}/>עמוד / פתיחה</span></div>
        </article>
      </div>
    </section>

    <section id="journey" className="sp29-journey" aria-labelledby="sp29-journey-title">
      <div className="sp29-gateway" aria-hidden="true"><div className="gate-frame frame-1"/><div className="gate-frame frame-2"/><div className="gate-frame frame-3"/><div className="gate-light"/><div className="gate-floor"/></div>
      <div className="sp29-journey-copy"><span>JOURNEY · T3 EXPERIENCE</span><h2 id="sp29-journey-title">מכאן הדלת יכולה להמשיך לאותו מרחב.</h2><p>אם יש ערך אמיתי להמשכיות, המעבר ממשיך מאותו fragment אל היעד. אם לא — הניווט נשאר פשוט ומהיר ולא מזייף 3D.</p><button type="button"><ResearchIcon name="door" tone="heritage" size={24}/>פתח מסע לדוגמה</button></div>
    </section>

    <section className="sp29-mini" aria-labelledby="sp29-mini-title"><div className="sp29-section-head"><div><span>T1 · FUNCTIONAL MICRO-MOTION</span><h2 id="sp29-mini-title">אותה שפה גם באייקונים הקטנים</h2></div><p>קטן לא אומר שטוח. הוא פשוט משתמש בדרגת העומק הנמוכה שמספיקה.</p></div><div className="sp29-mini-grid">{mini.map(([name,text,tone]) => <button key={name} type="button"><ResearchIcon name={name} tone={tone} size={25}/><span>{text}</span></button>)}</div></section>

    <footer className="sp29-footer"><span>FOUNDATION → PROJECTION → EXPERIENCE</span><b>EXPERIENCE v8 · CONTEXTUAL DEPTH · ONE TREE</b><span>Preview only · not production</span></footer>
  </div>;
}

export default function EntityHubPreviewPage() {
  return <Sod2029Shell
    wide
    surface="number"
    symbol="123"
    status="GOLDEN 1237 · CONTEXTUAL SIDECAR"
  >
    <EntityHubPreviewBody />
  </Sod2029Shell>;
}
