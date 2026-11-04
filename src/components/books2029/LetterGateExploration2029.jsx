import React,{useState} from 'react';
import {use2029Palette} from '../../lib/palette.js';
import {allLetterGates,letterGateRows,GATE_LETTERS} from './letterGateExploration2029.js';
import './yetzirahModels/yetzirahModels.css';

export default function LetterGateExploration2029({first,second,onPair,onPage}){
 const [all,setAll]=useState(false),rows=all?allLetterGates():letterGateRows(first),palette=use2029Palette();
 const style={'--ym-surface':palette.card,'--ym-soft':palette.cardSoft,'--ym-ink':palette.ink,'--ym-muted':palette.inkSoft,'--ym-line':palette.borderStrong,'--ym-action':palette.accentText,'--ym-focus':palette.focusRing,'--ym-depth':palette.accentSecondary,'--ym-discovery':palette.accentDiscovery};
 return <section className="ym-model" style={style} aria-labelledby="letter-gate-exploration-title" data-gate-explorer="true">
  <h3 id="letter-gate-exploration-title">רל״א שערים · חקירת זוגות</h3>
  <p>הסבר נלווה: בחרו אות וקראו את זוגותיה עם יתר האותיות. זוג מוצג פעם אחת במניין, ושני סדרי האותיות מוצגים זה לצד זה. מספר השורה הוא אינדקס המעבדה הקיימת, לא מספר תא שנקרא מלוח הגר״א.</p>
  <div className="yetzirah29-letter-picker" aria-label="אות לחקירת זוגות">{GATE_LETTERS.map(letter=><button key={letter} type="button" aria-pressed={first===letter} onClick={()=>onPair(letter,'')}>{letter}</button>)}</div>
  <button type="button" aria-pressed={all} onClick={()=>setAll(v=>!v)}>{all?'הצג את זוגות האות הנבחרת':'הצג את כל 231 הזוגות'}</button>
  <div className="ym-catalog-table"><table><caption>{all?'כל הזוגות האפשריים · הסבר נלווה':`זוגות האות ${first} · הסבר נלווה`}</caption><thead><tr><th scope="col">אינדקס במעבדה</th><th scope="col">זוג</th><th scope="col">סדר הפוך</th><th scope="col">בחירה</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} data-gate-id={row.id} data-selected={String((first===row.first&&second===row.second)||(first===row.second&&second===row.first))}><td data-label="אינדקס במעבדה"><bdi dir="ltr">{row.id}</bdi></td><th scope="row" data-label="זוג"><bdi dir="rtl">{row.forward}</bdi></th><td data-label="סדר הפוך"><bdi dir="rtl">{row.reverse}</bdi></td><td data-label="בחירה"><button type="button" aria-pressed={(first===row.first&&second===row.second)||(first===row.second&&second===row.first)} onClick={()=>onPair(row.first,row.second)}>בחרו את הזוג {row.forward}</button></td></tr>)}</tbody></table></div>
  <footer><button type="button" onClick={()=>onPage(83)}>קראו את פסקת הגלגל · PDF 83</button> <button type="button" onClick={()=>onPage(203)}>פתחו את לוח הגר״א · PDF 203</button></footer>
  <details><summary>פרטי המקור</summary><p>פסקת הגלגל בגוף המשולב ולוח הגר״א הם מקורות נפרדים. סדר השורות כאן הוא סדר המעבדה, לא שחזור פריסת הלוח המודפס. תאי הלוח לא תועתקו במלואם ולא בוצע אימות במנוע. טבעת, צבע ומרחק בהמחשה הקיימת הם בחירות להתמצאות, לא מידות שנמסרו בספר.</p></details>
 </section>;
}
