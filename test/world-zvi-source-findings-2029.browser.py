"""Real source cards and router; the source reader is synthetic and no product IO occurs."""
import json,os,socket,subprocess,time,traceback
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get("ZVI_SOURCE_EVIDENCE","/tmp/zvi-source-findings-2029"));OUT.mkdir(parents=True,exist_ok=True)
A="channel_updates:e720a119-00e7-4e27-8c8a-d8671ae7b474"
B="channel_updates:f720a119-00e7-4e27-8c8a-d8671ae7b474"
G="channel_updates:a720a119-00e7-4e27-8c8a-d8671ae7b474"
HTML='''<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/world-zvi-source-findings-2029.jsx"></script></body></html>'''
MATERIAL='''import {universalFindingId} from "/src/lib/research/universalFinding.js";
export const WORLD_SOURCE_FILTERS=[["all","הכל"]],WORLD_SOURCE_ITEMS_PAGE_SIZE=12;
export function filterWorldPeopleAndSources({people,items}) { return {people,items}; }
export async function fetchWorldContributorPublicMaterial(identity) {
 const refs=["channel_updates:e720a119-00e7-4e27-8c8a-d8671ae7b474","channel_updates:f720a119-00e7-4e27-8c8a-d8671ae7b474","posts:example","channel_updates:a720a119-00e7-4e27-8c8a-d8671ae7b474"];
 const items=refs.map((sourceRef,i)=>({id:sourceRef,sourceRef,type:"sources",label:"מקור",title:"מקור בדיקה "+i,href:"/world?sourceRef="+encodeURIComponent(sourceRef)}));
 const coverage=Object.fromEntries(["sources","occurrences","clusters","seriesCategories","findings","treeRelations","legacyTopics"].map(k=>[k,{available:k!=="treeRelations"}]));
 const id70="10000000-0000-4000-8000-000000000070";
 const existing={findingRef:universalFindingId({kind:"research-object",sourceIdentity:{researchObjectId:id70},subjectKey:id70}),sourceRefs:[refs[0]],href:"/world?finding="+id70};
 const contentProjection={contractVersion:"public-world-content-projection/v1",sources:items.slice(0,3).map(row=>({sourceRef:row.sourceRef,title:row.title,sourceHref:row.href})),occurrences:[],clusters:[],seriesCategories:[],findings:[existing],treeRelations:[],compatibility:{legacyTopics:[]},metrics:{corpusSources:3,occurrences:0},coverage};
 return {identity,items,total:items.length,partial:false,contentProjection,treeFindingTargets:[]};
}'''
READER='''import {universalFindingId} from "/src/lib/research/universalFinding.js";
export const ZVI_SOURCE_CONTRIBUTOR_ID="c66f0464-0928-490e-be9b-66d8a87e7fc8";
export async function publicResearchPresentationEligible(){throw new Error("unexpected all-source eligibility read")}
export function projectPublicResearchFinding(){throw new Error("unexpected all-source projection")}
window.__zviSourceCalls=[];
const A="channel_updates:e720a119-00e7-4e27-8c8a-d8671ae7b474",B="channel_updates:f720a119-00e7-4e27-8c8a-d8671ae7b474",G="channel_updates:a720a119-00e7-4e27-8c8a-d8671ae7b474";
const id=n=>"10000000-0000-4000-8000-"+String(n).padStart(12,"0");
const row=(n,sourceRef,ocr=false)=>({id:id(n),sourceRef,findingRef:universalFindingId({kind:"research-object",sourceIdentity:{researchObjectId:id(n)},subjectKey:id(n)}),href:"/world?finding="+id(n),findingHref:"/world?finding="+id(n),publicationState:"approved",title:"מחקר בדיקה "+n,kindLabel:"השערה",contributor:"כותב בדיקה",ocrNeedsReview:ocr});
export async function fetchZviSourceFindingsPage({sourceRef,cursor}) {
 window.__zviSourceCalls.push({sourceRef,cursor});
 await new Promise(resolve=>setTimeout(resolve,180));
 if(window.__zviFail){window.__zviFail=false;throw new Error("unavailable")}
 if(sourceRef===A&&cursor)return {rows:[row(1,A),row(9,A,true)],hasMore:false,nextCursor:null,omittedUnavailable:false,omittedForReview:false};
 if(sourceRef===A)return {rows:[...Array.from({length:8},(_,i)=>row(i+1,A)),row(40,B),{...row(50,A),findingHref:"/world?finding=wrong"},{...row(70,A),href:"/world?finding=wrong"}],hasMore:true,nextCursor:{id:id(8),createdAt:"2026-10-29T12:00:00Z"},omittedUnavailable:false,omittedForReview:false};
 if(sourceRef===B)return {rows:[row(40,B)],hasMore:false,nextCursor:null,omittedUnavailable:false,omittedForReview:false};
 if(sourceRef===G)return {rows:[row(60,G)],hasMore:false,nextCursor:null,omittedUnavailable:false,omittedForReview:false};
 throw new Error("unexpected source");
}
export async function fetchZviApprovedFindingsPage(){throw new Error("unexpected broad load")}
export async function fetchZviReviewedFindingsPage(){throw new Error("unexpected broad load")}
'''

s=socket.socket();s.bind(("127.0.0.1",0));port=s.getsockname()[1];s.close();BASE=f"http://127.0.0.1:{port}"
log=(OUT/"vite.log").open("w");proc=subprocess.Popen(["node","node_modules/vite/bin/vite.js","--host","127.0.0.1","--port",str(port),"--strictPort"],cwd=ROOT,stdout=log,stderr=log)
report={"cases":[],"errors":[],"external":[],"model_calls":[],"writes":[]}
try:
 for _ in range(120):
  try:
   if urlopen(BASE,timeout=1).status==200:break
  except Exception:time.sleep(.25)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path="/usr/bin/chromium",headless=True,args=["--no-sandbox"])
  for width in [320,390,1440]:
   c=browser.new_context(viewport={"width":width,"height":900},reduced_motion="reduce");page=c.new_page();page.set_default_timeout(10000)
   page.on("pageerror",lambda error:report["errors"].append(str(error)))
   def wire(route):
    req=route.request;u=urlparse(req.url)
    if u.hostname=="127.0.0.1":
     if req.is_navigation_request():return route.fulfill(content_type="text/html",body=HTML)
     if u.path.endswith("/worldPeopleSourcesProjection.js"):return route.fulfill(content_type="text/javascript",body=MATERIAL)
     if u.path.endswith("/worldZviApprovedFindings2029.js"):return route.fulfill(content_type="text/javascript",body=READER)
     return route.continue_()
    if u.path.rsplit("/",1)[-1] in ("ai-analyze","research-run","raziel-submit"):report["model_calls"].append(u.path)
    elif req.method not in ("GET","HEAD","OPTIONS"):report["writes"].append(u.path)
    else:report["external"].append(u.path)
    return route.abort()
   page.route("**/*",wire)
   try:
    page.goto(BASE+"/world?view=sources&source=tzvi-opoc#world-contributor-material")
    card=page.locator('article[data-source-ref="'+A+'"]');other=page.locator('article[data-source-ref="'+B+'"]')
    expect(card).to_be_visible();expect(other).to_be_visible()
    expect(card.locator("code")).to_be_hidden()
    card.get_by_text("פרטי המקור",exact=True).click()
    expect(card.locator("code")).to_be_visible()
    card.get_by_text("פרטי המקור",exact=True).click()
    expect(card.locator("code")).to_be_hidden()
    assert page.evaluate("window.__zviSourceCalls.length")==0
    assert page.locator('article[data-source-ref="posts:example"]').get_by_role("button",name="ממצאים במקור").count()==0
    card.get_by_role("button",name="ממצאים במקור").click()
    expect(card.get_by_text("מחקר בדיקה 1",exact=True)).to_be_visible()
    expect(card.get_by_text("מחקר בדיקה 2",exact=True)).to_be_visible()
    assert card.get_by_text("מחקר בדיקה 40",exact=True).count()==0
    assert card.get_by_text("מחקר בדיקה 50",exact=True).count()==0
    assert card.get_by_text("חלק מהחומר ממתין לעיון.",exact=True).count()==1
    assert not other.get_by_text("מחקר בדיקה 1",exact=True).count()
    assert page.evaluate("window.__zviSourceCalls.length")==1
    assert page.locator(".wm29").count()==1
    missing=page.locator('article[data-source-ref="'+G+'"]')
    missing.get_by_role("button",name="ממצאים במקור").click()
    expect(missing.get_by_text("מחקר בדיקה 60",exact=True)).to_be_visible()
    missing.get_by_role("button",name="הצג במפת העולם").click()
    expect(page.get_by_text("לא ניתן להציג את המקור בחלון המפה הנוכחי. החומר נשאר במקור.",exact=True)).to_be_visible()
    assert page.get_by_role("region",name="חלון מקור במפת העולם").count()==0
    card.get_by_role("button",name="הצג במפת העולם").click()
    expect(page.get_by_role("region",name="חלון מקור במפת העולם")).to_be_visible()
    assert page.locator(".wm29").count()==1
    expect(page.locator('[data-wm-node][data-kind="finding"]')).to_have_count(6)
    assert page.locator('[data-edge-kind="tree"]').count()==0
    assert page.locator(".wm29-window").inner_text().startswith("אין נתון על מספר המקורות")
    first_labels=page.locator('[data-wm-node][data-kind="finding"]').evaluate_all("es=>es.map(e=>e.getAttribute('aria-label'))")
    assert all("uf1:" not in x and "מחקר בדיקה" in x for x in first_labels),first_labels
    assert not any("מחקר בדיקה 70" in x for x in first_labels)
    expect(page.get_by_text("מוצגים 1–6 מתוך 8 ממצאים בטעינה הנוכחית. הכיסוי חלקי.",exact=True)).to_be_visible()
    page.get_by_role("button",name="הבאים במפה").click()
    expect(page.locator('[data-wm-node][data-kind="finding"]')).to_have_count(2)
    second_labels=page.locator('[data-wm-node][data-kind="finding"]').evaluate_all("es=>es.map(e=>e.getAttribute('aria-label'))")
    assert not any("מחקר בדיקה 70" in x for x in second_labels)
    expect(page.get_by_text("מוצגים 7–8 מתוך 8 ממצאים בטעינה הנוכחית. הכיסוי חלקי.",exact=True)).to_be_visible()
    page.get_by_role("button",name="קודמים במפה").click()
    expect(page.locator('[data-wm-node][data-kind="finding"]')).to_have_count(6)
    page.get_by_role("button",name="חזרה למפה הכללית").click()
    assert page.locator(".wm29").count()==1
    card.get_by_role("button",name="עוד ממצאים במקור").click()
    expect(card.get_by_text("מחקר בדיקה 9",exact=True)).to_be_visible()
    assert card.get_by_text("מחקר בדיקה 1",exact=True).count()==1
    assert card.get_by_text("סריקת OCR",exact=False).count()==1
    link=card.get_by_role("link",name="מחקר בדיקה 1",exact=True)
    assert link.get_attribute("href")=="/world?finding=10000000-0000-4000-8000-000000000001"
    assert link.bounding_box()["height"]>=44
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),page.evaluate("""() => ({width:innerWidth,scroll:document.documentElement.scrollWidth, nodes:[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left < -1}).slice(0,8).map(e=>({tag:e.tagName,cls:e.className?.baseVal||e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))})""")
    page.screenshot(path=str(OUT/f"{width}-source.png"))
    return_url="/world?view=sources&source=tzvi-opoc#world-contributor-material"
    link.click();expect(page.get_by_role("heading",name="ממצא ממוקד")).to_be_visible()
    assert page.evaluate("history.state.usr.returnTo")==return_url
    page.go_back();expect(page.locator('article[data-source-ref="'+A+'"]')).to_be_visible()
    switch=page.get_by_role("region",name="בדיקת החלפת מקור")
    switch.get_by_role("button",name="מקור בדיקה א").click()
    switch.get_by_role("button",name="ממצאים במקור").click()
    switch.get_by_role("button",name="מקור בדיקה ב").click()
    page.wait_for_timeout(250)
    assert switch.get_by_text("מחקר בדיקה 1",exact=True).count()==0
    switch.get_by_role("button",name="ממצאים במקור").click()
    expect(switch.get_by_text("מחקר בדיקה 40",exact=True)).to_be_visible()
    page.evaluate("window.__zviFail=true")
    switch.get_by_role("button",name="מקור בדיקה א").click()
    switch.get_by_role("button",name="ממצאים במקור").click()
    expect(switch.get_by_text("לא הצלחנו לטעון",exact=False)).to_be_visible()
    switch.get_by_role("button",name="נסה שוב").click()
    expect(switch.get_by_text("מחקר בדיקה 1",exact=True)).to_be_visible()
    page.goto(BASE+"/world?view=sources&source=other")
    other_author_card=page.locator('article[data-source-ref="'+A+'"]')
    expect(other_author_card).to_be_visible()
    assert other_author_card.get_by_role("button",name="ממצאים במקור").count()==0
    report["cases"].append({"width":width,"source_only_on_click":True,"wrong_source_or_href_hidden":True,"other_author_hidden":True,"pagination":True,"map_focus_and_next_previous":True,"stale_discarded":True,"retry":True,"return_to":True})
   except Exception as e:
    report["cases"].append({"width":width,"failure":traceback.format_exc()[-1600:]});page.screenshot(path=str(OUT/f"{width}-failure.png"))
   c.close()
  browser.close()
finally:
 proc.terminate();proc.wait(timeout=10);log.close();(OUT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
if len(report["cases"])!=3 or any("failure" in c for c in report["cases"]) or report["errors"] or report["model_calls"] or report["writes"]:raise SystemExit(1)
