"""Built 2029 Workspace projections. All Auth, cloud, telemetry and AI HTTP is
intercepted; no live request, model call or database write is permitted.
"""
import base64
import functools
import json
import os
import threading
import time
from copy import deepcopy
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("TASK_WORKSPACE_COMPLETION_OUT", "/tmp/workspace-raziel-completion-browser"))
OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / "dist/2029.html").read_text()
A = "22222222-2222-4222-8222-222222222222"
B = "33333333-3333-4333-8333-333333333333"
AUTH_KEY = "sb-linswmnnkjxvweumprav-auth-token"
SOURCE_HREF = "/2029/number/337?expression=known#source-4"
SUBJECT = {"type": "number", "id": "337", "label": "נושא בדיקה"}

def conversation(ref, title):
    question = "שאלה פרטית " + ref
    return {"id": "raziel-session:" + ref, "ref": ref, "type": "raziel_session", "title": title,
        "schema": "raziel-saved-session-v1", "saved_at": "2026-10-26T12:00:00Z", "message_count": 3, "turn_count": 1,
        "view_mode": "exploratory", "context_snapshot": {"subject": SUBJECT}, "thread": [
            {"role": "user", "text": question, "turnId": ref},
            {"role": "raziel", "text": "פרשנות פרטית " + ref, "question": question, "turnId": ref,
             "level": "fast", "sourceNames": [], "grounding": "interpretation", "viewMode": "general", "viewModeApplied": True},
            {"role": "raziel", "text": "תמונה קיימת " + ref, "question": question, "turnId": ref,
             "level": "fast", "sourceNames": ["מקור שכבר נשמר"], "grounding": "sourced", "viewMode": "landscape", "viewModeApplied": True}]}

def snapshot(ref):
    conv = conversation(ref, "כותרת פרטית " + ref)
    conv["coll"] = "collection-1"
    source = {"id": "source:1", "ref": "1", "type": "source", "title": "מקור מדויק " + ref,
              "link": SOURCE_HREF, "metadata": {"subject": SUBJECT}}
    note = {"id": "note:1", "ref": "1", "type": "note", "title": "הערה קשורה " + ref,
            "metadata": {"subject": SUBJECT, "text": "זו הערה שמורה " + ref}}
    unrelated = {"id": "note:2", "ref": "2", "type": "note", "title": "כותרת פרטית " + ref + " 337 ללא קשר"}
    return {"cart": [source], "saved": [conv, source, note, unrelated], "pinned": [source], "history": [],
            "collections": [{"id": "collection-1", "name": "אוסף בדיקה"}], "journeys": [], "context": None, "revision": 0}

def auth_session(uid):
    def part(value): return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")
    token = part({"alg": "HS256"}) + "." + part({"sub": uid, "role": "authenticated", "exp": int(time.time()) + 3600}) + ".synthetic"
    return {"access_token": token, "refresh_token": "synthetic", "expires_at": int(time.time()) + 3600, "expires_in": 3600,
            "token_type": "bearer", "user": {"id": uid, "email": "fixture@example.invalid"}}

class Files(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass

server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Files, directory=str(ROOT / "dist")))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"
REPORT = {"cases": [], "errors": [], "model_calls": [], "els_calls": [], "family_research_calls": [], "unexpected_writes": [], "private_telemetry": [], "live_requests": 0}
READS = {"research_state_snapshot_v1", "fn_research_path_resume_v1", "world_group_source_arrivals_v2",
         "notification_prefs_guest_get_v1", "notification_prefs_get_v1", "fn_method_value", "community_feed_page", "community_reply_counts"}
TELEMETRY = {"track_visit", "link_identity", "ingest_event", "claim_research_lead", "user_activity", "behavior_signal"}

def wire(page):
    page.set_default_timeout(10000)
    state = {"cloud": {A: snapshot("ACCOUNT_A"), B: snapshot("ACCOUNT_B")}, "ops": [], "hold_a": False, "held": None,
             "snapshot_error": False, "profile_unknown": False, "snapshot_reads": []}
    page.on("pageerror", lambda error: REPORT["errors"].append(str(error)))
    def route(handler):
        req = handler.request; url = urlparse(req.url); name = url.path.rsplit("/", 1)[-1]
        request_body = (req.post_data or "").lower()
        actor = None
        token = req.headers.get("authorization", "").removeprefix("Bearer ").split(".")
        if len(token) == 3 and token[2] == "synthetic":
            actor = json.loads(base64.urlsafe_b64decode(token[1] + "=" * (-len(token[1]) % 4)))["sub"]
        if name == "research-run" and "els" in request_body: REPORT["els_calls"].append(name)
        if name == "research-run" and any(marker in request_body for marker in ["family", "member_ref", "family_relation"]): REPORT["family_research_calls"].append(name)
        if name in {"ai-analyze", "research-run", "raziel-submit"} or any(provider in (url.hostname or "") for provider in ["openai", "anthropic", "generativelanguage"]):
            REPORT["model_calls"].append(name); return handler.abort()
        if url.hostname == "127.0.0.1":
            if req.is_navigation_request(): return handler.fulfill(content_type="text/html", body=HTML)
            if url.path.startswith("/api/"):
                if req.method != "GET": REPORT["unexpected_writes"].append(url.path)
                return handler.fulfill(json={"state": "unavailable"})
            return handler.continue_()
        if url.hostname != "linswmnnkjxvweumprav.supabase.co": return handler.abort()
        if req.method == "OPTIONS": return handler.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*"})
        if name in TELEMETRY:
            if any(marker in (req.post_data or "") for marker in ["ACCOUNT_A", "ACCOUNT_B", "GUEST_ONLY", "כותרת פרטית", "שאלה פרטית"]): REPORT["private_telemetry"].append(name)
            return handler.abort()
        if req.method not in {"GET", "HEAD"} and name not in READS | {"research_state_apply_ops_v1"}:
            REPORT["unexpected_writes"].append(name); return handler.abort()
        args = req.post_data_json or {} if req.method == "POST" else {}
        data = []
        if url.path == "/auth/v1/user": data = auth_session(actor)["user"] if actor else None
        elif name == "users": data = {"id": actor, "display_name": "חשבון בדיקה", "username": "fixture", "role": "member", "avatar_url": None} if actor else None
        elif name == "site_flags": data = [{"key": key, "enabled": False, "mode": "all"} for key in ["lock_world", "lock_heichal", "lock_raziel_site", "lock_life_journey", "lock_books", "lock_number"]]
        elif name == "profiles": data = None if state["profile_unknown"] else {"credits": 0 if actor == B else 17, "xp": None, "level": None, "tier": None, "streak": None}
        elif name == "research_state_snapshot_v1":
            assert actor in [A, B] and args.get("p_expected_user_id") == actor
            state["snapshot_reads"].append(actor)
            if state["snapshot_error"]: return handler.fulfill(status=503, json={"message": "fixture unavailable"})
            if state["hold_a"] and actor == A: state["held"] = handler; return
            data = state["cloud"][actor]
        elif name == "research_state_apply_ops_v1":
            assert actor in [A, B] and args.get("p_expected_user_id") == actor
            state["ops"].append({"actor": actor, "ops": deepcopy(args["p_ops"])})
            cloud = state["cloud"][actor]
            assert args["p_expected_revision"] == cloud["revision"]
            for op in args["p_ops"]:
                kind = op["kind"]
                if kind == "item_upsert":
                    bucket = "saved" if op["bucket"] == "library" else op["bucket"]; entity = deepcopy(op["entity"])
                    previous = next((row for row in cloud[bucket] if row["type"] == entity["type"] and row.get("ref", row["id"]) == entity.get("ref", entity["id"])), None)
                    if previous: previous.update(entity)
                    else: cloud[bucket].append(entity)
                elif kind == "item_delete":
                    bucket = "saved" if op["bucket"] == "library" else op["bucket"]
                    cloud[bucket] = [row for row in cloud[bucket] if (row["type"], row.get("ref", row["id"])) != (op["entity_type"], op["entity_ref"])]
                elif kind == "history_add": cloud["history"] = [op["entity"]]
                elif kind == "context_set": cloud["context"] = op["context"]
                else: raise AssertionError("unexpected operation " + kind)
            cloud["revision"] += 1
            data = {"ok": True, "batch_id": args["p_batch_id"], "applied_revision": cloud["revision"], "snapshot": deepcopy(cloud)}
        return handler.fulfill(json=data, headers={"access-control-allow-origin": "*", "content-range": "0-0/0"})
    page.route("**/*", route)
    return state

def seed(ctx, theme="dark"):
    ctx.add_init_script("if(!localStorage.getItem('completion-seeded')){localStorage.setItem('completion-seeded','1');localStorage.setItem('sod_research_v2:guest'," + json.dumps(json.dumps({"state": snapshot("GUEST_ONLY"), "mode": "reader", "revision": None}, ensure_ascii=False)) + ");}localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")

def switch(page, uid, state):
    before = len(state["snapshot_reads"])
    value = auth_session(uid) if uid else None
    page.evaluate("""s=>{const key='sb-linswmnnkjxvweumprav-auth-token';if(s)localStorage.setItem(key,JSON.stringify(s));else localStorage.removeItem(key);const ch=new BroadcastChannel(key);ch.postMessage({event:s?'SIGNED_IN':'SIGNED_OUT',session:s});setTimeout(()=>ch.close(),100)}""", value)
    expect(page.locator('.sod29-header-workspace')).to_have_attribute("aria-label", "האזור האישי שלי" if uid else "התחברות לאזור האישי")
    if uid:
        deadline = time.monotonic()+10
        while len(state["snapshot_reads"]) <= before and time.monotonic()<deadline: page.wait_for_timeout(20)
        assert len(state["snapshot_reads"]) > before and state["snapshot_reads"][-1] == uid
    expect(page.locator('.sod29-frame-backdrop')).to_have_count(0)

def open_workspace(page):
    if page.locator(".sod29-frame-backdrop").count():
        page.locator('.sod29-frame-panel-head button[aria-label="סגור"]').click()
        expect(page.locator(".sod29-frame-backdrop")).to_have_count(0)
    page.locator(".sod29-header-workspace").click()
    panel = page.locator('.sod29-frame-panel[data-panel-kind="workspace"]'); panel.wait_for()
    return panel

def open_center(page):
    panel = open_workspace(page)
    panel.locator('[data-workspace-card="raziel"]').click()
    center = panel.locator('[data-raziel-center="true"]'); center.wait_for()
    expect(center.get_by_role("heading",name="השיחות שלי",exact=True)).to_be_visible()
    return center

def local_saved(page, principal="guest"):
    return page.evaluate("key=>JSON.parse(localStorage.getItem(key)).state.saved", "sod_research_v2:" + principal)

def check_no_overflow(page):
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
    assert page.locator(".sod29-frame-panel").evaluate("e=>e.scrollWidth<=e.clientWidth+1")

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        for width in ([] if os.environ.get("TASK_WORKSPACE_FLOW_ONLY") == "true" else [320, 390, 1440]):
            for theme in ["light", "parchment", "dark"]:
                ctx = browser.new_context(viewport={"width": width, "height": 950}, reduced_motion="reduce", is_mobile=width<400, has_touch=width<400)
                seed(ctx, theme); page = ctx.new_page(); state = wire(page); page.goto(BASE + "/2029")
                workspace = open_workspace(page)
                presence = workspace.locator('[data-workspace-raziel-presence="deterministic"]')
                expect(presence).to_be_visible()
                expect(presence).to_contain_text("רזיאל איתך באזור האישי")
                expect(presence).to_contain_text("הרמזים מחוברים למסע החיים")
                ask = presence.get_by_role("button", name="שאל את רזיאל", exact=True)
                box = ask.bounding_box(); assert box["width"] >= 44 and box["height"] >= 44
                assert presence.evaluate("e=>e.scrollWidth<=e.clientWidth+1")
                workspace.evaluate("e=>e.scrollTop=0")
                page.screenshot(path=str(OUT / f"presence-{width}-{theme}.png"), full_page=False)
                ask.click()
                page.locator('.sod29-frame-panel [data-raziel-native-chat="true"]').wait_for()
                assert not REPORT["model_calls"] and not REPORT["els_calls"] and not REPORT["family_research_calls"]
                center = open_center(page)
                row = center.locator('[data-raziel-center-session="raziel-session:GUEST_ONLY"]')
                expect(row).to_contain_text("מקומי בדפדפן הזה"); expect(row).to_contain_text("מתפרע")
                search = center.get_by_role("searchbox", name="חיפוש בכותרות השיחות")
                search.fill("אין כותרת כזאת"); expect(center.get_by_text("לא נמצאו שיחות בכותרת הזאת.", exact=True)).to_be_visible()
                assert not state["ops"] and not state["snapshot_reads"]
                search.fill("GUEST_ONLY"); expect(row).to_be_visible()
                row.locator(':scope > [data-conversation-reading] > summary').click()
                picture = row.locator('[data-raziel-picture]'); picture.locator("summary").click()
                expect(picture).to_contain_text("השאלה: שאלה פרטית GUEST_ONLY"); expect(picture).to_contain_text("תמונה קיימת GUEST_ONLY")
                dossier = row.locator('[data-conversation-dossier]'); dossier.locator(":scope > summary").click()
                expect(dossier).to_contain_text("זו הערה שמורה GUEST_ONLY"); assert "ללא קשר" not in dossier.inner_text()
                expect(center.locator('[data-raziel-credits]')).to_contain_text("היתרה אינה זמינה")
                expect(center.locator('[data-raziel-allowance]')).to_contain_text("המכסה עדיין אינה זמינה")
                check_no_overflow(page)
                row.get_by_role("button", name="המשך מאיפה שעצרתי", exact=True).click()
                expect(page.locator('.sod29-frame-panel [data-raziel-native-chat]')).to_contain_text("תמונה קיימת GUEST_ONLY")
                center = open_center(page); current = center.locator('[data-current-conversation]')
                expect(current).to_contain_text("כותרת פרטית GUEST_ONLY"); expect(current).to_contain_text("שאלה אחת · מתפרע")
                current.get_by_role("button", name="שמור שיחה", exact=True).click()
                expect(center.get_by_text("השיחה נשמרה. מצב הסנכרון מופיע למעלה.", exact=True)).to_be_visible()
                assert len([item for item in local_saved(page) if item["type"] == "raziel_session"]) == 1
                assert not state["ops"]
                check_no_overflow(page)
                page.screenshot(path=str(OUT / f"{width}-{theme}.png"), full_page=False)
                # The center panel itself must scroll both by touch/wheel and keyboard.
                panel = page.locator(".sod29-frame-panel"); panel.evaluate("e=>e.scrollTop=0")
                scrollable = panel.evaluate("e=>e.scrollHeight>e.clientHeight+1")
                if scrollable:
                    box = panel.bounding_box(); page.mouse.move(box["x"]+15, box["y"]+100); page.mouse.wheel(0, 600)
                    page.wait_for_function("document.querySelector('.sod29-frame-panel').scrollTop>0", timeout=3000)
                    panel.evaluate("e=>e.scrollTop=0"); panel.focus(); page.keyboard.press("PageDown")
                    page.wait_for_function("document.querySelector('.sod29-frame-panel').scrollTop>0", timeout=3000)
                    if width < 400:
                        panel.evaluate("e=>e.scrollTop=0")
                        cdp = ctx.new_cdp_session(page)
                        cdp.send("Input.synthesizeScrollGesture", {"x":round(box["x"]+box["width"]/2), "y":round(box["y"]+box["height"]*0.7), "yDistance":-350, "gestureSourceType":"touch"})
                        page.wait_for_function("document.querySelector('.sod29-frame-panel').scrollTop>0", timeout=3000)
                        cdp.detach()
                geometry = panel.bounding_box()
                assert abs(geometry["x"] - (width - geometry["x"] - geometry["width"])) <= 2
                search = center.get_by_role("searchbox", name="חיפוש בכותרות השיחות"); search.focus(); page.keyboard.press("Tab")
                assert page.evaluate("document.activeElement!==document.body")
                assert not REPORT["model_calls"]
                REPORT["cases"].append({"width": width, "theme": theme, "current": True, "title_search": True, "landscape_lineage": True, "dossier_explicit_links": True, "resave_no_duplicate": True, "scroll": True, "no_ai": True})
                ctx.close()

        # Real existing provider transitions, synthetic Auth and private cloud snapshots.
        ctx = browser.new_context(viewport={"width": 390, "height": 1000}, reduced_motion="reduce"); seed(ctx)
        page = ctx.new_page(); state = wire(page); page.goto(BASE + "/2029"); open_center(page)
        switch(page, A, state); center = open_center(page)
        expect(center).to_contain_text("כותרת פרטית ACCOUNT_A"); expect(center).not_to_contain_text("GUEST_ONLY")
        expect(center.locator('[data-raziel-center-sync]')).to_have_attribute("data-raziel-center-sync", "synced")
        expect(center.locator('[data-raziel-credits]')).to_contain_text("17 קרדיטים")
        row = center.locator('[data-raziel-center-session="raziel-session:ACCOUNT_A"]'); original = deepcopy(state["cloud"][A]["saved"][0])
        row.get_by_role("button", name="שינוי שם", exact=True).click(); row.get_by_role("textbox", name="שם השיחה").fill("שם חדש ACCOUNT_A")
        row.get_by_role("button", name="שמור שם", exact=True).click(); expect(row).to_contain_text("שם חדש ACCOUNT_A")
        expect(center.locator('[data-raziel-center-sync]')).to_have_attribute("data-raziel-center-sync", "synced")
        changed = next(item for item in state["cloud"][A]["saved"] if item["type"] == "raziel_session")
        assert all(changed[key] == original[key] for key in ["id", "ref", "type", "thread"])
        row.get_by_role("button", name="המשך מאיפה שעצרתי", exact=True).click()
        page.locator('.sod29-frame-panel [data-raziel-native-chat]').wait_for()
        center = open_center(page)
        center.locator('[data-current-conversation]').get_by_role("button", name="שמור שיחה", exact=True).click()
        expect(center.locator('[data-raziel-center-sync]')).to_have_attribute("data-raziel-center-sync", "synced")
        assert len([item for item in state["cloud"][A]["saved"] if item["type"] == "raziel_session"]) == 1
        switch(page, None, state); center = open_center(page)
        expect(center).to_contain_text("GUEST_ONLY"); expect(center).not_to_contain_text("ACCOUNT_A")
        switch(page, B, state); center = open_center(page)
        expect(center).to_contain_text("ACCOUNT_B"); expect(center).not_to_contain_text("ACCOUNT_A"); expect(center).not_to_contain_text("GUEST_ONLY")
        expect(center.locator('[data-raziel-credits]')).to_contain_text("0 קרדיטים")
        row = center.locator('[data-raziel-center-session="raziel-session:ACCOUNT_B"]'); row.get_by_role("button", name="מחיקה", exact=True).click()
        expect(row.get_by_role("group", name="אישור מחיקת השיחה כותרת פרטית ACCOUNT_B", exact=True)).to_be_visible(); row.get_by_role("button", name="כן, למחוק", exact=True).click()
        expect(center.get_by_text("אין עדיין שיחות שמורות", exact=True)).to_be_visible()
        assert len([item for item in local_saved(page, "user:"+B) if item["type"] == "raziel_session"]) == 0
        assert "ACCOUNT_A" not in json.dumps(state["cloud"][B]) and "GUEST_ONLY" not in json.dumps(state["cloud"][A])
        workspace = open_workspace(page)
        presence = workspace.locator('[data-workspace-raziel-presence="deterministic"]')
        expect(presence).to_contain_text("0 שיחות שמורות")
        expect(presence).not_to_contain_text("ACCOUNT_A")
        expect(presence).not_to_contain_text("GUEST_ONLY")
        assert not any("credit" in json.dumps(write) for write in state["ops"])
        REPORT["cases"].append({"guest_a_logout_b": True, "private_sync": True, "known_zero": True, "rename_identity": True, "confirmed_delete": True, "no_ai": True})
        ctx.close()

        # Stale A hydration cannot become B's private state; an unknown balance is not zero.
        ctx = browser.new_context(viewport={"width": 320, "height": 900}); seed(ctx); page = ctx.new_page(); state = wire(page)
        state["hold_a"] = True; state["profile_unknown"] = True; page.goto(BASE + "/2029"); switch(page, A, state)
        deadline = time.monotonic()+10
        while state["held"] is None and time.monotonic()<deadline: page.wait_for_timeout(20)
        assert state["held"] is not None
        center = open_center(page); expect(center.get_by_text("טוען את השיחות שלך…", exact=True).first).to_be_visible()
        switch(page, B, state); state["held"].fulfill(json=state["cloud"][A]); center = open_center(page)
        expect(center).to_contain_text("ACCOUNT_B"); expect(center).not_to_contain_text("ACCOUNT_A")
        expect(center.locator('[data-raziel-credits]')).to_contain_text("היתרה אינה זמינה"); check_no_overflow(page)
        REPORT["cases"].append({"stale_private_hydration_discarded": True, "unknown_not_zero": True}); ctx.close()

        # Existing saved source opens its exact locator; Exact Return keeps the caller URL.
        ctx = browser.new_context(viewport={"width": 390, "height": 1000}); seed(ctx); page = ctx.new_page(); state = wire(page)
        origin = "/2029?preview=home#workspace-source"; page.goto(BASE + origin); panel = open_workspace(page)
        for bucket in ["saved", "pinned", "cart", "collections"]:
            expect(panel.locator(f'[data-research-bucket="{bucket}"]')).to_be_attached()
        panel.locator('[data-research-bucket="saved"]').get_by_role("button", name="כותרת פרטית GUEST_ONLY שיחה שמורה", exact=True).click()
        expect(page.locator('.sod29-frame-panel [data-raziel-native-chat]')).to_contain_text("תמונה קיימת GUEST_ONLY")
        panel = open_workspace(page)
        collection = panel.locator('[data-research-bucket="collections"]')
        collection.get_by_text("אוסף בדיקה · 1 שמורים", exact=True).click()
        collection.get_by_role("button",name="כותרת פרטית GUEST_ONLY",exact=True).click()
        expect(page.locator('.sod29-frame-panel [data-raziel-native-chat]')).to_contain_text("תמונה קיימת GUEST_ONLY")
        panel = open_workspace(page)
        panel.locator('[data-research-bucket="saved"]').get_by_role("button").filter(has_text="מקור מדויק GUEST_ONLY").click()
        page.wait_for_url(BASE + SOURCE_HREF)
        page.reload()
        page.get_by_role("button", name="פתח ניווט", exact=True).click()
        page.locator('#sod29-mobile-navigation').get_by_role("button", name="חזרה מדויקת", exact=True).click()
        page.wait_for_url(BASE + origin)
        assert all(marker not in page.url for marker in ["GUEST_ONLY", "ACCOUNT_A", "ACCOUNT_B"])
        REPORT["cases"].append({"existing_buckets":True,"saved_and_collection_share_session":True,"source_exact_locator": True, "reload":True,"exact_return": True}); ctx.close()

        ctx = browser.new_context(viewport={"width": 320, "height": 900}); seed(ctx); page = ctx.new_page(); state = wire(page)
        state["snapshot_error"] = True; page.goto(BASE+"/2029"); switch(page,A,state); center = open_center(page)
        expect(center).to_contain_text("הסנכרון אינו זמין כרגע"); expect(center).not_to_contain_text("GUEST_ONLY")
        REPORT["cases"].append({"sync_error_truthful": True}); ctx.close()

        ctx = browser.new_context(viewport={"width":390,"height":950}); seed(ctx); page=ctx.new_page(); state=wire(page)
        state["cloud"][A]["saved"][0]["schema"]="invalid-saved-schema"
        page.goto(BASE+"/2029"); switch(page,A,state); center=open_center(page)
        center.locator('[data-raziel-center-session="raziel-session:ACCOUNT_A"]').get_by_role("button",name="המשך מאיפה שעצרתי",exact=True).click()
        expect(center.get_by_text("לא הצלחנו לפתוח את השיחה כרגע.",exact=True)).to_be_visible()
        assert not state["ops"]
        REPORT["cases"].append({"invalid_saved_conversation_fails_closed":True,"no_ai":True});ctx.close()
        browser.close()
finally:
    server.shutdown(); server.server_close()

assert not REPORT["errors"], REPORT["errors"]
assert not REPORT["model_calls"], REPORT["model_calls"]
assert not REPORT["els_calls"], REPORT["els_calls"]
assert not REPORT["family_research_calls"], REPORT["family_research_calls"]
assert not REPORT["unexpected_writes"], REPORT["unexpected_writes"]
assert not REPORT["private_telemetry"], REPORT["private_telemetry"]
(OUT/"results.json").write_text(json.dumps(REPORT, ensure_ascii=False, indent=2))
print(json.dumps(REPORT, ensure_ascii=False))
