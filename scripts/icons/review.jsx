import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import Icon,{ICON_CATALOG} from '../../src/components/experience2029/NavigationIcon2029.jsx';
import {resolve2029Palette} from '../../src/lib/palette.js';
import {useThemePreset,setThemePreset} from '../../src/lib/themeMode.js';
import {TYPEFACE} from '../../src/lib/designTokens.js';
import './review.css';
function Review(){
 const preset=useThemePreset(),p=resolve2029Palette(preset);
 const [group,setGroup]=useState('הכול'),[search,setSearch]=useState(''),[selected,setSelected]=useState('mine');
 const item=ICON_CATALOG.find(x=>x.name===selected);
 const visible=ICON_CATALOG.filter(x=>(group==='הכול'||x.group===group)&&`${x.label} ${x.description} ${x.name}`.includes(search.trim()));
 const tokens={'--s29-panel':p.card,'--s29-panel-soft':p.cardSoft,'--s29-ink':p.ink,'--s29-muted':p.inkSoft,'--s29-accent':p.accent,'--s29-accent-text':p.accentText,'--s29-line':p.border,'--s29-line-strong':p.borderStrong,'--s29-focus-ring':p.focusRing,'--s29-font-ui':TYPEFACE.ui,background:p.pageBg,color:p.ink};
 return <main className="icon-library" style={tokens}>
 <header><div><p className="icon-library-eyebrow">SOD1820 · משפחה אחת</p><h1>ספריית האייקונים</h1><p>סמלים ברורים למחקר, למסע ולמרחב. בחרו אייקון כדי לבחון אותו ולהוריד SVG.</p></div><nav aria-label="ערכת עיצוב">{[['light','יום'],['parchment','קלף'],['dark','לילה']].map(([key,label])=><button key={key} aria-pressed={preset===key} onClick={()=>setThemePreset(key)}>{label}</button>)}</nav></header>
 <section className="icon-library-selected" aria-label="האייקון שנבחר">
 <div className="icon-library-large"><Icon name={item.name} size={104}/></div>
 <div><p className="icon-library-eyebrow">{item.group}</p><h2>{item.label}</h2><p>{item.description}</p><div className="icon-library-actions"><a href={`./svg/${item.name}.svg`} download={`${item.name}.svg`}>הורדת SVG</a><a href="./sod1820-icons.zip" download>הורדת הספרייה כולה</a></div></div>
 <div className="icon-library-scales" aria-label="גדלים להשוואה">{[16,24,40].map(size=><figure key={size}><Icon name={item.name} size={size}/><figcaption>{size}px</figcaption></figure>)}</div>
 </section>
 <div className="icon-library-filter"><label>חיפוש אייקון<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="מילוי, מסע, שמירה…"/></label><span>{visible.length} מתוך {ICON_CATALOG.length} אייקונים</span></div>
 <nav className="icon-library-groups" aria-label="קבוצת אייקונים">{['הכול',...new Set(ICON_CATALOG.map(x=>x.group))].map(value=><button key={value} aria-pressed={value===group} onClick={()=>setGroup(value)}>{value}</button>)}</nav>
 <ul className="icon-library-grid">{visible.map(icon=><li key={icon.name}><button aria-pressed={selected===icon.name} aria-label={`${icon.label} — ${icon.description}`} onClick={()=>setSelected(icon.name)}><Icon name={icon.name} size={40}/><strong>{icon.label}</strong><span>{icon.name}</span></button></li>)}</ul>
 {!visible.length&&<p role="status">לא נמצאו אייקונים לחיפוש הזה.</p>}
 <footer><p>אותה משפחת קווים בכל הגדלים · יום, קלף ולילה · צבע מתוך ערכת העיצוב</p><a href="/spatial-review/">בחינת האייקונים בתוך תצוגת המילוי</a><a href="/2029/kingdom">פתיחת הממלכה</a></footer>
 </main>;
}
createRoot(document.getElementById('root')).render(<Review/>);
