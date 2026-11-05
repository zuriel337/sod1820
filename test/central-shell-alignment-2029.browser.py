"""Actual shell and World, synthetic browser data; no external writes or model calls.

Run with: python3 test/central-shell-alignment-2029.browser.py
The temporary Vite server and evidence live outside the checkout.
"""
import json
import os
import socket
import subprocess
import tempfile
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("CENTRAL_SHELL_EVIDENCE", "/tmp/central-shell-alignment-2029"))
OUT.mkdir(parents=True, exist_ok=True)
HTML = '''<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/central-shell-alignment-2029.jsx"></script></body></html>'''
FLAGS = ["lock_world", "lock_heichal", "lock_raziel_site", "lock_life_journey", "lock_books", "lock_number"]
READ_RPCS = {"world_group_source_arrivals_v2", "rd_is_admin", "fn_method_profile", "fn_method_value",
             "writer_public_contributions_page_v1", "community_feed_page", "community_reply_counts",
             "notification_prefs_guest_get_v1", "notification_prefs_get_v1"}
report = {"cases": [], "failures": [], "page_errors": [], "model_calls": [], "external_writes": []}


def intercept(page, number_locked=False):
    def on_error(error): report["page_errors"].append(str(error))
    page.on("pageerror", on_error)
    def handle(route):
        req = route.request
        url = urlparse(req.url)
        if url.hostname == "127.0.0.1":
            if req.is_navigation_request() and req.resource_type == "document":
                return route.fulfill(content_type="text/html", body=HTML)
            if url.path.startswith("/api/"):
                return route.fulfill(status=503, content_type="application/json", body='{"state":"unavailable"}')
            return route.continue_()
        if (url.path.endswith(("/ai-analyze", "/research-run", "/raziel-submit")) or
                any(host in (url.hostname or "") for host in ("openai", "anthropic", "generativelanguage"))):
            report["model_calls"].append(req.url)
            return route.abort()
        if req.method == "POST" and url.path.startswith("/rest/v1/rpc/") and url.path.rsplit("/", 1)[-1] in READ_RPCS:
            return route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body="[]")
        if req.method not in ("GET", "HEAD", "OPTIONS"):
            report["external_writes"].append(url.path)
            return route.abort()
        if url.path.endswith("/site_flags"):
            body = [{"key": key, "enabled": number_locked and key == "lock_number", "message": "", "mode": "all"} for key in FLAGS]
        else:
            body = []
        return route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*", "content-range": "0-0/0"}, body=json.dumps(body))
    page.route("**/*", handle)


def no_overflow(page):
    widths = page.evaluate("({document:document.documentElement.scrollWidth, viewport:innerWidth})")
    assert widths["document"] <= widths["viewport"] + 1, widths


def inspect_changed_controls(page):
    # Scope is explicitly the text-bearing shell controls changed by this task,
    # not every old icon or piece of copy elsewhere in the site.
    issues = page.evaluate('''() => {
      const selectors = [".sod29-companion-tabs button", ".sod29-companion-pin",
        ".sod29-companion-source-link", ".sod29-sidebar .sod29-nav-link",
        ".sod29-mobile-drawer .sod29-nav-link"];
      const failures = [];
      for (const element of document.querySelectorAll(selectors.join(','))) {
        const r = element.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(element).visibility !== 'visible') continue;
        const text = (element.innerText || '').trim();
        if (r.width < 44 || r.height < 44) failures.push({text, size: [r.width, r.height], issue: 'hit-target'});
        const labels = element.matches('.sod29-nav-link')
          ? element.querySelectorAll('.sod29-nav-copy')
          : element.matches('.sod29-companion-source-link')
          ? element.querySelectorAll('span:not(.sod29-companion-source-icon):not([aria-hidden])')
          : [element];
        for (const node of labels) {
          if (!node.innerText?.trim() || !node.getBoundingClientRect().width) continue;
          const size = parseFloat(getComputedStyle(node).fontSize);
          if (size < 14) failures.push({text: node.innerText, size, issue: 'font'});
        }
      }
      return failures;
    }''')
    assert not issues, issues


def open_companion(page):
    companion = page.locator(".sod29-companion")
    expect(companion).to_be_visible()
    if companion.get_attribute("data-companion-mode") == "slim":
        companion.get_by_role("button", name="עדכונים", exact=False).first.click()
    expect(companion.locator(".sod29-companion-full")).to_be_visible()
    return companion


def scenario(page, width, theme):
    page.goto(BASE + "/fixture")
    expect(page.locator(".sod29-root")).to_be_visible()
    expect(page.locator("html")).to_have_attribute("data-theme-preset", theme)
    expect(page.locator(".sod29-command-island")).to_have_count(1)
    no_overflow(page)
    geometry = None
    if width >= 981:
        sidebar = page.locator(".sod29-sidebar")
        companion = page.locator(".sod29-companion")
        expect(sidebar).to_be_visible()
        expect(companion).to_be_visible()
        s, c = sidebar.bounding_box(), companion.bounding_box()
        assert s["x"] > c["x"], {"rail": s, "companion": c}
        geometry = {"right_navigation": s, "left_companion": c}
        page.locator(".sod29-logo-toggle").click()
        page.locator(".sod29-sidebar").get_by_role("button", name="דף המספר", exact=True).click()
    else:
        page.locator(".sod29-mobile-menu-trigger").click()
        inspect_changed_controls(page)
        page.locator("#sod29-mobile-navigation").get_by_role("button", name="דף המספר", exact=True).click()
    expect(page.locator(".sod29-frame-command input")).to_be_visible()
    assert urlparse(page.url).path == "/fixture", page.url
    page.locator(".sod29-frame-panel-head button[aria-label='סגור']").click()
    page.locator(".sod29-command-island .sod29-raziel-orb").click()
    expect(page.locator("[data-raziel-native-chat='true']:visible")).to_have_count(1)
    assert not report["model_calls"], report["model_calls"]
    no_overflow(page)
    if width >= 981:
        # Fresh view: automatic context first, then a deliberate selection of
        # Updates must survive a change of research subject.
        page.reload()
        page.get_by_role("button", name="נושא ראשון").click()
        companion = open_companion(page)
        expect(companion.get_by_role("button", name="הקשר", exact=True)).to_have_attribute("aria-pressed", "true")
        companion.get_by_role("button", name="עדכונים", exact=True).click()
        page.get_by_role("button", name="נושא שני").click()
        companion = open_companion(page)
        expect(companion.get_by_role("button", name="עדכונים", exact=True)).to_have_attribute("aria-pressed", "true")
        inspect_changed_controls(page)
        no_overflow(page)
    page.screenshot(path=str(OUT / f"shell-{width}-{theme}.png"), full_page=True)
    report["cases"].append({"width": width, "theme": theme, "status": "passed", "geometry": geometry})


with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
BASE = f"http://127.0.0.1:{port}"

with tempfile.TemporaryDirectory(prefix="central-shell-vite-") as cache:
    config = {"cacheDir": cache, "server": {"host": "127.0.0.1", "port": port, "strictPort": True, "hmr": False}}
    with (OUT / "vite.log").open("w") as log:
        server = subprocess.Popen(["node", "--input-type=module", "-e", "import {createServer} from 'vite';const s=await createServer(" + json.dumps(config) + ");await s.listen();"], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
        try:
            for _ in range(150):
                if server.poll() is not None: raise RuntimeError("Vite exited; see vite.log")
                try:
                    with urlopen(BASE, timeout=0.3): break
                except OSError: time.sleep(0.1)
            else: raise RuntimeError("Vite did not start")
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
                for width in (() if os.environ.get("SHELL_EXTRA_ONLY") else (320, 390, 980, 1100, 1440)):
                    for theme in ("light", "parchment", "dark"):
                        context = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce")
                        context.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ");localStorage.setItem('sod-companion','pinned')")
                        page = context.new_page()
                        page.set_default_timeout(8000)
                        intercept(page)
                        try: scenario(page, width, theme)
                        except Exception as error:
                            report["failures"].append({"width": width, "theme": theme, "error": str(error)})
                            page.screenshot(path=str(OUT / f"failure-{width}-{theme}.png"), full_page=True)
                        context.close()
                # Test the shortcut against the actual World component, including
                # its query and hash and an existing rendered source section.
                for source, label, button in (("zvi", "צבי", "לקריאת מקורות צבי"), ("hashmal", "סוד החשמל", "לקריאת סוד החשמל")):
                    context = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
                    context.add_init_script("localStorage.setItem('sod-companion','pinned')")
                    page = context.new_page(); page.set_default_timeout(8000); intercept(page)
                    try:
                        page.goto(BASE + "/fixture")
                        companion = open_companion(page)
                        companion.get_by_role("button", name=button).click()
                        target = page.locator("#world-public-content-map")
                        expect(target).to_be_visible()
                        expect(target.get_by_role("button", name=label, exact=True)).to_have_attribute("aria-pressed", "true")
                        parsed = urlparse(page.url)
                        assert parsed.path == "/world" and parse_qs(parsed.query).get("subjectSource") == [source] and parsed.fragment == "world-public-content-map", page.url
                        expect(target).to_be_in_viewport()
                        page.screenshot(path=str(OUT / f"world-source-{source}.png"))
                        report.setdefault("source_shortcuts", []).append({"source": source, "query_hash_filter_viewport": "passed"})
                    except Exception as error:
                        report["failures"].append({"case": "real-world-source-shortcut", "source": source, "error": str(error)})
                        page.screenshot(path=str(OUT / f"failure-world-source-{source}.png"), full_page=True)
                    context.close()
                # Number maintenance lock must still block the new search action.
                for width in (390, 1440):
                    context = browser.new_context(viewport={"width": width, "height": 1000})
                    page = context.new_page(); page.set_default_timeout(8000); intercept(page, number_locked=True)
                    try:
                        page.goto(BASE + "/fixture")
                        if width >= 981:
                            page.locator(".sod29-logo-toggle").click()
                            nav = page.locator(".sod29-sidebar")
                        else:
                            page.locator(".sod29-mobile-menu-trigger").click()
                            nav = page.locator("#sod29-mobile-navigation")
                        blocked = nav.get_by_role("button", name="דף המספר · נעול", exact=True)
                        expect(blocked).to_be_disabled()
                        blocked.evaluate("button => button.click()")
                        expect(page.locator(".sod29-frame-command input")).to_have_count(0)
                        assert urlparse(page.url).path == "/fixture"
                        report.setdefault("number_lock", []).append({"width": width, "status": "passed"})
                    except Exception as error:
                        report["failures"].append({"case": "number-locked", "width": width, "error": str(error)})
                        page.screenshot(path=str(OUT / f"failure-number-lock-{width}.png"), full_page=True)
                    context.close()
                browser.close()
        finally:
            server.terminate()
            try: server.wait(timeout=5)
            except subprocess.TimeoutExpired: server.kill(); server.wait()
            (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))

print(json.dumps(report, ensure_ascii=False, indent=2))
if report["failures"] or report["page_errors"] or report["model_calls"] or report["external_writes"]:
    raise SystemExit(1)
