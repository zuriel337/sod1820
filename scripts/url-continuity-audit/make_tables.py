#!/usr/bin/env python3
# Measured tables for the report (Markdown + JSON), from the classified merged crawl.
import json, sys, collections, urllib.parse as up
D = 'data/'
cls = json.load(open(sys.argv[1])); out_md = sys.argv[2]; out_json = sys.argv[3]
uni = {}
for l in open(D + 'unified.jsonl'):
    r = json.loads(l); uni[r['key']] = r
meta = json.load(open(D + 'todo-pass2.meta.json')) if len(sys.argv) < 5 else json.load(open(sys.argv[4]))
by = {o['key']: o for o in cls}
S = collections.Counter(o['class'] for o in cls)
def n(pred): return sum(1 for o in cls if pred(o))
flag = lambda o, f: f in (o['flags'] or '').split(';')
res = {}
res['universe'] = len(uni)
res['sources'] = dict(collections.Counter(s for u in uni.values() for s in u['sources']))
res['measured_total'] = len(cls) - S['UNCHECKED']
res['unchecked_mitigated_or_error'] = S['UNCHECKED']
res['class'] = dict(S)
res['ok_total'] = S['OK'] + S['OK_REDIRECT']
res['ok_clean'] = n(lambda o: o['class'] in ('OK', 'OK_REDIRECT') and not any(flag(o, f) for f in ('canonical_slash', 'canonical_encoding_only', 'canonical_missing', 'canonical_host', 'sitemap_url_not_canonical', 'sitemap_noindex_conflict')))
res['canonical_slash'] = n(lambda o: flag(o, 'canonical_slash'))
res['canonical_other_page'] = n(lambda o: flag(o, 'canonical_other_page'))
res['canonical_encoding_only'] = n(lambda o: flag(o, 'canonical_encoding_only'))
res['canonical_missing'] = n(lambda o: flag(o, 'canonical_missing'))
res['canonical_query_dropped'] = n(lambda o: flag(o, 'canonical_query_dropped'))
res['chain_ge2'] = n(lambda o: flag(o, 'chain_ge2'))
res['p_shortlink'] = n(lambda o: flag(o, 'p_shortlink_server_metadata_is_home'))
sm = [o for o in cls if o['in_sitemap_now'] and o['class'] != 'UNCHECKED']
res['sitemap_checked'] = len(sm)
res['sitemap_ok_direct'] = sum(1 for o in sm if o['class'] == 'OK')
res['sitemap_redirect'] = sum(1 for o in sm if o['class'] == 'OK_REDIRECT')
res['sitemap_404'] = sum(1 for o in sm if o['final_status'] in (404, 410))
res['sitemap_noindex'] = sum(1 for o in sm if o['noindex'])
res['sitemap_canonical_not_self'] = sum(1 for o in sm if flag(o, 'sitemap_url_not_canonical'))
res['sitemap_canonical_slash'] = sum(1 for o in sm if flag(o, 'canonical_slash'))
res['undecidable_by_shape'] = {}
for o in cls:
    if o['class'] == 'UNDECIDABLE':
        d = res['undecidable_by_shape'].setdefault(o['shape'], {'n': 0, 'impr': 0, 'clicks': 0, 'examples': []})
        d['n'] += 1; d['impr'] += o['impr'] or 0; d['clicks'] += o['clicks'] or 0
        if len(d['examples']) < 4: d['examples'].append(up.unquote(o['key'])[:80])
res['intentional'] = collections.Counter(o['reason'] for o in cls if o['class'] == 'INTENTIONAL')
res['broken'] = [(up.unquote(o['key'])[:80], o['reason'], o['final_status'], o['impr'], o['clicks']) for o in cls if o['class'] == 'BROKEN']
res['temp_closed'] = sorted(up.unquote(o['key'])[:60] for o in cls if o['class'] == 'TEMP_CLOSED')
res['sampled'] = meta
hurts = sorted((o for o in cls if o['class'] in ('BROKEN', 'UNDECIDABLE', 'INTENTIONAL', 'TEMP_CLOSED')), key=lambda o: -(o['impr'] or 0))[:25]
res['top_non_ok_by_impressions'] = [(up.unquote(o['key'])[:70], o['class'], o['reason'][:40], o['final_status'], o['impr'], o['clicks']) for o in hurts]
json.dump(res, open(out_json, 'w'), ensure_ascii=False, indent=1, default=lambda x: dict(x))
with open(out_md, 'w', encoding='utf8') as fh:
    w = fh.write
    w('| מדד | כתובות |\n|---|---:|\n')
    w(f"| הרשימה המאוחדת (כתובת מנורמלת אחת לכל רשומה) | {res['universe']:,} |\n| נבדקו בפועל (מדידה תקינה) | {res['measured_total']:,} |\n| לא נבדקו (חסימת פלטפורמה/שגיאה) | {res['unchecked_mitigated_or_error']:,} |\n")
    for k in ('OK', 'OK_REDIRECT', 'TEMP_CLOSED', 'INTENTIONAL', 'UNDECIDABLE', 'BROKEN'):
        w(f"| {k} | {S[k]:,} |\n")
print(json.dumps({k: v for k, v in res.items() if k not in ('undecidable_by_shape', 'top_non_ok_by_impressions', 'sources')}, ensure_ascii=False, default=lambda x: dict(x))[:1800])
