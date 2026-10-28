import {CATALOG_DEFINITIONS,catalogGeometry,assertCatalogLocus} from './catalogModels.js';
import {bindFamilyFieldSources,graSealsCorrectedReading} from './sourceCorrections2029.js';
// Book-specific projection of existing source specifications. No new source identities or engine.
export const SOURCE_IDENTITY = 'book:sefer-yetzirah-9perushim';
export const MODEL_KEYS = Object.freeze({
  synoptic: 'six-seals-synoptic',gra: 'six-seals-gra-edition',boundaries:'twelve-boundaries-gra',five:'five-against-five',depths:'ten-depths',
});
export const CAMERA = Object.freeze({position:[7,5.5,8.5],fov:34,target:[0,0,0]});
export function viewportFov(width,height){return 2*Math.atan(Math.tan(CAMERA.fov*Math.PI/360)/Math.min(1,width/height))*180/Math.PI;}
export const DIRECTION_LABELS = Object.freeze({up:'רום',down:'תחת',east:'מזרח',west:'מערב',north:'צפון',south:'דרום'});
export const DIRECTION_VECTORS = Object.freeze({up:[0,1,0],down:[0,-1,0],east:[1,0,0],west:[-1,0,0],north:[0,0,-1],south:[0,0,1]});
const EXPECTED = {'ten-depths':{page:53,count:10,kind:'depths',title:'עשרת העומקים · חמישה זוגות'},'five-against-five':{page:45,count:3,kind:'five',title:'חמש כנגד חמש · וברית באמצע'},'six-seals-synoptic':{page:73,count:6,kind:'seals',title:'שש החותמות · הגוף המשולב'},'six-seals-gra-edition':{page:175,count:6,kind:'seals',title:'שש החותמות · נוסח הגר״א'},'twelve-boundaries-gra':{page:187,count:12,kind:'boundaries',title:'שנים־עשר גבולי האלכסון · נוסח הגר״א'}};

export function bindSourceModel(bundle,key) {
  let expected=EXPECTED[key]||CATALOG_DEFINITIONS[key];
  if(!expected||bundle?.structures?.source_identity!==SOURCE_IDENTITY||bundle?.units?.source_identity!==SOURCE_IDENTITY)throw new Error('SOURCE_IDENTITY_MISMATCH');
  const spec=bundle.structures.structures.find(s=>s.id===`sy-structure:${key}`);
  if(!spec||spec.components.length!==expected.count)throw new Error('SOURCE_COMPONENTS_MISSING');
  const units=new Map(bundle.units.units.map(u=>[u.id,u]));
  function check(source){
    const unit=units.get(source?.unit_id);
    if(!unit||unit.pdf_page!==source.pdf_page||unit.source_ref!==source.source_ref||unit.page_region!==source.page_region||unit.source_anchor!==source.source_anchor||!(expected.pages||[expected.page]).includes(source.pdf_page)||source.source_anchor!==`#page=${source.pdf_page}&view=FitH`)throw new Error('SOURCE_LOCATOR_MISMATCH');
  }
  const components=spec.source_order.map(id=>spec.components.find(c=>c.id===id));
  if(components.length!==expected.count||components.some(c=>!c)||new Set(components.map(c=>c.id)).size!==expected.count)throw new Error('SOURCE_ORDER_MISMATCH');
  components.forEach(c=>{if(expected.kind==='catalog')assertCatalogLocus(key,c);check(c.source);if(c.stable_id!==`${spec.id}:component:${c.id}`)throw new Error('SOURCE_COMPONENT_ID_MISMATCH');if(expected.kind==='boundaries'&&(c.directions?.length!==2||c.directions.some(d=>!DIRECTION_VECTORS[d])||DIRECTION_VECTORS[c.directions[0]].some((v,i)=>v&&DIRECTION_VECTORS[c.directions[1]][i])))throw new Error('SOURCE_DIRECTION_PAIR_MISSING');if(expected.kind==='seals'&&(!DIRECTION_VECTORS[c.id]||c.seal_letters?.length!==3))throw new Error('SOURCE_SEAL_MISSING');});
  if(expected.kind==='catalog')for(const c of components){if(!c.source_reading_id)continue;
    const reading=bundle.readings?.readings?.find(r=>r.id===c.source_reading_id);
    if(bundle.readings?.source_identity!==SOURCE_IDENTITY||!reading||reading.id!==`${spec.id}:reading:${c.id}`||reading.structure_id!==spec.id||reading.source.unit_id!==c.source.unit_id||reading.source.pdf_page!==c.source.pdf_page||reading.source.source_ref!==c.source.source_ref||reading.source.source_anchor!==c.source.source_anchor||!reading.source.page_region)throw new Error('SOURCE_READING_MISMATCH');
    for(const [field] of expected.fields)if(Object.hasOwn(reading.content,field)&&JSON.stringify(reading.content[field])!==JSON.stringify(c[field]))throw new Error('SOURCE_READING_CONTENT_MISMATCH');
  }
  spec.sources.forEach(check);
  if(key==='letter-families')expected={...expected,fieldSources:bindFamilyFieldSources(bundle.units,components)};
  if(key==='six-seals-gra-edition')expected={...expected,correctedReading:graSealsCorrectedReading(bundle.units)};
  spec.source_relations.forEach(r=>{check(r.source);if(r.stable_id!==`${spec.id}:relation:${r.from_id}:${r.type}:${r.to_id}`||r.id!==r.stable_id)throw new Error('SOURCE_RELATION_ID_MISMATCH');if(!components.some(c=>c.id===r.from_id)||!components.some(c=>c.id===r.to_id))throw new Error('SOURCE_RELATION_MISMATCH');});
  return {id:spec.id,key,...expected,page:expected.page||expected.pages[0],readings:bundle.readings?.readings,contextUnits:spec.sources.filter(s=>!components.some(c=>c.source.unit_id===s.unit_id)).map(s=>({source:s,unit:units.get(s.unit_id),workTitle:bundle.units.works?.find(w=>w.id===units.get(s.unit_id).work_id)?.title||'יחידת מקור בכרך'})),components,passageSummary:units.get(components[0].source.unit_id).source_content.summary,sourceSummaries:Object.fromEntries(components.map(c=>[c.id,units.get(c.source.unit_id).source_content.summary])),sourceCompanions:Object.fromEntries(components.map(c=>[c.id,units.get(c.source.unit_id).companion_explanation||''])),relations:spec.source_relations,legend:spec.source_acceptance.legend_he,pdfUrl:bundle.units.source_pdf_url,editorial:expected.editorial|| (expected.kind==='depths'?'שלושת זוגות הכיוונים בלבד מוצגים בחלל. ראשית ואחרית, טוב ורע מוצגים כזוגות קריאה נפרדים, בלי ציר פיזי. המרחקים, צורת הצמתים והמרכז הם אמצעי המחשה; אינם מדידה או ספירה נוספת.':expected.kind==='five'?'עשרת הסימנים מציגים שתי חמישיות במשל האצבעות. הטבעת האמצעית מסמנת את הברית ואינה ספירה אחת־עשרה. הצורה, המרחק והצבע הם בחירות המחשה; אין כאן שם פרטי לכל אצבע.':expected.kind==='boundaries'?'הקובייה היא בחירת המחשה של צמדי הכיוונים. צלעותיה, קודקודיה ומידותיה אינם נתונים שנמסרו בספר; אין שיוך אות לצלע.':'המרחקים, הצבעים, זווית המבט והמרכז הם אמצעי המחשה. המרכז מסייע להתמצאות ואינו ספירה נוספת.'),spec};
}
export function selectedComponent(model,id){return model.components.find(c=>c.stable_id===id||c.id===id)||null;}
export function sourcePayload(model,component,relation=null){
  return {bookSlug:'sefer-yetzirah',sourceIdentity:SOURCE_IDENTITY,structureId:model.id,componentId:component?.stable_id??null,relationId:relation?.stable_id??null,source:relation?.source??component.source,pdfUrl:model.pdfUrl,verification:'not_tested'};
}
// Positions are editorial coordinates; source fields are never generated from geometry.
export function modelGeometry(model){
  if(model.kind==='catalog')return catalogGeometry(model);
  if(model.kind==='five'){
    const groups=model.components.filter(c=>c.id!=='covenant');
    const points=groups.flatMap((c,g)=>Array.from({length:5},(_,i)=>({id:c.stable_id,localId:c.id,label:c.label_he,position:[g?1.8:-1.8,(i-2)*.75,.3*Math.sin(i*Math.PI/4)],illustrationMarker:i,showLabel:i===2,labelPosition:[g?2.2:-2.2,2.4,0],labelScale:[1.7,.85,1]})));
    const covenant=model.components.find(c=>c.id==='covenant');points.push({id:covenant.stable_id,localId:covenant.id,label:covenant.label_he,position:[0,0,0],shape:'ring',counted:false,labelPosition:[0,-2.2,0]});
    return {kind:model.kind,points,edges:[],orientationCenter:false};
  }
  if(model.kind==='boundaries'){const radius=1.65;const segments=model.components.map(c=>{const from=[0,0,0],to=[0,0,0];const fixed=new Set();for(const d of c.directions){const v=DIRECTION_VECTORS[d],axis=v.findIndex(n=>n!==0);fixed.add(axis);from[axis]=to[axis]=v[axis]*radius;}const free=[0,1,2].find(a=>!fixed.has(a));from[free]=-radius;to[free]=radius;return {id:c.stable_id,localId:c.id,label:c.label_he,from,to,position:from.map((v,i)=>(v+to[i])/2),directions:c.directions};});return {kind:model.kind,points:[],segments,edges:[],cubeRadius:radius};}
  const points=model.components.filter(c=>DIRECTION_VECTORS[c.id]).map(c=>({id:c.stable_id,localId:c.id,label:c.label_he,seal:c.seal_letters?.join(''),position:DIRECTION_VECTORS[c.id].map(v=>v*2.35)}));
  return {kind:model.kind,points,edges:model.relations.filter(r=>points.some(p=>p.localId===r.from_id)&&points.some(p=>p.localId===r.to_id)).map(r=>({id:r.stable_id,from:points.find(p=>p.localId===r.from_id).position,to:points.find(p=>p.localId===r.to_id).position})),orientationCenter:true};
}

export function componentSummary(model,c){if(model.kind==='catalog')return model.sourceSummaries[c.id];if(model.kind==='depths'){const r=model.relations.find(r=>r.from_id===c.id||r.to_id===c.id);const other=model.components.find(p=>p.id===(r.from_id===c.id?r.to_id:r.from_id));return `${c.label_he} מופיע ברשימת העומקים בזוג עם ${other.label_he}. ${DIRECTION_VECTORS[c.id]?'זהו אחד משלושת זוגות הכיוונים המרחביים.':'הזוג הזה אינו מוצג כאן ככיוון חלל שהספר קובע.'}`;}if(model.kind==='five')return c.id==='covenant'?'במשל נאמר: ברית יחיד מכוונת באמצע. היא המוקד שבין שתי החמישיות, ואינה תוספת למניין עשר הספירות.':`${c.label_he}: אחת משתי החמישיות במשל עשר האצבעות. החמישייה שכנגדה מובחנת ממנה, והברית באמצע.`;if(model.kind==='boundaries')return `הגבול ${c.label_he} מצרף ברשימה את הכיוונים ${c.directions.map(d=>DIRECTION_LABELS[d]).join(' ו')}.`;return `בפסקת החותמות נזכר הכיוון ${c.label_he}, ובו החותם ${c.seal_letters.join('')}. סדר האותיות מוצג לפי העד בעמוד ${c.source.pdf_page}.`;}

export function componentCompanion(model,component){if(model.kind==='catalog')return `${model.sourceCompanions[component?.id]||''} ${model.companion}`.trim();return model.companion|| (model.kind==='depths'?'זוגות הזמן והערך נשארים בתיבות הקריאה. שלושת זוגות הכיוונים נראים בחלל כדי להקל על ההתמצאות; הקואורדינטות והמרחקים הם בחירת המחשה בלבד.':model.kind==='five'?'כל סימן בחמישייה בוחר את קבוצת המקור כולה. הסימנים אינם שמות של ספירות או של אצבעות מסוימות. הטבעת מאפשרת לבחור בברית בלי למנותה כאחת־עשרה.':model.kind==='boundaries'?'הצלע ושני פני הקובייה מדגישים את זוג הכיוונים. אין כאן אות משויכת, קודקוד בעל שם או מידה מן המקור.':'הכיוון והחותם שייכים למקור המסוים הזה. נקודת המבט, הצבע והמרחק משמשים להמחשה בלבד.');}
