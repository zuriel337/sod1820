import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {DIRECTION_LABELS,selectedComponent,sourcePayload} from './sourceModels.js';
import './synopticSealsLearning2029.css';
const GROUPS=[['east','מזרח'],['south','דרום'],['west','מערב'],['north','צפון']];
export default function TwelveBoundariesLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}){
 const {model,bundle}=useSourceModel('twelve-boundaries-gra',sourceBundle),palette=use2029Palette();if(!model)return null;
 const active=selectedComponent(model,selectedId)||model.components[0],group=GROUPS.find(([id])=>active.id.startsWith(id+'-'))||GROUPS[0],members=model.components.filter(c=>c.id.startsWith(group[0]+'-'));
 const commentary=bundle.units.units.find(u=>u.id==='sy:gra-edition:gra:ch5:boundaries');
 const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
 const open=source=>onOpenSource?.({...sourcePayload(model,active),source,returnTo:{structureId:model.id,selectedId:active.stable_id}});
 const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
 return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="boundaries-learning-title"><header><span>מסלול לימוד · נוסח הגר״א · PDF 187</span><h2 id="boundaries-learning-title">לקרוא גבול משני כיוונים</h2><p>רשימת הגבולות מצרפת בכל שם שני כיוונים. התחילו בכיוון הראשון בשם, בחרו אחד משלושת הגבולות הסמוכים לו, ואז קראו את הכיוון השני.</p></header>
 <nav aria-label="תחנות גבולי האלכסון">{GROUPS.map(([id,label],i)=><button key={id} type="button" aria-pressed={id===group[0]} onClick={()=>select(model.components.find(c=>c.id.startsWith(id+'-')))}><span>תחנה {i+1}</span><strong>{label}</strong></button>)}</nav>
 <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה · {group[1]}</span><p>כאן מוצגים הגבולות ששמם ברשימה מתחיל ב{group[1]}. כל בחירה מדגישה את שני הכיוונים המרכיבים את השם, ללא שיוך אות לגבול.</p></div><div><span>גבול נבחר</span><strong>{active.label_he}</strong><p>{active.directions.map(d=>DIRECTION_LABELS[d]).join(' + ')}</p><div>{members.map(c=><button key={c.id} type="button" aria-pressed={c.id===active.id} onClick={()=>select(c)}>{c.label_he}</button>)}</div><button type="button" onClick={()=>open(active.source)}>פתחו את מקור הגבול · PDF 187</button></div></div>
 <div className="ssl-reading"><article><span>דברי הספר · קטע מן הרשימה</span><blockquote>״גבול מזרחית רומית״</blockquote><p>זהו הגבול הראשון ברשימה. לאחריו מופיעים גבולות נוספים; הטבלה וההמחשה שלהלן שומרות את סדר העד הזה.</p><button type="button" onClick={()=>open(active.source)}>פתחו את הרשימה · PDF 187</button></article><article><span>פירוש מודפס · הגר״א · PDF 187</span><p>הגר״א משתמש בדימוי קובייה בדיונו בגבולות ובמניינם. הדימוי מסייע לחשוב על מפגש כיוונים; פרטי המודל הדיגיטלי נבחרו לצורך המחשה.</p>{commentary&&<button type="button" onClick={()=>open({unit_id:commentary.id,pdf_page:commentary.pdf_page,source_ref:commentary.source_ref,page_region:commentary.page_region,source_anchor:commentary.source_anchor})}>פתחו את פירוש הגר״א · PDF 187</button>}</article></div>
 <p className="ssl-note">ייצוג של מבנה הספר: צמדי הכיוונים הם מן הרשימה. הצבע, המרחק ומידות הקובייה הם בחירות המחשה; לא נקבעו כאן אותיות לצלעות או לקודקודים.</p></section>;
}
