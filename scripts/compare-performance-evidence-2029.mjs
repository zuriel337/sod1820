// SOD1820: pure performance evidence comparison, not a new RUM collector.
// Input is aggregated observations from the canonical events/Control Plane owner.
// A byte-budget pass is not evidence of faster users; a build-to-build difference
// with different route/device or sparse samples cannot establish causality.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const METRICS = Object.freeze({
  lcp_ms: { good: 2500, minimum: 50, deterioration: 0.05 },
  inp_ms: { good: 200, minimum: 30, deterioration: 0.05 },
  cls: { good: 0.1, minimum: 50, deterioration: 0.05 },
  ttfb_ms: { good: 800, minimum: 50, deterioration: 0.1 },
  fcp_ms: { good: 1800, minimum: 50, deterioration: 0.1 },
});
const num = x => typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null;
const integer = x => Number.isSafeInteger(x) && x >= 0 ? x : null;
const keyOf = r => [r?.route,r?.device,r?.measurement_scope,r?.cohort].map(String).join("|");
const hasKey = r => !!r && ["route","device","measurement_scope","cohort"].every(k=>typeof r[k]==="string" && r[k].trim().length>0);
const one = (r,m) => ({ p75:num(r?.metrics?.[m]?.p75), n:integer(r?.metrics?.[m]?.n) });

export function comparePerformanceGroups({ baseline, candidate, minImprovementFraction = 0.05 } = {}) {
  if(!Array.isArray(baseline) || !Array.isArray(candidate)) return {
    status:"UNKNOWN",reason:"MISSING_EVIDENCE",groups:[],
  };
  const base = new Map(), current=new Map();
  for(const item of baseline) if(hasKey(item)) base.set(keyOf(item),item);
  for(const item of candidate) if(hasKey(item)) current.set(keyOf(item),item);
  const all = [...new Set([...base.keys(),...current.keys()])].sort();
  if(!all.length) return {status:"UNKNOWN",reason:"NO_MATCHED_ROUTE_DEVICE_GROUPS",groups:[]};
  const groups=all.map(key=>{
    const before=base.get(key),after=current.get(key);
    if(!before || !after) return {key,status:"UNKNOWN",reason:"UNMATCHED_GROUP",metrics:{}};
    const metrics={};
    for(const [name,config] of Object.entries(METRICS)){
      const b=one(before,name),a=one(after,name);
      if(b.p75===null||a.p75===null||b.n===null||a.n===null||b.n<config.minimum||a.n<config.minimum)
        metrics[name]={status:"UNKNOWN",reason:"INSUFFICIENT_METRIC_COVERAGE",baseline:b,candidate:a};
      else{
        const delta=a.p75-b.p75, ratio=b.p75===0?(a.p75>0?Infinity:0):delta/b.p75;
        metrics[name]={
          status: ratio > config.deterioration ? "REGRESSION" : ratio <= -minImprovementFraction ? "IMPROVEMENT" : "NO_MATERIAL_CHANGE",
          baseline:b,candidate:a,delta,relativeChange:ratio,
          goodTarget:config.good,candidateGood:a.p75<=config.good,
        };
      }
    }
    const values=Object.values(metrics);
    const status=values.some(v=>v.status==="REGRESSION")?"REGRESSION"
      :values.some(v=>v.status==="UNKNOWN")?"UNKNOWN"
      :values.some(v=>v.status==="IMPROVEMENT")?"IMPROVED"
      :"NO_MEASURED_IMPROVEMENT";
    return {key,status,metrics};
  });
  const anyRegressed=groups.some(g=>g.status==="REGRESSION");
  const anyUnknown=groups.some(g=>g.status==="UNKNOWN");
  const anyImproved=groups.some(g=>g.status==="IMPROVED");
  return {
    schema:"sod1820.performance-comparison.v1",
    status:anyRegressed?"REGRESSION":anyUnknown?"UNKNOWN":anyImproved?"IMPROVED":"NO_MEASURED_IMPROVEMENT",
    reason:"Aggregated p75 observations only; correlation does not establish release causality.",
    groups,
    releaseGateEvidence:"NEEDS_CONTROLLED_LAB_AND_FUNCTIONAL_CHECKS",
  };
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const loc=process.argv.indexOf("--input");
  if(loc<0 || !process.argv[loc+1]){console.error("Usage: node scripts/compare-performance-evidence-2029.mjs --input aggregate.json");process.exitCode=2;}
  else{
    try{
      const payload=JSON.parse(readFileSync(process.argv[loc+1],"utf8"));
      const result=comparePerformanceGroups(payload);
      console.log(JSON.stringify(result,null,2));
      if(result.status!=="IMPROVED")process.exitCode=1;
    }catch(e){console.error("Cannot validate aggregate evidence:",e.message);process.exitCode=2;}
  }
}
