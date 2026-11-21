// Local acceptance fixture only; not a product route or a capability implementation.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import ResearchProvider from '../../src/lib/research/ResearchProvider.jsx';
import Shell, { use2029Shell } from '../../src/components/experience2029/Sod2029Shell.jsx';
const targets = {
 node: { ref:'node:78', href:'/world?node=78', title:'צומת בדיקה 78' },
 edge: { ref:'edge:78-salt', href:'/world?edge=78-salt', title:'קשר בדיקה' },
 unit: { postId:42, unitId:'salt-78', ref:'posts:42#salt-78', href:'/fixture-post?unit=salt-78#salt-78', title:'יחידת בדיקה', entity:{type:'post_unit',ref:'posts:42#salt-78'} },
};
function Probe() {
 const shell=use2029Shell(),navigate=useNavigate(); const [key,setKey]=useState(null);
 useEffect(()=> {
  if(!key)return;
  const target=targets[key];
  const release=shell.registerSelectedItemActions({target,renderActions:({target:received,placement})=>
   <button type="button" data-probe-action={placement} onClick={()=>{window.__received={same:received===target,target:received,placement};}}>פעולת בעלים לבדיקה</button>});
  (window.__releases ||= []).push(release);
  return release;
 },[key,shell.registerSelectedItemActions]);
 return <div>{Object.keys(targets).map(k=><button key={k} onClick={()=>setKey(k)} data-pick={k}>{k}</button>)}<button data-clear onClick={()=>setKey(null)}>נקה</button><button data-route onClick={()=>navigate('/books')}>מסלול אחר</button></div>;
}
function Review() {const location=useLocation();return <Shell surface={location.pathname==='/world'?'world':'books'} title="בדיקת חיבור">{location.pathname==='/world'?<Probe/>:<p>מסלול אחר</p>}</Shell>;}
createRoot(document.getElementById('root')).render(<BrowserRouter><ResearchProvider><Review/></ResearchProvider></BrowserRouter>);
