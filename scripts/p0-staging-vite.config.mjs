// Test-only app transport. Production source and deployed configuration are unchanged.
import { readFileSync } from 'node:fs';
import config from '../vite.config.js';
const status=JSON.parse(readFileSync(process.env.P0_STAGING_STATUS,'utf8'));
if(status.API_URL!=='https://krnaxxndgtrdnaddlzws.supabase.co')throw new Error('Disposable staging branch required');
export default {
 ...config,
 plugins:[{
  name:'p0-disposable-supabase-only',enforce:'pre',
  configureServer(server){
   // Match the deployed native 2029 document boundary in the dev server.
   server.middlewares.use((req,res,next)=>{
    if(/^\/2029(?:\/|\?|$)/.test(req.url||''))req.url='/2029.html';
    next();
   });
  },
  transform(code,id){
   if(!id.endsWith('/src/lib/supabase.js'))return null;
   return code.replace(/export const SUPABASE_URL = '[^']+';/,'export const SUPABASE_URL = '+JSON.stringify(status.API_URL)+';')
    .replace(/export const SUPABASE_ANON = '[^']+';/,'export const SUPABASE_ANON = '+JSON.stringify(status.ANON_KEY)+';');
  }
 },...config.plugins],
 server:{host:'127.0.0.1',port:5179,strictPort:true}
};
