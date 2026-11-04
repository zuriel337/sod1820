// Bounded source-link extraction under the existing Post reader. URLs/IDs are
// never inferred from titles. This is not an HTML sanitizer or a media store.
import { decodePublicEntities } from '../presentation/contentTitle.js';
import { publicNowMediaHref } from './systemFeedPublicSources2029.js';
const OWN = new Set(['sod1820.co.il','www.sod1820.co.il','sod1820.vercel.app']);
export function legacySourcePath(value) {
 try {const u=new URL(value,'https://sod1820.co.il');if(!OWN.has(u.hostname)||u.username||u.password||!['http:','https:'].includes(u.protocol))return null;
 const path=decodeURIComponent(u.pathname).replace(/\/+$/,'')||'/';return /[\u0000-\u001f\\]/.test(path)?null:path;}catch{return null;}
}
function attrs(source) {
 const values=Object.create(null);const re=/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;let m;
 while((m=re.exec(source))){const key=m[1].toLowerCase();if(key in values){if(key==='href'||key==='src')return null;continue;}values[key]=decodePublicEntities(m[2]??m[3]??m[4]??'');}return values;
}
export function publicPostLinkedMedia(html, requested) {
 const path=legacySourcePath(requested);if(!path)return null;
 const source=String(html||'').replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 const found=new Map();
 for(const a of source.matchAll(/<a\b([^<>]*)>([\s\S]*?)<\/a\s*>/gi)){
  const attributes=attrs(a[1]);if(!attributes||legacySourcePath(attributes.href)!==path||/<a\b/i.test(a[2]))continue;
  for(const image of a[2].matchAll(/<img\b([^<>]*)>/gi)){const x=attrs(image[1]);const href=publicNowMediaHref(x?.src);if(href)found.set(href,{href,alt:x.alt||'',sourcePath:path});}
 }
 return found.size===1?[...found.values()][0]:null;
}
