"""Exact old-community reply handoff from My Workspace, synthetic HTTP only.

Run after npm run build:2029. No request reaches a live service and every
unexpected mutation fails the test.
"""
import base64
import functools
import json
import os
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("TASK_REPLIES_BROWSER_OUT", str(ROOT / "docs/reviews/personal-replies-community-evidence-20261026")))
OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / "dist/2029.html").read_text()
ACCOUNT = "22222222-2222-4222-8222-222222222222"
ROOT_ID = "94970bb8-f12a-43b5-b1a8-5898e7e6cc57"
REPLY_ID = "d69c5c78-fc0c-4f2c-9da5-620d426d84ed"
AUTHOR = "33333333-3333-4333-8333-333333333333"
AUTH_KEY = "sb-linswmnnkjxvweumprav-auth-token"
SQL_EXPORT = os.environ.get("TASK_REPLIES_EXPORT")
SQL_CASES = []
if SQL_EXPORT:
    exported = json.loads(Path(SQL_EXPORT).read_text())
    assert exported["source"] == "disposable-postgresql17-committed-operations"
    SQL_CASES = exported["accounts"]
    assert len(SQL_CASES) == 6 and len({case["account_id"] for case in SQL_CASES}) == 6
    assert all(len(case["rows"]) == 2 for case in SQL_CASES)


def case_data(case=None):
    if case is not None:
        reply = case["rows"][0]
        return {"account": case["account_id"], "root": reply["thread_root_id"], "reply": reply["id"],
                "reply_body": reply["body"], "root_body": next(row["body"] for row in case["messages"] if row["id"] == reply["thread_root_id"]),
                "rows": case["rows"], "messages": case["messages"], "ordinality": case["ordinality"]}
    return {"account": ACCOUNT, "root": ROOT_ID, "reply": REPLY_ID,
            "reply_body": "תגובה לפוסט הישן שלך", "root_body": "זהו הפוסט הישן מהקהילה", "ordinality": 0,
            "rows": [{"id": REPLY_ID, "author_name": "חבר מהקהילה", "body": "תגובה לפוסט הישן שלך",
                      "target_type": "home", "target_id": "community", "parent_id": ROOT_ID,
                      "parent_title": None, "convergence_slug": None, "created_at": "2016-03-08T01:00:00Z",
                      "origin": "openweb", "thread_root_id": ROOT_ID, "thread_path": [ROOT_ID, REPLY_ID]}],
            "messages": [{"id": ROOT_ID, "parent_id": None, "author_name": "הכותב הוותיק", "author_user_id": ACCOUNT,
                          "author_contributor_id": None, "title": None, "body": "זהו הפוסט הישן מהקהילה",
                          "reactions": {}, "origin": "openweb", "created_at": "2016-03-07T00:00:00Z", "contributor": None},
                         {"id": REPLY_ID, "parent_id": ROOT_ID, "author_name": "חבר מהקהילה", "author_user_id": AUTHOR,
                          "author_contributor_id": None, "title": None, "body": "תגובה לפוסט הישן שלך",
                          "reactions": {}, "origin": "openweb", "created_at": "2016-03-08T01:00:00Z", "contributor": None}]}


CASES = [case_data(case) for case in SQL_CASES] if SQL_CASES else [case_data()]


class StaticFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(StaticFiles, directory=str(ROOT / "dist")))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"


def session(account=ACCOUNT):
    def part(value):
        return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")
    token = part({"alg": "HS256"}) + "." + part({"sub": account, "role": "authenticated", "exp": int(time.time()) + 3600}) + ".synthetic"
    return {"access_token": token, "refresh_token": "synthetic", "expires_at": int(time.time()) + 3600,
            "expires_in": 3600, "token_type": "bearer", "user": {"id": account, "email": "fixture@example.invalid"}}


def install(page, case):
    state = {"calls": [], "errors": [], "writes": [], "blocked_telemetry": [], "hold_account": None, "held_reply": None}
    page.on("pageerror", lambda error: state["errors"].append(str(error)))

    def route(handler):
        request = handler.request
        url = urlparse(request.url)
        query = parse_qs(url.query)
        name = url.path.rsplit("/", 1)[-1]
        local = url.hostname == "127.0.0.1"
        # Decode only synthetic, intercepted browser-test tokens; never contact Auth.
        token = request.headers.get("authorization", "").removeprefix("Bearer ").split(".")
        account = case["account"]
        if len(token) == 3 and token[2] == "synthetic":
            account = json.loads(base64.urlsafe_b64decode(token[1] + "=" * (-len(token[1]) % 4)))["sub"]
        current = next((value for value in CASES if value["account"] == account), None)
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
        if request.method == "OPTIONS":
            return handler.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*"})
        if request.method == "POST" and name in {"link_identity", "track_visit", "ingest_event", "claim_research_lead", "user_activity"}:
            state["blocked_telemetry"].append(name)
            return handler.abort()
        read_rpcs = {"replies_to_me", "dm_inbox", "dm_unread_count", "notification_prefs_guest_get_v1",
                     "notification_prefs_get_v1", "fn_method_value", "world_group_source_arrivals_v2",
                     "research_state_snapshot_v1", "fn_research_path_resume_v1", "community_message_context",
                     "community_feed_page", "community_replies_page", "community_reply_counts", "community_message_actions_v1"}
        if request.method not in ("GET", "HEAD") and ("/rest/v1/rpc/" not in url.path or name not in read_rpcs):
            state["writes"].append((url.path, request.method))
            return handler.fulfill(status=403, json={"message": "synthetic write blocked"})
        data = []
        if url.path == "/auth/v1/user":
            data = session(account)["user"]
        elif name == "replies_to_me":
            data = current["rows"] if current else []
            if account == state["hold_account"]:
                state["held_reply"] = (handler, data)
                return
        elif name == "community_message_context":
            args = request.post_data_json or {}
            data = [row for row in (current or case)["messages"] if row['id'] == args.get('p_id')]
        elif name == "community_reply_counts":
            args = request.post_data_json or {}
            data = [{"parent_id": parent, "reply_count": sum(row.get('parent_id') == parent for row in (current or case)["messages"])} for parent in args.get('p_ids', [])]
        elif name == "research_contributions":
            exact_id = query.get("id", [""])[0]
            row = next((row for row in (current or case)["messages"] if exact_id == f"eq.{row['id']}"), None)
            if row and (not query.get("parent_id") or query["parent_id"] == [f"eq.{row['parent_id']}"] or query["parent_id"] == ["is.null"] and row["parent_id"] is None):
                data = row
        elif name == "users":
            data = []
        elif name in ("dm_inbox", "notification_prefs", "user_notifications"):
            data = [] if name != "notification_prefs" else {"topics": [], "channels": []}
        return handler.fulfill(content_type="application/json", headers={"access-control-allow-origin": "*", "content-range": "0-0/1"}, body=json.dumps(data))

    page.route("**/*", route)
    return state


report = {"cases": [], "errors": [], "sql_backed": bool(SQL_CASES)}
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        for width, case in [(width, case) for width in (320, 390, 1440) for case in CASES]:
            context = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce",
                                          has_touch=width <= 390, is_mobile=width <= 390)
            context.add_init_script("localStorage.setItem('sod-theme','dark')")
            context.add_init_script("if (!localStorage.getItem(" + json.dumps(AUTH_KEY) + ")) localStorage.setItem(" + json.dumps(AUTH_KEY) + "," + json.dumps(json.dumps(session(case["account"]))) + ")")
            page = context.new_page()
            state = install(page, case)
            page.goto(BASE + "/2029/me/messages")
            page.locator(".wp-layout[data-state=ready]").wait_for()
            page.get_by_role("button", name="תגובות אליי", exact=False).click()
            expect(page.get_by_text("כאן מופיעות תגובות לפוסטים שלך בקהילה ולתרומות מחקריות. תגובות מהצ׳אט הוותיק יוצגו אחרי חיבור מאומת של הפרופיל הישן לחשבון.", exact=True)).to_be_visible()
            expect(page.get_by_text("הצ׳אט הוותיק", exact=True).first).to_be_visible()
            expect(page.get_by_text("תגובה בשיחה בקהילה", exact=False).first).to_be_visible()
            expect(page.get_by_role("button", name="הצ׳אט הוותיק", exact=False)).to_have_count(len(case["rows"]))
            for other in CASES:
                if other != case:
                    expect(page.get_by_text(other["reply_body"], exact=True)).to_have_count(0)
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            prefix = f"{width}-account-{case['ordinality']}" if SQL_CASES else str(width)
            page.screenshot(path=str(OUT / f"{prefix}-personal-replies.png"), full_page=True)
            reply = page.get_by_role("button", name="הצ׳אט הוותיק", exact=False).filter(has_text=case["reply_body"])
            reply.click()
            page.wait_for_url(lambda value: urlparse(value).path == "/2029" and parse_qs(urlparse(value).query).get("preview") == ["community"] and parse_qs(urlparse(value).query).get("thread") == [case["root"]])
            expect(page.get_by_role("heading", name="השיחה שבה התקבלה התגובה", exact=True)).to_be_visible()
            expect(page.get_by_text(case["root_body"], exact=True)).to_be_visible()
            target = page.locator(f"#message-{case['reply']}")
            expect(target).to_contain_text(case["reply_body"])
            assert "is-focused" in (target.get_attribute("class") or "")
            expect(page.get_by_role("link", name="חזרה להודעות שלי", exact=True)).to_have_attribute("href", "/2029/me/messages")
            page.reload()
            expect(page.get_by_role("heading", name="השיחה שבה התקבלה התגובה", exact=True)).to_be_visible()
            target = page.locator(f"#message-{case['reply']}")
            expect(target).to_contain_text(case["reply_body"])
            assert "is-focused" in (target.get_attribute("class") or "")
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            body_width = target.locator(".sod29-community-body").evaluate("element => Math.round(element.getBoundingClientRect().width)")
            if width <= 390:
                root_width = page.locator(f"#message-{case['root']} .sod29-community-body").evaluate("element => Math.round(element.getBoundingClientRect().width)")
                assert body_width >= root_width - 18, (width, root_width, body_width)
                assert body_width >= min(220, root_width - 18), "deep replies must retain a usable mobile reading column"
            assert not any(any(token in path for token in ("dm_send", "watch_toggle", "add_contribution")) for path, _ in state["writes"]), state["writes"]
            page.screenshot(path=str(OUT / f"{prefix}-old-community-reply.png"), full_page=True)
            page.get_by_role("link", name="חזרה להודעות שלי", exact=True).click()
            page.wait_for_url(BASE + "/2029/me/messages")
            page.locator(".wp-layout[data-state=ready]").wait_for()
            if SQL_CASES:
                # Change the existing Auth principal in-place, while holding the
                # second account's actual SQL response. Old replies must disappear
                # before it arrives; no product bypass or live authentication.
                next_case = CASES[(CASES.index(case) + 1) % len(CASES)]
                state["hold_account"] = next_case["account"]
                page.evaluate("""s => {
                    const key = 'sb-linswmnnkjxvweumprav-auth-token';
                    localStorage.setItem(key, JSON.stringify(s));
                    const channel = new BroadcastChannel(key);
                    channel.postMessage({event: 'SIGNED_IN', session: s});
                    setTimeout(() => channel.close(), 100);
                }""", session(next_case["account"]))
                page.locator(".wp-layout[data-state=ready]").wait_for()
                page.get_by_role("button", name="תגובות אליי", exact=False).click()
                expect(page.get_by_text(case["reply_body"], exact=True)).to_have_count(0)
                deadline = time.monotonic() + 10
                while state["held_reply"] is None and time.monotonic() < deadline:
                    page.wait_for_timeout(20)
                assert state["held_reply"] is not None, "new principal's replies reader did not run"
                handler, rows = state["held_reply"]
                handler.fulfill(json=rows)
                expect(page.get_by_text(next_case["reply_body"], exact=True)).to_be_visible()
                expect(page.get_by_text(case["reply_body"], exact=True)).to_have_count(0)
                expect(page.get_by_role("button", name="הצ׳אט הוותיק", exact=False)).to_have_count(2)
            assert not any(any(name in path for name in ("ai-analyze", "research-run")) for path, _ in state["calls"] + state["writes"])
            assert not state["writes"], state["writes"]
            report["cases"].append({"width": width, "account": case["ordinality"], "old_thread": True, "exact_reply": True,
                                    "reload": True, "exact_return": True, "account_switch_pending_isolated": bool(SQL_CASES),
                                    "overflow": False, "model_calls": 0, "focused_body_width": body_width,
                                    "unexpected_writes": [], "blocked_background_writes": len(state["blocked_telemetry"])})
            report["errors"].extend(state["errors"])
            context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()

assert not report["errors"], report
(OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False))
