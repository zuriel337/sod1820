#!/usr/bin/env python3
# Canonical <-> final-URL reciprocity pass: fetch the canonical TARGETS that differ from the page's final URL.
# All distinct "other_page" targets, plus a seeded random sample of the "slash" targets (one deterministic rule, verified on a sample).
import json, sys, random, urllib.parse as up
D = 'data/'
random.seed(1820)
cls = json.load(open(sys.argv[1])); n_slash = int(sys.argv[2]) if len(sys.argv) > 2 else 300
SITE = 'https://sod1820.co.il'
def path_of(c):
    p = up.urlsplit(c); return (p.path or '/') + (('?' + p.query) if p.query else '')
other, slash = {}, {}
for o in cls:
    if o['class'] not in ('OK', 'OK_REDIRECT') or not o.get('canonical') or not o['canonical'].startswith(SITE): continue
    if 'canonical_other_page' in o['flags']: other.setdefault(path_of(o['canonical']), (o['key'], o['final_url']))
    elif 'canonical_slash' in o['flags']: slash.setdefault(path_of(o['canonical']), (o['key'], o['final_url']))
slash_keys = sorted(slash); random.shuffle(slash_keys)
todo = [(p, 'other_page') for p in sorted(other)] + [(p, 'slash') for p in slash_keys[:n_slash]]
with open(D + 'todo-recip.jsonl', 'w', encoding='utf8') as fh:
    for p, kind in todo:
        src = (other if kind == 'other_page' else slash)[p]
        fh.write(json.dumps({'key': 'RECIP:' + p, 'fetch': p, 'kind': kind, 'src_key': src[0], 'src_final': src[1]}, ensure_ascii=False) + '\n')
json.dump({'other_page_targets': len(other), 'slash_targets_total': len(slash), 'slash_targets_sampled': min(n_slash, len(slash))}, open(D + 'todo-recip.meta.json', 'w'))
print('other_page targets', len(other), '| slash targets', len(slash), 'sampled', min(n_slash, len(slash)), '| todo', len(todo))
