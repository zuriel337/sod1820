import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright;
let vite;
let reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional outside browser-capable CI. */ }

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const available = Boolean(playwright && vite && reactPlugin && existsSync(executablePath));

function lifeJourneyFixturePlugin() {
  const modules = new Map([
    ["virtual:life-journey-auth.jsx", `const state={user:{id:"fixture-owner"},loading:false};export const useAuth=()=>state;`],
    ["virtual:life-journey-tracking.js", `window.__telemetry=window.__telemetry||[];export const track=(...args)=>window.__telemetry.push(args);`],
    ["virtual:life-journey-personal-date.js", `
      window.__dateCalls=window.__dateCalls||[];
      export const gregorianToHebrewDateRepresentation=()=>({hebrew:{pretty:"י״א בתשרי"}});
      export const createSupabasePersonalDateCrossProvider=()=>async()=>[];
      export const runPersonalDateResearch=async(input)=>{window.__dateCalls.push(input);return {findings:[{kind:"date_cross",subject:{value:73}}]};};
    `],
    ["virtual:life-journey-plan.js", `export const buildAccessDescriptor=()=>({scope:"private"});`],
    ["virtual:life-journey-hints.js", `
      window.__hintReads=window.__hintReads||[];
      export async function getMyHints(user,options){window.__hintReads.push({user,options});return [{id:"hint-1",hint_type:"idea",number:73,title:"רמז קיים",source_url:"https://example.test/source"}];}
    `],
    ["virtual:life-journey-supabase.js", `
      const PERSON_ID="11111111-1111-4111-8111-111111111111";
      const LEDGER_KEY="life-journey-ledger-fixture";
      const blank=()=>({members:[],relations:[]});
      const read=()=>{try{return JSON.parse(localStorage.getItem(LEDGER_KEY)||"null")||blank();}catch{return blank();}};
      const write=value=>localStorage.setItem(LEDGER_KEY,JSON.stringify(value));
      window.__elsCalls=window.__elsCalls||[];window.__nameCalls=window.__nameCalls||[];
      export const supabase={functions:{async invoke(name,{body}){
        window.__elsCalls.push({name,body});
        if(body.op==="page")return {data:{result:{contract:"els_search_page_v1",status:"OK",corpus_id:"fixture-torah",corpus_version:"v1",input:{normalized:body.term},selection_protocol:"POST_HOC_EXPLORATORY",hits:[{occurrence_id:"els:fixture-torah:"+body.term+":7:1:120",skip:7,dir:1,start:120,end:150,positions:[120,127,134]}],completion:{executed:true,returned_hits:1,total_hits:1,has_more:false,truncated:false}}}};
        if(body.op==="verify")return {data:{result:{contract:"els_occurrence_replay_v1",status:"OK",verification_state:"MATCH",corpus_id:"fixture-torah",corpus_version:"v1",input:{normalized:body.term},occurrence:{occurrence_id:"els:fixture-torah:"+body.term+":"+body.skip+":"+body.dir+":"+body.start,skip:body.skip,dir:body.dir,start:body.start,positions:[body.start]}}}};
        return {error:{message:"unsupported"}};
      }}};
      export async function getOrCreateMyPersonId(){return PERSON_ID;}
      export async function listFamily(){return read();}
      export async function upsertSelfProfile(personId,name,meta){const data=read(),source_ref="person:"+personId+":self";const row={source_ref,name,meta};const index=data.members.findIndex(item=>item.source_ref===source_ref);if(index<0)data.members.push(row);else data.members[index]=row;write(data);return row;}
      export async function upsertFamilyMember(personId,sourceRef,name,meta){const data=read();const ref=sourceRef||"person:"+personId+":p:fixture-"+(data.members.filter(item=>item.source_ref.includes(":p:")).length+1);const row={source_ref:ref,name,meta};const index=data.members.findIndex(item=>item.source_ref===ref);if(index<0)data.members.push(row);else data.members[index]=row;write(data);return row;}
      export async function upsertFamilyRelation(personId,parent_ref,child_ref,relation_type){const data=read();const row={source_ref:"relation:"+(data.relations.length+1),parent_ref,child_ref,relation_type};data.relations.push(row);write(data);return row;}
      export async function getNameMulti(name,options){window.__nameCalls.push({kind:"multi",name,options});return {input:{components:{values:{full:73,parts:{שם:73}}}},combo:{tracks_with_results:1}};}
      export async function getNameProtocol(name){window.__nameCalls.push({kind:"protocol",name});return {research_id:"fixture-name",input:{normalized:name,value:73},agents:[{output_key:"gematria",ran:true,ok:true,empty:false,ms:1,seq:1}],findings:{gematria:{regular:73}},provenance:{gematria:{fn:"fixture"}},scores:{depth:42},metatron:{headline:"סיכום בדיקה",follow_up:[]}};}
    `],
    ["virtual:life-journey-research.jsx", `
      import React,{createContext,useContext,useMemo,useRef,useState} from "react";
      import {mergeResearchContext,normalizeResearchContext} from "/src/lib/research/researchContext.js";
      import {continueResearchPathContext} from "/src/lib/research/researchPathRuntime.js";
      const KEY="life-journey-context-fixture";const Ctx=createContext(null);
      const initial=()=>{try{return normalizeResearchContext(JSON.parse(sessionStorage.getItem(KEY)||"null"));}catch{return null;}};
      export default function Provider({children}){const [context,setContextState]=useState(initial);const ref=useRef(context);
        window.__lifeJourneyContext=context;
        const commit=value=>{const next=normalizeResearchContext(value);ref.current=next;if(next)sessionStorage.setItem(KEY,JSON.stringify(next));else sessionStorage.removeItem(KEY);window.__lifeJourneyContext=next;setContextState(next);return true;};
        const actions=useMemo(()=>({
          setResearchContext:value=>commit(value),
          updateResearchContext:patch=>commit(mergeResearchContext(ref.current,patch)),
          continueResearchPath(options={}){const selected=options.context?mergeResearchContext(ref.current,options.context):ref.current;const result=continueResearchPathContext(selected,options);if(result.ok)commit(result.context);return result;},
        }),[]);
        return React.createElement(Ctx.Provider,{value:{...actions,context}},children);
      }
      export const useResearch=()=>useContext(Ctx)||{};
    `],
  ]);
  const aliases = new Map([
    ["AuthContext.jsx", "virtual:life-journey-auth.jsx"],
    ["ResearchProvider.jsx", "virtual:life-journey-research.jsx"],
    ["supabase.js", "virtual:life-journey-supabase.js"],
    ["tracking.js", "virtual:life-journey-tracking.js"],
    ["personalDateResearch.js", "virtual:life-journey-personal-date.js"],
    ["researchPlanV2.js", "virtual:life-journey-plan.js"],
    ["hints.js", "virtual:life-journey-hints.js"],
  ]);
  return {
    name: "life-journey-person-context-browser-fixture",
    enforce: "pre",
    resolveId(source) {
      if (modules.has(source)) return `\0${source}`;
      for (const [suffix, id] of aliases) if (source.endsWith(suffix)) return `\0${id}`;
      return null;
    },
    load(id) { return modules.get(id.replace(/^\0/, "")) ?? null; },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith("/2029/journey")) return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        const html = "<!doctype html><html lang=\"he\" dir=\"rtl\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>*{box-sizing:border-box}body{margin:0}</style><div id=\"root\"></div><script type=\"module\" src=\"/test/fixtures/life-journey-person-context-browser-entry.jsx\"></script></html>";
        response.end(await server.transformIndexHtml(request.url, html));
      });
    },
  };
}

test("Life Journey keeps Person and explicit family selection through Name and Date across mobile/desktop themes", { skip: !available, timeout: 90_000 }, async () => {
  const server = await vite.createServer({
    root,
    configFile: false,
    plugins: [lifeJourneyFixturePlugin(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 },
  });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const browserErrors = [];
    const requestUrls = [];
    page.on("pageerror", error => browserErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) browserErrors.push(message.text()); });
    page.on("request", request => requestUrls.push(request.url()));

    await page.goto(`${origin}/2029/journey`);
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    await page.getByLabel("שם פרטי").fill("הורה בדיקה");
    await page.getByLabel("שם משפחה").fill("משפחה");
    await page.getByLabel("תאריך לידה").first().fill("1990-02-15");
    await page.getByRole("button", { name: "פתח את מסע החיים" }).click();
    await page.getByRole("button", { name: "עדכן וחבר מחדש" }).waitFor();

    const family = page.locator('[data-experience-capability="life-journey-family"]');
    await family.getByLabel("שם בן/בת משפחה").fill("ילד בדיקה");
    await family.getByLabel("תאריך לידה").fill("2020-03-04");
    await family.getByLabel("הקשר אליי").selectOption("child_of_me");
    await family.getByRole("button", { name: "הוסף למסע" }).click();
    await family.locator("article strong", { hasText: "ילד בדיקה" }).waitFor();
    await family.getByRole("heading", { name: "אותו אדם, גם כשנפתח חשבון נפרד" }).waitFor();
    assert.ok(await family.getByText("זהות משפחתית · חשבון עתידי אפשרי").count() >= 1);
    assert.ok(await family.getByText(/מקור: הוזן במסע הזה/).count() >= 2);
    assert.equal(await family.getByRole("button", { name: /הזמנה|Claim|תביעת/ }).count(), 0, "identity continuity is explanatory until the explicit claim UI slice");

    const familyScope = family.getByRole("group", { name: "מי משתתף במחקר המשפחתי?" });
    const childSelection = familyScope.getByRole("checkbox", { name: /ילד בדיקה/ });
    assert.equal(await childSelection.isChecked(), false);
    await childSelection.check();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneySelectedMemberRefs?.length), 2);
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0, "family selection never starts ELS");

    const firstRef = await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneyPersonRef);
    assert.match(firstRef, /^person:11111111-1111-4111-8111-111111111111:self$/);
    await page.reload();
    await page.getByRole("button", { name: "עדכן וחבר מחדש" }).waitFor();
    assert.equal(await page.getByLabel("שם פרטי").inputValue(), "הורה בדיקה");
    assert.equal(await page.getByLabel("שם משפחה").inputValue(), "משפחה");
    assert.equal(await page.getByLabel("תאריך לידה").first().inputValue(), "1990-02-15");
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneyPersonRef), firstRef);
    assert.equal(await childSelection.isChecked(), true, "family selection survives refresh through Research Context");
    await familyScope.getByRole("button", { name: "נקה בחירה" }).click();
    assert.deepEqual(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneySelectedMemberRefs), []);
    await familyScope.getByRole("button", { name: "בחר את כולם" }).click();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneySelectedMemberRefs?.length), 2);
    assert.equal(await childSelection.isChecked(), true);
    const birthTimeline = family.locator('[data-experience-capability="life-journey-birth-timeline"]');
    await birthTimeline.getByRole("heading", { name: "ציר אירועי היסוד" }).waitFor();
    assert.deepEqual(await birthTimeline.locator("time").allTextContents(), ["15.02.1990", "04.03.2020"]);
    assert.deepEqual(await birthTimeline.locator("li strong").allTextContents(), ["הורה בדיקה משפחה", "ילד בדיקה"]);
    assert.equal(await birthTimeline.getByText("י״א בתשרי").count(), 2);
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0, "select-all remains navigation context only");
    assert.equal(await page.evaluate(() => window.__nameCalls.some(call => call.kind === "protocol" && call.name === "ילד בדיקה")), false, "family names are not researched by selection");
    assert.equal(await page.evaluate(() => window.__dateCalls.some(call => call.name === "ילד")), false, "family dates are not researched by selection");
    await family.getByRole("button", { name: "חקור 2 אנשים יחד" }).click();
    await family.getByRole("heading", { name: "מפת המחקר המשפחתית" }).waitFor();
    await family.locator(".person-journey-family-shared", { hasText: "2 אנשים" }).waitFor();
    assert.equal(await page.evaluate(() => window.__nameCalls.some(call => call.kind === "protocol" && call.name === "ילד בדיקה")), true, "explicit family research includes the selected child");
    assert.equal(await page.evaluate(() => window.__dateCalls.some(call => call.name === "ילד")), true, "explicit family research includes the selected date");
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0, "explicit family research still excludes ELS");

    for (const theme of ["light", "parchment", "dark"]) {
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(value => window.__setLifeJourneyTheme(value), theme);
        await page.waitForFunction(value => document.querySelector("[data-fixture-theme]")?.dataset.fixtureTheme === value, theme);
        const layout = await page.evaluate(() => ({
          viewport: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          panel: getComputedStyle(document.querySelector(".person-journey-panel")).backgroundColor,
          ink: getComputedStyle(document.querySelector(".person-journey")).color,
        }));
        assert.ok(layout.scrollWidth <= layout.viewport + 1, `${theme} ${width}px must not overflow`);
        assert.notEqual(layout.panel, "rgba(0, 0, 0, 0)");
        assert.notEqual(layout.ink, "rgba(0, 0, 0, 0)");
      }
    }

    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByRole("button", { name: "פתח מסע שם" }).click();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    assert.equal(new URL(page.url()).search, "");
    await page.reload();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await page.getByRole("button", { name: "המשך לשם ותאריך" }).click();
    await page.getByRole("heading", { name: "שם ותאריך" }).waitFor();
    await page.getByText("י״א בתשרי").waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneyView), "date");
    assert.equal(new URL(page.url()).search, "");
    await page.getByRole("button", { name: "סיים וחזור למרכז המשפחתי" }).click();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.subject?.id), firstRef);
    assert.equal(await childSelection.isChecked(), true, "exact return preserves the family selection");

    const childCard = family.locator("article", { hasText: "ילד בדיקה" });
    assert.equal(await page.evaluate(() => window.__nameCalls.some(call => call.kind === "protocol" && call.name === "ילד בדיקה")), false, "refresh preserves selection but never replays family research automatically");
    const elsCallsBefore = await page.evaluate(() => window.__elsCalls.length);
    await childCard.getByRole("button", { name: "שם ותאריך", exact: true }).click();
    await page.getByRole("heading", { name: "שם ותאריך" }).waitFor();
    await page.getByText("י״א בתשרי").waitFor();
    assert.equal(await page.evaluate(() => window.__elsCalls.length), elsCallsBefore, "date research does not scan ELS");
    assert.equal(await page.getByText("תוכנית ELS אוטומטית").count(), 0, "ELS is parked outside the active Life Journey path");
    assert.equal(new URL(page.url()).search, "");
    await page.getByRole("button", { name: "סיים וחזור למרכז המשפחתי" }).click();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.subject?.id), firstRef);
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0);

    const privacy = await page.evaluate(() => ({
      telemetry: window.__telemetry,
      ledger: JSON.parse(localStorage.getItem("life-journey-ledger-fixture")),
      hintReads: window.__hintReads,
    }));
    assert.equal(JSON.stringify(privacy.telemetry).includes("הורה בדיקה"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("ילד בדיקה"), false);
    assert.equal(privacy.ledger.members.length, 2);
    assert.equal(privacy.ledger.relations.length, 1);
    assert.ok(privacy.hintReads.every(call => call.options?.fallbackLocal === false));
    assert.equal(requestUrls.some(url => decodeURIComponent(url).includes("הורה בדיקה") || decodeURIComponent(url).includes("ילד בדיקה")), false);
    assert.deepEqual(browserErrors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
