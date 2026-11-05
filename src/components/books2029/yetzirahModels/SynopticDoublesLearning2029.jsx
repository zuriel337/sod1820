import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload} from './sourceModels.js';
import './synopticSealsLearning2029.css';
export default function SynopticDoublesLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}){
 const {model,bundle}=useSourceModel('doubles-synoptic',sourceBundle),palette=use2029Palette();if(!model)return null;
 const active=selectedComponent(model,selectedId)||model.components[0];
 const locate=id=>{const u=bundle.units.units.find(x=>x.id===id);return u&&{unit_id:u.id,pdf_page:u.pdf_page,source_ref:u.source_ref,page_region:u.page_region,source_anchor:u.source_anchor};};
 const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
 const open=source=>source&&onOpenSource?.({...sourcePayload(model,active),source,returnTo:{structureId:model.id,selectedId:active.stable_id}});
 const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
 return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="synoptic-doubles-learning-title"><header><span>מסלול לימוד · הגוף המשולב · PDF 105–110</span><h2 id="synoptic-doubles-learning-title">שבע אותיות, שלושה תחומי קריאה</h2><p>קראו תחילה את מסגרת הכוכבים, הימים והשערים. בחרו אות, עברו על שלושת השדות שלה, ואז השוו לאות אחרת בטבלה ובהמחשה.</p></header>
 <nav aria-label="תחנות שבע הכפולות">{model.components.map((c,i)=><button key={c.id} type="button" aria-pressed={c.id===active.id} onClick={()=>select(c)}><span>תחנה {i+1}</span><strong>{c.label_he}</strong></button>)}</nav>
 <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה · {active.label_he}</span><p>הפסקה בונה שורה מתוך שלושה תחומים: כוכב בעולם, יום בשנה ושער בנפש. בחרו אות אחרת ובדקו מה משתנה בכל תחום.</p></div><div><span>ההקבלות בבחירה</span><strong>{active.label_he}</strong><p>עולם: {active.world_planet} · שנה: {active.week_day} · נפש: {active.soul_gate}</p><button type="button" onClick={()=>open(active.source)}>פתחו את פסקת האות · PDF {active.source.pdf_page}</button></div></div>
 <div className="ssl-reading"><article><span>דברי הספר · מסגרת · PDF 105</span><blockquote>״כוכבים בעולם וימים בשנה ושערים בנפש״</blockquote><p>פסקאות האותיות שאחריה מפרטות את ההקבלות. הסדר והערכים כאן שייכים לגוף המשולב.</p><button type="button" onClick={()=>open(locate('sy:synoptic:text:ch4:world-year-soul'))}>פתחו את מסגרת הכפולות · PDF 105</button></article><article><span>פירוש מודפס · הראב״ד · PDF 106</span><p>הראב״ד דן בהמלכת בי״ת וביחס בין סדר הכוכבים לסדר ההקבלות. הטור המודפס נפתח בנפרד מפסקת האות שנבחרה.</p><button type="button" onClick={()=>open(locate('sy:synoptic:raavad:ch4:planet-correspondences'))}>פתחו את פירוש הראב״ד · PDF 106</button><p>עמוד 110 דהוי; השורות שנקראו נשמרות כמוגבלות למקור זה, ויתר הפירוש דורש עיון בסריקה.</p></article></div>
 <p className="ssl-note">ייצוג של מבנה הספר: השדות הם מן העד המודפס. מיקום, גובה, צבע ומרחק בהמחשה נבחרו לצורכי קריאה ואינם סדר אסטרונומי שנקבע כאן.</p></section>;
}
