"""Actual built 2029 + its real Preview service worker; synthetic transport only."""
import functools
import getpass
import json
import os
import re
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'preview-deploy/dist'
OUT = Path(os.environ.get('RAZIEL_SAFE_ARTIFACTS', '/workspace/artifacts/raziel-safe-actions-integration-20261026'))
OUT.mkdir(parents=True, exist_ok=True)
HTML = (DIST / '2029.html').read_text()
WORKER = (DIST / 'preview-readonly-sw.js').read_text()
READ_RPCS = set(json.loads(re.search(r'const reads = new Set\((\[.*?\])\);', WORKER).group(1)))
KEY = 'sod_research_v2:guest'
report = {'cases': [], 'page_errors': [], 'unmocked_model_requests': 0, 'forwarded_backend_requests': 0}
stage = 'initializing'

class Files(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ['/2029', '/2029/number/358']:
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML.encode())
            return
        super().do_GET()

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Files, directory=str(DIST)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = os.environ.get('RAZIEL_SAFE_PREVIEW_ORIGIN') or ('http://127.0.0.1:' + str(server.server_port))
ACCESS_URL = getpass.getpass('Protected Preview URL (not recorded): ') if os.environ.get('RAZIEL_SAFE_PROMPT_ACCESS_URL') == 'true' else None
if ACCESS_URL and (urlparse(ACCESS_URL).scheme != 'https' or urlparse(ACCESS_URL).hostname != urlparse(BASE).hostname):
    raise ValueError('Protected access must match the exact Preview origin')
WIDTHS = [int(n) for n in os.environ.get('RAZIEL_SAFE_WIDTHS', '320,390,1440').split(',')]
THEMES = os.environ.get('RAZIEL_SAFE_THEMES', 'light,parchment,dark').split(',')

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        for width in WIDTHS:
            for theme in THEMES:
                stage = f'{width}/{theme}: opening'
                context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce',
                    user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36')
                context.add_init_script("localStorage.setItem('sod-theme', %s);" % json.dumps(theme))
                context.add_init_script("""(() => {
                  window.fixtureCalls=[];
                  const nativeFetch=window.fetch.bind(window);
                  window.fetch=async (...args)=>{
                    const input=args[0],url=new URL(typeof input==='string'?input:input.url,location.origin);
                    const result=await nativeFetch(...args);
                    if(url.pathname==='/functions/v1/ai-analyze')window.fixtureCalls.push({mock:result.headers.get('X-Raziel-Preview-Transport')});
                    return result;
                  };
                })();""")
                page = context.new_page()
                page.on('pageerror', lambda error: report['page_errors'].append(str(error)))

                def intercept(route):
                    req, url = route.request, urlparse(route.request.url)
                    if url.hostname == urlparse(BASE).hostname:
                        return route.continue_()
                    if url.hostname == 'linswmnnkjxvweumprav.supabase.co':
                        if url.path.endswith(('/ai-analyze','/research-run')):
                            report['unmocked_model_requests'] += 1
                            return route.abort()
                        rpc = url.path.rsplit('/', 1)[-1] if '/rest/v1/rpc/' in url.path else None
                        if req.method not in ['GET','HEAD','OPTIONS'] and not (req.method == 'POST' and rpc in READ_RPCS):
                            raise AssertionError('Unexpected backend write escaped Preview guard: ' + url.path)
                        return route.fulfill(content_type='application/json', body='[]', headers={'access-control-allow-origin':'*'})
                    return route.abort()

                context.route('**/*', intercept)
                if ACCESS_URL:
                    page.goto(ACCESS_URL)
                else:
                    page.goto(BASE + '/2029')
                page.locator('.sod29-root').wait_for()
                expect(page.locator('[data-raziel-preview-transport="mock-only"]')).to_be_visible()
                expected_sha = os.environ.get('RAZIEL_SAFE_EXPECTED_SHA')
                if expected_sha:
                    # Use Chromium's configured network path, not a separate
                    # Node HTTP client that may ignore the environment proxy.
                    receipt = page.evaluate("async()=>await(await fetch('/preview-identity.json')).json()")
                    assert receipt['sha'] == expected_sha
                    assert receipt['transport'] == 'mock-only' and receipt['product_writes'] is False
                assert page.evaluate('!!navigator.serviceWorker.controller')
                assert page.evaluate('fixtureCalls.length') == 0
                page.locator('.sod29-command-island .sod29-raziel-orb').click()
                chat = page.locator('[data-raziel-native-chat="true"]:visible')
                expect(chat).to_have_count(1)
                assert page.evaluate('fixtureCalls.length') == 0, 'opening is not a model invocation'
                expect(chat.locator('[data-raziel-registration-nudge]')).to_have_count(0)
                stage = f'{width}/{theme}: first answer'
                chat.get_by_label('שאלה לרזיאל', exact=True).fill('מה זה משיח?')
                chat.get_by_role('button', name='שלח', exact=True).click()
                methods = chat.locator('[data-raziel-suggested-action="all_methods"]')
                number = chat.locator('[data-raziel-suggested-action="open_number"]')
                expect(methods).to_be_visible()
                expect(number).to_be_visible()
                assert chat.locator('[data-raziel-suggested-action]').count() == 2
                assert page.evaluate('fixtureCalls.length') == 1
                assert page.evaluate('fixtureCalls.every(x=>x.mock==="mock-only")')
                nudge = chat.locator('[data-raziel-registration-nudge="after-value"]')
                expect(nudge).to_be_visible()
                stage = f'{width}/{theme}: signup entry'
                nudge.get_by_role('button', name='הרשמה בחינם', exact=True).click()
                page.locator('.sod29-frame-panel').get_by_role('heading', name='המרחב האישי שלי', exact=True).wait_for()
                assert page.evaluate('fixtureCalls.length') == 1, 'signup entry uses zero model calls'
                page.keyboard.press('Escape')
                if width < 1000:
                    page.locator('.sod29-command-island .sod29-raziel-orb').click()
                chat = page.locator('[data-raziel-native-chat="true"]:visible')
                methods = chat.locator('[data-raziel-suggested-action="all_methods"]')
                number = chat.locator('[data-raziel-suggested-action="open_number"]')
                assert not page.evaluate("localStorage.getItem('" + KEY + "') && JSON.parse(localStorage.getItem('" + KEY + "')).state?.saved?.length")
                for button in [methods, number]:
                    assert button.bounding_box()['height'] >= 44, 'suggestion target must be at least 44px'
                stage = f'{width}/{theme}: all methods'
                methods.click()
                save = chat.locator('[data-raziel-suggested-action="save_conversation"]')
                expect(save).to_be_visible()
                expect(chat.get_by_role('log')).to_contain_text('בכל השיטות')
                assert page.evaluate('fixtureCalls.length') == 2
                saved_count = """() => {const value=JSON.parse(localStorage.getItem('sod_research_v2:guest')||'{}'); return (value.state?.saved||value.saved||[]).filter(x=>x.type==='raziel_session').length;}"""
                assert page.evaluate(saved_count) == 0, 'suggesting save cannot save'
                save.click()
                page.wait_for_function('(' + saved_count + ')()===1')
                expect(chat.get_by_text('השיחה נשמרה.', exact=True)).to_be_visible()
                save.click()
                expect(chat.get_by_text('השיחה נשמרה.', exact=True)).to_be_visible()
                assert page.evaluate(saved_count) == 1, 'repeat save must upsert the existing conversation'
                assert page.evaluate('fixtureCalls.length') == 2, 'save never invokes a model'
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.screenshot(path=str(OUT / ('safe-actions-' + str(width) + '-' + theme + '.png')), full_page=True)

                # This third turn is deliberately NOT saved before navigation.
                stage = f'{width}/{theme}: unsaved third turn'
                chat.get_by_label('שאלה לרזיאל', exact=True).fill('מה עוד קשור למשיח?')
                chat.get_by_role('button', name='שלח', exact=True).click()
                expect(chat.locator('[data-raziel-suggested-action="all_methods"]')).to_be_visible()
                assert page.evaluate('fixtureCalls.length') == 3

                # Navigation inside the same 2029 router must not destroy the
                # unsaved in-memory conversation or create a second provider.
                page.evaluate("window.sameRazielDocument='preserve-this-session'")
                stage = f'{width}/{theme}: number navigation'
                chat.locator('[data-raziel-suggested-action="open_number"]').click()
                page.wait_for_url('**/2029/number/358')
                # URL mutation precedes the lazy surface mount and Frame's route-close
                # effect. Public data stays mocked; wait for the destination Frame,
                # not the previous surface's still-visible chat or a live dossier.
                page.locator('.sod29-root.surface-number').wait_for()
                expect(page.locator('.sod29-frame-backdrop')).to_have_count(0)
                assert page.evaluate('window.sameRazielDocument') == 'preserve-this-session', 'open_number reloaded the document and destroyed the shared Raziel session'
                chat = page.locator('[data-raziel-native-chat="true"]:visible')
                if not chat.count():
                    page.locator('.sod29-command-island .sod29-raziel-orb').click()
                chat = page.locator('[data-raziel-native-chat="true"]:visible')
                expect(chat.get_by_role('log')).to_contain_text('מה זה משיח?')
                expect(chat.get_by_role('log')).to_contain_text('בכל השיטות')
                expect(chat.get_by_role('log')).to_contain_text('מה עוד קשור למשיח?')
                assert page.evaluate('fixtureCalls.length') == 3
                assert page.evaluate(saved_count) == 1
                stage = f'{width}/{theme}: explicit guest quota'
                chat.get_by_label('שאלה לרזיאל', exact=True).fill('בדיקת מכסת אורח')
                chat.get_by_role('button', name='שלח', exact=True).click()
                expect(chat.locator('[data-raziel-quota-ended="guest"]')).to_be_visible()
                expect(chat.get_by_label('שאלה לרזיאל', exact=True)).to_be_disabled()
                expect(chat.locator('[data-raziel-registration-nudge]')).to_have_count(0)
                local_save = chat.locator('[data-raziel-save-session="true"]')
                expect(local_save).to_be_enabled()
                local_save.click()
                expect(chat.locator('.sod29-raziel-save-notice')).to_contain_text('מקומית')
                assert page.evaluate(saved_count) == 1
                assert page.evaluate('fixtureCalls.length') == 4
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.screenshot(path=str(OUT / ('guest-quota-' + str(width) + '-' + theme + '.png')), full_page=True)
                assert report['unmocked_model_requests'] == 0
                assert not report['page_errors'], report['page_errors']
                report['cases'].append({'width':width,'theme':theme,'fixture_requests':4,'model_calls':0,'repeat_save_count':1,'router_preserved_unsaved_turn':True,'signup_after_value':True,'signup_entry_model_calls':0,'server_shaped_quota_denial':True,'save_after_quota_model_calls':0,'overflow':False})
                context.close()
        browser.close()
    (OUT / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False))
except Exception as error:
    # Protected access is held in memory only, never in artifacts or tracebacks.
    detail = str(error).replace(ACCESS_URL, '[protected access]') if ACCESS_URL else str(error)
    detail = re.sub(r'(_vercel_share=)[^&\s\"\'<>]+', r'\1[redacted]', detail)
    detail = re.sub(r'(?im)(cookie|set-cookie|authorization):[^\r\n]*', r'\1: [redacted]', detail)
    detail = re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '[redacted token]', detail)
    print(stage + '\n' + type(error).__name__ + ': ' + detail, file=sys.stderr)
    print(json.dumps(report, ensure_ascii=False), file=sys.stderr)
    sys.exit(1)
finally:
    server.shutdown()
    server.server_close()
