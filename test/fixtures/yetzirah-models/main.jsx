// Test-only component harness. No product route, reader or source iframe.
import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {setThemePreset,useThemePreset} from '../../../src/lib/themeMode.js';
import {use2029Palette} from '../../../src/lib/palette.js';
import TwelveBoundariesModel2029 from '../../../src/components/books2029/yetzirahModels/TwelveBoundariesModel2029.jsx';
import GraSealsModel2029 from '../../../src/components/books2029/yetzirahModels/GraSealsModel2029.jsx';
import SynopticSealsModel2029 from '../../../src/components/books2029/yetzirahModels/SynopticSealsModel2029.jsx';
function Fixture(){
 const Model=({'six-seals-gra-edition':GraSealsModel2029,'twelve-boundaries-gra':TwelveBoundariesModel2029})[new URLSearchParams(location.search).get('model')]||SynopticSealsModel2029;
 const [selectedId,setSelectedId]=useState(undefined),[source,setSource]=useState(null);const palette=use2029Palette();useThemePreset();useEffect(()=>{document.body.style.background=palette.pageBg;},[palette.pageBg]);
 return <main style={{margin:'0 auto',maxWidth:1180,padding:16,color:palette.ink,background:palette.pageBg,minHeight:'100vh'}} data-frame-reduced-motion="false"><div style={{display:'flex',gap:8,marginBottom:20}}>{['light','parchment','dark'].map((t,i)=><button style={{minHeight:44,minWidth:60,fontSize:16,color:palette.ink,background:palette.card,border:`1px solid ${palette.borderStrong}`,borderRadius:8}} key={t} onClick={()=>setThemePreset(t)}>{['יום','קלף','לילה'][i]}</button>)}</div><Model selectedId={selectedId} onSelect={id=>setSelectedId(id)} onOpenSource={setSource}/>{source&&<aside role="status" data-opened-source={source.source.pdf_page}><p>נפתח מקור: עמוד {source.source.pdf_page}</p><button onClick={()=>setSource(null)}>חזור למודל</button></aside>}</main>;
}
document.body.style.margin='0';createRoot(document.getElementById('root')).render(<Fixture/>);
