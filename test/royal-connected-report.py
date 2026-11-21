from pathlib import Path
import json,statistics,collections,base64
root=Path(__file__).resolve().parents[1];out=root/'docs/reviews/royal-connected-20261121'
rows=json.loads((out/'repeated-metrics.json').read_text());assert len(rows)==96
summary=[]
for route in ['world','heichal','books','code']:
 for width in [390,1440]:
  for warm in [False,True]:
   for arm in ['main','connected']:
    data=[x for x in rows if (x['route'],x['width'],x['warm'],x['arm'])==(route,width,warm,arm)];d=dict(route=route,width=width,warm=warm,arm=arm,n=len(data))
    for key in ['lcp','usefulPaint','usefulDom','introHeight']:
     v=[x[key] for x in data if x[key] is not None];d[key]={'median':round(statistics.median(v),1),'min':round(min(v),1),'max':round(max(v),1)} if v else None
    candidates=[]
    for x in data:
     events=[e for e in x['events'] if e['kind']=='lcp'];candidates.append(events[-1] if events else None)
    d['lcpCandidates']=candidates;d['maxCLS']=max(x['cls'] for x in data);summary.append(d)
(out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
lines=['| מסך / רוחב | ביקור | main: LCP / תוכן | Royal: LCP / תוכן | שינוי LCP / תוכן |','|---|---|---:|---:|---:|']
for route in ['world','heichal','books','code']:
 for width in [390,1440]:
  for warm in [False,True]:
   a,b=[x for x in summary if (x['route'],x['width'],x['warm'])==(route,width,warm)]
   vals=lambda d:f"{d['lcp']['median']} / {d['usefulPaint']['median'] if d['usefulPaint'] else 'below fold'}"
   delta=' / '.join(f"{b[k]['median']-a[k]['median']:+.1f}" for k in ['lcp','usefulPaint'])
   lines.append(f"| {route} / {width} | {'חזרה' if warm else 'ראשון'} | {vals(a)} | {vals(b)} | {delta} |")
(out/'table.md').write_text('\n'.join(lines))
base='''<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Royal מחובר לכתר — מול main</title><style>body{background:#10141d;color:#eee;font:16px system-ui;margin:24px}.row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}img{width:100%;display:block}figure{margin:0}h2{margin-top:40px}figcaption{padding:12px}@media(max-width:700px){.row{grid-template-columns:1fr}}</style><h1>Royal משותף מחובר לכתר</h1><p>צילומי דפדפן אמיתיים של שתי בניות מקומיות טריות. גלריית צילומים — לא אתר חי ולא פריסה. העולם, ההיכל והספרים במחשב ובנייד. ההיכל נפתח בבדיקות באמצעות דגל מקומי בתשובת הדפדפן בלבד.</p>'''
for inline in [False,True]:
 s=base
 for route in ['world','heichal','books','code']:
  for width in [390,1440]:
   s+=f'<h2>{route} · {width}px</h2><div class="row">'
   for arm,label in [('main','main'),('connected','Royal החדש')]:
    name=f'{route}-{width}-{arm}.png';src='data:image/png;base64,'+base64.b64encode((out/name).read_bytes()).decode() if inline else name
    s+=f'<figure><figcaption>{label}</figcaption><img loading="lazy" src="{src}" alt="{route} {width} {arm}"></figure>'
   s+='</div>'
 s+='</html>'
 (root.parent/'royal-connected-preview.html' if inline else out/'preview.html').write_text(s)
print('\n'.join(lines));print('maxCLS',max(x['cls'] for x in rows),'overflow',sum(x['overflow'] for x in rows))
for x in summary:
 if x['warm']: print(x['route'],x['width'],x['arm'],[(e.get('tag'),e.get('classes'),e.get('url','').split('/')[-1],e.get('text')) for e in x['lcpCandidates']])
