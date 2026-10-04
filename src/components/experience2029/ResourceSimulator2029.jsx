import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { FIELDS, GROUPS, METERS, PRESETS, SOURCES, freshState, parseState, simulate, getHealthObservations, applyStorageSnapshot } from "../../lib/admin/resourceSimulator.js";
import "./resourceSimulator2029.css";
import AdminBudget2029 from "./AdminBudget2029.jsx";

const KEY = "sod1820-resource-lab-v1"; // Same export schema as the private standalone lab.
const LABELS = {user:"הזנה שלך",example:"דוגמת פתיחה",reference:"תעריף ממקור",scenario:"דוגמת תרחיש",snapshot_assumption:"הנחה מנתון שנקרא"};
const num = (n,d=2) => new Intl.NumberFormat("he-IL",{maximumFractionDigits:d}).format(n);
const HELP = {
 mode:"בהטמעה הווידאו נשלח מטיקטוק. נספרים כאן תמונות, מטא־דאטה והעיבוד שהגדרת.",
 retention:"התוכן נמחק לפי גיל. המודל מחייב לפי ממוצע אחסון בחודש, ומציג גם נפח בסופו.",
 views:"צפיות לכל סרטון במלאי, בכל חודש. מלאי הסרטונים גדל עד תום משך השמירה.",
 watched:"חלק מהקובץ שנשלח, כולל buffering לפי ההנחה שלך.",
 cache:"המטמון חל על קבצים ותמונות בלבד. מטא־דאטה נספר בתעבורה הרגילה.",
 wallSeconds:"קירוב GB-hours ללא שיתוף מופעים בין בקשות מקבילות.",
 retries:"ניסיונות נוספים צורכים עיבוד ותעבורה, ואינם יוצרים עותקים כפולים באחסון.",
 variants:"משפיע על האחסון. כל צפייה נשלחת מגרסה אחת.",
 baseStorage:"ממוצע חודשי לצורך תכנון. טעינת נפח נוכחי אינה מדידת הממוצע הזה.",
 fixedMonthly:"תשלום נטו קיים. אל תספור בו שוב חיובים שנכללו בשדות השימוש.",
 includedStorage:"המכסות מתחילות ב־0 עד להזנה. מכסות Pro הן דוגמה בלבד.",
 computeCredit:"חל במודל רק על CPU, זיכרון והפעלות; אינו מיפוי אוטומטי של זיכויי ספק.",
 dataRate:"הנחת תעריף כללית לנתונים ויומנים, ללא אימות לתוכנית או למסד הנתונים שלך.",
 uncertainty:"שינוי בקצב ההעלאות ובעומס הנגזר ממנו. אינו הסתברות או טווח ביטחון.",
 fx:"שער משוער לתצוגה, לא שער מטבע מתעדכן."
};
function initialState(){
 try { const raw=localStorage.getItem(KEY);return raw?parseState(JSON.parse(raw)):freshState(); } catch { return freshState(); }
}
function Badge({kind}){return <span className={`sod29-resource-badge ${kind}`}>{LABELS[kind]||"דוגמה"}</span>;}
function Field({field,value,provenance,onChange,disabled}){
 const [key,label,unit,min,max,step,type,rangeMax]=field;
 const id=useId(),[draft,setDraft]=useState(String(value));
 useEffect(()=>setDraft(String(value)),[value]);
 const numeric=type!=="boolean"&&type!=="select";
 const n=Number(draft),invalid=numeric&&(draft===""||!Number.isFinite(n)||n<min||n>max||(step===1&&!Number.isInteger(n)));
 const update=e=>{const text=e.target.value;setDraft(text);const n=Number(text);if(text!==""&&Number.isFinite(n)&&n>=min&&n<=max&&(step!==1||Number.isInteger(n)))onChange(key,n);};
 return <div className="sod29-resource-field">
  <div className="sod29-resource-field-label"><label htmlFor={id}>{label}</label><Badge kind={provenance}/></div>
  {type==="boolean"?<input id={id} type="checkbox" checked={value} disabled={disabled} onChange={e=>onChange(key,e.target.checked)}/>:
   type==="select"?<select id={id} value={value} onChange={e=>onChange(key,e.target.value)}><option value="hosted">שמירת וידאו והצגה מהאתר</option><option value="embed">הטמעה / קישור מטיקטוק</option></select>:
   <><div className="sod29-resource-number"><span dir="auto">{unit}</span><input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={draft} disabled={disabled} onChange={update} aria-invalid={invalid} aria-describedby={`${id}-help`}/></div>
    {type==="range"?<input type="range" aria-label={`${label} — מחוון`} min={min} max={Math.max(rangeMax,value)} step={step} value={value} disabled={disabled} onChange={e=>{setDraft(e.target.value);onChange(key,Number(e.target.value));}}/>:null}</>}
  <small id={`${id}-help`}>{invalid?`יש להזין ${step===1?"מספר שלם":"ערך"} בין ${num(min)} ל־${num(max)}.`:HELP[key]||""}</small>
 </div>;
}
function Forecast({rows,selected,onSelect,currency,money}){
 const w=660,h=220,l=58,r=20,t=15,b=35,max=Math.max(1,...rows.map(x=>x.total))*1.12;
 const x=i=>l+i*(w-l-r)/(rows.length-1),y=v=>h-b-v/max*(h-t-b);
 const path=rows.map((row,i)=>`${i?"L":"M"}${x(i).toFixed(2)},${y(row.total).toFixed(2)}`).join(" ");
 return <svg className="sod29-resource-chart" viewBox={`0 0 ${w} ${h}`} role="group" aria-label="תחזית עלות חודשית; טבלת נתונים זמינה בהמשך">
  {[0,.25,.5,.75,1].map(v=><g key={v}><line x1={l} x2={w-r} y1={y(max*v)} y2={y(max*v)} className="grid"/><text x={l-8} y={y(max*v)+4} textAnchor="end">{num(max*v*currency.factor,1)}</text></g>)}
  <text x={15} y={14}>{currency.symbol}</text>
  <path d={`${path} L${x(rows.length-1)},${h-b} L${l},${h-b} Z`} className="area"/>
  <line x1={l} x2={w-r} y1={y(rows[0].base)} y2={y(rows[0].base)} className="baseline"/>
  <path d={path} className="line"/>
  {rows.map((row,i)=><g key={row.month} role="button" tabIndex={0} aria-label={`חודש ${row.month}: ${money(row.total)}`} aria-pressed={row.month===selected} onClick={()=>onSelect(row.month)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(row.month);}}} className="point-button">
   <circle cx={x(i)} cy={y(row.total)} r={14} fill="transparent"/><circle cx={x(i)} cy={y(row.total)} r={row.month===selected?6:4} className={`point ${row.month===selected?"selected":""}`} aria-hidden="true"/>
   <title>חודש {row.month}: {money(row.total)}</title>
   {rows.length<=12||i%2===0||i===rows.length-1?<text x={x(i)} y={h-10} textAnchor="middle">{row.month}</text>:null}
  </g>)}
 </svg>;
}

export default function ResourceSimulator2029({health,healthReadAt=null,onRefresh,refreshing=false,viewMode="simulation",notificationSource,healthSource}){
 const [state,setState]=useState(initialState),[notice,setNotice]=useState(""),[name,setName]=useState("");
 const file=useRef(null),dialog=useRef(null);
 const observations=useMemo(()=>getHealthObservations(health,healthReadAt),[health,healthReadAt]);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{setNotice("השמירה בדפדפן אינה זמינה. אפשר לייצא את ההנחות לקובץ.");}},[state]);
 const result=useMemo(()=>simulate(state.values),[state.values]);
 const month=Math.min(state.selectedMonth,state.values.months),row=result.rows[month-1];
 const sensitivity=useMemo(()=>[simulate(state.values,1-state.values.uncertainty/100),simulate(state.values,1+state.values.uncertainty/100)],[state.values]);
 const currency={factor:state.currency==="ILS"?state.values.fx:1,symbol:state.currency==="ILS"?"₪":"$"};
 const money=n=>new Intl.NumberFormat("he-IL",{style:"currency",currency:state.currency,maximumFractionDigits:2}).format(n*currency.factor);
 const setValue=(key,value)=>setState(s=>{
  const next={...s,values:{...s.values,[key]:value},provenance:{...s.provenance,[key]:"user"},scenarioName:"תרחיש מותאם"};
  if(key==="baseStorage"&&s.assumptionSources){delete next.assumptionSources;}
  return next;
 });
 const selectMonth=m=>setState(s=>({...s,selectedMonth:m}));
 const loadPreset=p=>{setState(s=>({...s,values:{...s.values,...p.changes},provenance:{...s.provenance,...Object.fromEntries(Object.keys(p.changes).map(k=>[k,"scenario"]))},scenarioName:p.name}));setNotice(`נטען ${p.name}; המכסות והתעריפים נשמרו.`);};
 const comparisons=useMemo(()=>[
  {name:"התרחיש הנוכחי",kind:"current",values:state.values},
  ...PRESETS.map(p=>({name:p.name,kind:"example",preset:p,values:{...state.values,...p.changes}})),
  ...state.saved.map((s,i)=>({...s,kind:"saved",index:i}))
 ].map(s=>({...s,row:simulate({...s.values,months:Math.max(s.values.months,month)}).rows[month-1]})),[state.values,state.saved,month]);
 const sourceCounts=Object.values(state.provenance).reduce((a,k)=>({...a,[k]:(a[k]||0)+1}),{});
 const costEntries=[...METERS.map(m=>({key:m.key,name:m.name})),{key:"proxy",name:"שרת ביניים"},{key:"ai",name:"AI / תמלול"},{key:"api",name:"API / הורדות"},{key:"services",name:"שירות העלאות"},{key:"extra",name:"תוספות קבועות"},{key:"computeCredit",name:"שינוי בזיכוי"}].filter(e=>Math.abs(row.deltaCosts[e.key]||0)>1e-8);
 const maxCost=Math.max(.01,...costEntries.map(e=>Math.abs(row.deltaCosts[e.key])));
 const save=e=>{e.preventDefault();if(!name.trim())return;if(state.saved.length>=8){setNotice("אפשר לשמור עד 8 תרחישים. מחק תרחיש או ייצא את כולם.");dialog.current.close();return;}
  setState(s=>({...s,scenarioName:name.trim(),saved:[...s.saved,{name:name.trim(),values:{...s.values},provenance:{...s.provenance},...(s.assumptionSources?{assumptionSources:structuredClone(s.assumptionSources)}:{})}]}));dialog.current.close();setNotice("התרחיש נשמר בדפדפן הזה.");};
 const exportState=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="sod1820-resource-scenarios.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice("ההנחות והתרחישים יוצאו לקובץ.");};
 const importState=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>250000)throw new Error("יש לבחור קובץ קטן מ־250 KB.");setState(parseState(JSON.parse(await f.text())));setNotice("התרחישים וההנחות יובאו. נתוני המעקב עצמם לא הוחלפו.");}catch(error){setNotice(error instanceof SyntaxError?"הקובץ אינו JSON תקין.":error.message);}e.target.value="";};
 const applySnapshot=()=>{try{setState(s=>applyStorageSnapshot(s,observations));setNotice("הנפח הנוכחי נטען כהנחת ממוצע חודשי. זו אינה מדידה של ממוצע החיוב.");}catch(error){setNotice(error.message);}};
 const fmtValue=(key,value)=>typeof value==="boolean"?(value?"כן":"לא"):key==="mode"?(value==="embed"?"הטמעה":"שמירה באתר"):num(value,5);
 if(viewMode==="budget")return <div className="sod29-resource">
  <div className="sod29-resource-heading"><h2>תקציב והתראות</h2><div className="sod29-actions"><label>חודש לתכנון <select value={month} onChange={e=>selectMonth(Number(e.target.value))}>{result.rows.map(r=><option key={r.month} value={r.month}>חודש {r.month}</option>)}</select></label><label>מטבע <select value={state.currency} onChange={e=>setState(s=>({...s,currency:e.target.value}))}><option value="USD">דולר</option><option value="ILS">שקל לפי השער שהזנת</option></select></label></div></div>
  <AdminBudget2029 state={state} result={result} selectedMonth={month} money={money} healthSource={healthSource} notificationSource={notificationSource} onRefresh={onRefresh}
   budgetField={<Field field={FIELDS.find(f=>f[0]==="budget")} value={state.values.budget} provenance={state.provenance.budget} onChange={setValue}/>}
   warningField={<Field field={["budgetWarningPercent","סף התקרבות לתקציב","%",1,100,1]} value={state.budgetWarningPercent} provenance={state.budgetWarningProvenance} onChange={(_,value)=>setState(s=>({...s,budgetWarningPercent:value,budgetWarningProvenance:"user"}))}/>}/>
  <p role="status">{notice}</p>
 </div>;
 return <div className="sod29-resource" data-experience-capability="admin-resource-simulator">
  <header className="sod29-resource-heading"><div><div className="sod29-kicker">תכנון לפני חיבור · TIKTOK</div><h2>לפני שמעלים, רואים את התמונה.</h2><p className="sod29-muted">אותו מרכז ניהול. הנחות ניתנות לעריכה, תרחישים ועלויות מחושבות.</p></div><div className="sod29-actions"><button className="sod29-action" onClick={()=>{setName("");dialog.current.showModal();}}>שמירת תרחיש</button><button className="sod29-action" onClick={exportState}>ייצוא</button><button className="sod29-action" onClick={()=>file.current.click()}>ייבוא</button><input ref={file} type="file" accept="application/json,.json" hidden onChange={importState}/></div></header>
  <div role="status" aria-live="polite" className="sod29-resource-notice">{notice||"התוצאות הן אומדן לתכנון. שימוש קיים, מכסות ותשלומים שלא הזנת נשארים דוגמאות — לא נתוני חיוב."}</div>
  <section className="sod29-resource-card"><div className="sod29-resource-heading"><div><h3>נקודת הפתיחה מהמערכת</h3><p className="sod29-muted">אותו admin_system_health שהמסך כבר קרא · {observations.observedAt?new Date(observations.observedAt).toLocaleString("he-IL"):"אין קריאה תקינה"}</p></div><button className="sod29-action" disabled={refreshing||!onRefresh} onClick={onRefresh}>{refreshing?"מרענן…":"רענן מעקב"}</button></div>
   <div className="sod29-resource-observations"><div><small>אחסון קבצים · נפח נוכחי</small><strong>{observations.storage.valueGB===null?"לא ידוע":`${num(observations.storage.valueGB)} GB`}</strong><small>{observations.storage.basis} · אינו ממוצע חודשי</small></div><div><small>מסד נתונים · נפח נוכחי</small><strong>{observations.database.valueGB===null?"לא ידוע":`${num(observations.database.valueGB)} GB`}</strong><small>מוצג בנפרד; לא הוזן למכסת קבצים</small></div><div><small>תעבורה שנצפתה · 24 שעות</small><strong>{observations.egress24h.valueGB===null?"לא ידוע":`${num(observations.egress24h.valueGB)} GB`}</strong><small>{observations.egress24h.basis} · אינה חיוב ספק</small></div><div><small>תעבורה מהמטמון · ספק</small><strong>{observations.providerCached.valueGB===null?"לא ידוע":`${num(observations.providerCached.valueGB)} GB`}</strong><small>{observations.providerCached.basis}</small></div></div>
   <button className="sod29-action" disabled={observations.storage.valueGB===null||!observations.observedAt} onClick={applySnapshot}>השתמש בנפח האחסון הנוכחי כהנחה לממוצע חודשי</button>
   <p className="sod29-muted">אין המרה אוטומטית של תעבורה יומית לחיוב חודשי. מכסות ותעריפים דורשים הזנה. קובץ הייצוא מהסימולטור הפרטי הקודם ניתן לייבוא כאן.</p>
  </section>
  <div className="sod29-resource-presets"><span>דוגמאות לתכנון</span>{PRESETS.map(p=><button key={p.id} className="sod29-action" aria-pressed={state.scenarioName===p.name} onClick={()=>loadPreset(p)}>{p.name}<small>{p.desc}</small></button>)}</div>
  <div className="sod29-resource-heading"><span>{state.scenarioName} · אומדן מחושב</span><div className="sod29-actions"><label>מבט על <select value={month} onChange={e=>selectMonth(Number(e.target.value))}>{result.rows.map(r=><option key={r.month} value={r.month}>חודש {r.month}</option>)}</select></label><label>מטבע <select value={state.currency} onChange={e=>setState(s=>({...s,currency:e.target.value}))}><option value="USD">דולר</option><option value="ILS">שקל לפי השער שהזנת</option></select></label></div></div>
  <div className="sod29-resource-kpis">
   <div className="sod29-resource-card featured"><small>תוספת חודשית משוערת</small><strong>{money(row.delta)}</strong><p>סה״כ {money(row.total)} · לפני החיבור {money(row.base)}</p><small>רגישות ±{state.values.uncertainty}%: {money(sensitivity[0].rows[month-1].delta)} – {money(sensitivity[1].rows[month-1].delta)}</small></div>
   <div className="sod29-resource-card"><small>תוספת אחסון בסוף החודש</small><strong>{num(row.storageEnd)} GB</strong><p>ממוצע לחיוב: {num(row.usage.storage)} GB</p><small>{num(row.active,0)} סרטונים שמורים</small></div>
   <div className="sod29-resource-card"><small>תעבורה יוצאת בחודש</small><strong>{num(row.usage.cached+row.usage.uncached)} GB</strong><p>מהמטמון: {num(row.usage.cached)} GB</p><small>נכנסת: {num(row.ingress)} GB · ביניים: {num(row.proxyGB)} GB</small></div>
   <div className="sod29-resource-card"><small>עיבוד בחודש</small><strong>{num(row.usage.cpu)} שעות CPU</strong><p>{num(row.usage.memory)} GB-h זיכרון</p><small>{num(row.attempts,0)} ניסיונות · {num(row.usage.calls,0)} הפעלות</small></div>
  </div>
  <div className="sod29-resource-layout">
   <section className="sod29-resource-card assumptions"><h3>הנחות הסימולציה</h3><p className="sod29-muted">{sourceCounts.user||0} הזנות שלך · {sourceCounts.snapshot_assumption||0} הנחות מנתונים שנקראו · {sourceCounts.reference||0} תעריפים ממקור</p>
    {GROUPS.map((group,i)=><details key={group.id} open={i===0?true:undefined}><summary>{group.title}</summary><p className="sod29-muted">{group.subtitle}</p>{group.fields.map(f=><Field key={f[0]} field={f} value={state.values[f[0]]} provenance={state.provenance[f[0]]} onChange={setValue} disabled={state.values.mode==="embed"&&["keepOriginal","renditionPercent","variants"].includes(f[0])}/>)}</details>)}
    <div className="sod29-actions"><button className="sod29-action" onClick={()=>{setState(s=>({...s,values:{...s.values,includedStorage:100,includedUncached:250,includedCached:250},provenance:{...s.provenance,includedStorage:"scenario",includedUncached:"scenario",includedCached:"scenario"},scenarioName:"תרחיש מותאם"}));setNotice("נטענו מכסות Pro לדוגמה בלבד; התוכנית שלך לא אומתה.");}}>מכסות Pro לדוגמה</button><button className="sod29-action" onClick={()=>setState(s=>({...freshState(),saved:s.saved,currency:s.currency}))}>איפוס ההנחות</button></div>
   </section>
   <div className="sod29-resource-results">
    <section className="sod29-resource-card"><div className="sod29-resource-heading"><h3>איך העלות מתפתחת?</h3><span>{state.values.months} חודשים</span></div><p className="sod29-muted">קו מלא: סה״כ · קו מקווקו: לפני החיבור · לחץ על נקודה לבחירת חודש</p><Forecast rows={result.rows} selected={month} onSelect={selectMonth} currency={currency} money={money}/><div className="sod29-resource-totals"><div><small>תוספת מצטברת באופק</small><strong>{money(result.cumulativeDelta)}</strong></div><div><small>סה״כ מצטבר</small><strong>{money(result.cumulative)}</strong></div><div><small>חריגה ראשונה מתקציב התוספת</small><strong>{result.rows.find(r=>r.delta>state.values.budget)?`חודש ${result.rows.find(r=>r.delta>state.values.budget).month}`:"אין באופק"}</strong></div></div></section>
    <section className="sod29-resource-card"><h3>לאן הולכת התוספת?</h3>{costEntries.length?costEntries.map(e=><div className="sod29-resource-cost" key={e.key}><span>{e.name}</span><div><i style={{width:`${Math.abs(row.deltaCosts[e.key])/maxCost*100}%`}}/></div><strong>{money(row.deltaCosts[e.key])}</strong></div>):<p className="sod29-muted">אין תוספת עלות לפי המכסות והתעריפים שהוגדרו. הצריכה עדיין יכולה לגדול.</p>}<p className="sod29-muted">לפני החיבור {money(row.base)} + תוספת {money(row.delta)} = סה״כ {money(row.total)}</p></section>
    <section className="sod29-resource-card"><h3>האם המכסות יספיקו?</h3>{METERS.map(m=>{const base=state.values[m.base],add=row.usage[m.key],quota=state.values[m.included],den=Math.max(base+add,quota,.000001);return <div className="sod29-resource-quota" key={m.key}><div><span>{m.name}</span><span>{num(base+add)} / {quota>0?num(quota):"לא הוגדרה מכסה"} {m.unit}</span></div><div className="track" role="img" aria-label={`${m.name}: קיים ${num(base)}, תוספת ${num(add)}, מכסה ${num(quota)}`}><i style={{width:`${base/den*100}%`}}/><b style={{width:`${add/den*100}%`}}/></div><small>קיים {num(base)} + תוספת {num(add)}{quota>0&&base+add>quota?` · חריגה ${num(base+add-quota)}`:""}</small></div>;})}<p className="sod29-muted">מכסה 0: לא הונחה מכסה כלולה. הסימולטור אינו אוכף מגבלות ספק.</p></section>
   </div>
  </div>
  <section className="sod29-resource-card"><h3>השוואת תרחישים · חודש {month}</h3><p className="sod29-muted">הדוגמאות חולקות תעריפים ומכסות נוכחיים. תרחישים שמורים מכילים צילום מלא של ההנחות.</p><div className="sod29-resource-table"><table><thead><tr>{["תרחיש","העלאות בחודש","אחסון בסוף · GB","תעבורה · GB","שעות CPU","תוספת","סה״כ","פעולה"].map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead><tbody>{comparisons.map((c,i)=><tr key={`${c.kind}-${i}`} className={c.kind==="current"?"current":""}><td>{c.name}<small>{c.kind==="saved"?"צילום מלא":c.kind==="example"?"דוגמת תרחיש":"הנחות נוכחיות"}</small></td><td>{num(c.row.uploads,0)}</td><td>{num(c.row.storageEnd)}</td><td>{num(c.row.usage.cached+c.row.usage.uncached)}</td><td>{num(c.row.usage.cpu)}</td><td>{money(c.row.delta)}</td><td>{money(c.row.total)}</td><td>{c.kind==="current"?"פעיל":<button className="sod29-action" onClick={()=>c.preset?loadPreset(c.preset):setState(s=>{const snapshot=s.saved[c.index];return {...s,values:{...snapshot.values},provenance:{...snapshot.provenance},scenarioName:snapshot.name,assumptionSources:snapshot.assumptionSources?structuredClone(snapshot.assumptionSources):undefined};})}>טען</button>}{c.kind==="saved"?<button className="sod29-action" onClick={()=>setState(s=>({...s,saved:s.saved.filter((_,i)=>i!==c.index)}))} aria-label={`מחיקת תרחיש ${c.name}`}>מחק</button>:null}</td></tr>)}</tbody></table></div></section>
  <section className="sod29-resource-card"><h3>מה הזנת, ומה הוערך?</h3><p className="sod29-muted">הזנה שלך אינה אישור שהנתון נמדד. טעינת נפח נוכחי יוצרת הנחת ממוצע, עם מקור ומועד המדידה. כל תוצאה נשארת אומדן.</p><div className="sod29-actions">{Object.keys(LABELS).map(kind=><Badge key={kind} kind={kind}/>)}</div><details><summary>כל ההנחות ומקורותיהן</summary><div className="sod29-resource-table"><table><thead><tr><th scope="col">הנחה</th><th scope="col">ערך</th><th scope="col">סיווג</th><th scope="col">מקור</th></tr></thead><tbody>{FIELDS.map(([key,label,unit])=><tr key={key}><td>{label}</td><td>{fmtValue(key,state.values[key])} {unit}</td><td><Badge kind={state.provenance[key]}/></td><td>{state.provenance[key]==="reference"&&SOURCES[key]?<a href={SOURCES[key].url} target="_blank" rel="noopener noreferrer">{SOURCES[key].label} ↗</a>:state.provenance[key]==="snapshot_assumption"?<span>admin_system_health · {new Date(state.assumptionSources.baseStorage.observedAt).toLocaleString("he-IL")} · נפח נוכחי שהפך להנחת ממוצע</span>:state.provenance[key]==="user"?"ערך שסיפקת; לא אומת":"דוגמה לצורך תכנון"}</td></tr>)}</tbody></table></div></details><p className="sod29-muted">תעריפי הייחוס נבדקו ב־04.10.2026 ואינם מתעדכנים אוטומטית. CPU וזיכרון: Vercel iad1. תעריפי נתונים/יומנים, שרת ביניים, AI ושער השקל הם דוגמאות. התוכנית והמכסות שלך לא נבדקו.</p></section>
  <section className="sod29-resource-card"><details><summary>נוסחאות וגבולות המודל</summary><div className="sod29-resource-method"><p>חודש = 30 יום; GB = 1,000 MB. העלאות נכנסות באופן אחיד מדי יום; הגידול חל מדי חודש. התוכן ויומני העיבוד יוצאים לפי משך השמירה. השימוש הקיים קבוע.</p><p>אחסון: מקור, אם נשמר + גרסאות צפייה + תמונה. לחיוב משתמשים בממוצע החודשי. נתונים ויומנים הם קירוב ללא אינדקסים, ניפוח טבלאות וגיבויים.</p><p>תעבורה: מספר סרטונים ממוצע × צפיות חודשיות × גודל גרסה אחת × חלק שנשלח, ועוד תמונות ומטא־דאטה. מטמון חל על קבצים בלבד. ingress מוצג ללא חיוב. שרת ביניים מוסיף את מקטע הרשת שבחרת.</p><p>עיבוד: ניסיונות = העלאות × (1 + ניסיונות חוזרים). CPU-hours = ניסיונות × שניות CPU / 3,600. GB-hours = ניסיונות × זמן ריצה × זיכרון / 3,600; קירוב ללא שיתוף מופעים. AI לפי דקות מדיה בכל ניסיון.</p><p>עלות לכל משאב = max(0, שימוש קיים + תוספת − מכסה) × תעריף. זיכוי עיבוד חל פעם אחת. תוספת = עלות אחרי החיבור − עלות לפניו. סה״כ כולל רק תשלומים ותוספות שהזנת, ללא מסים, DB compute או הנחות שלא הוזנו.</p><p>רגישות משנה את קצב ההעלאות ואת הצריכה הנגזרת ומחשבת מחדש מכסות. זו אינה תחזית הסתברותית. השמירה מקומית לדפדפן; ייצוא/ייבוא מעביר גם תרחישים שנוצרו בכלי הפרטי המקורי.</p></div></details><details><summary>טבלת התחזית החודשית</summary><div className="sod29-resource-table"><table><thead><tr>{["חודש","העלאות","אחסון בסוף · GB","אחסון ממוצע · GB","תעבורה · GB","CPU · שעות","סה״כ","תוספת"].map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead><tbody>{result.rows.map(r=><tr key={r.month}><td>{r.month}</td><td>{num(r.uploads,0)}</td><td>{num(r.storageEnd)}</td><td>{num(r.usage.storage)}</td><td>{num(r.usage.cached+r.usage.uncached)}</td><td>{num(r.usage.cpu)}</td><td>{money(r.total)}</td><td>{money(r.delta)}</td></tr>)}</tbody></table></div></details></section>
  <dialog ref={dialog} className="sod29-resource-dialog"><form onSubmit={save}><h3>שמירת תרחיש</h3><label>שם התרחיש<input value={name} maxLength={48} required onChange={e=>setName(e.target.value)}/></label><p>כל ההנחות נשמרות בדפדפן הזה. ייצוא קובץ מאפשר להעביר אותן למכשיר אחר.</p><div className="sod29-actions"><button className="sod29-action" type="submit">שמור</button><button className="sod29-action" type="button" onClick={()=>dialog.current.close()}>ביטול</button></div></form></dialog>
 </div>;
}
