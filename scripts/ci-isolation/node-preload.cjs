// HTTP-level diagnostics plus the inherited native socket boundary. No product config imports.
const fs=require('node:fs');
const {syncBuiltinESMExports}=require('node:module');
const {requireIsolation,violation}=require('./policy.cjs');
requireIsolation();
const original=globalThis.fetch;
globalThis.fetch=function(input,init){
  const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);
  const ports=fs.readFileSync(process.env.SOD_CI_PORTS,'utf8').trim().split(/\s+/);
  if(!['http:','https:'].includes(u.protocol)||!['127.0.0.1','[::1]','localhost'].includes(u.hostname)||!ports.includes(u.port|| (u.protocol==='https:'?'443':'80')))
    return Promise.reject((()=>{try{violation(`Node fetch ${u.origin}${u.pathname}`);}catch(e){return e;}})());
  return original(input,init);
};
// net/http/https, undici, DNS, child Node and curl remain covered by native guard.
syncBuiltinESMExports();
