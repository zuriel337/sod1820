"""Built 2029 UI against the actual mock-preview notice and synthetic public feed.

Every external request is intercepted; this exercises no hosted deployment or live
service worker.  Run after build:2029. Evidence is written outside the checkout.
"""
import functools
import json
import os
import re
import subprocess
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("UI_CARRY_EVIDENCE", "/tmp/ui-carry-restoration-2029"))
OUT.mkdir(parents=True, exist_ok=True)
source = (ROOT / "scripts/build-integrated-preview.mjs").read_text()
match = re.search(r"\bconst\s+notice\s*=\s*([\s\S]*?);\s*(?=html\s*=)", source)
if not match: raise RuntimeError("actual builder notice not found")
notice = subprocess.check_output(["node", "--input-type=module", "-e", "import vm from 'node:vm';process.stdout.write(vm.runInNewContext(process.argv[1]));", match.group(1)], cwd=ROOT, text=True)
assert 'data-raziel-preview-transport="mock-only"' in notice
HTML = (ROOT / "dist/2029.html").read_text().replace("</body>", notice + "</body>")
FLAGS = ["lock_world", "lock_heichal", "lock_raziel_site", "lock_life_journey", "lock_books", "lock_number"]
READ_RPCS = {"world_group_source_arrivals_v2", "rd_is_admin", "fn_method_profile", "fn_method_value", "writer_public_contributions_page_v1", "community_reply_counts", "notification_prefs_guest_get_v1", "notification_prefs_get_v1"}
BLOCKED_TELEMETRY = {"link_identity", "ingest_event", "track_visit"}
ROWS = [
    {"id":"11111111-1111-4111-8111-111111111111", "author_user_id":"11111111-1111-4111-8111-111111111111", "author_name":"אלף בדיקה", "body":"הודעת זית", "origin":"community_2029", "created_at":"2026-10-28T12:00:00Z", "reactions":{"likes":4}, "total_count":2},
    {"id":"22222222-2222-4222-8222-222222222222", "author_user_id":"22222222-2222-4222-8222-222222222222", "author_name":"בית בדיקה", "body":"הודעת דקל", "origin":"openweb", "created_at":"2026-10-27T12:00:00Z", "reactions":{"likes":5,"👍":["fixture-one","fixture-two"]}, "total_count":2},
]
OLDER = {"id":"33333333-3333-4333-8333-333333333333", "author_name":"כותב ותיק", "body":"הודעה ותיקה אהובה", "origin":"openweb", "created_at":"2016-01-01T12:00:00Z", "reactions":{"likes":50}}
report = {"themes": [], "community": [], "failures": [], "page_errors": [], "model_calls": [], "blocked_writes": [], "blocked_telemetry": [], "external_chat": [], "feed_sorts": []}


class Files(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Files, directory=str(ROOT / "dist")))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"


def wire(page, delayed_feed=False, paginated=False):
    first_feed = True
    state = {"updated":False, "reads":[]}
    page.on("pageerror", lambda error: report["page_errors"].append(str(error)))
    def route(handler):
        nonlocal first_feed
        req = handler.request; url = urlparse(req.url)
        if url.hostname == "127.0.0.1":
            if req.is_navigation_request() and req.resource_type == "document": return handler.fulfill(content_type="text/html", body=HTML)
            if url.path.startswith("/api/"):
                if req.method != "GET": report["blocked_writes"].append(url.path)
                return handler.fulfill(status=503, content_type="application/json", body='{"state":"unavailable"}')
            return handler.continue_()
        if any(key in (url.hostname or "").lower() for key in ("spot.im", "spotim", "openweb")) or "/sso" in url.path.lower():
            report["external_chat"].append(req.url); return handler.abort()
        if url.path.endswith(("/ai-analyze", "/research-run", "/raziel-submit")) or any(x in (url.hostname or "") for x in ("openai", "anthropic", "generativelanguage")):
            report["model_calls"].append(req.url); return handler.abort()
        name = url.path.rsplit("/", 1)[-1]
        if req.method == "POST" and url.path.startswith("/rest/v1/rpc/") and name == "community_feed_page":
            if delayed_feed and first_feed: time.sleep(0.8)
            first_feed = False
            args = req.post_data_json or {}
            sort = args.get("p_sort", "newest")
            assert sort in ("newest", "oldest"), "loaded-only ranking must not pretend the server supports likes"
            report["feed_sorts"].append(sort)
            state["reads"].append({"sort":sort,"offset":args.get("p_offset",0)})
            data = [dict(row) for row in ROWS] + ([dict(OLDER)] if paginated else [])
            if state["updated"]: data[0]["reactions"] = {"likes":90}
            for row in data: row["total_count"] = len(data)
            if sort == "oldest": data.reverse()
            offset = args.get("p_offset",0)
            data = data[offset:offset + (2 if paginated else args.get("p_limit",40))]
            return handler.fulfill(content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps(data))
        if req.method == "POST" and url.path.startswith("/rest/v1/rpc/") and name in READ_RPCS:
            return handler.fulfill(content_type="application/json", headers={"access-control-allow-origin": "*"}, body="[]")
        if req.method == "POST" and url.path.startswith("/rest/v1/rpc/") and name in BLOCKED_TELEMETRY:
            report["blocked_telemetry"].append(url.path); return handler.abort()
        if req.method not in ("GET", "HEAD", "OPTIONS"):
            report["blocked_writes"].append(url.path); return handler.abort()
        rows = [{"key":key, "enabled":False, "mode":"all"} for key in FLAGS] if url.path.endswith("/site_flags") else []
        return handler.fulfill(content_type="application/json", headers={"access-control-allow-origin":"*", "content-range":"0-0/0"}, body=json.dumps(rows))
    page.route("**/*", route)
    return state


def no_overflow(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")


def size44(button):
    expect(button).to_be_visible()
    box = button.bounding_box()
    assert box and box["width"] >= 44 and box["height"] >= 44, box


def no_cover(button):
    assert button.evaluate('''e => {const r=e.getBoundingClientRect();const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===e || e.contains(h)}'''), "button covered"


def header_geometry(page):
    issues = page.evaluate('''() => {
      const selectors=['.sod29-mobile-menu-trigger','.sod29-header-search','.sod29-theme-trigger','.sod29-header-workspace'];
      const nodes=selectors.map(s=>document.querySelector('.sod29-header '+s));
      const rects=nodes.map(e=>e?.getBoundingClientRect());
      const issues=[];
      for(let i=0;i<rects.length;i++) for(let j=i+1;j<rects.length;j++) {
        const a=rects[i], b=rects[j];
        if(!a?.width||!b?.width) continue;
        if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)
          issues.push({issue:'overlap',a:selectors[i],b:selectors[j],aRect:a.toJSON(),bRect:b.toJSON()});
      }
      const parent=nodes[0]?.getBoundingClientRect(), child=nodes[0]?.querySelector('.sod29-discovery-gate')?.getBoundingClientRect();
      if(!parent || !child || child.left<parent.left-1 || child.top<parent.top-1 || child.right>parent.right+1 || child.bottom>parent.bottom+1)
        issues.push({issue:'menu-child-outside-button',parent:parent?.toJSON(),child:child?.toJSON()});
      return issues;
    }''')
    assert not issues, issues


def theme_case(page, width, initial):
    page.goto(BASE + "/2029")
    expect(page.locator(".sod29-root")).to_be_visible()
    expect(page.locator("html")).to_have_attribute("data-theme-preset", initial)
    trigger = page.locator(".sod29-header .sod29-theme-trigger")
    mobile = width <= 980
    if mobile:
        expect(trigger).to_be_visible(); size44(trigger); no_cover(trigger)
        header_geometry(page)
        trigger.click()
        expect(trigger).to_have_attribute("aria-expanded", "true")
        options = page.locator(".sod29-header .sod29-theme-options")
        expect(options).to_be_visible()
        for label in ("יום", "קלף", "לילה"):
            button = options.get_by_role("button", name=label, exact=True)
            size44(button); no_cover(button)
        page.screenshot(path=str(OUT / f"themes-open-{width}-{initial}.png"))
        for index in range(3):
            page.keyboard.press("Tab")
            expect(options.locator("button").nth(index)).to_be_focused()
            expect(trigger).to_have_attribute("aria-expanded", "true")
        page.keyboard.press("Tab")
        expect(trigger).to_have_attribute("aria-expanded", "false")
        assert not trigger.evaluate("e => e.closest('.sod29-theme-presets').contains(document.activeElement)")
        trigger.focus(); page.keyboard.press("Enter")
        expect(trigger).to_have_attribute("aria-expanded", "true")
        page.keyboard.press("Escape")
        expect(trigger).to_have_attribute("aria-expanded", "false")
        expect(trigger).to_be_focused()
        trigger.click()
        page.mouse.click(width / 2, 500)
        expect(trigger).to_have_attribute("aria-expanded", "false")
        page.keyboard.press("Escape")
        expect(trigger).to_have_attribute("aria-expanded", "false")
        trigger.click()
        target, label = ("dark", "לילה") if initial != "dark" else ("light", "יום")
        options.get_by_role("button", name=label, exact=True).click()
        expect(trigger).to_have_attribute("aria-expanded", "false")
        expect(trigger).to_be_focused()
        expect(page.locator("html")).to_have_attribute("data-theme-preset", target)
        page.reload()
        expect(page.locator("html")).to_have_attribute("data-theme-preset", target)
        page.locator(".sod29-mobile-menu-trigger").click()
        drawer = page.locator("#sod29-mobile-navigation")
        expect(drawer).to_be_visible()
        buttons = drawer.locator(".sod29-theme-options")
        for text in ("יום", "קלף", "לילה"): size44(buttons.get_by_role("button", name=text, exact=True))
        buttons.get_by_role("button", name="קלף", exact=True).click()
        expect(page.locator("html")).to_have_attribute("data-theme-preset", "parchment")
    else:
        expect(trigger).to_be_hidden()
        options = page.locator(".sod29-header .sod29-theme-options")
        expect(options).to_be_visible()
        for label in ("יום", "קלף", "לילה"): size44(options.get_by_role("button", name=label, exact=True))
    no_overflow(page)
    report["themes"].append({"width":width, "initial":initial, "mobile":mobile, "status":"passed"})


def verify_filter_tiles(page, feed, width, theme):
    group = feed.get_by_role("group", name="סינון שיחות")
    expect(group).to_be_visible()
    expect(group).to_have_attribute("tabindex", "0")
    buttons = group.locator("button")
    expect(buttons).to_have_count(1)
    expect(group.get_by_role("button", name="הכול", exact=True)).to_have_attribute("aria-pressed", "true")
    dimensions = buttons.evaluate_all("""nodes => nodes.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,font:parseFloat(getComputedStyle(e).fontSize),disabled:e.disabled,text:e.innerText.trim(),clipped:e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1}})""")
    assert all(abs(d["width"]-44)<1 and abs(d["height"]-44)<1 and d["width"]>=44 and d["height"]>=44 and d["font"]>=14 and not d["clipped"] for d in dimensions), dimensions
    assert max(d["top"] for d in dimensions)-min(d["top"] for d in dimensions)<1, dimensions
    assert not any(d["disabled"] for d in dimensions), dimensions
    assert [d["text"] for d in dimensions] == ["הכול"], dimensions
    for accessible in ("ללא מענה", "עם קבצים", "ההודעות שלי", "מהקהילה החדשה", "מהצ׳אט הוותיק"):
        expect(group.get_by_role("button", name=accessible, exact=True)).to_have_count(0)
    if group.evaluate("e=>e.scrollWidth>e.clientWidth+1"):
        group.scroll_into_view_if_needed()
        group.focus(); expect(group).to_be_focused()
        before = group.evaluate("e=>e.scrollLeft")
        for _ in range(10): page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(200)
        scrolled = group.evaluate("e=>e.scrollLeft")
        assert scrolled < before, {"before":before,"after_left":scrolled}
        assert buttons.last.evaluate("e=>{const a=e.getBoundingClientRect(), b=e.parentElement.getBoundingClientRect();return a.left>=b.left-1 && a.right<=b.right+1}")
        page.screenshot(path=str(OUT / f"community-tiles-{width}-{theme}.png"))
        for _ in range(10): page.keyboard.press("ArrowRight")
        page.wait_for_timeout(200)
        assert group.evaluate("e=>e.scrollLeft") > scrolled
        assert buttons.first.evaluate("e=>{const a=e.getBoundingClientRect(), b=e.parentElement.getBoundingClientRect();return a.left>=b.left-1 && a.right<=b.right+1}")
        expect(group).to_be_focused()
    else:
        assert buttons.evaluate_all("nodes=>nodes.every(e=>{const a=e.getBoundingClientRect(), b=e.parentElement.getBoundingClientRect();return a.left>=b.left-1 && a.right<=b.right+1})"), "all tiles should fit within the group"
        group.scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / f"community-tiles-{width}-{theme}.png"))
    no_overflow(page)


def community_case(page, width, suffix="", theme="dark"):
    page.goto(BASE + "/community/chat" + suffix)
    feed = page.locator('[data-community-mode="connected-preview"]')
    legacy = page.locator('[data-community-chat="legacy"]')
    expect(feed).to_be_visible(); expect(legacy).to_be_visible()
    if suffix:
        # This is a cold direct-entry hash; assert before interacting with or
        # manually scrolling the page, after the delayed feed has settled.
        expect(legacy).to_be_in_viewport()
        assert legacy.evaluate("e => { const r=e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }")
    assert feed.evaluate("e=>e.getBoundingClientRect().top + scrollY") < legacy.evaluate("e=>e.getBoundingClientRect().top + scrollY")
    expect(feed.locator(".sod29-community-aside")).to_have_count(0)
    expect(feed.get_by_role("heading", name="הקהילה", exact=True)).to_have_count(1)
    expect(feed.get_by_text("מקום לשתף, לשאול ולגלות יחד.", exact=True)).to_be_visible()
    main = feed.locator(".sod29-community-main")
    geometry = feed.evaluate("e=>{const r=e.getBoundingClientRect(), m=e.querySelector('.sod29-community-main').getBoundingClientRect();return {page:r.width,content:m.width,columns:getComputedStyle(e.querySelector('.sod29-community-layout')).gridTemplateColumns.split(' ').length}}")
    assert geometry["columns"] == 1 and abs(geometry["page"] - geometry["content"]) <= 1, geometry
    footer = feed.get_by_label("השתתפות בקהילה", exact=True)
    expect(footer).to_contain_text("משתפים בכבוד, מצרפים מקורות כשאפשר ושומרים על הפרטיות.")
    assert footer.evaluate("e=>Boolean(e.compareDocumentPosition(document.querySelector('.sod29-community-feed')) & Node.DOCUMENT_POSITION_PRECEDING)")
    assert footer.evaluate("e=>Boolean(e.compareDocumentPosition(document.getElementById('legacy-chat')) & Node.DOCUMENT_POSITION_FOLLOWING)")
    expect(footer.get_by_role("link", name="לשיחות הוותיקות", exact=False)).to_have_attribute("href", "#legacy-chat")
    expect(legacy).to_have_attribute("data-openweb-loaded", "false")
    expect(legacy.locator("[data-spotim-module]")).to_have_count(0)
    assert legacy.get_by_role("link", name="פתיחת הצ׳אט המקורי").get_attribute("href") == "https://sod1820.co.il/community/chat"
    expect(feed.get_by_text("הודעת זית", exact=True)).to_be_visible()
    expect(feed.get_by_text("הודעת דקל", exact=True)).to_be_visible()
    sign_in = main.get_by_label("התחברות לקהילה", exact=True)
    join = sign_in.get_by_role("button", name="הצטרפו לשיחה", exact=True)
    expect(join).to_have_attribute("aria-expanded", "false")
    size44(join)
    expect(sign_in.locator("form")).to_have_count(0)
    assert sign_in.bounding_box()["height"] <= (132 if width < 600 else 80)
    join.focus(); page.keyboard.press("Enter")
    email = sign_in.get_by_label("כתובת מייל", exact=True)
    expect(email).to_be_focused()
    email.fill("layout-fixture@example.invalid")
    page.keyboard.press("Escape")
    join = sign_in.get_by_role("button", name="הצטרפו לשיחה", exact=True)
    expect(join).to_be_focused()
    expect(sign_in.locator("form")).to_have_count(0)
    join.click()
    expect(sign_in.get_by_label("כתובת מייל", exact=True)).to_have_value("layout-fixture@example.invalid")
    sign_in.get_by_role("button", name="סגירת טופס ההתחברות", exact=True).click()
    expect(sign_in.get_by_role("button", name="הצטרפו לשיחה", exact=True)).to_be_focused()
    page.screenshot(path=str(OUT / f"community-public-{width}-{theme}.png"), full_page=True)
    controls = feed.locator('[aria-label="סידור וסינון השיחות"]')
    verify_filter_tiles(page, feed, width, theme)
    expect(controls.get_by_role("button", name="חיפוש בכל הארכיון")).to_have_count(0)
    for label in ("ללא מענה", "עם קבצים", "ההודעות שלי", "מהקהילה החדשה", "מהצ׳אט הוותיק"):
        expect(controls.get_by_role("button", name=label, exact=True)).to_have_count(0)
    expect(controls).to_contain_text("החיפוש מציג התאמות מתוך ההודעות שכבר נטענו.")
    select = controls.locator("select")
    for value in ("active", "discussed"):
        expect(select.locator(f'option[value="{value}"]')).to_have_count(0)
    assert select.locator("option").evaluate_all("nodes=>nodes.map(e=>e.value)") == ["newest", "oldest", "liked"]
    reads_before = len(report["feed_sorts"])
    select.select_option("liked")
    expect(controls).to_contain_text("מתוך ההודעות שכבר נטענו בלבד")
    expect(feed.locator(".sod29-community-feed > .sod29-community-thread-group").first).to_contain_text("הודעת דקל")
    assert len(report["feed_sorts"]) == reads_before, "view-only change must retain the loaded pages"
    page.reload()
    feed = page.locator('[data-community-mode="connected-preview"]')
    controls = feed.locator('[aria-label="סידור וסינון השיחות"]')
    select = controls.locator("select")
    expect(select).to_have_value("liked")
    expect(feed.locator(".sod29-community-feed > .sod29-community-thread-group").first).to_contain_text("הודעת דקל")
    assert report["feed_sorts"][-1] == "newest"
    select.select_option("oldest")
    page.wait_for_function("""() => {const s=document.querySelector('.sod29-community-feed')?.innerText || '';return s.includes('הודעת דקל') && s.includes('הודעת זית') && s.indexOf('הודעת דקל') < s.indexOf('הודעת זית')}""")
    assert report["feed_sorts"] and report["feed_sorts"][-1] == "oldest"
    feed_text = feed.locator(".sod29-community-feed").first.inner_text()
    assert feed_text.index("הודעת דקל") < feed_text.index("הודעת זית")
    reads_before = len(report["feed_sorts"])
    select.select_option("liked")
    expect(controls).to_contain_text("מתוך ההודעות שכבר נטענו בלבד")
    assert "sourceSort=oldest" in page.url
    assert len(report["feed_sorts"]) == reads_before, "oldest loaded window must also survive switching to likes"
    page.reload()
    expect(page.locator(".sod29-community-stream-sort select")).to_have_value("liked")
    assert report["feed_sorts"][-1] == "oldest", "reload must retain the chosen source window"
    search = feed.get_by_placeholder("חיפוש בשיחות שבדף")
    search.fill("זית")
    expect(feed.get_by_text("הודעת זית", exact=True)).to_be_visible()
    expect(feed.get_by_text("הודעת דקל", exact=True)).to_have_count(0)
    all_rows = controls.get_by_role("button", name="הכול", exact=True)
    expect(all_rows).to_have_attribute("aria-pressed", "false")
    all_rows.click()
    expect(search).to_have_value("")
    expect(all_rows).to_have_attribute("aria-pressed", "true")
    expect(feed.get_by_text("הודעת דקל", exact=True)).to_be_visible()
    page.evaluate("location.hash='#legacy-chat'")
    legacy.scroll_into_view_if_needed()
    page.wait_for_timeout(400)
    expect(legacy).to_have_attribute("data-openweb-loaded", "false")
    expect(legacy.locator("[data-spotim-module]")).to_have_count(0)
    assert not report["external_chat"], report["external_chat"]
    no_overflow(page)
    page.screenshot(path=str(OUT / f"community-{width}-{theme}{'-hash' if suffix else ''}.png"))
    report["community"].append({"width":width, "theme":theme, "initial_hash":bool(suffix), "status":"passed", "single_column":True, "geometry":geometry, "footer_before_old_chat":True, "compact_sign_in_keyboard":True, "only_available_controls":True, "liked_loaded_scope_reload":True})


def liked_pagination_case(page):
    state = wire(page, paginated=True)
    page.goto(BASE + "/community/chat?sort=liked")
    feed = page.locator(".sod29-community-feed")
    roots = feed.locator(":scope > .sod29-community-thread-group")
    expect(roots).to_have_count(2)
    expect(roots.first).to_contain_text("הודעת דקל")
    assert all(read["offset"] == 0 for read in state["reads"]), "never scan unrequested history"
    page.get_by_role("button",name="עוד הודעות",exact=False).click()
    expect(roots).to_have_count(3)
    expect(roots.first).to_contain_text("הודעה ותיקה אהובה")
    assert any(read["offset"] == 2 for read in state["reads"])
    # Existing visible/focus refresh updates public reactions and preserves the
    # paginated tail using the unchanged chronological reader/refresh adapter.
    state["updated"] = True
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    expect(roots.first).to_contain_text("הודעת זית")
    expect(roots).to_have_count(3)
    expect(roots.nth(1)).to_contain_text("הודעה ותיקה אהובה")
    select = page.get_by_role("combobox",name="סדר לפי",exact=True)
    select.select_option("newest")
    expect(roots).to_have_count(3)
    expect(roots.first).to_contain_text("הודעת זית")
    expect(roots.last).to_contain_text("הודעה ותיקה אהובה")
    select.select_option("liked")
    expect(roots.nth(1)).to_contain_text("הודעה ותיקה אהובה")
    page.screenshot(path=str(OUT / "community-liked-390.png"), full_page=True)
    author = roots.first.get_by_role("link",name="פתיחת כרטיס הכותב",exact=False)
    author.click()
    assert "sort=liked" in page.url
    page.get_by_role("button",name="סגירת כרטיס הכותב",exact=True).click()
    expect(select).to_have_value("liked")
    expect(roots).to_have_count(3)
    assert not report["model_calls"] and not report["blocked_writes"]
    report["community"].append({"case":"liked-pagination-refresh","rows":3,"newer_likes_after_refresh":90,"older_page_can_rank_first":True,"no_server_liked_sort":True,"public_author_return":True,"status":"passed"})


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        for width in (() if os.environ.get("UI_CARRY_COMMUNITY_ONLY") else (320, 390, 980, 981, 1100, 1440)):
            for initial in ("light", "parchment", "dark"):
                context = browser.new_context(viewport={"width":width, "height":1000}, reduced_motion="reduce")
                context.add_init_script("if(!sessionStorage.getItem('seed')){localStorage.setItem('sod-theme'," + json.dumps(initial) + ");sessionStorage.setItem('seed','1')}")
                page = context.new_page(); page.set_default_timeout(8000); wire(page)
                try: theme_case(page, width, initial)
                except Exception as error:
                    report["failures"].append({"case":"theme", "width":width, "theme":initial, "error":str(error)})
                    page.screenshot(path=str(OUT / f"failure-theme-{width}-{initial}.png"), full_page=True)
                context.close()
        for width in (320, 360, 390, 1440):
            for theme, suffix in [(theme, "") for theme in ("light", "parchment", "dark")] + [("dark", "#legacy-chat")]:
                context = browser.new_context(viewport={"width":width, "height":1000}, reduced_motion="reduce")
                context.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
                page = context.new_page(); page.set_default_timeout(8000); wire(page, delayed_feed=bool(suffix))
                try: community_case(page, width, suffix, theme)
                except Exception as error:
                    report["failures"].append({"case":"community", "width":width, "theme":theme, "hash":bool(suffix), "error":str(error)})
                    page.screenshot(path=str(OUT / f"failure-community-{width}-{theme}{'-hash' if suffix else ''}.png"), full_page=True)
                context.close()
        context = browser.new_context(viewport={"width":390,"height":1000}, reduced_motion="reduce")
        page = context.new_page(); page.set_default_timeout(8000)
        try: liked_pagination_case(page)
        except Exception as error:
            report["failures"].append({"case":"liked-pagination-refresh","error":str(error)})
            page.screenshot(path=str(OUT / "failure-liked-pagination.png"),full_page=True)
        context.close()
        browser.close()
finally:
    server.shutdown(); server.server_close()
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))

print(json.dumps(report, ensure_ascii=False, indent=2))
if any(report[k] for k in ("failures", "page_errors", "model_calls", "blocked_writes", "external_chat")): raise SystemExit(1)
