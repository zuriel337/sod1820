"""Person family visual acceptance on REAL public data: reading size, semantic roles, hierarchy, mobile.
Pages: Tzvi (source catalogue), Yaniv (general writer page) and Emily (old-chat author entered from the community).
The built App2029 is served locally. Supabase reads are real anonymous reads forwarded through the sandbox proxy
(TLS verified against its CA bundle); /api/* is stubbed and every write/telemetry path is blocked.
Run after `npm run build:2029`. Usage: python3 test/writer-visual-family-2029.browser.py [--shots]
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
EMILY = 'e7581ab5-8c15-4832-b602-f361e41ff373'
PAGES = {  # name -> (path, expected capability label)
    'tzvi': ('/community/researcher/tzvi-opoc', 'חבר קהילה'),
    'yaniv': ('/community/researcher/yaniv-levi', 'כותב'),
    'emily': (f'/community/chat?member={EMILY}', 'חבר קהילה'),
}
WIDTHS = (320, 390, 1440)
THEMES = ('light', 'parchment', 'dark')
# Design V2 semantic roles per preset (section 4): action text, secondary (depth/kind), discovery (research/source, focus).
ROLES = {
    'light': {'action': (36, 84, 184), 'secondary': (114, 73, 165), 'discovery': (8, 108, 112)},
    'parchment': {'action': (40, 78, 159), 'secondary': (118, 75, 135), 'discovery': (23, 105, 101)},
    'dark': {'action': (168, 199, 255), 'secondary': (194, 168, 250), 'discovery': (105, 222, 215)},
}
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


def load(browser, name, width, theme, reduced='no-preference'):
    context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion=reduced)
    context.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
    page = context.new_page(); install(page)
    page.goto(BASE + PAGES[name][0])
    page.locator('.pc-person').wait_for(timeout=90000)
    page.wait_for_load_state('networkidle'); page.evaluate('document.fonts.ready')
    return context, page


def open_messages(page):
    thread = page.locator('.sod29-community-thread').first
    if thread.count() == 0:
        button = page.get_by_role('button', name='כתיבה בקהילה', exact=True)
        if button.count():
            button.first.click(); page.wait_for_timeout(3000)
        thread = page.locator('.sod29-community-thread').first
    if thread.count(): thread.wait_for(timeout=60000)
    return thread


def check_hierarchy(page, name, width, theme):
    tag = (name, width, theme)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), ('horizontal overflow', tag)
    assert page.locator('.pc-rank').count() == 0, tag
    labels = page.locator('.pc-person-labels li').all_inner_texts()
    assert labels == [PAGES[name][1]], (labels, tag)
    seal = page.locator('.pc-person-seal').bounding_box(); h1 = page.locator('h1').first.bounding_box()
    # identity first: the medallion sits on the start (right) side, level with the name block
    assert seal['x'] + seal['width'] / 2 > h1['x'] + h1['width'] / 2, ('medallion must be on the start side in RTL', seal, h1, tag)
    assert abs((seal['y'] + seal['height'] / 2) - (h1['y'] + h1['height'] / 2)) < 200, ('medallion is not beside the name', seal, h1, tag)
    toggle = page.locator('.pc-person-toggle').bounding_box()
    assert toggle['height'] >= 44, tag
    # semantic roles
    want = ROLES[theme]
    eyebrow = rgb(page.locator('.pc-eyebrow').first.evaluate('n=>getComputedStyle(n).color'))
    assert eyebrow == want['action'], ('eyebrow uses the action role', eyebrow, want['action'], tag)
    toggle_color = rgb(page.locator('.pc-person-toggle').evaluate('n=>getComputedStyle(n).color'))
    assert toggle_color == want['action'], ('path control uses the action role', toggle_color, tag)
    active = page.locator('.pc-filters button[aria-pressed=true]').first
    if active.count():
        assert rgb(active.evaluate('n=>getComputedStyle(n).borderBottomColor')) == want['action'], ('active tab uses the action role', tag)
    world = page.locator('.pc-filters .pc-world')
    if world.count(): assert rgb(world.first.evaluate('n=>getComputedStyle(n).color')) == want['discovery'], ('world link uses the discovery role', tag)
    kind = page.locator('.pc-item-meta > span:first-child').first
    if kind.count(): assert rgb(kind.evaluate('n=>getComputedStyle(n).color')) == want['secondary'], ('content kind uses the secondary role', tag)
    # keyboard focus uses the focus (discovery) role and is visible
    page.locator('.pc-person-toggle').focus()
    ring = page.locator('.pc-person-toggle').evaluate('n=>[getComputedStyle(n).outlineStyle,getComputedStyle(n).outlineColor]')
    assert ring[0] != 'none' and rgb(ring[1]) == want['discovery'], ('visible focus ring in the discovery role', ring, tag)


def check_reading(page, name, width, theme):
    tag = (name, width, theme); thread = open_messages(page)
    if not thread.count(): return {'messages': 0}
    thread.scroll_into_view_if_needed()
    sizes = page.evaluate('''() => {
        const t = document.querySelector('.sod29-community-thread');
        const px = (n) => n ? parseFloat(getComputedStyle(n).fontSize) : null;
        const body = t.querySelector('.sod29-community-body');
        const actions = [...t.querySelectorAll('.sod29-community-thread-actions button, .sod29-community-thread-actions a')];
        return { body: px(body), line: body ? parseFloat(getComputedStyle(body).lineHeight) : null, measure: body ? body.getBoundingClientRect().width : null,
                 meta: px(t.querySelector('.sod29-community-author time')), actions: actions.map((n) => [px(n), n.getBoundingClientRect().height]) };
    }''')
    assert sizes['body'] == 18, ('message text must read at 18px', sizes, tag)
    assert sizes['line'] >= 1.6 * 18, ('reading rhythm', sizes, tag)
    assert sizes['meta'] is None or sizes['meta'] >= 14, ('meta floor', sizes, tag)
    for size, height in sizes['actions']:
        assert size >= 16 and height >= 44 - 1, ('message actions read at 16px with 44px targets', sizes['actions'], tag)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), ('overflow in messages', tag)
    return {'messages': 1, 'body': sizes['body'], 'meta': sizes['meta']}


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox'])
        for i, name in enumerate(PAGES):
            for j, width in enumerate(WIDTHS):
                for theme in THEMES:
                    context, page = load(browser, name, width, theme)
                    check_hierarchy(page, name, width, theme)
                    case = {'page': name, 'width': width, 'theme': theme}
                    if SHOTS:
                        page.evaluate('window.scrollTo(0,0)'); page.screenshot(path=str(OUT / f'{name}-{width}-{theme}-top.png'))
                    rotate = theme == THEMES[(i + j) % 3]
                    case.update(check_reading(page, name, width, theme) if (rotate or width == 390) else {})
                    if SHOTS and rotate and case.get('messages'):
                        page.evaluate("(() => { const t = document.querySelector('.sod29-community-thread'); window.scrollTo(0, window.scrollY + t.getBoundingClientRect().top - 150); })()")
                        page.wait_for_timeout(250); page.screenshot(path=str(OUT / f'{name}-{width}-{theme}-reading.png'))
                    if rotate:
                        page.evaluate('window.scrollTo(0,0)')
                        toggle = page.locator('.pc-person-toggle'); toggle.click()
                        assert toggle.get_attribute('aria-expanded') == 'true' and page.locator('.pc-person-panel').is_visible()
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (name, width, theme, 'overflow open')
                        if SHOTS:
                            page.screenshot(path=str(OUT / f'{name}-{width}-{theme}-open.png'))
                        case['opened'] = True
                    report['cases'].append(case)
                    context.close()

        # Keyboard and reduced motion keep the same meaning (one combination per page).
        for name in PAGES:
            context, page = load(browser, name, 390, 'dark', reduced='reduce')
            stack = page.locator('.pc-person-stack')
            assert stack.evaluate('n=>getComputedStyle(n).transitionDuration') == '0s', name
            toggle = page.locator('.pc-person-toggle'); toggle.focus(); page.keyboard.press('Enter')
            assert toggle.get_attribute('aria-expanded') == 'true', name
            page.keyboard.press('Space'); assert toggle.get_attribute('aria-expanded') == 'false', name
            context.close()

        # Community -> card -> Person page -> back, on the real old-chat author.
        context = browser.new_context(viewport={'width': 390, 'height': 900}); page = context.new_page(); install(page)
        page.goto(f'{BASE}/community/chat?memberCard={EMILY}')
        card = page.locator('.sod29-community-card'); card.wait_for(timeout=90000)
        assert card.evaluate('n=>getComputedStyle(n.parentElement).position') == 'fixed'
        sizes = card.evaluate('''n => ({ time: parseFloat(getComputedStyle(n.querySelector('.sod29-community-card-messages time')||n).fontSize),
            p: parseFloat(getComputedStyle(n.querySelector('.sod29-community-card-messages p')||n).fontSize) })''')
        assert sizes['time'] >= 14 and sizes['p'] >= 16, ('card text floors', sizes)
        card.get_by_role('button', name='לעמוד הכותב המלא ←').click()
        page.locator('.pc-person').wait_for(timeout=90000)
        assert page.locator('.pc-person-labels li').all_inner_texts() == ['חבר קהילה']
        context.close()

        assert not report['errors'], report['errors']
        assert not report['unexpected_writes'], report['unexpected_writes']
        target = OUT / 'results.json' if SHOTS else Path('/tmp/visual-family-results.json')
        target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(json.dumps({'cases': len(report['cases']), 'errors': report['errors'], 'unexpected_writes': report['unexpected_writes'], 'blocked_telemetry': report['blocked_telemetry']}, ensure_ascii=False))
        browser.close()
finally:
    server.shutdown(); server.server_close()
