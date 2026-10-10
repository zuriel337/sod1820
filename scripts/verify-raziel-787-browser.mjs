// Local browser experience proof with actual React panel/transport/Edge handler.
// Supabase SDK, database, identity and provider are synthetic; remote egress denied.
// Run with Node24, npm dependencies, Python Playwright + installed Chromium.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fixture, SOURCE, Q1, Q2, OLD, CORRECTED, correction } from "../test/fixtures/raziel-interview-787.mjs";
import { numberResearcherHandler } from "../test/helpers/number-researcher-handler.mjs";

const f=fixture(),invoke=numberResearcherHandler(f);
const out=process.env.SOD_PILOT_ARTIFACT_DIR || "/tmp/raziel-787-browser";
await mkdir(out,{recursive:true});
const mockSdk=`export const supabase={functions:{invoke:async(name,{body})=>{if(name!=='number-researcher')throw Error('unexpected function');const r=await fetch('/__fixture__',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return r.ok?{data:await r.json(),error:null}:{data:null,error:{context:r}};}}};`;
const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>פיילוט רזיאל 787 — שירותים מדומים</title></head><body style="font:16px sans-serif;max-width:900px;margin:30px auto"><h1>פיילוט רזיאל 787 — שירותים מדומים</h1><div id="root"></div><script type="module">import React from 'react';import{createRoot}from'react-dom/client';import Pilot from'/src/components/admin/RazielInterviewPilot.jsx';createRoot(document.getElementById('root')).render(React.createElement(Pilot));</script></body></html>`;
let server;
try {
  server=await createServer({configFile:false,plugins:[react(),{
    name:"raziel787-mock-only",
    enforce:"pre",
    transform(_code,id){if(id.endsWith("/src/lib/supabase.js"))return{code:mockSdk,map:null};},
    configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
      if(req.url==="/__fixture__"){
        try{let raw="";for await(const chunk of req)raw+=chunk;if(raw.length>100000)throw Error("payload");const body=JSON.parse(raw);
          if(body.__fault){f.failOnce("fn_research_path_append_v1");res.setHeader("Content-Type","application/json");res.end('{"ok":true}');return;}
          const result=await invoke(body);res.statusCode=result.status;res.setHeader("Content-Type","application/json");res.end(JSON.stringify(result.body));
        }catch{res.statusCode=500;res.end('{"ok":false,"error":"fixture_failure"}');}return;
      }
      if(req.url==="/__pilot__/"){res.setHeader("Content-Type","text/html");res.end(await vite.transformIndexHtml(req.url,html));return;}next();
    });},
  }],server:{host:"127.0.0.1",port:5187,strictPort:true,hmr:false},logLevel:"error"});
  await server.listen();
  const python=String.raw`
import os,json
from playwright.sync_api import sync_playwright,expect
cfg=json.loads(os.environ['SOD_PILOT_FIXTURE'])
blocked=[]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    def context():
        c=browser.new_context(viewport={"width":1100,"height":1000})
        def route(r):
            if r.request.url.startswith('http://127.0.0.1:5187/'):
                r.continue_()
            else:
                blocked.append(r.request.url)
                r.abort()
        c.route('**/*',route)
        return c
    c=context()
    page=c.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5187/__pilot__/')
    page.locator('summary').click()
    page.get_by_label('הפניית מקור 787').fill(cfg['source'])
    page.get_by_label('שאלות קיימות לראיון').fill(cfg['q1']+'\n'+cfg['q2'])
    page.get_by_role('button',name='פתח ראיון מהשאלות שנבחרו',exact=True).click()
    expect(page.locator('[data-next-question]')).to_contain_text('מה משמעות החיבור')
    def fill_interpretation(statement,reason,scope,exceptions):
        page.get_by_label('שאלה לפירוש או לתיקון').select_option(cfg['q1'])
        page.get_by_label('פירוש מיוחס',exact=True).fill(statement)
        page.get_by_label('נימוק הפירוש').fill(reason)
        page.get_by_label('תחולת הפירוש').fill(scope)
        page.get_by_label('חריגי הפירוש').fill('\n'.join(exceptions))
    fill_interpretation(cfg['old'],'המצב הקודם במוק','סיפור המטוס',[])
    page.get_by_role('button',name='שמור ואשר את הפירוש המיוחס',exact=True).click()
    expect(page.locator('[data-last-interpretation]')).to_contain_text(cfg['old'])
    fix=cfg['correction']
    fill_interpretation(cfg['corrected'],fix['reason'],fix['scope'],fix['exceptions'])
    page.get_by_role('button',name='שמור ואשר את הפירוש המיוחס',exact=True).click()
    expect(page.locator('[data-last-interpretation]')).to_contain_text(cfg['corrected'])
    page.get_by_role('button',name='שאל את רזיאל',exact=True).click()
    expect(page.locator('[data-interview-answer]')).to_contain_text(cfg['corrected'])
    page.screenshot(path=os.path.join(cfg['out'],'corrected-answer.png'),full_page=True)
    path_id=page.get_by_label('מסלול ראיון שמור').input_value()
    c.close()
    c=context()
    page=c.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5187/__pilot__/')
    page.locator('summary').click()
    expect(page.locator('[data-next-question]')).to_contain_text('איזו דוגמת נגד')
    expect(page.locator('[data-last-interpretation]')).to_contain_text(cfg['corrected'])
    assert page.get_by_label('מסלול ראיון שמור').input_value()==path_id
    assert page.evaluate('localStorage.length')==0
    page.screenshot(path=os.path.join(cfg['out'],'fresh-session-next-question.png'),full_page=True)
    page.request.post('http://127.0.0.1:5187/__fixture__',data={'__fault':True})
    fill_interpretation(cfg['corrected']+' תחולה נוספת במוק בלבד.',fix['reason'],fix['scope'],fix['exceptions'])
    page.get_by_role('button',name='שמור ואשר את הפירוש המיוחס',exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('הפעולה לא הושלמה בשלב checkpoint')
    expect(page.locator('[data-next-question]')).to_contain_text('מה משמעות החיבור')
    page.screenshot(path=os.path.join(cfg['out'],'failed-save-reopens-question.png'),full_page=True)
    assert not blocked,blocked
    assert not errors,errors
    print(json.dumps({'layer':'LOCAL_BROWSER_MOCKED_SERVICES','correction_to_answer':True,'fresh_context_next_question':True,'failure_reopens_question':True,'external_requests':len(blocked),'page_errors':errors}))
    browser.close()
`;
  const child=spawn("python",["-"],{env:{...process.env,SOD_PILOT_FIXTURE:JSON.stringify({source:SOURCE,q1:Q1,q2:Q2,old:OLD,corrected:CORRECTED,correction,out})},stdio:["pipe","pipe","inherit"]});
  let output="";child.stdout.on("data",chunk=>{output+=chunk;process.stdout.write(chunk);});child.stdin.end(python);
  const exit=await new Promise(resolve=>child.once("exit",resolve));assert.equal(exit,0,"browser acceptance failed");
  assert.equal(f.unexpected.length,0);
  const report={browser:JSON.parse(output.trim()),endpoint:"actual number-researcher source in isolated VM",db:"mocked existing RPC contracts",identity:"synthetic admin JWT",provider:"mock only",modelCalls:f.models.length,liveModelCalls:0,liveProductWrites:0,corpusScans:0,liveUserExperience:"NOT_VERIFIED"};
  await writeFile(`${out}/browser-report.json`,JSON.stringify(report,null,2));
}finally{await server?.close();}
