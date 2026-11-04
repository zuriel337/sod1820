import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload} from './sourceModels.js';
import './synopticSealsLearning2029.css';

const PAIRS = [
  {ids:['up','down'], title:'רום ותחת', guide:'פתחו ברום ובתחת. שימו לב שהפנייה למעלה ולמטה מלווה בכל פעם בסדר אחר של אותן שלוש אותיות.'},
  {ids:['east','west'], title:'מזרח ומערב', guide:'עברו למזרח ולמערב. המקור קושר אותם לפנייה לפנים ולאחור; השוו את סדר האותיות לזה של הזוג הראשון.'},
  {ids:['south','north'], title:'דרום וצפון', guide:'השלימו בדרום ובצפון: פנייה לימין ולשמאל. כעת אפשר לקרוא את ששת הכיוונים כרצף ולחזור לכל חותם בנפרד.'},
];
export default function SynopticSealsLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}) {
  const {model,bundle}=useSourceModel('six-seals-synoptic',sourceBundle);
  const palette=use2029Palette();
  if(!model)return null;
  const active=selectedComponent(model,selectedId)||model.components[0];
  const pair=PAIRS.find(p=>p.ids.includes(active.id))||PAIRS[0];
  const commentary=bundle.units.units.find(u=>u.id==='sy:synoptic:raavad:ch1:seals');
  const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
  const open=(source,component=active)=>onOpenSource?.({...sourcePayload(model,component),source,returnTo:{structureId:model.id,selectedId:component.stable_id}});
  const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
  return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="ssl-title">
    <header><span>מסלול לימוד · הגוף המשולב · PDF 73</span><h2 id="ssl-title">לקרוא את שש החותמות בזוגות</h2><p>המשנה עוברת בין שישה כיוונים וחותמת כל אחד בצירוף משלו. קראו תחילה את הפנייה, אחר כך את האותיות לפי סדרן, ולבסוף השוו את הכיוון שממול.</p></header>
    <nav aria-label="תחנות הלימוד של החותמות">{PAIRS.map((p,i)=><button type="button" key={p.title} aria-pressed={p===pair} onClick={()=>select(model.components.find(c=>c.id===p.ids[0]))}><span>תחנה {i+1}</span><strong>{p.title}</strong></button>)}</nav>
    <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה · {pair.title}</span><p>{pair.guide}</p></div><div><span>כיוון נבחר</span><strong>{active.label_he} · <bdi dir="rtl">{active.seal_letters.join('')}</bdi></strong><div>{pair.ids.map(id=>{const c=model.components.find(x=>x.id===id);return <button key={id} type="button" aria-pressed={c.id===active.id} onClick={()=>select(c)}>{c.label_he} · <bdi dir="rtl">{c.seal_letters.join('')}</bdi></button>;})}</div><button type="button" onClick={()=>open(active.source)}>פתחו את מקור הבחירה · PDF 73</button></div></div>
    <div className="ssl-reading"><article><span>דברי הספר · קטע מן התיבה</span><blockquote>״ופנה למעלה וחתמו ביה״ו״</blockquote><p>זהו קטע קצר מן החותם הראשון; יתר החותמות מופיעות בטבלה ובהמחשה שלהלן, בסדר המקור.</p><button type="button" onClick={()=>open(active.source)}>פתחו את המשנה · PDF 73</button></article><article><span>פירוש מודפס · הראב״ד · PDF 73</span><p>הראב״ד פותח בהבחנה בין ארבעת העומקים שנזכרו לפני כן — ראשית, אחרית, טוב ורע — לבין ששת קצוות הכיוון הנידונים כאן. כך הוא ממקם את החותמות בהמשך מהלך הפרק.</p>{commentary&&<button type="button" onClick={()=>open({unit_id:commentary.id,pdf_page:commentary.pdf_page,source_ref:commentary.source_ref,page_region:commentary.page_region,source_anchor:commentary.source_anchor})}>פתחו את פירוש הראב״ד · PDF 73</button>}<p>הפירוש ממשיך בעמוד 74; קריאה מפורטת נוספת של הטור נותרת פתוחה.</p></article></div>
    <p className="ssl-note">ייצוג של מבנה הספר: ששת הכיוונים והחותמות לקוחים מן העד הזה; צבע, מרחק ומרכז ההמחשה הם בחירות להתמצאות. המרכז אינו ספירה נוספת. הטבלה והמקור זמינים גם בלי להפעיל תלת־ממד.</p>
  </section>;
}
