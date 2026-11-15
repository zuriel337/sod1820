# usage: ingest_sql.py <saved tool-result file> <out jsonl>   (parses the Supabase MCP wrapper, writes one JSON object per line)
import json, sys
src, out = sys.argv[1], sys.argv[2]
outer = json.load(open(src, encoding='utf-8'))
s = outer['result'] if isinstance(outer, dict) else outer
a = s.index('>\n') + 2
b = s.rindex('\n</untrusted')
rows = json.loads(s[a:b])
with open(out, 'w', encoding='utf-8') as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + '\n')
print(len(rows), 'rows ->', out)
