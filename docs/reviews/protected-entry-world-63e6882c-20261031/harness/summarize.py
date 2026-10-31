import json,pathlib,re,collections,hashlib
root=pathlib.Path(__file__).parent
raw=json.loads((root/'results/playwright-results.json').read_text())
cases=[]
def visit(suites):
    for s in suites:
        for spec in s.get('specs',[]):
            for t in spec['tests']:
                results=t['results']
                last=results[-1] if results else {}
                error=last.get('error',{}).get('message','')
                error=re.sub(r'\x1b\[[0-9;]*m','',error)
                cases.append({'title':spec['title'],'file':spec['file'],'line':spec['line'],'status':last.get('status',t.get('status')),'durationMs':last.get('duration'),'error':error[:2500],'supplementary':spec['file'].startswith('public-post-entry')})
        visit(s.get('suites',[]))
visit(raw['suites'])
audits=[]
for f in sorted((root/'results/test-results').glob('*/sanitized-network-audit.json')):
    audits.append(json.loads(f.read_text()))
reads=[x for a in audits for x in a['reads']]
blocked=[x for a in audits for x in a['blocked']]
summary={'testSourceSha':'c2f2e9948dd119c96b69e377b33be2eb2a886efb','runtimeSha':'63e6882c3b7b4004d337927c7231728a7612d452','deployment':'dpl_Aa8o4Cr61VawivzJodti8KTsecB2','fullIsolationPassed':False,'A3':'OPEN_NOT_RUN','officialWorld':dict(collections.Counter(c['status'] for c in cases if not c['supplementary'])),'supplementary':dict(collections.Counter(c['status'] for c in cases if c['supplementary'])),'stats':raw['stats'],'network':{'auditFiles':len(audits),'actualLiveRpcGetRequests':sum(x.get('transportMethod')=='GET' for x in reads),'actualLiveRpcPostRequests':0,'liveWrites':0,'liveModels':0,'transportErrors':sum(len(a['transportErrors']) for a in audits),'blockedReasons':dict(collections.Counter(x.get('reason',x.get('kind')) for x in blocked))},'cases':cases}
(root/'results/summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='cases'},ensure_ascii=False,indent=2))
for c in cases:
    if c['status']!='passed':print(c['status'],c['title'],c['error'].splitlines()[0] if c['error'] else '')
