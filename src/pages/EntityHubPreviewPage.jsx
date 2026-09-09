import React, { useEffect } from "react";
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

export default function EntityHubPreviewPage() {
  const { key = "1237" } = useParams();
  const label = decodeURIComponent(String(key || "1237"));
  const requestedMode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mode") : null;
  const mode = requestedMode === "light" || requestedMode === "lab" ? requestedMode : "dark";

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

  return <main className={`sp29 sp29--${mode}`} dir="rtl" data-projection-mode={mode}>
    <div className="sp29-space" aria-hidden="true">
      <i className="sp29-nebula sp29-nebula-a"/><i className="sp29-nebula sp29-nebula-b"/>
      <i className="sp29-star s1"/><i className="sp29-star s2"/><i className="sp29-star s3"/><i className="sp29-star s4"/><i className="sp29-star s5"/>
      <div className="sp29-horizon"/>
    </div>

    <header className="sp29-top">
      <a href="/" className="sp29-brand"><img src="/crown.png" alt=""/><span>SOD1820<small>RESEARCH REALITY · 2029</small></span></a>
      <div className="sp29-status"><b>SPATIAL v4</b><span>LIVING DOORWAY · ONE TREE</span></div>
      <nav><a href="#tools">כלים</a><a href="#doorways">דלתות חיות</a><a href="#journey">מסע</a><Link to={`/number/${encodeURIComponent(label)}`}>דף חי</Link></nav>
    </header>

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

    <section id="tools" className="sp29-tools" aria-labelledby="sp29-tools-title">
      <div className="sp29-section-head"><div><span>PRODUCT SIGNATURES · SPATIAL READY</span><h2 id="sp29-tools-title">כל כלי מקבל נוכחות משלו במרחב</h2></div><p>אותו glyph עובר מאייקון קטן → Signature → ייצוג מרחבי, בלי להחליף זהות.</p></div>
      <div className="sp29-tool-deck">{tools.map((tool, i) => <article className={`sp29-tool-card card-${i+1}`} key={tool.name} tabIndex={0}><div className="sp29-tool-depth" aria-hidden="true"/><div className="sp29-tool-icon"><SignatureResearchIcon name={tool.name} tone={tool.tone} label={tool.label}/></div><div className="sp29-tool-copy"><span>{tool.tier}</span><h3>{tool.label}</h3><p>{tool.sub}</p></div><ResearchIcon name="portal" tone={tool.tone} size={19}/></article>)}</div>
    </section>

    <section id="doorways" className="sp29-doorways" aria-labelledby="sp29-doorways-title">
      <div className="sp29-section-head"><div><span>LIVING DOORWAY · SPATIAL v4</span><h2 id="sp29-doorways-title">הדלת מראה רק רמז אחד למה שמחכה מאחוריה</h2></div><p>One doorway = one dominant preview signal. בלי מיני־דף ובלי עומס.</p></div>
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

    <footer className="sp29-footer"><span>FOUNDATION → PROJECTION → EXPERIENCE</span><b>SPATIAL v4 · LIVING DOORWAY · ONE TREE</b><span>Preview only · not production</span></footer>
  </main>;
}
