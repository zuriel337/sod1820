import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload} from './sourceModels.js';
import './synopticSealsLearning2029.css';
export default function GraDoublesLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}){
 const {model,bundle}=useSourceModel('doubles-gra-distinction',sourceBundle),palette=use2029Palette();if(!model)return null;
 const active=selectedComponent(model,selectedId)||model.components[0];
 const locate=id=>{const u=bundle.units.units.find(x=>x.id===id);return u&&{unit_id:u.id,pdf_page:u.pdf_page,source_ref:u.source_ref,page_region:u.page_region,source_anchor:u.source_anchor};};
 const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
 const open=source=>source&&onOpenSource?.({...sourcePayload(model,active),source,returnTo:{structureId:model.id,selectedId:active.stable_id}});
 const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
 return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="gra-doubles-learning-title"><header><span>מסלול לימוד · נוסח הגר״א · PDF 184–185</span><h2 id="gra-doubles-learning-title">שבע הכפולות בנוסח הגר״א</h2><p>קראו תחילה את מסגרת הכוכבים, הימים והשערים. בחרו אות, עברו על התכונה ושלושת השדות שלה, ואז השוו לאות אחרת בטבלה ובהמחשה.</p></header>
 <nav aria-label="תחנות שבע הכפולות">{model.components.map((c,i)=><button key={c.id} type="button" aria-pressed={c.id===active.id} onClick={()=>select(c)}><span>תחנה {i+1}</span><strong>{c.label_he}</strong></button>)}</nav>
 <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה · {active.label_he}</span><p>הפסקה בונה שורה מתוך שלושה תחומים: כוכב בעולם, יום בשנה ושער בנפש. בחרו אות אחרת ובדקו מה משתנה בכל תחום.</p></div><div><span>ההקבלות בבחירה</span><strong>{active.label_he}</strong><p>תכונה: {active.quality} · עולם: {active.world_planet} · שנה: {active.week_day} · נפש: {active.soul_gate}</p><button type="button" onClick={()=>open(active.source)}>פתחו את פסקת האות · PDF {active.source.pdf_page}</button></div></div>
 <div className="ssl-reading"><article><span>דברי הספר · מסגרת · PDF 184</span><blockquote>״שבעה כוכבים בעולם״</blockquote><p>פסקאות האותיות שאחריה מפרטות את ההקבלות. הסדר והערכים כאן שייכים לנוסח הגר״א.</p><button type="button" onClick={()=>open(locate('sy:gra-edition:text:ch4:world-year-soul'))}>פתחו את מסגרת הכפולות · PDF 184</button></article><article><span>פירוש מודפס · הגר״א · PDF 184</span><p>הגר״א מלווה את סדר ההמלכות בדיון בכוכבים ובשערי הנפש. טור הפירוש נפתח בנפרד מתיבת המקור.</p><button type="button" onClick={()=>open(locate('sy:gra-edition:gra:ch4:crowning'))}>פתחו את פירוש הגר״א · PDF 184</button><p>בעמוד 185 נמשכות חמש האותיות האחרונות. השוואת העדויות שלהלן שומרת כל נוסח בעמודיו ובלי להעביר שדות מאחד לשני.</p></article></div>
 <p className="ssl-note">ייצוג של מבנה הספר: השדות הם מן העד המודפס. מיקום, גובה, צבע ומרחק בהמחשה נבחרו לצורכי קריאה ואינם סדר אסטרונומי שנקבע כאן.</p></section>;
}
