// Shared crossing *result* logic. Values must come from canonical engine and vetted corpus.
const clean = x => String(x ?? "").trim();
const finals = {ך:"כ",ם:"מ",ן:"נ",ף:"פ",ץ:"צ"};
export const anagramKey = x => [...clean(x).replace(/[^א-ת]/g,"")].map(c=>finals[c]||c).sort().join("");
export const methodIntersections = (left={},right={},order=[]) => {
 const keys=order.length?order:Object.keys(left);
 const matches=[];
 for (const a of keys) for(const b of keys){
  const av=Number(left[a]),bv=Number(right[b]);
  if(Number.isFinite(av)&&av>0&&av===bv) matches.push({leftMethod:a,rightMethod:b,value:av,sameMethod:a===b});
 }
 return matches.sort((x,y)=>Number(y.sameMethod)-Number(x.sameMethod)||x.leftMethod.localeCompare(y.leftMethod,"he"));
};
export function legacyCrossCandidates({expression,values,candidates=[],columns=[],limit=13}){
 const self=clean(expression),selfKey=anagramKey(self),out=[],seen=new Set();
 for(const row of candidates.slice(0,250)){
  const phrase=clean(row.phrase);
  if(!phrase||phrase===self||seen.has(phrase)||anagramKey(phrase)===selfKey)continue;
  const methods=columns.filter(c=>row[c]!=null&&values[c]!=null&&Number(row[c])===Number(values[c]))
      .map(c=>({key:c,value:Number(values[c])}));
  if(methods.length<2)continue;
  seen.add(phrase);
  out.push({sourceId:row.id||null,partner:phrase,methods,matchCount:methods.length,
   score:methods.length*1000-phrase.length+(phrase.length>=3?5:0)});
 }
 out.sort((a,b)=>b.score-a.score||a.partner.localeCompare(b.partner,"he"));
 return out.slice(0,Math.max(1,Math.min(40,Number(limit)||13)));
}
