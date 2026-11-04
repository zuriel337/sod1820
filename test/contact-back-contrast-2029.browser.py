"""Contact Gateway text contrast (review 36d16f8d, P2): the "← חזרה" control must use the accessible accent TEXT role,
not the royal-blue action fill, in Day, Parchment and Night. Real public writer page (Yaniv) with real anonymous
Supabase reads; /api/* stubbed; writes and telemetry blocked.
Run after `npm run build:2029`. Usage: python3 test/contact-back-contrast-2029.browser.py [--shots]
"""
import functools, glob, json, os, ssl, sys, threading, urllib.request, urllib.error
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = '--shots' in sys.argv
OUT = ROOT / 'docs/reviews/writer-visual-family-evidence-20261025'
if SHOTS: OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / 'dist/2029.html').read_text()
CHROMIUM = os.environ.get('CHROMIUM_PATH') or next(iter(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome')), '/usr/bin/chromium')
CA = os.environ.get('SSL_CERT_FILE') or '/root/.ccr/ca-bundle.crt'
CONTEXT = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
SUPABASE = 'linswmnnkjxvweumprav.supabase.co'
PATH = '/community/researcher/yaniv-levi'
THEMES = ('light', 'parchment', 'dark')
WIDTHS = (390, 1440)
# accent TEXT role per preset (Design V2 section 4) and the fill role that must not be used for text
TEXT = {'light': (36, 84, 184), 'parchment': (40, 78, 159), 'dark': (168, 199, 255)}
FILL = (49, 93, 213)
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


def background(locator):
    """First opaque ancestor background of the control (the panel it actually sits on)."""
    return rgb(locator.evaluate("""n => { for (let e = n; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor;
      const m = c.match(/rgba?\\(([^)]+)\\)/); if (m) { const p = m[1].split(',').map(Number); if (p.length === 3 || p[3] > 0.9) return c; } } return 'rgb(255,255,255)'; }"""))


def case(browser, width, theme):
    tag = (width, theme)
    context = browser.new_context(viewport={'width': width, 'height': 900}, has_touch=width < 700)
    context.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
    page = context.new_page(); install(page)
    page.goto(BASE + PATH)
    page.locator('.pc-person').wait_for(timeout=90000)
    page.wait_for_load_state('networkidle')
    if width < 700:   # the mobile navigation drawer carries the report/contact entry
        page.get_by_role('button', name='פתח ניווט').click(); page.wait_for_timeout(400)
        trigger = page.locator('#sod29-mobile-navigation button.sod29-sidebar-workspace').filter(has_text='דווח על בעיה').first
    else:
        trigger = page.locator('button[aria-label="דווח על בעיה"]:visible').first
    trigger.click()
    page.get_by_role('button', name='רוצה לכתוב לנו').first.click()
    back = page.get_by_role('button', name='← חזרה')
    back.wait_for(timeout=15000)
    style = back.evaluate("n => { const s = getComputedStyle(n); return { color: s.color, size: parseFloat(s.fontSize), weight: s.fontWeight }; }")
    color = rgb(style['color']); surface = background(back)
    value = ratio(color, surface)
    assert color == TEXT[theme], ('back control uses the accent TEXT role', color, TEXT[theme], tag)
    assert color != FILL, ('back control is not the royal-blue fill', tag)
    assert value >= 4.5, ('back control contrast', round(value, 2), color, surface, tag)
    assert style['size'] >= 16, ('back control reading size', style, tag)
    box = back.bounding_box()
    back.focus(); page.keyboard.press('Tab'); page.keyboard.press('Shift+Tab')
    assert back.evaluate('n => document.activeElement === n'), ('back control is keyboard reachable', tag)
    outline = back.evaluate("n => { const s = getComputedStyle(n); return { w: parseFloat(s.outlineWidth), style: s.outlineStyle }; }")
    assert outline['style'] != 'none' and outline['w'] >= 2, ('visible focus ring on back control', outline, tag)
    if SHOTS: page.screenshot(path=str(OUT / f'contact-back-{theme}-{width}.png'))
    back.click()   # operable: returns to the choice list
    page.get_by_role('button', name='רוצה לכתוב לנו').first.wait_for(timeout=15000)
    report['cases'].append({'width': width, 'theme': theme, 'color': color, 'surface': surface, 'contrast': round(value, 2), 'size': style['size'], 'weight': style['weight'], 'box': [round(box['width']), round(box['height'])]})
    context.close()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox'])
    for width in WIDTHS:
        for theme in THEMES: case(browser, width, theme)
    browser.close()
assert not report['errors'], report['errors']
assert not report['unexpected_writes'], report['unexpected_writes']
print(json.dumps(report, ensure_ascii=False))
print('contact back contrast 2029: PASS', len(report['cases']), 'cases')
