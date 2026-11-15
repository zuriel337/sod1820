#!/usr/bin/env python3
"""Fill {{...}} placeholders of the README template. usage: render_readme.py template.md parts_dir tables_dir out.md
{{PART:name}} inserts parts/name.md; {{T:table:metric}} inserts the `### metric` block of tables/table.md; {{TABLE:table}} inserts the whole table file."""
import re, sys, os
tpl, parts, tables, out = sys.argv[1:5]
s = open(tpl, encoding='utf8').read()
def block(table, metric):
    path = os.path.join(tables, table + '.md')
    if not os.path.exists(path): return f'*(table `{table}` was not produced)*'
    text = open(path, encoding='utf8').read()
    if not metric: return text.strip()
    m = re.search(r'^### ' + re.escape(metric) + r'\b.*?(?=^### |\Z)', text, re.S | re.M)
    return m.group(0).strip() if m else f'*(metric `{metric}` is not in `{table}`)*'
s = re.sub(r'\{\{PART:([a-z0-9_]+)\}\}', lambda m: open(os.path.join(parts, m.group(1) + '.md'), encoding='utf8').read().strip(), s)
LABEL = {'content': 'Content visible (ms)', 'fcp': 'First contentful paint (ms)', 'lcp': 'Largest contentful paint (ms)', 'tbt': 'Blocking time in the 3.5 s after the text (ms)', 'kb_before_content': 'KB transferred before the text'}
s = re.sub(r'\{\{T:([a-z0-9_]+):([a-z_]+)\}\}', lambda m: block(m.group(1), m.group(2)), s)
s = re.sub(r'\{\{TABLE:([a-z0-9_]+)\}\}', lambda m: block(m.group(1), None), s)
# the generated tables carry one `### metric` heading each; in the document they are labels, not sections
s = re.sub(r'^### ([a-z_]+)[ \t]+\(median ms \[min-max\] n;[ \t]+delta vs base\)[ \t]*$', lambda m: f"**{LABEL.get(m.group(1), m.group(1))}** - median [min-max], n, change against the base, p:\n", s, flags=re.M)
open(out, 'w', encoding='utf8').write(s)
left = re.findall(r'\{\{[^}]+\}\}', s)
print('unresolved placeholders:', left if left else 'none')
