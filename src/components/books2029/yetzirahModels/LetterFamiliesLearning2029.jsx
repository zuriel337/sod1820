import React from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload} from './sourceModels.js';
import {catalogFields} from './catalogModels.js';
import './synopticSealsLearning2029.css';

const GUIDES={
 mothers:{title:'שלוש האימהות',quote:'שלש אמות אמ״ש',explanation:'הפתיחה מעמידה את אמ״ש לצד כף חובה, כף זכות ולשון חוק המכריעה ביניהן. קראו את משל המאזניים לפני המעבר להקבלות עולם, שנה ונפש שבהמשך הפרק.'},
 doubles:{title:'שבע הכפולות',quote:'שבע כפולות בג״ד כפר״ת',explanation:'הטקסט מציג את האותיות דרך שתי לשונות, רך וקשה. המשפחה היא שער כניסה לפרק הכפולות; הקבלות הכוכבים, הימים והנפש נקראות בהמשך, בכל נוסח בנפרד.'},
 simples:{title:'שתים־עשרה הפשוטות',quote:'שתים עשרה פשוטות',explanation:'פתיחת הפרק מונה את האותיות ואת פעולות הגוף; בהמשך אותה תיבה נזכרים גבולי האלכסון. הרשימה כאן אינה משייכת כל אות לצלע מסוימת בקובייה.'},
};
export default function LetterFamiliesLearning2029({selectedId,onSelect,onSelectRelation,onOpenSource,sourceBundle}){
 const {model}=useSourceModel('letter-families',sourceBundle),palette=use2029Palette();
 if(!model)return null;
 const active=selectedComponent(model,selectedId)||model.components[0],guide=GUIDES[active.id],fields=catalogFields(model,active),letters=fields.find(f=>f.key==='letters');
 const select=c=>{onSelectRelation?.(null);onSelect?.(c.stable_id,sourcePayload(model,c));};
 const open=source=>onOpenSource?.({...sourcePayload(model,active),source,returnTo:{structureId:model.id,selectedId:active.stable_id}});
 const style={'--ssl-surface':palette.card,'--ssl-soft':palette.cardSoft,'--ssl-ink':palette.ink,'--ssl-muted':palette.inkSoft,'--ssl-line':palette.borderStrong,'--ssl-accent':palette.accentText,'--ssl-focus':palette.focusRing};
 return <section className="ssl-guide" style={style} dir="rtl" aria-labelledby="families-learning-title">
  <header><span>מסלול לימוד · שלוש משפחות האותיות</span><h2 id="families-learning-title">מן המניין אל האותיות עצמן</h2><p>עמוד 65 נותן את החלוקה לשלוש, שבע ושתים־עשרה. רשימות האותיות נקראות בפתיחות הפרקים שלהן: 91, 100 ו־113. כל שדה בטבלה נפתח במקום שבו הוא מופיע.</p></header>
  <nav aria-label="תחנות משפחות האותיות">{model.components.map((c,i)=><button type="button" key={c.id} aria-pressed={c.id===active.id} onClick={()=>select(c)}><span>תחנה {i+1}</span><strong>{GUIDES[c.id].title}</strong></button>)}</nav>
  <div className="ssl-current" aria-live="polite"><div><span>הסבר נלווה · {guide.title}</span><p>{guide.explanation}</p></div><div><span>המשפחה הנבחרת</span><strong><bdi dir="rtl">{active.letters.join(' · ')}</bdi></strong><p>המניין בדברי הספר: {active.source_count}</p><button type="button" onClick={()=>open(letters.source)}>פתחו את רשימת האותיות · PDF {letters.source.pdf_page}</button></div></div>
  <div className="ssl-reading"><article><span>דברי הספר · קטע מפתיחת הפרק</span><blockquote>״{guide.quote}״</blockquote><button type="button" onClick={()=>open(letters.source)}>פתחו את פתיחת הפרק · PDF {letters.source.pdf_page}</button></article><article><span>דברי הספר · מנייני המשפחות</span><p>במשנה שבעמוד 65 נמסרת חלוקת כ״ב האותיות. המניין ורשימת האותיות הם שני שדות, עם שני מראי מקום שונים.</p><button type="button" onClick={()=>open(active.source)}>פתחו את חלוקת המשפחות · PDF 65</button></article></div>
  <details><summary>פרטי המקור</summary><p>הופנו שלושת שדות הרשימות לעמודי פתיחת הפרקים לאחר השוואת הסריקה. מראי המקום והמזהים המקוריים של שדות המניין נשמרו. אין כאן תעתיק של טורי הפירוש או בדיקת מנוע.</p></details>
 </section>;
}
