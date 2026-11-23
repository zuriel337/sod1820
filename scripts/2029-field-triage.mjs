// SOD1820 field metric surface triage over existing aggregate measurements.
// One shared read-only Control Plane projection; never writes alerts or invents samples.
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

export const GOOD_TARGETS = Object.freeze({ lcp_ms:2500, inp_ms:200, cls:0.1 });
export const MIN_SAMPLES = Object.freeze({ lcp_ms:50, inp_ms:30, cls:50 });
// Unknown is not a PASS; a metric with tiny sample is not proof of a defect.
export function fieldMetricTriage(rows = []) {
  if(!Array.isArray(rows)||rows.length===0)return {status:"UNKNOWN",issues:[],coverage:[],limitations:"NO_DATA — missing samples are never a healthy outcome"};
  const issues=[],coverage=[];
  for(const row of rows){
    const identity={build:row.build_label||null,route:row.route||null,device:row.device||null,
      scope:row.measurement_scope||null};
    if(!identity.build||!identity.route||!identity.device||identity.scope!=="document_navigation_hard_load_only"){
      coverage.push({...identity,metric:null,status:"UNKNOWN",reason:"INVALID_OR_UNSUPPORTED_MEASUREMENT_SCOPE"});
      continue;
    }
    for(const [metric,good] of Object.entries(GOOD_TARGETS)){
      const n=Number(row[metric==="cls"?"cls_n":metric==="lcp_ms"?"lcp_n":"inp_n"]);
      const raw=row[metric==="cls"?"cls_p75":metric==="lcp_ms"?"lcp_p75_ms":"inp_p75_ms"];
      const value=raw==null||raw===""?NaN:Number(raw);
      if(!Number.isSafeInteger(n)||n<MIN_SAMPLES[metric]||!Number.isFinite(value)||value<0){
        coverage.push({...identity,metric,n:Number.isFinite(n)?n:null,status:"UNKNOWN",reason:"INSUFFICIENT_FIELD_SAMPLE"});
        continue;
      }
      if(value>good){
        issues.push({...identity,metric,n,p75:value,target:good,severity:
          metric==="cls" && value>0.25 || metric==="inp_ms" && value>500 || metric==="lcp_ms" && value>4000
            ? "poor" : "needs_improvement",reason:"FIELD_P75_ABOVE_GOOD_TARGET"});
      }
    }
  }
  return {schema:"sod1820.field-triage.v1",
    status:issues.length?"ATTENTION":coverage.some(x=>x.status==="UNKNOWN")?"PARTIAL":"OBSERVED_WITHIN_TARGETS",
    issues,coverage,
    limitations:"RUM navigation only. Cannot prove route-change responsiveness, save persistence, or attribution to a release; do not infer OK for missing cohorts."};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const arg=process.argv.indexOf("--input");
  if(arg<0||!process.argv[arg+1]){console.error("Usage: node scripts/2029-field-triage.mjs --input aggregates.json");process.exitCode=2;}
  else try{
    const rows=JSON.parse(readFileSync(process.argv[arg+1],"utf8"));
    const result=fieldMetricTriage(rows);console.log(JSON.stringify(result,null,2));
    if(result.status==="ATTENTION")process.exitCode=1;
    else if(result.status==="PARTIAL")process.exitCode=2;
  }catch(e){console.error(e.message);process.exitCode=2;}
}
