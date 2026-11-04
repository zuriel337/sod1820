"""Writer reader regressions: real 2029 components, synthetic anonymous HTTP data.
Starts an isolated Vite server on WRITER_COVERAGE_PORT (default 5188).
Set WRITER_COVERAGE_EXTERNAL_SERVER=1 to reuse a server instead.
All external requests are intercepted; no live write or hosted-Preview claim.
"""
import base64
import atexit
import json
import os
import subprocess
import tempfile
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:' + os.environ.get('WRITER_COVERAGE_PORT', '5188')
OUT = ROOT / 'work/evidence/writer-authorship-coverage'
OUT.mkdir(parents=True, exist_ok=True)
if os.environ.get('WRITER_COVERAGE_EXTERNAL_SERVER') != '1':
    cache = tempfile.TemporaryDirectory(prefix='writer-authorship-vite-')
    server_log = open(OUT / 'vite.log', 'w')
    config = {'cacheDir': cache.name, 'server': {'host': '127.0.0.1', 'port': int(urlparse(BASE).port), 'strictPort': True, 'hmr': False}}
    server = subprocess.Popen(['node', '--input-type=module', '-e',
        'import {createServer} from "vite"; const server=await createServer(' + json.dumps(config) + ');await server.listen();'],
        cwd=ROOT, stdout=server_log, stderr=subprocess.STDOUT)

    def stop_server():
        server.terminate()
        try: server.wait(timeout=5)
        except subprocess.TimeoutExpired: server.kill(); server.wait()
        server_log.close()
        cache.cleanup()

    atexit.register(stop_server)
    for _ in range(150):
        if server.poll() is not None: raise RuntimeError('Vite failed; see ' + str(OUT / 'vite.log'))
        try:
            with urlopen(BASE, timeout=0.3): break
        except OSError: time.sleep(0.1)
    else: raise RuntimeError('Vite did not become ready')
fixture = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import * as m from './src/components/contributor2029/publicSourceCatalog2029Fixtures.js';"
    "console.log(JSON.stringify({identity:m.catalogFixtureIdentity,sources:m.catalogFixtureSources()}))"], cwd=ROOT, text=True))
TZVI = {**fixture['identity'], 'public_visibility': 'public'}
NERIA = {'id': '22222222-2222-4222-8222-222222222222', 'slug': 'neria-deutsch', 'code': '2042',
    'display_name': 'כותב בדיקה לצפנים', 'active': True, 'wa_names': [], 'user_id': '33333333-3333-4333-8333-333333333333'}
TZVI['wa_names'] = ['צבי']
POSTS = [{'id': 5000 + i, 'slug': 'fixture-article-' + str(i), 'title': 'מאמר בדיקה ' + str(i),
    'author': 'צבי', 'date': '2026-01-01T12:00:00Z'} for i in range(5)]
CIPHERS = [{'id': 'cipher-' + str(i), 'slug': 'fixture-cipher-' + str(i), 'title': 'צופן בדיקה ' + str(i),
    'author_name': NERIA['display_name'], 'owner_user_id': NERIA['user_id'] if i < 4 else 'system-uploader',
    'status': 'published', 'visibility': 'public', 'created_at': '2026-01-01T12:00:00Z'} for i in range(6)]
REPORT = {'cases': [], 'errors': []}

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
    for width, theme, slug, admin in [(w, t, s, False) for w in [320, 390, 1440]
        for t in ['light', 'parchment', 'dark'] for s in ['tzvi-opoc', 'neria-deutsch']] + [(390, 'dark', s, True) for s in ['tzvi-opoc', 'neria-deutsch']]:
        context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
        if admin:
            def part(value): return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
            token = part({'alg': 'HS256'}) + '.' + part({'sub': NERIA['user_id'], 'role': 'authenticated', 'app_metadata': {'role': 'admin'}, 'exp': 4102444800}) + '.synthetic'
            session = {'access_token': token, 'refresh_token': 'synthetic', 'expires_at': 4102444800,
                'expires_in': 3600, 'token_type': 'bearer', 'user': {'id': NERIA['user_id'], 'app_metadata': {'role': 'admin'}}}
            context.add_init_script('localStorage.setItem("sb-linswmnnkjxvweumprav-auth-token",' + json.dumps(json.dumps(session)) + ')')
        page = context.new_page()
        calls, violations = [], []
        page.on('pageerror', lambda error: REPORT['errors'].append({'message': str(error), 'stack': error.stack}))

        def intercept(route):
            request = route.request
            url = urlparse(request.url)
            if url.hostname == '127.0.0.1':
                if url.path == '/work/contributor-review.html' or url.path.startswith('/community/researcher/'):
                    return route.fulfill(content_type='text/html', body='<!doctype html><html lang="he" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/public-contributor-2029-review.jsx"></script></body></html>')
                if url.path.startswith('/api/'):
                    if request.method != 'GET': violations.append('unexpected local mutation: ' + url.path)
                    return route.fulfill(status=503, content_type='application/json', body='{"state":"unavailable"}')
                return route.continue_()
            if url.hostname != 'linswmnnkjxvweumprav.supabase.co' or '/rest/v1/' not in url.path:
                return route.fulfill(status=204, body='')
            table = url.path.rsplit('/', 1)[1]
            readonly_rpc = table == 'writer_public_contributions_page_v1'
            if request.method not in ['GET', 'HEAD', 'OPTIONS'] and not readonly_rpc:
                violations.append('unexpected mutation: ' + table)
            claims = json.loads(base64.urlsafe_b64decode(request.headers['authorization'].split()[-1].split('.')[1] + '=='))
            if claims['role'] != 'anon': violations.append('non-anonymous public read')
            if table in ['research_objects', 'world_contributor_research_v1']:
                violations.append('full research loaded on entry')
            calls.append(table)
            query = parse_qs(url.query)
            data = []
            if table == 'contributors':
                data = [TZVI, NERIA]
                for key in ['slug', 'code', 'id']:
                    if key in query and query[key][0].startswith('eq.'):
                        data = [row for row in data if str(row.get(key)) == query[key][0][3:]]
            elif table == 'channel_updates' and slug == 'tzvi-opoc' and query.get('contributor_id', [''])[0] == 'eq.' + TZVI['id']:
                data = fixture['sources']
            elif table == 'posts' and slug == 'tzvi-opoc':
                if 'author.eq."צבי"' not in query.get('or', [''])[0]: violations.append('missing registered post alias')
                data = POSTS
            elif table == 'els_records' and slug == 'neria-deutsch':
                data = CIPHERS
            elif table not in ['channel_updates', 'research_contributions', 'posts', 'els_records', 'insights', 'nodes', 'topic_cards_public', 'writer_public_contributions_page_v1', 'gematria_words']:
                violations.append('unexpected reader: ' + table)
            return route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps(data))

        page.route('**/*', intercept)
        scenario = 'loader-tzvi' if slug == 'tzvi-opoc' else 'loader'
        page.goto(BASE + '/work/contributor-review.html?scenario=' + scenario + '&theme=' + theme)
        try:
            page.get_by_role('heading', name=(TZVI if slug == 'tzvi-opoc' else NERIA)['display_name'], exact=True).wait_for()
        except Exception:
            print(json.dumps({'errors': REPORT['errors'], 'calls': calls, 'violations': violations, 'body': page.locator('body').inner_text()}, ensure_ascii=False))
            raise
        if slug == 'tzvi-opoc':
            assert page.locator('[data-catalog-source]').count() == 20
            page.get_by_role('button', name='כל הכתבים', exact=True).click()
            page.get_by_role('button', name='הבא', exact=True).click()
            page.wait_for_url('**page=2')
            expect(page.locator('[data-catalog-source]')).to_have_count(9)
            for i in range(5):
                link = page.get_by_role('link', name='מאמר בדיקה ' + str(i), exact=True)
                assert parse_qs(urlparse(link.get_attribute('href')).query)['sourceRef'] == ['posts:' + str(5000 + i)]
            page.reload()
            page.get_by_role('link', name='מאמר בדיקה 4', exact=True).wait_for()
        else:
            assert page.locator('.pc-item').count() == 6
            assert page.get_by_role('link', name='צופן בדיקה 4', exact=True).count() == 1
            assert page.get_by_role('link', name='צופן בדיקה 5', exact=True).count() == 1
            assert 'חשבון המעלה עשוי להיות שונה' in page.locator('body').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, theme, slug)
        assert not violations, violations
        assert not REPORT['errors'], REPORT['errors'][:1]
        REPORT['cases'].append({'width': width, 'theme': theme, 'slug': slug, 'seeded_admin_session': admin,
            'public_requests_anonymous': True, 'full_research_reads': 0, 'network_writes': 0,
            'request_count': len(calls), 'post_reload_preserved': slug == 'tzvi-opoc'})
        context.close()
    browser.close()

assert not REPORT['errors'], REPORT['errors']
(OUT / 'results.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2))
print(json.dumps({'cases': len(REPORT['cases']), 'errors': REPORT['errors']}, ensure_ascii=False))
