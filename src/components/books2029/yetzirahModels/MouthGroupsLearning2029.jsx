import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload} from './sourceModels.js';
import './synopticSealsLearning2029.css';
export default function MouthGroupsLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}){
 const {model,bundle}=useSourceModel('five-mouth-groups',sourceBundle),palette=use2029Palette();if(!model)return null;
 const active=selectedComponent(model,selectedId)||model.components[0];
 const locate=id=>{const u=bundle.units.units.find(x=>x.id===id);return u&&{unit_id:u.id,pdf_page:u.pdf_page,source_ref:u.source_ref,page_region:u.page_region,source_anchor:u.source_anchor};};
 const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
 const open=source=>source&&onOpenSource?.({...sourcePayload(model,active),source,returnTo:{structureId:model.id,selectedId:active.stable_id}});
 const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
 return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="mouth-learning-title"><header><span>מסלול לימוד · הגוף המשולב · PDF 80</span><h2 id="mouth-learning-title">חמש קבוצות במוצאות הפה</h2><p>המשנה מציגה את האותיות בחמש קבוצות. בחרו קבוצה וקראו את אותיותיה לפי הסדר, ואז השוו אותה לקבוצה הבאה בטבלה ובהמחשה.</p></header>
 <nav aria-label="תחנות מוצאות הפה">{model.components.map((c,i)=><button key={c.id} type="button" aria-pressed={c.id===active.id} onClick={()=>select(c)}><span>תחנה {i+1}</span><strong>{c.label_he}</strong></button>)}</nav>
 <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה</span><p>הבחירה היא בקבוצת אותיות שלמה. השוו בין הקבוצות בלי לייחס למיקום הכרטיס בהמחשה מקום אנטומי או הגייה נוספת שלא הוצגו במקור.</p></div><div><span>הקבוצה הנבחרת</span><strong>{active.label_he}</strong><p>אותיות הקבוצה: {active.letters.join(' · ')}</p><button type="button" onClick={()=>open(active.source)}>פתחו את הקבוצה במקור · PDF 80</button></div></div>
 <div className="ssl-reading"><article><span>דברי הספר · PDF 80</span><blockquote>״קבועות בפה בחמשה מקומות״</blockquote><p>המשנה מצרפת לרשימה גם קול ורוח. הקבוצות נשמרות לפי סדרן בעד המודפס.</p><button type="button" onClick={()=>open(active.source)}>פתחו את המשנה · PDF 80</button></article><article><span>פירוש מודפס · הראב״ד · PDF 80</span><p>הראב״ד דן בקול, ברוח ובפה ומלווה את חלוקת האותיות. אפשר לפתוח את הטור לצד תיבת המשנה.</p><button type="button" onClick={()=>open(locate('sy:synoptic:raavad:ch2:mouth-letters'))}>פתחו את פירוש הראב״ד · PDF 80</button><p>הערות הדפוס והפירושים האחרים נותרו נפרדים; פרטי הגייה שאינם קריאים לא הושלמו.</p></article></div>
 <p className="ssl-note">ייצוג של מבנה הספר: קבוצות האותיות לקוחות מן המקור. גובה, צבע, מרחק ומיקום הכרטיסים אינם תרשים אנטומי או מדידה.</p></section>;
}
