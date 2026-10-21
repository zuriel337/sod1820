import { legacyCrossCandidates, methodIntersections } from "./crossingParityCore.js";
import { rankLegacyByRarity } from "./crossingLegacyRarity.js";

// Pure projection only: numbers and corpus candidates MUST come from the authorized canonical engine.
const labels = Object.freeze({ragil:"רגיל",misratar:"מסתתר",miluy:"מילוי",kadmi:"קדמי",gadol:"גדול",siduri:"סידורי",atbash:"אתבש",albam:"אלבם",ribua:"ריבוע",kadmi_gadol:"משולש גדול",ribua_gadol:"ריבוע גדול"});
export function projectCrossingResearch({expression,values,candidates,columns,limits=13,familySizes={},resonance={}}) {
 const selected = legacyCrossCandidates({expression,values,candidates,columns,limit:limits});
 const normalized = selected.map(row=>({
  ...row,
  methods:row.methods.map(m=>({...m,label:labels[m.key]||m.key}))
 }));
 return rankLegacyByRarity(normalized,familySizes,resonance);
}
export function projectPairResearch({left,right,methodKeys=[]}) {
 const matches = methodIntersections(left,right,methodKeys);
 return {same:matches.filter(m=>m.sameMethod),cross:matches.filter(m=>!m.sameMethod),all:matches};
}
