// Book-specific projection of existing source specifications. No new source identities or engine.
export const SOURCE_IDENTITY = 'book:sefer-yetzirah-9perushim';
export const MODEL_KEYS = Object.freeze({
  synoptic: 'six-seals-synoptic',gra: 'six-seals-gra-edition',boundaries:'twelve-boundaries-gra',
});
export const CAMERA = Object.freeze({position:[7,5.5,8.5],fov:34,target:[0,0,0]});
export function viewportFov(width,height){return 2*Math.atan(Math.tan(CAMERA.fov*Math.PI/360)/Math.min(1,width/height))*180/Math.PI;}
export const DIRECTION_LABELS = Object.freeze({up:'רום',down:'תחת',east:'מזרח',west:'מערב',north:'צפון',south:'דרום'});
export const DIRECTION_VECTORS = Object.freeze({up:[0,1,0],down:[0,-1,0],east:[1,0,0],west:[-1,0,0],north:[0,0,-1],south:[0,0,1]});
const EXPECTED = {'six-seals-synoptic':{page:73,count:6,kind:'seals',title:'שש החותמות · הגוף המשולב'},'six-seals-gra-edition':{page:175,count:6,kind:'seals',title:'שש החותמות · נוסח הגר״א'},'twelve-boundaries-gra':{page:187,count:12,kind:'boundaries',title:'שנים־עשר גבולי האלכסון · נוסח הגר״א'}};

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
  components.forEach(c=>{check(c.source);if(c.stable_id!==`${spec.id}:component:${c.id}`)throw new Error('SOURCE_COMPONENT_ID_MISMATCH');if(expected.kind==='boundaries'&&(c.directions?.length!==2||c.directions.some(d=>!DIRECTION_VECTORS[d])||DIRECTION_VECTORS[c.directions[0]].some((v,i)=>v&&DIRECTION_VECTORS[c.directions[1]][i])))throw new Error('SOURCE_DIRECTION_PAIR_MISSING');if(expected.kind==='seals'&&(!DIRECTION_VECTORS[c.id]||c.seal_letters?.length!==3))throw new Error('SOURCE_SEAL_MISSING');});
  spec.source_relations.forEach(r=>{check(r.source);if(!components.some(c=>c.id===r.from_id)||!components.some(c=>c.id===r.to_id))throw new Error('SOURCE_RELATION_MISMATCH');});
  return {id:spec.id,key,...expected,components,passageSummary:units.get(components[0].source.unit_id).source_content.summary,relations:spec.source_relations,legend:spec.source_acceptance.legend_he,pdfUrl:bundle.units.source_pdf_url,editorial:expected.kind==='boundaries'?'הקובייה היא בחירת המחשה של צמדי הכיוונים. צלעותיה, קודקודיה ומידותיה אינם נתונים שנמסרו בספר; אין שיוך אות לצלע.':'המרחקים, הצבעים, זווית המבט והמרכז הם אמצעי המחשה. המרכז מסייע להתמצאות ואינו ספירה נוספת.',spec};
}
export function selectedComponent(model,id){return model.components.find(c=>c.stable_id===id||c.id===id)||null;}
export function sourcePayload(model,component,relation=null){
  return {bookSlug:'sefer-yetzirah',sourceIdentity:SOURCE_IDENTITY,structureId:model.id,componentId:component?.stable_id??null,relationId:relation?.stable_id??null,source:relation?.source??component.source,pdfUrl:model.pdfUrl,verification:'not_tested'};
}
// Positions are editorial coordinates; source fields are never generated from geometry.
export function modelGeometry(model){
  if(model.kind==='boundaries'){const radius=1.65;const segments=model.components.map(c=>{const from=[0,0,0],to=[0,0,0];const fixed=new Set();for(const d of c.directions){const v=DIRECTION_VECTORS[d],axis=v.findIndex(n=>n!==0);fixed.add(axis);from[axis]=to[axis]=v[axis]*radius;}const free=[0,1,2].find(a=>!fixed.has(a));from[free]=-radius;to[free]=radius;return {id:c.stable_id,localId:c.id,label:c.label_he,from,to,position:from.map((v,i)=>(v+to[i])/2),directions:c.directions};});return {kind:model.kind,points:[],segments,edges:[],cubeRadius:radius};}
  const points=model.components.map(c=>({id:c.stable_id,localId:c.id,label:c.label_he,seal:c.seal_letters?.join(''),position:DIRECTION_VECTORS[c.id].map(v=>v*2.35)}));
  return {kind:model.kind,points,edges:model.relations.map(r=>({id:r.stable_id,from:points.find(p=>p.localId===r.from_id).position,to:points.find(p=>p.localId===r.to_id).position})),orientationCenter:true};
}

export function componentSummary(model,c){if(model.kind==='boundaries')return `הגבול ${c.label_he} מצרף ברשימה את הכיוונים ${c.directions.map(d=>DIRECTION_LABELS[d]).join(' ו')}.`;return `בפסקת החותמות נזכר הכיוון ${c.label_he}, ובו החותם ${c.seal_letters.join('')}. סדר האותיות מוצג לפי העד בעמוד ${c.source.pdf_page}.`;}

export function componentCompanion(model){return model.kind==='boundaries'?'הצלע ושני פני הקובייה מדגישים את זוג הכיוונים. אין כאן אות משויכת, קודקוד בעל שם או מידה מן המקור.':'הכיוון והחותם שייכים למקור המסוים הזה. נקודת המבט, הצבע והמרחק משמשים להמחשה בלבד.';}
