"""UI integration with controlled HTTP fixtures. Every external request is intercepted.
Messages/follows below are synthetic acknowledgments, never real user/DB writes.
"""
import base64
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "work/evidence/writer-actions"
OUT.mkdir(parents=True, exist_ok=True)
(ROOT / "work/contributor-actions-review.html").write_text('<!doctype html><html lang="he" dir="rtl"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="root"></div><script type="module" src="/test/fixtures/public-contributor-actions-2029-review.jsx"></script></body></html>')
BASE = "http://127.0.0.1:" + os.environ.get("CONTRIBUTOR_REVIEW_PORT", "5182") + "/work/contributor-actions-review.html"
ACCOUNT = "22222222-2222-4222-8222-222222222222"
report = {"captures": [], "roles": [], "errors": [], "writes": "HTTP intercepted; no live writes"}


def signed_in(context):
    def part(value):
        return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")
    token = part({"alg": "HS256"}) + "." + part({"sub": ACCOUNT, "role": "authenticated", "exp": int(time.time()) + 3600}) + ".synthetic"
    session = {"access_token": token, "refresh_token": "synthetic", "expires_at": int(time.time()) + 3600,
               "expires_in": 3600, "token_type": "bearer", "user": {"id": ACCOUNT, "email": "fixture@example.invalid"}}
    context.add_init_script("localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token'," + json.dumps(json.dumps(session)) + ")")


def intercept(page, role, fail_message=False):
    calls = []
    selected_pin = None
    page.on("pageerror", lambda error: report["errors"].append(str(error)))

    def route(r):
        nonlocal selected_pin
        req = r.request
        u = urlparse(req.url)
        if u.hostname in ["127.0.0.1", "localhost"]:
            if u.path == "/api/contributor-public-overview":
                calls.append({"name": "overview", "method": req.method})
                assert "authorization" not in req.headers
                data = {"state": "ready", "joinedAt": "2020-07-16T12:42:01Z", "pageSince": "2021-01-01T00:00:00Z",
                        "lastSeenState": "unavailable", "currentFocus": "מוקד כתיבה ציבורי",
                        "studio": {"available": True, "page": 0, "hasMore": False, "items": [
                            {"id": "native-gallery", "kind": "gallery", "media": [{"url": "/test/fixtures/public-contributor-catalog.svg", "caption": "גלריה ציבורית"}]},
                            {"id": "native-link", "kind": "link", "href": "https://example.invalid/native-writing"},
                            {"id": "native-body", "kind": "text", "title": "טקסט ציבורי מהסטודיו", "body": "זהו תוכן ציבורי מקורי"}] + ([selected_pin] if selected_pin else [])}}
                return r.fulfill(content_type="application/json", body=json.dumps(data))
            if u.path == "/api/contributor-curation":
                assert role == "owner" and req.method == "POST"
                body = req.post_data_json
                calls.append({"name": "curation", "method": req.method, "body": body})
                if body["action"] == "feature":
                    # Fixture selection is resolved to the same canonical source link as the page.
                    native_ref = body["itemId"].split("channel_updates:")[-1]
                    href = "/world?view=sources&source=tzvi-opoc&sourceRef=channel_updates%3A" + native_ref + "#source-occurrence-" + native_ref
                    selected_pin = {"id": "chosen-native-pin", "kind": "pin", "title": "נבחר", "ref": href, "refType": "source", "href": href} if body["enabled"] else None
                return r.fulfill(content_type="application/json", body='{"state":"saved"}')
            if u.path == "/api/contributor-interactions":
                calls.append({"name": "interactions", "method": req.method, "body": req.post_data_json if req.method == "POST" else None})
                if req.method == "POST":
                    assert role == "member"
                    assert req.headers.get("authorization", "").startswith("Bearer ")
                    return r.fulfill(status=503 if fail_message else 200, content_type="application/json", body=json.dumps({"state": "error" if fail_message else "sent"}))
                return r.fulfill(content_type="application/json", body=json.dumps({"state": "ready", "owner": role == "owner",
                    "followTopic": "author:צבי · נתוני בדיקה", "message": "self" if role == "owner" else "ready" if role == "member" else "login_required"}))
            return r.continue_()
        # Never forward external requests, including provider telemetry or write RPCs.
        assert u.hostname == "linswmnnkjxvweumprav.supabase.co", u.hostname
        name = u.path.rsplit("/", 1)[-1]
        calls.append({"name": name, "method": req.method})
        data = []
        if u.path == "/auth/v1/user":
            data = {"id": ACCOUNT, "email": "fixture@example.invalid"}
        elif name == "users":
            data = {"id": ACCOUNT, "display_name": "מבקר בדיקה", "role": "member"}
        elif "notification" in name or "prefs" in name:
            data = {"topics": [], "channels": []}
        elif name == "watch_toggle":
            calls[-1]["body"] = req.post_data_json
            data = {"ok": True}
        return r.fulfill(content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps(data))
    page.route("**/*", route)
    return calls


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    for width in [320, 390, 1440]:
        for theme in ["light", "parchment", "dark"]:
            context = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce")
            page = context.new_page()
            calls = intercept(page, "guest")
            page.goto(BASE + "?theme=" + theme)
            page.get_by_role("link", name="התחברות לשליחת הודעה").wait_for()
            page.get_by_text("מוקד כתיבה ציבורי", exact=True).wait_for()
            assert "6 שנים בקהילה" in page.locator(".cx-overview").inner_text()
            assert "חיבור אחרון אינו מוצג" in page.locator(".cx-overview").inner_text()
            assert page.locator(".cx-card").count() == 3
            assert page.locator(".cx-card a[href='https://example.invalid/native-writing']").count() == 1
            assert page.locator("[data-catalog-source]").count() == 20
            assert page.get_by_role("button", name="בחירה להצגה", exact=True).count() == 0
            assert page.get_by_role("button", name="עריכת ההקדמה הציבורית", exact=True).count() == 0
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (width, theme)
            flip = page.locator(".pc-rank-flip")
            flip.focus()
            page.keyboard.press("Enter")
            expect(flip).to_have_attribute("aria-expanded", "true")
            assert page.locator(".pc-rank-detail").is_visible()
            assert page.locator(".pc-rank-prism").evaluate("n=>getComputedStyle(n).transform").startswith("matrix3d(")
            assert page.locator(".pc-rank-prism").evaluate("n=>getComputedStyle(n).transitionDuration") == "0s"
            flip.click()
            for button in page.locator(".cx-actions button,.cx-actions a").all():
                if button.is_visible():
                    assert button.bounding_box()["height"] >= 44
                    assert button.evaluate("n=>parseFloat(getComputedStyle(n).fontSize)") >= 16
            page.screenshot(path=str(OUT / f"{width}-{theme}.png"), full_page=True)
            if width == 390:
                page.screenshot(path=str(OUT / f"top-{theme}.png"))
            report["captures"].append({"width": width, "theme": theme, "recent": 20, "native_studio_items": 3, "overflow": False, "keyboard_flip": True})
            # Existing principal-scoped ResearchProvider remounts pending→guest once.
            # Requests stay bounded per profile, independently of the 20 source cards.
            assert 1 <= len([c for c in calls if c["name"] == "overview"]) <= 2
            assert not any(c["name"] == "interactions" and c["method"] == "POST" for c in calls)
            if width == 390 and theme == "dark":
                with page.expect_response(lambda response: response.url.endswith("/rpc/watch_toggle")):
                    page.get_by_role("button", name="מעקב אחרי צבי · נתוני בדיקה").click()
                follow = [c for c in calls if c["name"] == "watch_toggle"]
                assert len(follow) == 1
                assert follow[0]["body"]["p_topic"] == "author:צבי · נתוני בדיקה"
                assert follow[0]["body"]["p_source"] == "writer-2029"
                assert follow[0]["body"]["p_on"] is True
                report["canonical_follow"] = "existing WatchButton/watch_toggle; HTTP mocked"
            context.close()
    for role, fail_message in [("member", False), ("owner", False), ("member", True)]:
        context = browser.new_context(viewport={"width": 390, "height": 900})
        signed_in(context)
        page = context.new_page()
        calls = intercept(page, role, fail_message=fail_message)
        page.goto(BASE + "?theme=dark")
        if role == "member":
            page.get_by_role("button", name="שליחת הודעה לכותב").click()
            dialog = page.get_by_role("dialog")
            assert dialog.is_visible()
            textarea = dialog.get_by_role("textbox")
            assert textarea.evaluate("n=>document.activeElement===n")
            textarea.fill("הודעת בדיקה מדומה בלבד")
            assert not any(c["name"] == "interactions" and c["method"] == "POST" for c in calls)
            dialog.get_by_role("button", name="שליחה", exact=True).click()
            dialog.get_by_text("לא התקבל אישור שליחה. בדקו בתיבת ההודעות לפני ניסיון נוסף." if fail_message else "ההודעה נשלחה.", exact=True).wait_for()
            assert len([c for c in calls if c["name"] == "interactions" and c["method"] == "POST"]) == 1
            dialog.get_by_role("button", name="ביטול" if fail_message else "סגירה", exact=True).click()
            assert not dialog.count()
            assert page.get_by_role("button", name="שליחת הודעה לכותב").evaluate("n=>document.activeElement===n")
        else:
            edit = page.get_by_role("link", name="עריכת הדף הציבורי שלי")
            edit.wait_for()
            assert edit.get_attribute("href").startswith("/profile?module=page-editor&returnTo=")
            assert page.get_by_role("link", name="תיבת ההודעות שלי").get_attribute("href").startswith("/profile?module=messages")
            assert page.get_by_role("button", name="שליחת הודעה לכותב").count() == 0
            first = page.locator("[data-catalog-source]").first
            target_href = first.get_by_role("link", name="להופעה המדויקת בעולם ↗").get_attribute("href")
            assert not any(c["name"] == "curation" for c in calls)
            first.get_by_role("button", name="בחירה להצגה", exact=True).click()
            page.locator(".rc-featured").wait_for()
            assert page.locator(".rc-featured a").get_attribute("href") == target_href
            first.get_by_role("button", name="ביטול בחירה", exact=True).wait_for()
            assert len([c for c in calls if c["name"] == "curation"]) == 1
            first.get_by_role("button", name="ביטול בחירה", exact=True).click()
            expect(page.locator(".rc-featured")).to_have_count(0)
            page.get_by_role("button", name="עריכת ההקדמה הציבורית", exact=True).click()
            editor = page.locator(".rc-editor")
            editor.get_by_role("textbox").fill("הקדמה ציבורית שנבחרה במפורש")
            assert len([c for c in calls if c["name"] == "curation"]) == 2
            editor.get_by_role("button", name="שמירת הקדמה ציבורית", exact=True).click()
            editor.get_by_text("ההקדמה נשמרה ומוצגת בפומבי.", exact=True).wait_for()
            assert len([c for c in calls if c["name"] == "curation"]) == 3
            report["writer_curation"] = {"explicit_only": True, "native_feature_href": True, "unselect": True, "introduction": True}
        report["roles"].append(role + ("-send-error" if fail_message else ""))
        context.close()
    browser.close()
assert not report["errors"], report["errors"]
(OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps({"captures": len(report["captures"]), "roles": report["roles"], "errors": report["errors"], "live_writes": 0}))
