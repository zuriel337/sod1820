"""Summarize every retained native sample; never drop a failed/slow row."""
import json,sys,statistics as stat
from pathlib import Path
source=Path(sys.argv[1]);target=Path(sys.argv[2]);d=json.loads(source.read_text())
assert d['baselineSha']=='4e6239c6d26e00b70ee10b341529491bd5b0b43c'
assert d['candidateSha']==sys.argv[3], 'supply the exact reviewed candidate SHA'
assert len(d['results'])==24
names=[x['name'] for x in d['results'][0]['steps']]
labels={'home-entry':'כניסה לבית','home-post':'בית → פוסט','post-world':'פוסט → עולם','world-number-full-page':'עולם → מספר מלא (כולל הזנה בחלונית)','number-method-full-page':'מספר → מילוי מלא','back-method-number':'מילוי → חזרה למספר','number-phrase-full-page':'מספר → ביטוי מלא','back-phrase-number':'ביטוי → חזרה למספר','back-number-world':'מספר → חזרה לעולם','back-world-post':'עולם → חזרה לפוסט','back-post-home':'פוסט → חזרה לבית'}
out={'baselineSha':d['baselineSha'],'candidateSha':d['candidateSha'],'rawOk':d['ok'],'functionalOk':d.get('functionalOk'),'candidateClsPass':d.get('candidateClsPass'),'samplesPerCell':3,'stageCount':sum(len(r['steps']) for r in d['results']),'rows':[],'documents':[]}
lines=['# מדידות סופיות — כל הדגימות נשמרו','',f"בסיס `{d['baselineSha']}` מול מועמד `{d['candidateSha']}`.",'','שלושה זוגות השוואה לכל פרופיל, בסדר מתחלף: לפני/אחרי, אחרי/לפני, לפני/אחרי.','24 מחזורים ו־264 שלבים. כניסה ראשונה היא ביקור ראשון לאורך המסלול באותו הקשר;','חזרה היא סיבוב נוסף באותו SPA. אין כאן כניסה קרה ועצמאית לכל כתובת.','בכל הקשר חדש פרופיל דפדפן נקי; בכניסה החוזרת נשמרים ה־SW והמטמונים המקוריים.','במובייל390×900: מעבד פי4, רשת1.6Mbps/150ms והעלאה0.8Mbps.','במחשב1440×900: ללא האטה. Chromium/headless על אותו מחשב עבודה ודרך אותו proxy.','אין הרצת build או דפדפן מתחרה בזמן ההשוואה.','', 'הזמן נמדד מתחילת פעולת הניווט/הלחיצה עד להופעת התוכן הקנוני הנדרש,','לא עד network-idle. הבית דורש כותרת ופעולת קריאה זמינות; פוסט דורש מקור קריא;','העולם דורש כרטיס ציבורי; מספר דורש ביטוי/ערך/כפתור שיטה פעיל.','600ms תצפית נוספת אחרי כל שלב אינם כלולים בזמן, אך נכללים בתצפית CLS.','מדידת עולם→מספר כוללת פתיחת החלונית, הזנה ופתיחת הדף המלא.','תנאי ההגנה וה־Service Worker זהים; לא יוחלפו תגובות רשת.','בקשת כניסה להגנת Vercel מתבצעת לפני המדידה; אין טענה לשרת קר, RUM או LCP.','', 'הטבלאות מציגות חציון [מינימום–מקסימום] במילישניות, n=3.','Δ חיובי הוא נסיגה. מדגם קטן אינו מוכיח מובהקות; גם תנודות קטנות נשארות בטבלה.','']
for width in (390,1440):
 for repeat in ('first','repeat'):
  lines.extend([f"## {'מובייל' if width==390 else 'מחשב'} — {'ביקור ראשון' if repeat=='first' else 'סיבוב חוזר'}",'', '| שלב | לפני ms | אחרי ms | Δ ms | Δ % | CLS מרבי לפני / אחרי |','|---|---:|---:|---:|---:|---:|'])
  for name in names:
   sides=[]
   for version in ('before','after'):
    steps=[s for r in d['results'] if r['version']==version and r['width']==width and r['repeat']==repeat for s in r['steps'] if s['name']==name]
    assert len(steps)==3
    values=[s['ms'] for s in steps];sides.append({'median':stat.median(values),'min':min(values),'max':max(values),'maxCls':max(s['cls'] for s in steps),'values':values})
   b,a=sides;delta=a['median']-b['median'];pct=delta/b['median']*100
   row={'width':width,'repeat':repeat,'stage':name,'before':b,'after':a,'deltaMs':delta,'deltaPct':pct};out['rows'].append(row)
   fmt=lambda x:f"{x['median']:.0f} [{x['min']:.0f}–{x['max']:.0f}]"
   lines.append(f"| {labels[name]} | {fmt(b)} | {fmt(a)} | {delta:+.0f} | {pct:+.1f}% | {b['maxCls']:.5f} / {a['maxCls']:.5f} |")
  lines.append('')
lines.extend(['## CLS של המסמך כולו','', 'הערכים הבאים הם חלונות CLS התקניים המרביים במסמך לאורך שני הסיבובים,','כולל הכנת העולם שאינה מתוזמנת כשלב. סף0.1 לא שונה.','כל ערך מסמך נרשם פעם אחת בלבד, אף שהוא משותף לשני הסיבובים.','', '| פרופיל | זוג | לפני | אחרי |','|---|---:|---:|---:|'])
for width in (390,1440):
 for pair in (1,2,3):
  values={v:next(r['documentCls'] for r in d['results'] if r['width']==width and r['pair']==pair and r['version']==v) for v in ('before','after')}
  out['documents'].append({'width':width,'pair':pair,**values});lines.append(f"| {width} | {pair} | {values['before']:.6f} | {values['after']:.6f} |")
lines.extend(['',f"תוצאת המסלול: `{d.get('functionalOk')}`. סף CLS למועמד: `{d.get('candidateClsPass')}`. תוצאה משולבת: `{d['ok']}`.",'', 'תוצאות הביניים כוללות נסיגת פוסט וכשל CLS מתועדים ונשמרו בנפרד;','אף דגימה לא הוחלפה במדידה מהירה יותר. מקורות ותנאי החסם העצמאי מופיעים ב־README.',''])
target.mkdir(parents=True,exist_ok=True);(target/'PERFORMANCE.md').write_text('\n'.join(lines));(target/'performance-summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'rawOk':out['rawOk'],'stages':out['stageCount'],'documents':out['documents']}))
