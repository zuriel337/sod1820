"""Existing inline Community controls on feed/author/private-return paths.

Built browser + intercepted synthetic Auth/data only. No live request or mutation.
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
OUT = Path(os.environ.get("TASK_COMMUNITY_ACTIONS_OUT", "/tmp/community-message-actions-browser"))
OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / "dist/2029.html").read_text()
ACTOR = "02a0d207-0136-4beb-a34d-8ff57d10cd85"
OTHER = "b6ce542a-2b07-4749-8aba-532c886f6de7"
ADMIN = "a21a1a11-2b07-4749-8aba-532c886f6de7"
SOURCE = "4cd9c034-0464-4600-a35d-7156f0584d9b"
KEY = "sb-linswmnnkjxvweumprav-auth-token"
OLD = "10000000-0000-4000-8000-000000000001"
NATIVE = "10000000-0000-4000-8000-000000000002"
CHILD = "10000000-0000-4000-8000-000000000003"
FOREIGN = "10000000-0000-4000-8000-000000000004"
PROTECTED = "10000000-0000-4000-8000-000000000005"
ADMIN_OWN = "10000000-0000-4000-8000-000000000006"
FEED = "/2029?preview=community&data=live"
AUTHOR = FEED + "&member=" + SOURCE

def session(actor):
    def part(value): return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")
    token = part({"alg": "HS256"}) + "." + part({"sub": actor, "role": "authenticated", "exp": int(time.time()) + 3600}) + ".synthetic"
    return {"access_token": token, "refresh_token": "synthetic", "expires_at": int(time.time()) + 3600,
            "expires_in": 3600, "token_type": "bearer", "user": {"id": actor, "email": "fixture@example.invalid"}}

def rows():
    def row(id, body, user=None, contributor=None, parent=None):
        return {"id": id, "body": body, "title": None, "author_name": "שם קהילה", "author_user_id": user,
                "author_contributor_id": contributor, "parent_id": parent, "origin": "openweb" if contributor else "community_2029",
                "status": "approved", "created_at": "2016-03-08T00:00:00Z", "reactions": {"likes": 2}, "edited_at": None,
                "is_deleted": False, "contributor": None}
    return {OLD: row(OLD, "ההודעה הישנה שלי", contributor=SOURCE), NATIVE: row(NATIVE, "ההודעה החדשה שלי", user=ACTOR),
            CHILD: row(CHILD, "תגובה של חבר נשארת בשרשור", user=OTHER, parent=OLD),
            FOREIGN: row(FOREIGN, "הודעה של חשבון אחר", user=OTHER), PROTECTED: row(PROTECTED, "מקור שמשמש מחקר", contributor=SOURCE),
            ADMIN_OWN: row(ADMIN_OWN, "הודעה של המנהל", user=ADMIN)}

class Files(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass
server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Files, directory=str(ROOT / "dist")))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"
REPORT = {"cases": [], "errors": [], "unexpected_writes": [], "model_attempts": [], "sql_live": False}
READS = {"community_feed_page", "community_replies_page", "community_reply_counts", "community_message_context",
         "community_message_actions_v1", "writer_public_contributions_page_v1", "research_state_snapshot_v1", "fn_research_path_resume_v1",
         "replies_to_me", "dm_inbox", "dm_unread_count", "notification_prefs_guest_get_v1", "notification_prefs_get_v1",
         "fn_method_value", "world_group_source_arrivals_v2"}
TELEMETRY = {"link_identity", "track_visit", "ingest_event", "claim_research_lead", "user_activity"}

def install(page):
    state = {"rows": rows(), "calls": [], "mutations": [], "cap_error": False, "fail_edit": False, "fail_delete": False,
             "hold_edit": False, "hold_delete": False, "held": None, "telemetry": 0}
    page.on("pageerror", lambda error: REPORT["errors"].append(str(error)))
    def route(handler):
        req = handler.request
        url = urlparse(req.url); query = parse_qs(url.query); name = url.path.rsplit("/", 1)[-1]
        actor = None
        token = req.headers.get("authorization", "").removeprefix("Bearer ").split(".")
        if len(token) == 3 and token[2] == "synthetic": actor = json.loads(base64.urlsafe_b64decode(token[1] + "=" * (-len(token[1]) % 4)))["sub"]
        if name in {"ai-analyze", "research-run", "raziel-submit"} or any(host in (url.hostname or "") for host in ("openai", "anthropic", "generativelanguage")):
            REPORT["model_attempts"].append(name); return handler.abort()
        if url.hostname == "127.0.0.1":
            if req.is_navigation_request(): return handler.fulfill(content_type="text/html", body=HTML)
            if url.path.startswith("/api/"):
                if req.method != "GET": REPORT["unexpected_writes"].append(url.path)
                if name == "contributor-self":
                    return handler.fulfill(status=200 if actor else 401, json={"state": "ready" if actor else "login_required",
                        "writer": {"state": "ready", "name": "חשבון בדיקה", "slug": "fixture", "href": "/community/researcher/fixture", "publicVisible": False, "avatar": None},
                        "accountAvatar": None, "rank": {"state": "unavailable"}, "stats": {}})
                return handler.fulfill(json={"state": "unavailable"})
            return handler.continue_()
        if url.hostname != "linswmnnkjxvweumprav.supabase.co": return handler.abort()
        state["calls"].append((name, actor))
        if req.method == "OPTIONS": return handler.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*"})
        if req.method == "POST" and name in TELEMETRY:
            state["telemetry"] += 1; return handler.abort()
        args = req.post_data_json or {} if req.method == "POST" else {}
        if req.method not in {"GET", "HEAD"} and name not in READS | {"community_edit_message", "community_delete_message"}:
            REPORT["unexpected_writes"].append(name); return handler.abort()
        data = []
        visible = [row for row in state["rows"].values() if not row["is_deleted"] or any(child["parent_id"] == row["id"] and not child["is_deleted"] for child in state["rows"].values())]
        if url.path == "/auth/v1/user": data = session(actor)["user"] if actor else None
        elif name == "users":
            data = [{"id": actor, "display_name": "חשבון שני" if actor == OTHER else "חשבון בדיקה", "username": "fixture", "role": "admin" if actor == ADMIN else "member", "avatar_url": None}] if actor else []
            if "vnd.pgrst.object" in req.headers.get("accept", ""): data = data[0] if data else None
        elif name == "community_message_actions_v1":
            if state["cap_error"]: return handler.fulfill(status=404, json={"code": "PGRST202", "message": "not installed"})
            for id in args.get("p_ids", []):
                row = state["rows"].get(id)
                if not row: continue
                own = bool(actor) and (row["author_user_id"] == actor or actor == ACTOR and row["author_contributor_id"] == SOURCE)
                administrator = actor == ADMIN
                available = id != PROTECTED and not row["is_deleted"] and row["status"] in ("approved", "pending")
                editable = own and available and row["status"] == "approved"
                deletable = (own or administrator) and available
                reason = ("not_owner" if not (own or administrator) else "source_requires_review" if id == PROTECTED
                          else "message_unavailable" if not available else "allowed")
                data.append({"id": id, "can_edit": bool(editable), "can_delete": bool(deletable), "reason": reason})
        elif name in {"community_edit_message", "community_delete_message"}:
            state["mutations"].append((name, args))
            row = state["rows"].get(args.get("p_id"))
            own = bool(actor) and row and (row["author_user_id"] == actor or actor == ACTOR and row["author_contributor_id"] == SOURCE)
            if not row or not (own or name == "community_delete_message" and actor == ADMIN):
                return handler.fulfill(status=403, json={"code": "42501", "message": "denied"})
            if row["id"] == PROTECTED: return handler.fulfill(status=409, json={"code": "55000", "message": "source_requires_review"})
            if name == "community_edit_message":
                if state["fail_edit"]: return handler.fulfill(status=503, json={"message": "fixture failure"})
                if state["hold_edit"]: state["held"] = handler; return
                row.update(body=args["p_body"], edited_at="2026-10-26T10:00:00Z")
                data = row["edited_at"]
            else:
                if state["fail_delete"]: return handler.fulfill(status=503, json={"message": "fixture failure"})
                if state["hold_delete"]: state["held"] = handler; return
                row.update(is_deleted=True, body=None, author_name=None, author_user_id=None, author_contributor_id=None, reactions={})
                data = "deleted"
        elif name == "community_feed_page": data = [row for row in visible if row["parent_id"] is None]
        elif name == "community_replies_page": data = [row for row in visible if row["parent_id"] == args.get("p_parent")]
        elif name == "community_message_context": data = [row for row in visible if row["id"] == args.get("p_id")]
        elif name == "community_reply_counts": data = [{"parent_id": id, "reply_count": sum(row["parent_id"] == id for row in visible)} for id in args.get("p_ids", [])]
        elif name == "replies_to_me" and actor == ACTOR:
            data = [{**state["rows"][CHILD], "parent_title": None, "convergence_slug": None, "thread_root_id": OLD, "thread_path": [OLD, CHILD]}]
        elif name == "research_contributions":
            data = [row.copy() for row in state["rows"].values() if not row["is_deleted"]]
            if query.get("or") and SOURCE in query["or"][0]: data = [row for row in data if row["author_user_id"] == ACTOR or row["author_contributor_id"] == SOURCE]
            for field in ["id", "parent_id", "author_contributor_id", "author_user_id", "status"]:
                value = query.get(field, [""])[0]
                if value.startswith("eq."): data = [row for row in data if row.get(field) == value[3:]]
                if value == "is.null": data = [row for row in data if row.get(field) is None]
            # Honor the actual table projection too: a fixture must not hide a
            # missing edited_at column after the author page reloads.
            fields = query.get("select", [""])[0].split(",")
            data = [{key: value for key, value in row.items() if key in fields} for row in data]
        if name in {"community_feed_page", "community_replies_page", "community_message_context"}:
            fields = query.get("select", [""])[0].split(",")
            assert not any(field in fields for field in ["contributor_user_id", "contributor_avatar_url", "contributor_display_name"])
            data = [{key: value for key, value in {**row, "total_count": len(data)}.items() if key in fields} for row in data]
        return handler.fulfill(json=data, headers={"access-control-allow-origin": "*", "content-range": f"0-0/{len(data) if isinstance(data,list) else 1}"})
    page.route("**/*", route)
    return state

def context(browser, width=390, theme="dark", guest=False, actor=ACTOR):
    result = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce", is_mobile=width <= 390, has_touch=width <= 390)
    result.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
    if not guest: result.add_init_script("if(!localStorage.getItem(" + json.dumps(KEY) + "))localStorage.setItem(" + json.dumps(KEY) + "," + json.dumps(json.dumps(session(actor))) + ")")
    return result

def article(page, id=OLD): return page.locator(f"#message-{id}")
def tap(button, width): button.tap() if width <= 390 else button.click()

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        for width in [320, 360, 390, 1440]:
            for theme in ["light", "parchment", "dark"]:
                for surface, path in [("feed", FEED), ("author", AUTHOR)]:
                    ctx = context(browser, width, theme); page = ctx.new_page(); state = install(page)
                    page.goto(BASE + path)
                    root = article(page)
                    edit = root.get_by_role("button", name="עריכה", exact=True)
                    expect(edit).to_be_visible()
                    assert not state["mutations"]
                    tap(edit, width)
                    editor = root.get_by_label("עריכת ההודעה", exact=True)
                    expect(editor).to_be_focused(); editor.fill("טיוטה לביטול"); editor.press("Escape")
                    expect(editor).to_have_count(0); expect(edit).to_be_focused()
                    tap(edit, width); editor = root.get_by_label("עריכת ההודעה", exact=True)
                    editor.fill("הודעה ישנה שתוקנה באותו ממשק")
                    assert editor.evaluate("e=>parseFloat(getComputedStyle(e).fontSize)") >= 18
                    save = root.get_by_role("button", name="שמירה", exact=True)
                    box = save.bounding_box(); assert box["width"] >= 44 and box["height"] >= 44
                    tap(save, width)
                    expect(root.get_by_text("הודעה ישנה שתוקנה באותו ממשק", exact=True)).to_be_visible()
                    expect(root.get_by_text("נערך", exact=False)).to_be_visible()
                    assert len(state["mutations"]) == 1
                    page.reload()
                    expect(article(page).get_by_text("הודעה ישנה שתוקנה באותו ממשק", exact=True)).to_be_visible()
                    expect(article(page).get_by_text("נערך", exact=False)).to_be_visible()
                    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
                    if surface == "feed":
                        expect(article(page, FOREIGN).get_by_role("button", name="עריכה", exact=True)).to_have_count(0)
                        expect(article(page, PROTECTED).get_by_text("עדכון המקור דורש בדיקה.", exact=True)).to_be_visible()
                    page.screenshot(path=str(OUT / f"{surface}-{width}-{theme}.png"), full_page=True)
                    REPORT["cases"].append({"surface": surface, "width": width, "theme": theme, "edit": True, "reload": True, "no_ai": True})
                    ctx.close()
        # A reply in the existing personal inbox opens the same inline controls;
        # deletion keeps the foreign child through Reload and Exact Return.
        for width in [320,360,390,1440]:
            ctx = context(browser,width); page=ctx.new_page(); state=install(page)
            page.goto(BASE+"/2029/me/messages"); page.locator(".wp-layout[data-state=ready]").wait_for()
            page.get_by_role("button",name="תגובות אליי",exact=False).click()
            page.get_by_role("button").filter(has_text="תגובה של חבר נשארת בשרשור").click()
            expect(article(page).get_by_role("button",name="מחיקה",exact=True)).to_be_visible()
            article(page).get_by_role("button",name="מחיקה",exact=True).click()
            confirmation=article(page).get_by_role("alertdialog")
            expect(confirmation).to_be_visible(); assert not state["mutations"]
            confirmation.get_by_role("button",name="מחיקה",exact=True).click()
            expect(article(page).get_by_text("ההודעה נמחקה",exact=True)).to_be_visible()
            expect(article(page,CHILD).get_by_text("תגובה של חבר נשארת בשרשור",exact=True)).to_be_visible()
            page.reload()
            expect(article(page).get_by_text("ההודעה נמחקה",exact=True)).to_be_visible()
            expect(article(page,CHILD)).to_contain_text("תגובה של חבר נשארת בשרשור")
            back_href=page.get_by_role("link",name="חזרה להודעות שלי",exact=True).get_attribute("href")
            page.get_by_role("link",name="חזרה להודעות שלי",exact=True).click(); page.wait_for_url(BASE+back_href)
            expect(page.locator(f'[data-reply-id="{CHILD}"]')).to_be_focused()
            REPORT["cases"].append({"surface":"personal-return","width":width,"tombstone_reload":True,"child_retained":True,"exact_return":True})
            ctx.close()
        # Guest/missing RPC/failure states do not manufacture permission/success.
        for mode in ["guest","unavailable","failed-edit","failed-delete","pending-account-switch"]:
            ctx=context(browser,guest=mode=="guest");page=ctx.new_page();state=install(page)
            state["cap_error"]=mode=="unavailable";state["fail_edit"]=mode=="failed-edit";state["fail_delete"]=mode=="failed-delete"
            page.goto(BASE+FEED);root=article(page);expect(root.get_by_text("ההודעה הישנה שלי",exact=True)).to_be_visible()
            if mode in ["guest","unavailable"]:
                expect(root.get_by_role("button",name="עריכה",exact=True)).to_have_count(0)
                expect(article(page, FOREIGN).get_by_role("button",name="מחיקה",exact=True)).to_have_count(0)
                if mode=="unavailable": expect(page.get_by_text("אפשרויות העריכה אינן זמינות כרגע.",exact=False)).to_be_visible()
                assert not state["mutations"]
            elif mode=="failed-delete":
                root.get_by_role("button",name="מחיקה",exact=True).click();root.get_by_role("alertdialog").get_by_role("button",name="מחיקה",exact=True).click()
                expect(root.get_by_role("alert")).to_be_visible();expect(root.get_by_text("ההודעה הישנה שלי",exact=True)).to_be_visible()
            else:
                root.get_by_role("button",name="עריכה",exact=True).click();editor=root.get_by_label("עריכת ההודעה",exact=True);editor.fill("טיוטה של החשבון הראשון")
                if mode=="failed-edit":
                    root.get_by_role("button",name="שמירה",exact=True).click();expect(root.get_by_role("alert")).to_be_visible();expect(editor).to_have_value("טיוטה של החשבון הראשון")
                else:
                    page.get_by_label("מה תרצו לשתף?",exact=True).fill("טיוטת פרסום פרטית של חשבון ראשון")
                    state["hold_edit"]=True;root.get_by_role("button",name="שמירה",exact=True).click()
                    deadline=time.monotonic()+10
                    while state["held"] is None and time.monotonic()<deadline: page.wait_for_timeout(20)
                    assert state["held"] is not None
                    page.evaluate("""s=>{const key='sb-linswmnnkjxvweumprav-auth-token';localStorage.setItem(key,JSON.stringify(s));const c=new BroadcastChannel(key);c.postMessage({event:'SIGNED_IN',session:s});setTimeout(()=>c.close(),100)}""",session(OTHER))
                    expect(editor).to_have_count(0)
                    expect(page.get_by_label("מה תרצו לשתף?",exact=True)).to_have_value("")
                    state["held"].fulfill(json="2026-10-26T10:00:00Z")
                    expect(root.get_by_role("button",name="עריכה",exact=True)).to_have_count(0)
                    expect(root.get_by_text("ההודעה הישנה שלי",exact=True)).to_be_visible()
                    assert "טיוטה של החשבון הראשון" not in page.locator("body").inner_text()
            REPORT["cases"].append({"mode":mode,"no_fake_success":True});ctx.close()
        # The RPC fixture follows the candidate migration: administrative removal
        # is separate from author-only edits, and cannot bypass source review.
        for width in [320, 360, 390, 1440]:
            for theme in ["light", "parchment", "dark"]:
                ctx = context(browser, width, theme, actor=ADMIN); page = ctx.new_page(); state = install(page)
                page.goto(BASE + FEED)
                foreign = article(page, FOREIGN)
                expect(foreign.get_by_text("הודעה של חשבון אחר", exact=True)).to_be_visible()
                expect(foreign.get_by_role("button", name="מחיקה", exact=True)).to_be_visible()
                expect(foreign.get_by_role("button", name="עריכה", exact=True)).to_have_count(0)
                protected = article(page, PROTECTED)
                expect(protected.get_by_text("עדכון המקור דורש בדיקה.", exact=True)).to_be_visible()
                expect(protected.get_by_role("button", name="מחיקה", exact=True)).to_have_count(0)
                expect(protected.get_by_role("button", name="עריכה", exact=True)).to_have_count(0)
                own = article(page, ADMIN_OWN)
                own.get_by_role("button", name="עריכה", exact=True).click()
                own.get_by_label("עריכת ההודעה", exact=True).fill("הודעת מנהל מתוקנת")
                own.get_by_role("button", name="שמירה", exact=True).click()
                expect(own.get_by_text("הודעת מנהל מתוקנת", exact=True)).to_be_visible()
                foreign.get_by_role("button", name="מחיקה", exact=True).click()
                foreign.get_by_role("alertdialog").get_by_role("button", name="מחיקה", exact=True).click()
                expect(foreign.get_by_text("ההודעה נמחקה", exact=True)).to_be_visible()
                assert [name for name, _ in state["mutations"]] == ["community_edit_message", "community_delete_message"]
                page.reload()
                expect(article(page, ADMIN_OWN).get_by_text("הודעת מנהל מתוקנת", exact=True)).to_be_visible()
                expect(article(page, FOREIGN)).to_have_count(0)
                assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
                REPORT["cases"].append({"mode": "admin", "width": width, "theme": theme,
                    "foreign_delete": True, "foreign_edit_denied": True, "own_edit": True, "protected_denied": True})
                ctx.close()
        # A failed moderation removal is never shown as successful.
        ctx = context(browser, actor=ADMIN); page = ctx.new_page(); state = install(page); state["fail_delete"] = True
        page.goto(BASE + FEED); foreign = article(page, FOREIGN)
        foreign.get_by_role("button", name="מחיקה", exact=True).click()
        foreign.get_by_role("alertdialog").get_by_role("button", name="מחיקה", exact=True).click()
        expect(foreign.get_by_role("alert")).to_be_visible()
        expect(foreign.get_by_text("הודעה של חשבון אחר", exact=True)).to_be_visible()
        expect(foreign.get_by_text("ההודעה נמחקה", exact=True)).to_have_count(0)
        REPORT["cases"].append({"mode": "admin-failed-delete", "no_fake_success": True}); ctx.close()
        # A delayed admin acknowledgment cannot paint a tombstone into the next account.
        ctx = context(browser, actor=ADMIN); page = ctx.new_page(); state = install(page); state["hold_delete"] = True
        page.goto(BASE + FEED); foreign = article(page, FOREIGN)
        foreign.get_by_role("button", name="מחיקה", exact=True).click()
        foreign.get_by_role("alertdialog").get_by_role("button", name="מחיקה", exact=True).click()
        deadline = time.monotonic() + 10
        while state["held"] is None and time.monotonic() < deadline: page.wait_for_timeout(20)
        assert state["held"] is not None
        page.evaluate("""s=>{const key='sb-linswmnnkjxvweumprav-auth-token';localStorage.setItem(key,JSON.stringify(s));const c=new BroadcastChannel(key);c.postMessage({event:'SIGNED_IN',session:s});setTimeout(()=>c.close(),100)}""", session(OTHER))
        expect(foreign.get_by_role("alertdialog")).to_have_count(0)
        state["held"].fulfill(json="deleted")
        expect(foreign.get_by_text("הודעה של חשבון אחר", exact=True)).to_be_visible()
        expect(foreign.get_by_text("ההודעה נמחקה", exact=True)).to_have_count(0)
        REPORT["cases"].append({"mode": "admin-pending-account-switch", "no_stale_tombstone": True}); ctx.close()
        browser.close()
finally:
    server.shutdown();server.server_close()

assert not REPORT["errors"],REPORT["errors"]
assert not REPORT["unexpected_writes"],REPORT["unexpected_writes"]
assert not REPORT["model_attempts"],REPORT["model_attempts"]
(OUT/"results.json").write_text(json.dumps(REPORT,ensure_ascii=False,indent=2))
print(json.dumps({"cases":len(REPORT["cases"]),"errors":REPORT["errors"],"unexpected_writes":REPORT["unexpected_writes"],"model_attempts":REPORT["model_attempts"]},ensure_ascii=False))
