"""Exact old-community reply handoff from My Workspace, synthetic HTTP only.

Run after npm run build:2029. No request reaches a live service and every
unexpected mutation fails the test.
"""
import base64
import functools
import json
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/reviews/personal-replies-community-evidence-20261026"
OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / "dist/2029.html").read_text()
ACCOUNT = "22222222-2222-4222-8222-222222222222"
ROOT_ID = "94970bb8-f12a-43b5-b1a8-5898e7e6cc57"
REPLY_ID = "d69c5c78-fc0c-4f2c-9da5-620d426d84ed"
AUTHOR = "33333333-3333-4333-8333-333333333333"


class StaticFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(StaticFiles, directory=str(ROOT / "dist")))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"


def session():
    def part(value):
        return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")
    token = part({"alg": "HS256"}) + "." + part({"sub": ACCOUNT, "role": "authenticated", "exp": int(time.time()) + 3600}) + ".synthetic"
    return {"access_token": token, "refresh_token": "synthetic", "expires_at": int(time.time()) + 3600,
            "expires_in": 3600, "token_type": "bearer", "user": {"id": ACCOUNT, "email": "fixture@example.invalid"}}


def install(page):
    state = {"calls": [], "errors": [], "writes": []}
    page.on("pageerror", lambda error: state["errors"].append(str(error)))

    def route(handler):
        request = handler.request
        url = urlparse(request.url)
        query = parse_qs(url.query)
        name = url.path.rsplit("/", 1)[-1]
        local = url.hostname == "127.0.0.1"
        if local and request.is_navigation_request() and request.resource_type == "document":
            return handler.fulfill(content_type="text/html", body=HTML)
        if local and url.path.startswith("/api/"):
            state["calls"].append((name, request.method))
            if name == "contributor-self" and request.method == "GET":
                return handler.fulfill(json={"state": "ready", "writer": {"state": "ready", "name": "חשבון בדיקה",
                    "slug": "fixture-writer", "href": "/community/researcher/fixture-writer", "publicVisible": True, "avatar": None},
                    "accountAvatar": None, "rank": {"state": "unavailable"}, "stats": {"xp": None, "credits": None, "streak": None, "tier": None}})
            state["writes"].append((url.path, request.method))
            return handler.fulfill(status=405, json={"state": "unavailable"})
        if local:
            return handler.continue_()
        if url.hostname != "linswmnnkjxvweumprav.supabase.co":
            return handler.abort()
        state["calls"].append((name, request.method))
        read_rpcs = {"replies_to_me", "dm_inbox", "dm_unread_count", "notification_prefs_guest_get_v1",
                     "notification_prefs_get_v1", "fn_method_value", "world_group_source_arrivals_v2"}
        if request.method not in ("GET", "HEAD") and ("/rest/v1/rpc/" not in url.path or name not in read_rpcs):
            state["writes"].append((url.path, request.method))
            return handler.fulfill(status=403, json={"message": "synthetic write blocked"})
        data = []
        if url.path == "/auth/v1/user":
            data = session()["user"]
        elif name == "replies_to_me":
            data = [{"id": REPLY_ID, "author_name": "חבר מהקהילה", "body": "תגובה לפוסט הישן שלך",
                     "target_type": "home", "target_id": "community", "parent_id": ROOT_ID,
                     "parent_title": None, "convergence_slug": None, "created_at": "2016-03-08T01:00:00Z",
                     "origin": "openweb", "thread_root_id": ROOT_ID, "thread_path": [ROOT_ID, REPLY_ID]}]
        elif name == "research_contributions":
            exact_id = query.get("id", [""])[0]
            if exact_id == f"eq.{ROOT_ID}":
                data = {"id": ROOT_ID, "parent_id": None, "author_name": "הכותב הוותיק", "author_user_id": ACCOUNT,
                        "author_contributor_id": None, "title": None, "body": "זהו הפוסט הישן מהקהילה",
                        "reactions": {}, "origin": "openweb", "created_at": "2016-03-07T00:00:00Z", "contributor": None}
            elif exact_id == f"eq.{REPLY_ID}" and query.get("parent_id") == [f"eq.{ROOT_ID}"]:
                data = {"id": REPLY_ID, "parent_id": ROOT_ID, "author_name": "חבר מהקהילה", "author_user_id": AUTHOR,
                        "author_contributor_id": None, "title": None, "body": "תגובה לפוסט הישן שלך",
                        "reactions": {}, "origin": "openweb", "created_at": "2016-03-08T01:00:00Z", "contributor": None}
        elif name == "users":
            data = []
        elif name in ("dm_inbox", "notification_prefs", "user_notifications"):
            data = [] if name != "notification_prefs" else {"topics": [], "channels": []}
        return handler.fulfill(content_type="application/json", headers={"access-control-allow-origin": "*", "content-range": "0-0/1"}, body=json.dumps(data))

    page.route("**/*", route)
    return state


report = {"cases": [], "errors": []}
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        for width in (320, 390, 1440):
            context = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce",
                                          has_touch=width <= 390, is_mobile=width <= 390)
            context.add_init_script("localStorage.setItem('sod-theme','dark')")
            context.add_init_script("localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token'," + json.dumps(json.dumps(session())) + ")")
            page = context.new_page()
            state = install(page)
            page.goto(BASE + "/2029/me/messages")
            page.locator(".wp-layout[data-state=ready]").wait_for()
            page.get_by_role("button", name="תגובות אליי", exact=False).click()
            expect(page.get_by_text("כאן מופיעות תגובות לפוסטים שלך בקהילה ולתרומות מחקריות. תגובות מהצ׳אט הוותיק יוצגו אחרי חיבור מאומת של הפרופיל הישן לחשבון.", exact=True)).to_be_visible()
            expect(page.get_by_text("הצ׳אט הוותיק", exact=True)).to_be_visible()
            expect(page.get_by_text("תגובה בשיחה בקהילה", exact=False)).to_be_visible()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            page.screenshot(path=str(OUT / f"{width}-personal-replies.png"), full_page=True)
            reply = page.get_by_role("button", name="הצ׳אט הוותיק", exact=False)
            reply.click()
            page.wait_for_url(lambda value: urlparse(value).path == "/2029" and parse_qs(urlparse(value).query).get("preview") == ["community"] and parse_qs(urlparse(value).query).get("thread") == [ROOT_ID])
            expect(page.get_by_role("heading", name="השיחה שבה התקבלה התגובה", exact=True)).to_be_visible()
            expect(page.get_by_text("זהו הפוסט הישן מהקהילה", exact=True)).to_be_visible()
            target = page.locator(f"#message-{REPLY_ID}")
            expect(target).to_contain_text("תגובה לפוסט הישן שלך")
            assert "is-focused" in (target.get_attribute("class") or "")
            expect(page.get_by_role("link", name="חזרה להודעות שלי", exact=True)).to_have_attribute("href", "/2029/me/messages")
            page.reload()
            expect(page.get_by_role("heading", name="השיחה שבה התקבלה התגובה", exact=True)).to_be_visible()
            target = page.locator(f"#message-{REPLY_ID}")
            expect(target).to_contain_text("תגובה לפוסט הישן שלך")
            assert "is-focused" in (target.get_attribute("class") or "")
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            assert not any(any(token in path for token in ("dm_send", "watch_toggle", "add_contribution")) for path, _ in state["writes"]), state["writes"]
            assert not any(name in ("ai-analyze", "research-run") for name, _ in state["calls"])
            report["cases"].append({"width": width, "old_thread": True, "exact_reply": True, "overflow": False, "model_calls": 0,
                                    "blocked_background_writes": len(state["writes"])})
            page.screenshot(path=str(OUT / f"{width}-old-community-reply.png"), full_page=True)
            report["errors"].extend(state["errors"])
            context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()

assert not report["errors"], report
(OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False))
