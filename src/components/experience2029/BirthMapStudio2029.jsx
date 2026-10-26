import React, { lazy, Suspense, useState } from "react";
import { evaluateS4Capability, prefersReducedMotion } from "../../lib/spatial/gpuCapability.js";
import "./birth-map-studio-2029.css";

const BirthMapScene3D = lazy(() => import("./BirthMapScene3D2029.jsx"));

const LENSES = Object.freeze([
  { id: "spatial", label: "תלת־ממד" },
  { id: "human", label: "Human Design" },
  { id: "sky", label: "מפת שמיים" },
  { id: "sefer", label: "ספר יצירה" },
]);

const STATE_LABEL = Object.freeze({
  needs_date: "חסר תאריך לידה",
  needs_time: "חסרה שעת לידה מדויקת",
  needs_place: "חסר מקום לידה",
  adapter_required: "הקלט מוכן · המחשבון טרם חובר",
});

const FALLBACK_LABEL = Object.freeze({
  low_power: "במכשיר הזה נשארים בתצוגה הקלה כדי לשמור על ביצועים.",
  no_webgl: "תלת־ממד אינו זמין בדפדפן הזה; המפה הדו־ממדית נשארת מלאה.",
  context_lost: "הקשר הגרפי אבד; חזרנו לתצוגה הבטוחה.",
  render_error: "התצוגה התלת־ממדית לא נטענה; הנתונים עצמם לא נפגעו.",
  ssr: "התצוגה התלת־ממדית זמינה בדפדפן בלבד.",
});

class BirthSceneBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFallback?.("render_error"); }
  render() { return this.state.failed ? null : this.props.children; }
}

function InputReadiness({ people, lens }) {
  return <div className="birth-map-readiness">
    {people.map(person => {
      const state = lens === "human" ? person.humanDesign.state : person.sky.state;
      return <article key={person.memberRef} data-state={state}>
        <div><strong>{person.name}</strong><span>{STATE_LABEL[state]}</span></div>
        <ul aria-label={`שלמות נתוני לידה עבור ${person.name}`}>
          <li data-ready={person.readiness.hasDate}>תאריך</li>
          <li data-ready={person.readiness.hasExactTime}>שעה</li>
          <li data-ready={person.readiness.hasPlace}>מקום</li>
        </ul>
      </article>;
    })}
  </div>;
}

export default function BirthMapStudio2029({ data, seferContent }) {
  const [lens, setLens] = useState("spatial");
  const [spatialState, setSpatialState] = useState("idle");
  const [fallback, setFallback] = useState("");
  const enableSpatial = () => {
    const capability = evaluateS4Capability();
    if (!capability.ok) { setFallback(capability.reason); setSpatialState("fallback"); return; }
    setFallback("");
    setSpatialState("ready");
  };
  const onFallback = reason => { setFallback(reason); setSpatialState("fallback"); };

  return <section className="birth-map-studio" data-experience-capability="life-journey-birth-map-studio">
    <header className="birth-map-studio__hero">
      <div><small>לידה · אותיות · מערכות</small><h4>סטודיו מפת החיים</h4><p>בסיס פרטי אחד לכל העדשות — בלי לשכפל אנשים ובלי לשלוח את פרטי הלידה לשירות חיצוני.</p></div>
      <div className="birth-map-studio__seal" aria-hidden="true"><i /><b>22</b><span>3 · 7 · 12</span></div>
    </header>

    <div className="birth-map-studio__tabs" role="tablist" aria-label="עדשות מפת הלידה">
      {LENSES.map(item => <button key={item.id} type="button" role="tab" aria-selected={lens === item.id} onClick={() => setLens(item.id)}>{item.label}</button>)}
    </div>

    {lens === "spatial" ? <div className="birth-map-spatial" role="tabpanel">
      {spatialState === "ready" ? <BirthSceneBoundary onFallback={onFallback}>
        <Suspense fallback={<div className="birth-map-loading" role="status">בונה מרחב תלת־ממדי…</div>}>
          <BirthMapScene3D counts={data.letterCounts} reducedMotion={prefersReducedMotion()} onFallback={onFallback} />
        </Suspense>
      </BirthSceneBoundary> : <div className="birth-map-orbits" aria-hidden="true">
        <i className="orbit orbit--3">{Array.from({ length: 3 }, (_, i) => <b key={i} />)}</i>
        <i className="orbit orbit--7">{Array.from({ length: 7 }, (_, i) => <b key={i} />)}</i>
        <i className="orbit orbit--12">{Array.from({ length: 12 }, (_, i) => <b key={i} />)}</i>
        <strong>22</strong>
      </div>}
      <div className="birth-map-spatial__copy">
        <span>הדמיה מבנית · לא חישוב אסטרולוגי</span>
        <h5>שלוש טבעות, עשרים ושתיים אותיות, מסע משפחתי אחד</h5>
        <p>התנועה מציגה את מסגרת 3·7·12 המאומתת. היא אינה ממקמת כוכבים ואינה מסיקה תכונות.</p>
        {spatialState !== "ready" ? <button type="button" onClick={enableSpatial}>הפעל תלת־ממד חי</button> : <small>אפשר לגרור, לסובב ולהתקרב.</small>}
        {fallback ? <small role="status">{FALLBACK_LABEL[fallback] || FALLBACK_LABEL.render_error}</small> : null}
      </div>
    </div> : null}

    {lens === "human" ? <div className="birth-map-lens" role="tabpanel">
      <header><span>עדשה פרשנית</span><h5>Human Design</h5></header>
      <p>כאשר יחובר מחשבון קנוני, יוצגו כאן Type, Strategy, Authority, Profile, Definition, Centers, Channels ו־Gates עם trace מלא. זו עדשה פרשנית — לא אבחון מדעי או רפואי.</p>
      <InputReadiness people={data.people} lens="human" />
      <footer>כרגע לא מוצג ערך כלשהו: המערכת אינה מנחשת שעה, אזור זמן או שערים.</footer>
    </div> : null}

    {lens === "sky" ? <div className="birth-map-lens" role="tabpanel">
      <header><span>מנוע אסטרונומי נדרש</span><h5>מפת שמיים אישית</h5></header>
      <p>המפה תדרוש ephemeris קנוני, אזור זמן היסטורי וקואורדינטות מאומתות. עד אז נשמרים רק פרטי הלידה שהוזנו במפורש.</p>
      <InputReadiness people={data.people} lens="sky" />
      <footer>אין כרגע מיקום כוכב, מזל, בית או היבט שחושב עבור אדם.</footer>
    </div> : null}

    {lens === "sefer" ? <div role="tabpanel" className="birth-map-sefer">{seferContent}</div> : null}
  </section>;
}
