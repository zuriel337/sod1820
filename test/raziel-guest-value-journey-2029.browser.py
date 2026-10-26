"""Built-App Chromium acceptance for Raziel's guest value journey.

The first explicit submit receives a bounded fake Raziel answer. The second receives the
existing server quota contract. All other external traffic is intercepted; no product write,
real model call, account creation or quota mutation occurs. Run after npm run build:2029.
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
HTML = (DIST / "2029.html").read_text()


class StaticFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(StaticFiles, directory=str(DIST)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"
report = {"cases": [], "model_calls": 0, "intercepted_writes": [], "unexpected_writes": [], "errors": []}
READ_RPC_POSTS = {
    "/rest/v1/rpc/fn_method_value",
    "/rest/v1/rpc/world_group_source_arrivals_v2",
    "/rest/v1/rpc/notification_prefs_guest_get_v1",
}
EXPECTED_TELEMETRY_POSTS = {
    "/rest/v1/rpc/link_identity",
    "/rest/v1/rpc/track_visit",
    "/rest/v1/rpc/ingest_event",
    "/rest/v1/rpc/ai_log_analysis",
}


def wire(page, request_state):
    page.on("pageerror", lambda error: report["errors"].append(str(error)))

    def route(handler):
        req = handler.request
        url = urlparse(req.url)
        if url.hostname == "127.0.0.1":
            if req.is_navigation_request() and req.resource_type == "document":
                return handler.fulfill(content_type="text/html", body=HTML)
            if url.path.startswith("/api/"):
                if req.method not in ["GET", "HEAD"]:
                    report["unexpected_writes"].append(url.path)
                return handler.fulfill(status=200, content_type="application/json", body="{}")
            return handler.continue_()
        if url.hostname != "linswmnnkjxvweumprav.supabase.co":
            return handler.abort()
        headers = {"access-control-allow-origin": "*", "access-control-allow-headers": "*"}
        if req.method == "OPTIONS":
            return handler.fulfill(status=204, headers=headers)
        if url.path.endswith("/functions/v1/ai-analyze"):
            request_state["ai"] += 1
            report["model_calls"] += 1
            if request_state["ai"] == 1:
                body = {"analysis": "תשובת ערך ראשונה מרזיאל.", "intelligence_level": "fast"}
            else:
                body = {
                    "analysis": None,
                    "error": "quota",
                    "surface": "raziel",
                    "tier": "anon",
                    "used": 30,
                    "limit": 30,
                    "message": "הגעת למכסת השיחות המהירות עם רזיאל להיום.",
                }
            return handler.fulfill(status=200, content_type="application/json", headers=headers,
                                   body=json.dumps(body, ensure_ascii=False))
        if req.method not in ["GET", "HEAD"]:
            if url.path in EXPECTED_TELEMETRY_POSTS:
                report["intercepted_writes"].append(url.path)
            elif url.path not in READ_RPC_POSTS:
                report["unexpected_writes"].append(url.path)
            return handler.fulfill(status=200, content_type="application/json", headers=headers, body="{}")
        if url.path.endswith("/rest/v1/site_flags"):
            rows = [{"key": key, "enabled": False, "message": "", "mode": "all"} for key in [
                "lock_world", "lock_heichal", "lock_raziel_site", "lock_life_journey", "lock_books", "lock_number"
            ]]
            return handler.fulfill(status=200, content_type="application/json", headers=headers,
                                   body=json.dumps(rows))
        return handler.fulfill(status=200, content_type="application/json", headers=headers, body="[]")

    page.route("**/*", route)


def open_chat(page, width):
    if page.locator(".sod29-frame-backdrop").count():
        page.keyboard.press("Escape")
        expect(page.locator(".sod29-frame-backdrop")).to_have_count(0)
    page.locator(".sod29-command-island .sod29-raziel-orb").click()
    if width >= 1000:
        chat = page.locator('[data-raziel-companion-view="open"] [data-raziel-native-chat="true"]')
    else:
        chat = page.locator('.sod29-frame-panel [data-raziel-native-chat="true"]')
    chat.wait_for()
    return chat


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
                                             args=["--no-sandbox", "--disable-dev-shm-usage"])
        for width in [320, 1440]:
            context = browser.new_context(viewport={"width": width, "height": 960}, reduced_motion="reduce")
            page = context.new_page()
            state = {"ai": 0}
            wire(page, state)
            page.goto(BASE + "/2029")
            page.locator(".sod29-root").wait_for()
            chat = open_chat(page, width)

            expect(chat.locator('[data-raziel-registration-nudge="after-value"]')).to_have_count(0)
            expect(chat.locator('[data-raziel-quota-ended="guest"]')).to_have_count(0)
            assert state["ai"] == 0

            question = chat.get_by_role("textbox", name="שאלה לרזיאל", exact=True)
            question.fill("מה אפשר ללמוד מהמספר 1820?")
            chat.get_by_role("button", name="שלח", exact=True).click()
            expect(chat).to_contain_text("תשובת ערך ראשונה מרזיאל")
            nudge = chat.locator('[data-raziel-registration-nudge="after-value"]')
            expect(nudge).to_be_visible()
            expect(nudge).to_contain_text("להמשיך בדיוק מאותה נקודה")
            assert state["ai"] == 1

            nudge.get_by_role("button", name="הרשמה בחינם", exact=True).click()
            workspace = page.locator(".sod29-frame-panel")
            workspace.get_by_role("heading", name="המרחב האישי שלי", exact=True).wait_for()
            assert state["ai"] == 1

            chat = open_chat(page, width)
            question = chat.get_by_role("textbox", name="שאלה לרזיאל", exact=True)
            question.fill("אפשר עוד תשובה?")
            chat.get_by_role("button", name="שלח", exact=True).click()
            ended = chat.locator('[data-raziel-quota-ended="guest"]')
            expect(ended).to_be_visible()
            expect(ended).to_contain_text("שיחות הניסיון להיום הסתיימו")
            expect(chat.locator('[data-raziel-registration-nudge="after-value"]')).to_have_count(0)
            expect(question).to_be_disabled()
            expect(chat.get_by_role("button", name="שלח", exact=True)).to_be_disabled()
            assert state["ai"] == 2
            assert not page.evaluate("Object.keys(localStorage).some((key) => /quota/i.test(key))")
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            page.screenshot(path=f"/tmp/raziel-guest-value-journey-{width}.png", full_page=True)
            report["cases"].append({
                "width": width,
                "opens_without_model": True,
                "nudge_after_value": True,
                "signup_opens_workspace_without_model": True,
                "server_quota_blocks_guest": True,
                "local_quota_storage": False,
                "horizontal_overflow": False,
                "model_requests": state["ai"],
            })
            context.close()

        browser.close()
    assert not report["errors"], report["errors"]
    assert not report["unexpected_writes"], report["unexpected_writes"]
    assert report["model_calls"] == 4
    Path("/tmp/raziel-guest-value-journey-2029-results.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2)
    )
    print(json.dumps(report, ensure_ascii=False))
finally:
    server.shutdown()
    server.server_close()
