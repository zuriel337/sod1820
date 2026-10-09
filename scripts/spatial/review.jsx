// Explicit offline review fixture. Never imported by a product entry point.
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import SpatialMethodStage2029 from '../../src/components/gematria2029/SpatialMethodStage2029.jsx';
import SpatialGlyphScene2029 from '../../src/components/experience2029/SpatialGlyphScene2029.jsx';
import {resolve2029Palette} from '../../src/lib/palette.js';
import {useThemePreset,setThemePreset} from '../../src/lib/themeMode.js';
import {TYPEFACE} from '../../src/lib/designTokens.js';
import fixture from './milui-fixture.json';
function Review(){
 const theme=useThemePreset(),p=resolve2029Palette(theme),[sample,setSample]=useState('אםהך');
 const tokens={'--s29-panel':p.card,'--s29-panel-soft':p.cardSoft,'--s29-line':p.border,'--s29-line-strong':p.borderStrong,'--s29-accent':p.accent,'--s29-accent-secondary':p.accentSecondary,'--s29-discovery':p.accentDiscovery,'--s29-ink':p.ink,'--s29-muted':p.inkSoft,'--s29-focus-ring':p.focusRing,'--s29-font-ui':TYPEFACE.ui,'--s29-font-display':TYPEFACE.ui};
 return <main style={{...tokens,background:p.pageBg,color:p.ink,minHeight:'100vh',fontFamily:'Arial,sans-serif',padding:'24px 16px'}}><div style={{maxWidth:1000,margin:'auto'}}>
 <h1>אות · מילוי · עומק</h1><p>פריוויו לבחינת הצורות והמילוי. תוצאת המילוי נשמרה מהמנוע הקנוני; אין כאן שמירה או חיבור למידע אישי.</p>
 <nav aria-label="ערכת עיצוב" style={{display:'flex',gap:8,marginBottom:24}}>{[['light','יום'],['parchment','קלף'],['dark','לילה']].map(([key,title])=><button style={{minHeight:44,minWidth:60,fontSize:16}} key={key} aria-pressed={theme===key} onClick={()=>setThemePreset(key)}>{title}</button>)}</nav>
 <SpatialMethodStage2029 expression={fixture.trace.input} methodKey="מילוי" trace={fixture.trace} expectedValue={fixture.trace.result}/>
 <h2>גבולות הצורה</h2><label>אותיות לבדיקה <select style={{fontSize:18,minHeight:44,margin:12}} value={sample} onChange={e=>setSample(e.target.value)}><option>אםהך</option><option>א א אָ ך</option><option>אבגדהוזחטיךכלםמןנסעףפץצקרשת</option></select></label>
 <SpatialGlyphScene2029 expression={sample} label="בדיקת גבולות האות"/>
 <p><a style={{color:p.accentText}} href="/2029/kingdom">פתיחת ממלכת המספרים</a></p>
 </div></main>;
}
createRoot(document.getElementById('root')).render(<Review/>);
