"""Real number Zvi component with a synthetic public reader and no product IO.

The reader's public/private filtering is tested separately in the reader suite.
This fixture verifies navigation, UI, lazy explicit loading and stale requests.
"""
import json, os, socket, subprocess, time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("NUMBER_ZVI_BROWSER_OUT", "/tmp/number-zvi-public-research-2029"))
OUT.mkdir(parents=True, exist_ok=True)
HTML = """<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/number-zvi-public-research-2029.jsx"></script></body></html>"""
report = {"cases": [], "errors": [], "model_calls": [], "writes": [], "unexpected_reads": [], "failures": []}
s = socket.socket()
s.bind(("127.0.0.1", 0))
port = s.getsockname()[1]
s.close()
base = f"http://127.0.0.1:{port}"
log = (OUT / "vite.log").open("w")
proc = subprocess.Popen(
    ["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", str(port), "--strictPort"],
    cwd=ROOT, stdout=log, stderr=log,
)
try:
    for _ in range(120):
        if proc.poll() is not None:
            raise RuntimeError("Vite failed")
        try:
            if urlopen(base, timeout=1).status == 200:
                break
        except OSError:
            time.sleep(.25)
    else:
        raise RuntimeError("Vite did not start")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        for width in (320, 390, 1440):
            for theme in ("light", "parchment", "dark"):
                context = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce")
                context.add_init_script("localStorage.setItem('number-zvi-fixture-theme'," + json.dumps(theme) + ")")
                page = context.new_page()
                page.set_default_timeout(10000)
                page.on("pageerror", lambda e: report["errors"].append(str(e)))
                def handle(route):
                    req = route.request
                    url = urlparse(req.url)
                    name = url.path.rsplit("/", 1)[-1]
                    if url.hostname == "127.0.0.1":
                        if req.is_navigation_request():
                            return route.fulfill(content_type="text/html", body=HTML)
                        return route.continue_()
                    if name in ("ai-analyze", "research-run", "raziel-submit"):
                        report["model_calls"].append(name)
                    elif req.method not in ("GET", "HEAD", "OPTIONS"):
                        report["writes"].append(name)
                    elif url.hostname not in ("fonts.googleapis.com", "fonts.gstatic.com"):
                        report["unexpected_reads"].append(url.hostname or name)
                    return route.abort()
                page.route("**/*", handle)
                try:
                    page.goto(base + "/2029/number/786?focus=synthetic#number-content-live")
                    section = page.get_by_role("region", name="ממצאים ממקורות צבי למספר")
                    expect(section).to_be_visible()
                    assert page.evaluate("window.__numberZviFixture.calls.length") == 0
                    button = section.get_by_role("button", name="הצגת ממצאי צבי למספר", exact=True)
                    expect(button).to_be_visible()
                    size = button.evaluate("(e)=>{let r=e.getBoundingClientRect();return {w:r.width,h:r.height}}")
                    assert size["w"] >= 44 and size["h"] >= 44, size
                    # Two synchronous activation events while the first request is pending.
                    button.evaluate("(e)=>{e.click();e.click()}")
                    expect(section.get_by_role("link", name="ממצא בדיקה ראשון", exact=True)).to_be_visible()
                    typography = section.get_by_role("link", name="ממצא בדיקה ראשון", exact=True).evaluate(
                        "(e)=>{let s=getComputedStyle(e),r=e.getBoundingClientRect();return {size:parseFloat(s.fontSize),family:s.fontFamily,w:r.width,h:r.height}}"
                    )
                    assert typography["size"] >= 18 and "Noto Sans Hebrew" in typography["family"] and typography["w"] >= 44 and typography["h"] >= 44, typography
                    assert page.evaluate("window.__numberZviFixture.calls.length") == 1
                    assert section.get_by_text("מספר המופיע בממצא: 786", exact=True).count() == 2
                    ocr = section.get_by_role("listitem").filter(has_text="OCR בדיקה").inner_text()
                    assert "נדרשת בדיקה מול המקור" in ocr and "אינו ציטוט מאומת" in ocr
                    expect(section.get_by_text("חלק מהחומר ממתין לעיון.", exact=True)).to_be_visible()
                    expect(section.get_by_text("חלק מהחומר או מקורותיו אינם זמינים בתצוגה הציבורית.", exact=True)).to_be_visible()
                    for hidden in ("מידע פרטי לא להציג", "מועמד לא להציג", "אישי לא להציג", "מספר אחר לא יוצג", "כתובת מומצאת לא תוצג", "מאומת במנוע"):
                        assert hidden not in section.inner_text()
                    page.locator('[data-test="principal-user"]').click()
                    section.get_by_role("button", name="עוד ממצאים", exact=True).click()
                    expect(section.get_by_role("link", name="ממצא בדיקה שלישי", exact=True)).to_be_visible()
                    assert len(page.evaluate("window.__numberZviFixture.calls")) == 2
                    ids = section.locator('a[href^="/world?finding="]').evaluate_all(
                        "(es)=>es.map(e=>new URL(e.href).searchParams.get('finding'))"
                    )
                    assert len(ids) == len(set(ids)) == 3, ids
                    source_link = section.get_by_role("link", name="פתיחת המקור", exact=True).first
                    source_size = source_link.evaluate("(e)=>{let s=getComputedStyle(e),r=e.getBoundingClientRect();return {size:parseFloat(s.fontSize),family:s.fontFamily,w:r.width,h:r.height}}")
                    assert source_size["size"] >= 16 and "Rubik" in source_size["family"] and source_size["w"] >= 44 and source_size["h"] >= 44, source_size
                    source_href = source_link.get_attribute("href")
                    assert parse_qs(urlparse(source_href).query)["sourceRef"] == ["channel_updates:00000000-0000-4000-8000-000000000101"]
                    first = section.get_by_role("link", name="ממצא בדיקה ראשון", exact=True)
                    before = page.url
                    first.click()
                    assert parse_qs(urlparse(page.url).query)["finding"] == ["00000000-0000-4000-8000-000000000001"]
                    assert page.evaluate("history.state.usr.returnTo") == "/2029/number/786?focus=synthetic#number-content-live"
                    page.go_back()
                    assert page.url == before
                    section.get_by_role("link", name="פתיחת המקור", exact=True).first.click()
                    assert parse_qs(urlparse(page.url).query)["sourceRef"] == ["channel_updates:00000000-0000-4000-8000-000000000101"]
                    assert urlparse(page.url).fragment == "source-occurrence-00000000-0000-4000-8000-000000000101"
                    page.go_back()
                    assert page.url == before
                    # The account labels are fixture state; the injected reader always
                    # receives the public anonymous client, regardless of principal.
                    page.locator('[data-test="principal-admin"]').click()
                    page.locator('[data-test="number-224"]').click()
                    section.get_by_role("button", name="הצגת ממצאי צבי למספר", exact=True).click()
                    expect(section.get_by_text("טוען ממצאים…", exact=True)).to_be_visible()
                    page.locator('[data-test="number-0"]').click()
                    section.get_by_role("button", name="הצגת ממצאי צבי למספר", exact=True).click()
                    expect(section.get_by_role("link", name="אפס מפורש", exact=True)).to_be_visible()
                    assert section.get_by_text("מספר המופיע בממצא: 0", exact=True).count() == 1
                    page.wait_for_timeout(1050)
                    assert "תוצאה ממתינה לחשבון הקודם" not in section.inner_text()
                    assert section.get_by_role("link", name="אפס מפורש", exact=True).count() == 1
                    page.evaluate("window.__numberZviFixture.fail = true")
                    page.locator('[data-test="number-999"]').click()
                    section.get_by_role("button", name="הצגת ממצאי צבי למספר", exact=True).click()
                    expect(section.get_by_text("הממצאים אינם זמינים כרגע. אפשר לנסות שוב.", exact=True)).to_be_visible()
                    page.evaluate("window.__numberZviFixture.fail = false")
                    section.get_by_role("button", name="נסה שוב", exact=True).click()
                    expect(section.get_by_role("link", name="ניסיון חוזר הצליח", exact=True)).to_be_visible()
                    calls = page.evaluate("window.__numberZviFixture.calls")
                    assert all(call["role"] == "anon" for call in calls), calls
                    assert {call["principal"] for call in calls} >= {"guest", "user", "admin"}, calls
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
                    if theme == "light":
                        page.screenshot(path=str(OUT / f"{width}.png"))
                    report["cases"].append({"width": width, "theme": theme, "requests": len(calls)})
                except Exception as e:
                    report["failures"].append({"width": width, "theme": theme, "error": str(e)[:600]})
                    page.screenshot(path=str(OUT / f"failed-{width}-{theme}.png"))
                context.close()
        browser.close()
finally:
    proc.terminate()
    proc.wait(timeout=10)
    log.close()
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))

print(json.dumps(report, ensure_ascii=False))
assert len(report["cases"]) == 9 and not report["failures"] and not report["errors"] and not report["model_calls"] and not report["writes"] and not report["unexpected_reads"]
