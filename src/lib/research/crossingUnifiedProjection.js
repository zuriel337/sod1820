import { legacyCrossCandidates, methodIntersections } from "./crossingParityCore.js";
import { scoreLegacyCross } from "./crossingLegacyRarity.js";

// Legacy method identities: do not silently equate kadmi with triangle_word_calc.
export const LEGACY_CROSS_LABELS = Object.freeze({
 ragil:"רגיל",misratar:"מסתתר",miluy:"מילוי",kadmi:"משולש",
 gadol:"גדול",siduri:"סידורי",atbash:"אתבש",albam:"אלבם",
 ribua:"ריבוע",hakpala:"הכפלה",ribua_gadol:"ריבוע גדול",
 hakpala_gadol:"הכפלה גדולה",miluy_demiluy:"מילוי דמילוי",
 kadmi_gadol:"משולש גדול"
});
// Preserve legacy candidate match-count/length order. Rarity is an annotation,
// not a replacement sort; callers may request an optional separate rare-first view.
export function projectCrossingResearch({expression,values,candidates,columns,limits=13,familySizes={},resonance={},sort="legacy"}) {
 const selected=legacyCrossCandidates({expression,values,candidates,columns,limit:limits});
 const result=selected.map(row=>{
  const methods=row.methods.map(m=>({...m,label:LEGACY_CROSS_LABELS[m.key]||m.key}));
  const enriched={...row,methods};
  return {...enriched,rarity:scoreLegacyCross(enriched,familySizes,resonance)};
 });
 if(sort==="rarity")return result.slice().sort((a,b)=>b.rarity.score-a.rarity.score);
 return result;
}
export function projectPairResearch({left,right,methodKeys=[]}) {
 const all=methodIntersections(left,right,methodKeys);
 return {same:all.filter(x=>x.sameMethod),cross:all.filter(x=>!x.sameMethod),all};
}
