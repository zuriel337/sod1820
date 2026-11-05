import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload} from './sourceModels.js';
import './synopticSealsLearning2029.css';
const GUIDES={teli:'התלי נזכר בעולם ומשול למלך על כיסאו. קראו את המשל בתוך פסקת שלושת המוקדים.',wheel:'הגלגל נזכר בשנה ומשול למלך במדינה. השוו את תחומו ואת משל המלכות לשני המוקדים האחרים.',heart:'הלב נזכר בנפש ומשול למלך במלחמה. המשך הפסקה עובר גם לטוב ולרע; הוא נשאר חלק מההקשר המודפס.'};
export default function ThreeKingsLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}){
 const {model,bundle}=useSourceModel('three-kings',sourceBundle),palette=use2029Palette();if(!model)return null;
 const active=selectedComponent(model,selectedId)||model.components[0];
 const locate=id=>{const u=bundle.units.units.find(x=>x.id===id);return u&&{unit_id:u.id,pdf_page:u.pdf_page,source_ref:u.source_ref,page_region:u.page_region,source_anchor:u.source_anchor};};
 const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
 const open=source=>source&&onOpenSource?.({...sourcePayload(model,active),source,returnTo:{structureId:model.id,selectedId:active.stable_id}});
 const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
 return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="kings-learning-title"><header><span>מסלול לימוד · הגוף המשולב · PDF 122</span><h2 id="kings-learning-title">שלושה משלי הנהגה</h2><p>הפסקה מתארת תלי בעולם, גלגל בשנה ולב בנפש, ולכל אחד משל מלכות משלו. בחרו מוקד והשוו את תחומו ואת משלו לאחרים.</p></header>
 <nav aria-label="תחנות תלי גלגל ולב">{model.components.map((c,i)=><button key={c.id} type="button" aria-pressed={c.id===active.id} onClick={()=>select(c)}><span>תחנה {i+1}</span><strong>{c.label_he}</strong></button>)}</nav>
 <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה</span><p>{GUIDES[active.id]}</p></div><div><span>המשל בבחירה</span><strong>{active.label_he}</strong><p>{active.simile}</p><button type="button" onClick={()=>open(active.source)}>פתחו את המשל במקור · PDF 122</button></div></div>
 <div className="ssl-reading"><article><span>דברי הספר · הגוף המשולב · PDF 122</span><blockquote>״תלי בעולם כמלך על כסאו״</blockquote><p>הפסקה ממשיכה בשני משלי מלכות נוספים, לגלגל וללב.</p><button type="button" onClick={()=>open(active.source)}>פתחו את הפסקה · PDF 122</button></article><article><span>פירוש מודפס · חכמוני · PDF 151</span><p>חכמוני דן במוקדי ההנהגה ובמשלי המלך בהקשרו. נוסח הגר״א מובא במקום אחר בכרך, עם עוגן משלו.</p><button type="button" onClick={()=>open(locate('sy:chachmoni:chachmoni:ch6:teli-wheel-heart'))}>פתחו את חכמוני · PDF 151</button> <button type="button" onClick={()=>open(locate('sy:gra-edition:text:ch6:teli-wheel-heart'))}>פתחו את נוסח הגר״א · PDF 192</button><p>העדויות נשמרות בנפרד, ואין מעתיקים מהן פרטים לתוך המשל שנבחר.</p></article></div>
 <p className="ssl-note">ייצוג של מבנה הספר: שלושת התחומים והמשלים נלקחו מן הגוף המשולב. הצורות, הגובה, המרחק והצבע הם בחירות קריאה; אין כאן דגם אסטרונומי או קשר סיבתי נוסף.</p></section>;
}
