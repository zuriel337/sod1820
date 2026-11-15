#!/usr/bin/env python3
"""Create a lab config from the x0-base template.
usage: mkcfg.py <label> <fixture-root> [--device mobile|desktop] [--net slow4g|fast4g] [--scenarios cold,warm,nav] [--runs N] [--posts O1,O3,N3,N5] [--no-route] [--tp scripts-only|blocked]"""
import json, sys, argparse
ap = argparse.ArgumentParser()
ap.add_argument('label'); ap.add_argument('root')
ap.add_argument('--device', default='mobile'); ap.add_argument('--net', default='slow4g')
ap.add_argument('--scenarios', default='cold'); ap.add_argument('--runs', type=int, default=5)
ap.add_argument('--posts', default='O1,O3,N3,N5'); ap.add_argument('--no-route', action='store_true'); ap.add_argument('--tp', default='scripts-only')
a = ap.parse_args()
base = json.load(open('data/cfg-x0-base.json'))
sample = {p['key']: p for p in (lambda d: d if isinstance(d, list) else d.get('posts', d))(json.load(open('data/sample-posts.json')))}
base['label'] = a.label; base['device'] = a.device; base['net'] = a.net; base['scenarios'] = a.scenarios.split(','); base['runs'] = a.runs
base['thirdParty'] = a.tp
if a.no_route: base['noRoute'] = True
base['fixture']['root'] = a.root
base['posts'] = [dict(base_p) for key in a.posts.split(',') for base_p in [next(p for p in base['posts'] if p['key'] == key)]] if all(any(p['key'] == k for p in base['posts']) for k in a.posts.split(',')) else [sample[k] for k in a.posts.split(',')]
json.dump(base, open(f'data/cfg-{a.label}.json', 'w'), indent=1)
print('wrote', f'data/cfg-{a.label}.json', [p['key'] for p in base['posts']], a.device, a.net, base['scenarios'], a.runs)
