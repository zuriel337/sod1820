import React, { useEffect, useState } from "react";
import { readResearchPulse, pulseUsable, PULSE_WINDOWS } from "../../lib/researchPulse2029.js";
import { NUMBER_PAGE_BASE } from "../../lib/research/numberPageAddress.js";
import "./nowPulseLine2029.css";

// «דופק האתר» at the top of "עכשיו" (ZURIEL 25.11.2026, reconnecting the 21.11 line). ONE read of the ONE public reader (research_pulse_2029) for a FIXED
// 168-hour window, through the existing reader and its cache (src/lib/researchPulse2029.js): no second call, no adaptive windows, no new engine.
// Traffic Intelligence v10-v12: aggregates above the privacy floor only (the server already applies 10 events / 5 sessions); it shows hot numbers and the
// trend of activity (computations / searches / saves are EVENTS, never people). It never shows totals, per-section views, per-post counts, crawlers or any
// audience size. A part with no data is left out, never drawn as a zero and never filled in.
export const NOW_PULSE_HOURS = 168;
export const NOW_PULSE_WINDOW_LABEL = (PULSE_WINDOWS.find(([hours]) => hours === NOW_PULSE_HOURS) || [0, "השבוע האחרון"])[1];
const TREND_LABEL = Object.freeze({ compute: "חישובים", search: "חיפושים", save: "שמירות" });
const count = n => Number.isSafeInteger(n) && n > 0 ? n.toLocaleString("he-IL") : null;

// The pure projection of the pulse payload: what may be shown, or null when the payload is not a measured, usable one.
export function pulseLineModel(d) {
  if (!pulseUsable(d)) return null;
  const numbers = (Array.isArray(d.numbers) ? d.numbers : []).map(item => item?.n).filter(n => Number.isSafeInteger(n) && n > 0).slice(0, 2);
  const trends = (Array.isArray(d.trend) ? d.trend : []).filter(item => item?.surface === "activity_2029" && TREND_LABEL[item.event_type]
    && Number.isSafeInteger(item.recent) && Number.isSafeInteger(item.earlier) && item.recent > 0 && item.earlier > 0).map(item => {
    const pct = Math.round((item.recent - item.earlier) / item.earlier * 100);
    return { key: item.event_type, label: TREND_LABEL[item.event_type], recent: item.recent, earlier: item.earlier, pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
  }).sort((a, b) => (b.recent + b.earlier) - (a.recent + a.earlier)).slice(0, 1);
  const halfDays = Number.isFinite(d.hours) && d.hours > 0 ? d.hours / 48 : NOW_PULSE_HOURS / 48;
  return { numbers, trends, halfDays };
}

const ARROW = { up: "↑", down: "↓", flat: "→" };
function trendText(t) { return t.dir === "flat" ? "ללא שינוי" : `${ARROW[t.dir]} ${Math.abs(t.pct).toLocaleString("he-IL")}%`; }

export default function NowPulseLine2029({ read = () => readResearchPulse(NOW_PULSE_HOURS), onOpen = null }) {
  const [state, setState] = useState({ status: "loading", model: null });
  useEffect(() => {
    let live = true;
    read().then(data => { if (live) setState({ status: "ready", model: pulseLineModel(data) }); }, () => { if (live) setState({ status: "failed", model: null }); });
    return () => { live = false; };
  }, [read]);
  const go = href => event => { if (onOpen) { event.preventDefault(); onOpen(href); } };
  const model = state.model;
  const empty = state.status === "ready" && (!model || (!model.numbers.length && !model.trends.length));
  if (state.status === "loading") return <div className="nowpulse29 is-loading" aria-hidden="true" />;
  return <nav className="nowpulse29 r29" dir="rtl" aria-label={`דופק האתר · ${NOW_PULSE_WINDOW_LABEL}`} data-now-pulse={empty || state.status === "failed" ? "empty" : "ready"}>
    <span className="nowpulse29-title"><i aria-hidden="true">◆</i>דופק האתר <small>· {NOW_PULSE_WINDOW_LABEL}</small></span>
    {empty || state.status === "failed"
      ? <span className="nowpulse29-note">{state.status === "failed" ? "הדופק אינו זמין כרגע" : "אין עדיין נתונים מעל סף הפרטיות"}</span>
      : <>
        {model.numbers.length ? <span className="nowpulse29-grp" data-now-pulse-part="numbers"><span className="nowpulse29-k"><span className="nowpulse29-long">מספרים חמים</span><span className="nowpulse29-short">חמים</span></span>
          {model.numbers.map(n => { const href = `${NUMBER_PAGE_BASE}/${n}`; return <a key={n} className="nowpulse29-num" href={href} onClick={go(href)}>{n.toLocaleString("he-IL")}</a>; })}</span> : null}
        {model.trends.map(t => <span className={`nowpulse29-grp is-${t.dir}`} key={t.key} data-now-pulse-part="trend"
          title={`${t.label}: ${count(t.recent)} ב־${model.halfDays} הימים האחרונים לעומת ${count(t.earlier)} ב־${model.halfDays} הימים שלפניהם (אירועים, לא אנשים)`}>
          <span className="nowpulse29-k">{t.label}</span><b>{trendText(t)}</b><small className="nowpulse29-long">{count(t.recent)} מול {count(t.earlier)} · חצי שבוע מול קודמו</small><small className="nowpulse29-short">מול הקודם</small></span>)}
      </>}
    <a className="nowpulse29-more" href="/stats" onClick={go("/stats")}>סטטיסטיקה ›</a>
  </nav>;
}
