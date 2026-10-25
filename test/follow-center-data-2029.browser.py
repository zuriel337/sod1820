"""Real FollowCenter controller/Auth plus synthetic transport only. No request is forwarded.

Run with Vite on CENTER_DATA_PORT. Controlled IO exercises races and partial acks;
transport mode exercises the existing Supabase helpers, and the actual App2029 route.
"""
import base64
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("CENTER_DATA_OUT", "/tmp/follow-center-data-2029"))
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:" + os.environ.get("CENTER_DATA_PORT", "5316")
A = "22222222-2222-4222-8222-222222222222"
B = "33333333-3333-4333-8333-333333333333"
PREAMBLE = """<script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script>"""
HTML = '<!doctype html><html lang="he" dir="rtl"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div>' + PREAMBLE + '<script type="module" src="/test/fixtures/follow-center-data-2029.jsx"></script></body></html>'
APP = (ROOT / "2029.html").read_text().replace("<head>", "<head>" + PREAMBLE)
report = {"cases": [], "failures": [], "errors": [], "unexpected": [], "live_writes": 0}


def session(uid=A):
    def part(v): return base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip("=")
    token = part({"alg": "HS256"}) + "." + part({"sub": uid, "role": "authenticated", "exp": int(time.time()) + 3600}) + ".synthetic"
    return {"access_token": token, "refresh_token": "synthetic", "expires_at": int(time.time()) + 3600,
            "expires_in": 3600, "token_type": "bearer", "user": {"id": uid, "email": "fixture@example.invalid"}}


def install(page):
    state = {"calls": [], "topics": ["number:1820"], "items": [
        {"id": "n1", "title": "עדכון מהקורא", "body": "סינתטי", "created_at": "2026-10-25T12:00:00Z", "read_at": None, "link": "/me?tab=messages&dm=" + B}], "self_calls": 0}
    page.on("pageerror", lambda e: report["errors"].append(str(e)))
    def route(r):
        req = r.request; u = urlparse(req.url); name = u.path.split("/")[-1]
        if u.hostname == "127.0.0.1":
            if req.is_navigation_request():
                return r.fulfill(content_type="text/html", body=HTML if u.path == "/center-data-fixture" else APP)
            if u.path.startswith("/api/"):
                if name == "contributor-self": state["self_calls"] += 1
                return r.fulfill(status=503, json={"state": "unavailable"})
            return r.continue_()
        if u.hostname != "linswmnnkjxvweumprav.supabase.co": return r.abort()
        if req.method == "OPTIONS": return r.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*"})
        body = req.post_data_json if req.method in ("POST", "PATCH") else None
        state["calls"].append({"name": name, "method": req.method, "body": body})
        if u.path == "/auth/v1/user":
            token = req.headers.get("authorization", "").split(" ")[-1].split(".")
            uid = json.loads(base64.urlsafe_b64decode(token[1] + "=="))["sub"]
            return r.fulfill(json=session(uid)["user"])
        if name == "users" and req.method == "GET":
            uid = parse_qs(u.query).get("id", ["eq." + A])[0].removeprefix("eq.")
            return r.fulfill(json={"id": uid, "display_name": "חשבון בדיקה", "role": "member"})
        if name == "notification_prefs" and req.method == "GET":
            return r.fulfill(json={"topics": state["topics"], "channels": ["email"], "email": "private@example.invalid"})
        if name == "user_notifications" and req.method == "GET": return r.fulfill(json=state["items"])
        if name == "user_notifications" and req.method == "PATCH":
            assert list(body) == ["read_at"]
            q = parse_qs(u.query)
            assert q.get("select") == ["id,read_at"] and q.get("read_at") == ["is.null"]
            ids = [x for x in state["items"] if not x["read_at"] and (not q.get("id") or q["id"] == ["eq." + x["id"]])]
            for item in ids: item["read_at"] = body["read_at"]
            return r.fulfill(json=[{"id": x["id"], "read_at": x["read_at"]} for x in ids])
        if name == "watch_toggle":
            assert body == {"p_topic": "number:1820", "p_source": "center", "p_on": False, "p_visitor": None}
            state["topics"] = []; return r.fulfill(json={"ok": True})
        if req.method == "GET": return r.fulfill(json=[])
        if name in ("research_state_snapshot_v1", "fn_research_path_resume_v1", "world_group_source_arrivals_v2"):
            return r.fulfill(json=[])  # Existing frame read RPCs, fully synthetic too.
        if name in ("link_identity", "log_activity", "user_activity", "track_visit", "ingest_event", "claim_research_lead"):
            return r.abort()  # Existing Auth/frame telemetry; never forwarded.
        report["unexpected"].append(req.method + " " + u.path)
        return r.abort()
    page.route("**/*", route)
    return state


def open_case(browser, *, width=390, theme="light", transport=False, app=False, guest=False):
    context = browser.new_context(viewport={"width": width, "height": 1000})
    init = "localStorage.setItem('sod-theme'," + json.dumps(theme) + ");"
    if not guest: init += "localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token'," + json.dumps(json.dumps(session())) + ");"
    context.add_init_script(init)
    page = context.new_page(); state = install(page)
    page.goto(BASE + ("/2029/me/notifications" if app else "/center-data-fixture" + ("?transport=1" if transport else "")))
    if not guest: page.locator(".fc-follow-row").wait_for()
    else: page.locator(".fc-guest").wait_for()
    return context, page, state


def controlled(browser, name, run):
    context, page, state = open_case(browser)
    try: run(page, state); report["cases"].append(name)
    finally: context.close()


def unread(page, count): expect(page.locator(".fc-update[data-unread=true]")).to_have_count(count)
def refresh(page): page.evaluate("window.__centerFixture.changeAdapter()")
def mark_button(page): return page.get_by_role("button", name="סמן הכול כנקרא", exact=False)


def partial(page, _):
    page.evaluate("window.__centerFixture.markAck={ok:true,markedIds:['n1']}")
    mark_button(page).click(); unread(page, 1)
    assert page.evaluate("window.__centerFixture.calls.filter(c=>c.kind==='markAll').length") == 1


def empty_ack(page, _):
    page.evaluate("window.__centerFixture.markAck={ok:true,markedIds:[]}")
    mark_button(page).click(); unread(page, 2)


def failed_mark(page, _):
    page.evaluate("window.__centerFixture.fail.markAll=true")
    mark_button(page).click(); page.get_by_role("alert").filter(has_text="לא התקבל אישור סימון").wait_for(); unread(page, 2)
    page.get_by_role("button", name="ניסיון נוסף", exact=True).click()
    page.get_by_role("alert").filter(has_text="לא התקבל אישור סימון").wait_for(state="hidden")
    assert page.evaluate("window.__centerFixture.calls.filter(c=>c.kind==='markAll').length") == 1


def busy_mark(page, _):
    page.evaluate("window.__centerFixture.holds.markAll=true")
    mark_button(page).click()
    expect(page.get_by_role("button", name="מסמן כנקרא…", exact=True)).to_be_disabled()
    page.evaluate("document.querySelector('.fc-updates .fc-link').click()")
    assert page.evaluate("window.__centerFixture.calls.filter(c=>c.kind==='markAll').length") == 1
    page.evaluate("window.__centerFixture.held.shift().resolve({ok:true,markedIds:['n1']})"); unread(page, 1)


def partial_read(page, _):
    page.evaluate("window.__centerFixture.fail.readUpdates=true"); refresh(page)
    page.get_by_role("alert").filter(has_text="לא ניתן לקרוא את העדכונים").wait_for()
    expect(page.locator(".fc-follow-row")).to_have_count(1)
    expect(page.get_by_text("אין עדכונים עדיין.", exact=False)).to_have_count(0)
    page.evaluate("window.__centerFixture.fail.readUpdates=false")
    page.get_by_role("button", name="ניסיון נוסף").click(); unread(page, 2)


def known_empty(page, _):
    page.evaluate("Object.assign(window.__centerFixture,{topics:[],updates:[]})"); refresh(page)
    page.get_by_text("אין עדכונים עדיין.", exact=False).wait_for()
    expect(page.locator(".fc-follow-row")).to_have_count(0)


def retained_follow(page, _):
    page.evaluate("window.__centerFixture.applyUnfollow=false")
    page.get_by_role("button", name="ביטול מעקב:", exact=False).click()
    page.get_by_role("alert").filter(has_text="לא התקבל אישור ביטול").wait_for()
    expect(page.locator(".fc-follow-row")).to_have_count(1)
    page.evaluate("window.__centerFixture.applyUnfollow=true")
    page.get_by_role("button", name="ביטול מעקב:", exact=False).click()
    expect(page.locator(".fc-follow-row")).to_have_count(0)


def applied_unconfirmed(page, _):
    page.get_by_role("button", name="ביטול מעקב:", exact=False).click()
    expect(page.locator(".fc-follow-row")).to_have_count(0)
    assert page.evaluate("window.__centerFixture.calls.filter(c=>c.kind==='readFollows').length") == 2


def unknown_follow(page, _):
    page.evaluate("window.__centerFixture.fail.readFollows=true")
    page.get_by_role("button", name="ביטול מעקב:", exact=False).click()
    page.get_by_role("alert").filter(has_text="לא ניתן לקרוא את רשימת המעקב").wait_for()
    expect(page.get_by_text("עוד לא בחרתם לעקוב", exact=False)).to_have_count(0)
    page.evaluate("window.__centerFixture.fail.readFollows=false")
    page.get_by_role("button", name="ניסיון נוסף").click()
    expect(page.locator(".fc-life li").first).to_contain_text("עוד לא בחרת")
    assert page.evaluate("window.__centerFixture.calls.filter(c=>c.kind==='unfollow').length") == 1


def stale_adapter(page, _):
    page.evaluate("window.__centerFixture.holds.markAll=true"); mark_button(page).click()
    refresh(page); unread(page, 2)
    page.evaluate("window.__centerFixture.held.shift().resolve({ok:true,markedIds:['n1','n2']})")
    page.wait_for_timeout(100); unread(page, 2)


def stale_account(page, _):
    page.evaluate("window.__centerFixture.holds.markAll=true"); mark_button(page).click()
    page.evaluate("""s=>{
      const key='sb-linswmnnkjxvweumprav-auth-token';localStorage.setItem(key,JSON.stringify(s));
      const channel=new BroadcastChannel(key);channel.postMessage({event:'SIGNED_IN',session:s});setTimeout(()=>channel.close(),100);
    }""", session(B))
    page.wait_for_function("window.__centerFixture.calls.some(c=>c.kind==='readUpdates'&&c.userId===" + json.dumps(B) + ")")
    page.evaluate("window.__centerFixture.held.shift().resolve({ok:true,markedIds:['n1','n2']})")
    page.wait_for_timeout(100); unread(page, 2)


def stale_read(page, _):
    page.evaluate("window.__centerFixture.holds.readUpdates=true"); refresh(page)
    page.wait_for_function("window.__centerFixture.held.length===1")
    page.evaluate("Object.assign(window.__centerFixture,{holds:{},updates:[{id:'new',title:'חשבון שני בלבד',created_at:'2026-10-25T12:00:00Z',read_at:null}]})")
    page.evaluate("""s=>{
      const key='sb-linswmnnkjxvweumprav-auth-token';localStorage.setItem(key,JSON.stringify(s));
      const channel=new BroadcastChannel(key);channel.postMessage({event:'SIGNED_IN',session:s});setTimeout(()=>channel.close(),100);
    }""", session(B))
    page.get_by_text("חשבון שני בלבד", exact=True).wait_for()
    page.evaluate("window.__centerFixture.held.shift().resolve([{id:'old',title:'פרטי מחשבון קודם',created_at:'2026-10-25T12:00:00Z',read_at:null}])")
    page.wait_for_timeout(100)
    expect(page.get_by_text("פרטי מחשבון קודם", exact=True)).to_have_count(0)
    expect(page.get_by_text("חשבון שני בלבד", exact=True)).to_be_visible()


def read_timeout(page, _):
    page.clock.install()
    page.evaluate("window.__centerFixture.holds.readUpdates=true"); refresh(page)
    page.wait_for_function("window.__centerFixture.held.length===1")
    page.clock.run_for(12001)
    page.get_by_role("alert").filter(has_text="לא ניתן לקרוא את העדכונים").wait_for()
    expect(page.get_by_text("אין עדכונים עדיין.", exact=False)).to_have_count(0)
    page.evaluate("window.__centerFixture.holds.readUpdates=false")
    page.get_by_role("button", name="ניסיון נוסף").click(); unread(page, 2)
    page.evaluate("window.__centerFixture.held.shift().resolve([])")
    page.clock.run_for(100); unread(page, 2)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"), headless=True, args=["--no-sandbox"])
    cases = [("partial mark ack changes only confirmed IDs", partial), ("empty mark ack clears nothing", empty_ack),
             ("failed mark and read-only retry", failed_mark), ("pending mark blocks duplicate clicks", busy_mark),
             ("partial reader failure is not empty", partial_read), ("measured empty inbox/follows", known_empty),
             ("retained follow only after authoritative read", retained_follow), ("unconfirmed mutation applied: readback resolves", applied_unconfirmed),
             ("unfollow recovery reads without replay", unknown_follow), ("late mutation after adapter switch ignored", stale_adapter),
             ("late mutation after account switch ignored", stale_account), ("late private read after account switch ignored", stale_read),
             ("read deadline and late completion cannot prove empty", read_timeout)]
    for name, run in cases:
        try: controlled(browser, name, run)
        except Exception as e: report["failures"].append({"case": name, "error": str(e)[:1500]})
    for theme in ("light", "parchment", "dark"):
        for width in (320, 390, 1440):
            context, page, state = open_case(browser, theme=theme, width=width)
            try:
                assert page.evaluate("document.documentElement.scrollWidth<=innerWidth"), "horizontal overflow"
                expect(page.locator(".fc-channel .fc-chip")).to_have_text(["לא נבדק"] * 3)
                expect(page.locator(".fc-life li").last).to_contain_text("מצב המשלוח לא נבדק")
                assert not any(x["kind"].startswith("mark") or x["kind"] == "unfollow" for x in page.evaluate("window.__centerFixture.calls"))
                if width == 390: page.screenshot(path=str(OUT / ("connected-" + theme + ".png")), full_page=True)
                report["cases"].append(f"connected view {theme}/{width}")
            except Exception as e: report["failures"].append({"case": f"{theme}/{width}", "error": str(e)[:1500]})
            finally: context.close()
    for app in (False, True):
        context, page, state = open_case(browser, transport=True, app=app)
        try:
            expect(page.get_by_text("עדכון מהקורא", exact=True)).to_be_visible()
            assert state["self_calls"] == 0, "notification center must not require contributor-self/XP/author binding"
            mark_button(page).click(); unread(page, 0)
            page.get_by_role("button", name="ביטול מעקב:", exact=False).click()
            expect(page.locator(".fc-follow-row")).to_have_count(0)
            href = page.locator(".fc-open").get_attribute("href")
            assert href.startswith("/2029/me/messages?dm=" + B) and "returnTo=" in href
            writes = [x for x in state["calls"] if x["name"] in ("watch_toggle", "user_notifications") and x["method"] != "GET"]
            assert len(writes) == 2
            report["cases"].append("actual App2029 personal route + canonical helpers" if app else "canonical helper transport + strict acks")
        except Exception as e: report["failures"].append({"case": "transport/app=" + str(app), "error": str(e)[:1500]})
        finally: context.close()
    context, page, state = open_case(browser, guest=True)
    try:
        assert page.evaluate("window.__centerFixture.calls.length") == 0
        assert not any(x["name"] in ("user_notifications", "notification_prefs", "watch_toggle") for x in state["calls"])
        report["cases"].append("guest has no account inbox or mutation requests")
    finally: context.close()
    context, page, state = open_case(browser, transport=True, app=True)
    try:
        page.locator(".fc-open").click()
        page.wait_for_url("**/2029/me/messages?dm=" + B + "&returnTo=**")
        marks = [x for x in state["calls"] if x["name"] == "user_notifications" and x["method"] == "PATCH"]
        assert len(marks) == 1 and state["items"][0]["read_at"]
        report["cases"].append("unread exact target is marked before native conversation navigation")
    except Exception as e: report["failures"].append({"case": "single mark/navigation", "error": str(e)[:1500]})
    finally: context.close()
    browser.close()
(OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report, ensure_ascii=False))
assert not report["failures"] and not report["errors"] and not report["unexpected"], report
