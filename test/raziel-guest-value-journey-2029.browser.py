"""Built-App Chromium acceptance for Raziel's guest value journey.

Explicit submits receive a bounded fake answer, a non-anonymous quota response and then
the existing anonymous quota contract. All external traffic is intercepted; no product
write, real model call, account creation or quota mutation occurs. Synthetic auth changes
use the existing client's cross-tab event, never a real account or credential.
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
report = {"cases": [], "mock_transport_requests": 0, "real_model_calls": 0,
          "intercepted_writes": [], "unexpected_writes": [], "errors": []}
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
    "/rest/v1/rpc/claim_research_lead",
    "/rest/v1/rpc/link_visitor_identity",
    "/rest/v1/rpc/claim_my_founding_grants",
    "/rest/v1/rpc/claim_daily_credit",
    "/rest/v1/rpc/claim_wa_activity_credits",
    "/rest/v1/rpc/fn_research_path_resume_v1",
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
            report["mock_transport_requests"] += 1
            if request_state["ai"] == 1:
                body = {"analysis": "תשובת ערך ראשונה מרזיאל.", "intelligence_level": "fast"}
            else:
                body = {
                    "analysis": None,
                    "error": "quota",
                    "surface": "raziel",
                    "tier": request_state.get("quota_tier", "anon"),
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

            # An unrelated event outside an explicit submit cannot close this composer.
            page.evaluate("window.dispatchEvent(new CustomEvent('sod:ai-quota', {detail:{tier:'anon'}}))")
            expect(chat.get_by_role("textbox", name="שאלה לרזיאל", exact=True)).to_be_enabled()
            expect(chat.locator('[data-raziel-quota-ended="guest"]')).to_have_count(0)

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
            state["quota_tier"] = "member"
            question.fill("בדיקת אירוע שאינו של אורח")
            chat.get_by_role("button", name="שלח", exact=True).click()
            expect(chat.locator('[data-raziel-state="error"]')).to_be_visible()
            expect(question).to_be_enabled()
            expect(chat.locator('[data-raziel-quota-ended="guest"]')).to_have_count(0)
            assert state["ai"] == 2

            state["quota_tier"] = "anon"
            question.fill("אפשר עוד תשובה?")
            chat.get_by_role("button", name="שלח", exact=True).click()
            ended = chat.locator('[data-raziel-quota-ended="guest"]')
            expect(ended).to_be_visible()
            expect(ended).to_contain_text("שיחות הניסיון להיום הסתיימו")
            expect(chat.locator('[data-raziel-registration-nudge="after-value"]')).to_have_count(0)
            expect(question).to_be_disabled()
            expect(chat.get_by_role("button", name="שלח", exact=True)).to_be_disabled()
            assert state["ai"] == 3
            # Quota limits AI, not the existing local saving operation.
            save = chat.locator('[data-raziel-save-session="true"]')
            expect(save).to_be_enabled()
            save.click()
            expect(chat.locator('.sod29-raziel-save-notice')).to_contain_text("מקומית")
            assert state["ai"] == 3
            assert not page.evaluate("Object.keys(localStorage).some((key) => /quota/i.test(key))")
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            page.screenshot(path=f"/tmp/raziel-guest-value-journey-{width}.png", full_page=True)

            # Exercise real AuthProvider -> ResearchProvider -> session remount.
            # These are deliberately invalid credentials, confined to intercepted I/O.
            page.evaluate("""() => {
              const channel = new BroadcastChannel('sb-linswmnnkjxvweumprav-auth-token');
              channel.postMessage({event:'SIGNED_IN', session:{
                access_token:'synthetic-invalid-access', refresh_token:'synthetic-invalid-refresh',
                expires_at:4102444800, token_type:'bearer',
                user:{id:'00000000-0000-4000-8000-000000000001', app_metadata:{}, user_metadata:{}}
              }});
              window.guestAcceptanceAuthChannel = channel;
            }""")
            expect(page.locator('.sod29-header-workspace')).to_have_attribute("aria-label", "האזור האישי שלי")
            expect(page.locator('[data-raziel-quota-ended="guest"]')).to_have_count(0)
            current_chat = open_chat(page, width)
            expect(current_chat.get_by_role("textbox", name="שאלה לרזיאל", exact=True)).to_be_enabled()
            expect(current_chat.get_by_role("log")).not_to_contain_text("תשובת ערך ראשונה")
            page.evaluate("window.guestAcceptanceAuthChannel.postMessage({event:'SIGNED_OUT',session:null})")
            expect(page.locator('.sod29-header-workspace')).to_have_attribute("aria-label", "התחברות לאזור האישי")
            expect(page.locator('[data-raziel-quota-ended="guest"]')).to_have_count(0)
            current_chat = open_chat(page, width)
            expect(current_chat.get_by_role("textbox", name="שאלה לרזיאל", exact=True)).to_be_enabled()
            assert state["ai"] == 3
            page.evaluate("window.guestAcceptanceAuthChannel.close()")
            report["cases"].append({
                "width": width,
                "opens_without_model": True,
                "nudge_after_value": True,
                "signup_opens_workspace_without_model": True,
                "server_quota_blocks_guest": True,
                "local_quota_storage": False,
                "unrelated_quota_ignored": True,
                "non_anon_quota_ignored": True,
                "save_after_quota_without_model": True,
                "principal_change_resets_guest_denial": True,
                "horizontal_overflow": False,
                "mock_transport_requests": state["ai"],
            })
            context.close()

        browser.close()
    assert not report["errors"], report["errors"]
    assert not report["unexpected_writes"], report["unexpected_writes"]
    assert report["mock_transport_requests"] == 6
    Path("/tmp/raziel-guest-value-journey-2029-results.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2)
    )
    print(json.dumps(report, ensure_ascii=False))
finally:
    server.shutdown()
    server.server_close()
