// Additive reader corrections over the preserved source snapshot; never rewrite original units.
export const SOURCE_SHA256='2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a';
export const FAMILY_LIST_LOCI=Object.freeze({
 mothers:{unit:'sy:synoptic:text:ch3:balance',page:91,letters:'אמש',count:3},
 doubles:{unit:'sy:synoptic:text:ch4:seven-doubles',page:100,letters:'בגדכפרת',count:7},
 simples:{unit:'sy:synoptic:text:ch5:twelve-faculties',page:113,letters:'הוזחטילנסעצק',count:12},
});
export function sourceUnitLocus(units,id,page){
 const unit=units?.units?.find(u=>u.id===id);
 const [,work,voice,chapter,key]=id.split(':'),section=work==='synoptic'?'synoptic_body':work==='gra-edition'?'gra_commentary':null;
 const expectedRef=`book:sefer-yetzirah-9perushim#p${page}:${section}:${voice}:${work}:${chapter}:${key}`;
 if(units?.source_identity!=='book:sefer-yetzirah-9perushim'||units.source_pdf_sha256!==SOURCE_SHA256||!unit||!section||unit.work_id!==work||unit.source_layer!=='book_text'||unit.pdf_page!==page||unit.source_anchor!==`#page=${page}&view=FitH`||unit.source_ref!==expectedRef||unit.page_region!=='body')throw new Error('SOURCE_CORRECTION_LOCUS_MISMATCH');
 return {unit_id:unit.id,pdf_page:unit.pdf_page,source_ref:unit.source_ref,page_region:unit.page_region,source_anchor:unit.source_anchor};
}
export function bindFamilyFieldSources(units,components){
 return Object.fromEntries(components.map(c=>{
  const locus=FAMILY_LIST_LOCI[c.id];
  if(!locus||c.letters?.join('')!==locus.letters||c.source_count!==locus.count)throw new Error('SOURCE_FAMILY_READING_MISMATCH');
  return [c.id,{letters:sourceUnitLocus(units,locus.unit,locus.page),source_count:c.source}];
 }));
}
export function graSealsCorrectedReading(units){
 const source=sourceUnitLocus(units,'sy:gra-edition:text:ch1:six-seals',175);
 const original=units.units.find(u=>u.id===source.unit_id).source_content.exact_quote;
 if(original!=='בחר שלש אותיות מן הפשוטות')throw new Error('SOURCE_CORRECTION_BASE_MISMATCH');
 return {source,original,quote:'בירר שלש אותיות מן הפשוטות',status:'visually_read_short_excerpt_normalized_punctuation',engine:'not_tested',note_he:'קריאת התיבה בעמוד 175 מתקנת „בחר” ל„בירר”. תמונת המקור קובעת; הרשומה ההיסטורית נשמרה ללא שינוי.'};
}
