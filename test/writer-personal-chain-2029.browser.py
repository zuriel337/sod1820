"""Built App2029, canonical shared editors/inbox and synthetic HTTP only.

No external request is forwarded; all mutations below acknowledge local fixtures.
Run after npm run build:2029. Evidence stays in work/evidence/writer-personal.
"""
import base64
import functools
import json
import os
import subprocess
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("WRITER_PERSONAL_OUT", str(ROOT / "docs/reviews/personal-area-balanced-rtl-evidence-20261026")))
OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / "dist/2029.html").read_text()
ACCOUNT = "22222222-2222-4222-8222-222222222222"
OTHER = "33333333-3333-4333-8333-333333333333"
PHOTO = "/test/fixtures/public-contributor-catalog.svg"
PUBLIC = "/community/researcher/tzvi-opoc"
FIXTURE = json.loads(subprocess.check_output(["node", "--input-type=module", "-e",
    "import*as c from'./src/components/contributor2029/publicSourceCatalog2029Fixtures.js';"
    "console.log(JSON.stringify({identity:c.catalogFixtureIdentity,sources:c.catalogFixtureSources()}))"], cwd=ROOT, text=True))


class StaticFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(StaticFiles, directory=str(ROOT / "dist")))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:" + str(server.server_port)
report = {"runtime": "built App2029 + existing Auth/Research/frame + shared editors/inbox",
          "data": "synthetic HTTP fixtures; no live writes", "captures": [], "flows": [], "errors": [], "editor_refresh_checks": []}


def session(uid=ACCOUNT):
    def part(value):
        return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")
    token = part({"alg": "HS256"}) + "." + part({"sub": uid, "role": "authenticated", "exp": int(time.time()) + 3600}) + ".synthetic"
    return {"access_token": token, "refresh_token": "synthetic", "expires_at": int(time.time()) + 3600,
            "expires_in": 3600, "token_type": "bearer", "user": {"id": uid, "email": "fixture@example.invalid"}}


def install(page, *, guest=False, writer_state="ready", fail_self=False, fail_send=False, fail_follow=False):
    state = {"writer_state": writer_state, "avatar": None, "accountAvatar": PHOTO, "fail_send": fail_send,
             "fail_follow": fail_follow, "fail_profile": False, "fail_self": fail_self, "calls": [], "messages": [],
             "hold_self": False, "held_self": None, "held_self_data": None, "save_ack": {"ok": True},
             "page_config": {"version": 1, "highlights": ["keep-this-highlight"], "sections": [],
                             "links": [{"label": "קישור קיים", "url": "https://example.invalid/kept"}]},
             "uid": ACCOUNT, "held_profile": None, "hold_profile": False, "name": FIXTURE["identity"]["display_name"], "bio": "תיאור קיים", "topics": ["author:" + FIXTURE["identity"]["display_name"]]}
    page.on("pageerror", lambda error: report["errors"].append(str(error)))

    def route(r):
        req = r.request
        u = urlparse(req.url)
        q = parse_qs(u.query)
        name = u.path.rsplit("/", 1)[-1]
        local = u.hostname == "127.0.0.1"
        if local and req.is_navigation_request() and req.resource_type == "document":
            return r.fulfill(content_type="text/html", body=HTML)
        if local and u.path == PHOTO:
            return r.fulfill(content_type="image/svg+xml", body=(ROOT / PHOTO.lstrip("/")).read_text())
        if local and u.path.startswith("/api/"):
            body = req.post_data_json if req.method == "POST" else None
            state["calls"].append({"name": name, "method": req.method, "body": body})
            data = {}
            if name == "contributor-self":
                if guest:
                    return r.fulfill(status=401, json={"state": "login_required"})
                assert req.headers.get("authorization", "").startswith("Bearer ")
                if state["fail_self"]:
                    return r.fulfill(status=503, json={"state": "unavailable"})
                if req.method == "POST":
                    assert body["ack"] is True
                    if body["action"] == "create":
                        state.update(writer_state="ready", name=body["displayName"], bio=body["bio"])
                    elif body["action"] == "portrait":
                        state["avatar"] = state["accountAvatar"] if body["enabled"] else None
                    return r.fulfill(json={"state": "saved"})
                if q.get("action") == ["conversation"]:
                    if q.get("writer") == ["missing"]:
                        return r.fulfill(status=404, json={"state": "not_found"})
                    return r.fulfill(json={"state": "ready", "counterpart": OTHER, "writerHref": PUBLIC})
                data = {"state": "ready", "writer": {"state": state["writer_state"], "name": state["name"], "bio": state["bio"],
                    "slug": "tzvi-opoc", "href": PUBLIC, "publicVisible": True, "avatar": state["avatar"]},
                    "accountAvatar": state["accountAvatar"], "rank": {"state": "ready", "level": 5, "label": "חוקר היכל"},
                    "stats": {"xp": 1234, "credits": 90, "streak": None, "tier": "free"}}
                if state["hold_self"]:
                    state["held_self"], state["held_self_data"] = r, data
                    page.evaluate("window.__writerSelfRefreshHeld = true")
                    return
            elif name == "public-contributor-rank":
                data = {"state": "ready", "level": 5, "label": "חוקר היכל"}
            elif name == "contributor-interactions":
                data = {"state": "ready", "owner": not guest and q.get("viewer") != ["public"],
                        "followTopic": "author:" + state["name"], "message": "self" if not guest else "login_required"}
            elif name == "contributor-public-overview":
                data = {"state": "ready", "joinedAt": "2026-07-16T12:00:00Z", "lastSeenState": "unavailable",
                        "studio": {"available": True, "items": [], "hasMore": False, "page": 0}}
            return r.fulfill(json=data)
        if local:
            return r.continue_()
        if u.hostname != "linswmnnkjxvweumprav.supabase.co":
            return r.abort()
        body = req.post_data_json if req.method in ["POST", "PATCH"] else None
        state["calls"].append({"name": name, "method": req.method, "body": body})
        data = []
        if u.path == "/auth/v1/user":
            data = session(state["uid"])["user"]
        elif name == "users":
            if state["hold_profile"] and q.get("id") == ["eq." + OTHER]:
                state["held_profile"] = r
                return
            if req.method == "PATCH":
                if state["fail_profile"]:
                    return r.fulfill(json=None)
                state["accountAvatar"] = body.get("avatar_url")
            data = {"id": state["uid"], "username": "fixture-writer", "display_name": "חשבון בדיקה",
                    "avatar_url": state["accountAvatar"], "role": "member", "tier": "free"}
        elif name == "contributors":
            identity = {**FIXTURE["identity"], "user_id": ACCOUNT, "bio": state["bio"], "public_visibility": "public", "visibility": "public",
                        "public_avatar": {"enabled": bool(state["avatar"]), "url": state["avatar"]},
                        "page_config": state["page_config"]}
            data = [identity] if "in." in q.get("display_name", [""])[0] or not "application/vnd.pgrst.object+json" in req.headers.get("accept", "") else identity
        elif name == "channel_updates":
            data = FIXTURE["sources"] if q.get("contributor_id") != ["is.null"] else []
        elif name == "dm_inbox":
            data = [{"counterpart": OTHER, "name": "צבי בשיחה", "last_body": "הודעה קיימת", "last_at": "2026-10-22T10:00:00Z", "unread": 1}]
        elif name == "dm_thread":
            data = [{"id": "m1", "from_user": OTHER, "body": "הודעה קיימת", "created_at": "2026-10-22T10:00:00Z"}] + state["messages"]
        elif name == "dm_send":
            if state["fail_send"]:
                return r.fulfill(status=503, json={"message": "synthetic unavailable"})
            state["messages"].append({"id": "sent-1", "from_user": ACCOUNT, "body": body["p_body"], "created_at": "2026-10-23T10:00:00Z"})
            data = {"ok": True}
        elif name == "watch_toggle":
            if state["fail_follow"]:
                return r.fulfill(status=503, json={"message": "synthetic unavailable"})
            state["topics"] = [] if not body["p_on"] else [body["p_topic"]]
            data = {"ok": True}
        elif name == "notification_prefs":
            data = {"topics": state["topics"], "channels": []}
        elif name == "user_notifications":
            data = [{"id": "n1", "kind": "dm", "title": "הודעה מהכותב", "body": "עדכון בתיבה הקיימת", "read_at": "2026-10-23T10:00:00Z",
                     "created_at": "2026-10-22T10:00:00Z", "link": "/me?tab=messages&dm=" + OTHER}]
        elif name == "replies_to_me":
            data = [{"id": "r1", "author_name": "חבר קהילה", "body": "תגובה לתרומה שלי", "created_at": "2026-10-22T10:00:00Z"}]
        elif name == "update_my_page_config":
            assert body["p_config"]["highlights"] == ["keep-this-highlight"]
            assert body["p_config"]["links"][0]["url"] == "https://example.invalid/kept"
            data = state["save_ack"]
            if isinstance(data, dict) and data.get("ok") is True:
                state["page_config"] = body["p_config"]
                state["bio"] = body["p_config"].get("bio", state["bio"])
                state["name"] = body["p_config"].get("display_name", state["name"])
        elif "prefs" in name:
            data = {"topics": state["topics"], "channels": []}
        return r.fulfill(content_type="application/json", headers={"access-control-allow-origin": "*", "content-range": "0-24/25"}, body=json.dumps(data))

    page.route("**/*", route)
    return state


def open_context(browser, theme="dark", width=390, guest=False):
    context = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce",
                                  has_touch=width <= 390, is_mobile=width <= 390)
    context.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
    if not guest:
        context.add_init_script("localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token'," + json.dumps(json.dumps(session())) + ")")
    return context


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        for width in ([] if os.environ.get("WRITER_SKIP_CAPTURES") else [320, 390, 768, 1440]):
            for theme in ["light", "parchment", "dark"]:
                context = open_context(browser, theme, width)
                page = context.new_page()
                state = install(page)
                for module in ["public-page", "page-editor", "profile", "messages", "notifications", "progress"]:
                    page.goto(BASE + "/2029/me/" + module + "?returnTo=" + PUBLIC)
                    page.locator(".wp-layout[data-state=ready]").wait_for()
                    if module == "page-editor":
                        page.get_by_placeholder("השם שיוצג בראש הדף שלך").wait_for()
                    elif module == "profile":
                        expect(page.get_by_label("שם משתמש (ציבורי)")).to_have_value("fixture-writer")
                    elif module == "messages":
                        page.get_by_role("button").filter(has_text="הודעה קיימת").wait_for()
                    elif module == "notifications":
                        page.locator(".fc-update").filter(has_text="הודעה מהכותב").wait_for()
                    elif module == "progress":
                        expect(page.locator(".pc-rank")).to_have_count(0)
                        expect(page.get_by_text("הדרגה אינה זמינה כרגע.",exact=True)).to_be_visible()
                        assert "לא זמין" in page.locator(".wp-stats").inner_text()
                    assert page.locator(".sod29-root.surface-community").count() == 1
                    assert page.locator("meta[name=robots]").get_attribute("content").startswith("noindex")
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (width, theme, module)
                    assert page.locator(".wp-head a").first.get_attribute("href") == PUBLIC
                    geometry = page.locator(".wp-layout").evaluate("""node => {
                      const box=node.getBoundingClientRect(), host=node.closest('.sod29-content').getBoundingClientRect();
                      const targets=[...node.querySelectorAll('a,button,input:not([type=checkbox]):not([type=radio]),textarea,select')]
                        .filter(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width&&r.height&&s.visibility!=='hidden'&&s.display!=='none';})
                        .map(el=>({tag:el.tagName,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,label:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,40)}));
                      return {left:box.left-host.left,right:host.right-box.right,width:box.width,host:host.width,targets};
                    }""")
                    assert abs(geometry["left"] - geometry["right"]) <= 2.5, (width, theme, module, geometry)
                    assert geometry["width"] <= min(982, geometry["host"] + 1), geometry
                    too_small = [target for target in geometry["targets"] if target["h"] < 43.5 or target["w"] < 43.5]
                    assert not too_small, (width, theme, module, too_small[:8])
                    assert page.locator(".wp-nav").evaluate("n=>n.scrollWidth<=n.clientWidth"), (width, theme, module, "nav")
                    page.screenshot(path=str(OUT / f"{width}-{theme}-{module}.png"))
                    report["captures"].append({"width": width, "theme": theme, "module": module, "overflow": False,
                                               "balanced_gutters": [geometry["left"], geometry["right"]], "layout_width": geometry["width"]})
                page.goto(BASE + "/2029/me/notifications?returnTo=" + PUBLIC)
                page.locator(".wp-layout[data-state=ready]").wait_for()
                before_models = len([c for c in state["calls"] if c["name"] in ["ai-analyze", "research-run"]])
                page.get_by_role("button", name="האזור האישי", exact=True).click()
                workspace = page.locator('.sod29-frame-panel[data-panel-kind="workspace"]')
                workspace.wait_for()
                panel_box = workspace.evaluate("""node=>{const r=node.getBoundingClientRect();return {left:r.left,right:innerWidth-r.right,width:r.width,overflow:node.scrollWidth>node.clientWidth}}""")
                assert not panel_box["overflow"], (width, theme, panel_box)
                assert abs(panel_box["left"] - panel_box["right"]) <= 2.5, (width, theme, panel_box)
                expect(workspace.get_by_role("button", name="המחקר שלי", exact=False)).to_be_visible()
                conversations = workspace.get_by_role("button", name="השיחות שלי", exact=False)
                expect(conversations).to_be_visible()
                conversations.click()
                expect(workspace.get_by_role("heading", name="השיחות שלי", exact=True)).to_be_visible()
                assert len([c for c in state["calls"] if c["name"] in ["ai-analyze", "research-run"]]) == before_models
                page.screenshot(path=str(OUT / f"{width}-{theme}-workspace-conversations.png"))
                page.get_by_role("button", name="סגור", exact=True).click()
                if width in [320, 390]:
                    page.evaluate("document.body.tabIndex=-1;document.body.focus()")
                    page.keyboard.press("End")
                    page.wait_for_timeout(220)
                    assert page.evaluate("scrollY > 0 || document.documentElement.scrollHeight <= innerHeight"), (width, theme, "keyboard-scroll")
                    page.keyboard.press("Home")
                    page.evaluate("scrollTo(0,0)")
                    client = context.new_cdp_session(page)
                    client.send("Input.dispatchTouchEvent", {"type":"touchStart","touchPoints":[{"x":width/2,"y":820}]})
                    for y in [700, 560, 420, 280, 140]:
                        client.send("Input.dispatchTouchEvent", {"type":"touchMove","touchPoints":[{"x":width/2,"y":y}]})
                        page.wait_for_timeout(35)
                    client.send("Input.dispatchTouchEvent", {"type":"touchEnd","touchPoints":[]})
                    page.wait_for_timeout(120)
                    assert page.evaluate("scrollY > 0 || document.documentElement.scrollHeight <= innerHeight"), (width, theme, "touch-scroll")
                assert not any(c["name"] in ["update_my_page_config", "update_my_dossier", "dm_send", "watch_toggle"] for c in state["calls"])
                context.close()
        # Hold the overview refresh after a confirmed save: the editor and next draft must survive.
        for width in [390, 1440]:
            context = open_context(browser, width=width); page = context.new_page(); state = install(page)
            page.goto(BASE + "/2029/me/page-editor")
            bio = page.get_by_placeholder("כמה מילים עליך ועל המחקר שלך…")
            bio.fill("תיאור שנשמר בהצלחה")
            page.locator(".wp-body fieldset").evaluate("n=>window.__savedEditorNode=n")
            state["hold_self"] = True
            page.get_by_role("button", name="💾 שמור את הדף שלי").click()
            page.wait_for_function("window.__writerSelfRefreshHeld === true")
            snapshot = {"width": width, "editor_retained": page.evaluate("window.__savedEditorNode.isConnected"),
                        "layout_state": page.locator(".wp-layout").get_attribute("data-state")}
            (OUT / "editor-refresh-snapshot.json").write_text(json.dumps(snapshot, ensure_ascii=False))
            assert snapshot["editor_retained"] and snapshot["layout_state"] == "ready", snapshot
            expect(page.get_by_text("נשמר! הדף שלך עודכן ✓", exact=True)).to_be_visible()
            bio.fill("טיוטה חדשה בזמן רענון")
            state["hold_self"] = False
            state["held_self_data"]["writer"]["href"] = PUBLIC + "?fixture-refreshed=1"
            state["held_self"].fulfill(json=state["held_self_data"])
            expect(page.get_by_role("link", name="בחירת כתבים והקדמה בדף שלי", exact=True)).to_have_attribute("href", PUBLIC + "?fixture-refreshed=1")
            expect(bio).to_have_value("טיוטה חדשה בזמן רענון")
            assert page.evaluate("window.__savedEditorNode.isConnected")
            assert len([c for c in state["calls"] if c["name"] == "update_my_page_config"]) == 1
            report["editor_refresh_checks"].append({**snapshot, "new_draft_preserved": True})
            context.close()
        for status in [503, 401]:
            context = open_context(browser); page = context.new_page(); state = install(page)
            page.goto(BASE + "/2029/me/page-editor")
            bio = page.get_by_placeholder("כמה מילים עליך ועל המחקר שלך…"); bio.fill("שמירה מאושרת לפני כשל רענון")
            state["hold_self"] = True
            page.get_by_role("button", name="💾 שמור את הדף שלי").click()
            page.wait_for_function("window.__writerSelfRefreshHeld === true")
            bio.fill("טיוטה חדשה שלא נשמרה")
            state["held_self"].fulfill(status=status, json={"state": "unavailable" if status == 503 else "login_required"})
            if status == 503:
                expect(page.get_by_text("הדף נשמר. רענון הפרטים לא הושלם; אפשר להמשיך לערוך.", exact=True)).to_be_visible()
                expect(bio).to_have_value("טיוטה חדשה שלא נשמרה")
                assert page.locator(".wp-layout").get_attribute("data-state") == "ready"
            else:
                page.locator('.wp-layout[data-state="error"]').wait_for()
                assert page.get_by_placeholder("כמה מילים עליך ועל המחקר שלך…").count() == 0
                assert "טיוטה חדשה שלא נשמרה" not in page.locator("body").inner_text()
            assert len([c for c in state["calls"] if c["name"] == "update_my_page_config"]) == 1
            report["editor_refresh_checks"].append({"refresh_status": status, "transient_draft_preserved_or_session_masked": True})
            context.close()
        for ack in [None, {"ok": "false"}]:
            context = open_context(browser); page = context.new_page(); state = install(page); state["save_ack"] = ack
            page.goto(BASE + "/2029/me/page-editor")
            bio = page.get_by_placeholder("כמה מילים עליך ועל המחקר שלך…"); bio.fill("טיוטה ללא אישור שמירה")
            before_reads = len([c for c in state["calls"] if c["name"] == "contributor-self"])
            page.get_by_role("button", name="💾 שמור את הדף שלי").click()
            expect(page.get_by_role("alert")).to_contain_text("לא התקבל אישור שמירה")
            expect(bio).to_have_value("טיוטה ללא אישור שמירה")
            assert page.get_by_text("נשמר! הדף שלך עודכן ✓", exact=True).count() == 0
            assert len([c for c in state["calls"] if c["name"] == "contributor-self"]) == before_reads
            report["editor_refresh_checks"].append({"unconfirmed_ack": ack, "draft_preserved_no_refresh": True})
            context.close()
        context = open_context(browser)
        page = context.new_page()
        state = install(page)
        page.goto(BASE + "/community/researcher/me?section=about&studio=secret&access_code=secret")
        page.wait_for_url(BASE + PUBLIC + "?section=about")
        page.get_by_role("heading", name=state["name"], exact=True).wait_for()
        assert not any(c["name"] == "contributor-self" and c["method"] == "POST" for c in state["calls"])
        report["flows"].append("self resolves canonical URL and strips private query; viewing never creates")
        page.goto(BASE + "/2029/me/page-editor")
        page.get_by_placeholder("כמה מילים עליך ועל המחקר שלך…").fill("תיאור ששונה בבדיקה מקומית")
        page.get_by_role("button", name="💾 שמור את הדף שלי").click()
        page.get_by_text("נשמר! הדף שלך עודכן ✓", exact=True).wait_for()
        assert any(c["name"] == "update_my_page_config" for c in state["calls"])
        report["flows"].append("shared page editor preserves existing highlights/links")
        page.goto(BASE + "/2029/me/profile")
        publish = page.get_by_role("button", name="פרסום התמונה בדף הציבורי")
        expect(publish).to_be_disabled()
        page.get_by_role("checkbox").check()
        publish.click()
        page.get_by_role("button", name="הסתרת התמונה מהדף הציבורי").wait_for()
        page.goto(BASE + PUBLIC + "?view=public")
        page.locator(".pc-person-portrait").wait_for()
        assert page.get_by_role("link", name="עריכת הדף הציבורי שלי").count() == 0
        page.goto(BASE + "/2029/me/profile")
        page.get_by_role("button", name="הסתרת התמונה מהדף הציבורי").click()
        page.get_by_role("button", name="פרסום התמונה בדף הציבורי").wait_for()
        page.goto(BASE + PUBLIC + "?view=public")
        page.locator(".pc-person").wait_for()
        assert page.locator(".pc-person-portrait").count() == 0 and page.locator(".pc-person-initial").count() == 1
        report["flows"].append("explicit photo consent -> actual public avatar -> revoke; visitor preview hides owner tools")
        page.goto(BASE + "/2029/me/messages?writer=tzvi-opoc&returnTo=" + PUBLIC)
        page.get_by_role("textbox", name="ההודעה שלך").wait_for()
        assert page.get_by_role("link", name="לדף הכותב").get_attribute("href") == PUBLIC
        state["fail_send"] = True
        page.get_by_role("textbox", name="ההודעה שלך").fill("טיוטה נשמרת בכשל")
        page.get_by_role("button", name="שלח", exact=True).click()
        page.get_by_role("alert").filter(has_text="לא התקבל אישור שליחה").wait_for()
        expect(page.get_by_role("textbox", name="ההודעה שלך")).to_have_value("טיוטה נשמרת בכשל")
        state["fail_send"] = False
        page.get_by_role("button", name="שלח", exact=True).click()
        expect(page.get_by_role("textbox", name="ההודעה שלך")).to_have_value("")
        page.get_by_text("טיוטה נשמרת בכשל", exact=True).wait_for()
        page.get_by_role("button", name="🗣 תגובות אליי").click()
        page.get_by_text("תגובה לתרומה שלי", exact=True).wait_for()
        report["flows"].append("existing inbox exact conversation/writer return, failed send retains draft, confirmed retry, native replies")
        page.goto(BASE + "/2029/me/notifications")
        follow = page.locator(".fc-follow-row button")
        follow.wait_for()
        state["fail_follow"] = True
        follow.click()
        page.get_by_role("alert").filter(has_text="לא התקבל אישור ביטול").wait_for()
        assert follow.count() == 1
        state["fail_follow"] = False
        follow.click()
        expect(follow).to_have_count(0)
        page.locator(".fc-update").filter(has_text="הודעה מהכותב").get_by_role("link", name="לצפייה בתוכן", exact=False).click()
        page.get_by_role("textbox", name="ההודעה שלך").wait_for()
        report["flows"].append("failed unfollow does not remove row; confirmed unfollow; DM notification opens native conversation")
        page.goto(BASE + "/2029/me/profile")
        page.get_by_label("שם תצוגה", exact=True).fill("טיוטה חשבון ראשון")
        state["fail_profile"] = True
        page.locator(".wp-body").get_by_role("button", name="שמירה", exact=True).click()
        page.get_by_role("alert").filter(has_text="לא התקבל אישור שמירה").wait_for()
        expect(page.get_by_label("שם תצוגה", exact=True)).to_have_value("טיוטה חשבון ראשון")
        state["fail_profile"] = False
        state["uid"] = OTHER
        state["hold_profile"] = True
        state["name"] = "כותב בחשבון שני"
        page.evaluate("""s => {
            const key = 'sb-linswmnnkjxvweumprav-auth-token';
            localStorage.setItem(key, JSON.stringify(s));
            const channel = new BroadcastChannel(key);
            channel.postMessage({event:'SIGNED_IN', session:s});
            setTimeout(() => channel.close(), 100);
        }""", session(OTHER))
        page.wait_for_function("document.querySelector('.wp-layout[data-state=ready] input')?.matches(':disabled') === true")
        assert "טיוטה חשבון ראשון" not in page.locator("body").inner_text()
        assert page.get_by_label("שם תצוגה", exact=True).input_value() == ""
        assert state["held_profile"] is not None
        state["held_profile"].fulfill(json={"id": OTHER, "username": "second-account", "display_name": "חשבון שני", "avatar_url": None, "role": "member"})
        expect(page.get_by_label("שם תצוגה", exact=True)).to_have_value("חשבון שני")
        report["flows"].append("profile missing acknowledgment retains draft; account switch masks old draft while new profile is pending")
        context.close()
        for kind in ["unlinked", "ambiguous", "failure", "guest"]:
            context = open_context(browser, guest=kind == "guest")
            page = context.new_page()
            state = install(page, guest=kind == "guest", writer_state=kind if kind in ["unlinked", "ambiguous"] else "ready", fail_self=kind == "failure")
            page.goto(BASE + "/2029/me/public-page")
            if kind == "guest":
                page.locator(".wp-layout").get_by_role("button", name="התחברות לאזור האישי", exact=True).wait_for()
                assert not any(c["name"] == "contributor-self" for c in state["calls"])
            elif kind == "ambiguous":
                page.get_by_role("alert").filter(has_text="נמצאו כמה דפים").wait_for()
            elif kind == "failure":
                page.locator(".wp-layout[data-state=error]").wait_for()
                state["fail_self"] = False
                page.locator(".wp-layout").get_by_role("button", name="נסו שוב").click()
                page.locator(".wp-layout[data-state=ready]").wait_for()
            else:
                create = page.get_by_role("button", name="יצירת הדף הציבורי", exact=True)
                create.wait_for()
                page.get_by_label("שם ציבורי", exact=False).fill("כותב חדש בבדיקה")
                page.get_by_label("תיאור קצר על עצמך", exact=False).fill("תיאור מאושר")
                create.click()
                assert not any(c["name"] == "contributor-self" and c["method"] == "POST" for c in state["calls"])
                page.get_by_role("checkbox").check()
                create.click()
                page.get_by_role("heading", name="כותב חדש בבדיקה", exact=True).wait_for()
                assert len([c for c in state["calls"] if c["name"] == "contributor-self" and c["method"] == "POST"]) == 1
            report["flows"].append("guard: " + kind)
            context.close()
        browser.close()
    assert not report["errors"], report["errors"]
    (OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False))
finally:
    server.shutdown()
    server.server_close()
