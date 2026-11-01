"""Keep transport failures, cancellation and denied writes separate from success."""
import json,sys,collections,statistics
from pathlib import Path
root=Path(sys.argv[1]);out=Path(sys.argv[2]);rows=[]
for path in sorted(root.glob('network-*.json')):
 d=json.loads(path.read_text());parts=path.stem.split('-');version,width,pair=parts[-3:]
 bad=[{'phase':r['phase'],'method':r['method'],'path':r['path'],'status':r.get('status'),'failure':r.get('failure'),'canceled':r.get('canceled',False)} for r in d['network'] if r.get('status',0)>=400 or r.get('failure')]
 reads=collections.Counter((r['phase'],r['path'],r['method']) for r in d['network'] if r['path'].startswith('/rest/v1/'))
 js=[r for r in d['network'] if r['phase']=='home-entry' and r['type']=='Script']
 rows.append({'version':version,'width':int(width),'pair':int(pair),'pageErrors':d['errors'],'transportIssues':bad,'repeatedSamePathWithinStage':[{'phase':k[0],'path':k[1],'method':k[2],'count':v} for k,v in reads.items() if v>1], 'homeScriptRequests':len(js),'homeScriptEncodedBytes':sum(r.get('encodedBytes',0) for r in js)})
cycle=json.loads((root/'native-cycle.json').read_text());denied={v:collections.Counter() for v in ('before','after')}
for width in (390,1440):
 for pair in (1,2,3):
  for version in ('before','after'):
   rs=[r for r in cycle['results'] if r['version']==version and r['width']==width and r['pair']==pair]
   if not rs:continue
   # Denials are cumulative in each context; count its last measured snapshot once.
   last=rs[-1]['steps'][-1].get('denied') or []
   denied[version].update((r['method'],r['path']) for r in last)
result={'rows':rows,'deniedByIndependentGuard':{v:[{'method':k[0],'path':k[1],'count':n} for k,n in c.items()] for v,c in denied.items()},'pageErrorCount':sum(len(r['pageErrors']) for r in rows),'issueCount':sum(len(r['transportIssues']) for r in rows),'headResponsesMarkedAborted':sum(x['method']=='HEAD' and x.get('status') in (200,206) and x.get('failure')=='net::ERR_ABORTED' for r in rows for x in r['transportIssues']),'notes':['Successful HEAD200/206 headers plus ERR_ABORTED are retained as transport observations, not silently counted as failed content reads.','Same path does not prove a duplicate: query/arguments and consumer identity must be compared in raw evidence.','encodedBytes is a diagnostic only, not evidence of faster load time.','Intentional blocked mutations are not successful writes.','Header wait timing combines network/proxy/server and does not isolate database execution time.']}
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'pageErrorCount':result['pageErrorCount'],'issueCount':result['issueCount'],'denied':result['deniedByIndependentGuard']},ensure_ascii=False))
