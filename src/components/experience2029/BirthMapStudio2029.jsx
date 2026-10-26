import React, { lazy, Suspense, useState } from "react";
import { evaluateS4Capability, prefersReducedMotion } from "../../lib/spatial/gpuCapability.js";
import { calculateLifeJourneyBirthMap } from "../../lib/research/lifeJourneyBirthAdapters.js";
import "./birth-map-studio-2029.css";

const BirthMapScene3D = lazy(() => import("./BirthMapScene3D2029.jsx"));

const LENSES = Object.freeze([
  { id: "spatial", label: "תלת־ממד" },
  { id: "human", label: "Human Design" },
  { id: "sky", label: "מפת שמיים" },
  { id: "sefer", label: "ספר יצירה" },
]);

const SPATIAL_MODES = Object.freeze([
  { id: "letters", label: "אותיות" },
  { id: "family", label: "משפחה" },
  { id: "convergences", label: "התכנסויות" },
]);

const SPATIAL_COPY = Object.freeze({
  letters: Object.freeze({ eyebrow: "מסגרת מקורית · ספר יצירה", title: "שלוש טבעות, עשרים ושתיים אותיות", body: "התנועה מציגה את מסגרת 3·7·12 המאומתת. היא אינה ממקמת כוכבים ואינה מסיקה תכונות." }),
  family: Object.freeze({ eyebrow: "Ledger פרטי · קשרים שמורים", title: "המשפחה כמרחב חי אחד", body: "זהב מציין קשר דורי שהוזן; סגול מציין חיבור מחקרי שכבר נמצא. התצוגה אינה קובעת את טיב היחסים." }),
  convergences: Object.freeze({ eyebrow: "מחקר מנורמל · ערכים משותפים", title: "נקודות המפגש של המשפחה", body: "כל ליבה מייצגת ערך שחזר אצל לפחות שני אנשים בביטויים שנבדקו. שוויון מספרי אינו משמעות בפני עצמו." }),
});

const STATE_LABEL = Object.freeze({
  needs_date: "חסר תאריך לידה",
  needs_time: "חסרה שעת לידה מדויקת",
  needs_place: "חסר מקום לידה",
  ready_for_explicit_calculation: "הקלט מוכן לחישוב מפורש",
});

const CALCULATION_ERROR = Object.freeze({
  birthdate_required: "נדרש תאריך לידה מלא.",
  birthdate_invalid: "תאריך הלידה אינו תקין.",
  birthtime_required: "נדרשת שעת לידה מדויקת.",
  timezone_invalid: "נדרש אזור זמן תקין בפורמט IANA, למשל Asia/Jerusalem.",
  coordinates_incomplete: "למפת שמיים יש להזין גם קו רוחב וגם קו אורך.",
  latitude_out_of_range: "קו הרוחב חייב להיות בין ‎-90 ל־90.",
  longitude_out_of_range: "קו האורך חייב להיות בין ‎-180 ל־180.",
  birth_engine_unavailable: "מנוע החישוב המקומי לא נטען. אפשר לנסות שוב.",
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

function BirthCalculationControls({ people, selectedRef, timezone, latitude, longitude, state, error, onSelect, onTimezone, onLatitude, onLongitude, onCalculate }) {
  const selected = people.find(person => person.memberRef === selectedRef) || people[0] || null;
  const ready = Boolean(selected?.readiness?.hasDate && selected?.readiness?.hasExactTime && selected?.readiness?.hasPlace);
  return <div className="birth-map-calculator">
    <div className="birth-map-calculator__person">
      <label htmlFor="birth-map-person">עבור מי לחשב?</label>
      <select id="birth-map-person" value={selected?.memberRef || ""} onChange={event => onSelect(event.target.value)}>
        {people.map(person => <option key={person.memberRef} value={person.memberRef}>{person.name}</option>)}
      </select>
      {selected ? <ul aria-label={`שלמות נתוני לידה עבור ${selected.name}`}>
        <li data-ready={selected.readiness.hasDate}>תאריך</li>
        <li data-ready={selected.readiness.hasExactTime}>שעה</li>
        <li data-ready={selected.readiness.hasPlace}>מקום</li>
      </ul> : null}
    </div>
    <div className="birth-map-calculator__fields">
      <label><span>אזור זמן בלידה</span><input dir="ltr" type="text" value={timezone} onChange={event => onTimezone(event.target.value)} placeholder="Asia/Jerusalem" autoComplete="off" inputMode="text" /></label>
      <label><span>קו רוחב <small>למפת שמיים</small></span><input dir="ltr" type="number" min="-90" max="90" step="any" value={latitude} onChange={event => onLatitude(event.target.value)} placeholder="31.7683" autoComplete="off" /></label>
      <label><span>קו אורך <small>למפת שמיים</small></span><input dir="ltr" type="number" min="-180" max="180" step="any" value={longitude} onChange={event => onLongitude(event.target.value)} placeholder="35.2137" autoComplete="off" /></label>
    </div>
    <div className="birth-map-calculator__action">
      <button type="button" disabled={!ready || state === "loading"} onClick={onCalculate}>{state === "loading" ? "מחשב במכשיר…" : "חשב מפה מקומית"}</button>
      <small>אזור הזמן והקואורדינטות נשארים בזיכרון המסך ונמחקים ברענון. אין בקשת רשת ואין שמירה נוספת.</small>
    </div>
    {!ready && selected ? <p role="status">{STATE_LABEL[selected.humanDesign.state]}</p> : null}
    {error ? <p className="birth-map-calculator__error" role="alert">{CALCULATION_ERROR[error] || "החישוב לא הושלם. בדקו את הפרטים ונסו שוב."}</p> : null}
  </div>;
}

function HumanDesignResult({ result }) {
  if (!result) return <div className="birth-map-awaiting"><strong>המפה מחכה להפעלה שלך</strong><span>החישוב מתחיל רק בלחיצה ואינו מופעל בעת בחירת אדם.</span></div>;
  return <div className="birth-map-result" data-result="human-design">
    <section className="birth-map-result__headline">
      <article><small>Type</small><strong>{result.typeLabel}</strong></article>
      <article><small>Authority</small><strong>{result.authorityLabel}</strong></article>
      <article><small>Profile</small><strong dir="ltr">{result.profile}</strong></article>
    </section>
    <section className="birth-map-result__group"><h6>Strategy · Definition</h6><div><span>{result.strategy}</span><span>{result.definition}</span></div></section>
    <section className="birth-map-result__group"><h6>מרכזים מוגדרים</h6><div>{result.definedCenters.map(center => <span key={center.key}>{center.label}</span>)}</div></section>
    <section className="birth-map-result__group"><h6>ערוצים מוגדרים</h6><div>{result.definedChannels.length ? result.definedChannels.map(channel => <span key={channel.key} dir="ltr">{channel.key}</span>) : <span>אין ערוץ מלא</span>}</div></section>
    <section className="birth-map-result__group"><h6>שערים פעילים</h6><div>{result.activatedGates.map(gate => <span key={gate}>{gate}</span>)}</div></section>
  </div>;
}

function SkyResult({ result, hasCalculation }) {
  if (!hasCalculation) return <div className="birth-map-awaiting"><strong>המפה מחכה להפעלה שלך</strong><span>לחישוב בתים וזוויות דרושים אזור זמן וקואורדינטות מפורשות.</span></div>;
  if (!result) return <div className="birth-map-awaiting is-missing"><strong>Human Design חושב; מפת השמיים ממתינה לקואורדינטות</strong><span>הוסיפו קו רוחב וקו אורך והפעילו שוב. המערכת אינה מנחשת מקום.</span></div>;
  return <div className="birth-map-result" data-result="sky-map">
    <section className="birth-map-result__headline is-sky">
      <article><small>אופק עולה</small><strong>{result.angles.ascendant.signLabel} · {result.angles.ascendant.degree}°</strong></article>
      <article><small>רום שמיים</small><strong>{result.angles.midheaven.signLabel} · {result.angles.midheaven.degree}°</strong></article>
      <article><small>מסגרת</small><strong>טרופית · גאוצנטרית</strong></article>
    </section>
    <section className="birth-map-sky-wheel" aria-label="מיקומי גרמי השמיים">
      {result.bodies.map((body, index) => <article key={body.key} style={{ "--body-index": index }}>
        <i aria-hidden="true" /><small>{body.label}</small><strong>{body.signLabel}</strong><span>{body.degree}°</span>
      </article>)}
    </section>
    <section className="birth-map-result__group"><h6>היבטים מרכזיים</h6><div>{result.aspects.length ? result.aspects.map((aspect, index) => <span key={`${aspect.left}-${aspect.right}-${aspect.kind}-${index}`}>{aspect.left} {aspect.symbol} {aspect.right} · {aspect.label} · orb {aspect.orb}°</span>) : <span>לא נמצא היבט מרכזי בטווח החישוב.</span>}</div></section>
  </div>;
}

function SpatialFallback({ mode, data }) {
  if (mode === "family") return <div className="birth-map-family-fallback" aria-hidden="true">
    <i />
    {data.spatialModel.nodes.map(node => <b key={node.index} style={{ "--node-angle": `${(node.index / Math.max(data.spatialModel.nodes.length, 1)) * 360}deg` }}>{node.index + 1}</b>)}
  </div>;
  if (mode === "convergences") return <div className="birth-map-convergence-fallback" aria-hidden="true">
    <i />
    {data.spatialModel.convergencePoints.map((point, index) => <b key={point.value} style={{ "--point-angle": `${(index / Math.max(data.spatialModel.convergencePoints.length, 1)) * 360}deg` }}>{point.value}</b>)}
    {!data.spatialModel.convergencePoints.length ? <span>טרם נמצאה התכנסות</span> : null}
  </div>;
  return <div className="birth-map-orbits" aria-hidden="true">
    <i className="orbit orbit--3">{Array.from({ length: 3 }, (_, i) => <b key={i} />)}</i>
    <i className="orbit orbit--7">{Array.from({ length: 7 }, (_, i) => <b key={i} />)}</i>
    <i className="orbit orbit--12">{Array.from({ length: 12 }, (_, i) => <b key={i} />)}</i>
    <strong>22</strong>
  </div>;
}

function SpatialDetails({ mode, data, focusIndex, onFocus }) {
  if (mode === "family") return <div className="birth-map-spatial-details" aria-label="מקרא מפת המשפחה">
    {data.people.map((person, index) => <button type="button" key={person.memberRef} data-focused={focusIndex === index} onClick={() => onFocus(index)}>
      <i>{index + 1}</i><span><strong>{person.name}</strong><small>{person.readiness.hasDate ? "תאריך" : "ללא תאריך"} · {person.readiness.hasExactTime ? "שעה" : "ללא שעה"} · {person.readiness.hasPlace ? "מקום" : "ללא מקום"}</small></span>
    </button>)}
    <footer><span><i data-kind="family" /> קשר משפחתי</span><span><i data-kind="research" /> חיבור מחקרי</span></footer>
  </div>;
  if (mode === "convergences") return <div className="birth-map-spatial-details is-convergences" aria-label="מקרא ההתכנסויות">
    {data.spatialModel.convergencePoints.length ? data.spatialModel.convergencePoints.map(point => <article key={point.value}>
      <b>{point.value}</b><div>{point.participantIndices.map(index => <span key={index}>{data.people[index]?.name}</span>)}</div><small>{point.methodGroupCount || 1} קבוצות שיטה</small>
    </article>) : <p>עדיין אין התכנסות מנורמלת להצגה. הפעילו את המחקר המשפחתי המפורש כדי לבדוק — בחירה בלבד אינה מחפשת.</p>}
  </div>;
  return <div className="birth-map-spatial-details is-letters" aria-label="מקרא קבוצות האותיות">
    <article><b>3</b><span>אמות</span></article><article><b>7</b><span>כפולות</span></article><article><b>12</b><span>פשוטות</span></article>
  </div>;
}

export default function BirthMapStudio2029({ data, seferContent }) {
  const [lens, setLens] = useState("spatial");
  const [spatialMode, setSpatialMode] = useState("letters");
  const [focusIndex, setFocusIndex] = useState(-1);
  const [spatialState, setSpatialState] = useState("idle");
  const [fallback, setFallback] = useState("");
  const [selectedRef, setSelectedRef] = useState(data.people[0]?.memberRef || "");
  const [timezone, setTimezone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [calculationState, setCalculationState] = useState("idle");
  const [calculationError, setCalculationError] = useState("");
  const [calculation, setCalculation] = useState(null);
  const enableSpatial = () => {
    const capability = evaluateS4Capability();
    if (!capability.ok) { setFallback(capability.reason); setSpatialState("fallback"); return; }
    setFallback("");
    setSpatialState("ready");
  };
  const onFallback = reason => { setFallback(reason); setSpatialState("fallback"); };
  const selectPerson = memberRef => {
    setSelectedRef(memberRef);
    setTimezone("");
    setLatitude("");
    setLongitude("");
    setCalculation(null);
    setCalculationError("");
    setCalculationState("idle");
  };
  const updateCalculationInput = (setter, value) => {
    setter(value);
    setCalculation(null);
    setCalculationError("");
    setCalculationState("idle");
  };
  const calculateBirthMap = async () => {
    const person = data.people.find(item => item.memberRef === selectedRef) || data.people[0];
    if (!person) return;
    setCalculationState("loading");
    setCalculationError("");
    try {
      const result = await calculateLifeJourneyBirthMap({
        birthdate: person.dateIso,
        birthtime: person.birthTime,
        timezone,
        latitude,
        longitude,
      });
      setCalculation(result);
      setCalculationState("ready");
    } catch (error) {
      setCalculation(null);
      setCalculationError(error?.message || "calculation_failed");
      setCalculationState("error");
    }
  };
  const calculator = <BirthCalculationControls
    people={data.people}
    selectedRef={selectedRef}
    timezone={timezone}
    latitude={latitude}
    longitude={longitude}
    state={calculationState}
    error={calculationError}
    onSelect={selectPerson}
    onTimezone={value => updateCalculationInput(setTimezone, value)}
    onLatitude={value => updateCalculationInput(setLatitude, value)}
    onLongitude={value => updateCalculationInput(setLongitude, value)}
    onCalculate={calculateBirthMap}
  />;

  return <section className="birth-map-studio" data-experience-capability="life-journey-birth-map-studio">
    <header className="birth-map-studio__hero">
      <div><small>לידה · אותיות · מערכות</small><h4>סטודיו מפת החיים</h4><p>בסיס פרטי אחד לכל העדשות — בלי לשכפל אנשים ובלי לשלוח את פרטי הלידה לשירות חיצוני.</p></div>
      <div className="birth-map-studio__seal" aria-hidden="true"><i /><b>22</b><span>3 · 7 · 12</span></div>
    </header>

    <div className="birth-map-studio__tabs" role="tablist" aria-label="עדשות מפת הלידה">
      {LENSES.map(item => <button key={item.id} type="button" role="tab" aria-selected={lens === item.id} onClick={() => setLens(item.id)}>{item.label}</button>)}
    </div>

    {lens === "spatial" ? <div className="birth-map-spatial-panel" role="tabpanel">
      <div className="birth-map-spatial__modes" role="tablist" aria-label="שכבת התלת־ממד">
        {SPATIAL_MODES.map(item => <button type="button" role="tab" key={item.id} aria-selected={spatialMode === item.id} onClick={() => { setSpatialMode(item.id); setFocusIndex(-1); }}>{item.label}</button>)}
      </div>
      <div className="birth-map-spatial">
        {spatialState === "ready" ? <BirthSceneBoundary onFallback={onFallback}>
          <Suspense fallback={<div className="birth-map-loading" role="status">בונה מרחב תלת־ממדי…</div>}>
            <BirthMapScene3D counts={data.letterCounts} model={data.spatialModel} mode={spatialMode} focusIndex={focusIndex} reducedMotion={prefersReducedMotion()} onFallback={onFallback} />
          </Suspense>
        </BirthSceneBoundary> : <SpatialFallback mode={spatialMode} data={data} />}
        <div className="birth-map-spatial__copy">
          <span>{SPATIAL_COPY[spatialMode].eyebrow}</span>
          <h5>{SPATIAL_COPY[spatialMode].title}</h5>
          <p>{SPATIAL_COPY[spatialMode].body}</p>
          {spatialState !== "ready" ? <button type="button" onClick={enableSpatial}>הפעל תלת־ממד חי</button> : <small>אפשר לגרור, לסובב ולהתקרב.</small>}
          {fallback ? <small role="status">{FALLBACK_LABEL[fallback] || FALLBACK_LABEL.render_error}</small> : null}
        </div>
      </div>
      <SpatialDetails mode={spatialMode} data={data} focusIndex={focusIndex} onFocus={setFocusIndex} />
    </div> : null}

    {lens === "human" ? <div className="birth-map-lens" role="tabpanel">
      <header><span>חישוב מקומי · עדשה פרשנית</span><h5>Human Design</h5></header>
      <p>Type, Authority, Profile, Centers, Channels ו־Gates מחושבים במכשיר מנתוני הלידה שהזנת. זו מסגרת פרשנית — לא אבחון מדעי, רפואי או קביעה על האדם.</p>
      {calculator}
      <HumanDesignResult result={calculation?.humanDesign} />
      <footer>trace · natalengine 1.6.0 · astronomy-engine VSOP87 · חישוב ידני בלבד · ללא API חיצוני</footer>
    </div> : null}

    {lens === "sky" ? <div className="birth-map-lens" role="tabpanel">
      <header><span>מיקום אסטרונומי · ללא ניבוי</span><h5>מפת שמיים אישית</h5></header>
      <p>המנוע מחשב מקומית מיקומים טרופיים, אופק, רום שמיים והיבטים גאומטריים בעזרת אזור זמן היסטורי וקואורדינטות מפורשות. המזלות כאן הם חלוקת קואורדינטות — לא תחזית ולא קביעה על אופי.</p>
      {calculator}
      <SkyResult result={calculation?.sky} hasCalculation={Boolean(calculation)} />
      <footer>trace · natalengine 1.6.0 · astronomy-engine VSOP87 · קואורדינטות סשן בלבד · ללא API חיצוני</footer>
    </div> : null}

    {lens === "sefer" ? <div role="tabpanel" className="birth-map-sefer">{seferContent}</div> : null}
  </section>;
}
