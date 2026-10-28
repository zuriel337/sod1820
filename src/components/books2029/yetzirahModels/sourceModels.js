// Book-specific projection of existing source specifications. No new source identities or engine.
export const SOURCE_IDENTITY = 'book:sefer-yetzirah-9perushim';
export const MODEL_KEYS = Object.freeze({
  synoptic: 'six-seals-synoptic',
});
export const CAMERA = Object.freeze({position:[7,5.5,8.5],fov:34,target:[0,0,0]});
export function viewportFov(width,height){return 2*Math.atan(Math.tan(CAMERA.fov*Math.PI/360)/Math.min(1,width/height))*180/Math.PI;}
export const DIRECTION_LABELS = Object.freeze({up:'רום',down:'תחת',east:'מזרח',west:'מערב',north:'צפון',south:'דרום'});
export const DIRECTION_VECTORS = Object.freeze({up:[0,1,0],down:[0,-1,0],east:[1,0,0],west:[-1,0,0],north:[0,0,-1],south:[0,0,1]});
const EXPECTED = {'six-seals-synoptic':{page:73,count:6,kind:'seals',title:'שש החותמות · הגוף המשולב'}};

export function bindSourceModel(bundle,key) {
  const expected=EXPECTED[key];
  if(!expected||bundle?.structures?.source_identity!==SOURCE_IDENTITY||bundle?.units?.source_identity!==SOURCE_IDENTITY)throw new Error('SOURCE_IDENTITY_MISMATCH');
  const spec=bundle.structures.structures.find(s=>s.id===`sy-structure:${key}`);
  if(!spec||spec.components.length!==expected.count)throw new Error('SOURCE_COMPONENTS_MISSING');
  const units=new Map(bundle.units.units.map(u=>[u.id,u]));
  function check(source){
    const unit=units.get(source?.unit_id);
    if(!unit||unit.pdf_page!==source.pdf_page||unit.source_ref!==source.source_ref||source.pdf_page!==expected.page||source.source_anchor!==`#page=${expected.page}&view=FitH`)throw new Error('SOURCE_LOCATOR_MISMATCH');
  }
  const components=spec.source_order.map(id=>spec.components.find(c=>c.id===id));
  if(components.length!==expected.count||components.some(c=>!c)||new Set(components.map(c=>c.id)).size!==expected.count)throw new Error('SOURCE_ORDER_MISMATCH');
  components.forEach(c=>{check(c.source);if(c.stable_id!==`${spec.id}:component:${c.id}`)throw new Error('SOURCE_COMPONENT_ID_MISMATCH');if(expected.kind==='seals'&&(!DIRECTION_VECTORS[c.id]||c.seal_letters?.length!==3))throw new Error('SOURCE_SEAL_MISSING');});
  spec.source_relations.forEach(r=>{check(r.source);if(!components.some(c=>c.id===r.from_id)||!components.some(c=>c.id===r.to_id))throw new Error('SOURCE_RELATION_MISMATCH');});
  return {id:spec.id,key,...expected,components,relations:spec.source_relations,legend:spec.source_acceptance.legend_he,pdfUrl:bundle.units.source_pdf_url,editorial:'המרחקים, הצבעים, זווית המבט והמרכז הם אמצעי המחשה. המרכז מסייע להתמצאות ואינו ספירה נוספת.',spec};
}
export function selectedComponent(model,id){return model.components.find(c=>c.stable_id===id||c.id===id)||null;}
export function sourcePayload(model,component,relation=null){
  return {bookSlug:'sefer-yetzirah',sourceIdentity:SOURCE_IDENTITY,structureId:model.id,componentId:component?.stable_id??null,relationId:relation?.stable_id??null,source:relation?.source??component.source,pdfUrl:model.pdfUrl,verification:'not_tested'};
}
// Positions are editorial coordinates; source fields are never generated from geometry.
export function modelGeometry(model){
  const points=model.components.map(c=>({id:c.stable_id,localId:c.id,label:c.label_he,seal:c.seal_letters?.join(''),position:DIRECTION_VECTORS[c.id].map(v=>v*2.35)}));
  return {kind:model.kind,points,edges:model.relations.map(r=>({id:r.stable_id,from:points.find(p=>p.localId===r.from_id).position,to:points.find(p=>p.localId===r.to_id).position})),orientationCenter:true};
}

export function componentSummary(model,c){return `בפסקת החותמות נזכר הכיוון ${c.label_he}, ובו החותם ${c.seal_letters.join('')}. סדר האותיות מוצג לפי העד בעמוד ${c.source.pdf_page}.`;}
