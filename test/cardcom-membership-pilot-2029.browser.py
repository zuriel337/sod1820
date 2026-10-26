"""Compiled 2029 UI + synthetic identities/payment responses; no live backend or card calls."""
import base64
import functools
import json
import os
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
HTML = (DIST / '2029.html').read_text()
OUT = Path(os.environ.get('PILOT_BROWSER_ARTIFACTS', '/workspace/artifacts/cardcom-2ils-pilot-release-20261026'))
OUT.mkdir(parents=True, exist_ok=True)
AUTH_KEY = 'sb-linswmnnkjxvweumprav-auth-token'
USER_ID = '11111111-1111-4111-8111-111111111111'
REF = 'SODM-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
report = {'cases': [], 'page_errors': [], 'forwarded_backend_requests': 0, 'real_cardcom_requests': 0, 'model_calls': 0}

def enc(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')

def session(uid=USER_ID):
    expiry = int(time.time()) + 3600
    user = {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'pilot@example.invalid',
            'email_confirmed_at': '2026-10-26T00:00:00Z', 'created_at': '2026-10-26T00:00:00Z',
            'app_metadata': {'provider': 'email', 'providers': ['email']}, 'user_metadata': {}, 'identities': []}
    jwt = enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': uid, 'role': 'authenticated', 'aud': 'authenticated', 'exp': expiry}) + '.synthetic'
    return {'access_token': jwt, 'refresh_token': 'synthetic-refresh', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': expiry, 'user': user}

class Files(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Files, directory=str(DIST)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:' + str(server.server_port)

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])

        def run_case(width, theme, role='admin', state='none', action=None):
            context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
            context.add_init_script("localStorage.setItem('sod-theme', %s);" % json.dumps(theme))
            if role != 'guest':
                context.add_init_script('localStorage.setItem(%s, %s);' % (json.dumps(AUTH_KEY), json.dumps(json.dumps(session()))))
            page = context.new_page()
            page.on('pageerror', lambda e: report['page_errors'].append(str(e)))
            current = {'status': state}
            calls = {'status': 0, 'start': 0, 'verify': 0, 'cancel': 0, 'cardcom_nav': 0, 'extra_writes': []}
            current_role = [role]

            def status():
                if current['status'] == 'none':
                    return {'status': 'none'}
                return {'status': current['status'], 'amount_ils': 2, 'provider_ref': REF,
                        'low_profile_id': 'synthetic-low-profile' if current['status'] == 'pending' else None,
                        'current_period_end': '2026-11-26T12:00:00Z', 'next_charge_at': '2026-11-26T12:00:00Z',
                        'cancel_at_period_end': current.get('cancelled', False)}

            def intercept(route):
                req, url = route.request, urlparse(route.request.url)
                def reply(data, code=200):
                    return route.fulfill(status=code, content_type='application/json', body=json.dumps(data),
                                         headers={'access-control-allow-origin': '*'})
                if url.hostname == '127.0.0.1':
                    if url.path == '/api/cardcom-subscription-start':
                        calls['start'] += 1
                        if action == 'unsafe-url':
                            return reply({'url': 'https://evil.test/fake'})
                        if action == 'checkout':
                            return reply({'url': 'https://secure.cardcom.solutions/synthetic-only'})
                        return reply({'error': 'pilot_not_ready'}, 503)
                    if url.path == '/api/cardcom-subscription-webhook':
                        calls['verify'] += 1
                        current['status'] = 'active'
                        return reply({'ok': True, 'active': True})
                    if req.is_navigation_request():
                        return route.fulfill(content_type='text/html', body=HTML)
                    if url.path.startswith('/api/'):
                        return reply({})
                    return route.continue_()
                if url.hostname == 'secure.cardcom.solutions':
                    calls['cardcom_nav'] += 1
                    return route.fulfill(content_type='text/html', body='<h1>SYNTHETIC CHECKOUT — NO CARD DATA</h1>')
                if url.hostname != 'linswmnnkjxvweumprav.supabase.co':
                    return route.abort()
                if url.path.endswith(('/ai-analyze', '/research-run')):
                    report['model_calls'] += 1
                    return reply({'error': 'unexpected_model_call'}, 500)
                if url.path == '/auth/v1/user':
                    return reply(session()['user'])
                if url.path == '/rest/v1/users':
                    return reply({'id': session()['user']['id'], 'display_name': 'Synthetic pilot', 'role': current_role[0]})
                if url.path.endswith('/rpc/membership_pilot_status'):
                    calls['status'] += 1
                    if state == 'unavailable':
                        return reply({'message': 'pilot schema absent'}, 404)
                    return reply(status())
                if url.path.endswith('/rpc/membership_pilot_cancel'):
                    calls['cancel'] += 1
                    current['cancelled'] = True
                    return reply({'status': 'active', 'cancel_at_period_end': True})
                if url.path.endswith('/site_flags'):
                    return reply([{'key': key, 'enabled': True, 'message': '', 'mode': 'all'} for key in ['lock_raziel_site','lock_world','lock_number','lock_heichal']])
                if req.method in ['GET', 'HEAD', 'OPTIONS']:
                    return reply([])
                if url.path.endswith('/rpc/research_state_snapshot_v1'):
                    return reply({'cart': [], 'saved': [], 'pinned': [], 'history': [], 'collections': [], 'journeys': [], 'context': None, 'revision': 0})
                if any(name in url.path for name in ['claim_daily_credit', 'claim_founding', 'record_referral', 'research_state_apply', 'link_visitor', 'stitch_login']):
                    calls['extra_writes'].append(url.path)
                return reply([])

            context.route('**/*', intercept)
            path = '/2029/membership-pilot'
            if action == 'return':
                path += '?payment=success&ref=' + REF
            page.goto(BASE + path)
            if role in ['guest', 'member']:
                page.locator('[data-membership-pilot-access="denied"]').wait_for()
                assert not page.locator('[data-membership-pilot="2029"]').count()
                assert calls['status'] == 0 and calls['start'] == 0
            else:
                panel = page.locator('[data-membership-pilot="2029"]')
                try:
                    panel.wait_for(timeout=10000)
                except Exception as error:
                    raise AssertionError({'errors': report['page_errors'], 'body': page.locator('body').inner_text()[:1400], 'calls': calls}) from error
                if state == 'unavailable':
                    expect(panel).to_contain_text('הפיילוט עדיין אינו זמין')
                    assert not panel.get_by_role('button', name='פתיחת מנוי בדיקה ב־₪2', exact=True).count()
                elif action == 'return':
                    expect(panel).to_contain_text('העסקה אומתה והמנוי הופעל.')
                    assert calls['verify'] == 1 and calls['start'] == 0
                    assert page.url == BASE + '/2029/membership-pilot'
                elif action == 'cancel':
                    page.once('dialog', lambda dialog: dialog.accept())
                    panel.get_by_role('button', name='ביטול החידוש הבא', exact=True).click()
                    expect(panel).to_contain_text('הביטול נשמר. החידוש הבא לא יחויב.')
                    assert calls['cancel'] == 1 and calls['start'] == 0
                elif action in ['closed-gate', 'unsafe-url', 'checkout']:
                    panel.get_by_role('button', name='פתיחת מנוי בדיקה ב־₪2', exact=True).click()
                    if action == 'closed-gate':
                        expect(panel).to_contain_text('הפיילוט סגור עד להשלמת אישור המסוף')
                    elif action == 'unsafe-url':
                        expect(panel).to_contain_text('לא ניתן לפתוח כעת את דף Cardcom')
                        assert page.url.startswith(BASE)
                    else:
                        page.wait_for_url('https://secure.cardcom.solutions/synthetic-only')
                        expect(page.get_by_role('heading')).to_contain_text('NO CARD DATA')
                        assert calls['cardcom_nav'] == 1
                else:
                    expect(panel).to_contain_text('אין מנוי פעיל')
                    expect(panel.get_by_role('button', name='פתיחת מנוי בדיקה ב־₪2', exact=True)).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, theme, role, state)
            assert not calls['extra_writes'], calls['extra_writes']
            assert not report['page_errors'], report['page_errors']
            if role == 'admin' and state == 'none' and not action:
                page.screenshot(path=str(OUT / ('pilot-' + str(width) + '-' + theme + '.png')), full_page=True)
            report['cases'].append({'width': width, 'theme': theme, 'role': role, 'state': state, 'action': action, 'calls': calls})
            context.close()

        for width in [320, 390, 1440]:
            for theme in ['light', 'parchment', 'dark']:
                run_case(width, theme)
            for role in ['guest', 'member']:
                run_case(width, 'dark', role)
        for action, state in [('closed-gate','none'), ('unsafe-url','none'), ('checkout','none'), ('return','pending'), ('cancel','active'), (None,'unavailable')]:
            run_case(320, 'parchment', state=state, action=action)
        browser.close()
    assert report['model_calls'] == 0
    (OUT / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({'cases_passed': len(report['cases']), 'page_errors': report['page_errors'], 'real_cardcom_requests': 0, 'forwarded_backend_requests': 0, 'model_calls': report['model_calls']}))
finally:
    server.shutdown()
    server.server_close()
