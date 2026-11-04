"""Public writer pages as one Person family, with the identity medallion, on REAL public data.
The built App2029 is served locally. Supabase reads are real anonymous reads, forwarded by this script
through the sandbox proxy (TLS verified against its CA bundle); every write path and /api/* is intercepted.
Run after `npm run build:2029`. Usage: python3 test/writer-person-medallion-2029.browser.py [--shots]
"""
import functools, glob, json, os, ssl, sys, threading, urllib.request, urllib.error
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = '--shots' in sys.argv
OUT = ROOT / 'docs/reviews/writer-person-medallion-evidence-20261024'
if SHOTS: OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / 'dist/2029.html').read_text()
CHROMIUM = os.environ.get('CHROMIUM_PATH') or next(iter(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome')), '/usr/bin/chromium')
CA = os.environ.get('SSL_CERT_FILE') or '/root/.ccr/ca-bundle.crt'
CONTEXT = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
SUPABASE = 'linswmnnkjxvweumprav.supabase.co'
JOINED = '2026-06-17T05:53:18.284Z'  # fixture registration date, used only in the explicitly labelled fixture mode
PEOPLE = {  # slug -> (expected label, expected view). Real public dossiers; capability comes from contributors.kind.
    'yaniv-levi': ('כותב', 'general'),
    'tzvi-opoc': ('חבר קהילה', 'catalogue'),
    'ariel-ben-moshe': ('חבר קהילה', 'general'),
}
WIDTHS = (320, 390, 1440)
THEMES = ('light', 'parchment', 'dark')


class Files(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Files, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:' + str(server.server_port)
CACHE = {}
report = {'cases': [], 'errors': [], 'forbidden_requests': [], 'blocked_telemetry': {}, 'mode': 'real public data'}
READ_RPCS = {'writer_public_contributions_page_v1', 'world_group_source_arrivals_v2', 'convergence_meter'}  # POST-shaped anonymous reads
TELEMETRY_RPCS = {'link_identity', 'track_visit', 'ingest_event'}  # product telemetry writes: always blocked here
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range',
        'access-control-allow-methods': 'GET,OPTIONS'}


def forward(req):
    key = req.url
    if req.method == 'GET' and key in CACHE: return CACHE[key]
    body = req.post_data_buffer if req.method == 'POST' else None
    headers = {k: v for k, v in req.headers.items() if k.lower() in ('apikey', 'authorization', 'accept', 'accept-profile', 'range', 'prefer', 'content-type')}
    try:
        with urllib.request.urlopen(urllib.request.Request(req.url, data=body, method=req.method, headers=headers), context=CONTEXT, timeout=30) as response:
            result = (response.status, {k: v for k, v in response.headers.items() if k.lower() in ('content-type', 'content-range')}, response.read())
    except urllib.error.HTTPError as error:
        result = (error.code, {'content-type': 'application/json'}, error.read())
    if req.method == 'GET' and result[0] < 500: CACHE[key] = result
    return result


def install(page, mode):
    page.on('pageerror', lambda error: report['errors'].append(str(error)))
    calls = []

    def route(r):
        req = r.request; u = urlparse(req.url)
        if u.hostname == '127.0.0.1':
            if req.is_navigation_request(): return r.fulfill(content_type='text/html', body=HTML)
            if u.path.startswith('/api/'):
                calls.append(u.path)
                if u.path == '/api/contributor-public-overview' and mode == 'fixture':
                    return r.fulfill(json={'state': 'ready', 'joinedAt': JOINED, 'studio': {'available': True, 'items': [], 'hasMore': False, 'page': 0}})
                return r.fulfill(status=503, json={'state': 'unavailable'})
            return r.continue_()
        if u.hostname == SUPABASE:
            if req.method == 'OPTIONS': return r.fulfill(status=204, headers=CORS)
            rpc = u.path.rsplit('/', 1)[-1] if u.path.startswith('/rest/v1/rpc/') else None
            if req.method == 'POST' and rpc in TELEMETRY_RPCS:
                report['blocked_telemetry'][rpc] = report['blocked_telemetry'].get(rpc, 0) + 1; return r.abort()
            if req.method != 'GET' and not (req.method == 'POST' and rpc in READ_RPCS):
                report['forbidden_requests'].append(f'{req.method} {u.path}'); return r.abort()
            status, headers, body = forward(req)
            return r.fulfill(status=status, headers={**CORS, **headers}, body=body)
        return r.abort()
    page.route('**/*', route)
    return calls


def load(browser, slug, width, theme, mode='real', reduced='no-preference'):
    context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion=reduced)
    context.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
    page = context.new_page(); calls = install(page, mode)
    page.goto(f'{BASE}/community/researcher/{slug}')
    page.locator('.pc-person').wait_for(timeout=60000)
    page.wait_for_load_state('networkidle'); page.evaluate('document.fonts.ready')
    return context, page, calls


def check_basics(page, calls, slug, width, theme):
    label, kind = PEOPLE[slug]; tag = (slug, width, theme)
    body = page.locator('body').inner_text()
    for forbidden in ('דרגת כותב', 'מתוך 5', 'חוקר היכל', 'חוקר מתעורר', 'דרגה 5'):
        assert forbidden not in body, ('legacy rank text on a public page', forbidden, tag)
    assert '/api/public-contributor-rank' not in calls, ('public page still reads the legacy rank endpoint', tag)
    assert page.locator('.pc-rank').count() == 0, tag
    labels = page.locator('.pc-person-labels li').all_inner_texts()
    assert labels == [label], ('capability label follows canonical kind', labels, tag)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), ('horizontal overflow', tag)
    seal = page.locator('.pc-person-seal').bounding_box()
    assert seal and seal['x'] >= 0 and seal['x'] + seal['width'] <= width + 1, ('medallion outside the viewport', seal, tag)
    toggle = page.locator('.pc-person-toggle')
    assert toggle.bounding_box()['height'] >= 44, ('toggle below 44px', tag)
    name = page.locator('h1').first.inner_text()
    assert toggle.inner_text().strip().startswith(f'הדרך של {name}'), (toggle.inner_text(), name)
    panel = page.locator('.pc-person-panel')
    assert panel.get_attribute('hidden') is not None and toggle.get_attribute('aria-expanded') == 'false', tag
    assert toggle.get_attribute('aria-controls') == panel.get_attribute('id'), tag
    # unknown is never zero in the summary strip
    assert 'ימי פעילות 0' not in body and 'ותק בקהילה 0' not in body, tag
    return name


def open_panel(page, slug, width, theme):
    tag = (slug, width, theme)
    toggle = page.locator('.pc-person-toggle'); panel = page.locator('.pc-person-panel')
    toggle.click()
    assert toggle.get_attribute('aria-expanded') == 'true' and panel.is_visible(), tag
    text = panel.inner_text()
    assert 'עדיין לא נמדד' in text and 'נתון שלא נמדד אינו מוצג כאפס' in text, ('unmeasured section missing', tag)
    assert 'מה נמדד' in text, tag
    assert 'עדיין לא הושלם' in text, ('unresolved Person binding must be stated', tag)
    assert page.locator('.pc-person-gaps li').count() >= 4, tag
    # the registration date is account registration, never community tenure
    assert 'ותק בקהילה' in text and ('לא נמדד' in text), tag
    small = page.evaluate('''() => [...document.querySelectorAll('.pc-person-panel :is(p,dt,dd,li,span,h2,h3,a)')]
        .filter((n) => n.textContent.trim()).map((n) => parseFloat(getComputedStyle(n).fontSize)).filter((s) => s < 14).length''')
    assert small == 0, ('text below 14px in the path panel', small, tag)
    return text


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox'])
        for i, slug in enumerate(PEOPLE):
            for j, width in enumerate(WIDTHS):
                for theme in THEMES:
                    context, page, calls = load(browser, slug, width, theme)
                    name = check_basics(page, calls, slug, width, theme)
                    case = {'slug': slug, 'width': width, 'theme': theme, 'label': PEOPLE[slug][0], 'view': PEOPLE[slug][1]}
                    if SHOTS:
                        page.evaluate('window.scrollTo(0,0)')
                        page.screenshot(path=str(OUT / f'{slug}-{width}-{theme}-closed.png'))
                    if theme == THEMES[(i + j) % 3]:
                        open_panel(page, slug, width, theme)
                        if SHOTS:
                            page.locator('.pc-profile').scroll_into_view_if_needed()
                            page.screenshot(path=str(OUT / f'{slug}-{width}-{theme}-open.png'))
                        case['opened'] = True
                    report['cases'].append(case)
                    context.close()

        # Keyboard, screen-reader semantics and reduced motion (one combination per person).
        for slug in PEOPLE:
            context, page, calls = load(browser, slug, 390, 'dark', reduced='reduce')
            stack = page.locator('.pc-person-stack')
            closed = stack.evaluate('n=>getComputedStyle(n).transform')
            assert closed.startswith('matrix3d('), ('reduced motion keeps the static depth pose', slug)
            assert stack.evaluate('n=>getComputedStyle(n).transitionDuration') == '0s', slug
            toggle = page.locator('.pc-person-toggle'); toggle.focus()
            assert toggle.evaluate('n=>getComputedStyle(n).outlineStyle') != 'none', ('visible keyboard focus', slug)
            page.keyboard.press('Enter'); assert toggle.get_attribute('aria-expanded') == 'true', slug
            assert stack.evaluate('n=>getComputedStyle(n).transform') == closed, ('no lift or motion on open under reduced motion', slug)
            assert page.locator('.pc-person-face').evaluate('n=>getComputedStyle(n).outlineStyle') != 'none', 'open state has a non-motion cue'
            page.keyboard.press('Space'); assert toggle.get_attribute('aria-expanded') == 'false', slug
            assert page.locator('.pc-person-scene').get_attribute('aria-hidden') == 'true'
            assert page.locator('.pc-person-panel').get_attribute('role') == 'region'
            context.close()
            context, page, calls = load(browser, slug, 1440, 'light', reduced='no-preference')
            assert page.locator('.pc-person-stack').evaluate('n=>getComputedStyle(n).transform').startswith('matrix3d('), ('3D depth is present', slug)
            context.close()

        # Fixture registration date: labelled as account registration, historical tenure still unmeasured.
        context, page, calls = load(browser, 'yaniv-levi', 390, 'parchment', mode='fixture')
        page.locator('.cx-facts').wait_for()
        assert 'נרשם לאתר' in page.locator('.cx-facts').inner_text() and 'חבר מאז' not in page.locator('.cx-facts').inner_text()
        text = open_panel(page, 'yaniv-levi', 390, 'parchment')
        assert 'נרשם לאתר ב' in text and 'אינה ותק בקהילה' in text
        if SHOTS: page.screenshot(path=str(OUT / 'fixture-registration-390-parchment-open.png'))
        context.close()

        # Return to the originating place still works from the writer page.
        context, page, calls = load(browser, 'yaniv-levi', 390, 'light')
        context.close()
        context = browser.new_context(viewport={'width': 390, 'height': 900}); page = context.new_page(); install(page, 'real')
        page.goto(f'{BASE}/community/researcher/yaniv-levi?returnTo=%2Fcommunity%2Fchat')
        page.locator('.pc-person').wait_for(timeout=60000)
        back = page.get_by_role('link', name='חזרה למקום שממנו הגעת')
        assert back.get_attribute('href') == '/community/chat'
        context.close()

        assert not report['errors'], report['errors']
        assert not report['forbidden_requests'], report['forbidden_requests']
        (OUT / 'results.json' if SHOTS else Path('/tmp/medallion-results.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(json.dumps({'cases': len(report['cases']), 'errors': report['errors'], 'unexpected_writes': report['forbidden_requests'], 'blocked_telemetry': report['blocked_telemetry']}, ensure_ascii=False))
        browser.close()
finally:
    server.shutdown(); server.server_close()
