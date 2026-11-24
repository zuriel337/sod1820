// SOD1820 · Post-publication SEO evidence, under existing publishing + Routing/SEO owners.
// This module does NOT decide publication rights, generate a new sitemap or claim Google indexing.
// Inputs are the existing public sitemap and public HTTP document; no private content or credentials.
export const PUBLIC_SEO_ORIGIN_2029 = "https://sod1820.co.il";
const clean = value => String(value ?? "").trim();
const entity = value => clean(value).replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'");
const matchTag = (html, tag, attribute, name) => {
  const rx = new RegExp("<"+tag+"\\b[^>]*>", "gi");
  for(const m of html.matchAll(rx)){
    const attrs=Object.fromEntries([...m[0].matchAll(/([a-zA-Z:-]+)\s*=\s*["']([^"']*)["']/g)].map(a=>[a[1].toLowerCase(),entity(a[2])]));
    if(clean(attrs[attribute]).toLowerCase()===name.toLowerCase())return attrs;
  }
  return null;
};
const normalizedUrl = raw => {
  try {const url=new URL(entity(raw)); if(url.protocol!=="https:"||url.origin!==PUBLIC_SEO_ORIGIN_2029 || url.username||url.password||url.search||url.hash)return null;return url.origin+url.pathname;}
  catch{return null;}
};
export const publicationFamily2029 = path => {
  if(/^\/post\/[^/]+$/.test(path))return "post";
  if(/^\/book\/[^/]+$/.test(path))return "book";
  if(path.startsWith("/codes/") && path.length>"/codes/".length && path.indexOf("/", "/codes/".length)===-1){
    // /codes/מחקר is the existing research collection, not an individual cipher.
    try{if(decodeURIComponent(path.slice("/codes/".length))==="מחקר")return null;}
    catch{return null;}
    return "code";
  }
  // Existing imported Wordpress Posts may keep a root-form canonical URL.
  // The sitemap is authoritative for public admission; a root URL is only a
  // candidate, not a claim that an arbitrary one-segment path is a Post.
  const staticRoot = new Set(["post","posts","books","book","codes","code","els","gallery","world","map","archive","timeline","gematria","number","community","privacy","login","contact","about","heichal","research","findings","start","member","members","or-geula","broadcasts","beit-midrash","sitemap.xml","robots.txt"]);
  if(path.startsWith("/") && path.length>1 && path.indexOf("/",1)===-1 && !staticRoot.has(path.slice(1)))return "root-candidate";
  return null;
};
export function parsePublicSitemapEntries2029(xml) {
  const source=String(xml??"");
  if(!/^\s*<\?xml\b/i.test(source)||!/<urlset\b/i.test(source))return {status:"UNKNOWN",reason:"NOT_A_URLSET",items:[]};
  const items=[];
  for(const m of source.matchAll(/<url>\s*([\s\S]*?)\s*<\/url>/g)){
    const body=m[1],loc=/<loc>\s*([\s\S]*?)\s*<\/loc>/.exec(body)?.[1];
    if(!loc)continue;
    const url=normalizedUrl(loc);if(!url)continue;
    const path=new URL(url).pathname,family=publicationFamily2029(path);
    if(!family)continue;
    const lastmod=/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/.exec(body)?.[1]||null;
    items.push({url,path,family,lastmod:lastmod?entity(lastmod):null});
  }
  const deduped=[...new Map(items.map(item=>[item.url,item])).values()];
  return {status:"OBSERVED",items:deduped};
}
// Batch is bounded. A date-only lastmod is not an event timestamp;
// we inspect two calendar dates; absent lastmod on Book/Code is sampled, never silently "covered".
export function selectPublicationSeoCandidates2029(items,{now=new Date(),max=24,perFamily=8}={}){
  if(!Array.isArray(items))return {items:[],coverage:"UNKNOWN",reasons:["NO_SITEMAP_EVIDENCE"]};
  const nowDate=new Date(now);if(!Number.isFinite(nowDate.getTime()))return {items:[],coverage:"UNKNOWN",reasons:["INVALID_CLOCK"]};
  const cutoff=new Date(nowDate.getTime()-48*3600*1000);
  const oldest=cutoff.toISOString().slice(0,10), hour=Math.floor(nowDate.getTime()/3600000);
  const recent=items.filter(item=>item.lastmod&&/^\d{4}-\d\d-\d\d/.test(item.lastmod)&&item.lastmod.slice(0,10)>=oldest);
  const missing=items.filter(item=>!item.lastmod);
  const safeMax=Math.max(1,Math.min(48,Math.trunc(max)||24));
  const safeFamily=Math.max(1,Math.min(20,Math.trunc(perFamily)||8));
  // Stateless rotation prevents a busy publishing day from checking the same first N
  // Posts forever. This is sample coverage across hours, NOT a claim of full census.
  const rotate=(rows,limit)=>{
    if(rows.length<=limit)return rows;
    const start=((hour*limit)%rows.length+rows.length)%rows.length;
    return Array.from({length:limit},(_,i)=>rows[(start+i)%rows.length]);
  };
  const families=["post","book","code","root-candidate"];
  const byFamily=[], reasons=[];
  for(const kind of families){
    const cap=kind==="root-candidate"?Math.min(4,safeFamily):safeFamily;
    const byKind=recent.filter(item=>item.family===kind).sort((a,b)=>String(b.lastmod).localeCompare(String(a.lastmod))||a.url.localeCompare(b.url));
    const missingKind=missing.filter(item=>item.family===kind).sort((a,b)=>a.url.localeCompare(b.url));
    const primary=rotate(byKind,cap);
    // Dated root candidates may be old canonical Posts. Undated single-segment
    // routes lack Post identity: never auto-classify them as a published Post.
    const extra=kind==="post"||kind==="root-candidate"?[]:rotate(missingKind,Math.max(0,cap-primary.length));
    byFamily.push([...primary,...extra]);
    if(byKind.length>primary.length)reasons.push(kind+":RECENT_SAMPLE_LIMIT");
    if(kind!=="root-candidate"&&missingKind.length>extra.length)reasons.push(kind+":UNDATED_COVERAGE_PARTIAL");
  }
  // Round-robin prevents the four families from starving later families at max=18.
  // Every run is bounded; large publications are rotated through successive hours.
  const selected=[];
  for(let i=0;selected.length<safeMax&&byFamily.some(f=>i<f.length);i++)
    for(const family of byFamily)if(i<family.length&&selected.length<safeMax)selected.push(family[i]);
  if(byFamily.reduce((n,items)=>n+items.length,0)>selected.length)reasons.push("TOTAL_BOUNDED");
  if(!items.length)reasons.push("NO_PUBLIC_ITEMS_IN_SITEMAP");
  return {items:selected,coverage:reasons.length?"PARTIAL":"SELECTED",reasons,inspectedFrom:items.length};
}
// This is the *actual* HTTP evidence stage. Sitemap presence alone is never proof.
export function assessPublicationSeoHttp2029(item,{status,headers={},body="",finalUrl=null,redirected=false}={}){
  const issues=[],unknown=[];
  if(!item?.url||!publicationFamily2029(item.path))return {state:"UNKNOWN",issues:[],unknown:["INVALID_ITEM"]};
  if(!Number.isInteger(status)){return {state:"UNKNOWN",issues:[],unknown:["HTTP_NOT_OBSERVED"],url:item.url};}
  if(status===404||status===410)issues.push("PUBLIC_SITEMAP_POINTS_TO_MISSING_PAGE");
  else if(status>=500)unknown.push("SERVER_TEMPORARILY_UNAVAILABLE");
  else if(status!==200)issues.push("PUBLIC_DOCUMENT_NOT_200");
  if(redirected || (finalUrl&&normalizedUrl(finalUrl)!==item.url))issues.push("SITEMAP_URL_REDIRECTS_OR_DIFFERS");
  const head=String(body).split(/<\/head\s*>/i)[0].slice(0,250000);
  const title=entity(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1]||"").replace(/<[^>]*>/g,"").trim();
  const canonical=matchTag(head,"link","rel","canonical")?.href||"";
  const robots=clean(headers["x-robots-tag"]||"")+" "+clean(matchTag(head,"meta","name","robots")?.content||"");
  const desc=matchTag(head,"meta","name","description")?.content||"";
  if(status===200){
    if(!title || /הפוסט לא נמצא|page not found|404/i.test(title))issues.push("TITLE_MISSING_OR_NOT_FOUND");
    if(!canonical)issues.push("CANONICAL_MISSING");
    else if(normalizedUrl(canonical)!==item.url)issues.push("CANONICAL_MISMATCH");
    if(/\bnoindex\b/i.test(robots))issues.push("PUBLIC_SITEMAP_HAS_NOINDEX");
    if(/\bnone\b/i.test(robots))issues.push("PUBLIC_ROBOTS_NONE");
    if(!clean(desc))unknown.push("DESCRIPTION_MISSING_REVIEW");
    // The current site can serve client-side content; do not mistake JS-only body for verified text.
    if(!/<(?:main|article)\b/i.test(String(body)))unknown.push("BODY_CONTENT_NOT_ESTABLISHED");
  }
  return {schema:"sod1820.publication-seo-http.v1",url:item.url,family:item.family,
    state:issues.length?"FAIL":unknown.length?"UNKNOWN":"OBSERVED_OK",issues,unknown,
    inspected:{status,titlePresent:Boolean(title),canonical:canonical||null,robots:robots.trim()||"not-declared",descriptionPresent:Boolean(desc)},
    note:"SEO response validation only; neither Search Console discovery nor Google indexing is proven."};
}
