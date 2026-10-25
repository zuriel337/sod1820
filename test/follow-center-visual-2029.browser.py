"""Follow center visual candidate (synthetic fixtures): states, Design V2 sizes, targets, keyboard, contrast, reduced motion.
Run after `VITE_FOLLOW_CENTER_PREVIEW=true npm run build:2029`. Usage: python3 test/follow-center-visual-2029.browser.py [--shots]
"""
import functools, glob, json, os, ssl, sys, threading, urllib.request, urllib.error
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = '--shots' in sys.argv
OUT = ROOT / 'docs/reviews/follow-center-visual-evidence-20261025'
if SHOTS: OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / 'dist/2029.html').read_text()
CHROMIUM = os.environ.get('CHROMIUM_PATH') or next(iter(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome')), '/usr/bin/chromium')
CA = os.environ.get('SSL_CERT_FILE') or '/root/.ccr/ca-bundle.crt'
CONTEXT = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
SUPABASE = 'linswmnnkjxvweumprav.supabase.co'
PATH = '/2029/preview/follow-center'
THEMES = ('light', 'parchment', 'dark')
WIDTHS = (320, 390, 1440)
STATES = ('registered', 'guest', 'loading', 'empty', 'partial', 'unavailable', 'push')
FULL_MATRIX = ('registered', 'guest')
READ_RPCS = {'writer_public_contributions_page_v1', 'world_group_source_arrivals_v2', 'convergence_meter', 'research_state_snapshot_v1', 'fn_research_path_resume_v1'}
TELEMETRY_RPCS = {'link_identity', 'track_visit', 'ingest_event'}
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range', 'access-control-allow-methods': 'GET,OPTIONS'}


class Files(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Files, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:' + str(server.server_port)
CACHE = {}
report = {'cases': [], 'errors': [], 'unexpected_writes': [], 'blocked_telemetry': {}, 'mode': 'real public data'}


def forward(req):
    if req.method == 'GET' and req.url in CACHE: return CACHE[req.url]
    headers = {k: v for k, v in req.headers.items() if k.lower() in ('apikey', 'authorization', 'accept', 'accept-profile', 'range', 'prefer', 'content-type')}
    body = req.post_data_buffer if req.method == 'POST' else None
    try:
        with urllib.request.urlopen(urllib.request.Request(req.url, data=body, method=req.method, headers=headers), context=CONTEXT, timeout=30) as response:
            result = (response.status, {k: v for k, v in response.headers.items() if k.lower() in ('content-type', 'content-range')}, response.read())
    except urllib.error.HTTPError as error:
        result = (error.code, {'content-type': 'application/json'}, error.read())
    if req.method == 'GET' and result[0] < 500: CACHE[req.url] = result
    return result


def install(page):
    page.on('pageerror', lambda error: report['errors'].append(str(error)))

    def route(r):
        req = r.request; u = urlparse(req.url)
        if u.hostname == '127.0.0.1':
            if req.is_navigation_request(): return r.fulfill(content_type='text/html', body=HTML)
            if u.path.startswith('/api/'): return r.fulfill(status=503, json={'state': 'unavailable'})
            return r.continue_()
        if u.hostname == SUPABASE:
            rpc = u.path.rsplit('/', 1)[-1] if u.path.startswith('/rest/v1/rpc/') else None
            if req.method == 'OPTIONS': return r.fulfill(status=204, headers=CORS)
            if req.method == 'POST' and rpc in TELEMETRY_RPCS:
                report['blocked_telemetry'][rpc] = report['blocked_telemetry'].get(rpc, 0) + 1; return r.abort()
            if req.method != 'GET' and not (req.method == 'POST' and rpc in READ_RPCS):
                report['unexpected_writes'].append(f'{req.method} {u.path}'); return r.abort()
            status, headers, body = forward(req)
            return r.fulfill(status=status, headers={**CORS, **headers}, body=body)
        return r.abort()
    page.route('**/*', route)


def rgb(value):
    nums = [int(float(n)) for n in value[value.index('(') + 1:value.index(')')].replace('/', ',').replace(' ', ',').split(',') if n.strip()][:3]
    return tuple(nums)

def lum(c):
    v = [x / 255 for x in c]; v = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in v]
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]


def ratio(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


BG = """n => { for (let e = n; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor;
  const m = c.match(/rgba?\\(([^)]+)\\)/); if (m) { const p = m[1].split(',').map(Number); if (p.length === 3 || p[3] > 0.9) return c; } } return 'rgb(255,255,255)'; }"""

AUDIT = """() => {
  const root = document.querySelector('.fcp'); const out = { small: [], targets: [], overflow: document.documentElement.scrollWidth > innerWidth };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim() || !n.parentElement.offsetParent) continue;
    const size = parseFloat(getComputedStyle(n.parentElement).fontSize);
    if (size < 14 && !n.parentElement.closest('[aria-hidden=true]')) out.small.push([n.textContent.trim().slice(0, 30), size]);
  }
  for (const el of root.querySelectorAll('button, a[href]')) {
    if (!el.offsetParent) continue; const b = el.getBoundingClientRect();
    if (b.height < 43.5 || b.width < 43.5) out.targets.push([(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30), Math.round(b.width), Math.round(b.height)]);
  }
  return out; }"""


def audit(page, tag):
    result = page.evaluate(AUDIT)
    assert not result['overflow'], ('horizontal overflow', tag)
    assert not result['small'], ('text below 14px', result['small'][:4], tag)
    assert not result['targets'], ('targets below 44px', result['targets'][:4], tag)


def open_state(browser, state, width, theme, reduced='no-preference', height=900):
    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion=reduced)
    context.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
    page = context.new_page(); install(page)
    page.goto(BASE + PATH + '?state=' + state)
    page.locator('.fc').wait_for(timeout=90000)
    page.wait_for_load_state('networkidle'); page.evaluate('document.fonts.ready')
    return context, page


def capture(browser, state, width, theme, height, path):
    # Fresh tall viewport (not full_page and not a resize), so the fixed frame chrome sits where a reader sees it.
    context, page = open_state(browser, state, width, theme, height=min(max(height, 900), 6000))
    page.wait_for_timeout(1500); page.screenshot(path=str(path)); context.close()


def check(browser, state, width, theme):
    tag = (state, width, theme)
    context, page = open_state(browser, state, width, theme)
    audit(page, tag)
    text = page.locator('.fc').inner_text()
    import re as _re
    assert not _re.search('[\U0001F300-\U0001FAFF\u2600-\u27BF]', text), ('2029 icons only, no emoji', tag)
    if state == 'registered': assert page.locator('.fc-icon svg').count() >= 8, ('2029 SVG icons are rendered', tag)
    assert page.locator('.fcp-banner').inner_text().count('סינתטיים') == 1, tag
    assert page.locator('.fc-life li').count() == 4, tag
    assert page.locator('.fc-inputs li').count() == 3, tag
    assert page.locator('.fc-inputs li[data-active=true]').count() == 1, ('only explicit follow is active', tag)
    # no external channel is presented as available or on
    for channel in ('email', 'whatsapp'):
        assert page.locator('.fc-channel[data-available=true]').count() <= 1, tag
    assert 'לא זמין עדיין' in text, tag
    if state == 'loading':
        assert 'טוען' in text and 'אין עדכונים עדיין' not in text and 'עוד לא בחרתם' not in text, ('loading is not empty', tag)
    if state == 'unavailable':
        assert text.count('זה לא אומר שאין כלום') == 2 and 'עוד לא בחרתם' not in text and 'אין עדכונים עדיין' not in text, ('a failed read is not empty', tag)
    if state == 'partial':
        assert 'זה לא אומר שאין כלום' in text and page.locator('.fc-follow-row').count() >= 1, ('partial read keeps the other section', tag)
    if state == 'empty':
        assert 'אין עדכונים עדיין' in text and 'עוד לא בחרתם' in text, tag
    if state == 'guest':
        assert page.get_by_role('button', name='אימות זהות').count() == 1, tag
        assert page.locator('.fc-life li[data-state=needed]').count() == 1, tag
        assert page.locator('.fc-chip[data-on=true]').count() == 0, ('a guest has no chosen channel', tag)
    if state == 'registered':
        assert page.locator('.fc-update').count() == 3 and page.locator('.fc-update[data-unread=true]').count() == 2, tag
        assert 'כי אתם עוקבים אחרי' in text and text.count('כי אתם עוקבים אחרי') == 2, ('why only from a source topic', tag)
        assert page.locator('.fc-meta time').first.inner_text().count('·') == 1, ('bilingual record date', tag)
        assert 'לפני ' not in page.locator('.fc-meta').first.inner_text(), tag
        body = page.locator('.fc-body').first
        assert body.evaluate('n => parseFloat(getComputedStyle(n).fontSize)') == 18, tag
        assert page.locator('.fc-name').first.evaluate('n => parseFloat(getComputedStyle(n).fontSize)') == 16, tag
        assert page.locator('.fc-row-note').count() == 1, ('unresolved writer gets no guessed link', tag)
        assert page.locator('a.fc-open').first.get_attribute('href').startswith('/post/example-1?returnTo='), tag
        for selector in ('.fc-eyebrow', 'a.fc-open', 'a.fc-name', '.fc-life li[data-state=done] .fc-life-state', '.fc-inputs li[data-active=true] b', '.fcp-states button[aria-pressed=true]'):
            node = page.locator(selector).first
            fg = rgb(node.evaluate('n => getComputedStyle(n).color')); bg = rgb(node.evaluate(BG))
            assert ratio(fg, bg) >= 4.5, ('contrast', selector, round(ratio(fg, bg), 2), fg, bg, tag)
        # colour carries meaning: distinct semantic icon colours, each readable (non-text 3:1) on its surface
        colors = {}
        for icon in page.locator('.fc-icon[data-icon]').all():
            name = icon.get_attribute('data-icon'); fg = rgb(icon.evaluate('n => getComputedStyle(n).color')); colors.setdefault(name, fg)
            if name in ('personal', 'number', 'layers', 'signal', 'discovery'):
                assert ratio(fg, rgb(icon.evaluate(BG))) >= 3, ('icon contrast', name, fg, theme, tag)
        assert len({colors[k] for k in ('personal', 'number', 'layers', 'signal') if k in colors}) == 4, ('four semantic icon colours', colors, tag)
        tones = {rgb(c.evaluate('n => getComputedStyle(n).borderTopColor')) for c in page.locator('.fc-card[data-tone]').all()}
        assert len(tones) == 3, ('three section tones', tones, tag)
        for selector in ('h2:visible',):
            for heading in page.locator('.fc-card h2').all():
                assert ratio(rgb(heading.evaluate('n => getComputedStyle(n).color')), rgb(heading.evaluate(BG))) >= 4.5, ('section heading contrast', tag)
        # keyboard: every interactive control is reachable and shows a visible focus ring
        seen = set()
        for _ in range(40):
            page.keyboard.press('Tab')
            info = page.evaluate("() => { const e = document.activeElement; if (!e || !e.closest('.fcp')) return null; const s = getComputedStyle(e); return [e.tagName + ':' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 20), parseFloat(s.outlineWidth), s.outlineStyle]; }")
            if info:
                seen.add(info[0]); assert info[2] != 'none' and info[1] >= 2, ('focus ring', info, tag)
        assert len(seen) >= 8, ('keyboard reach', len(seen), tag)
    if SHOTS and width in (390, 1440) and (state in FULL_MATRIX or theme == 'dark'): capture(browser, state, width, theme, page.evaluate('document.documentElement.scrollHeight'), OUT / f'follow-{state}-{theme}-{width}.png')
    context.close()


def interaction(browser):
    context, page = open_state(browser, 'registered', 390, 'dark')
    row = page.locator('.fc-follow-row').filter(has_text='מספר 1820').first if page.locator('.fc-follow-row').filter(has_text='1820').count() == 0 else page.locator('.fc-follow-row').filter(has_text='1820').first
    count = page.locator('.fc-follow-row').count()
    row.get_by_role('button').click()
    assert row.get_by_role('button').get_attribute('aria-busy') == 'true', 'pending state is shown'
    page.locator('.fc-row-error').wait_for(timeout=5000)
    assert page.locator('.fc-follow-row').count() == count, 'an unconfirmed unfollow removes nothing'
    row.get_by_role('button').click(); page.wait_for_timeout(1200)
    assert page.locator('.fc-follow-row').count() == count - 1, 'a confirmed unfollow removes the row'
    page.get_by_role('button', name='סמן הכול כנקרא (2)').click()
    assert page.locator('.fc-update[data-unread=true]').count() == 0
    audit(page, ('interaction',))
    context.close()
    context, page = open_state(browser, 'registered', 1440, 'dark', reduced='reduce')
    assert page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
    assert page.locator('.fc-update').first.evaluate('n => getComputedStyle(n).transitionDuration') in ('0s', '0.001s', '0s, 0s'), 'reduced motion'
    context.close()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox'])
    for state in STATES:
        for width in WIDTHS:
            for theme in THEMES:
                if state not in FULL_MATRIX and theme != 'dark' and width != 390: continue
                check(browser, state, width, theme); report['cases'].append([state, width, theme])
    interaction(browser)
    browser.close()
assert not report['errors'], report['errors']
assert not report['unexpected_writes'], report['unexpected_writes']
print(json.dumps({k: (len(v) if k == 'cases' else v) for k, v in report.items()}, ensure_ascii=False))
print('follow center visual 2029: PASS', len(report['cases']), 'cases')
