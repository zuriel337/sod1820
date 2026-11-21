import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { readAdaptivePulse, pulseCount } from "../../lib/researchPulse2029.js";
import "./sectionPulse2029.css";

// Per-section strip (ZURIEL 21.11.2026): each section shows only its own real numbers from the one public
// reader, in the adaptive window, and links to /stats. Without data it is a quiet link, never an empty box.
function numberItems(d, value) {
  const items = [];
  const self = value ? d.numbers?.find(x => x.n === Number(value)) : null;
  if (self) items.push({ key: "self", b: pulseCount(self.events), s: `פתיחות של ${Number(value).toLocaleString("he-IL")}` });
  const computed = value ? d.computed?.find(x => x.n === Number(value)) : null;
  if (computed) items.push({ key: "computed", b: pulseCount(computed.events), s: "חישובים של הערך" });
  const ever = value ? d.history?.top_values?.find(x => x.n === Number(value)) : null;
  if (ever) items.push({ key: "ever", b: pulseCount(ever.count), s: "חישובים של הערך באתר הקודם" });
  const crawled = d.crawlers?.by_section?.find(x => x.bucket === "/number");
  if (crawled) items.push({ key: "crawled", b: pulseCount(crawled.hits), s: "סריקות של דפי מספר ע״י מנועי חיפוש" });
  for (const x of (d.numbers || []).filter(x => x.n !== Number(value)).slice(0, 4)) items.push({ key: "n" + x.n, b: x.n.toLocaleString("he-IL"), s: `${pulseCount(x.events)} פתיחות`, to: "/number/" + x.n });
  return items;
}
function elsItems(d) {
  const items = [];
  const searches = d.totals?.human?.els_searches;
  if (pulseCount(searches)) items.push({ key: "s", b: pulseCount(searches), s: "חיפושים בצופן" });
  if (pulseCount(d.publications?.public_ciphers)) items.push({ key: "c", b: pulseCount(d.publications.public_ciphers), s: "צפנים שפורסמו", to: "/codes" });
  if (pulseCount(d.added?.codes)) items.push({ key: "a", b: pulseCount(d.added.codes), s: "צפנים חדשים" });
  const view = d.sections?.find(x => x.section === "els");
  if (view) items.push({ key: "v", b: pulseCount(view.views), s: "צפיות במדור" });
  return items;
}
// Calculators (ZURIEL 21.11.2026: above the calculator row): values calculated now, values the old site calculated
// most (values only, never typed text, from 30 calculations), and the calculator's activity count.
function calculatorItems(d) {
  const items = [];
  const actions = d.totals?.human?.calculator;
  if (pulseCount(actions)) items.push({ key: "a", b: pulseCount(actions), s: "פעולות במחשבון" });
  for (const x of (d.computed || []).slice(0, 3)) items.push({ key: "c" + x.n, b: x.n.toLocaleString("he-IL"), s: `${pulseCount(x.events)} חישובים עכשיו`, to: "/number/" + x.n });
  for (const x of (d.history?.top_values || []).slice(0, 4)) items.push({ key: "h" + x.n, b: x.n.toLocaleString("he-IL"), s: `${pulseCount(x.count)} חישובים באתר הקודם`, to: "/number/" + x.n });
  return items;
}
const BUILD = { number: numberItems, els: elsItems, calculator: calculatorItems };

export default function SectionPulse2029({ section, value = null, read = readAdaptivePulse }) {
  const [r, setR] = useState(null);
  useEffect(() => { let live = true; read().then(x => live && setR(x), () => {}); return () => { live = false; }; }, [read]);
  const items = r?.data ? (BUILD[section]?.(r.data, value) || []).filter(x => x.b) : [];
  return <aside className="sectionpulse29" dir="rtl" aria-label="נתוני המדור">
    {items.length ? <ul>{items.slice(0, 6).map(x => <li key={x.key}>{x.to ? <Link to={x.to}><b>{x.b}</b><small>{x.s}</small></Link> : <span><b>{x.b}</b><small>{x.s}</small></span>}</li>)}</ul> : null}
    <Link className="sectionpulse29-more" to="/stats">{items.length && r ? `${r.label} · כל הסטטיסטיקות` : "מה קורה באתר · סטטיסטיקה"}</Link>
  </aside>;
}
