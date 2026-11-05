import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload} from './sourceModels.js';
import './synopticSealsLearning2029.css';
const EXPLANATIONS={'five-a':'המשל פותח בחמישייה אחת מתוך מניין עשר האצבעות. בחרו את החמישייה שמולה כדי לראות את היחס המפורש ביניהן.','five-b':'החמישייה השנייה מוצגת כנגד הראשונה. המקור אינו נותן במשל שם ספירה נפרד לכל אצבע.','covenant':'ברית יחיד מכוונת באמצע בין שתי החמישיות. היא מוקד המשל ולא תוספת אחת־עשרה למניין הספירות.'};
export default function FiveAgainstFiveLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}){
 const {model,bundle}=useSourceModel('five-against-five',sourceBundle),palette=use2029Palette();if(!model)return null;
 const active=selectedComponent(model,selectedId)||model.components[0],u=bundle.units.units.find(x=>x.id==='sy:synoptic:raavad:ch1:fingers-covenant');
 const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
 const open=source=>source&&onOpenSource?.({...sourcePayload(model,active),source,returnTo:{structureId:model.id,selectedId:active.stable_id}});
 const commentary=u&&{unit_id:u.id,pdf_page:u.pdf_page,source_ref:u.source_ref,page_region:u.page_region,source_anchor:u.source_anchor};
 const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
 return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="five-learning-title"><header><span>מסלול לימוד · הגוף המשולב · PDF 45</span><h2 id="five-learning-title">שתי חמישיות ומוקד ביניהן</h2><p>המשנה ממשילה את עשר הספירות לעשר אצבעות. קראו את שתי החמישיות זו מול זו, ואחר כך את הברית המכוונת באמצע.</p></header>
 <nav aria-label="תחנות חמש כנגד חמש">{model.components.map((c,i)=><button key={c.id} type="button" aria-pressed={c.id===active.id} onClick={()=>select(c)}><span>תחנה {i+1}</span><strong>{c.label_he}</strong></button>)}</nav>
 <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה</span><p>{EXPLANATIONS[active.id]}</p></div><div><span>הרכיב הנבחר</span><strong>{active.label_he}</strong><p>בדקו בטבלה ובהמחשה כיצד הבחירה קשורה לשתי החמישיות ולמוקד המשל.</p><button type="button" onClick={()=>open(active.source)}>פתחו את הבחירה במקור · PDF 45</button></div></div>
 <div className="ssl-reading"><article><span>דברי הספר · PDF 45</span><blockquote>״חמש כנגד חמש וברית יחיד מכוונת באמצע״</blockquote><p>המשנה ממשיכה בתיאור הברית. העמוד המלא נשאר זמין לעיון גם ללא המחשה.</p><button type="button" onClick={()=>open(active.source)}>פתחו את המשנה · PDF 45</button></article><article><span>פירוש מודפס · הראב״ד · PDF 45</span><p>הראב״ד מבאר את החמישיות ואת הברית שביניהן באמצעות מבנה הגוף והכוחות. מקור הפירוש מובחן מתיבת המשנה.</p><button type="button" onClick={()=>open(commentary)}>פתחו את פירוש הראב״ד · PDF 45</button><p>פירוט הטור המלא נותר לעיון בסריקה.</p></article></div>
 <p className="ssl-note">ייצוג של מבנה הספר: שתי החמישיות והאמצע הם במשל. הצורה, הצבע והמרחק נבחרו להמחשה; המוקד האמצעי אינו ספירה נוספת.</p></section>;
}
