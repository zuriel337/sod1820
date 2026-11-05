import React, { useEffect, useState } from "react";
import { getGaInsights, getVercelInsights, getSearchConsole } from "../../lib/visits.js";
import { get2029Analytics } from "../../lib/analytics2029.js";

const number = v => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? "—" : Number(v).toLocaleString("he-IL", { maximumFractionDigits: 3 });
function MetricsCard({ title, state, children }) {
  return <section className="sod29-card" aria-label={title}>
    <h3>{title}</h3>
    {state.loading ? <p role="status">קורא את המקור…</p>
      : state.error ? <p role="alert">קריאת המקור נכשלה. לא מוצגת מדידה של אפס.</p>
      : state.data?.configured === false ? <p>החיבור אינו מוגדר בשרת. {state.data.missing === "VERCEL_API_TOKEN" ? "נדרש מפתח קריאה של Vercel בהגדרות השרת." : "יש להשלים את הגדרת הספק הקיימת."}</p>
      : state.data ? children(state.data) : <p>לא התקבל מידע מהמקור.</p>}
  </section>;
}

// Lazy projection over the existing four sources. It starts only after an
// explicit open in verified Admin Control, and owns no collector/store/cache.
export default function OperationalMetrics2029({ principal }) {
  return principal ? <OperationalMetricsBody key={principal} principal={principal}/> : null;
}

function OperationalMetricsBody({ principal }) {
  const [states, setStates] = useState({});
  useEffect(() => {
    if (!principal) return undefined;
    const controller = new AbortController(), options = { signal: controller.signal, expectedUserId: principal };
    const reads = { ga:()=>getGaInsights(28,options), vercel:()=>getVercelInsights(30,options),
      gsc:()=>getSearchConsole(90,options), rum:()=>get2029Analytics({hours:24,...options}) };
    setStates(Object.fromEntries(Object.keys(reads).map(key=>[key,{loading:true}])));
    for (const [key,read] of Object.entries(reads)) Promise.resolve().then(read).then(data=>{
      if (controller.signal.aborted) return;
      if (!data || data.error) throw new Error("source_unavailable");
      setStates(current=>({...current,[key]:{loading:false,data}}));
    }).catch(error=>{
      if (!controller.signal.aborted) setStates(current=>({...current,[key]:{loading:false,error:true}}));
    });
    return ()=>controller.abort();
  },[principal]);
  return <section className="sod29-section" data-experience-capability="existing-traffic-provider-readers">
    <h2>מדידה וגוגל</h2>
    <p className="sod29-muted">כל מקור מוצג בנפרד ובטווח שלו. נתוני Google ו־Vercel אינם הוכחת זהות אנושית. נתון חסר או כשל אינם אפס.</p>
    <div className="sod29-grid">
      <MetricsCard title="Google Analytics · 28 ימים" state={states.ga||{loading:true}}>{d=><>
        <p>משתמשים שנמדדו: {number(d.totals?.users)} · צפיות בדפים: {number(d.totals?.views)}</p>
        <p className="sod29-muted">מקור: GA4_MEASURED. הנתונים נשמרים כפי שנמדדו אצל Google.</p>
      </>}</MetricsCard>
      <MetricsCard title="Vercel Analytics · 30 ימים" state={states.vercel||{loading:true}}>{d=><p>מבקרים שנמדדו: {number(d.totals?.visitors)} · צפיות: {number(d.totals?.pageviews)}</p>}</MetricsCard>
      <MetricsCard title="מהירות הגולשים · 24 שעות" state={states.rum||{loading:true}}>{d=>{
        const v=d.web_vitals;
        return !v ? <p>המקור לא החזיר מדדי מהירות.</p> : <>
          <p>דגימות פתיחה: {number(v.samples)}</p>
          {v.samples>0 ? <p dir="ltr">LCP p75: {number(v.p75?.lcp_ms)} ms · INP p75: {number(v.p75?.inp_ms)} ms · CLS p75: {number(v.p75?.cls)}</p> : <p>טרם התקבלו דגימות בחלון הזה. אין כאן הוכחה למהירות טובה או גרועה.</p>}
          <p className="sod29-muted">מדידת פתיחת מסמך אמיתית מהמערכת הקיימת; אינה CrUX ואינה מדידת מעבר פנימי. סף CLS נשאר 0.1.</p>
        </>;
      }}</MetricsCard>
      <MetricsCard title="Google Search Console · 90 ימים" state={states.gsc||{loading:true}}>{d=><>
        <p>ימים עם נתונים: {number(d.timeline?.length)}</p>
        <p className="sod29-muted">הופעה בדוח חיפוש או במפת האתר אינה הוכחה לכיסוי כל הכתובות.</p>
        {d.indexing?.inspections?.map(item=><div className="sod29-row" key={item.path}>
          <div><strong dir="ltr">{item.path}</strong><small>{item.state==='measured' ? item.coverageState||item.verdict : "בדיקת האינדוקס לא הושלמה מול Google"}</small></div>
        </div>)}
        {d.indexing?.sitemaps?.state==='measured' ? <p>מפות שנמצאו בנכס: {number(d.indexing.sitemaps.rows.length)}</p> : <p>קבלת מפת האתר מול Google טרם אומתה.</p>}
        <p className="sod29-muted">בדיקת אינדוקס מוגבלת לשלוש הכתובות המוצגות; אינה בקשת אינדוקס או קבלה של כל המלאי.</p>
      </>}</MetricsCard>
    </div>
  </section>;
}
