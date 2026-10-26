"""Community author card on direct (cold) entry: stylesheet, writer label, return target.
Built App2029 served locally; every external request is intercepted; no live data or writes.
Run after `npm run build:2029`.
"""
import functools, json, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
import glob, os
CHROMIUM = os.environ.get('CHROMIUM_PATH') or next(iter(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome')), '/usr/bin/chromium')
OUT = ROOT / 'work/evidence/community-card-cold-entry'; OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / 'dist/2029.html').read_text()
A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'  # public dossier, kind=author (writer capability)
B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'  # public dossier, kind=community (no writer capability)
C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'  # no public dossier
DOSSIERS = {
    A: {'slug': 'writer-a', 'code': None, 'display_name': 'כותב בדיקה', 'active': True, 'locked': False, 'building': False, 'kind': 'author', 'visibility': 'public'},
    B: {'slug': 'member-b', 'code': None, 'display_name': 'חברת בדיקה', 'active': True, 'locked': False, 'building': False, 'kind': 'community', 'visibility': 'public'},
}
NAMES = {A: 'כותב בדיקה', B: 'חברת בדיקה', C: 'חבר בדיקה'}


class Files(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Files, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:' + str(server.server_port)
report = {'checks': [], 'errors': []}


def row(n, author):
    return {'id': f'40000000-0000-4000-8000-{n:012d}', 'parent_id': None, 'author_contributor_id': author, 'author_user_id': None,
            'author_name': NAMES[author], 'title': None, 'body': f'הודעת בדיקה {n}', 'created_at': '2026-10-22T10:00:00Z', 'origin': 'community_2029',
            'reactions': {}, 'target_type': None, 'target_id': None,
            'contributor': {'id': author, 'user_id': None, 'display_name': NAMES[author], 'avatar_url': None}}


def install(page):
    page.on('pageerror', lambda error: report['errors'].append(str(error)))

    def route(r):
        req = r.request; u = urlparse(req.url); q = parse_qs(u.query); name = u.path.rsplit('/', 1)[-1]
        if u.hostname == '127.0.0.1':
            if req.is_navigation_request(): return r.fulfill(content_type='text/html', body=HTML)
            if u.path.startswith('/api/'): return r.fulfill(json={'state': 'unavailable'})
            return r.continue_()
        if u.hostname != 'linswmnnkjxvweumprav.supabase.co': return r.abort()
        select = q.get('select', [''])[0]; single = 'vnd.pgrst.object' in req.headers.get('accept', '')
        data = []
        if name == 'contributors':
            key = next((k for k in ('id', 'user_id') if k in q), None)
            wanted = q.get(key, [''])[0].replace('eq.', '') if key else ''
            if 'slug' in select and key == 'id': data = [DOSSIERS[wanted]] if wanted in DOSSIERS else []
            elif single: data = {'user_id': None}
        elif name == 'research_contributions' and 'reactions' in select:
            if select == 'created_at,reactions': data = [{'created_at': '2020-01-01T00:00:00Z', 'reactions': {}}]
            else:
                if 'author_contributor_id' in str(q):
                    data = [row(n, A) for n in range(1, 4)]
                else:
                    data = [row(n + 1, author) for n, author in enumerate([A, B, C, A])]
        body = data if single is False else (data or None)
        headers = {'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range',
                   'content-range': f'0-{max(0, len(data) - 1) if isinstance(data, list) else 0}/{len(data) if isinstance(data, list) else 1}'}
        return r.fulfill(content_type='application/json', headers=headers, body=json.dumps(body))
    page.route('**/*', route)


def card_state(page):
    page.locator('.sod29-community-card').wait_for(timeout=15000)
    page.wait_for_load_state('networkidle')
    page.evaluate('document.fonts.ready')
    return page.evaluate('''() => {
        const backdrop = document.querySelector('.sod29-community-card-backdrop');
        const card = document.querySelector('.sod29-community-card').getBoundingClientRect();
        return { position: getComputedStyle(backdrop).position, top: card.top, bottom: card.bottom, vh: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth };
    }''')


ROUTES = {'canonical': '/community/chat', 'preview': '/2029?preview=community&data=live'}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox'])
        for width in (390, 1440):
            for theme in ('light', 'dark'):
                for label, path in ROUTES.items():
                    sep = '&' if '?' in path else '?'
                    context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                    context.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
                    page = context.new_page(); install(page)
                    # A: writer capability -> chip + writer link with the exact return target
                    page.goto(f'{BASE}{path}{sep}memberCard={A}')
                    state = card_state(page)
                    tag = (width, theme, label)
                    assert state['position'] == 'fixed', ('cold entry lost the community stylesheet', tag, state)
                    assert 0 <= state['top'] and state['bottom'] <= state['vh'] + 1, ('card is not an in-viewport dialog', tag, state)
                    assert not state['overflow'], ('horizontal overflow', tag)
                    card = page.locator('.sod29-community-card')
                    assert card.locator('.sod29-community-writer-chip').count() == 1, ('writer chip missing for author capability', tag)
                    link = card.get_by_role('link', name='לדף הכותב ←')
                    href = link.get_attribute('href'); parsed = urlparse(href)
                    assert parsed.path == '/community/researcher/writer-a', href
                    back = parse_qs(parsed.query).get('returnTo', [None])[0]
                    assert back == path, ('return target', back, path, tag)
                    if width == 390:
                        # last action stays reachable above the bottom command island once the card is scrolled to its end
                        page.evaluate("document.querySelector('.sod29-community-card').scrollTo(0, 1e6)")
                        last = card.locator('.sod29-community-card-full').last.bounding_box()
                        assert last['y'] + last['height'] <= state['vh'] - 70, ('last card action hidden behind the bottom island', tag, last)
                        page.evaluate("document.querySelector('.sod29-community-card').scrollTo(0, 0)")
                    if (width, theme, label) == (390, 'light', 'canonical'):
                        page.screenshot(path=str(OUT / 'card-writer-390-light.png'))
                        link.click(); page.wait_for_url(lambda url: '/community/researcher/writer-a' in url)
                    context.close()
                    # B: public dossier without writer capability -> no writer chip, neutral link label
                    context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                    page = context.new_page(); install(page)
                    page.goto(f'{BASE}{path}{sep}memberCard={B}'); card_state(page)
                    card = page.locator('.sod29-community-card')
                    assert card.locator('.sod29-community-writer-chip').count() == 0, ('community member mislabeled as writer', tag)
                    assert card.get_by_role('link', name='לדף הכותב ←').count() == 0, tag
                    assert card.get_by_role('link', name='לדף הפרופיל ←').count() == 1, ('neutral profile link missing', tag)
                    if (width, theme, label) == (390, 'light', 'canonical'): page.screenshot(path=str(OUT / 'card-member-390-light.png'))
                    context.close()
                    # C: no public dossier -> card as before, no extra link
                    context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                    page = context.new_page(); install(page)
                    page.goto(f'{BASE}{path}{sep}memberCard={C}'); card_state(page)
                    card = page.locator('.sod29-community-card')
                    assert card.locator('.sod29-community-writer-chip').count() == 0
                    assert card.get_by_role('link').count() == 0, ('no-dossier author must get no profile link', tag)
                    assert card.get_by_role('button', name='לעמוד הכותב המלא ←').count() == 1
                    context.close()
                    report['checks'].append({'width': width, 'theme': theme, 'route': label})
        assert not report['errors'], report['errors']
        (OUT / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)); print(json.dumps(report, ensure_ascii=False))
        browser.close()
finally:
    server.shutdown(); server.server_close()
