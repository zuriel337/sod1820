"""Shared EmailVerify opt-in boundary, native keyboard focus and unchanged identity/OTP semantics.

Run with EMAIL_BOUNDARY_PORT against Vite. All remote transport is blocked or answered synthetically.
This checks the shared technical seam; standalone 2029 typography/colors remain a separate visual pass.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

OUT = Path(os.environ.get("EMAIL_BOUNDARY_OUT", "/tmp/email-verify-2029-boundary"))
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:" + os.environ.get("EMAIL_BOUNDARY_PORT", "5313")
HTML = '''<!doctype html><html lang="he" dir="rtl"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div>
<script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script>
<script type="module" src="/test/fixtures/email-verify-2029-boundary.jsx"></script></body></html>'''
report = {"cases": [], "failures": [], "errors": [], "unexpected_requests": []}


def visible_keyboard_focus(page, field):
    field.focus()
    page.keyboard.press("Tab"); page.keyboard.press("Shift+Tab")
    result = field.evaluate("e=>{const s=getComputedStyle(e);const probe=document.createElement('i');probe.style.color='var(--s29-focus-ring)';probe.style.display='none';e.parentElement.append(probe);const expected=getComputedStyle(probe).color;probe.remove();return {active:e===document.activeElement,visible:e.matches(':focus-visible'),style:s.outlineStyle,width:parseFloat(s.outlineWidth),inline:e.style.outline,color:s.outlineColor,expected};}")
    assert result["active"] and result["visible"], result
    assert result["style"] == "solid" and result["width"] >= 2, result
    assert result["color"] == result["expected"], "focus uses the existing canonical role: " + str(result)
    assert result["inline"] != "none", result


def run(browser, mode, theme, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900})
    ctx.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
    page = ctx.new_page()
    page.on("pageerror", lambda error: report["errors"].append(str(error)))
    calls = {"otp": [], "verify": []}
    def route(r):
        req = r.request; u = urlparse(req.url)
        if u.hostname == "127.0.0.1":
            if u.path == "/email-boundary" and req.is_navigation_request():
                return r.fulfill(content_type="text/html", body=HTML)
            return r.continue_()
        cors = {"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST,OPTIONS"}
        if u.hostname == "linswmnnkjxvweumprav.supabase.co" and u.path in ("/auth/v1/otp", "/auth/v1/verify"):
            if req.method == "OPTIONS": return r.fulfill(status=204, headers=cors)
            if req.method == "POST":
                key = "otp" if u.path.endswith("/otp") else "verify"
                calls[key].append(req.post_data_json)
                return r.fulfill(status=200 if key == "otp" else 400, headers=cors,
                    json={} if key == "otp" else {"msg": "Synthetic invalid code", "error_code": "otp_expired"})
        report["unexpected_requests"].append(req.method + " " + u.path)
        return r.abort()
    page.route("**/*", route)
    try:
        page.goto(BASE + "/email-boundary?mode=" + mode)
        if mode == "watch": page.get_by_role("button", name="אימות חשבון", exact=True).click()
        form = page.locator("form").first
        email = form.locator("input[type=email]")
        email.wait_for()
        if mode == "legacy":
            assert form.get_attribute("data-variant") is None
            assert email.evaluate("e=>e.style.outline") == "none", "default inline presentation stays unchanged"
            assert email.evaluate("e=>e.style.fontSize") == "15px"
        else:
            visible_keyboard_focus(page, email)
            assert form.get_attribute("data-variant") == "2029"
            assert "sod29-email-verify" in form.get_attribute("class")
            assert form.get_attribute("data-step") == "email" and form.get_attribute("data-state") == "ready"
            assert email.get_attribute("data-field") == "email"
            assert form.locator("button[type=submit]").get_attribute("data-action") == "send"
        email.fill("nobody@example.invalid")
        form.locator("button[type=submit]").click()
        code = form.locator("input[inputmode=numeric]"); code.wait_for()
        assert len(calls["otp"]) == 1 and calls["otp"][0]["email"] == "nobody@example.invalid"
        if mode != "legacy":
            visible_keyboard_focus(page, code)
            assert form.get_attribute("data-step") == "code"
            assert code.get_attribute("data-field") == "otp"
            assert form.locator("button[type=submit]").get_attribute("data-action") == "verify"
            assert form.locator('[data-action="resend"]').is_disabled(), "cooldown remains active"
        form.locator("button[type=submit]").click()
        page.get_by_text("הזינו את הקוד המלא שקיבלתם במייל (6–10 ספרות)", exact=True).wait_for()
        assert not calls["verify"], "invalid length is rejected before OTP verification"
        if mode != "legacy": assert form.get_attribute("data-state") == "error"
        code.fill("123456"); form.locator("button[type=submit]").click()
        page.get_by_text("הקוד שגוי או שפג תוקפו — אפשר לשלוח קוד חדש", exact=True).wait_for()
        assert len(calls["verify"]) == 1 and calls["verify"][0]["token"] == "123456"
        assert page.evaluate("window.__emailVerifyBoundary.verified") == 0
        if mode != "legacy":
            assert form.get_attribute("data-state") == "error"
            visible_keyboard_focus(page, code)
            form.locator('[data-action="change-email"]').click()
            expect(form.locator("input[type=email]")).to_have_value("nobody@example.invalid")
            assert form.get_attribute("data-step") == "email" and form.get_attribute("data-state") == "ready"
        report["cases"].append([mode, theme, width])
    finally: ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"), headless=True, args=["--no-sandbox"])
    matrix = [(mode, theme, width) for mode in ("watch", "native") for theme in ("light", "parchment", "dark") for width in (320, 390, 1440)]
    matrix += [("legacy", "light", 390), ("optout", "light", 390)]
    for mode, theme, width in matrix:
        try: run(browser, mode, theme, width)
        except Exception as error: report["failures"].append({"case": [mode, theme, width], "error": str(error)[:1100]})
    browser.close()
(OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report, ensure_ascii=False))
assert not report["failures"] and not report["errors"] and not report["unexpected_requests"], report
