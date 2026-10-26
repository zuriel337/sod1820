"""All WatchButton variants: unknown state, failure/ack, retry, scope switch.
Synthetic intercepted HTTP only; never contacts product DB or sends mail/push.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "work/evidence/writer-follow"
OUT.mkdir(parents=True, exist_ok=True)
(ROOT / "work/writer-follow-review.html").write_text('<!doctype html><html lang="he" dir="rtl"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div><script type="module" src="/test/fixtures/writer-follow-safety-2029.jsx"></script></body></html>')
BASE = "http://127.0.0.1:" + os.environ.get("CONTRIBUTOR_REVIEW_PORT", "5182") + "/work/writer-follow-review.html"
report = {"variants": [], "errors": [], "live_writes": 0}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    context = browser.new_context()
    page = context.new_page()
    page.on("pageerror", lambda error: report["errors"].append(str(error)))
    state = {"read_fail": True, "write_fail": True, "calls": [], "topics": []}

    def route(r):
        req = r.request
        u = urlparse(req.url)
        if u.hostname == "127.0.0.1":
            if u.path.startswith("/api/"):
                return r.fulfill(json={})
            return r.continue_()
        if u.hostname != "linswmnnkjxvweumprav.supabase.co":
            return r.abort()
        name = u.path.rsplit("/", 1)[-1]
        state["calls"].append(name)
        if name == "notification_prefs_guest_get_v1":
            if state["read_fail"]:
                return r.fulfill(status=503, json={"message": "fixture read unavailable"})
            return r.fulfill(json={"topics": state["topics"], "channels": []})
        if name == "watch_toggle":
            if state["write_fail"]:
                return r.fulfill(status=503, json={"message": "fixture missing ack"})
            body = req.post_data_json
            state["topics"].append(body["p_topic"])
            return r.fulfill(json={"ok": True})
        return r.fulfill(json=[])

    page.route("**/*", route)
    page.goto(BASE)
    for variant in ["normal", "mini", "checkbox", "gate"]:
        block = page.locator(f"[data-variant='{variant}']")
        toggle = block.locator("button").first
        try:
            block.get_by_role("alert").filter(has_text="לא ניתן לאמת").wait_for(timeout=10000)
        except Exception:
            print(json.dumps({"body": page.locator("body").inner_text(), "errors": report["errors"], "calls": state["calls"]}, ensure_ascii=False), flush=True)
            raise
        expect(toggle).to_be_disabled()
    assert "watch_toggle" not in state["calls"]
    state["read_fail"] = False
    for variant in ["normal", "mini", "checkbox", "gate"]:
        block = page.locator(f"[data-variant='{variant}']")
        block.get_by_role("button", name="נסו שוב").click()
        toggle = block.locator("button").first
        expect(toggle).to_be_enabled()
        before = state["calls"].count("watch_toggle")
        topics_before = list(state["topics"])
        toggle.click()
        block.get_by_role("alert").filter(has_text="לא קיבלנו אישור").wait_for()
        expect(toggle).to_be_enabled()
        assert state["calls"].count("watch_toggle") == before + 1
        assert "שמור את המעקב שלך" not in block.inner_text()
        assert state["topics"] == topics_before
        state["write_fail"] = False
        toggle.click()
        if variant == "checkbox":
            expect(toggle).to_have_attribute("aria-checked", "true")
        elif variant in ["normal", "mini"]:
            expect(toggle).to_have_attribute("aria-pressed", "true")
        else:
            block.get_by_text("✓ אתה במעקב", exact=True).wait_for()
        state["write_fail"] = True
        report["variants"].append({"variant": variant, "unknown_gated": True, "missing_ack_error": True, "confirmed_retry": True})
    assert not any("push" in call or "email" in call for call in state["calls"])
    assert not report["errors"], report["errors"]
    (OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False))
    browser.close()
