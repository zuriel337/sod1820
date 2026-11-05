import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload} from './sourceModels.js';
import './synopticSealsLearning2029.css';
const GUIDES={alef:'אל״ף נקשרת לרוח: קראו את האוויר בעולם, הרוויה בשנה והגוויה בנפש. בפסקת העולם האוויר מכריע בין האש למים.',mem:'מ״ם נקשרת למים: קראו את הארץ בעולם, הקור בשנה והבטן בנפש. שלושת התחומים נזכרים יחד בפסקת האות.',shin:'שי״ן נקשרת לאש: קראו את השמיים בעולם, החום בשנה והראש בנפש. שימו לב שהפסקה חותמת את הפרק.'};
export default function MothersLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}){
 const {model,bundle}=useSourceModel('mothers-world-year-soul',sourceBundle),palette=use2029Palette();if(!model)return null;
 const active=selectedComponent(model,selectedId)||model.components[0];
 const locate=id=>{const u=bundle.units.units.find(x=>x.id===id);return u&&{unit_id:u.id,pdf_page:u.pdf_page,source_ref:u.source_ref,page_region:u.page_region,source_anchor:u.source_anchor};};
 const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
 const open=source=>source&&onOpenSource?.({...sourcePayload(model,active),source,returnTo:{structureId:model.id,selectedId:active.stable_id}});
 const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
 return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="mothers-learning-title"><header><span>מסלול לימוד · הגוף המשולב · PDF 94–99</span><h2 id="mothers-learning-title">אות אחת, שלושה תחומים</h2><p>בחרו אם אחת וקראו את ההקבלות שלה בעולם, בשנה ובנפש. אחר כך החליפו אות והשוו בין השורות בטבלה המקורית שלהלן.</p></header>
 <nav aria-label="תחנות שלוש האימהות">{model.components.map((c,i)=><button key={c.id} type="button" aria-pressed={c.id===active.id} onClick={()=>select(c)}><span>תחנה {i+1}</span><strong>{c.label_he}</strong></button>)}</nav>
 <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה · {active.label_he}</span><p>{GUIDES[active.id]}</p></div><div><span>ההקבלות בבחירה</span><strong>{active.label_he} · {active.element}</strong><p>עולם: {active.world} · שנה: {active.year} · נפש: {active.soul}</p><button type="button" onClick={()=>open(active.source)}>פתחו את פסקת האות · PDF {active.source.pdf_page}</button></div></div>
 <div className="ssl-reading"><article><span>דברי הספר · עולם · PDF 94</span><blockquote>״והאויר מכריע בין האש ובין המים״</blockquote><p>בעמוד הבא מופיעות גם הקבלות השנה והנפש; בהמשך נידונה כל אות בפסקה שלה.</p><button type="button" onClick={()=>open(locate('sy:synoptic:text:ch3:world'))}>פתחו את פסקת העולם · PDF 94</button> <button type="button" onClick={()=>open(locate('sy:synoptic:text:ch3:year-soul'))}>פתחו שנה ונפש · PDF 95</button></article><article><span>פירוש מודפס · הראב״ד · PDF 94</span><p>הראב״ד מבאר את שמיים, ארץ ואוויר ביחס לאש, מים ורוח. זהו פירוש לצד תיבת המשנה, עם עוגן נפרד לה.</p><button type="button" onClick={()=>open(locate('sy:synoptic:raavad:ch3:world-elements'))}>פתחו את פירוש הראב״ד · PDF 94</button><p>קריאה מלאה של טורי הפירושים נותרת לעיון בסריקה.</p></article></div>
 <p className="ssl-note">ייצוג של מבנה הספר: ההקבלות וההכרעה בין האש למים מקורן בעד הזה. צבע, גובה, מרחק וצורת ההמחשה אינם מדרגה או מידה במקור.</p></section>;
}
