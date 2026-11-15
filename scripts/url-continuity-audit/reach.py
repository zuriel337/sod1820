import os, re, sys, json
root = sys.argv[1]
target = os.path.normpath(os.path.join(root, 'src/lib/publicPostUrls.js'))
imp = re.compile(r'''(?:import\s[^'"]*?from\s*|import\s*\(\s*|import\s+|require\(\s*|export\s[^'"]*?from\s*)['"]([^'"]+)['"]''')
def resolve(base, spec):
    if not spec.startswith('.'): return None
    p = os.path.normpath(os.path.join(os.path.dirname(base), spec))
    for cand in (p, p+'.js', p+'.mjs', p+'.cjs', p+'.jsx', os.path.join(p,'index.js')):
        if os.path.isfile(cand): return cand
    return None
cache = {}
def deps(f):
    if f in cache: return cache[f]
    cache[f] = set()
    try: src = open(f, encoding='utf8', errors='ignore').read()
    except Exception: return cache[f]
    out = set()
    for m in imp.finditer(src):
        r = resolve(f, m.group(1))
        if r: out.add(r)
    cache[f] = out
    return out
memo = {}
def reaches(f, stack=()):
    if f in memo: return memo[f]
    if f == target: return True
    if f in stack: return False
    memo[f] = False
    res = any(reaches(d, stack+(f,)) for d in deps(f))
    memo[f] = res
    return res
tests = []
for d, sub in (('test', None), ('scripts', None), ('src', None), ('api', None)):
    for dp, dn, fn in os.walk(os.path.join(root, d)):
        if 'node_modules' in dp: continue
        for n in fn:
            if re.search(r'(\.test\.(m?js|cjs|jsx)|^test-.*\.(m?js|cjs)|\.test\.mjs)$', n) or (d=='test' and re.search(r'\.(mjs|cjs|js)$', n)):
                tests.append(os.path.join(dp, n))
hits = sorted(t for t in set(tests) if reaches(t))
print(len(set(tests)), 'candidate tests;', len(hits), 'reach publicPostUrls.js')
open('data/reach-tests.txt','w').write('\n'.join(os.path.relpath(h, root) for h in hits)+'\n')
