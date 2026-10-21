// Exact pure scoring semantics from legacy crossRarity.js; no network or AI.
const GADOL_BASE = Object.freeze({"גדול":"רגיל","ריבוע גדול":"ריבוע","משולש גדול":"קדמי","הכפלה גדולה":"הכפלה"});
const ANCHORS = new Set([1820,776,358,424,604,26,86,314,543,91,13,1237,541,137,248,611,1202,318]);
export function independentLegacyMethods(methods = []) {
 const present = new Set(methods.map(m => m.label));
 return methods.filter(m => !(GADOL_BASE[m.label] && present.has(GADOL_BASE[m.label])));
}
export function legacyMethodPoints(size) {
 if (size == null) return 6;
 if (size <= 3) return 30;
 if (size <= 6) return 22;
 if (size <= 12) return 15;
 if (size <= 30) return 9;
 if (size <= 80) return 4;
 return 2;
}
export function scoreLegacyCross(cross, sizeMap = {}, resonanceMap = {}) {
 const methods = independentLegacyMethods(cross.methods || []);
 let points=0,rarest=Infinity,resonance=0;
 for(const m of methods) {
  const size=sizeMap[`${m.label}|${m.value}`];
  points+=legacyMethodPoints(size);
  if(size!=null && size<rarest)rarest=size;
  const rv=resonanceMap[m.value];
  if(rv)resonance=Math.max(resonance,rv);
 }
 if(methods.some(m=>ANCHORS.has(m.value)))points+=10;
 const resoBonus=Math.min(12,resonance*4);
 points+=resoBonus;
 const score=Math.max(0,Math.min(100,Math.round(points)));
 return {score,indepCount:methods.length,rarestSize:Number.isFinite(rarest)?rarest:null,resonance,resoBonus,trivial:methods.length<2};
}
export function rankLegacyByRarity(crosses=[], sizes={},resonance={}) {
 return crosses.map(c=>({...c,rarity:scoreLegacyCross(c,sizes,resonance)}))
   .sort((a,b)=>b.rarity.score-a.rarity.score);
}
