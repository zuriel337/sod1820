import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('the reserved ribbon slot distinguishes loading, failed/partial reads and a genuinely empty settled feed',async()=>{
 const server=await createServer({configFile:false,plugins:[react()],server:{host:'127.0.0.1',port:0}});
 try{
   await server.listen();
   const {default:Ribbon}=await server.ssrLoadModule('/src/components/experience2029/GlobalLivingRibbon2029.jsx');
   for(const [feed,state,text]of [
     [{loading:true,rows:[]},'loading','טוען עדכונים'],
     [{loading:false,error:true,rows:[]},'unavailable','אינם זמינים'],
     [{loading:false,unavailableSources:['posts'],rows:[]},'unavailable','אינם זמינים'],
     [{loading:false,unavailableSources:[],rows:[]},'empty','אין עדכונים חדשים'],
   ]){
     const html=renderToStaticMarkup(React.createElement(Ribbon,{feed}));
     assert.ok(html.includes('data-ribbon-state="'+state+'"'));
     assert.ok(html.includes(text));
     assert.ok(html.includes('sod29-living-ribbon is-pending'));
     if(state!=='empty')assert.equal(html.includes('אין עדכונים חדשים'),false);
   }
 }finally{await server.close();}
});
