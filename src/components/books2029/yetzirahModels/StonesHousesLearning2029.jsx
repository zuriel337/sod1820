import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload} from './sourceModels.js';
import './synopticSealsLearning2029.css';
export default function StonesHousesLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}){
 const {model,bundle}=useSourceModel('stones-houses',sourceBundle),palette=use2029Palette();if(!model)return null;
 const active=selectedComponent(model,selectedId)||model.components[0];
 const locate=id=>{const u=bundle.units.units.find(x=>x.id===id);return u&&{unit_id:u.id,pdf_page:u.pdf_page,source_ref:u.source_ref,page_region:u.page_region,source_anchor:u.source_anchor};};
 const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
 const open=source=>source&&onOpenSource?.({...sourcePayload(model,active),source,returnTo:{structureId:model.id,selectedId:active.stable_id}});
 const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
 return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="stones-learning-title"><header><span>מסלול לימוד · הגוף המשולב · PDF 111</span><h2 id="stones-learning-title">מן האבנים אל הבתים</h2><p>המשנה מתארת כמה בתים בונות קבוצות הולכות וגדלות של אבנים. בחרו שורה, קראו את המניין המודפס והשוו לשורה שאחריה בטבלה.</p></header>
 <nav aria-label="תחנות האבנים והבתים">{model.components.map((c,i)=><button key={c.id} type="button" aria-pressed={c.id===active.id} onClick={()=>select(c)}><span>תחנה {i+1}</span><strong>{c.label_he}</strong></button>)}</nav>
 <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה</span><p>האבנים הן רכיבי המשל, והבתים הם הבתים שהמקור מונה לכל קבוצה. המעבר בין שורות מזמין השוואה; המספרים המוצגים כאן נקראו מן המקור ואינם תוצאת מנוע.</p></div><div><span>השורה הנבחרת</span><strong>{active.source_stones} אבנים · {active.source_houses} בתים</strong><button type="button" onClick={()=>open(active.source)}>פתחו את פסקת האבנים · PDF 111</button></div></div>
 <div className="ssl-reading"><article><span>דברי הספר · PDF 111</span><blockquote>״שתי אבנים בונות שני בתים״</blockquote><p>הרשימה ממשיכה עד שבע אבנים ומספר הבתים המיוחס להן. אפשר לקרוא כל שורה במקור לפני פתיחת ההמחשה.</p><button type="button" onClick={()=>open(active.source)}>פתחו את המשנה · PDF 111</button></article><article><span>המשך קריאה · רל״א שערים · PDF 83 ו־203</span><p>במקום אחר בכרך האותיות נקבעות בגלגל רל״א שערים; לוח הגר״א נמצא בעמוד 203. אלה מקורות נפרדים למשל האבנים והבתים.</p><button type="button" onClick={()=>open(locate('sy:synoptic:text:ch2:gates-wheel'))}>פתחו את פסקת הגלגל · PDF 83</button> <button type="button" onClick={()=>open(locate('sy:gra-gates:gra:body:title-grid'))}>פתחו את לוח הגר״א · PDF 203</button><p><a href="#yetzirah29-letter-lab-title">עברו למעבדת האותיות הקיימת</a></p><p>לפירושים המודפסים שבעמוד 111 טרם מופה עוגן יחידה נפרד; אפשר לעיין בהם בסריקה.</p></article></div>
 <p className="ssl-note">ייצוג של מבנה הספר: הסימנים, הגודל, הגובה והמרחק בהמחשה הם אמצעי קריאה. המניינים הם דברי המקור; לא בוצע אימות במנוע.</p></section>;
}
