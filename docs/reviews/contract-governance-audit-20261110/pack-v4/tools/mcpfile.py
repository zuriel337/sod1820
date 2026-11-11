"""Extract JSON rows from a saved MCP execute_sql result file (read-only helper)."""
import json, re, sys, hashlib
def rows(path):
    raw = open(path, encoding='utf-8').read()
    try:
        outer = json.loads(raw)
        text = outer['result'] if isinstance(outer, dict) and 'result' in outer else raw
    except Exception:
        text = raw
    m = re.search(r'<untrusted-data-[0-9a-f-]+>\s*(\[.*\])\s*</untrusted-data-[0-9a-f-]+>', text, re.S)
    if not m:
        raise SystemExit('no data block in ' + path)
    return json.loads(m.group(1))
def md5(s):
    return hashlib.md5(s.encode('utf-8')).hexdigest()
if __name__ == '__main__':
    for r in rows(sys.argv[1]):
        print({k: (v if not isinstance(v, str) or len(v) < 80 else f'<{len(v)} chars>') for k, v in r.items()})
