"""Actual writer/World components with synthetic anonymous HTTP responses.
Starts/stops isolated Vite; no live data, product mutations or hosted Preview.
"""
import atexit
import base64
import json
import os
import subprocess
import tempfile
import time
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import urlopen
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:' + os.environ.get('WORLD_FOCUS_PORT', '5192')
OUT = ROOT / 'work/evidence/world-writer-source-focus'
OUT.mkdir(parents=True, exist_ok=True)
CACHE = tempfile.TemporaryDirectory(prefix='world-writer-source-focus-vite-')
LOG = open(OUT / 'vite.log', 'w')
CONFIG = {'cacheDir': CACHE.name, 'server': {'host': '127.0.0.1', 'port': urlparse(BASE).port, 'strictPort': True, 'hmr': False}}
SERVER = subprocess.Popen(['node', '--input-type=module', '-e',
    'import {createServer} from "vite";const server=await createServer(' + json.dumps(CONFIG) + ');await server.listen();'], cwd=ROOT, stdout=LOG, stderr=subprocess.STDOUT)


def stop_server():
    SERVER.terminate()
    try: SERVER.wait(timeout=5)
    except subprocess.TimeoutExpired: SERVER.kill(); SERVER.wait()
    LOG.close()
    CACHE.cleanup()


atexit.register(stop_server)
for _ in range(150):
    if SERVER.poll() is not None: raise RuntimeError('Vite failed; see ' + str(OUT / 'vite.log'))
    try:
        with urlopen(BASE, timeout=0.3): break
    except OSError: time.sleep(0.1)
else: raise RuntimeError('Vite did not become ready')

FIXTURE = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import * as m from './src/components/contributor2029/publicSourceCatalog2029Fixtures.js';"
    "console.log(JSON.stringify({identity:m.catalogFixtureIdentity,sources:m.catalogFixtureSources(65)}))"], cwd=ROOT, text=True))
TZVI = {**FIXTURE['identity'], 'wa_names': ['צבי'], 'public_visibility': 'public'}
NERIA = {'id': '22222222-2222-4222-8222-222222222222', 'slug': 'neria-deutsch', 'display_name': 'נריה · נתוני בדיקה',
    'active': True, 'wa_names': [], 'public_visibility': 'public', 'user_id': '33333333-3333-4333-8333-333333333333'}
PRIVATE = {'id': '44444444-4444-4444-8444-444444444444', 'slug': 'private-writer', 'display_name': 'PRIVATE_IDENTITY_MARKER',
    'active': True, 'public_visibility': 'private', 'wa_names': []}
POSTS = [{'id': 5038 + i, 'slug': 'fixture-article-' + str(i), 'title': 'מאמר בדיקה ' + str(i),
    'author': 'צבי', 'date': '2026-01-01T12:00:00Z'} for i in range(5)]
CIPHERS = [{'id': 'cipher-' + str(i), 'slug': 'fixture-cipher-' + str(i), 'title': 'צופן בדיקה ' + str(i),
    'author_name': NERIA['display_name'], 'owner_user_id': NERIA['user_id'] if i < 4 else 'system-uploader',
    'status': 'published', 'visibility': 'public'} for i in range(6)]
HTML = '<!doctype html><html lang="he" dir="rtl"><head><title>בדיקת ניווט מקור</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/world-writer-source-focus-2029.jsx"></script></body></html>'
REPORT = {'cases': [], 'errors': []}


def setup(context, fail_posts=False):
    page = context.new_page()
    calls, violations = [], []
    page.on('pageerror', lambda error: REPORT['errors'].append({'message': str(error), 'stack': error.stack}))

    def intercept(route):
        request, url = route.request, urlparse(route.request.url)
        if url.hostname == '127.0.0.1':
            if url.path == '/world' or url.path.startswith(('/community/researcher/', '/fixture-article-')):
                return route.fulfill(content_type='text/html', body=HTML)
            if url.path.startswith('/api/'):
                if request.method != 'GET': violations.append('unexpected local mutation')
                return route.fulfill(status=503, content_type='application/json', body='{"state":"unavailable"}')
            return route.continue_()
        if url.hostname != 'linswmnnkjxvweumprav.supabase.co' or '/rest/v1/' not in url.path:
            return route.fulfill(status=204, body='')
        table, query = url.path.rsplit('/', 1)[1], parse_qs(url.query)
        if request.method not in ['GET', 'HEAD', 'OPTIONS'] and table != 'writer_public_contributions_page_v1':
            violations.append('unexpected mutation: ' + table)
        claims = json.loads(base64.urlsafe_b64decode(request.headers['authorization'].split()[-1].split('.')[1] + '=='))
        if claims['role'] != 'anon': violations.append('non-anonymous public reader')
        if table in ['research_objects', 'world_contributor_research_v1']: violations.append('full research on entry')
        calls.append(table)
        data = []
        if table == 'contributors':
            data = [TZVI, NERIA, PRIVATE]
            for key in ['id', 'slug', 'code']:
                value = query.get(key, [''])[0]
                if value.startswith('eq.'): data = [row for row in data if str(row.get(key)) == value[3:]]
        elif table == 'channel_updates' and query.get('contributor_id') == ['eq.' + TZVI['id']]:
            data = FIXTURE['sources']
        elif table == 'posts':
            if fail_posts: return route.fulfill(status=503, content_type='application/json', body='{"message":"fixture reader unavailable"}')
            if 'author.eq."צבי"' in query.get('or', [''])[0]: data = POSTS
        elif table == 'els_records':
            if NERIA['display_name'] in query.get('or', [''])[0]: data = CIPHERS
        elif table not in ['channel_updates', 'research_contributions', 'insights', 'nodes', 'topic_cards_public', 'writer_public_contributions_page_v1', 'gematria_words']:
            violations.append('unexpected reader: ' + table)
        start, size = int(query.get('offset', ['0'])[0]), int(query.get('limit', ['1000'])[0])
        return route.fulfill(content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps(data[start:start + size]))

    page.route('**/*', intercept)
    return page, calls, violations


def assert_target(page, ref='posts:5038', maximum=13):
    target = page.locator('article[data-source-ref="' + ref + '"]')
    expect(target).to_be_visible()
    expect(target).to_be_focused()
    expect(target).to_be_in_viewport()
    assert page.locator('.sod29-world-public-material-grid > article').count() <= maximum
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    return target


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
    for width in [320, 390, 1440]:
        for theme in ['light', 'parchment', 'dark']:
            context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
            page, calls, violations = setup(context)
            writer = '/community/researcher/tzvi-opoc?' + urlencode({'section': 'all', 'item': 'post:5038', 'theme': theme})
            page.goto(BASE + writer)
            page.get_by_role('link', name='מאמר בדיקה 0', exact=True).click()
            page.wait_for_url('**/world?**')
            world_path = page.url.removeprefix(BASE)
            target = assert_target(page)
            assert target.get_by_role('link', name='למקור ←').get_attribute('href') == '/fixture-article-0'
            target.get_by_role('link', name='למקור ←').click()
            page.get_by_role('heading', name='מקור המאמר המקורי · נתוני בדיקה').wait_for()
            page.go_back()
            assert_target(page)
            page.locator('.sod29-world-selected-source').get_by_role('link', name='לדף הכתב', exact=True).click()
            back = page.locator('.pc-return')
            expect(back).to_be_visible()
            assert back.get_attribute('href') == world_path
            back.click()
            assert_target(page)
            page.reload()
            assert_target(page)
            assert page.locator('html').get_attribute('data-theme-preset') == theme
            page.get_by_role('button', name='כתבים ופוסטים', exact=True).click()
            expect(page.locator('.sod29-world-public-material-grid > article')).to_have_count(5)
            page.get_by_role('button', name='נושאים', exact=True).click()
            page.get_by_text('המקור שבקישור מוסתר במסנן הנוכחי.', exact=True).wait_for()
            assert page.locator('.sod29-world-public-material-grid > article').count() == 0
            assert not violations, violations
            assert not REPORT['errors'], REPORT['errors'][:1]
            REPORT['cases'].append({'width': width, 'theme': theme, 'flow': 'writer-world-native-link-back-writer-return-reload-filter', 'initial_world_cards': 13, 'violations': violations})
            context.close()

    for scenario in ['unknown-source', 'private-writer', 'partial-reader', 'neria']:
        context = browser.new_context(viewport={'width': 390, 'height': 1000})
        page, calls, violations = setup(context, fail_posts=scenario == 'partial-reader')
        source = 'private-writer' if scenario == 'private-writer' else 'neria-deutsch' if scenario == 'neria' else 'tzvi-opoc'
        ref = 'posts:missing' if scenario == 'unknown-source' else 'els_records:cipher-5' if scenario == 'neria' else 'posts:5038'
        page.goto(BASE + '/world?' + urlencode({'view': 'sources', 'source': source, 'sourceRef': ref}))
        if scenario == 'neria':
            assert_target(page, ref)
            expect(page.locator('.sod29-world-public-material-grid > article')).to_have_count(6)
        else:
            page.get_by_text('לא ניתן לאמת את המקור שבקישור מתוך המידע שנטען.' if scenario == 'partial-reader'
                else 'המקור שבקישור אינו זמין בתצוגה הציבורית.', exact=True).wait_for()
            assert page.locator('article[data-source-ref="' + ref + '"]').count() == 0
            if scenario == 'private-writer':
                assert 'posts' not in calls and 'channel_updates' not in calls
        assert 'PRIVATE_IDENTITY_MARKER' not in page.locator('body').inner_text()
        assert not violations, violations
        assert not REPORT['errors'], REPORT['errors'][:1]
        REPORT['cases'].append({'scenario': scenario, 'violations': violations, 'requests': len(calls)})
        context.close()
    browser.close()

(OUT / 'results.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2))
print(json.dumps({'cases': len(REPORT['cases']), 'errors': REPORT['errors']}, ensure_ascii=False))
