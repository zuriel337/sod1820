import {SOURCE_IDENTITY} from './yetzirahModels/sourceModels.js';

export const DEPTHS_READING_ASSET = '/book-data/sefer-yetzirah.ten-depths-reading-depth.json';
export const DEPTHS_DEFAULT_READING = 'sy-structure:ten-depths:reading:body-passages';
const LOCI = {
  'body-passages': ['sy:synoptic:text:ch1:depths', [610,400,555,235]],
  'raavad-measure': ['sy:synoptic:raavad:ch1:ten-depths', [895,640,565,555]],
  'botril-principles-parts': ['sy:synoptic:botril:ch1:depths', [885,1450,575,180]],
  'otzar-measure-word': ['sy:synoptic:otzar:ch1:depths', [300,1550,585,175]],
};
const text=value=>typeof value==='string'&&value.length>0;
const strings=(value,min=1)=>Array.isArray(value)&&value.length>=min&&value.every(text);

// A presentation adapter over the existing registered units, not a second source registry.
export function bindDepthsReadingDepth(content, bundle) {
  const units=bundle?.units;
  if(content?.schema_version!=='sefer-yetzirah-source-readings.v1'||content.source_identity!==SOURCE_IDENTITY||units?.source_identity!==SOURCE_IDENTITY||content.source_pdf_sha256!==units.source_pdf_sha256||content.structure_id!=='sy-structure:ten-depths')throw Error('DEPTHS_READING_SOURCE_MISMATCH');
  const spec=bundle.structures?.structures?.find(s=>s.id===content.structure_id);
  if(!spec||content.readings?.length!==4||content.component_explanations?.length!==10||content.reading_structures?.length!==2)throw Error('DEPTHS_READING_CONTENT_MISSING');
  const unitMap=new Map(units.units.map(u=>[u.id,u])), ids=new Set();
  for(const reading of content.readings){
    const s=reading.source,u=unitMap.get(s?.unit_id),c=reading.crop;
    const locus=LOCI[reading.id?.split(':reading:')[1]];
    if(ids.has(reading.id)||!reading.id.startsWith(`${content.structure_id}:reading:`)||!u||!locus||locus[0]!==u.id||s.pdf_page!==53||s.pdf_page!==u.pdf_page||s.source_ref!==u.source_ref||s.page_region!==u.page_region||s.source_anchor!==u.source_anchor||reading.source_layer!==u.source_layer||reading.kind!=='bounded_source_summary'||reading.verification?.engine!=='not_tested')throw Error('DEPTHS_READING_LOCATOR_MISMATCH');
    if(!c||c.x<0||c.y<0||c.width<=0||c.height<=0||c.x+c.width>content.image_width||c.y+c.height>content.image_height)throw Error('DEPTHS_READING_CROP_MISMATCH');
    if(JSON.stringify([c.x,c.y,c.width,c.height])!==JSON.stringify(locus[1]))throw Error('DEPTHS_READING_CROP_MISMATCH');
    if(reading.structure_id!==content.structure_id||!text(reading.title_he)||!text(reading.voice_he)||!text(reading.content?.summary)||!text(reading.content.summary_label)||!strings(reading.companion_paragraphs_he,3)||reading.companion_paragraphs_he.length!==3||!strings(reading.content.exact_short_quotes)||!strings(reading.questions_he)||!strings(reading.unresolved,0))throw Error('DEPTHS_READING_CONTENT_MISSING');
    ids.add(reading.id);
  }
  const componentIds=new Set();
  for(const explanation of content.component_explanations){
    if(componentIds.has(explanation.component_id)||!spec.components.some(c=>c.id===explanation.component_id)||!ids.has(explanation.reading_id)||!text(explanation.title_he)||!text(explanation.explanation_he)||!text(explanation.question_he))throw Error('DEPTHS_READING_COMPONENT_MISMATCH');
    componentIds.add(explanation.component_id);
  }
  const diagramIds=new Set();
  for(const diagram of content.reading_structures){
    if(diagramIds.has(diagram.id)||!diagram.id.startsWith(`${content.structure_id}:reading-diagram:`)||!strings(diagram.reading_ids)||diagram.reading_ids.some(id=>!ids.has(id))||!strings(diagram.steps_he,4)||diagram.steps_he.length!==4||!text(diagram.title_he)||!text(diagram.representation_label)||!text(diagram.explanation_he)||!['textual_reading_flow','commentary_comparison'].includes(diagram.kind))throw Error('DEPTHS_READING_DIAGRAM_MISMATCH');
    diagramIds.add(diagram.id);
  }
  if(content.image!=='/book-data/sefer-yetzirah-page53-reading.webp'||content.image_width!==1591||content.image_height!==2250)throw Error('DEPTHS_READING_IMAGE_MISMATCH');
  return content;
}
