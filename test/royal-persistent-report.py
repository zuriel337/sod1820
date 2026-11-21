import json,statistics
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'docs/reviews/royal-persistent-20261121';r=json.loads((p/'metrics.json').read_text());assert len(r)==144
summary=[]
for route in ['world','heichal','books','post']:
 for w in [390,1440]:
  for warm in [False,True]:
   for arm in ['main','before','persistent']:
    xs=[x for x in r if (x['route'],x['width'],x['warm'],x['arm'])==(route,w,warm,arm)];d=dict(route=route,width=w,warm=warm,arm=arm)
    for k in ['lcp','usefulPaint']:
     v=[x[k] for x in xs if x[k] is not None];d[k]=dict(median=round(statistics.median(v),1),min=round(min(v),1),max=round(max(v),1)) if v else None
    d['maxCLS']=max(x['cls'] for x in xs);d['lcpCandidates']=[[e for e in x['events'] if e['kind']=='lcp'][-1] for x in xs];summary.append(d)
(p/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
lines=['| Route | Width | Visit | Main LCP / useful | Previous PR LCP / useful | Persistent LCP / useful | Delta vs previous |','|---|---:|---|---:|---:|---:|---:|']
for route in ['world','heichal','books','post']:
 for w in [390,1440]:
  for warm in [False,True]:
   a,b,c=[x for x in summary if (x['route'],x['width'],x['warm'])==(route,w,warm)]
   def vals(x):return ' / '.join(str(x[k]['median']) if x[k] else 'below fold' for k in ['lcp','usefulPaint'])
   delta=' / '.join(f"{c[k]['median']-b[k]['median']:+.1f}" if b[k] and c[k] else 'n/a' for k in ['lcp','usefulPaint'])
   lines.append(f"|{route}|{w}|{'warm' if warm else 'cold'}|{vals(a)}|{vals(b)}|{vals(c)}|{delta}|")
(p/'table.md').write_text('\n'.join(lines));print('\n'.join(lines));print('CLS', {arm:max(x['cls'] for x in r if x['arm']==arm) for arm in ['main','before','persistent']})

from pathlib import Path
import json,statistics,math
p=Path(__file__).resolve().parents[1]/'docs/reviews/royal-persistent-20261121'
nav=json.loads((p/'navigation-metrics.json').read_text());lines=['| Destination | Width | Previous PR | Persistent | Delta |','|---|---:|---:|---:|---:|']
for route in ['books','heichal','world','post']:
 for width in [390,1440]:
  a,b=[round(statistics.median(x['useful'] for x in nav if x['route']==route and x['width']==width and x['arm']==arm),1) for arm in ['before','persistent']];lines.append(f'|{route}|{width}|{a}|{b}|{b-a:+.1f}|')
(p/'navigation-table.md').write_text('\n'.join(lines));print('\n'.join(lines))
logo=json.loads((p/'logo-experiment.json').read_text());lines=['| Width | Mode | Task ms | Layout ms | Style ms | rAF p95 gap ms |','|---:|---|---:|---:|---:|---:|']
for width in [390,1440]:
 for fixed in [False,True]:
  xs=[x for x in logo if x['width']==width and x['fixed']==fixed];cost=[round(statistics.median(x['costMs'][k] for x in xs),2) for k in ['TaskDuration','LayoutDuration','RecalcStyleDuration']];gaps=sorted(t for x in xs for t in x['gaps']);lines.append('|'+ '|'.join(map(str,[width,'fixed' if fixed else 'current',*cost,round(gaps[math.ceil(.95*len(gaps))-1],2)]))+'|')
(p/'logo-table.md').write_text('\n'.join(lines));print('\n'.join(lines))
initial=json.loads((p/'logo-initial-metrics.json').read_text());lines=['| Width | Visit | Current LCP / useful | Fixed LCP / useful |','|---:|---|---:|---:|']
for width in [390,1440]:
 for warm in [False,True]:
  vals=[' / '.join(str(round(statistics.median(x[k] for x in initial if x['width']==width and x['warm']==warm and x['fixed']==fixed),1)) for k in ['lcp','usefulPaint']) for fixed in [False,True]];lines.append('|'+ '|'.join(map(str,[width,'warm' if warm else 'cold',*vals]))+'|')
(p/'logo-initial-table.md').write_text('\n'.join(lines));print('\n'.join(lines))
