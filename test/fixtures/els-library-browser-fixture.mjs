// Real page/library/query adapter; only auth, database transport and unrelated shell/engine are fixtures.
export const libraryAuth = `import {useSyncExternalStore} from 'react';
let state={user:{id:'owner-a'},loading:false};
window.__setLibraryUser=id=>{state={user:id?{id}:null,loading:false};dispatchEvent(new Event('fixture-auth'));};
const subscribe=fn=>{addEventListener('fixture-auth',fn);return()=>removeEventListener('fixture-auth',fn);};
export const useAuth=()=>useSyncExternalStore(subscribe,()=>state);`;

export const libraryDatabase = `
export const SUPABASE_URL=location.origin;export const SUPABASE_ANON='fixture';
window.__libraryRows=[];window.__libraryCalls=[];window.__libraryViewer='owner-a';
export const supabase={from(table){
 const filters=[],call={table,eq:[],ors:[],orders:[]};
 const query={
  select(columns){call.columns=columns;return query;},
  eq(key,value){call.eq.push([key,value]);filters.push(row=>row[key]===value);return query;},
  or(expression){call.ors.push(expression);if(expression.startsWith('search_term.ilike.')){
   const term=expression.split('%')[1];filters.push(row=>[row.search_term,row.title].some(value=>value.includes(term)));
  }else filters.push(row=>row.source!=='research');return query;},
  order(key,options){call.orders.push([key,options]);return query;},
  range(start,end){call.range=[start,end];return query;},maybeSingle(){call.single=true;return query;},
  async then(resolve){
   window.__libraryCalls.push(call);
   // Model RLS at request time, so a delayed response can contain the old account's data.
   let rows=window.__libraryRows.filter(row=>row.owner_user_id===window.__libraryViewer||(row.status==='published'&&row.visibility==='public'));
   rows=rows.filter(row=>filters.every(filter=>filter(row)));
   if(call.range)rows=rows.slice(call.range[0],call.range[1]+1);
   if(window.__libraryHold){window.__libraryHold=false;await new Promise(done=>window.__releaseLibrary=done);}
   resolve(window.__libraryFailure?{data:null,error:new Error('fixture unavailable')}:{data:call.single?rows[0]||null:rows,error:null});
  }
 };return query;
}};`;

export const libraryEntry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';import Page from '/src/pages/Els2029Page.jsx';
import '/src/components/experience2029/sod2029.css';
window.__switchLibraryUser=id=>{window.__libraryViewer=id;window.__setLibraryUser(id);};
createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(Page)));`;

export function libraryFixturePlugin() {
  const modules = {
    'library-entry': libraryEntry,
    'AuthContext.jsx': libraryAuth,
    'supabase.js': libraryDatabase,
    'ResearchProvider.jsx': `const research={context:null,updateResearchContext:()=>{}};export const useResearch=()=>research;`,
    'Sod2029Shell.jsx': `import React from 'react';export default function Shell({children}){return React.createElement('main',{className:'sod29-root',style:{padding:16}},children);}
      export const FrameState=({title,children})=>React.createElement('section',null,React.createElement('h2',null,title),children);export const use2029Shell=()=>({});`,
    'ElsNativeClassic2029.jsx': `import React,{useState,useEffect} from 'react';export default function Engine({matrix,onSearchStart,onSaved}){
      window.__libraryMatrix=matrix;const [query,setQuery]=useState('');
      useEffect(()=>{window.__libraryEngineMounts=(window.__libraryEngineMounts||0)+1;},[]);
      return React.createElement('div',{'data-fixture-matrix':matrix?.id||'new'},
        React.createElement('input',{'aria-label':'טיוטת חיפוש',value:query,onChange:e=>setQuery(e.target.value)}),
        React.createElement('button',{onClick:onSearchStart},'חיפוש לדוגמה'),
        React.createElement('button',{onClick:onSaved},'שמירה לדוגמה'));}`,
    'MaintenanceLock.jsx': `export const useFeatureState=()=>({loading:false,blocked:false});`,
    'seo.js': `export const applySeo=()=>{};`,
  };
  return {
    name: 'els-library-browser-fixture', enforce: 'pre',
    resolveId(id) {
      const name = id.split('/').at(-1);
      if (Object.hasOwn(modules, name)) return '\0els-library:' + name;
    },
    load(id) { if (id.startsWith('\0els-library:')) return modules[id.slice('\0els-library:'.length)]; },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url.startsWith('/fixture')) return next();
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end(await server.transformIndexHtml('/fixture', '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}</style><div id="root"></div><script type="module" src="/@id/library-entry"></script></html>'));
      });
    },
  };
}
