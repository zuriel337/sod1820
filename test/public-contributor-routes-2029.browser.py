"""Exercise the built App2029 router, existing frame and World source reader.

The document rewrite below belongs to this test only. vercel.json is unchanged;
passing this test does not prove that a hosted direct URL serves 2029.
All external requests are intercepted; no production writes or sessions are used.
Run after npm run build:2029, with Python Playwright and Chromium installed.
"""
import base64
import functools
import json
import threading
import subprocess
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
OUTPUT = ROOT / "work/evidence/writer-routes"
OUTPUT.mkdir(parents=True, exist_ok=True)
HTML = (DIST / "2029.html").read_text()
fixture = json.loads(subprocess.check_output([
    "node", "--input-type=module", "-e",
    "import*as c from'./src/components/contributor2029/publicSourceCatalog2029Fixtures.js';"
    "import*as g from'./src/components/contributor2029/publicContributor2029Fixtures.js';"
    "console.log(JSON.stringify({tzvi:{...c.catalogFixtureIdentity,public_visibility:'public'},"
    "sources:c.catalogFixtureSources(),general:{...g.fixtureIdentity,public_visibility:'public'},"
    "finding:g.fixtureFinding,source:g.fixtureSource}))",
], cwd=ROOT, text=True))


class StaticFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(StaticFiles, directory=str(DIST)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:" + str(server.server_port)
report = {"runtime": "built App2029 + existing providers/frame + World", "data": "synthetic HTTP fixtures only",
          "hosting_rewrite": "test-only; vercel.json unchanged", "captures": [], "round_trips": [],
          "legacy_handoffs": [], "errors": [], "blocked_external_hosts": []}


def intercept(page, *, handoff_path=None, general=False):
    calls = []
    documents = []
    page.on("pageerror", lambda error: report["errors"].append(str(error)))

    def route(request):
        req = request.request
        u = urlparse(req.url)
        if u.hostname == "127.0.0.1":
            if req.is_navigation_request() and req.resource_type == "document":
                documents.append(u.path + ("?" + u.query if u.query else ""))
                if u.path == handoff_path and len(documents) > 1:
                    return request.fulfill(content_type="text/html", body="<h1>Legacy document target</h1>")
                if u.path.startswith(("/community/researcher/", "/researcher/")) or u.path == "/world":
                    return request.fulfill(content_type="text/html", body=HTML)
            if u.path == "/api/public-contributor-rank":
                calls.append({"table": "rank", "method": req.method})
                return request.fulfill(content_type="application/json", body=json.dumps({"state": "ready", "level": 5, "label": "חוקר היכל"}))
            if u.path == "/test/fixtures/public-contributor-catalog.svg":
                return request.fulfill(content_type="image/svg+xml", body=(ROOT / u.path.lstrip("/")).read_text())
            if u.path.startswith("/api/"):
                return request.fulfill(content_type="application/json", body="{}")
            return request.continue_()
        if u.hostname != "linswmnnkjxvweumprav.supabase.co":
            report["blocked_external_hosts"].append(u.hostname)
            return request.abort()
        table = u.path.rsplit("/", 1)[-1]
        q = parse_qs(u.query)
        entry = {"table": table, "method": req.method, "path": u.path}
        if table in ["contributors", "channel_updates", "research_contributions", "world_contributor_research_v1"]:
            token = req.headers.get("authorization", "").split()[-1]
            claims = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
            assert claims["role"] == "anon", "public content used session credentials"
            entry["anonymous"] = True
        calls.append(entry)
        data = []
        identity = fixture["general"] if general else fixture["tzvi"]
        if table == "contributors":
            keys = q.get("slug", []) + q.get("code", [])
            if not keys or keys[0] in ["eq." + str(identity.get("slug")), "eq." + str(identity.get("code"))]:
                data = [identity]
        elif table == "channel_updates" and q.get("contributor_id") != ["is.null"]:
            data = [fixture["source"]] if general else fixture["sources"]
            if q.get("id", [""])[0].startswith("eq."):
                data = [row for row in data if row["id"] == q["id"][0][3:]]
        elif table == "world_contributor_research_v1" and general:
            data = [fixture["finding"]]
        # Existing telemetry/provider requests are fulfilled locally, never forwarded.
        if req.method != "GET":
            data = [] if "/rpc/" in u.path else {}
        return request.fulfill(status=200, content_type="application/json", headers={
            "access-control-allow-origin": "*", "content-range": f"0-{max(0, len(data)-1)}/{len(data)}",
        }, body=json.dumps(data))

    page.route("**/*", route)
    return calls, documents


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        for width in [320, 390, 1440]:
            for theme in ["light", "parchment", "dark"]:
                context = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce")
                context.add_init_script("localStorage.setItem('sod-theme'," + json.dumps(theme) + ")")
                page = context.new_page()
                calls, documents = intercept(page)
                return_to = "/world?view=sources&source=tzvi-opoc&sourceRef=channel_updates%3A00000000-0000-4000-8000-000000000025#source-occurrence-00000000-0000-4000-8000-000000000025"
                href = BASE + "/community/researcher/tzvi-opoc?" + urlencode({"returnTo": return_to})
                page.goto(href)
                page.get_by_role("heading", name=fixture["tzvi"]["display_name"], exact=True).wait_for()
                page.locator(".pc-rank[data-rank-state='ready']").wait_for()
                assert page.locator(".sod29-root.surface-community").count() == 1
                assert page.locator("[data-catalog-source]").count() == 20
                assert page.locator(".pc-return").get_attribute("href") == return_to
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                assert not any("research" in c["table"] and c["table"] != "research_contributions" for c in calls)
                assert len(documents) == 1, documents
                page.screenshot(path=str(OUTPUT / f"{width}-{theme}.png"))
                report["captures"].append({"width": width, "theme": theme, "existing_frame": True,
                                           "recent_count": 20, "horizontal_overflow": False,
                                           "initial_research_requests": 0, "requests": len(calls)})
                if width == 390 and theme == "dark":
                    first_card = page.locator("[data-catalog-source]").first
                    saved_title = first_card.locator("h3").inner_text()
                    exact_href = first_card.get_by_role("link", name="להופעה המדויקת בעולם ↗").get_attribute("href")
                    first_card.get_by_role("button", name="שמירה לקריאה", exact=True).click()
                    first_card.get_by_role("button", name="נשמר", exact=True).wait_for()
                    page.reload()
                    page.locator("[data-catalog-source]").first.get_by_role("button", name="נשמר", exact=True).wait_for()
                    page.locator(".sod29-header-workspace").click()
                    saved = page.locator("[data-research-bucket='saved']")
                    saved.get_by_role("button").filter(has_text=saved_title).click()
                    page.wait_for_url(BASE + exact_href)
                    page.locator("[id='" + urlparse(exact_href).fragment + "']").wait_for()
                    page.go_back()
                    page.get_by_role("heading", name=fixture["tzvi"]["display_name"], exact=True).wait_for()
                    report["reading_workspace"] = {"local_guest_save": True, "reload_preserved": True, "native_workspace_library": True,
                        "exact_world_occurrence": True, "new_store": False}
                if width == 1440 and theme == "dark":
                    cards = page.locator("[data-catalog-source]")
                    image_card = cards.filter(has=page.locator("img")).first
                    text_card = cards.filter(has_not=page.locator("img")).first
                    source_targets = [(kind, card.get_by_role("link", name="להופעה המדויקת בעולם ↗").get_attribute("href"))
                                      for kind, card in [("paired-image-and-text", image_card), ("text", text_card)]]
                    for kind, source_href in source_targets:
                        page.locator(".pc-open[href='" + source_href + "']").click()
                        page.wait_for_url(BASE + source_href)
                        page.locator(".sod29-root.surface-world").wait_for()
                        anchor = urlparse(source_href).fragment
                        page.locator("[id='" + anchor + "']").wait_for()
                        assert page.url == BASE + source_href
                        page.reload()
                        page.locator("[id='" + anchor + "']").wait_for()
                        page.go_back()
                        page.get_by_role("heading", name=fixture["tzvi"]["display_name"], exact=True).wait_for()
                        assert page.url == href
                        report["round_trips"].append({"kind": kind, "source_href": source_href,
                                                      "exact_world_occurrence": True, "reload_preserved": True,
                                                      "back_preserved_writer_context": True})
                    page.locator(".pc-return").click()
                    page.wait_for_url(BASE + return_to)
                    page.locator("[id='" + urlparse(return_to).fragment + "']").wait_for()
                    report["return_to_preserved"] = True
                context.close()
        # Canonical numeric-code route also mounts the shared public presentation.
        context = browser.new_context()
        page = context.new_page()
        calls, _ = intercept(page, general=True)
        code = fixture["general"].get("code") or fixture["general"]["slug"]
        page.goto(BASE + "/community/researcher/" + str(code))
        page.get_by_role("heading", name=fixture["general"]["display_name"], exact=True).wait_for()
        assert page.locator(".sod29-root.surface-community").count() == 1
        report["general_route"] = {"key": code, "existing_frame": True, "rendered": True}
        context.close()
        # The router must cross the document boundary, not interpret the legacy editor as a writer.
        for path in ["/community/researcher/tzvi-opoc/edit"]:
            context = browser.new_context()
            page = context.new_page()
            calls, documents = intercept(page, handoff_path=path)
            # The existing LegacyDocumentHandoff has a separate known limitation:
            # assigning its current URL with a fragment can remain same-document.
            # This route-only change preserves that helper; test the supported query
            # handoff here. The negative fragment result is documented in the handoff.
            href = BASE + path + "?section=about"
            page.goto(href)
            page.get_by_role("heading", name="Legacy document target").wait_for()
            assert page.url == href
            assert not any(c["table"] in ["contributors", "channel_updates", "rank"] for c in calls)
            report["legacy_handoffs"].append({"path": path, "url_preserved": True,
                                              "public_content_requests": 0, "document_count": len(documents)})
            context.close()
        browser.close()
    assert not report["errors"], report["errors"]
    (OUTPUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({"captures": len(report["captures"]), "round_trips": report["round_trips"],
                      "general_route": report["general_route"], "legacy_handoffs": report["legacy_handoffs"],
                      "errors": report["errors"]}, ensure_ascii=False))
finally:
    server.shutdown()
    server.server_close()
