"""Built App2029: native community keys -> shared Person view -> preserved feed/reply.
Synthetic anonymous HTTP fixtures only; all real network writes are blocked.
Run after npm run build:2029. Evidence is written outside the checkout.
"""
import base64, functools, json, subprocess, threading, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'dist/2029.html').read_text()
EMILY = 'e7581ab5-8c15-4832-b602-f361e41ff373'
YANIV = '66666666-6666-4666-8666-666666666666'
YANIV_ACCOUNT = '22222222-2222-4222-8222-222222222222'
PRIVATE = '44444444-4444-4444-8444-444444444444'
SELF_ACCOUNT = '02a0d207-0136-4beb-a34d-8ff57d10cd85'
SELF_SOURCE = '4cd9c034-0464-4600-a35d-7156f0584d9b'
OTHER_ACCOUNT = 'b6ce542a-2b07-4749-8aba-532c886f6de7'
OTHER_SOURCE = '19936860-6b35-4386-bc44-113289858ff0'
fixture = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import*as m from'./src/components/contributor2029/publicSourceCatalog2029Fixtures.js';console.log(JSON.stringify({identity:m.catalogFixtureIdentity,sources:m.catalogFixtureSources()}))"], cwd=ROOT, text=True))
TZVI = {**fixture['identity'], 'kind': 'contributor', 'public_visibility': 'public', 'visibility': 'public', 'wa_names': ['צבי']}
PEOPLE = [TZVI,
    {'id': EMILY, 'slug': 'archive-source', 'kind': 'external', 'active': True, 'display_name': 'PRIVATE_DOSSIER_NAME',
     'user_id': None, 'public_visibility': 'private', 'visibility': 'private', 'bio': 'PRIVATE_DOSSIER_BIO', 'avatar_url': 'https://private.invalid/portrait'},
    {'id': YANIV, 'slug': 'yaniv-levi', 'kind': 'author', 'active': True, 'display_name': 'יניב לוי', 'user_id': YANIV_ACCOUNT,
     'public_visibility': 'public', 'visibility': 'public', 'wa_names': []},
    {'id': PRIVATE, 'slug': 'private-source', 'kind': 'community', 'active': True, 'display_name': 'PRIVATE_PERSON',
     'user_id': None, 'public_visibility': 'private', 'visibility': 'private'},
    {'id': '55555555-5555-4555-8555-555555555555', 'slug': 'claimed-private-source', 'kind': 'external', 'active': True,
     'display_name': 'PRIVATE_CLAIMED_NAME', 'user_id': YANIV_ACCOUNT, 'visibility': 'private', 'public_visibility': 'private'}]
ROWS = [{'id': '10000000-0000-4000-8000-' + str(i + 1).zfill(12), 'parent_id': None, 'status': 'approved',
    'author_name': 'אמילי', 'author_contributor_id': EMILY, 'author_user_id': None, 'origin': 'openweb',
    'body': 'הודעת ארכיון ציבורית ' + str(i + 1), 'created_at': f'2025-01-{1 + i // 24:02d}T{i % 24:02d}:00:00Z',
    'reactions': {'likes': i % 3}, 'contributor': {'id': EMILY, 'display_name': 'אמילי', 'user_id': None, 'avatar_url': 'https://private.invalid/message-avatar'}}
    for i in range(65)]
ROWS += [{'id': '20000000-0000-4000-8000-' + str(i + 1).zfill(12), 'parent_id': None, 'status': 'approved',
    'author_name': 'יניב לוי', 'author_contributor_id': YANIV, 'author_user_id': YANIV_ACCOUNT, 'origin': 'community_2029',
    'body': 'הודעת קהילה של יניב ' + str(i + 1), 'created_at': '2025-02-01T00:00:00Z', 'reactions': {},
    'contributor': {'id': YANIV, 'display_name': 'יניב לוי', 'user_id': YANIV_ACCOUNT}} for i in range(2)]
ROWS += [{'id': '30000000-0000-4000-8000-000000000001', 'parent_id': None, 'status': 'approved',
    'author_name': 'Sod1820', 'author_contributor_id': SELF_SOURCE, 'author_user_id': None, 'origin': 'openweb',
    'body': 'הודעה ציבורית מהחשבון המקושר במפורש', 'created_at': '2024-01-01T00:00:00Z', 'reactions': {}}]
ROWS += [{'id': '30000000-0000-4000-8000-000000000002', 'parent_id': None, 'status': 'approved',
    'author_name': 'Yosi Viner', 'author_contributor_id': OTHER_SOURCE, 'author_user_id': None, 'origin': 'openweb',
    'body': 'הודעה ציבורית מהחשבון השני', 'created_at': '2024-01-02T00:00:00Z', 'reactions': {}}]
POSTS = [{'id': 5038 + i, 'slug': f'fixture-post-{i}', 'title': f'מאמר מקור {i}', 'author': 'צבי', 'date': '2020-01-01T00:00:00Z'} for i in range(5)]

class Files(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Files, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}'
REPORT = {'cases': [], 'errors': [], 'unexpected_writes': [], 'blocked_identity_telemetry': []}
READ_RPCS = {'writer_public_contributions_page_v1', 'world_group_source_arrivals_v2', 'research_state_snapshot_v1', 'fn_research_path_resume_v1', 'community_feed_page', 'community_replies_page', 'community_message_context', 'community_reply_counts', 'community_message_actions_v1'}

def install(page, unknown_count=False, self_uid=None):
    calls = []
    page.on('pageerror', lambda error: REPORT['errors'].append(str(error)))
    def route(r):
        req, url = r.request, urlparse(r.request.url)
        if url.hostname == '127.0.0.1':
            if req.is_navigation_request(): return r.fulfill(content_type='text/html', body=HTML)
            if url.path.startswith('/api/'):
                if req.method != 'GET': REPORT['unexpected_writes'].append(url.path)
                if url.path == '/api/contributor-public-overview':
                    return r.fulfill(json={'state': 'ready', 'joinedAt': '2020-01-01T00:00:00Z', 'studio': {'available': True, 'items': [], 'hasMore': False, 'page': 0}})
                if url.path == '/api/contributor-interactions':
                    return r.fulfill(json={'state': 'ready', 'owner': False, 'message': 'login_required'})
                return r.fulfill(status=503, json={'state': 'unavailable'})
            return r.continue_()
        if url.hostname != 'linswmnnkjxvweumprav.supabase.co': return r.abort()
        table = url.path.rsplit('/', 1)[-1]
        if req.method == 'OPTIONS': return r.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*'})
        if req.method == 'POST' and table in ['link_identity', 'track_visit', 'ingest_event', 'claim_research_lead']:
            REPORT['blocked_identity_telemetry'].append(table); return r.abort()
        if req.method not in ['GET', 'HEAD'] and table not in READ_RPCS:
            REPORT['unexpected_writes'].append(table); return r.abort()
        q = parse_qs(url.query)
        if table in ['contributors', 'research_contributions', 'writer_public_contributions_page_v1'] or table == 'channel_updates' and 'contributor_id' in q:
            token = req.headers.get('authorization', '').split()[-1]
            assert json.loads(base64.urlsafe_b64decode(token.split('.')[1] + '=='))['role'] == 'anon', table
        assert table not in ['research_objects', 'person_public_profile_v1', 'people_public_rows_v1', 'researcher_reputation', 'research_level_of'], table
        calls.append((table, q))
        data = PEOPLE.copy() if table == 'contributors' else ROWS.copy() if table == 'research_contributions' else []
        if table in {'community_feed_page', 'community_replies_page', 'community_message_context', 'community_reply_counts'}:
            args = req.post_data_json or {}
            eligible = [row for row in ROWS if row.get('status') == 'approved' and row.get('origin') in ('openweb', 'community_2029')]
            if table == 'community_feed_page': data = [row for row in eligible if not row.get('parent_id')]
            elif table == 'community_replies_page': data = [row for row in eligible if row.get('parent_id') == args.get('p_parent')]
            elif table == 'community_message_context': data = [row for row in eligible if row['id'] == args.get('p_id')]
            else: data = [{'parent_id': parent, 'reply_count': sum(row.get('parent_id') == parent for row in eligible)} for parent in args.get('p_ids', [])]
            if table != 'community_reply_counts':
                fields = q.get('select', [''])[0].split(',')
                data = [{key: value for key, value in {**row, 'is_deleted': False, 'total_count': len(data)}.items() if key in fields} for row in data]
        if table == 'users' and self_uid:
            data = {'id': self_uid, 'display_name': 'חשבון בדיקה', 'username': 'fixture-self', 'role': 'member', 'avatar_url': None}
            return r.fulfill(json=data if 'vnd.pgrst.object' in req.headers.get('accept', '') else [data], headers={'access-control-allow-origin': '*'})
        if table == 'channel_updates' and q.get('contributor_id') == ['eq.' + TZVI['id']]: data = fixture['sources']
        if table == 'posts': data = POSTS if 'צבי' in q.get('or', [''])[0] else []
        if table == 'writer_public_contributions_page_v1': data = []
        for key, values in q.items():
            value = values[0]
            if key in ['id', 'slug', 'code', 'user_id', 'author_contributor_id', 'parent_id', 'status', 'active'] and value.startswith('eq.'):
                wanted = value[3:]; data = [row for row in data if str(row.get(key, '')).lower() == wanted.lower()]
            if key == 'parent_id' and value == 'is.null': data = [row for row in data if not row.get('parent_id')]
            if key == 'parent_id' and value.startswith('in.'): data = [row for row in data if row.get('parent_id') and row['parent_id'] in value]
            if key == 'origin' and value.startswith('in.'):
                data = [row for row in data if row.get('origin') in value]
            if key == 'origin' and value.startswith('not.in.'):
                data = [row for row in data if row.get('origin') not in value]
        if table == 'research_contributions' and 'or' in q:
            scope = q['or'][0]; data = [row for row in data if any(str(row.get(k, '')) in scope for k in ['author_contributor_id', 'author_user_id'] if row.get(k))]
        if table == 'contributors' and 'id' in q and q['id'][0].startswith('in.'):
            data = [row for row in data if row['id'] in q['id'][0]]
        ascending = q.get('order', [''])[0].startswith('created_at.asc')
        if table == 'research_contributions': data.sort(key=lambda row: (row['created_at'], row['id']), reverse=not ascending)
        count = len(data); offset = int(q.get('offset', ['0'])[0]); limit = int(q.get('limit', [str(count or 1)])[0])
        data = data[offset:offset + limit]
        if req.headers.get('accept') == 'application/vnd.pgrst.object+json': data = data[0] if data else None
        total = '*' if unknown_count and table == 'research_contributions' else str(count)
        return r.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*', 'content-range': f'0-{max(0,count-1)}/{total}', 'access-control-expose-headers': 'content-range'}, body=json.dumps(data))
    page.route('**/*', route)
    return calls

def member_url(key, extra=None):
    return BASE + '/2029?' + urlencode({'preview': 'community', 'data': 'live', 'member': key, **(extra or {})})

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        for width in [320, 390, 1440]:
            for theme in ['light', 'parchment', 'dark']:
                context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
                context.add_init_script('localStorage.setItem("sod-theme",' + json.dumps(theme) + ')')
                page = context.new_page(); calls = install(page)
                page.goto(member_url(EMILY)); page.locator('.pc-person').wait_for()
                expect(page.get_by_role('heading', name='אמילי', exact=True)).to_be_visible()
                expect(page.locator('.public-contributor-2029 .sod29-community-thread')).to_have_count(20)
                assert '65' in page.locator('.pc-person-summary').inner_text()
                assert 'PRIVATE_' not in page.locator('body').inner_text()
                assert page.locator('img[src*="private.invalid"]').count() == 0
                assert page.locator('.pc-rank').count() == 0
                assert not any(table == 'research_contributions' and 'author_contributor_id' not in q and 'or' not in q for table, q in calls), 'cold profile must not fetch the global feed'
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.get_by_role('button', name='עוד הודעות', exact=True).click()
                expect(page.locator('.public-contributor-2029 .sod29-community-thread')).to_have_count(40)
                page.get_by_role('combobox', name='מיון').select_option('oldest')
                expect(page.locator('.public-contributor-2029 .sod29-community-thread')).to_have_count(20)
                assert 'הודעת ארכיון ציבורית 1' in page.locator('.public-contributor-2029 .sod29-community-thread').first.inner_text()
                page.reload(); page.locator('.pc-person').wait_for()
                expect(page.locator('.public-contributor-2029 .sod29-community-thread')).to_have_count(20)
                assert page.get_by_role('combobox', name='מיון').input_value() == 'oldest'
                page.locator('.pc-person-toggle').click()
                assert page.get_by_role('link', name='זה החשבון הישן שלי', exact=True).get_attribute('href').endswith('claim=' + EMILY)
                page.get_by_role('link', name='חזרה למקום שממנו הגעת').click()
                page.get_by_role('textbox', name='מה תרצו לשתף?').wait_for()
                REPORT['cases'].append({'width': width, 'theme': theme, 'archive_person': True, 'pagination': True, 'sort_reload': True})
                context.close()
        # Existing community controller stays mounted, preserving the draft and native reply target.
        context = browser.new_context(viewport={'width': 390, 'height': 1000}); page = context.new_page(); install(page)
        page.goto(BASE + '/2029?preview=community&data=live')
        draft = page.get_by_role('textbox', name='מה תרצו לשתף?'); draft.fill('טיוטה נשמרת בעת פתיחת אדם')
        page.get_by_role('link', name='פתיחת כרטיס הכותב של אמילי', exact=True).first.click()
        page.get_by_role('button', name='לעמוד הכותב המלא ←', exact=True).click()
        page.locator('.pc-person').wait_for()
        page.get_by_role('button', name='השב', exact=True).first.click()
        expect(draft).to_have_value('טיוטה נשמרת בעת פתיחת אדם')
        expect(page.locator('.sod29-community-reply-target')).to_contain_text('אמילי')
        REPORT['cases'].append({'draft_preserved': True, 'native_reply': True}); context.close()
        context = browser.new_context(); page = context.new_page(); install(page, unknown_count=True)
        page.goto(member_url(EMILY)); page.locator('.pc-person').wait_for()
        expect(page.locator('.public-contributor-2029 .sod29-community-thread')).to_have_count(20)
        assert '65 הודעות' not in page.locator('.public-contributor-2029').inner_text()
        for count in [40, 60, 65]:
            page.get_by_role('button', name='עוד הודעות', exact=True).click()
            expect(page.locator('.public-contributor-2029 .sod29-community-thread')).to_have_count(count)
        expect(page.get_by_role('button', name='עוד הודעות', exact=True)).to_have_count(0)
        REPORT['cases'].append({'unknown_total_is_not_zero': True, 'pagination_until_exhaustion': True}); context.close()
        # Each email-confirmed display bridge edits only its own profile.
        def part(value): return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
        for self_uid, source_id, is_owner in [(SELF_ACCOUNT, SELF_SOURCE, True), (OTHER_ACCOUNT, OTHER_SOURCE, True),
                                               (OTHER_ACCOUNT, SELF_SOURCE, False), (SELF_ACCOUNT, OTHER_SOURCE, False)]:
            context = browser.new_context(); page = context.new_page(); install(page, self_uid=self_uid)
            token = part({'alg': 'HS256'}) + '.' + part({'sub': self_uid, 'role': 'authenticated', 'exp': int(time.time()) + 3600}) + '.synthetic'
            session = {'access_token': token, 'refresh_token': 'synthetic', 'expires_at': int(time.time()) + 3600,
                       'expires_in': 3600, 'token_type': 'bearer', 'user': {'id': self_uid}}
            context.add_init_script('localStorage.setItem("sb-linswmnnkjxvweumprav-auth-token",' + json.dumps(json.dumps(session)) + ');localStorage.setItem("ua_visit_' + self_uid + '_' + time.strftime('%Y-%m-%d') + '","1")')
            page.goto(member_url(source_id)); page.locator('.pc-person').wait_for(); page.locator('.pc-person-toggle').click()
            edit = page.get_by_role('link', name='עריכת הפרופיל שלי', exact=True)
            if is_owner:
                expect(edit).to_be_visible(); assert edit.get_attribute('href').startswith('/2029/me/profile?returnTo=')
                assert page.get_by_role('link', name='זה החשבון הישן שלי', exact=True).count() == 0
            else:
                expect(edit).to_have_count(0)
                expect(page.get_by_role('link', name='זה החשבון הישן שלי', exact=True)).to_be_visible()
            REPORT['cases'].append({'source_id': source_id, 'own_editor': is_owner, 'account_isolation': True}); context.close()
        # Canonical public writer/account and special Tzvi catalogue use the same family and context.
        for key, name in [(YANIV, 'יניב לוי'), ('user:' + YANIV_ACCOUNT, 'יניב לוי'), (TZVI['id'], TZVI['display_name'])]:
            context = browser.new_context(viewport={'width': 390, 'height': 1000}); page = context.new_page(); install(page)
            page.goto(member_url(key)); page.get_by_role('heading', name=name, exact=True).wait_for(); page.locator('.pc-person').wait_for()
            assert 'PRIVATE_' not in page.locator('body').inner_text()
            if key == TZVI['id']:
                page.get_by_role('button', name='כתבים אחרונים', exact=True).click()
                expect(page.locator('[data-catalog-source]')).to_have_count(20)
            REPORT['cases'].append({'public_writer_key': key, 'same_family': True}); context.close()
        context = browser.new_context(); page = context.new_page(); install(page)
        page.goto(member_url(PRIVATE)); page.get_by_role('heading', name='הכותב לא נמצא.', exact=True).wait_for()
        assert 'PRIVATE_PERSON' not in page.locator('body').inner_text()
        REPORT['cases'].append({'no_public_message_no_private_fallback': True}); context.close()
        browser.close()
    assert not REPORT['errors'], REPORT['errors']
    assert not REPORT['unexpected_writes'], REPORT['unexpected_writes']
    Path('/tmp/community-person-unification-browser-results.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2))
    print(json.dumps({'cases': len(REPORT['cases']), 'errors': REPORT['errors'], 'unexpected_writes': REPORT['unexpected_writes'], 'blocked_identity_telemetry': len(REPORT['blocked_identity_telemetry'])}))
finally:
    server.shutdown(); server.server_close()
