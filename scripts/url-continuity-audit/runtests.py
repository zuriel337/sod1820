import subprocess, sys, json, os, re, time
from concurrent.futures import ThreadPoolExecutor
root, listfile, out = sys.argv[1], sys.argv[2], sys.argv[3]
workers = int(sys.argv[4]) if len(sys.argv) > 4 else 3
files = [l.strip() for l in open(listfile) if l.strip()]
skip = re.compile(r'(\.browser\.|scenarios\.cjs$)')
files = [f for f in files if not skip.search(f) and os.path.isfile(os.path.join(root, f))]
def run(f):
    is_node_test = re.search(r'\.test\.(m?js|cjs|jsx)$', f) is not None
    cmd = ['node', '--test', f] if is_node_test else ['node', f]
    t0 = time.time()
    try:
        p = subprocess.run(cmd, cwd=root, capture_output=True, text=True, timeout=240)
        o = (p.stdout or '') + (p.stderr or '')
        rc = p.returncode
    except subprocess.TimeoutExpired as e:
        o, rc = 'TIMEOUT', 124
    pas = re.search(r'^# pass (\d+)', o, re.M); fai = re.search(r'^# fail (\d+)', o, re.M)
    names = re.findall(r'^not ok \d+ - (.+)$', o, re.M)[:6]
    return {'file': f, 'rc': rc, 'pass': int(pas.group(1)) if pas else None, 'fail': int(fai.group(1)) if fai else None,
            'failed_names': names, 'secs': round(time.time()-t0, 1), 'tail': o[-300:] if rc else ''}
with ThreadPoolExecutor(workers) as ex, open(out, 'w') as fh:
    for r in ex.map(run, files):
        fh.write(json.dumps(r, ensure_ascii=False) + '\n'); fh.flush()
print('done', len(files))
