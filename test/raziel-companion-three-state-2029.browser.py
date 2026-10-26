"""Built-App Chromium check for Raziel's existing desktop Companion and mobile sheet.

External traffic is intercepted. The test changes only a local presentation preference;
it never submits a question, calls a model, writes product data or deploys anything.
Run after npm run build:2029.
"""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
OUT = ROOT / "work/evidence/raziel-companion-three-state"
OUT.mkdir(parents=True, exist_ok=True)
HTML = (DIST / "2029.html").read_text()
KEY = "sod-raziel-companion-view-v1"


class StaticFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(StaticFiles, directory=str(DIST)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"
report = {"desktop": {}, "mobile": {}, "model_calls": 0, "errors": []}


def wire(page):
    page.on("pageerror", lambda error: report["errors"].append(str(error)))

    def route(route):
        req = route.request
        url = urlparse(req.url)
        if url.hostname == "127.0.0.1":
            if req.is_navigation_request() and req.resource_type == "document":
                return route.fulfill(content_type="text/html", body=HTML)
            if url.path.startswith("/api/"):
                return route.fulfill(content_type="application/json", body="{}")
            return route.continue_()
        if url.hostname != "linswmnnkjxvweumprav.supabase.co":
            return route.abort()
        if url.path.endswith("/functions/v1/ai-analyze"):
            report["model_calls"] += 1
            return route.fulfill(status=500, content_type="application/json", body='{"error":"unexpected_model_call"}')
        if url.path.endswith("/rest/v1/site_flags"):
            rows = [{"key": key, "enabled": False, "message": "", "mode": "all"} for key in [
                "lock_world", "lock_heichal", "lock_raziel_site", "lock_life_journey", "lock_books", "lock_number"
            ]]
            return route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps(rows))
        return route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body="[]")

    page.route("**/*", route)


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])

        desktop = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        page = desktop.new_page()
        wire(page)
        page.goto(BASE + "/2029")
        page.locator(".sod29-root").wait_for()
        expect(page.locator("[data-raziel-companion-view]")).to_have_count(0)
        expect(page.locator("[data-raziel-companion-quiet='true']")).to_be_visible()
        assert page.evaluate(f"localStorage.getItem('{KEY}')") is None

        page.locator(".sod29-command-island .sod29-raziel-orb").click()
        panel = page.locator("[data-raziel-companion-view='open']")
        panel.wait_for()
        expect(panel.locator("[data-raziel-native-chat='true']")).to_be_visible()
        assert page.evaluate(f"localStorage.getItem('{KEY}')") == "open"

        panel.get_by_role("button", name="רמזים", exact=True).click()
        hint = page.locator("[data-raziel-companion-view='hints'] [data-raziel-hint='deterministic']")
        hint.wait_for()
        expect(hint).to_contain_text("רזיאל רואה את ההקשר")
        assert report["model_calls"] == 0
        page.screenshot(path=str(OUT / "desktop-hints.png"), full_page=True)

        page.reload()
        hint = page.locator("[data-raziel-companion-view='hints'] [data-raziel-hint='deterministic']")
        hint.wait_for()
        assert page.evaluate(f"localStorage.getItem('{KEY}')") == "hints"
        assert report["model_calls"] == 0
        page.locator("[data-raziel-companion-view='hints']").get_by_role("button", name="שקט", exact=True).click()
        expect(page.locator("[data-raziel-companion-view]")).to_have_count(0)
        expect(page.locator("[data-raziel-companion-quiet='true']")).to_be_visible()
        assert page.evaluate(f"localStorage.getItem('{KEY}')") == "quiet"
        assert report["model_calls"] == 0
        report["desktop"] = {"default": "quiet", "open": True, "hints": True, "quiet_selected": True, "reload_preserved": True}
        desktop.close()

        malformed = browser.new_context(viewport={"width": 1440, "height": 900})
        malformed.add_init_script(f"localStorage.setItem('{KEY}', 'broken-value')")
        page = malformed.new_page()
        wire(page)
        page.goto(BASE + "/2029")
        page.locator(".sod29-root").wait_for()
        expect(page.locator("[data-raziel-companion-view]")).to_have_count(0)
        expect(page.locator("[data-raziel-companion-quiet='true']")).to_be_visible()
        assert report["model_calls"] == 0
        report["desktop"]["malformed_defaults_quiet"] = True
        malformed.close()

        mobile = browser.new_context(viewport={"width": 320, "height": 760}, reduced_motion="reduce")
        mobile.add_init_script(f"localStorage.setItem('{KEY}', 'hints')")
        page = mobile.new_page()
        wire(page)
        page.goto(BASE + "/2029")
        page.locator(".sod29-root").wait_for()
        expect(page.locator(".sod29-companion")).to_be_hidden()
        page.locator(".sod29-command-island .sod29-raziel-orb").click()
        sheet = page.locator(".sod29-frame-panel [data-raziel-native-chat='true']")
        sheet.wait_for()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert report["model_calls"] == 0
        page.screenshot(path=str(OUT / "mobile-320-existing-sheet.png"), full_page=True)
        report["mobile"] = {"width": 320, "existing_sheet": True, "horizontal_overflow": False}
        mobile.close()

        assert not report["errors"], report["errors"]
        assert report["model_calls"] == 0
        (OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(json.dumps(report, ensure_ascii=False))
        browser.close()
finally:
    server.shutdown()
