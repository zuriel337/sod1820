"""Built App2029 check for saved Raziel conversations inside My Workspace.

Uses guest-local ResearchProvider data, blocks external writes and counts every
Raziel model boundary. Run after npm run build:2029.
"""
import functools
import json
import threading
from copy import deepcopy
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
HTML = (DIST / "2029.html").read_text()
RESEARCH_KEY = "sod_research_v2:guest"


def saved(ref, title, saved_at, question, answer):
    return {
        "id": f"raziel-session:{ref}",
        "ref": ref,
        "type": "raziel_session",
        "title": title,
        "schema": "raziel-saved-session-v1",
        "saved_at": saved_at,
        "message_count": 2,
        "turn_count": 1,
        "view_mode": "general",
        "thread": [
            {"role": "user", "text": question, "turnId": ref},
            {"role": "raziel", "text": answer, "question": question, "turnId": ref,
             "level": "fast", "sourceNames": [], "grounding": "interpretation",
             "viewMode": "general", "viewModeApplied": True},
        ],
    }


FIRST = saved("turn-a", "שיחת שאול", "2026-10-26T12:00:00Z", "מה הערך של שאול?", "שאול שווה 337.")
SECOND = saved("turn-b", "שיחת אמת", "2026-10-25T12:00:00Z", "מה הערך של אמת?", "אמת שווה 441.")
INITIAL = {
    "state": {"cart": [], "saved": [FIRST, SECOND], "pinned": [], "history": [],
              "collections": [], "journeys": [], "context": None},
    "mode": "reader",
    "revision": None,
}


class StaticFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(StaticFiles, directory=str(DIST)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"
report = {"cases": [], "model_calls": 0, "blocked_writes": [], "errors": []}


def wire(page):
    page.on("pageerror", lambda error: report["errors"].append(str(error)))

    def route(handler):
        req = handler.request
        url = urlparse(req.url)
        if url.hostname == "127.0.0.1":
            if req.is_navigation_request() and req.resource_type == "document":
                return handler.fulfill(content_type="text/html", body=HTML)
            if url.path.startswith("/api/"):
                if req.method not in ["GET", "HEAD"]:
                    report["blocked_writes"].append(url.path)
                return handler.fulfill(status=200, content_type="application/json", body="{}")
            return handler.continue_()
        if url.hostname != "linswmnnkjxvweumprav.supabase.co":
            return handler.abort()
        if url.path.endswith("/functions/v1/ai-analyze"):
            report["model_calls"] += 1
            return handler.fulfill(status=500, content_type="application/json", body='{"error":"unexpected_model_call"}')
        if req.method not in ["GET", "HEAD", "OPTIONS"]:
            report["blocked_writes"].append(url.path)
            return handler.fulfill(status=200, content_type="application/json", body="{}")
        if url.path.endswith("/rest/v1/site_flags"):
            rows = [{"key": key, "enabled": False, "message": "", "mode": "all"} for key in [
                "lock_world", "lock_heichal", "lock_raziel_site", "lock_life_journey", "lock_books", "lock_number"
            ]]
            return handler.fulfill(status=200, content_type="application/json",
                                   headers={"access-control-allow-origin": "*"}, body=json.dumps(rows))
        if req.method == "OPTIONS":
            return handler.fulfill(status=204, headers={"access-control-allow-origin": "*"})
        return handler.fulfill(status=200, content_type="application/json",
                               headers={"access-control-allow-origin": "*"}, body="[]")

    page.route("**/*", route)


def seed(context, state=INITIAL):
    context.add_init_script(
        "localStorage.setItem(%s, %s)" % (json.dumps(RESEARCH_KEY), json.dumps(json.dumps(state, ensure_ascii=False)))
    )


def open_center(page):
    if page.locator(".sod29-frame-backdrop").count():
        page.keyboard.press("Escape")
        expect(page.locator(".sod29-frame-backdrop")).to_have_count(0)
    page.get_by_role("button", name="התחברות לאזור האישי", exact=True).click()
    workspace = page.locator(".sod29-frame-panel")
    workspace.get_by_role("heading", name="המרחב האישי שלי", exact=True).wait_for()
    workspace.locator('[data-workspace-card="raziel"]').click()
    center = page.locator('[data-raziel-center="true"]')
    center.wait_for()
    return center


def read_saved(page):
    return page.evaluate(
        "JSON.parse(localStorage.getItem(%s)).state.saved" % json.dumps(RESEARCH_KEY)
    )


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
                                             args=["--no-sandbox", "--disable-dev-shm-usage"])
        for width in [320, 1440]:
            context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
            seed(context)
            page = context.new_page()
            wire(page)
            page.goto(BASE + "/2029")
            page.locator(".sod29-root").wait_for()
            center = open_center(page)
            expect(center.get_by_role("heading", name="השיחות שלי", exact=True)).to_be_visible()
            expect(center.locator("[data-raziel-center-session]")).to_have_count(2)
            expect(center).to_contain_text("26.10.2026")
            expect(center).to_contain_text("שאלה אחת")
            assert page.locator('[data-raziel-native-chat="true"]').count() == 0
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            assert report["model_calls"] == 0
            page.screenshot(path=f"/tmp/raziel-center-workspace-{width}.png", full_page=True)
            report["cases"].append({"width": width, "center_first": True, "overflow": False})
            context.close()

        context = browser.new_context(viewport={"width": 390, "height": 1000}, reduced_motion="reduce")
        seed(context)
        page = context.new_page()
        wire(page)
        page.goto(BASE + "/2029")
        page.locator(".sod29-root").wait_for()
        center = open_center(page)
        first_row = center.locator('[data-raziel-center-session="raziel-session:turn-a"]')
        original_thread = deepcopy(FIRST["thread"])

        first_row.get_by_role("button", name="שינוי שם", exact=True).click()
        rename = first_row.get_by_role("textbox", name="שם השיחה", exact=True)
        rename.fill("  השיחה ששיניתי  ")
        first_row.get_by_role("button", name="שמור שם", exact=True).click()
        expect(first_row).to_contain_text("השיחה ששיניתי")
        renamed = next(item for item in read_saved(page) if item["ref"] == "turn-a")
        assert renamed["id"] == FIRST["id"] and renamed["type"] == FIRST["type"] and renamed["ref"] == FIRST["ref"]
        assert renamed["thread"] == original_thread
        assert report["model_calls"] == 0

        first_row.get_by_role("button", name="המשך מאיפה שעצרתי", exact=True).click()
        chat = page.locator('.sod29-frame-panel [data-raziel-native-chat="true"]')
        chat.wait_for()
        expect(chat).to_contain_text("שאול שווה 337")
        chat.get_by_role("button", name="♡ שמור שיחה", exact=True).click()
        expect(chat).to_contain_text("השיחה נשמרה")
        assert len(read_saved(page)) == 2
        assert next(item for item in read_saved(page) if item["ref"] == "turn-a")["title"] == "השיחה ששיניתי"
        assert report["model_calls"] == 0

        center = open_center(page)
        page.once("dialog", lambda dialog: dialog.accept())
        center.get_by_role("button", name="שיחה חדשה", exact=True).click()
        chat = page.locator('.sod29-frame-panel [data-raziel-native-chat="true"]')
        chat.wait_for()
        expect(chat.locator(".sod29-raziel-thread > div")).to_have_count(0)
        assert report["model_calls"] == 0

        center = open_center(page)
        first_row = center.locator('[data-raziel-center-session="raziel-session:turn-a"]')
        first_row.get_by_role("button", name="מחיקה", exact=True).click()
        expect(first_row.get_by_role("group", name="אישור מחיקת השיחה השיחה ששיניתי", exact=True)).to_be_visible()
        first_row.get_by_role("button", name="ביטול", exact=True).click()
        expect(center.locator("[data-raziel-center-session]")).to_have_count(2)
        first_row.get_by_role("button", name="מחיקה", exact=True).click()
        first_row.get_by_role("button", name="כן, למחוק", exact=True).click()
        expect(center.locator("[data-raziel-center-session]")).to_have_count(1)
        assert report["model_calls"] == 0
        report["cases"].append({"rename": True, "identity_preserved": True, "content_preserved": True,
                                "resave_no_duplicate": True, "new_uses_existing_reset": True,
                                "confirmed_delete": True})
        context.close()

        empty = deepcopy(INITIAL)
        empty["state"]["saved"] = []
        context = browser.new_context(viewport={"width": 320, "height": 760}, reduced_motion="reduce")
        seed(context, empty)
        page = context.new_page()
        wire(page)
        page.goto(BASE + "/2029")
        page.locator(".sod29-root").wait_for()
        center = open_center(page)
        expect(center).to_contain_text("אין עדיין שיחות שמורות")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert report["model_calls"] == 0
        report["cases"].append({"empty": True, "width": 320, "overflow": False})
        context.close()

        browser.close()
    assert not report["errors"], report["errors"]
    assert report["model_calls"] == 0
    Path("/tmp/raziel-center-workspace-2029-results.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2)
    )
    print(json.dumps(report, ensure_ascii=False))
finally:
    server.shutdown()
    server.server_close()
