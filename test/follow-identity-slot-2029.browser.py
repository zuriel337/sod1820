"""Actual EmailVerify identity slot inside the WatchButton 2029 card: computed type floors, targets, contrast, focus.
Run against Vite (FOLLOW_SLOT_PORT, default 5311). All external requests are blocked; the Supabase OTP endpoint is answered with a
synthetic empty success so the code step renders. No mail, OTP, subscription or account write happens.
"""
import json, os, sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

OUT = Path(os.environ.get('FOLLOW_SLOT_OUT', '/tmp/follow-identity-slot')); OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:' + os.environ.get('FOLLOW_SLOT_PORT', '5311')
CHROMIUM = os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium')
HTML = '''<!doctype html><html lang="he" dir="rtl"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div>
<script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script>
<script type="module" src="/test/fixtures/follow-identity-slot-2029.jsx"></script></body></html>'''
report = {'cases': [], 'external': [], 'errors': []}
STRICT = '--strict' in sys.argv   # fail on floors; without it the run only measures


def lum(c):
    v = [x / 255 for x in c]; v = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in v]
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]


def rgb(s): return tuple(int(float(n)) for n in s[s.index('(') + 1:s.index(')')].replace('/', ',').replace(' ', ',').split(',') if n.strip())[:3]


def ratio(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True); return (hi + 0.05) / (lo + 0.05)


MEASURE = """() => { const root = document.querySelector('.sod29-watch-card'); const out = []; if (!root) return out;
  const bg = (n) => { for (let e = n; e; e = e.parentElement) { if (getComputedStyle(e).backgroundImage.includes('gradient')) return 'rgb(49, 93, 213)'; const c = getComputedStyle(e).backgroundColor; const m = c.match(/rgba?\\(([^)]+)\\)/); if (m) { const p = m[1].split(',').map(Number); if (p.length === 3 || p[3] > 0.9) return c; } } return 'rgb(255,255,255)'; };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) { const t = n.textContent.trim(); const el = n.parentElement; if (!t || !el.offsetParent) continue; const s = getComputedStyle(el);
    out.push({ kind: 'text', text: t.slice(0, 28), size: parseFloat(s.fontSize), color: s.color, bg: bg(el) }); }
  for (const el of root.querySelectorAll('input, button, a[href]')) { if (!el.offsetParent) continue; const b = el.getBoundingClientRect(); const s = getComputedStyle(el);
    out.push({ kind: el.tagName.toLowerCase(), text: (el.innerText || el.placeholder || '').slice(0, 20), w: Math.round(b.width), h: Math.round(b.height), size: parseFloat(s.fontSize) }); }
  return out; }"""


def run(browser, theme, width, step, mode='watch'):
    ctx = browser.new_context(viewport={'width': width, 'height': 900})
    ctx.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
    page = ctx.new_page()
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    def route(r):
        u = urlparse(r.request.url)
        if u.hostname == '127.0.0.1':
            if u.path == '/follow-identity-slot' and r.request.is_navigation_request(): return r.fulfill(content_type='text/html', body=HTML)
            return r.continue_()
        if u.hostname and u.hostname.endswith('supabase.co') and '/auth/v1/otp' in u.path:
            return r.fulfill(status=200, content_type='application/json', body='{}', headers={'access-control-allow-origin': '*'})
        if r.request.method == 'OPTIONS': return r.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'})
        report['external'].append(r.request.method + ' ' + u.hostname + u.path); return r.abort()
    page.route('**/*', route)
    page.goto(BASE + '/follow-identity-slot' + ('?mode=direct' if mode == 'direct' else ''))
    if mode == 'watch': page.get_by_role('button', name='אימות חשבון', exact=True).click()
    page.locator('.sod29-watch-card input').first.wait_for(timeout=15000)
    if step >= 1:
        page.locator('.sod29-watch-card input').first.fill('nobody@example.invalid')
        page.locator('.sod29-watch-card button[type=submit]').click()
        page.locator('.sod29-watch-card input[inputmode], .sod29-watch-card form >> text=שלחנו קוד').first.wait_for(timeout=15000)
    if step >= 2:  # error state: empty code submit
        page.locator('.sod29-watch-card button[type=submit]').click(); page.wait_for_timeout(500)
    assert page.locator('.sod29-email-verify[data-variant="2029"]').count() == 1, 'the shared 2029 variant renders'
    page.screenshot(path=str(OUT / f'slot-{mode}-{theme}-{width}-step{step}.png'))
    items = page.evaluate(MEASURE)
    ctx.close()
    return items


problems = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox'])
    for theme in ('light', 'parchment', 'dark'):
        for width in (390, 1440):
            for mode, step in [(m, st) for m in ('watch', 'direct') for st in (0, 1, 2)]:
                items = run(browser, theme, width, step, mode)
                floor = 15 if width >= 1024 else 14
                for it in items:
                    tag = (mode, theme, width, step, it.get('text'))
                    if it['kind'] == 'text':
                        if it['size'] < floor: problems.append(('size', it['size'], tag))
                        fg, bgc = rgb(it['color']), rgb(it['bg'])
                        if ratio(fg, bgc) < 4.5: problems.append(('contrast', round(ratio(fg, bgc), 2), tag))
                    else:
                        if it.get('h', 99) < 43.5 or it.get('w', 99) < 43.5: problems.append(('target', (it['w'], it['h']), tag))
                        if it['size'] < 16 and it['kind'] != 'a': problems.append(('control-size', it['size'], tag))
                report['cases'].append([mode, theme, width, step, len(items)])
    browser.close()
report['problems'] = len(problems); report['sample'] = [list(map(str, x)) for x in problems[:25]]
print(json.dumps(report, ensure_ascii=False))
assert not report['errors'], report['errors']
assert not report['external'], report['external']
if STRICT: assert not problems, problems[:10]
print('follow identity slot 2029:', 'PASS' if not problems else f'MEASURED {len(problems)} problems')
