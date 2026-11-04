"""Public finding retains candidate and recorded attachment in the original strength order."""
import json, socket, subprocess, time
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
HTML='''<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import R from "/@react-refresh";R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/world-public-multiple-topics-2029.jsx"></script></body></html>'''
s=socket.socket();s.bind(("127.0.0.1",0));port=s.getsockname()[1];s.close();base=f"http://127.0.0.1:{port}"
log=open("/tmp/world-public-multiple-topics-vite.log","w")
server=subprocess.Popen(["node","node_modules/vite/bin/vite.js","--host","127.0.0.1","--port",str(port),"--strictPort"],cwd=ROOT,stdout=log,stderr=log)
errors=[];failures=[];cases=[]
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
    main=page.locator(".sod29-world-public-finding");expect(main).to_be_visible()
    expect(main.get_by_text("נושא לבחינה · נושא חזק",exact=True)).to_be_visible()
    assert main.get_by_role("link",name="פתח את הנושא ←").get_attribute("href")=="/topic/strong-topic"
    main.get_by_text("נושאים נוספים · 1",exact=True).click()
    expect(main.get_by_text("הצמדה לצומת מספר נרשמה · נושא בהצמדה",exact=True)).to_be_visible()
    assert main.get_by_role("link",name="פתח את הנושא",exact=True).get_attribute("href")=="/topic/attached-topic"
    source_details=main.locator(".sod29-world-source-locator details")
    assert not source_details.get_attribute("open")
    source_details.get_by_text("פרטי המקור",exact=True).click()
    expect(source_details.get_by_text("fixture-finding",exact=True)).to_be_visible()
    expect(source_details.get_by_text("channel_updates:fixture",exact=True)).to_be_visible()
    assert "נושא פרטי" not in main.inner_text()
    assert "יעד מדויק בעץ" not in main.inner_text()
    assert "מחובר לעץ" not in main.inner_text()
    cases.append({"width":width,"first":"strong-candidate","second":"recorded-attachment"})
   except Exception as exc:failures.append({"width":width,"error":str(exc)[:700]})
   c.close()
  b.close()
finally:
 server.terminate();server.wait(timeout=10);log.close()
print(json.dumps({"cases":cases,"errors":errors,"failures":failures},ensure_ascii=False))
if len(cases)!=2 or errors or failures:raise SystemExit(1)
