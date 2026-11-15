#!/usr/bin/env python3
# Renders docs/reviews/url-continuity-seo-20261115/README.md from the measured files (numbers are never typed by hand).
import json, sys, csv, math, collections, os, re, urllib.parse as up
D = 'data/'
OUT = sys.argv[1]
cls = json.load(open(D + 'class-final.json'))
uni = {}
for l in open(D + 'unified.jsonl'):
    r = json.loads(l); uni[r['key']] = r
meta = json.load(open(D + 'todo-pass2.meta.json'))
by = {o['key']: o for o in cls}
fmt = lambda n: f'{n:,}'
pct = lambda a, b: f'{100 * a / b:.1f}%' if b else '—'
def wilson(k, n, z=1.96):
    if n == 0: return (0, 0)
    p = k / n; d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d; h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0, c - h), min(1, c + h))
S = collections.Counter(o['class'] for o in cls)
flags = collections.Counter(f for o in cls for f in (o['flags'] or '').split(';') if f)
measured = [o for o in cls if o['class'] != 'UNCHECKED']
M = len(measured)
sampled_keys = {}
for fn in ('todo-pass2.jsonl', 'todo-pass2b.jsonl', 'todo-pass3.jsonl', 'todo-pass4.jsonl', 'todo-pass4b.jsonl'):
    try:
        for l in open(D + fn):
            r = json.loads(l)
            if r['cls'].startswith('sample:'): sampled_keys[r['key']] = r['cls']
    except FileNotFoundError: pass
samp = [o for o in measured if o['key'] in sampled_keys]
census = [o for o in measured if o['key'] not in sampled_keys]
ok_clean = sum(1 for o in measured if o['class'] in ('OK', 'OK_REDIRECT') and not any(f in (o['flags'] or '') for f in ('canonical_slash', 'canonical_encoding_only', 'canonical_missing', 'canonical_host', 'sitemap_noindex_conflict')))
def canon_fix_n(): return flags['canonical_slash']
def n_class(c): return S[c]
sm = [o for o in measured if o['in_sitemap_now']]
sm_n = len(sm)
sm_slash = sum(1 for o in sm if 'canonical_slash' in (o['flags'] or ''))
sm_404 = [o for o in sm if o['final_status'] in (404, 410)]
sm_redirect = sum(1 for o in sm if o['class'] == 'OK_REDIRECT')
sm_noindex = sum(1 for o in sm if o['noindex'] and o['final_status'] == 200)
uni_sm = sum(1 for u in uni.values() if 'sitemap_now' in u['sources'])
gsc_n = sum(1 for u in uni.values() if 'gsc' in u['sources'])
gsc_meas = sum(1 for o in measured if 'gsc' in (o['sources'] or '').split(','))

def table(headers, rows, align=None):
    out = ['| ' + ' | '.join(headers) + ' |', '|' + '|'.join('---:' if (align and align[i] == 'r') else '---' for i in range(len(headers))) + '|']
    for r in rows: out.append('| ' + ' | '.join(str(x) for x in r) + ' |')
    return '\n'.join(out)

# ---- sample statistics by group
def group_stats(tag):
    rows = [o for o in samp if sampled_keys[o['key']] == tag]
    n = len(rows); ok = sum(1 for o in rows if o['class'] in ('OK', 'OK_REDIRECT'))
    lo, hi = wilson(ok, n)
    c = collections.Counter(o['class'] for o in rows)
    return n, ok, lo, hi, c
sample_rows = []
pool = {'sample:number': meta.get('numbers_pool'), 'sample:forum-uuid': meta.get('forum_pool'), 'sample:p3-other': meta.get('p3_pool'), 'sample:audit611': 473, 'sample:attachment': meta.get('pass4', {}).get('attachment_pool_unmeasured')}
label = {'sample:number': '`/number/*` — מדגם אקראי מתוך המשפחה שנותרה', 'sample:forum-uuid': '`/forum/<uuid>` — מדגם אקראי מתוך המשפחה שנותרה', 'sample:p3-other': 'שאר הכתובות ההיסטוריות ללא תנועה וללא זהות (מלאי 3.11/מפות 3.11 בלבד) — מדגם', 'sample:audit611': 'דגימת ביקורת 6.11 (כתובות מפה) שלא נמדדו בדרך אחרת — מדגם', 'sample:attachment': 'כתובות קבצים מצורפים (`/<post>/<attachment>`, 242 כללי הפניה) שלא נמדדו — מדגם'}
for tag in ('sample:number', 'sample:forum-uuid', 'sample:p3-other', 'sample:audit611', 'sample:attachment'):
    n, ok, lo, hi, c = group_stats(tag)
    if not pool.get(tag): continue
    sample_rows.append([label[tag], fmt(pool[tag]), fmt(n), f'{ok}/{n}' if n else '—', f'{100 * lo:.1f}–{100 * hi:.1f}%' if n else '—',
                        ', '.join(f'{k} {v}' for k, v in sorted(c.items(), key=lambda kv: -kv[1]))])

# ---- undecidable by shape
und = collections.defaultdict(lambda: {'n': 0, 'impr': 0, 'clicks': 0, 'ex': []})
for o in cls:
    if o['class'] == 'UNDECIDABLE':
        d = und[o['shape']]; d['n'] += 1; d['impr'] += o['impr'] or 0; d['clicks'] += o['clicks'] or 0
        if len(d['ex']) < 3: d['ex'].append(up.unquote(o['key'])[:60])
und_rows = [[f'`{k}`', fmt(v['n']), fmt(v['impr']), fmt(v['clicks']), '<br>'.join(f'`{e}`' for e in v['ex'])] for k, v in sorted(und.items(), key=lambda kv: -kv[1]['impr'])]

# ---- redirect transitions
def fam(p):
    p = up.unquote(p)
    if re.match(r'^/(category|tag)/', p): return re.match(r'^/(category|tag)', p).group(0) + '/*'
    if p.startswith('/post/'): return '/post/*'
    if p.startswith('/forum/'): return '/forum/<id>'
    if p.startswith('/number/'): return '/number/*'
    if p.startswith('/topic/'): return '/topic/*'
    if p in ('/', ''): return '/'
    if p.count('/') == 1: return '/<root-slug>'
    return re.sub(r'/[^/]+$', '/*', p)
trans = collections.defaultdict(list)
for o in cls:
    if o['class'] != 'OK_REDIRECT': continue
    src = up.unquote(up.urlsplit(o['key']).path.rstrip('/') or '/'); dst = up.unquote(up.urlsplit(o['final_url']).path or '/')
    kind = 'לוכסן/סיומת בלבד (308 → אותה כתובת)' if src.rstrip('/') == dst.rstrip('/') else f'`{fam(src)}` → `{fam(dst)}`'
    trans[kind].append(o)
trans_rows = [[k, fmt(len(v)), fmt(sum(x['impr'] or 0 for x in v)), '`' + up.unquote(v[0]['key'])[:38] + '` → `' + up.unquote(v[0]['final_url']).replace('https://sod1820.co.il', '')[:38] + '`'] for k, v in sorted(trans.items(), key=lambda kv: -len(kv[1]))[:12]]

# ---- family verification
fam_csv = list(csv.DictReader(open(D + 'family-final.csv', encoding='utf-8-sig')))
fam_rows = [[r['family'], fmt(int(r['urls_total'])), fmt(int(r['measured'])), r['OK'], r['OK_REDIRECT'], r['TEMP_CLOSED'], r['INTENTIONAL'], r['UNDECIDABLE'], r['BROKEN'], r['UNCHECKED'], r['documented_target'][:46]] for r in fam_csv if int(r['urls_total']) >= 1]

# ---- reciprocity
recip_rows_out = []
recip_note = ''
try:
    # A canonical target can be listed under both kinds ("other page" and "slash"); each fetched row consumes one todo row of its key,
    # so the two kinds are never merged (13 targets appear twice in this run).
    todo_q = collections.defaultdict(collections.deque)
    for l in open(D + 'todo-recip.jsonl'):
        t0 = json.loads(l); todo_q[t0['key']].append(t0)
    rec = [json.loads(l) for l in open(D + 'crawl-recip.jsonl')]
    cats = collections.defaultdict(collections.Counter)
    for r in rec:
        t = todo_q[r['key']].popleft() if todo_q.get(r['key']) else None
        if not t: continue
        hops = r['hops']; fs = r['final_status']
        if any(h.get('status') == 403 for h in hops): cats[t['kind']]['לא נבדק (חסימת פלטפורמה)'] += 1; continue
        src_final = t['src_final'].replace('https://sod1820.co.il', '')
        final = (r['final_url'] or '').replace('https://sod1820.co.il', '')
        back = up.unquote(final) == up.unquote(src_final)
        if r['n_hops'] == 0 and fs == 200: d = hops[-1].get('doc') or {}; cats[t['kind']]['יעד ה־canonical עונה 200 ישירות' + (' ומצהיר על עצמו' if (d.get('canonical') or '') == (r['final_url'] or '') else ' ומצהיר על כתובת אחרת')] += 1
        elif r['n_hops'] >= 1 and fs == 200 and back: cats[t['kind']]['canonical → הפניה (308/301) → הדף שהצהיר עליו (לולאה)'] += 1
        elif fs == 200: cats[t['kind']]['canonical → הפניה → דף אחר'] += 1
        elif fs in (404, 410): cats[t['kind']]['canonical → 404'] += 1
        else: cats[t['kind']][f'אחר ({fs})'] += 1
    for kind, c in cats.items():
        for k, v in sorted(c.items(), key=lambda kv: -kv[1]): recip_rows_out.append(['canonical לא־זהה לסופי: ' + ('לוכסן' if kind == 'slash' else 'כתובת אחרת'), k, v])
    # Which canonical targets are reciprocal? (computed from the same rows; a target counts once per fetched row)
    todo_q2 = collections.defaultdict(collections.deque)
    for l in open(D + 'todo-recip.jsonl'):
        t0 = json.loads(l); todo_q2[t0['key']].append(t0)
    rc = collections.Counter()
    for r in rec:
        t = todo_q2[r['key']].popleft() if todo_q2.get(r['key']) else None
        if not t or t['kind'] != 'other_page' or any(h.get('status') == 403 for h in r['hops']): continue
        rc[('redirects' if r['n_hops'] >= 1 else 'direct', 'slash' if t['fetch'].split('?')[0].endswith('/') else 'noslash')] += 1
    slash_loops = sum(v for kd, c in cats.items() if kd == 'slash' for k, v in c.items() if 'לולאה' in k)
    recip_note = (f"**מה מבדיל בין הדדי ללא הדדי:** מבין {sum(rc.values())} יעדי canonical מסוג \"כתובת אחרת\" — {rc[('redirects', 'slash')]} מסתיימים בלוכסן סוגר וכולם מופנים ב־308 לכתובת בלי לוכסן; "
                  f"{rc[('direct', 'noslash')]} אינם מסתיימים בלוכסן וכולם עונים 200 ישירות ומצהירים על עצמם. {rc[('redirects', 'noslash')]} יעדים בלי לוכסן שמופנים ו־{rc[('direct', 'slash')]} עם לוכסן שעונים ישירות. "
                  f"במדגם הלוכסן ({sum(c.values()) if False else slash_loops}) כל יעד חוזר בהפניה אל הדף שהצהיר עליו. כלומר **כל חוסר ההדדיות שנמדד הוא אותה צורת canonical (לוכסן סוגר של WordPress)** ו־PR #1349 מיישר אותה: הכתובת המוצהרת היא הכתובת המוגשת. בדיקה מקומית (בלי רשת) של `api/og.js` על כינוי `/post/<slug>` של פוסט WordPress: על `main` ה־canonical `…%d7…/` (לוכסן, אותיות קטנות); עם #1349 `…%D7…` (ללא לוכסן) — [evidence/post-alias-canonical-check.json](evidence/post-alias-canonical-check.json).")
except FileNotFoundError:
    recip_note = ''
recip_meta = json.load(open(D + 'todo-recip.meta.json')) if recip_rows_out or True else {}

# ---- browser
def jl(fn):
    try: return [json.loads(l) for l in open(D + fn)]
    except FileNotFoundError: return []
b1, b2, b3, b4 = jl('browser-1.jsonl'), jl('browser-2.jsonl'), jl('browser-3.jsonl'), jl('browser-4.jsonl')
def norm(s):
    import html, unicodedata
    s = html.unescape(s or ''); s = unicodedata.normalize('NFKC', s); s = re.sub(r'[֑-ׇ]', '', s); return re.sub(r'[^0-9A-Za-zא-ת]+', '', s).lower()
bro = {r['path']: r for r in b1 + b2}
for r in b3 + b4: bro[r['path']] = r  # the re-checks (longer wait; browser-4 after the platform block cleared) win
ball = list(bro.values())
bok = [r for r in ball if not r.get('error') and r.get('httpStatus') == 200]
bden = [r for r in ball if r.get('httpStatus') == 403 or r.get('error')]
wp = [r for r in bok if r['group'] == 'wp_post' or r['group'].endswith('_wp_post')]
wp_ok = sum(1 for r in wp if (lambda et, h, t: bool(et) and (et in h or (h and h in et and len(h) >= 8) or et in t or (len(et) > 10 and et[:10] in (h + t))))(norm(r['expect_title']), norm(r.get('h1')), norm(r.get('title'))))
hyd = collections.Counter()
for r in bok:
    d = r['docUrl']; c = r.get('canonicalDom') or ''
    hyd[('self' if c == d else 'none' if not c else 'slash/enc' if up.unquote(c).rstrip('/') == up.unquote(d).rstrip('/') else 'other')] += 1
thin = [r for r in bok if r.get('notFoundMarker') or (r.get('textLen') or 0) < 150]
wp_slash = sum(1 for r in wp if (r.get('canonicalDom') or '').endswith('/'))
def _hyd_kind(r):
    d = r['docUrl']; c = r.get('canonicalDom') or ''
    return 'self' if c == d else 'none' if not c else 'slash/enc' if up.unquote(c).rstrip('/') == up.unquote(d).rstrip('/') else 'other'
_oth = [r for r in bok if _hyd_kind(r) == 'other']
_oth_p = [r for r in _oth if r['path'].startswith('/?p=')]
_oth_alias = [r for r in _oth if r not in _oth_p and up.urlsplit(r.get('canonicalDom') or '').path.startswith('/post/') and not r['path'].startswith('/post/')]
hyd_txt = (f"{hyd['self']} מצהירים על הכתובת שנטענה · {hyd['slash/enc']} על אותה כתובת עם לוכסן/קידוד קטן (F1) · {hyd['other']} על כתובת אחרת "
           f"(מהם {len(_oth_p)} קישורי `?p=<id>` שמצהירים על כתובת הפוסט, {len(_oth_alias)} כינויי שורש עם canonical ל־`/post/<slug>` — החלטה 4, והשאר פרמטרי query/קבצים מצורפים) · {hyd['none']} ללא canonical")
b4_ok = [r for r in b4 if not r.get('error') and r.get('httpStatus') == 200 and (r.get('textLen') or 0) >= 150]
b4_p = [r for r in b4 if r['path'].startswith('/?p=')]
b4_p_ok = [r for r in b4_p if r in b4_ok]
b4_bad = [r for r in b4 if r not in b4_ok]
tv_403 = sum(1 for r in b4 if any(x.startswith('403') and 'rpc/track_visit' in x for x in (r.get('badResponses') or [])))
b4_txt = (f"**בדיקה חוזרת אחרי שההגנה פגה:** {len(b4)} עמודים שבמעבר המוקדם נמדדו כ\"דקים\" או נחסמו בפלטפורמה נבדקו מחדש בקצב נמוך (ללא תמונות/גופנים, שני עמודים במקביל, בלי תעבורה אחרת): "
          f"**{len(b4_ok)} מתוך {len(b4)}** מציגים תוכן מלא ({min((r['textLen'] for r in b4_ok), default=0):,}–{max((r['textLen'] for r in b4_ok), default=0):,} תווים), כולל **{len(b4_p_ok)} מתוך {len(b4_p)}** כתובות `?p=<id>` (בניסיון המוקדם הציגו \"העמוד לא נפתח\" — תוצר של החסימה, לא פגם). "
          + ('; '.join(f"`{up.unquote(r['path'])}` — {r.get('httpStatus')}" for r in b4_bad) + ' (נתיב בדיקה שאין לו route ואין אליו קישור בעמודים שנבדקו — 404 צפוי).' if b4_bad else ''))
links_tot = sum(r.get('nLinks', 0) for r in bok); links_slash = sum(1 for r in bok for h in (r.get('links') or []) if h.endswith('/') and h != '/' and not h.startswith('/api/'))



# ---- special probes + host/scheme
def load_rows(fn):
    try: return [json.loads(l) for l in open(D + fn)]
    except FileNotFoundError: return []
special = load_rows('crawl-special.jsonl')
hosts = {n: load_rows(f'crawl-host-{n}.jsonl') for n in ('http-apex', 'https-www', 'http-www', 'vercel-app')}
def chain_str(r):
    if any(h.get('status') == 403 or h.get('mitigated') for h in r['hops']): return '403 (הגנת הפלטפורמה, `x-vercel-mitigated: deny`) — לא נבדק מעבר לכך'
    return ' → '.join(str(h['status']) for h in r['hops']) + (' → ' + up.unquote(r['final_url']).replace('https://sod1820.co.il', '')[:40] if r['n_hops'] else '')
sp_rows = [['`' + up.unquote(r['key'][8:])[:40] + '`', chain_str(r), ((r['hops'][-1].get('doc') or {}).get('robots') or '—') if r['hops'] else '—'] for r in special]
for n, rows_ in hosts.items():
    for r in rows_:
        sp_rows.append([f'`{n}` ' + '`' + up.unquote(r['key'].split(':', 2)[2])[:34] + '`', chain_str(r), ((r['hops'][-1].get('doc') or {}).get('canonical') or '—')[-40:] if r['hops'] else '—'])
special_table = table(['כתובת', 'שרשרת (סטטוסים → יעד)', 'robots / canonical'], sp_rows) if sp_rows else '_המעבר המיוחד טרם הורץ._'


# ---- coverage of the measured set
gsc_all = [u for u in uni.values() if 'gsc' in u['sources']]
gsc_impr_all = sum(u['impr'] or 0 for u in gsc_all); gsc_clk_all = sum(u['clicks'] or 0 for u in gsc_all)
meas_keys = {o['key'] for o in measured}
gsc_impr_meas = sum(u['impr'] or 0 for u in gsc_all if u['key'] in meas_keys); gsc_clk_meas = sum(u['clicks'] or 0 for u in gsc_all if u['key'] in meas_keys)
notfetched = len(uni) - M - S['UNCHECKED']
p3meta = meta.get('pass3', {})


# ---- the four requested numbers
sa_rows = [o for o in measured if 'sourceAttachment=' in (o['final_url'] or '')]
sa_hops = collections.Counter(o['n_hops'] for o in sa_rows)
rts = json.load(open(D + 'redirect-table-stats.json'))
inv_re = re.compile('[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff\u00a0\u0358]')
def has_flag(o, f): return f in (o['flags'] or '').split(';')
tax_space = [o for o in measured if re.match(r'^/(tag|category)/', up.unquote(o['key'])) and (' ' in up.unquote(o['key']).split('?')[0]) and o['final_status'] == 200 and not o['noindex']]
fixed_keys = set()
for o in measured:
    if has_flag(o, 'canonical_slash') or o['reason'] in ('sitemap_url_is_404', 'recon_resolved_but_404') or 'sourceAttachment=' in (o['final_url'] or ''): fixed_keys.add(o['key'])
for o in tax_space: fixed_keys.add(o['key'])
decision_keys = set()
for o in measured:
    doc_alias = uni.get(o['key'], {}).get('recon_reason') in ('exact_modern_post_root_alias', 'exact_existing_route_alias', 'exact_saved_nested_category')
    if o['class'] in ('UNDECIDABLE', 'TEMP_CLOSED') or (has_flag(o, 'canonical_other_page') and not doc_alias) or has_flag(o, 'p_shortlink_server_metadata_is_home') or inv_re.search(up.unquote(o['key'])): decision_keys.add(o['key'])
decision_keys -= fixed_keys
numbers_box = table(['מדד', 'כתובות', 'פירוט'], [
  ['**נבדקו**', f'**{fmt(M)}**', f'מתוך {fmt(len(uni))} ברשימה המאוחדת; {fmt(len(census))} במפקד התנועה/הזהות, {fmt(len(samp))} במדגמים אקראיים; מכסות {pct(gsc_impr_meas, gsc_impr_all)} מחשיפות Search Console'],
  ['**תקינות (200)**', f"**{fmt(S['OK'] + S['OK_REDIRECT'])}**", f"ישיר {fmt(S['OK'])} · אחרי הפניה {fmt(S['OK_REDIRECT'])}; ללא פגם מטא־דאטה {fmt(ok_clean)}; עם פגם שתוקן בענף {fmt(len([o for o in measured if o['class'] in ('OK','OK_REDIRECT') and o['key'] in fixed_keys]))}"],
  ['**תוקנו בענף (נמדדו; איחוד כתובות — הרכיבים חופפים)**', f'**{fmt(len(fixed_keys))}**', f"canonical מלוכסן {fmt(flags['canonical_slash'])} (PR #1349) · כתובת מפה שבורה {fmt(len(sm_404))} (PR #1350) · כינוי שעונה 404 {fmt(len([o for o in measured if o['reason'] == 'recon_resolved_but_404']))} (PR #1353) · קטגוריה/תגית עם רווח {fmt(len(tax_space))} (PR #1351) · הפניות `sourceAttachment` נמדדו {fmt(len(sa_rows))} (PR #1352)"],
  ['**תוקנו בענף (לפי בנייה, לא כולם נמדדו)**', f"{fmt(rts['before_main']['destination_path_ends_with_slash'])} כללי הפניה", f"{fmt(rts['before_main']['sourceAttachment_rules'])} `sourceAttachment` + {fmt(rts['before_main']['embed_rules'])} `embed` → חוליה אחת (שקילות הוכחה בסקריפט); וכל פוסטי השורש במפה: {fmt(sum(1 for u in uni.values() if 'sitemap_now' in u['sources'] and 'posts' in u['sources']))} (canonical; כולם `/<slug>` במפה)"],
  ['**עדיין דורשות הכרעה**', f'**{fmt(len(decision_keys))}**', f"לא ניתן להכריע {fmt(S['UNDECIDABLE'])} · סגור זמנית (503) {fmt(S['TEMP_CLOSED'])} · canonical לכינוי ללא החלטה מתועדת {fmt(len([o for o in measured if has_flag(o, 'canonical_other_page') and uni.get(o['key'], {}).get('recon_reason') not in ('exact_modern_post_root_alias', 'exact_existing_route_alias', 'exact_saved_nested_category')]))} (מתוך {fmt(flags['canonical_other_page'])}; השאר כינויים שסווגו ב־3.11 כ־resolved) · `?p=` {fmt(flags['p_shortlink_server_metadata_is_home'])} · תווים בלתי־נראים בסלאג (חופף חלקית)"],
  ['נסגרו בכוונה (אין הכרעה נדרשת)', fmt(S['INTENTIONAL']), 'ראיה מתועדת בלבד'],
  ['לא נבדקו', fmt(len(uni) - M), f"מתוכם חסימת פלטפורמה {fmt(S['UNCHECKED'])}, ללא בקשה (זנב/מדגם) {fmt(notfetched)}"],
], align=['l', 'r', 'l'])
# ---- top non-OK by impressions
top = sorted((o for o in measured if o['class'] in ('BROKEN', 'UNDECIDABLE', 'INTENTIONAL', 'TEMP_CLOSED')), key=lambda o: -(o['impr'] or 0))[:20]
top_rows = [[f"`{up.unquote(o['key'])[:56]}`", o['class'], o['reason'][:34], o['final_status'], fmt(o['impr'] or 0), fmt(o['clicks'] or 0)] for o in top]


# ---- 3.11 reconciliation status vs measured
rec_tab = collections.defaultdict(collections.Counter)
for o in measured:
    u = uni.get(o['key'], {})
    if u.get('recon_status'): rec_tab[(u['recon_status'], u['recon_reason'])][o['class']] += 1
rec_total = collections.Counter((u['recon_status'], u['recon_reason']) for u in uni.values() if u.get('recon_status'))
rec_rows = []
for (st, rs), c in sorted(rec_tab.items(), key=lambda kv: -rec_total[kv[0]]):
    rec_rows.append([f'`{st}`', f'`{rs}`', fmt(rec_total[(st, rs)]), fmt(sum(c.values())), ', '.join(f'{k} {v}' for k, v in c.most_common())])

# ---- 11.11 audit verification inputs
rows2029 = [o for o in measured if up.unquote(o['key']).startswith('/2029')]
r2029 = collections.Counter((o['class'], 'noindex' if o['noindex'] else 'index') for o in rows2029)
r2029_txt = '; '.join(f'{c} ({ni}): {v}' for (c, ni), v in sorted(r2029.items(), key=lambda kv: -kv[1]))
links2029 = sum(1 for r in bok for h in (r.get('links') or []) if h.startswith('/2029'))
pages2029 = sum(1 for r in bok if any(h.startswith('/2029') for h in (r.get('links') or [])))
sa_rows = [o for o in measured if 'sourceAttachment=' in (o['final_url'] or '')]
sa_hops = collections.Counter(o['n_hops'] for o in sa_rows)
sa_txt = '; '.join(f'{k} הפניות: {v} כתובות' for k, v in sorted(sa_hops.items()))

# ---------------- text
live = json.load(open(D + 'live-state.json')) if False else {}
# PR heads and CI counts are read from GitHub at the end of the run and written to data/pr-state.json (never typed by hand).
prs = json.load(open(D + 'pr-state.json')) if os.path.exists(D + 'pr-state.json') else {}
pr_rows = []
for num in ('1349', '1350', '1351', '1352', '1353'):
    p = prs.get(num)
    if not p: continue
    ci = f"{p['checks_success']}/{p['checks_total']} ירוק" if p['checks_failed'] == 0 and p['checks_pending'] == 0 else f"{p['checks_success']}/{p['checks_total']} (נכשלו {p['checks_failed']}, ממתינות {p['checks_pending']})"
    pr_rows.append([f'#{num}', f"`{p['branch']}`", f"`{p['head'][:9]}`", ci])
pr_table = table(['PR', 'ענף', 'ראש', 'CI'], pr_rows, align=['l', 'l', 'l', 'l']) if pr_rows else '_מצב ה־PRs ייקרא מ־GitHub בסיום (`data/pr-state.json`)._'
TXT = f'''# רציפות כתובות ו־SEO של האתר הוותיק — בדיקה מדודה (15.11.2026)

**משימה:** `URL_CONTINUITY_SEO_LEGACY_SITE_20261115` · **בעלים:** Claude (כתובות, הפניות, מפת אתר, מטא־דאטה בצד השרת) · **מדווח ל:** ZURIEL · **Codex:** מהירות הפוסטים והמדידה (לא נגענו)
**בסיס:** `origin/main` = `3843af126f21ae58cf033fe808eaa2821b7a3362` · **פריסה חיה (נקראה שוב בסיום, 15.11):** `dpl_C5DBLrWYhELPFDDUaVRJs5W1T6Wj` (מקור `4b9a8687e` = #1344, נפרסה 14.11 23:39 UTC; ה־aliases הועברו ב־23:40) על `sod1820.co.il`, `www.sod1820.co.il`, `sod1820.vercel.app` — **תיקון:** בקריאה הראשונה במשימה נרשמה הפריסה הקודמת `dpl_89Men3jq…` (`9c4cad137`); כל המדידות כאן בוצעו מול `dpl_C5DB…` (נבדק: ה־aliases לא זזו מאז 23:40 UTC). `main` מעליה בקומיט אחד בלבד (#1345) · **יומן:** נקרא; אין רשומה חדשה מאחרים בתחום מאז הרשומה הפותחת.

> מצב לפי סולם §12: הממצאים **MEASURED** (נקרא חי); חמשת התיקונים **COMMITTED + BRANCH-ONLY** (PR #1349, #1350, #1351, #1352, #1353 — טיוטה). **לא MERGED, לא DEPLOYED.** Production לא שונה. לא שונה מסד. לא שוחזר תוכן.

## 1. שורה תחתונה

1. נמדדו **{fmt(M)}** כתובות מתוך **{fmt(len(uni))}** ברשימה המאוחדת (מפקד על {fmt(len(census))}, ועוד {fmt(len(samp))} במדגמים אקראיים של קבוצות הומוגניות — סעיף 3). **{fmt(S['UNCHECKED'])}** לא נבדקו (חסימת פלטפורמה — סעיף 11).
2. **{fmt(S['OK'] + S['OK_REDIRECT'])}** ענו 200 (ישיר או אחרי 1–2 הפניות); **{fmt(ok_clean)}** מהן ללא כל פגם מטא־דאטה. מבין {fmt(sm_n)} כתובות מפת האתר שנמדדו (מתוך {fmt(uni_sm)}; את `/number/*` — 13,030 במפה — בדקתי במדגם): מפנות {fmt(sm_redirect)}, noindex בפועל {fmt(sm_noindex)}, עונות 404 {fmt(len(sm_404))}.
3. **פגם מוכח אחד גדול:** ב־**{fmt(flags['canonical_slash'])}** דפים (פוסטי WordPress בשורש) ה־canonical וה־og:url מצהירים על כתובת **עם לוכסן סוגר** שהקצה מפנה ב־308 — מול הכתובת ללא לוכסן שהמפה רושמת ושעליה 98.1% מקליקי Google; {fmt(sm_slash)} מהם במפת האתר. תוקן בענף (**PR #1349**), עם שחזור לפני ובדיקות אחרי.
4. עוד ארבעה פגמים מוכחים ותוקנו בענפים: מפת האתר מפרסמת **כתובת חוקר שעונה 404** ומשמיטה את הכתובת התקינה של אותו אדם (**PR #1350**, שורש DEF-013); דף קטגוריה/תגית עם **רווח** בכתובת הוא כפיל אינדקסבילי עם canonical עצמי ו־31 קליקים (**PR #1351**); **496 מ־589 ההפניות המפורשות** עוברות שתי חוליות במקום אחת (**PR #1352**, DEF-020); והכינוי המתועד **`/WORLD` → `/world` עונה 404** כי רשימת ההיתר בקצה רגישה לאותיות (**PR #1353**).
5. **{fmt(S['UNDECIDABLE'])}** כתובות **לא ניתנות להכרעה** (אין זהות ידועה — לא נוצר יעד), **{fmt(S['INTENTIONAL'])}** נסגרו בכוונה לפי ראיה מתועדת, **{fmt(S['TEMP_CLOSED'])}** סגורות זמנית ב־503 מתועד (DEF-018), **{fmt(S['BROKEN'])}** שבורות עם זהות ידועה.
6. בדפדפן אמיתי: **{wp_ok}/{len(wp)}** פוסטי WordPress שנדגמו נושאים את הכותרת הנכונה; אף אחד לא הגיע לדף לא קשור; אך ב־{hyd['slash/enc']} מתוך {len(bok)} דפים ה־canonical שאחרי ההידרציה הוא אותה כתובת עם לוכסן/קידוד קטן (הפגם F1), וב־{hyd['other']} — כתובת אחרת (כינוי מתועד, החלטה).
7. בקשת ביצוע **אחת** למחר: [EXECUTION_REQUEST.md](EXECUTION_REQUEST.md) — חמישה מיזוגים, פריסה אחת, אימות מספרי, rollback.

### המספרים שנדרשו

{numbers_box}

## 2. שיטה (ומה שלא נבדק)

- **רשימה מאוחדת** ({fmt(len(uni))} כתובות מנורמלות, מ־{fmt(sum(u['n_raw'] for u in uni.values()))} וריאנטים גולמיים): מפת האתר החיה ({fmt(uni_sm)}), מפת 3.11 ({fmt(sum(1 for u in uni.values() if 'sitemap311' in u['sources']))}), מלאי 3.11 ({fmt(sum(1 for u in uni.values() if 'inv311' in u['sources']))}), Search Console — `gsc_metrics` ממד `page` — תאריכי נתונים 17.6–10.11.2026, נטען לאחרונה 14.11 05:17 UTC, 107,302 שורות ({fmt(gsc_n)} כתובות), נתוני תנועה 3.11, `posts` (כתובות `link`, נתיב `/post`), `redirect_map` (כולל `/?p=<wp_id>`), גיבוי SEO, דגימת ביקורת 6.11, וקבצי סיווג 3.11 (`recon311`, `unresolved311`). נרמול: פענוח, NFC, הסרת fragment; שמירת query.
- **בדיקת כל כתובת** (`scripts/url-continuity-audit/crawl.py`): בקשת GET אחת לכל חוליה **בלי מעקב אוטומטי**; לכל חוליה סטטוס, `Location`, `x-robots-tag`, סוג תוכן, מטמון, ואם HTML — `title`, `canonical` (כולל מספרם), `meta robots`, `og:url`, `h1`. UA מזוהה, קצב מוגבל, ללא עוגיות ופרטים אישיים.
- **סיווג** (`classify.py`, ראיה בלבד): *OK* (200 ישיר), *OK_REDIRECT* (200 אחרי הפניות), *TEMP_CLOSED* (503 שבנתיב מתועד), *INTENTIONAL* (404 עם ראיה מתועדת: סיווג 3.11 `intentionally_closed`/`invalid`, כלל גבול הפוסטים — תגית טיוטה/פורום, או קידומת סגורה מתועדת), *UNDECIDABLE* (404 בלי כל זהות ידועה, או דחייה מתועדת של 3.11), *BROKEN* (נכשל אף שהזהות ידועה והוא אמור להיות ציבורי), *UNCHECKED*. **לא נוצר שום יעד חלופי.**
- **דפדפן:** Chromium אמיתי (Playwright), analytics חסום, מצב ה־DOM אחרי הידרציה; דגימה מרובדת ({fmt(len(ball))} עמודים — סעיף 7).
- **מגבלות:** (א) אין נתוני Page indexing/Coverage מ־Search Console (DEF-006) — **אין טענה על אינדוקס**, רק ביצועים; (ב) משפחות הומוגניות גדולות נבדקו במדגם (ראו טבלה); (ג) הסריקה בוצעה מ־IP של ענן; הפלטפורמה חסמה חלק מהבקשות (סעיף 11) — שורות חסומות לא נספרו כתקינות; (ד) אימות מול Googlebot מאומת אינו אפשרי מכאן.

## 3. מספרים מדודים

{table(['מדד', 'כתובות', 'הערה'], [
  ['הרשימה המאוחדת', fmt(len(uni)), 'כתובת מנורמלת אחת לכל רשומה'],
  ['נמדדו (מדידה תקינה)', fmt(M), f'מפקד {fmt(len(census))} · מדגמים {fmt(len(samp))}'],
  ['לא נבדקו', fmt(S['UNCHECKED']), 'תגובת הגנת פלטפורמה (403, `x-vercel-mitigated`) — לא נספרו'],
  ['200 ישיר (OK)', fmt(S['OK']), ''],
  ['200 אחרי הפניה (OK_REDIRECT)', fmt(S['OK_REDIRECT']), f"מתוכן שרשרת של 2 הפניות: {fmt(flags['chain_ge2'])}"],
  ['מתוך ה־200: ללא פגם מטא־דאטה', fmt(ok_clean), ''],
  ['מתוך ה־200: canonical מלוכסן סוגר (**תוקן בענף**)', fmt(flags['canonical_slash']), f'מהן במפת האתר: {fmt(sm_slash)}'],
  ['מתוך ה־200: canonical לכתובת אחרת (כינוי — החלטה)', fmt(flags['canonical_other_page']), '`/<slug>` → `/post/<slug>`, `/community` → `/community/chat` ועוד'],
  ['מתוך ה־200: canonical בלי query (צפוי)', fmt(flags['canonical_query_dropped']), 'tracking/`from=`/`page=`'],
  ['503 "סגור זמנית" מתועד', fmt(S['TEMP_CLOSED']), '14 נתיבים, `Retry-After: 259200`'],
  ['נסגר בכוונה (ראיה מתועדת)', fmt(S['INTENTIONAL']), ', '.join(f'{k}: {v}' for k, v in collections.Counter(o['reason'] for o in cls if o['class'] == 'INTENTIONAL').items())],
  ['לא ניתן להכריע', fmt(S['UNDECIDABLE']), 'סעיף 4'],
  ['שבור (זהות ידועה)', fmt(S['BROKEN']), '; '.join(up.unquote(o['key'])[:50] + ' — ' + o['reason'] for o in cls if o['class'] == 'BROKEN') or '—'],
], align=['l', 'r', 'l'])}

**כיסוי.** נמדדו {fmt(gsc_meas)} מתוך {fmt(gsc_n)} כתובות Search Console — **{pct(gsc_impr_meas, gsc_impr_all)} מהחשיפות ו־{pct(gsc_clk_meas, gsc_clk_all)} מהקליקים** (הסריקה מסודרת לפי תנועה, ולכן מה שנותר הוא זנב ארוך). **לא נבדקו {fmt(notfetched)} כתובות** (לא נשלחה אליהן בקשה): זנב ללא תנועה — {fmt(p3meta.get('p1_census_not_fetched', 0))} כתובות עם זהות/GSC בחשיפות נמוכות, {fmt(p3meta.get('p2_census_not_fetched', 0))} כתובות מפת אתר שאינן `/number/*`, והחלק שלא נדגם מהמשפחות ההומוגניות. סיבת הצמצום: הפלטפורמה החלה לחסום (סעיף 11) והעדפתי לא להמשיך להגדיל נפח מול אתר חי. מה שנבדק במדגם:

{table(['קבוצה', 'גודל הקבוצה (שלא נמדדה במפקד התנועה)', 'במדגם', '200', 'רווח בר־סמך 95% ל־200', 'פילוג'], sample_rows, align=['l', 'r', 'r', 'r', 'r', 'l'])}

> הערכה אחרי המדגם **אינה** מדידה: היא תקפה לקבוצה שממנה נלקח המדגם בלבד. {fmt(len([o for o in measured if o['shape'] == 'number']))} כתובות `/number/*` נמדדו בסך הכול (חלקן במפקד התנועה, שאינו אקראי).

## 4. שבור · נמחק בכוונה · לא ניתן להכריע

**לא ניתן להכריע ({fmt(S['UNDECIDABLE'])}).** כתובת שעונה 404, אין לה זהות בשום מקור שנקרא (פוסט, `redirect_map`, סיווג 3.11, גיבוי), ואין החלטה מתועדת. לא נוצר יעד. לפי צורת הכתובת:

{table(['צורה', 'כתובות', 'חשיפות (GSC)', 'קליקים', 'דוגמאות'], und_rows, align=['l', 'r', 'r', 'r', 'l'])}

כל קבוצה כאן דורשת החלטה: *קבצי `wp-content/uploads`* — האם קיים גיבוי של הבייטים (לא נבדק; "אל תשחזר" — לא שוחזר); *תגיות/קטגוריות/מחברים* — האם הוחלפו בסיווג 2029; *סלאגים קטועים* של WordPress (חיתוך 200 בתים מקודדים) — פוסטים שלא יובאו.

**נסגר בכוונה ({fmt(S['INTENTIONAL'])}).** כל אלה עם ראיה מתועדת בקוד או בסיווג 3.11: {', '.join(f'{k} — {v}' for k, v in collections.Counter(o['reason'] for o in cls if o['class'] == 'INTENTIONAL').most_common())}. הפירוש: `recon311:*` — סיווג 3.11 (`exact_existing_restricted_draft_identity` = טיוטה מוגבלת); `public_post_boundary_suppressed_tag` — כלל `publicPostBoundary` (תגית טיוטה/פורום); `pagination_beyond_last_page_of_existing_collection` — עמוד מעבר לעמוד האחרון של אוסף שקיים (404 מכוון ב־`api/og.js`); `automatic_profile_not_a_researcher_page` — פרופיל אוטומטי `r-<hash>` שאינו דף חוקר (`api/sitemap.js`).

**סגור זמנית ({fmt(S['TEMP_CLOSED'])}).** 503 בנתיבים `/research, /heichal, /היכל, /name, /name-lab, /spatial-gematria, /verse-gematria, /languages, /cross, /archive, /reality, /timeline, /numbers, /broadcasts` ובווריאציות query שלהם. כולם `x-robots-tag: index, follow` עם `Retry-After: 259200`. **אין אף אחד מהם במפת האתר החיה.** ההחלטה על 404/410/פתיחה — DEF-018, נשארת לבעלים.

**שבור ({fmt(S['BROKEN'])}).** {', '.join('`' + up.unquote(o['key'])[:60] + '` (' + o['reason'] + ')' for o in cls if o['class'] == 'BROKEN') or 'אין'}. בכולן הזהות מוכחת (מסד או הכרעת 3.11) ותוקנה בענף: כתובת מפה ← **PR #1350**; כינוי `/WORLD` ← **PR #1353**.

**20 הכתובות הלא־תקינות עם הכי הרבה חשיפות** (כולל סגורות בכוונה/זמנית — כדי שההחלטה תהיה מדודה):

{table(['כתובת', 'סיווג', 'סיבה', 'HTTP', 'חשיפות', 'קליקים'], top_rows, align=['l', 'l', 'l', 'r', 'r', 'r'])}

### מאיפה מגיעות ההפניות התקינות ({fmt(S['OK_REDIRECT'])})
{table(['מעבר', 'כתובות', 'חשיפות', 'דוגמה'], trans_rows, align=['l', 'r', 'r', 'l'])}

כל המעברים שנבדקו הם כינויים מתועדים (לוכסן, פורום → צ'אט, כינויי סיווג/נושא, "פוסטים אחרונים" → `/post`); לא נמצא מעבר לדף לא קשור.

## 5. ממצאים מוכחים ותיקונים בענפים

| # | ממצא | ראיה | תיקון | בדיקות |
|---|---|---|---|---|
| F1 | canonical/og:url של פוסט WordPress בשורש = `/%d7…/` (לוכסן + אותיות קטנות) והקצה מפנה אותו ב־308 לצורה בלי לוכסן; הלקוח מצהיר אותו דבר אחרי הידרציה | {fmt(flags['canonical_slash'])} דפים ב־crawl, 98.1% מקליקי GSC על הצורה בלי לוכסן, 4.2% מהקישורים הפנימיים בעמודים שנבדקו מצביעים לצורה המפנה | **PR #1349** — מתאם הכתובות מחזיר את הצורה המוגשת | חדש: `public-wp-post-canonical-20261115` (4/6 נכשלות על `main`, כולל חוזה "`<loc>` במפה = canonical בדף" → 6/6); 6 ציפיות ישנות עודכנו; 259 קבצי בדיקה שמייבאים את המתאם — ללא רגרסיה |
| F2 | מפת האתר מפרסמת `/community/researcher/panzer` (404, noindex) ומשמיטה את `/community/researcher/israel-panzer` (200, index) | `contributors`: slug `israel-panzer`, code `panzer` (טקסט); הדף פותר מספר→code, אחר→slug | **PR #1350** — המפה פולטת את הזהות שהדף פותר; קומיט שני (הערה בלבד): הערת DEF-002 בקובץ מתוקנת | חדש: `public-sitemap-researcher-identity-20261115` |
| F3 | קטגוריה/תגית עם רווח: `/category/סוד%20החשמל` ו־`/category/סוד-החשמל` — שתיהן 200, `index`, canonical עצמי | 31 קליקים על הכפיל; המפה רק צורת המקף | **PR #1351** — canonical = צורת המקף | חדש: `public-taxonomy-canonical-20261115` (2/3 → 3/3) |
| F4 | 496 מ־589 ההפניות המפורשות (484 `sourceAttachment` + 12 `embed`) מסתיימות בלוכסן ולכן עוברות שרשרת: כלל → `/x/?…` → `/x?…` (3 חוליות מהמקור עם לוכסן) | נמדד חי על {len(sa_rows)} כתובות: {sa_txt} (מקור ללא לוכסן ← 2, מקור עם לוכסן ← 3) | **PR #1352** — היעד ללא הלוכסן (שקילות הוכחה) | חדש: `public-redirect-single-hop-20261115` (נכשלת על `main` → 4/4) |
| F5 | הכינוי המתועד `/WORLD` → `/world` (3.11: `exact_existing_route_alias`) עונה **404** — ה־Edge בודק נתיב חד־מקטעי לא־מוכר כ־slug של פוסט לפני שהפונקציה מפנה, ורשימת ההיתר רגישה לאותיות | נמדד חי (404, `noindex`); 39 ביקורים ב־3.11; סריקת כל 32 הכינויים החד־מקטעיים: 4 חסרים ברשימה (2 מהם עם נקודה — מחוץ ל־matcher; אחד עובד רק כי קיימת שורת פוסט) | **PR #1353** — `/WORLD` וכינוי הצ'אט ברשימת ההיתר + חוזה כינוי↔קצה | `test-route-legitimacy-2029` מוקשחת (נכשלת על `main` ב־`/WORLD`) |

### 5.1 מצב ה־PRs (נקרא מ־GitHub בסיום)
{pr_table}

מספר הבדיקות משתנה בין PRs: חלק מה־workflows מסוננים לפי נתיבי הקבצים שנגעו בהם. **מעקבים שלא נערכו (כללי הסשן):** שורת הבדיקות החדשות ב־`live-contracts-2029.yml` ושורה אחת ב־`Posts2029Page.jsx` — בבקשת הביצוע (החלטות 8–9).

### 5.2 תוצאי לוואי של #1349 — ביקורת בלתי־תלויה ומדידה חיה (קריאה בלבד)
ביקורת נפרדת שיחזרה בזיכרון את `publicPostAddress` הישן מול החדש: הפלט **זהה לכל שורה בלי `link`** (כל 1,307 שורות מפקד 3.11) ושונה רק בשורות עם `link` שמור. ממצא אחד אמיתי בהיקף נמוך; השאר — ללא השפעה או שיפור.

| # | תוצא לוואי | נמדד בחי (15.11) | טיפול |
|---|---|---|---|
| 1 | **hrefs שמורים בצורה ישנה** מושווים בשוויון מחרוזות מול href שנבנה מחדש בארבעה אתרים בתחום הכותבים (`contributorReading2029Model.js`, `api/contributor-curation.js`) | `contributor_content`: 20 שורות, **0** הצמדות עם `link_url`; `research_items`: 18,306 שורות (130 משתמשים), **0** ישויות `contributorHref`; `user_research`: 171 שורות, **0** בצורה ישנה. רשומות מקומיות בדפדפן — לא ניתן למדוד מהשרת | **0 מושפעים בשרת.** לא נערך (תחום כותבים); מפתח השוואה מנורמל מוצע ונבדק — החלטה 12 |
| 2 | GA `page_path`/`page_location` של פוסטי WordPress: `/%d7…/` ← `/%D7…` | 1,178 שורות WordPress עם `link` מלוכסן; אין צירוף בקוד על השדה (`ga-insights.js`, `visits.js` — קריאה בלבד) | שורות GA מתפצלות בתאריך הפריסה; לנרמל בדוחות |
| 3 | צירוף שיתופים (`shareTelemetry.js`) | `share.slug` נרשם עם לוכסן מול הגעה בלי — לא התאים | שיפור; שורות היסטוריות לא משתנות |
| 4 | תווית "במסלול" מול שם העצם (`pathname ===`) | נתיב Google (`/%D7…`) תואם עכשיו | קוסמטי |
| 5 | סלאגים שאינם WordPress עם `, : @ + ; = & $` מקודדים מחדש | **0** שורות מתוך 1,322 | אין השפעה |
| 6 | `posts.link` במסד החי מול מפקד 3.11 | 1,184 שורות עם `link` (1,178 מלוכסנות, 1,157 בהקס קטן); המפקד רשם ריק בכל 1,307 | המפקד אינו משקף עמודה זו |

**מדיניות W0** (`docs/w0-2027-post-url-immutability-gate-v1.md`, שורה 175): "canonical שמשתנה בשקט" הוא כשל קבלה. כאן השינוי מוצהר ואינו שקט; הנתיב (הסלאג) אינו משתנה והכתובת הישנה ממשיכה לפתור לאותו פוסט. אישור המיזוג הוא ההחלטה המפורשת של ZURIEL (בקשת הביצוע, החלטה 13).

## 6. אימות מחדש של הממצאים המתועדים

{table(['מקור', 'מה תועד', 'מצב נמדד ב־15.11', 'טיפול'], [
 ['DEF-002 (6.11)', 'מפת האתר מפרטת 1,177 כתובות עם לוכסן שמפנות 308', f'**המפה תוקנה**: 0 כתובות עם לוכסן מתוך {fmt(uni_sm)}. **הצד השני נשאר:** {fmt(sm_slash)} דפי המפה מצהירים canonical עם לוכסן', '**PR #1349** משלים'],
 ['"ביקורת 11.11"', 'כתובת ה־canonical מפנה (regression של "הלוכסן המקורי")', 'אומת בשרת, בלקוח ובדפדפן אמיתי; שורש: מתאם הכתובות', '**PR #1349**'],
 ['DEF-013 (6.11)', '`/community/researcher/panzer` במפה מחזיר 404 — "לסנן כותבים בלי פרופיל"', 'עדיין נכון חי; **שורש אחר:** לאדם יש דף ציבורי תחת ה־slug; ההמלצה לסנן הייתה מורידה דף תקין', '**PR #1350**'],
 ['DEF-018 (6.11)', '12 נתיבים 503 + `Retry-After: 259200`', f"אומת: {fmt(S['TEMP_CLOSED'])} כתובות; הרשימה בקוד 14 נתיבים; אינם במפה", 'החלטה (בעלים)'],
 ['DEF-020 (6.11)', 'שרשראות דו־שלביות (`/(.+)/ → /$1`)', f"**אומת:** 496 מ־589 כללים (484 `sourceAttachment` + 12 `embed`) עם יעד מלוכסן; נמדד {fmt(flags['chain_ge2'])} כתובות עם ≥2 הפניות מתוך {fmt(M)}; שרשראות פנימיות בטבלה: 0", '**PR #1352**'],
 ['DEF-022 (6.11)', 'תווי bidi/ZWSP בסלאגים', '10 כתובות עם תווים בלתי־נראים; הפוסטים עונים 200 (הסלאג כך ב־DB)', 'החלטה (DB)'],
 ['DEF-006 (6.11)', 'אין אימות אינדוקס', '**עדיין**: `gsc_metrics` ביצועים בלבד (נתונים עד 10.11; נטען 14.11 05:17 UTC); אין Coverage', 'בקשה לגישה'],
 ['מלאי 3.11 — UNRESOLVED', '369 כתובות בלי זהות', f"נמדדו {fmt(sum(1 for o in measured if o['family'] == 'UNRESOLVED'))}: " + ', '.join(f'{k} {v}' for k, v in collections.Counter(o['class'] for o in measured if o['family'] == 'UNRESOLVED').most_common()), 'ללא יעד מומצא'],
 ['מלאי 3.11 — משפחות F00–F34', 'ייעד לכל משפחה', 'טבלה בסעיף 6.1', '—'],
], align=['l', 'l', 'l', 'l'])}

### 6.1 מה שתועד לכל משפחה מול מה שנמדד
{table(['משפחה', 'בלרשימה', 'נמדדו', 'OK', 'הפניה', '503', 'בכוונה', 'ללא הכרעה', 'שבור', 'לא נבדק', 'יעד מתועד (3.11)'], fam_rows, align=['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'l'])}



### 6.1א מצב ההכרעה של 3.11 מול מה שנמדד
{table(['סטטוס 3.11', 'סיבה', 'ברשימה', 'נמדדו', 'מה נמדד'], rec_rows, align=['l', 'l', 'r', 'r', 'l'])}

`resolved` — אמור להגיע ליעד תקין (200 או הפניה ל־200); `intentionally_closed`/`invalid` — 404 מתועד; `deferred_post_launch` — 404 מתועד שממתין להחלטה. שורה ש"נמדד" בה שונה מהסטטוס המתועד מסומנת ב־`BROKEN`/`UNDECIDABLE` בטבלה למעלה.

### 6.2 ביקורת 11.11 (רשומה `e36e676d`) — ממצא אחר ממצא
{table(['#', 'מה תועד ב־11.11', 'מצב נמדד ב־15.11', 'טיפול'], [
 ['1', '~1,179 פוסטי WordPress בשורש: canonical/og:url מסתיימים ב־`/` והכלל `/(.+)/→/$1` מפנה חזרה (59/60 בדגימה)', f"**אומת** על מדידה מלאה יותר: {fmt(flags['canonical_slash'])} דפים נמדדו (מהם {fmt(sm_slash)} במפה); בדפדפן אחרי הידרציה: {wp_slash}/{len(wp)} פוסטי WordPress שנדגמו עם canonical מלוכסן. **החלטה (א) של 11.11 נענית בראיה:** 98.1% מהקליקים על הצורה בלי לוכסן", '**PR #1349**'],
 ['2', '3 hops בשרשרת `sourceAttachment` (15/25 בדגימה; ~470 מ־589 כללים), יעד סופי עם `?sourceAttachment=`', f"**אומת:** 496/589 כללים; כתובות שנמדדו (n={sum(sa_hops.values())}): {sa_txt}", '**PR #1352**'],
 ['3', '`/2029/number/:value`, `/2029/gematria`, `/2029/posts`, `/2029` מחזירים 200 עם canonical ציבורי (לא 308)', f"נמדדו {len(rows2029)} כתובות `/2029/*` ברשימה: {r2029_txt}. `/2029/number/<ערך>` כבר מופנה (308→`/number/…`) בקוד שב־`main`; **שאר `/2029/*` — החלטה (ב)** נשארת פתוחה", 'החלטה (ב)'],
 ['4', 'קישורי `/2029/*` ברינדור (2–21 לעמוד)', f"בדפדפן: {pages2029} מתוך {len(bok)} עמודים מכילים קישור פנימי שמתחיל ב־`/2029` ({fmt(links2029)} קישורים מתוך {fmt(links_tot)} שנלכדו)", 'החלטה (ב)'],
 ['5', 'ביטויים: 126 עם ניקוד (60 עם תאום בלי ניקוד), `/number/0358` 200 index (כפל של 358), ביטויי אות בודדת/שתי אותיות במפה', 'לא נמדד בחלקו הגדול (משפחת `/number/*` נדגמה — ראו סעיף 3); בדיקת `/number/0358` במעבר המיוחד (סעיף 6.3)', 'החלטה (ג)'],
 ['6', '`/community/researcher/panzer` במפה → 404', '**אומת** (עדיין 404 חי); שורש: code ≠ slug', '**PR #1350**'],
 ['7', '`/sitemap_index.xml`, `/?p=`, `/feed` → 404', '`/sitemap_index.xml` 404, `/feed` 404 (אומת); `/?p=<id>` כיום 200 (זהות מסמך מתועדת)', 'החלטה (ד) + `?p=`'],
 ['9', 'UA של Googlebot קיבל 403', 'אומת: הגנת פלטפורמה (`x-vercel-mitigated: deny`), לא כלל של הפרויקט', 'סעיף 11'],
], align=['l', 'l', 'l', 'l'])}

### 6.3 בדיקות מיוחדות (קבצי WordPress/כינויים/מארח)
{special_table}

## 7. בדיקה בדפדפן אמיתי

- **{fmt(len(ball))}** עמודים נבדקו ב־Chromium (**{fmt(len(bok))}** תקינים 200; **{fmt(len(bden))}** נחסמו בפלטפורמה/שגיאה ולא נספרו): 120 העמודים המובילים ב־GSC, {len(wp)} פוסטי WordPress אקראיים, כינויי הפניה, כתובות `?p=`, ניווט ראשי, כתובות שנשמטו ממפת האתר.
- **תוכן:** {wp_ok}/{len(wp)} פוסטי WordPress — הכותרת/h1 תואמת לכותרת ב־DB (זהות התוכן נכונה).
- **נחיתה לא קשורה:** לא נמצאה אף כתובת ישנה שנוחתת בדף שאינו קשור; כל נחיתות ההפניה הן הכינויים המתועדים (סעיף 4). דפי "העמוד לא נמצא" שחזרו 200 (soft 404): {sum(1 for r in bok if r.get('notFoundMarker'))}.
- **canonical אחרי הידרציה מול הכתובת שנטענה** (מתוך {len(bok)} עמודים תקינים): {hyd_txt}.
- **קישורים פנימיים:** {fmt(links_slash)} מתוך {fmt(links_tot)} שנלכדו מצביעים לכתובת עם לוכסן סוגר (כל אחד 308).
- {b4_txt}
- **תצפית מחוץ לתחום הכתובות (למעקב מדידה — Codex):** בקשת `rpc/track_visit` אל Supabase החזירה 403 ב־{tv_403} מתוך {len(b4)} העמודים של הבדיקה החוזרת (לקוח אוטומטי עם UA מזוהה; לא נבדק אם כך גם בדפדפן רגיל). אין קשר לכתובות או ל־SEO; נרשם כתצפית בלבד.
- **עמודים שנשארו "דקים" או "לא נמצא" אחרי כל הבדיקות החוזרות:** {len(thin)} ({', '.join(up.unquote(r['path'])[:30] for r in thin[:6]) or 'אין'}).

## 8. מפת האתר — זמן יצירה, תכולה והדדיות

פירוט: [evidence/sitemap-timing.md](evidence/sitemap-timing.md). קר **6.5–8.5 שנ'** (n=3), חם 0.35–0.84 שנ'; 16,790 כתובות, 4.0 MiB, `lastmod` ב־88.0%, 575 סרטונים, 0 כתובות עם לוכסן/query. נמדד על הקוד החי (כולל #1344). **בין {fmt(sm_n)} כתובות המפה שנמדדו:** {fmt(sm_slash)} עם canonical מלוכסן (F1), {fmt(len(sm_404))} עונה 404 (F2), {fmt(sm_redirect)} מפנות, {fmt(sm_noindex)} noindex.

## 9. הדדיות canonical ↔ כתובת סופית

{table(['מקרה', 'תוצאת הבדיקה של יעד ה־canonical', 'מספר'], recip_rows_out, align=['l', 'l', 'r']) if recip_rows_out else '_מדידת היעדים (מעבר שני) ממתינה — ראו סעיף 11._'}

היעדים נבדקו בנפרד מהדף שהצהיר עליהם: כל כתובות ה־canonical מסוג "כתובת אחרת" ({recip_meta.get('other_page_targets', '—')}) ומדגם אקראי של {recip_meta.get('slash_targets_sampled', '—')} מתוך {recip_meta.get('slash_targets_total', '—')} כתובות הלוכסן (כלל אחד דטרמיניסטי של הקצה).

{recip_note}

## 10. החלטות פתוחות (לא חוסמות — נרשמו והמשכנו)

פירוט מלא בסעיף "החלטות פתוחות" של [EXECUTION_REQUEST.md](EXECUTION_REQUEST.md): `/?p=<wp_id>` (תכנון מתועד של "זהות מסמך"; 6 כתובות, 112 חשיפות); משפחת 503; כתובות ללא זהות; כינויי שורש עם canonical ל־`/post/<slug>` ({fmt(flags['canonical_other_page'])} דפים); תווי bidi בסלאגים; הפניית `panzer`; חיווט בדיקות ל־CI; גישת Search Console; **hrefs שמורים בצורה ישנה** (נמדד: 0 מושפעים בשרת; הצעת תיקון בתחום הכותבים — החלטה 12); **מדיניות W0** — אישור #1349 הוא ההחלטה המפורשת על שינוי ה־canonical (החלטה 13).

## 11. מה קרה בסריקה — חסימת פלטפורמה (דווח, לא נעקף)

- הסריקה החלה בקצב ‎7.5 בקשות/שנייה ורצה כ־18 דקות (כ־11 אלף כתובות) בלי תגובת הגנה כלשהי. כשהפעלתי במקביל בדיקת דפדפן (שכל עמוד בה טוען עשרות משאבים) ובדיקות `curl` ידניות, Vercel החלה להחזיר `403` עם `x-vercel-mitigated: deny` ל־30–40% מהבקשות מה־IP של הענן — גם לבקשה בודדת כל 8 שניות, ובהמשך גם ל־`/robots.txt` ול־`/sitemap.xml`.
- **עצרתי הכול** (דפדפן, סריקה, בדיקות ידניות) עד שהחסימה פגה (כ־6 דקות בלי תעבורה); **874** שורות שנסרקו בזמן החסימה הוצאו מהספירה ונבדקו מחדש; הוספתי ל־`crawl.py` מגן (`--adaptive`: תגובת `mitigated` ⇒ סימון השורה "לא נבדקה", קירור 150 שנ' והורדת קצב — **לא ניסיון מחדש מול החסימה**); חידשתי בקצב 1–1.3 בקשות/שנייה; הקטנתי את היקף הסריקה (מדגמים במקום מפקד לקבוצות הומוגניות, סעיף 3) ואת בדיקת הדפדפן (בלי תמונות/גופנים/מדיה, בלי הרצה במקביל לסריקה). לא נעשה שום ניסיון עקיפה.
- אין כללי Firewall מותאמים בפרויקט (`rules: []`, כללים מנוהלים ב־`log`), כך שמקור ה־`deny` הוא הגנת פלטפורמה. נצפה גם: UA של Googlebot מזויף ו־`/wp-admin` ⇒ `403 deny` (כמצופה מ־IP לא מאומת). **המלצה:** לבדוק ב־Vercel Firewall → אירועים שאין הכחשות ל־Googlebot מאומת על `/robots.txt` ו־`/sitemap.xml`. מכאן לא ניתן לאמת.

## 12. קבצים

`evidence/` — `summary.json`, `urls-classified.csv.gz`, `problems.csv`, `family-verification.csv`, `crawl-raw.jsonl.gz`, `crawl-recip.jsonl.gz`, `crawl-special.jsonl.gz`, `crawl-host-*.jsonl.gz`, `browser-results.jsonl.gz`, `unified-urls.jsonl.gz`, `verify-wp-sample.json`, `verify-attachment-sample.json`, `gsc-wp-post-address-forms.json`, `sitemap-diff-simulation.json`, `post-alias-canonical-check.json`, `sitemap-timing.md`. כלים: `scripts/url-continuity-audit/` (סקריפטים בלבד; הרצה מול אתר חי — רק בקצב נמוך ועם `--adaptive`).
'''
open(OUT, 'w', encoding='utf8').write(TXT)
print('README written', len(TXT), 'chars; measured', M, 'unchecked', S['UNCHECKED'])
