// Number's presentation of the existing anonymously admitted public finding
// DTO. Visibility, source admission and calculation truth stay with its reader.
const clean=value=>value==null?'':String(value).trim();
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const sourceRef=new RegExp(`^(?:channel_updates|gallery_images):${UUID}$|^posts:[1-9]\\d*$`,'i');
export function publicNumberSourceHref(value){
 const href=clean(value);if(!href||href.startsWith('//'))return null;
 try{
  const url=new URL(href,'https://sod1820.co.il');
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;
  if(url.origin==='https://sod1820.co.il'&&/^\/(?:auth|login|admin|unsubscribe|code|els|2029\/(?:me|journey|control))(?:\/|$)/i.test(url.pathname))return null;
  if([...url.searchParams.keys()].some(key=>/^(?:access_token|refresh_token|id_token|token|secret|password|authorization|_vercel_share|_?vercel_protection_bypass)$/i.test(key)))return null;
  if(/(?:^#|[?&])(?:access_token|refresh_token|id_token|token)=/i.test(url.hash))return null;
  return url.origin==='https://sod1820.co.il'?url.pathname+url.search+url.hash:url.href;
 }catch{return null;}
}
export function publicNumberSourceCards(findings=[]){
 const seen=new Set();return findings.flatMap(row=>{
  const id=clean(row?.id),title=clean(row?.title),ref=clean(row?.sourceRef);
  if(!new RegExp(`^${UUID}$`,'i').test(id)||seen.has(id)||!sourceRef.test(ref)||!title
   ||!['approved','canonical'].includes(row.publicationState)||(row.privacy_scope&&row.privacy_scope!=='public')
   ||clean(row.findingHref)!==`/world?finding=${id}`
   ||/^(?:הודעות? מקור|מקור מחקר|מקורות?)$/.test(title)&&!publicNumberSourceHref(row.sourceHref))return [];
  seen.add(id);
  return [{id,sourceRef:ref,title,detail:[row.kindLabel,row.roleLabel].map(clean).filter(Boolean).join(' · '),
   contributor:clean(row.contributor)||null,createdAt:row.createdAt||null,
   href:publicNumberSourceHref(row.sourceHref),findingHref:publicNumberSourceHref(row.findingHref)}];
 });
}
