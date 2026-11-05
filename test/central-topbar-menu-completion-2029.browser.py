"""Built 2029 app: actual shell/menu and actual builder disclosure.

External traffic is intercepted; no external mutation or AI request can succeed.
No hosted preview or product backend is involved. Run after build:2029.
"""
import functools
import json
import os
import re
import subprocess
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
OUT = Path(os.environ.get("TOPBAR_EVIDENCE", "/tmp/central-topbar-menu-2029"))
OUT.mkdir(parents=True, exist_ok=True)
builder = (ROOT / "scripts/build-integrated-preview.mjs").read_text()
match = re.search(r"\bconst\s+notice\s*=\s*([\s\S]*?);\s*(?=html\s*=)", builder)
if not match:
    raise RuntimeError("Could not extract the actual preview notice from the builder")
# Evaluate only the builder's constant expression, not the builder or deployment.
notice = subprocess.check_output(["node", "--input-type=module", "-e",
    "import vm from 'node:vm';process.stdout.write(vm.runInNewContext(process.argv[1]));", match.group(1)], cwd=ROOT, text=True)
assert 'data-raziel-preview-transport="mock-only"' in notice
HTML = (DIST / "2029.html").read_text().replace("</body>", notice + "</body>")
FLAGS = ["lock_world", "lock_heichal", "lock_raziel_site", "lock_life_journey", "lock_books", "lock_number"]
READ_RPCS = {"world_group_source_arrivals_v2", "rd_is_admin", "fn_method_profile", "fn_method_value",
             "writer_public_contributions_page_v1", "community_feed_page", "community_reply_counts",
             "notification_prefs_guest_get_v1", "notification_prefs_get_v1"}
BLOCKED_TELEMETRY = {"link_identity", "ingest_event", "track_visit"}
report = {"cases": [], "flows": [], "failures": [], "page_errors": [], "model_calls": [], "blocked_writes": [], "blocked_telemetry": []}


class Files(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Files, directory=str(DIST)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"


def wire(page, journey_locked=False):
    page.on("pageerror", lambda error: report["page_errors"].append(str(error)))
    def route(handler):
        req = handler.request; url = urlparse(req.url)
        if url.hostname == "127.0.0.1":
            if req.is_navigation_request() and req.resource_type == "document":
                return handler.fulfill(content_type="text/html", body=HTML)
            if url.path.startswith("/api/"):
                if req.method != "GET": report["blocked_writes"].append(url.path)
                return handler.fulfill(status=503, content_type="application/json", body='{"state":"unavailable"}')
            return handler.continue_()
        if url.path.endswith(("/ai-analyze", "/research-run", "/raziel-submit")) or any(x in (url.hostname or "") for x in ("openai", "anthropic", "generativelanguage")):
            report["model_calls"].append(req.url); return handler.abort()
        if req.method == "POST" and url.path.startswith("/rest/v1/rpc/") and url.path.rsplit("/", 1)[-1] in READ_RPCS:
            return handler.fulfill(content_type="application/json", headers={"access-control-allow-origin": "*"}, body="[]")
        if req.method == "POST" and url.path.startswith("/rest/v1/rpc/") and url.path.rsplit("/", 1)[-1] in BLOCKED_TELEMETRY:
            report["blocked_telemetry"].append(url.path); return handler.abort()
        if req.method not in ("GET", "HEAD", "OPTIONS"):
            report["blocked_writes"].append(url.path); return handler.abort()
        rows = [{"key": key, "enabled": journey_locked and key == "lock_life_journey", "message": "", "mode": "all"} for key in FLAGS] if url.path.endswith("/site_flags") else []
        return handler.fulfill(content_type="application/json", headers={"access-control-allow-origin": "*", "content-range": "0-0/0"}, body=json.dumps(rows))
    page.route("**/*", route)


def no_overflow(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")


def measure_themes(group):
    for label in ("יום", "קלף", "לילה"):
        button = group.get_by_role("button", name=label, exact=True)
        expect(button).to_be_visible()
        box = button.bounding_box()
        assert box and box["width"] >= 44 and box["height"] >= 44, (label, box)
        size = button.locator("b").evaluate("e => parseFloat(getComputedStyle(e).fontSize)")
        assert size >= 14, (label, size)


def open_nav(page):
    expect(page.locator(".sod29-root")).to_be_visible()
    mobile = page.locator(".sod29-mobile-menu-trigger").is_visible()
    if mobile:
        trigger = page.locator(".sod29-mobile-menu-trigger")
        trigger.click()
        nav = page.locator("#sod29-mobile-navigation")
        expect(nav).to_be_visible()
    else:
        nav = page.locator(".sod29-sidebar")
        if nav.get_attribute("data-rail-state") == "slim": page.locator(".sod29-logo-toggle").click()
    return nav, mobile


def assert_uncovered(button):
    button.scroll_into_view_if_needed()
    assert button.evaluate('''e => {const r=e.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return hit===e || e.contains(hit)}'''), "Control is covered"


def visible_mock_disclosure(page):
    visible = page.locator('[data-raziel-preview-transport="mock-only"]:visible, [data-raziel-preview-disclosure="mock-only"]:visible')
    expect(visible.first).to_be_visible()
    assert "דמה" in visible.first.inner_text()


def scenario(page, width, theme):
    page.goto(BASE + "/2029")
    expect(page.locator(".sod29-root")).to_be_visible()
    expect(page.locator("html")).to_have_attribute("data-theme-preset", theme)
    no_overflow(page)
    visible_mock_disclosure(page)
    page.screenshot(path=str(OUT / f"header-{width}-{theme}.png"))
    page.locator(".sod29-command-island .sod29-raziel-orb").click()
    expect(page.locator("[data-raziel-native-chat='true']:visible")).to_have_count(1)
    visible_mock_disclosure(page)
    page.screenshot(path=str(OUT / f"raziel-{width}-{theme}.png"))
    # Close the same dialog or desktop chat before exercising the menu.
    close = page.locator(".sod29-frame-panel-head button[aria-label='סגור']")
    if close.is_visible(): close.click()
    else:
        page.locator("[data-raziel-companion-view='open']").get_by_role("button", name="שקט", exact=True).click()
    top_theme = page.locator(".sod29-header .sod29-theme-presets")
    if top_theme.is_visible(): measure_themes(top_theme)
    nav, mobile = open_nav(page)
    visible_mock_disclosure(page)
    page.screenshot(path=str(OUT / f"menu-{width}-{theme}.png"))
    assert nav.get_by_text("אזור משתמשים", exact=True).count() == 0
    expect(nav.get_by_role("link", name="מסע החיים", exact=True)).to_be_visible()
    expect(nav.get_by_role("link", name="קהילה", exact=True)).to_be_visible()
    assert_uncovered(nav.get_by_role("link", name="מסע החיים", exact=True))
    if mobile:
        themes = nav.locator(".sod29-theme-presets")
        measure_themes(themes)
        for label in ("יום", "קלף", "לילה"): assert_uncovered(themes.get_by_role("button", name=label, exact=True))
        page.screenshot(path=str(OUT / f"drawer-{width}-{theme}.png"))
        page.keyboard.press("Escape")
        expect(page.locator("#sod29-mobile-navigation")).to_have_count(0)
        expect(page.locator(".sod29-mobile-menu-trigger")).to_be_focused()
        page.locator(".sod29-mobile-menu-trigger").click()
        themes = page.locator("#sod29-mobile-navigation .sod29-theme-presets")
    else: themes = top_theme
    # Change preset once, then reload and prove the user's selection persists.
    target, label = ("dark", "לילה") if theme != "dark" else ("light", "יום")
    themes.get_by_role("button", name=label, exact=True).click()
    expect(page.locator("html")).to_have_attribute("data-theme-preset", target)
    page.reload()
    expect(page.locator("html")).to_have_attribute("data-theme-preset", target)
    no_overflow(page)
    report["cases"].append({"width": width, "initial_theme": theme, "changed_theme": target, "mobile_menu": mobile, "status": "passed"})


def workspace_flow(page, width):
    page.goto(BASE + "/2029")
    page.locator(".sod29-header-workspace").click()
    panel = page.locator('.sod29-frame-panel[data-panel-kind="workspace"]')
    expect(panel).to_be_visible()
    first = panel.get_attribute("aria-label")
    page.locator(".sod29-frame-panel-head button[aria-label='סגור']").click()
    nav, mobile = open_nav(page)
    if mobile: nav.locator(".sod29-mobile-drawer-utilities .sod29-sidebar-workspace").filter(has_text="האזור האישי שלי").click()
    else: nav.locator(".sod29-sidebar-workspace").filter(has_text="האזור האישי שלי").click()
    expect(panel).to_be_visible()
    assert panel.get_attribute("aria-label") == first
    assert urlparse(page.url).path == "/2029"
    report["flows"].append({"flow": "same-guest-workspace", "width": width, "status": "passed"})


def journey_flow(page, width, locked=False):
    page.goto(BASE + "/2029")
    nav, _ = open_nav(page)
    if locked:
        row = nav.get_by_role("button", name="מסע החיים · נעול", exact=True)
        expect(row).to_be_disabled()
        row.evaluate("e => e.click()")
        assert urlparse(page.url).path == "/2029"
    else:
        nav.get_by_role("link", name="מסע החיים", exact=True).click()
        page.wait_for_url("**/2029/journey")
        expect(page.locator('[data-experience-surface="life-journey-2029"]')).to_be_visible()
    report["flows"].append({"flow": "journey-locked" if locked else "journey", "width": width, "status": "passed"})


def community_flow(page, width):
    page.goto(BASE + "/2029")
    nav, _ = open_nav(page)
    nav.get_by_role("link", name="קהילה", exact=True).click()
    page.wait_for_url("**/community/chat")
    expect(page.locator('[data-community-mode="connected-preview"]')).to_be_visible()
    # This guest flow never sends a post or performs a product mutation.
    report["flows"].append({"flow": "guest-community-reading-no-submission", "width": width, "status": "passed"})


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        for width in (() if os.environ.get("TOPBAR_FLOWS_ONLY") else (320, 390, 980, 981, 1100, 1440)):
            for theme in ("light", "parchment", "dark"):
                context = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce")
                context.add_init_script("if(!sessionStorage.getItem('theme-seeded')){localStorage.setItem('sod-theme'," + json.dumps(theme) + ");sessionStorage.setItem('theme-seeded','1')}")
                page = context.new_page(); page.set_default_timeout(8000); wire(page)
                try: scenario(page, width, theme)
                except Exception as error:
                    report["failures"].append({"width": width, "theme": theme, "error": str(error)})
                    page.screenshot(path=str(OUT / f"failure-{width}-{theme}.png"), full_page=True)
                context.close()
        for width in (390, 1440):
            for flow in ("workspace", "journey", "journey-locked", "community"):
                context = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce")
                page = context.new_page(); page.set_default_timeout(8000); wire(page, journey_locked=flow == "journey-locked")
                try:
                    if flow == "workspace": workspace_flow(page, width)
                    elif flow.startswith("journey"): journey_flow(page, width, locked=flow == "journey-locked")
                    else: community_flow(page, width)
                except Exception as error:
                    report["failures"].append({"width": width, "flow": flow, "error": str(error)})
                    page.screenshot(path=str(OUT / f"failure-{flow}-{width}.png"), full_page=True)
                context.close()
        browser.close()
finally:
    server.shutdown(); server.server_close()
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))

print(json.dumps(report, ensure_ascii=False, indent=2))
if report["failures"] or report["page_errors"] or report["model_calls"] or report["blocked_writes"]: raise SystemExit(1)
