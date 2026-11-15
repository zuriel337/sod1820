#!/usr/bin/env python3
# Post-processing (offline): merge crawl passes -> classify -> tables -> evidence files for the audit PR. No network.
import subprocess, sys, json, gzip, shutil, csv, os, collections
E = sys.argv[1]  # evidence dir
D = 'data/'
os.makedirs(E, exist_ok=True)
def run(*a): subprocess.run(['python3', '-I', *a], check=True)
passes = [D + f for f in ('crawl-full.jsonl', 'crawl-pass2.jsonl', 'crawl-pass2b.jsonl', 'crawl-pass3.jsonl', 'crawl-pass4.jsonl', 'crawl-pass4b.jsonl', 'crawl-pass5.jsonl', 'crawl-pass6.jsonl') if os.path.exists(D + f)]
run('tools/merge_crawls.py', D + 'crawl-merged.jsonl', *passes)
run('tools/classify.py', D + 'crawl-merged.jsonl', D + 'class-final')
run('tools/family_table.py', D + 'class-final.json', D + 'family-final.csv')
run('tools/make_tables.py', D + 'class-final.json', D + 'tables-final.md', D + 'tables-final.json')
def gz(src, dst):
    with open(src, 'rb') as f, gzip.open(dst, 'wb', compresslevel=9) as g: shutil.copyfileobj(f, g)
gz(D + 'class-final.csv', E + 'urls-classified.csv.gz')
gz(D + 'crawl-merged.jsonl', E + 'crawl-raw.jsonl.gz')
gz(D + 'unified.jsonl', E + 'unified-urls.jsonl.gz')
shutil.copy(D + 'family-final.csv', E + 'family-verification.csv')
shutil.copy(D + 'tables-final.json', E + 'summary.json')
# browser results (all passes, one file)
with gzip.open(E + 'browser-results.jsonl.gz', 'wt', encoding='utf8') as g:
    for fn in ('browser-1.jsonl', 'browser-2.jsonl', 'browser-3.jsonl', 'browser-4.jsonl'):
        if os.path.exists(D + fn):
            for l in open(D + fn, encoding='utf8'):
                r = json.loads(l); r['pass'] = fn; g.write(json.dumps(r, ensure_ascii=False) + '\n')
# reciprocity + special + host raw rows
for fn in ('crawl-recip.jsonl', 'crawl-special.jsonl', 'crawl-host-http-apex.jsonl', 'crawl-host-https-www.jsonl', 'crawl-host-http-www.jsonl', 'crawl-host-vercel-app.jsonl'):
    if os.path.exists(D + fn): gz(D + fn, E + fn + '.gz')
# problems.csv: everything that is not a clean 200
cls = json.load(open(D + 'class-final.json'))
PROB = {'canonical_slash', 'canonical_other_page', 'canonical_encoding_only', 'canonical_missing', 'canonical_host', 'sitemap_url_not_canonical', 'sitemap_noindex_conflict', 'chain_ge2', 'p_shortlink_server_metadata_is_home'}
rows = [o for o in cls if o['class'] not in ('OK', 'OK_REDIRECT') or (set((o['flags'] or '').split(';')) & PROB)]
rows.sort(key=lambda o: (o['class'], -(o['impr'] or 0)))
with open(E + 'problems.csv', 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(cls[0].keys())); w.writeheader(); w.writerows(rows)
print('problems rows', len(rows), 'of', len(cls))
