const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const install=require('./native-home-read-only-guard.cjs');
test('capability OPTIONS is forwarded, all newsletter writes/Auth/model and widened probes remain denied',async()=>{
 let init,arg;await install({addInitScript(fn,data){init=fn;arg=data;}},'https://preview.example');
 const forwarded=[];
 const world={URL,Request,Promise,Set,Map,JSON,Error,performance,location:{href:'https://preview.example/'},window:{fetch:async req=>{forwarded.push({method:req.method,url:req.url});return new Response(null,{status:204});}},navigator:{},PerformanceObserver:class{observe(){}},XMLHttpRequest:class{open(){}},Response};world.window.WebSocket=class{send(){}};
 vm.createContext(world);world.__args=arg;vm.runInContext(`(${init.toString()})(__args)`,world);
 const db='https://linswmnnkjxvweumprav.supabase.co';
 await world.window.fetch(db+'/functions/v1/newsletter-signup',{method:'OPTIONS'});
 for(const [path,method,body] of [['/functions/v1/newsletter-signup','POST','{}'],['/functions/v1/newsletter-signup?format=json','OPTIONS'],['/functions/v1/newsletter-signup','OPTIONS','x'],['/functions/v1/ai-analyze','POST','{}'],['/functions/v1/ai-analyze','OPTIONS'],['/auth/v1/token?grant_type=password','POST','{}']])await assert.rejects(world.window.fetch(db+path,{method,...(body?{body}: {})}),/independent_read_only_guard/);
 assert.equal(forwarded.length,1);assert.equal(forwarded[0].method,'OPTIONS');assert.equal(world.window.__safetyDenied.length,6);
});
