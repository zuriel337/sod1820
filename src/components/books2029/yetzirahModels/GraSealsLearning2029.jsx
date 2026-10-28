import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload} from './sourceModels.js';
import './synopticSealsLearning2029.css';

const PAIRS=[
 {ids:['up','down'],title:'רום ותחת',explanation:'קראו את שתי הפניות הראשונות: למעלה ולמטה. השוו את סדר האותיות שבחותם של כל פנייה.'},
 {ids:['east','west'],title:'מזרח ומערב',explanation:'המקור עובר לפנייה לפנים ולאחור. בחרו כל כיוון וקראו את החותם שלו בעדות הגר״א עצמה.'},
 {ids:['south','north'],title:'דרום וצפון',explanation:'הפנייה לימין ולשמאל משלימה את שש הקצוות. השוו את סדרן לזה של שני הזוגות הקודמים.'},
];
export default function GraSealsLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}){
 const {model,bundle}=useSourceModel('six-seals-gra-edition',sourceBundle),palette=use2029Palette();if(!model)return null;
 const active=selectedComponent(model,selectedId)||model.components[0],pair=PAIRS.find(x=>x.ids.includes(active.id))||PAIRS[0];
 const commentary=bundle.units.units.find(u=>u.id==='sy:gra-edition:gra:ch1:seals');
 const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
 const open=source=>onOpenSource?.({...sourcePayload(model,active),source,returnTo:{structureId:model.id,selectedId:active.stable_id}});
 const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
 return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="gra-seals-learning-title">
  <header><span>מסלול לימוד · נוסח הגר״א · PDF 175</span><h2 id="gra-seals-learning-title">שש החותמות בנוסח הגר״א</h2><p>קראו תחילה את ההקדמה לחותמות, ואחריה את שש הפניות. כל חותם נשמר כאן עם העדות והעמוד שלו; ההשוואה בהמשך מציגה את הגוף המשולב בנפרד.</p></header>
  <nav aria-label="תחנות הלימוד של חותמות הגר״א">{PAIRS.map((p,i)=><button key={p.title} type="button" aria-pressed={p===pair} onClick={()=>select(model.components.find(c=>c.id===p.ids[0]))}><span>תחנה {i+1}</span><strong>{p.title}</strong></button>)}</nav>
  <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה · {pair.title}</span><p>{pair.explanation}</p></div><div><span>כיוון נבחר</span><strong>{active.label_he} · <bdi dir="rtl">{active.seal_letters.join('')}</bdi></strong><div>{pair.ids.map(id=>{const c=model.components.find(x=>x.id===id);return <button key={id} type="button" aria-pressed={c.id===active.id} onClick={()=>select(c)}>{c.label_he} · <bdi dir="rtl">{c.seal_letters.join('')}</bdi></button>;})}</div><button type="button" onClick={()=>open(active.source)}>פתחו את מקור הבחירה · PDF 175</button></div></div>
  <div className="ssl-reading"><article><span>דברי הספר · קטע מן התיבה</span><blockquote>״בסוד שלש אמות אמ״ש״</blockquote><p>הפתיחה מזכירה את שלוש האימהות; החותמות שברשימת הכיוונים נכתבות בצירופים של י׳, ה׳ ו־ו׳. אין להחליף ביניהן.</p><button type="button" onClick={()=>open(active.source)}>פתחו את המשנה · PDF 175</button></article><article><span>פירוש מודפס · הגר״א · PDF 175</span><p>הפירוש עוסק בקצוות ובצירופים. בעמוד מופיע גם ביאור שכותרתו ״אופן ב״; הוא נשמר כאן כעוגן לאותו מקום, ולא כאיחוד עם פירוש אחר.</p>{commentary&&<button type="button" onClick={()=>open({unit_id:commentary.id,pdf_page:commentary.pdf_page,source_ref:commentary.source_ref,page_region:commentary.page_region,source_anchor:commentary.source_anchor})}>פתחו את פירוש הגר״א · PDF 175</button>}<p>פרטי הטור המודפס דורשים קריאה נוספת; העמוד זמין בשלמותו במקור.</p></article></div>
  <p className="ssl-note">ייצוג של מבנה הספר: הכיוונים והחותמות נלקחו מעדות הגר״א. צורת התצוגה, הצבע, המרחק והמרכז הם אמצעי המחשה; המרכז אינו ספירה נוספת.</p>
 </section>;
}
