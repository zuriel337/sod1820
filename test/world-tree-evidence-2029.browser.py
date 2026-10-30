"""Browser acceptance: candidate and documented targets have distinct labels."""
import json, socket, subprocess, time
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
HTML = """<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import R from "/@react-refresh";R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/world-tree-evidence-2029.jsx"></script></body></html>"""
s=socket.socket();s.bind(("127.0.0.1",0));port=s.getsockname()[1];s.close();base=f"http://127.0.0.1:{port}"
log=open("/tmp/world-tree-evidence-vite.log","w")
server=subprocess.Popen(["node","node_modules/vite/bin/vite.js","--host","127.0.0.1","--port",str(port),"--strictPort"],cwd=ROOT,stdout=log,stderr=log)
errors=[]; failures=[]; cases=[]
try:
 for _ in range(120):
  try:
   if urlopen(base,timeout=1).status==200:break
  except Exception:time.sleep(.2)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path="/usr/bin/chromium",headless=True,args=["--no-sandbox"])
  for width in (320,1440):
   c=b.new_context(viewport={"width":width,"height":950});page=c.new_page()
   page.on("pageerror",lambda error:errors.append(str(error)))
   def route(r):
    if r.request.url.startswith(base):
     return r.fulfill(content_type="text/html",body=HTML) if r.request.is_navigation_request() else r.continue_()
    return r.abort()
   page.route("**/*",route)
   try:
    page.goto(base+"/world",wait_until="domcontentloaded")
    candidate=page.locator("#finding-candidate");documented=page.locator("#finding-documented")
    expect(candidate).to_be_visible(timeout=20000);expect(documented).to_be_visible()
    expect(candidate.get_by_text("נושא לבחינה · נושא דוגמה",exact=True)).to_be_visible()
    expect(documented.get_by_text("הצמדה לצומת מספר נרשמה · נושא דוגמה",exact=True)).to_be_visible()
    for card in (candidate,documented):
     assert card.get_by_role("link",name="פתח את הנושא ←").get_attribute("href")=="/topic/fixture-topic"
     card.get_by_text("הצמדות רשומות ויעדים לבחינה",exact=False).click()
    expect(candidate.get_by_text("נושא · נושא דוגמה · יעד לבחינה",exact=True)).to_be_visible()
    expect(documented.get_by_text("מספר · צומת מספר מתועד · הצמדה נרשמה",exact=True)).to_be_visible()
    assert "מחובר לעץ" not in candidate.inner_text()
    assert "חיבור חי ליעד" not in candidate.inner_text()
    assert "מזהה יעד שמור" in candidate.inner_text()
    cases.append({"width":width,"candidate":"candidate","documented":"documented"})
   except Exception as exc:
    failures.append({"width":width,"error":str(exc)[:600]})
   c.close()
  b.close()
finally:
 server.terminate();server.wait(timeout=10);log.close()
print(json.dumps({"cases":cases,"errors":errors,"failures":failures},ensure_ascii=False))
if len(cases)!=2 or errors or failures:raise SystemExit(1)
