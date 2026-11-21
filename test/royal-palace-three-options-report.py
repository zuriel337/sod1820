from pathlib import Path
import json,statistics,base64,html,gzip
root=Path(__file__).resolve().parents[1];out=root/'docs/reviews/royal-palace-three-options-20261121'
rows=json.loads((out/'repeated-metrics.json').read_text());assert len(rows)==108,len(rows)
summary=[]
for route in ['world','heichal','books']:
 for width in [390,1440]:
  for warm in [False,True]:
   for arm in ['compact','strip','crown']:
    r=[x for x in rows if (x['route'],x['width'],x['warm'],x['arm'])==(route,width,warm,arm)]
    d=dict(route=route,width=width,warm=warm,arm=arm,n=len(r))
    for k in ['lcp','usefulPaint','usefulDom','introHeight']:
     v=[x[k] for x in r if x[k] is not None];d[k]={'median':round(statistics.median(v),1),'min':round(min(v),1),'max':round(max(v),1)} if v else None
    d['maxCLS']=max(x['cls'] for x in r);summary.append(d)
(out/'summary.json').write_text(json.dumps(summary,indent=2))
lines=['| עמוד / רוחב | ביקור | Compact LCP / תוכן | רצועה LCP / תוכן | כתר ומסגרת LCP / תוכן |','|---|---|---:|---:|---:|']
for route in ['world','heichal','books']:
 for width in [390,1440]:
  for warm in [False,True]:
   s=[x for x in summary if (x['route'],x['width'],x['warm'])==(route,width,warm)]
   lines.append('| '+f'{route} / {width} | '+('חזרה' if warm else 'ראשון')+' | '+' | '.join(f"{x['lcp']['median']} / {x['usefulPaint']['median'] if x['usefulPaint'] else 'below fold'}" for x in s)+' |')
(out/'table.md').write_text('\n'.join(lines))
labels={'compact':'Compact הנוכחית','strip':'רצועת ארמון · 72px','crown':'כתר קיים ומסגרת · ללא תמונת ארמון'}
base='''<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Royal · שלוש חלופות</title><style>body{background:#10151d;color:#eee;font:16px system-ui;margin:24px}a{color:#e1be77}.row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}img{width:100%;display:block}figure{margin:0}h2{margin-top:40px}figcaption{padding:12px}table{border-collapse:collapse}td,th{padding:8px;border:1px solid #666}@media(max-width:700px){.row{grid-template-columns:1fr}}</style><h1>Royal Palace — השוואת שלוש חלופות</h1><p>צילומי דפדפן אמיתיים מהאפליקציה המקומית. זו גלריית צילומים, לא אתר חי ולא פריסה. הכתר המקורי נשאר בכותרת האתר; אין לוגו חתוך או משוחזר.</p><p>כל תמונה מוצגת לאחר ביקור חוזר. המדידות כוללות גם ביקור ראשון, שלוש ריצות לכל תנאי. ברירת המחדל ב־PR לא השתנתה.</p>'''
for inline in [False,True]:
 s=base
 for route in ['world','heichal','books']:
  for width in [390,1440]:
   s+=f'<h2>{route} · {width}px</h2><div class="row">'
   for arm in labels:
    name=f'{route}-{width}-{arm}.png';src='data:image/png;base64,'+base64.b64encode((out/name).read_bytes()).decode() if inline else name
    s+=f'<figure><figcaption>{labels[arm]}</figcaption><img loading="lazy" src="{src}" alt="{route} {width} {arm}"></figure>'
   s+='</div>'
 s+='</html>'
 (root.parent/'royal-palace-three-options-preview.html' if inline else out/'preview.html').write_text(s)
print('\n'.join(lines));print('max CLS',max(x['cls'] for x in rows),'overflow',sum(x['overflow'] for x in rows))
print('crown image requests',sum(len([r for r in x['resources'] if 'royal-palace' in r['url']]) for x in rows if x['arm']=='crown'))
