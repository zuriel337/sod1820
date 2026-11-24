// SOD1820 read-only post-publication SEO watch. Uses the CURRENT canonical public
// Sitemap + rendered document. Never submits indexing to Google or writes to the DB.
// Run manually or hourly after release; pending / no data are explicitly reported.
import { parsePublicSitemapEntries2029, selectPublicationSeoCandidates2029, assessPublicationSeoHttp2029, PUBLIC_SEO_ORIGIN_2029 } from "../src/lib/research/publicationSeoAudit2029.js";

const TIMEOUT_MS=12000, MAX_DOC_BYTES=750000, MAX_SITEMAP_BYTES=4000000;
async function load(url) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort("PUBLIC_SEO_HTTP_TIMEOUT"),TIMEOUT_MS);
  try{
    const response=await fetch(url,{method:"GET",signal:controller.signal,headers:{"Accept":"text/html,application/xml;q=0.8","User-Agent":"SOD1820-SEO-PostPublish-Audit/1.0"}});
    const cap=url.includes("/sitemap.xml?")?MAX_SITEMAP_BYTES:MAX_DOC_BYTES;
    const len=Number(response.headers.get("content-length")||0);
    if(len>cap)return {status:response.status,headers:{},body:"",finalUrl:response.url,redirected:response.redirected,error:"DOCUMENT_EXCEEDS_BOUNDED_READ"};
    // Avoid reading a whole unbounded stream from any unexpectedly giant response.
    const reader=response.body?.getReader();
    const chunks=[];let total=0,exceeded=false;
    if(reader){while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>cap){exceeded=true;await reader.cancel();break;}chunks.push(value);}}
    const body=exceeded?"":await new Blob(chunks).text();
    return {status:response.status,headers:{"x-robots-tag":response.headers.get("x-robots-tag")||""},body,finalUrl:response.url,redirected:response.redirected,...(exceeded?{error:"DOCUMENT_EXCEEDS_BOUNDED_READ"}:{})};
  } finally {clearTimeout(timer);}
}
export async function runPublicationSeoAudit2029({fetchPage=load,now=new Date(),max=18}={}){
 const snapshot={schema:"sod1820.postpublication-seo-audit.v1",checkedAt:new Date(now).toISOString(),source:PUBLIC_SEO_ORIGIN_2029+"/sitemap.xml?part=content",status:"UNKNOWN",coverage:"UNKNOWN",results:[],reasons:[],metrics:{selected:0,pass:0,fail:0,unknown:0}};
 let xml;
 try{const response=await fetchPage(snapshot.source);if(response.status!==200||response.error)throw Error(response.error||"SITEMAP_HTTP_"+response.status);xml=response.body;}
 catch(e){snapshot.reasons.push("SITEMAP_UNAVAILABLE: "+String(e?.message||e).slice(0,90));return snapshot;}
 const parsed=parsePublicSitemapEntries2029(xml);
 if(parsed.status!=="OBSERVED"){snapshot.reasons.push(parsed.reason);return snapshot;}
 const selected=selectPublicationSeoCandidates2029(parsed.items,{now,max,perFamily:8});
 snapshot.coverage=selected.coverage;snapshot.reasons=selected.reasons;snapshot.metrics.selected=selected.items.length;
 if(!selected.items.length){snapshot.status=parsed.items.length?"NO_RECENT_PUBLICATION":"UNKNOWN";snapshot.reasons.push(parsed.items.length?"NO_RECENT_PUBLICATIONS_TO_AUDIT":"NO_PUBLIC_ITEMS_IN_SITEMAP");return snapshot;}
 // Three requests at a time; no private tokens, writes, or expensive repeated crawls.
 for(let i=0;i<selected.items.length;i+=3){
  const batch=selected.items.slice(i,i+3);
  const reports=await Promise.all(batch.map(async item=>{
    try{const evidence=await fetchPage(item.url);
      const report=assessPublicationSeoHttp2029(item,evidence);
      if(evidence.error){report.unknown.push(evidence.error);if(report.state!=="FAIL")report.state="UNKNOWN";}
      return report;
    }catch(e){return {url:item.url,family:item.family,state:"UNKNOWN",issues:[],unknown:["HTTP_PROBE_FAILED",String(e?.message||e).slice(0,100)]};}
  }));
  snapshot.results.push(...reports);
 }
 snapshot.metrics.pass=snapshot.results.filter(r=>r.state==="OBSERVED_OK").length;
 snapshot.metrics.fail=snapshot.results.filter(r=>r.state==="FAIL").length;
 snapshot.metrics.unknown=snapshot.results.filter(r=>r.state==="UNKNOWN").length;
 snapshot.status=snapshot.metrics.fail?"FAIL":snapshot.metrics.unknown||snapshot.coverage!=="SELECTED"?"PARTIAL":"OBSERVED_OK";
 snapshot.note="Hourly, bounded verification of sitemap-backed public pages only. Missing lastmod, legacy root-form Posts, a pending cache, and actual Google indexing require separate evidence.";
 return snapshot;
}
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href){
 const report=await runPublicationSeoAudit2029();
 console.log(JSON.stringify(report,null,2));
 const summary=process.env.GITHUB_STEP_SUMMARY;
 if(summary){
  const fs=await import("node:fs");
  fs.appendFileSync(summary,[
   "## SOD1820 · SEO לאחר פרסום",
   `**State:** ${report.status} · **Coverage:** ${report.coverage}`,
   `**Documents:** ${report.metrics.selected} · OK: ${report.metrics.pass} · Defects: ${report.metrics.fail} · Unknown: ${report.metrics.unknown}`,
   ...report.results.filter(x=>x.state!=="OBSERVED_OK").slice(0,18).map(x=>`- ${x.state} · ${x.family} · ${x.url} · ${[...(x.issues||[]),...(x.unknown||[])].join(", ")}`),
   `**Coverage gaps:** ${report.reasons.join(", ")||"none observed"}`,
   "This does not prove Google indexing. The existing sitemap remains the single owner.", ""
  ].join("\n")+"\n");
 }
 if(report.status==="FAIL")process.exitCode=1;
 else if(report.status==="UNKNOWN")process.exitCode=2;
}
