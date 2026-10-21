// Post measures, one compact area. It shows four SEPARATE readings and never combines them:
//   strength      - the existing convergence meter (topic_cards.meter_score, 0-100) of the leading card
//   quality       - the existing manual card rating (topic_cards.quality, 0-10, shown as stars)
//   coverage      - the six Context Depth statuses of this post (not a score)
//   verification  - how many of the post's numbers the canonical engine reproduced
// A click opens the six dimensions, the source groups and the nearby cards. Missing data is "not mapped" or
// "not rated", never zero. DEC-METER-002 is open: no formula, name or total is created here.
import React, { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";
import { postNumbers } from "../../lib/heroUpdate2029.js";
import { qualityStars, strengthValue } from "../../lib/ratings2029.js";
import { COVERAGE_LABEL, DIMENSIONS } from "../../lib/research/contextDepthProjection2029.js";
import "./convergenceRatings2029.css";
import "./contextDepthMeter2029.css";
import "./postConvergenceMeasures2029.css";

const FIELDS = "id,slug,title,numbers,highlight_numbers,quality,meter_score";
const starsText = (n) => "★".repeat(n) + "☆".repeat(5 - n);
const UNMAPPED_DIMENSIONS = DIMENSIONS.map((dimension) => ({
  ...dimension, coverage: "unmapped", coverageLabel: COVERAGE_LABEL.unmapped, facts: [], note: null,
}));

function coverageText(dimensions) {
  const count = (state) => dimensions.filter((dimension) => dimension.coverage === state).length;
  return [[count("full"), "מלא"], [count("partial"), "חלקי"], [count("none"), "אין נתון"], [count("unmapped"), "טרם מופה"]]
    .filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`).join(" · ");
}

function verification(depth, depthLoading) {
  if (depthLoading) return { text: "בודק…", tone: "na" };
  if (!depth) return { text: "לא נבדק", tone: "na" };
  const calculations = depth.dimensions.find((dimension) => dimension.key === "calculations");
  const total = depth.numbers.length;
  const verified = calculations?.facts?.length || 0;
  return verified > 0
    ? { text: `אומתו במנוע ${verified} מתוך ${total} מספרים`, tone: "ok" }
    : { text: "אין עדיין חישוב מאומת", tone: "na" };
}

export default function PostConvergenceMeasures2029({ tags, fallbackNumbers = [], depth = null, depthLoading = false, discoveryLinks = false }) {
  const numbers = postNumbers(tags).length ? postNumbers(tags) : fallbackNumbers.map(Number).filter(Number.isFinite);
  const key = numbers.join(",");
  const [state, setState] = useState({ loaded: false, cards: [] });
  const [open, setOpen] = useState(false);
  const panelId = useId();
  useEffect(() => {
    if (!numbers.length || !supabase) { setState({ loaded: true, cards: [] }); return undefined; }
    let live = true;
    (async () => {
      let cards = [];
      try {
        const { data } = await supabase.from("topic_cards_public").select(FIELDS).overlaps("numbers", numbers)
          .order("meter_score", { ascending: false, nullsFirst: false }).limit(3);
        cards = (data || []).map((card) => ({ id: String(card.id), slug: card.slug, label: stripHtml(card.title || "").trim(), numbers: card.numbers || [],
          quality: card.quality ?? null, meterScore: card.meter_score ?? null,
          shared: (card.numbers || []).filter((n) => numbers.includes(Number(n))) }));
      } catch (_) { /* the area stays in its not-mapped state */ }
      if (live) setState({ loaded: true, cards });
    })();
    return () => { live = false; };
  }, [key]);

  const lead = state.cards[0] || null;
  const dimensions = depth?.dimensions?.length === DIMENSIONS.length ? depth.dimensions : UNMAPPED_DIMENSIONS;
  const mapped = Boolean(lead || depth);
  const q = qualityStars(lead?.quality);
  const s = strengthValue(lead?.meterScore);
  const check = useMemo(() => verification(depth, depthLoading), [depth, depthLoading]);
  const groups = depth?.sourceCount?.groups || [];
  if (!state.loaded) return null;

  const pips = <span className="sod29-depth-pips" aria-hidden="true">
    {dimensions.map((dimension) => <i key={dimension.key} data-coverage={dimension.coverage} />)}
  </span>;

  return <section className="k29-pcm k29-pcm-compact" aria-label="מדדי הפוסט" data-post-measures={mapped ? "mapped" : "unmapped"}>
    <header className="k29-pcm-head">
      <h2>מדדי הפוסט</h2>
      <button type="button" className="k29-pcm-more" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        {open ? "סגירה" : "פרטים"} <span aria-hidden="true">{open ? "⌃" : "‹"}</span>
      </button>
    </header>
    {mapped ? <div className="k29-pcm-rows">
      {lead ? <p className="k29-pcm-lead">חוזק ואיכות: כרטיס ההתכנסות המוביל · <Link to={`/topic/${encodeURIComponent(lead.slug)}`}>{lead.label}</Link></p> : null}
      <div className="k29-pcm-row">
        <span className="k29-rate-l">חוזק התכנסות</span>
        {s.state === "known"
          ? <><span className="k29-rate-bar" aria-hidden="true"><i style={{ inlineSize: `${s.value}%` }} /></span><b className="k29-rate-v" aria-label={`חוזק התכנסות ${s.value} מתוך 100`}>{s.value}</b></>
          : <span className="k29-rate-na k29-pcm-wide">אין נתון</span>}
      </div>
      <div className="k29-pcm-row">
        <span className="k29-rate-l">איכות</span>
        {q.state === "rated"
          ? <><span className="k29-stars" role="img" aria-label={`דירוג איכות ${q.stars} מתוך 5`}>{starsText(q.stars)}</span><b className="k29-rate-v">{q.raw}/10</b></>
          : <span className="k29-rate-na k29-pcm-wide">{q.state === "invalid" ? "ערך לא תקין" : "לא דורג"}</span>}
      </div>
      <div className="k29-pcm-row">
        <span className="k29-rate-l">כיסוי מחקרי</span>
        {pips}
        <small className="k29-pcm-fine">{depthLoading ? "בודק…" : coverageText(dimensions)}</small>
      </div>
      <div className="k29-pcm-row">
        <span className="k29-rate-l">אימות חישוב</span>
        <span className={`k29-pcm-check is-${check.tone}`}>{check.tone === "ok" ? <b aria-hidden="true">✓ </b> : null}{check.text}</span>
      </div>
    </div> : <div className="k29-pcm-rows is-unmapped">
      <p className="k29-pcm-empty">הפוסט עדיין לא מופה: אין חוזק, איכות או אימות להצגה.</p>
      <div className="k29-pcm-row">
        <span className="k29-rate-l">כיסוי מחקרי</span>{pips}<small className="k29-pcm-fine">טרם מופה</small>
      </div>
    </div>}
    <small className="k29-pcm-fine">ארבעה מדדים נפרדים, בלי ציון מסכם. זו תוצאת חיפוש, לא הוכחה.</small>
    {open ? <div id={panelId} className="k29-pcm-details" role="region" aria-label="פירוט מדדי הפוסט">
      <h3>ששת הממדים</h3>
      <ul className="k29-pcm-dims">
        {dimensions.map((dimension) => <li key={dimension.key} data-coverage={dimension.coverage}>
          <div className="k29-pcm-dim-head"><b>{dimension.label}</b><span className="sod29-depth-chip" data-coverage={dimension.coverage}>{COVERAGE_LABEL[dimension.coverage]}</span></div>
          <small>{dimension.ask}</small>
          {dimension.note ? <small>{dimension.note}</small> : null}
        </li>)}
      </ul>
      <h3>מקורות</h3>
      <p className="k29-pcm-fine">{groups.length
        ? `קבוצות מקור שזוהו בנתונים שהוצגו: ${groups.length}. תגית וגוף הפוסט נספרים כקבוצה אחת, ומקור אחד אינו נספר פעמיים.`
        : "עדיין לא זוהו קבוצות מקור לפוסט הזה."}</p>
      {discoveryLinks ? <p className="k29-pcm-links">
        <Link to={{ hash: "#post-discovery-sources" }} replace>למקורות המדויקים</Link>
        <Link to={{ hash: "#post-discovery-meeting" }} replace>לעומק המלא בהתכנסויות</Link>
      </p> : null}
      {state.cards.length ? <>
        <h3>כרטיסי התכנסות קרובים</h3>
        <ul className="k29-pcm-cards">
          {state.cards.map((card) => <li key={card.id}>
            <Link to={`/topic/${encodeURIComponent(card.slug)}`}>{card.label}</Link>
            <small>מספרים משותפים עם הפוסט: {card.shared.join(" · ") || "אין"}</small>
          </li>)}
        </ul>
      </> : null}
    </div> : null}
  </section>;
}
