"""Exercise the real list against synthetic anonymous PostgREST responses.

Every external request is intercepted; no product data or model is contacted.
"""
import json, os, socket, subprocess, time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("ZVI_BROWSER_OUT", "/tmp/zvi-approved-list-2029")); OUT.mkdir(parents=True, exist_ok=True)
HTML = '''<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/zvi-approved-list-2029.jsx"></script></body></html>'''
SOURCE = "e720a119-00e7-4e27-8c8a-d8671ae7b474"
HIDDEN = "f720a119-00e7-4e27-8c8a-d8671ae7b474"
CONTRIBUTOR = "c66f0464-0928-490e-be9b-66d8a87e7fc8"
def uid(i): return f"00000000-0000-4000-8000-{i:012d}"
rows = [{"id":uid(i), "created_at":"2026-10-28T12:00:00Z", "statement":f"ממצא בדיקה {i}", "contributor":"צבי",
         "source_ref":f"channel_updates:{SOURCE}#{i}", "source_contributor_id":CONTRIBUTOR, "status":"approved", "privacy_scope":"public", "meta":{"ext":{"presentation":{"statement_role":"research_statement"}}}} for i in range(1, 37)]
# Deliberately violate upstream filters to exercise fail-closed boundaries.
rows[1].update(statement="מידע פרטי לא להציג", privacy_scope="private")
rows[2].update(statement="מועמד לא להציג", status="candidate")
rows[3].update(statement="אישי לא להציג", meta={"ext":{"personal_scope":{"scope":"person_only"}}})
rows[4].update(statement="מקור שהוסר לא להציג", source_ref=f"channel_updates:{HIDDEN}")
rows[32].update(statement="רשומה ללא סיווג לא להציג", meta={})
rows[33].update(statement="צוריאל שאלה אישית לא להציג", meta={"ext":{"presentation":{"statement_role":"source_message"}}})
rows[34].update(statement="OCR מהמדיה: נוסח חילוץ")
rows.sort(key=lambda row: row["id"],reverse=True)
report = {"cases":[], "failures":[], "errors":[], "writes":[], "model_calls":[]}
s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close(); BASE = f"http://127.0.0.1:{port}"
log = (OUT / "vite.log").open("w"); proc = subprocess.Popen(["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", str(port), "--strictPort"], cwd=ROOT, stdout=log, stderr=log)
try:
 for _ in range(120):
  try:
   if urlopen(BASE, timeout=1).status == 200: break
  except Exception: time.sleep(.25)
 with sync_playwright() as p:
  b = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
  for width in [320,390,1440]:
   c = b.new_context(viewport={"width":width,"height":900}, reduced_motion="reduce")
   page = c.new_page(); page.set_default_timeout(10000); requests=[]
   page.on("pageerror", lambda e: report["errors"].append(str(e)))
   def handle(route):
    req=route.request; url=urlparse(req.url); name=url.path.rsplit("/",1)[-1]
    if url.hostname == "127.0.0.1":
     return route.fulfill(content_type="text/html", body=HTML) if req.is_navigation_request() else route.continue_()
    if name in ["ai-analyze", "research-run", "raziel-submit"]: report["model_calls"].append(name); return route.abort()
    if req.method not in ["GET", "HEAD", "OPTIONS"]: report["writes"].append(name); return route.abort()
    requests.append({"path":name,"query":url.query})
    if name == "world_contributor_research_v1":
     q=parse_qs(url.query); start=int(q.get("offset",["0"])[0]); limit=int(q.get("limit",["26"])[0])
     if q.get("or"):
      import re
      match=re.search(r"id\.lt\.([0-9a-f-]{36})",q["or"][0],re.I)
      if match: start=next((i for i,row in enumerate(rows) if row["id"] < match.group(1)),len(rows))
     if "range" in req.headers:
      bounds=req.headers["range"].split("-");start=int(bounds[0]);limit=int(bounds[1])-start+1
     return route.fulfill(json=rows[start:start+limit],headers={"access-control-allow-origin":"*","content-range":f"{start}-{min(start+limit,len(rows))-1}/{len(rows)}"})
    if name == "channel_updates": return route.fulfill(json=[{"id":SOURCE,"status":"live"}],headers={"access-control-allow-origin":"*"})
    return route.fulfill(json=[],headers={"access-control-allow-origin":"*"})
   page.route("**/*",handle)
   try:
    page.goto(BASE+"/world?view=sources&source=tzvi-opoc#world-contributor-material")
    expect(page.get_by_role("button",name="הצגת הממצאים המאושרים")).to_be_visible()
    assert not requests, requests
    page.get_by_role("button",name="הצגת הממצאים המאושרים").click()
    expect(page.get_by_role("link",name="ממצא בדיקה 36",exact=True)).to_be_visible()
    expect(page.get_by_role("button",name="עוד ממצאים")).to_be_visible()
    assert len([r for r in requests if r["path"]=="world_contributor_research_v1"])==1,requests
    body=page.locator("body").inner_text()
    for hidden in ["מידע פרטי לא להציג","מועמד לא להציג","אישי לא להציג","מקור שהוסר לא להציג","צוריאל שאלה אישית לא להציג","רשומה ללא סיווג לא להציג","מאומת במנוע"]: assert hidden not in body,hidden
    ocr=page.get_by_role("listitem").filter(has_text="OCR מהמדיה: נוסח חילוץ").inner_text()
    ocr_note=ocr.replace("OCR מהמדיה: נוסח חילוץ","").replace("פתיחת המקור","")
    assert any(word in ocr_note for word in ["בדיק", "להשוות", "תמלול"]),ocr
    assert page.get_by_text("רשימה חלקית",exact=False).count() > 0,body
    finding=page.get_by_role("link",name="ממצא בדיקה 36",exact=True).get_attribute("href")
    assert finding=="/world?finding="+uid(36),finding
    source=page.get_by_role("link",name="פתיחת המקור").first.get_attribute("href")
    assert SOURCE in source and "sourceRef=" in source,source
    page.get_by_role("button",name="עוד ממצאים").click()
    expect(page.get_by_role("link",name="ממצא בדיקה 1",exact=True)).to_be_visible()
    assert page.get_by_text("חלק מהמקורות אינם זמינים",exact=False).count()==1
    body=page.locator("body").inner_text()
    for hidden in ["מידע פרטי לא להציג","מועמד לא להציג","אישי לא להציג","מקור שהוסר לא להציג","צוריאל שאלה אישית לא להציג","רשומה ללא סיווג לא להציג","מאומת במנוע"]: assert hidden not in body,hidden
    assert page.get_by_role("button",name="עוד ממצאים").count()==0
    assert len([r for r in requests if r["path"]=="world_contributor_research_v1"])==2,requests
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+1")
    page.screenshot(path=str(OUT / f"{width}.png"),full_page=True)
    before=page.url
    page.get_by_role("link",name="ממצא בדיקה 36",exact=True).click()
    assert urlparse(page.url).query=="finding="+uid(36),page.url
    assert page.evaluate("history.state.usr.returnTo")=="/world?view=sources&source=tzvi-opoc#world-contributor-material"
    page.go_back();assert page.url==before
    page.get_by_role("link",name="פתיחת המקור").first.click()
    assert parse_qs(urlparse(page.url).query)["sourceRef"]==["channel_updates:"+SOURCE]
    assert urlparse(page.url).fragment=="source-occurrence-"+SOURCE
    report["cases"].append({"width":width,"pages":2,"finding":finding,"source":source,"requests":requests})
   except Exception as e:
    report["failures"].append({"width":width,"error":str(e)[:300],"requests":requests});page.screenshot(path=str(OUT / f"failed-{width}.png"))
   c.close()
  b.close()
finally:
 proc.terminate(); proc.wait(timeout=10); log.close(); (OUT / "report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
assert len(report["cases"])==3 and not report["failures"] and not report["errors"] and not report["writes"] and not report["model_calls"]
