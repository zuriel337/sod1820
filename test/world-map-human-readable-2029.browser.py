"""Real map shell: readable source-scoped mode and unchanged default mode.

All fixture data is synthetic. External requests are blocked; no model calls.
"""
import json, os, socket, subprocess, time
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("ZVI_HUMAN_MAP_EVIDENCE", "/tmp/world-map-human-readable-2029"))
OUT.mkdir(parents=True, exist_ok=True)
HTML = """<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0"><div id="root"></div>
<script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script>
<script type="module" src="/test/fixtures/world-map-human-readable-2029.jsx"></script></body></html>"""
s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
BASE = f"http://127.0.0.1:{port}"
log = (OUT / "vite.log").open("w")
proc = subprocess.Popen(["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", str(port), "--strictPort"], cwd=ROOT, stdout=log, stderr=log)
report = {"cases": [], "failures": [], "errors": [], "model_calls": [], "writes": []}

def setup(page):
    page.on("pageerror", lambda e: report["errors"].append(str(e)))
    def wire(route):
        req = route.request
        if "127.0.0.1" in req.url:
            if req.is_navigation_request(): return route.fulfill(content_type="text/html", body=HTML)
            return route.continue_()
        if any(x in req.url for x in ("ai-analyze", "research-run", "raziel-submit")):
            report["model_calls"].append("model"); return route.abort()
        if req.method not in ("GET", "HEAD", "OPTIONS"): report["writes"].append(req.method)
        return route.abort()
    page.route("**/*", wire)

def select(node):
    node.focus(); node.press("Enter")

try:
    for _ in range(120):
        try:
            if urlopen(BASE, timeout=1).status == 200: break
        except Exception: time.sleep(.25)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        for width in (320, 390, 1440):
            for theme in ("light", "parchment", "dark"):
                c = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                page = c.new_page(); page.set_default_timeout(10000); setup(page)
                try:
                    page.goto(BASE + f"/world?human=1&theme={theme}")
                    findings = page.locator('[data-wm-node][data-kind="finding"]')
                    expect(findings).to_have_count(2)
                    assert findings.nth(0).get_attribute("aria-label") == "ממצא: אור ושבת"
                    assert findings.nth(1).get_attribute("aria-label") == "ממצא: ממצא מחקר"
                    for label in page.locator("[data-wm-node]").evaluate_all("es=>es.map(e=>e.getAttribute('aria-label'))"):
                        assert "00000000-" not in label and "uf1:" not in label and "channel_updates:" not in label, label
                    titles = page.locator(".wm29-canvas svg title").all_text_contents()
                    assert all("edge:" not in title and "uf1:" not in title and "00000000-" not in title for title in titles), titles
                    select(findings.nth(0))
                    inspector = page.locator(".wm29-inspector")
                    expect(inspector).to_be_visible()
                    expect(inspector).to_contain_text("אור ושבת")
                    expect(inspector).to_contain_text("אומת")
                    expect(inspector).to_contain_text("מאושר")
                    details = inspector.locator("details").first
                    assert details.locator("code").count() > 0 and not details.locator("code").first.is_visible()
                    details.locator("summary").click()
                    expect(details.locator("code").first).to_be_visible()
                    assert "uf1" in details.locator("code").first.inner_text()
                    details.locator("summary").click()
                    select(findings.nth(1))
                    expect(inspector).to_contain_text("מצב האימות אינו ידוע")
                    expect(inspector).to_contain_text("קנוני")
                    assert "טרם נבדק" not in inspector.inner_text()
                    source = page.locator('[data-wm-node][data-kind="source"]').first
                    select(source)
                    expect(inspector).to_contain_text("מקור משויך ל")
                    assert "כותב" not in inspector.inner_text()
                    assert "channel_updates:" not in inspector.inner_text()
                    occurrence = page.locator('[data-wm-node][data-kind="occurrence"]').first
                    select(occurrence)
                    assert "#raw-internal-location" not in inspector.inner_text()
                    assert "channel_updates:" not in inspector.inner_text()
                    target = page.locator('[data-wm-node][data-kind="tree"]').first
                    select(target)
                    expect(inspector).to_contain_text("יעד מתועד")
                    assert "edge:fixture-raw-1" not in inspector.inner_text()
                    target_refs = inspector.locator('details').filter(has=page.locator('code')).last
                    target_refs.locator('summary').click()
                    expect(target_refs).to_contain_text("edge:fixture-raw-1")
                    source.focus(); source.press("ArrowLeft")
                    page.wait_for_function("() => ['occurrence','finding'].includes(document.activeElement?.getAttribute('data-kind'))")
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
                    if theme == "dark": page.screenshot(path=str(OUT / f"{width}-dark.png"))
                    report["cases"].append({"width": width, "theme": theme, "mode": "human"})
                except Exception as e:
                    report["failures"].append({"width": width, "theme": theme, "error": str(e)[:500]})
                    page.screenshot(path=str(OUT / f"failed-{width}-{theme}.png"))
                c.close()
        # Backward-compatible default: IDs/states retain their previous presentation.
        c = browser.new_context(viewport={"width": 1440, "height": 900})
        page = c.new_page(); setup(page); page.goto(BASE + "/world?human=0")
        f = page.locator('[data-wm-node][data-kind="finding"]').first
        expect(f).to_be_visible()
        assert "uf1" in f.get_attribute("aria-label")
        select(f); expect(page.locator(".wm29-inspector")).to_contain_text("match")
        assert page.locator(".wm29-inspector details").count() == 0
        report["cases"].append({"width": 1440, "mode": "default"})
        c.close(); browser.close()
finally:
    proc.terminate(); proc.wait(timeout=10); log.close()
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))

print(json.dumps(report, ensure_ascii=False))
assert len(report["cases"]) == 10 and not report["failures"] and not report["errors"] and not report["model_calls"] and not report["writes"]
