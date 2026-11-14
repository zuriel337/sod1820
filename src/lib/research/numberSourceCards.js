// Number's presentation of the existing anonymously admitted public finding
// DTO. Visibility, source admission and calculation truth stay with its reader.
import{isResearchPublicVisibleStatus,researchPublicStatusPresentation}from"./researchObjectPresentation.js";
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
 const seen=new Set(),bySource=new Map();for(const row of findings){
  const id=clean(row?.id),title=clean(row?.title),ref=clean(row?.sourceRef);
  if(!new RegExp(`^${UUID}$`,'i').test(id)||seen.has(id)||!sourceRef.test(ref)||!title
   ||!isResearchPublicVisibleStatus(row.publicationState)||(row.privacy_scope&&row.privacy_scope!=='public')
   ||clean(row.findingHref)!==`/world?finding=${id}`
   ||/^(?:הודעות? מקור|מקור מחקר|מקורות?)$/.test(title)&&!publicNumberSourceHref(row.sourceHref))continue;
  seen.add(id);
  const card={id,sourceRef:ref,title,detail:[row.kindLabel,row.roleLabel].map(clean).filter(Boolean).join(' · '),
   contributor:clean(row.contributor)||null,createdAt:row.createdAt||null,
   href:publicNumberSourceHref(row.sourceHref),findingHref:publicNumberSourceHref(row.findingHref)};
  // Group the presentation by an already-admitted canonical source identity.
  // Every distinct finding and its exact public occurrence link remain intact.
  const finding={id,title,findingHref:card.findingHref,sourceHref:card.href,
   contributor:card.contributor,createdAt:card.createdAt,publicationState:row.publicationState,
   statusLabel:researchPublicStatusPresentation(row.publicationState).label,
   kindLabel:clean(row.kindLabel),roleLabel:clean(row.roleLabel),
   summaryTruncated:row.summaryTruncated===true,ocrNeedsReview:row.ocrNeedsReview===true};
  const existing=bySource.get(ref);
  if(existing){existing.findings.push(finding);if(!existing.href&&card.href)existing.href=card.href;}
  else bySource.set(ref,{...card,findings:[finding]});
 }
 return [...bySource.values()];
}
