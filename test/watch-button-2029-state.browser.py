"""Actual WatchButton2029: saved guest, uncertain mutation, explicit retry and scope races.

Run against Vite with WATCH_STATE_PORT. Every external request is blocked.
All mutable state is in the test-only instance adapter; no mail/DB/Push action.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("WATCH_STATE_OUT", "/tmp/watch-button-2029-state"))
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:" + os.environ.get("WATCH_STATE_PORT", "5310")
HTML = '''<!doctype html><html lang="he" dir="rtl"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div>
<script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script>
<script type="module" src="/test/fixtures/watch-button-2029-state.jsx"></script></body></html>'''
report = {"cases": [], "failures": [], "page_errors": [], "external_requests": []}


def install(page):
    page.on("pageerror", lambda error: report["page_errors"].append(str(error)))
    def route(r):
        u = urlparse(r.request.url)
        if u.hostname == "127.0.0.1":
            if u.path == "/watch-state-fixture" and r.request.is_navigation_request():
                return r.fulfill(content_type="text/html", body=HTML)
            return r.continue_()
        report["external_requests"].append(r.request.method + " " + u.path)
        return r.abort()
    page.route("**/*", route)


def open_case(browser, saved=False):
    context = browser.new_context(viewport={"width": 390, "height": 900})
    page = context.new_page(); install(page)
    page.goto(BASE + "/watch-state-fixture" + ("?saved=1" if saved else ""))
    control = page.locator(".sod29-watch")
    expect(control.locator("button").first).to_be_enabled()
    return context, page, control


def no_completion(control):
    expect(control.get_by_role("status").filter(has_text="המעקב אושר")).to_have_count(0)
    expect(control.get_by_role("button", name="אימות חשבון", exact=True)).to_have_count(0)


def follow(control):
    control.get_by_role("button", name="מעקב בדיקה", exact=True).click()
    control.get_by_role("status").filter(has_text="המעקב אושר").wait_for()


def returning_guest(browser):
    context, page, control = open_case(browser, saved=True)
    try:
        expect(control.get_by_role("button", name="אימות חשבון", exact=True)).to_be_visible()
        expect(control.get_by_role("status").filter(has_text="המעקב אושר")).to_have_count(0)
        assert page.evaluate("window.__watchStateFixture.calls.filter(c=>c.kind==='toggle').length") == 0
        control.get_by_role("button", name="אימות חשבון", exact=True).click()
        page.get_by_role("status").filter(has_text="אימות מדומה בלבד").wait_for()
        assert page.locator("input[type=email]").count() == 0
    finally: context.close()


def failed_unfollow(browser):
    context, page, control = open_case(browser)
    try:
        follow(control)
        page.evaluate("Object.assign(window.__watchStateFixture,{failRead:true,failToggle:true})")
        control.get_by_role("button", name="עוקב", exact=True).click()
        control.get_by_role("alert").filter(has_text="לא קיבלנו אישור").wait_for()
        expect(control.locator("button").first).to_be_disabled()
        no_completion(control)
        page.evaluate("Object.assign(window.__watchStateFixture,{failRead:false,holdRead:true})")
        control.get_by_role("button", name="ניסיון נוסף", exact=True).click()
        page.wait_for_function("window.__watchStateFixture.pendingReads.length===1")
        no_completion(control)
        expect(control.locator("button").first).to_be_disabled()
        page.evaluate("window.__watchStateFixture.pendingReads.shift()({topics:['author:בדיקה'],channels:[]})")
        expect(control.get_by_role("button", name="אימות חשבון", exact=True)).to_be_visible()
        expect(control.get_by_role("alert")).to_have_count(0)
        expect(control.get_by_role("status").filter(has_text="המעקב אושר")).to_have_count(0)
        assert page.evaluate("window.__watchStateFixture.calls.filter(c=>c.kind==='toggle').length") == 2
    finally: context.close()


def resolved_unconfirmed(browser, applied):
    context, page, control = open_case(browser)
    try:
        follow(control)
        page.evaluate("Object.assign(window.__watchStateFixture,{failToggle:true,applyUnconfirmed:" + json.dumps(applied) + "})")
        control.get_by_role("button", name="עוקב", exact=True).click()
        control.get_by_role("alert").wait_for()
        expect(control.locator("button").first).to_be_enabled()
        no_completion(control)
        control.get_by_role("button", name="ניסיון נוסף", exact=True).click()
        expect(control.get_by_role("alert")).to_have_count(0)
        expect(control.get_by_role("status").filter(has_text="המעקב אושר")).to_have_count(0)
        expect(control.get_by_role("button", name="אימות חשבון", exact=True)).to_have_count(0 if applied else 1)
        expect(control.locator("button").first).to_have_attribute("aria-pressed", "false" if applied else "true")
        assert page.evaluate("window.__watchStateFixture.calls.filter(c=>c.kind==='toggle').length") == 2
    finally: context.close()


def pending_and_scope(browser, scope):
    context, page, control = open_case(browser)
    try:
        page.evaluate("window.__watchStateFixture.holdToggle=true")
        control.get_by_role("button", name="מעקב בדיקה", exact=True).click()
        page.wait_for_function("window.__watchStateFixture.pendingToggles.length===1")
        no_completion(control)
        expect(control.locator("button").first).to_be_disabled()
        page.evaluate("window.__watchStateFixture.holdRead=true")
        page.evaluate("window.__watchStateFixture." + ("changeAdapter()" if scope == "adapter" else "changeTopic('author:אחר')"))
        page.wait_for_function("window.__watchStateFixture.pendingReads.length===1")
        page.evaluate("window.__watchStateFixture.pendingToggles.shift()({ok:true})")
        no_completion(control)
        expect(control.locator("button").first).to_be_disabled()
        page.evaluate("window.__watchStateFixture.pendingReads.shift()({topics:[],channels:[]})")
        expect(control.locator("button").first).to_be_enabled()
        expect(control.locator("button").first).to_have_attribute("aria-pressed", "false")
        no_completion(control)
    finally: context.close()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"), headless=True, args=["--no-sandbox"])
    cases = [("saved guest resumes without toggle", returning_guest),
             ("unconfirmed unfollow and failed/held recovery", failed_unfollow),
             ("unconfirmed unfollow, saved follow retained", lambda b: resolved_unconfirmed(b, False)),
             ("unconfirmed unfollow, server applied removal", lambda b: resolved_unconfirmed(b, True)),
             ("late mutation after topic switch", lambda b: pending_and_scope(b, "topic")),
             ("late mutation after adapter switch", lambda b: pending_and_scope(b, "adapter"))]
    for name, run in cases:
        try: run(browser); report["cases"].append(name)
        except Exception as error: report["failures"].append({"case": name, "error": str(error)[:1400]})
    browser.close()
(OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report, ensure_ascii=False))
assert not report["failures"], report["failures"]
assert not report["page_errors"] and not report["external_requests"], report
