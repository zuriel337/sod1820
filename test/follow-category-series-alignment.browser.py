"""Actual App2029 + real public/private adapters, synthetic HTTP only; nothing forwarded.

FOLLOW_ALIGNMENT_PORT selects a local Vite server. Covers native series/category
navigation, paging, stale responses and truthful unfollow on an older server.
"""
import base64
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs, quote
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("FOLLOW_ALIGNMENT_OUT", "/tmp/follow-category-series-browser"))
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:" + os.environ.get("FOLLOW_ALIGNMENT_PORT", "5328")
UID = "22222222-2222-4222-8222-222222222222"
PREAMBLE = """<script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script>"""
APP = (ROOT / "2029.html").read_text().replace("<head>", "<head>" + PREAMBLE)
report = {"cases": [], "failures": [], "errors": [], "unexpected": [], "live_writes": 0}


def session():
    def part(value): return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")
    token = part({"alg": "HS256"}) + "." + part({"sub": UID, "role": "authenticated", "exp": int(time.time()) + 3600}) + ".synthetic"
    return {"access_token": token, "refresh_token": "synthetic", "expires_at": int(time.time()) + 3600,
            "expires_in": 3600, "token_type": "bearer", "user": {"id": UID, "email": "fixture@example.invalid", "user_metadata": {}}}


def post(key, *, author=None, categories=None, tags=None):
    return {"id": key, "slug": key, "title": "פרסום " + key, "excerpt": "תוכן סינתטי לבדיקה בלבד", "author": author,
            "categories": categories or [], "tags": tags or [], "date": "2026-10-25T12:00:00Z", "modified": "2026-10-25T12:00:00Z"}


def install(page):
    state = {"calls": [], "posts": [], "topics": ["cat:רמזי הגאולה", "cat:מימד חמש", "series:dimension-five", "series:mah-kore-habora", "series:sod-hashmal"],
             "apply": True, "hold": False, "held": None}
    page.on("pageerror", lambda error: report["errors"].append(str(error)))

    def route(r):
        req = r.request; url = urlparse(req.url); name = url.path.split("/")[-1]
        if url.hostname == "127.0.0.1":
            if req.is_navigation_request(): return r.fulfill(content_type="text/html", body=APP)
            if url.path.startswith("/api/"): return r.fulfill(status=503, json={"state": "unavailable"})
            return r.continue_()
        if url.hostname != "linswmnnkjxvweumprav.supabase.co": return r.abort()
        if req.method == "OPTIONS": return r.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*"})
        body = req.post_data_json if req.method in ("POST", "PATCH") else None
        state["calls"].append({"name": name, "method": req.method, "body": body})
        if url.path == "/auth/v1/user": return r.fulfill(json=session()["user"])
        if name == "users" and req.method == "GET": return r.fulfill(json={"id": UID, "display_name": "בדיקה", "role": "member"})
        if name == "notification_prefs" and req.method == "GET": return r.fulfill(json={"topics": state["topics"], "channels": ["email"]})
        if name == "user_notifications" and req.method == "GET":
            return r.fulfill(json=[{"id": "n1", "kind": "post_new", "title": "עדכון סדרה", "created_at": "2026-10-25T12:00:00Z", "read_at": None,
                                   "link": "/old-post-slug", "source_topic": "series:dimension-five"}])
        if name == "posts" and req.method == "GET":
            query = parse_qs(url.query); combined = " ".join(query.get("or", []))
            if query.get("select") != ["id,slug,title,excerpt,author,categories,tags,image_url,thumb_url,date,modified"]:
                return r.fulfill(json=[])  # Other existing frame readers, outside this public catalog.
            token = req.headers.get("authorization", "").split(" ")[-1].split(".")
            role = json.loads(base64.urlsafe_b64decode(token[1] + "=="))["role"]
            assert role == "anon", "public catalog must never use the signed-in account"
            assert "טיוטה,פורום" in combined and "tags.is.null" in combined
            assert query.get("order") == ["modified.desc.nullslast,id.asc"]
            if "מימד חמש" in combined:
                assert query.get("author") == ["eq.בדרך לנצח"]
                rows = [post("dimension-text", author="בדרך לנצח", categories=["מימד חמש"])]; total = 31
            elif "מה קורה הבורא" in combined:
                assert query.get("author") == ["eq.אלון לוי"]
                rows = [post("alon-series", author="אלון לוי", tags=["מה קורה הבורא"])]; total = 7
            elif "סוד החשמל" in combined:
                assert 'categories.cs.{"סוד החשמל"}' in combined and 'tags.cs.{"סוד החשמל"}' in combined
                rows = [post("hashmal-tag-only", tags=["סוד החשמל"])]; total = 133
            elif "categories" in query:
                assert "רמזי הגאולה" in query["categories"][0] and "רמזים חזקים" in query["categories"][0]
                rows = [post("old-category", categories=["רמזי הגאולה"]), post("new-category", categories=["רמזים חזקים"])]; total = 2
            else:
                rows = []; total = 0
            state["posts"].append({"query": query, "role": role})
            answer = {"json": rows, "headers": {"content-range": "0-" + str(max(0, len(rows)-1)) + "/" + str(total), "access-control-expose-headers": "content-range"}}
            if state["hold"]:
                state["hold"] = False; state["held"] = (r, answer); return
            return r.fulfill(**answer)
        if name == "watch_toggle":
            assert body["p_source"] == "center" and body["p_on"] is False and body["p_visitor"] is None
            if state["apply"]:
                if body["p_topic"] == "cat:רמזים חזקים": state["topics"] = [t for t in state["topics"] if t not in ("cat:רמזי הגאולה", "cat:רמזים חזקים")]
                else: state["topics"] = [t for t in state["topics"] if t != body["p_topic"]]
            return r.fulfill(json={"following": False, "topic": body["p_topic"]})
        if req.method == "GET": return r.fulfill(json=[])
        if name in ("research_state_snapshot_v1", "fn_research_path_resume_v1", "world_group_source_arrivals_v2"):
            return r.fulfill(json=[])
        if name in ("link_identity", "log_activity", "user_activity", "track_visit", "ingest_event", "claim_research_lead"):
            return r.abort()
        report["unexpected"].append(req.method + " " + url.path); return r.abort()

    page.route("**/*", route)
    return state


def open_page(browser, theme="light", width=390):
    context = browser.new_context(viewport={"width": width, "height": 1050})
    context.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ");localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token'," + json.dumps(json.dumps(session())) + ");")
    page = context.new_page(); state = install(page)
    page.set_default_timeout(7000)
    return context, page, state


def catalog(page, query, label, item):
    page.goto(BASE + "/2029/posts?" + query)
    expect(page.locator(".sod29-posts-index h1")).to_have_text(label)
    expect(page.locator(".sod29-post-index-card h2")).to_contain_text(["פרסום " + item])
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"), headless=True, args=["--no-sandbox"])
    for theme in ("light", "parchment", "dark"):
        for width in (320, 390, 1440):
            context, page, state = open_page(browser, theme, width)
            try:
                page.goto(BASE + "/2029/me/notifications")
                expect(page.locator(".fc-follow-row")).to_have_count(5)
                group = page.locator(".fc-group").filter(has=page.get_by_role("heading", name="סדרות", exact=True))
                expect(group.locator(".fc-follow-row")).to_have_count(3)
                expect(page.locator(".fc-why")).to_contain_text("מימד חמש · סדרה")
                assert "/post/old-post-slug" in page.locator(".fc-open").get_attribute("href")
                link = group.get_by_role("link", name="מימד חמש", exact=True)
                link.focus(); page.keyboard.press("Enter")
                page.wait_for_url("**/2029/posts?series=dimension-five**")
                expect(page.locator(".sod29-posts-index h1")).to_have_text("מימד חמש")
                expect(page.locator(".sod29-post-index-card h2")).to_have_text("פרסום dimension-text")
                page.get_by_role("button", name="פוסטים קודמים", exact=True).click()
                page.wait_for_url("**series=dimension-five**page=2")
                expect(page.locator("#posts-catalog")).to_have_attribute("data-posts-page", "2")
                assert state["posts"][-1]["query"].get("offset") == ["24"]
                report["cases"].append(f"center series link/native paging {theme}/{width}")
                for key, label, item in (("mah-kore-habora", "מה קורה הבורא", "alon-series"), ("sod-hashmal", "סוד החשמל", "hashmal-tag-only")):
                    catalog(page, "series=" + key, label, item)
                    if width == 390: page.screenshot(path=str(OUT / (key + "-" + theme + ".png")), full_page=True)
                    report["cases"].append(f"exact public series {key} {theme}/{width}")
                catalog(page, "category=" + quote("רמזי הגאולה"), "רמזים חזקים", "old-category")
                expect(page.locator(".sod29-post-index-card")).to_have_count(2)
                page.locator(".k29-cat").first.click()
                page.wait_for_url("**/2029/posts?category=" + quote("רמזים חזקים"))
                expect(page.locator(".sod29-posts-index h1")).to_have_text("רמזים חזקים")
                report["cases"].append(f"category alias/native target {theme}/{width}")
            except Exception as error:
                report["failures"].append({"case": theme + "/" + str(width), "error": str(error)[:1300]})
                print(json.dumps(report["failures"][-1], ensure_ascii=False), flush=True)
            finally: context.close()

    context, page, state = open_page(browser)
    try:
        for query in ("series=unknown", "series=dimension-five&category=x", "category=%00"):
            before = len(state["posts"]); page.goto(BASE + "/2029/posts?" + query)
            expect(page.locator(".sod29-posts-index")).to_contain_text("בחירת התוכן אינה זמינה")
            assert len(state["posts"]) == before
            expect(page.locator(".sod29-post-index-card")).to_have_count(0)
            report["cases"].append("invalid filter fails closed: " + query)
        state["hold"] = True
        page.goto(BASE + "/2029/posts?series=dimension-five", wait_until="domcontentloaded")
        page.wait_for_function("document.querySelector('.sod29-posts-index h1')?.textContent==='מימד חמש'")
        for _ in range(100):
            if state["held"]: break
            page.wait_for_timeout(50)
        assert state["held"]
        page.evaluate("history.pushState({},'', '/2029/posts?series=sod-hashmal');dispatchEvent(new PopStateEvent('popstate'))")
        expect(page.locator(".sod29-post-index-card h2")).to_have_text("פרסום hashmal-tag-only")
        held, answer = state["held"]; held.fulfill(**answer)
        page.wait_for_timeout(150)
        expect(page.locator(".sod29-post-index-card h2")).to_have_text("פרסום hashmal-tag-only")
        report["cases"].append("late series response never replaces a newer selection")
        page.goto(BASE + "/2029/me/notifications")
        expect(page.locator(".fc-follow-row")).to_have_count(5)
        state["apply"] = False
        page.get_by_role("button", name="ביטול מעקב: רמזים חזקים", exact=True).click()
        expect(page.locator(".fc-row-error")).to_be_visible()
        expect(page.locator(".fc-follow-row")).to_have_count(5)
        report["cases"].append("older server cannot fake successful renamed-category unfollow")
        state["apply"] = True
        group = page.locator(".fc-group").filter(has=page.get_by_role("heading", name="סדרות", exact=True))
        group.get_by_role("button", name="ביטול מעקב: מימד חמש", exact=True).click()
        expect(group.locator(".fc-follow-row")).to_have_count(2)
        category = page.locator(".fc-group").filter(has=page.get_by_role("heading", name="קטגוריות", exact=True))
        expect(category.get_by_role("link", name="מימד חמש", exact=True)).to_be_visible()
        report["cases"].append("series unfollow preserves separate category and channel consent")
    except Exception as error: report["failures"].append({"case": "boundaries/race/unfollow", "error": str(error)[:1800]})
    finally: context.close()
    browser.close()

(OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report, ensure_ascii=False))
assert not report["failures"] and not report["errors"] and not report["unexpected"], report
