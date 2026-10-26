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
    ["virtual:life-journey-auth.jsx", `
      const account=localStorage.getItem("life-journey-account-fixture")==="claimant"?"claimant":"owner";
      const state={user:{id:account==="claimant"?"fixture-claimant":"fixture-owner"},loading:false};
      export const useAuth=()=>state;
    `],
    ["virtual:life-journey-tracking.js", `window.__telemetry=window.__telemetry||[];export const track=(...args)=>window.__telemetry.push(args);`],
    ["virtual:life-journey-personal-date.js", `
      window.__dateCalls=window.__dateCalls||[];
      export const gregorianToHebrewDateRepresentation=()=>({input_iso:"1990-02-15",hebrew:{pretty:"י״א בתשרי תשפ״ז"}});
      export const createSupabasePersonalDateCrossProvider=()=>async()=>[];
      export const runPersonalDateResearch=async(input)=>{window.__dateCalls.push(input);return {findings:[{id:"finding-date-cross-73",kind:"date_cross",subject:{value:73},source:{sourceRef:null,adapter:"personal-date-representation-v1"}}]};};
    `],
    ["virtual:life-journey-plan.js", `
      export const buildAccessDescriptor=()=>({scope:"private"});
      export const normalizeAccessDescriptor=value=>value||{scope:"private"};
    `],
    ["virtual:life-journey-hints.js", `
      window.__hintReads=window.__hintReads||[];
      export async function getMyHints(user,options){window.__hintReads.push({user,options});return [{id:"hint-1",hint_type:"idea",number:73,title:"רמז קיים",source_url:"https://example.test/source"}];}
    `],
    ["virtual:life-journey-canonical-gematria.js", `
      window.__nameCalls=window.__nameCalls||[];
      export async function fetchCanonicalGematriaFindings(name){
        window.__nameCalls.push({kind:"gematria",name});
        return [
          {id:"finding-gematria-ragil-73",kind:"gematria",subject:{value:73},source:{engine:"gematria",adapter:"gematria-api-v1",method:"ragil"}},
          {id:"finding-gematria-miluy-101",kind:"gematria",subject:{value:101},source:{engine:"gematria",adapter:"gematria-api-v1",method:"miluy"}},
        ];
      }
    `],
    ["virtual:life-journey-supabase.js", `
      const OWNER_PERSON_ID="11111111-1111-4111-8111-111111111111";
      const CLAIMANT_PERSON_ID="22222222-2222-4222-8222-222222222222";
      const account=()=>localStorage.getItem("life-journey-account-fixture")==="claimant"?"claimant":"owner";
      const personId=()=>account()==="claimant"?CLAIMANT_PERSON_ID:OWNER_PERSON_ID;
      const ledgerKey=()=>"life-journey-ledger-fixture:"+account();
      const blank=()=>({members:[],relations:[]});
      const read=()=>{try{return JSON.parse(localStorage.getItem(ledgerKey())||"null")||blank();}catch{return blank();}};
      const write=value=>localStorage.setItem(ledgerKey(),JSON.stringify(value));
      window.__elsCalls=window.__elsCalls||[];window.__nameCalls=window.__nameCalls||[];window.__matrixCalls=window.__matrixCalls||[];window.__sourceCalls=window.__sourceCalls||[];window.__reflectionCalls=window.__reflectionCalls||[];
      export const supabase={functions:{async invoke(name,{body}){
        window.__elsCalls.push({name,body});
        if(body.op==="page")return {data:{result:{contract:"els_search_page_v1",status:"OK",corpus_id:"fixture-torah",corpus_version:"v1",input:{normalized:body.term},selection_protocol:"POST_HOC_EXPLORATORY",hits:[{occurrence_id:"els:fixture-torah:"+body.term+":7:1:120",skip:7,dir:1,start:120,end:150,positions:[120,127,134]}],completion:{executed:true,returned_hits:1,total_hits:1,has_more:false,truncated:false}}}};
        if(body.op==="verify")return {data:{result:{contract:"els_occurrence_replay_v1",status:"OK",verification_state:"MATCH",corpus_id:"fixture-torah",corpus_version:"v1",input:{normalized:body.term},occurrence:{occurrence_id:"els:fixture-torah:"+body.term+":"+body.skip+":"+body.dir+":"+body.start,skip:body.skip,dir:body.dir,start:body.start,positions:[body.start]}}}};
        return {error:{message:"unsupported"}};
      }},from(table){
        const registry=[
          {method_key:"ragil",display_label:"רגיל",sort_order:1,category:"base",mathematical_family:"base_additive",derived_from:[],dependency_rules:[],dependency_version:1},
          {method_key:"miluy",display_label:"מילוי",sort_order:2,category:"base",mathematical_family:"letter_expansion",derived_from:[],dependency_rules:[],dependency_version:1},
          {method_key:"siduri",display_label:"סידורי",sort_order:3,category:"base",mathematical_family:"ordinal",derived_from:[],dependency_rules:[],dependency_version:1},
        ];
        let selectedKeys=null;
        const result=()=>({data:table==="gematria_methods"?(selectedKeys?registry.filter(row=>selectedKeys.includes(row.method_key)):registry):[],error:null});
        const builder={select(){return builder;},eq(){return builder;},order(){return builder;},in(key,values){selectedKeys=values;return Promise.resolve(result());},then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);}};
        return builder;
      },async rpc(name,args){
        if(name==="fn_method_profile"){
          window.__matrixCalls.push({kind:"name-methods",name,args:{has_input:Boolean(args?.p_phrase),phrase:args?.p_phrase}});
          return {data:[{method_key:"ragil",display_label:"רגיל",computed_value:73},{method_key:"miluy",display_label:"מילוי",computed_value:101},{method_key:"siduri",display_label:"סידורי",computed_value:40}],error:null};
        }
        if(name==="fn_all_methods"){
          window.__matrixCalls.push({kind:"methods",name,args:{has_input:Boolean(args?.p_word),word:args?.p_word}});
          return {data:{"רגיל":73,"מילוי":101,"מסתתר":55,"מהמאגר":false},error:null};
        }
        if(name==="fn_relation_candidate"){
          window.__matrixCalls.push({kind:"relation",name,args:{has_a:Boolean(args?.p_a),has_b:Boolean(args?.p_b)}});
          return {data:{status:"candidate",relation_kind:"gematria_convergence",engine_signal:2,confidence:"candidate",research_priority:"review",noise_flags:[],engine_evidence:[{method:"רגיל",value:73}],composite_evidence:[],independent_evidence:{edges:[],topic_cards:[],research_objects:[]},engine_signal_components:{effective_independent_group_count:1,raw_independent_group_count:1,effective_structure_sensitive_group_count:0}},error:null};
        }
        window.__reflectionCalls.push({kind:"tarot",name,args});
        if(name!=="fn_tarot_sos")return {error:{message:"unsupported"}};
        return {data:{framework:"שלושה קלפים להשראה",cards:[
          {position:"המצב",n:1,arcana:"הקוסם",theme:"יוזמה",meaning:"להפוך מחשבה למעשה",letter:"א",orientation:"ישר"},
          {position:"האתגר",n:9,arcana:"הנזיר",theme:"התבוננות",meaning:"לברר לפני תנועה",letter:"י",orientation:"ישר"},
          {position:"העצה",n:17,arcana:"הכוכב",theme:"תקווה",meaning:"לשמור על כיוון בהיר",letter:"צ",orientation:"ישר"}
        ]},error:null};
      }};
      export async function getOrCreateMyPersonId(){return personId();}
      export async function listFamily(){return read();}
      export async function upsertSelfProfile(personId,name,meta){const data=read(),source_ref="person:"+personId+":self";const row={source_ref,name,meta};const index=data.members.findIndex(item=>item.source_ref===source_ref);if(index<0)data.members.push(row);else data.members[index]=row;write(data);return row;}
      export async function upsertFamilyMember(personId,sourceRef,name,meta){const data=read();const ref=sourceRef?"person:"+personId+":p:"+sourceRef:"person:"+personId+":p:fixture-"+(data.members.filter(item=>item.source_ref.includes(":p:")).length+1);const row={source_ref:ref,name,meta};const index=data.members.findIndex(item=>item.source_ref===ref);if(index<0)data.members.push(row);else data.members[index]=row;write(data);return row;}
      export async function upsertFamilyRelation(personId,parent_ref,child_ref,relation_type){const data=read();const row={source_ref:"relation:"+(data.relations.length+1),parent_ref,child_ref,relation_type};data.relations.push(row);write(data);return row;}
      export async function removeFamilyMember(personId,targetRef){const data=read();data.members=data.members.filter(item=>item.source_ref!==targetRef);data.relations=data.relations.filter(item=>item.parent_ref!==targetRef&&item.child_ref!==targetRef);write(data);return {ok:true,target_ref:targetRef};}
      export async function getNameMulti(name,options){window.__nameCalls.push({kind:"multi",name,options});return {input:{components:{values:{full:73,parts:{שם:73}}}},combo:{tracks_with_results:1}};}
      export async function getNameProtocol(name){window.__nameCalls.push({kind:"protocol",name});return {research_id:"fixture-name",input:{normalized:name,value:73},agents:[{output_key:"gematria",ran:true,ok:true,empty:false,ms:1,seq:1}],findings:{gematria:{regular:73}},provenance:{gematria:{fn:"fixture"}},scores:{depth:42},metatron:{headline:"סיכום בדיקה",follow_up:[]}};}
      export async function getNameMultiWithoutEls(name){window.__nameCalls.push({kind:"name_lab",name,options:{skip_els:"1"}});return {name_verse:{verses:[{ref:"תהלים 1:1",text:"אשרי האיש אשר לא הלך בעצת רשעים"}]},consensus:[{type:"מילה",target:"אור",consensus:2,families:["גימטריה","שורש"]}],tracks_with_results:2,tracks:[{id:"name_verse",label:"הפסוק שלך",status:"ok",count:1,evidence:"direct",source_fn:"fn_name_verse"},{id:"combo_gem",label:"גימטריית הצירוף",status:"ok",count:2,evidence:"value_match",source_fn:"fn_verses_by_gematria"},{id:"els",status:"skipped",ran:false,count:0,source_fn:"fn_els_search"}]};}
      export async function getNumberLookup(value){window.__sourceCalls.push({kind:"number_lookup",value});return [{bid_id:"fixture-"+value+"-1",phrase:"אור",method:"רגיל",value,method_governed:true},{bid_id:"fixture-"+value+"-2",phrase:"דרך",method:"מילוי",value,method_governed:true}];}
      export async function getAiAnalysis(args){window.__reflectionCalls.push({kind:"ai",args});return "מסר בדיקה מבוסס ממצאים.";}
    `],
    ["virtual:life-journey-family-claim.js", `
      const OWNER_PERSON_ID="11111111-1111-4111-8111-111111111111";
      const CLAIMANT_PERSON_ID="22222222-2222-4222-8222-222222222222";
      const CLAIMS_KEY="life-journey-family-claims-fixture";
      window.__familyInvitationEmailCalls=window.__familyInvitationEmailCalls||[];
      window.__familyInvitationShareCalls=window.__familyInvitationShareCalls||[];
      const account=()=>localStorage.getItem("life-journey-account-fixture")==="claimant"?"claimant":"owner";
      const personId=()=>account()==="claimant"?CLAIMANT_PERSON_ID:OWNER_PERSON_ID;
      const read=()=>{try{return JSON.parse(localStorage.getItem(CLAIMS_KEY)||"[]");}catch{return [];}};
      const write=rows=>localStorage.setItem(CLAIMS_KEY,JSON.stringify(rows));
      const hash=value=>Array.from(String(value)).reduce((out,char,index)=>((out*33)^char.charCodeAt(0)^index)>>>0,5381).toString(16);
      const safe=row=>({id:row.id,flow:row.flow,status:row.status,target_ref:row.target_ref,created_at:row.created_at,reviewed_at:row.reviewed_at,consumed_at:row.consumed_at,token_expires_at:row.token_expires_at,has_claimant:Boolean(row.claimant_person_id)});
      export async function listMyFamilyClaims(){const prefix="person:"+personId()+":p:";return read().filter(row=>row.target_ref.startsWith(prefix)).sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(safe);}
      export async function createFamilyInvitation(owner,target){
        if(owner!==personId()||!target.startsWith("person:"+owner+":p:"))throw new Error("not authorized");
        const rows=read();if(rows.some(row=>row.target_ref===target&&["pending","approved"].includes(row.status)))throw new Error("family_claims_target_active_uq");
        const token=(crypto.randomUUID()+crypto.randomUUID()).replaceAll("-","");const now=new Date();const expires=new Date(now.getTime()+7*86400000).toISOString();
        const row={id:crypto.randomUUID(),flow:"invitation",status:"pending",target_ref:target,issuer_owner_id:owner,claimant_person_id:null,token_hash:hash(token),token_expires_at:expires,reviewed_at:null,consumed_at:null,created_at:now.toISOString()};
        write([...rows,row]);return {id:row.id,token,target_ref:target,expires_at:expires};
      }
      export async function redeemFamilyInvitation(token){
        const rows=read();const row=rows.find(item=>item.token_hash===hash(token));if(!row)throw new Error("invalid token");
        if(row.status!=="pending")throw new Error("token already used");if(new Date(row.token_expires_at)<=new Date())throw new Error("token has expired");
        if(row.issuer_owner_id===personId())throw new Error("invitation issuer cannot redeem own family invitation");
        row.status="approved";row.claimant_person_id=personId();row.consumed_at=new Date().toISOString();write(rows);return {id:row.id,target_ref:row.target_ref,status:"approved"};
      }
      export async function revokeFamilyClaim(id){const rows=read();const row=rows.find(item=>item.id===id&&item.issuer_owner_id===personId());if(!row||row.status!=="pending")throw new Error("not authorized");row.status="revoked";row.reviewed_at=new Date().toISOString();write(rows);return {id,status:"revoked"};}
      export async function reverseFamilyClaim(id){const rows=read();const row=rows.find(item=>item.id===id);if(!row||row.status!=="approved")throw new Error("only an approved claim can be reversed");row.status="reversed";write(rows);return {id,status:"reversed"};}
      export async function sendFamilyInvitationEmail(input){window.__familyInvitationEmailCalls.push({...input});return {ok:true};}
      export async function shareFamilyInvitationPrivately(token){window.__familyInvitationShareCalls.push(token);return {channel:"native_share"};}
      export function familyClaimErrorMessage(error){const message=String(error?.message||error);if(message.includes("issuer cannot redeem own"))return "אי אפשר לפדות הזמנה שנוצרה מהחשבון שלך. את הקוד פודים מהחשבון הנפרד של בן המשפחה.";if(message.includes("invalid token"))return "קוד ההזמנה אינו תקין.";return "לא ניתן להשלים כרגע את פעולת החיבור. המידע הפרטי לא שונה.";}
    `],
    ["virtual:life-journey-research.jsx", `
      import React,{createContext,useContext,useMemo,useRef,useState} from "react";
      import {mergeResearchContext,normalizeResearchContext} from "/src/lib/research/researchContext.js";
      import {continueResearchPathContext} from "/src/lib/research/researchPathRuntime.js";
      const account=()=>localStorage.getItem("life-journey-account-fixture")==="claimant"?"claimant":"owner";
      const contextKey=()=>"life-journey-context-fixture:"+account();const Ctx=createContext(null);
      const initial=()=>{try{return normalizeResearchContext(JSON.parse(sessionStorage.getItem(contextKey())||"null"));}catch{return null;}};
      export default function Provider({children}){const [context,setContextState]=useState(initial);const ref=useRef(context);
        window.__lifeJourneyContext=context;
        const commit=value=>{const next=normalizeResearchContext(value);ref.current=next;if(next)sessionStorage.setItem(contextKey(),JSON.stringify(next));else sessionStorage.removeItem(contextKey());window.__lifeJourneyContext=next;setContextState(next);return true;};
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
    ["familyClaimAdapter.js", "virtual:life-journey-family-claim.js"],
    ["canonicalGematria.js", "virtual:life-journey-canonical-gematria.js"],
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
        if (!request.url?.startsWith("/2029/journey") && !request.url?.startsWith("/2029/number/")) return next();
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
    const requestBodies = [];
    let invitationToken = "";
    page.on("pageerror", error => browserErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) browserErrors.push(message.text()); });
    page.on("request", request => {
      requestUrls.push(request.url());
      if (request.postData()) requestBodies.push(request.postData());
    });

    await page.goto(`${origin}/2029/journey`);
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    await page.getByLabel("שם פרטי").fill("הורה בדיקה");
    await page.getByLabel("שם משפחה").fill("משפחה");
    await page.getByLabel("תאריך לידה").first().fill("1990-02-15");
    await page.getByLabel("שעת לידה מדויקת").first().fill("05:30");
    await page.getByLabel("מקום לידה").first().fill("עיר בדיקה");
    await page.getByRole("button", { name: "פתח את מסע החיים" }).click();
    await page.getByRole("button", { name: "עדכן וחבר מחדש" }).waitFor();
    assert.equal(await page.evaluate(() => window.__matrixCalls.length), 0, "saving a Person does not start research automatically");
    await page.getByRole("button", { name: "פתח את המחקר שלי" }).first().click();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await page.getByText("מסר מנורמל · מבוסס תוצאות מנוע", { exact: true }).waitFor();
    assert.equal(await page.locator(".person-journey-expression-matrix article").count(), 3);
    assert.equal(await page.evaluate(() => window.__matrixCalls.filter(call => call.kind === "name-methods").length), 3);
    assert.equal(await page.evaluate(() => window.__matrixCalls.filter(call => call.kind === "relation").length), 3);
    await page.getByRole("button", { name: "המשך למטריצת השם והתאריך" }).click();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.getByRole("heading", { name: "מה המטריצה מראה עכשיו" }).waitFor();
    assert.equal(await page.locator(".person-journey-expression-matrix article").count(), 8);
    assert.equal(await page.evaluate(() => window.__matrixCalls.filter(call => call.kind === "methods").length), 8);
    assert.equal(await page.evaluate(() => window.__matrixCalls.filter(call => call.kind === "relation").length), 31);
    assert.equal(await page.getByText("רשימות הגימטריה המלאות", { exact: true }).count(), 1);
    assert.equal(await page.locator(".person-journey-reflection-cards").count(), 0, "no cards are mounted in Life Journey");
    await page.getByRole("button", { name: "סיים וחזור למסע החיים" }).click();
    await page.getByRole("button", { name: "עדכן וחבר מחדש" }).waitFor();

    const family = page.locator('[data-experience-capability="life-journey-family"]');
    await family.getByLabel("שם בן/בת משפחה").fill("ילד בדיקה");
    await family.getByLabel("תאריך לידה").fill("2020-03-04");
    await family.getByLabel("שעת לידה מדויקת").fill("14:20");
    await family.getByLabel("מקום לידה", { exact: true }).fill("יישוב בדיקה");
    await family.getByLabel("הקשר אליי").selectOption("child_of_me");
    await family.getByRole("button", { name: "הוסף למסע" }).click();
    await family.locator(".person-journey-family-member strong", { hasText: "ילד בדיקה" }).waitFor();
    const childMemberCard = family.locator(".person-journey-family-member", { hasText: "ילד בדיקה" });
    await childMemberCard.getByRole("button", { name: "עריכה" }).click();
    assert.equal(await family.getByLabel("שם בן/בת משפחה").inputValue(), "ילד בדיקה");
    await family.getByLabel("שעת לידה מדויקת").fill("14:45");
    await family.getByLabel("מקום לידה", { exact: true }).fill("יישוב מעודכן");
    await family.getByRole("button", { name: "שמור שינויים" }).click();
    await childMemberCard.getByText("מקום לידה · יישוב מעודכן").waitFor();

    await family.getByLabel("שם בן/בת משפחה").fill("רשומה למחיקה");
    await family.getByRole("button", { name: "הוסף למסע" }).click();
    const disposableCard = family.locator(".person-journey-family-member", { hasText: "רשומה למחיקה" });
    await disposableCard.waitFor();
    page.once("dialog", dialog => dialog.accept());
    await disposableCard.getByRole("button", { name: "מחיקה" }).click();
    await disposableCard.waitFor({ state: "detached" });
    await family.getByText("חיבור חשבונות והזמנות", { exact: true }).click();
    await family.getByRole("heading", { name: "אותו אדם, גם כשנפתח חשבון נפרד" }).waitFor();
    assert.ok(await family.getByText("זהות משפחתית · חשבון עתידי אפשרי").count() >= 1);
    assert.equal(await family.getByText(/מקור הפרטים: הוזן בחשבון שלך/).count(), 1);
    assert.ok(await family.getByText(/מקור הפרטים: הוזן על ידך במסע החיים/).count() >= 1);
    const accountContinuity = family.locator('[data-experience-capability="life-journey-account-continuity"]');
    const childClaimCard = accountContinuity.locator("article", { hasText: "ילד בדיקה" });
    await childClaimCard.getByRole("button", { name: "צור הזמנה לחיבור חשבון" }).waitFor();
    await childClaimCard.getByRole("button", { name: "צור הזמנה לחיבור חשבון" }).click();
    const tokenCode = childClaimCard.locator("code");
    await tokenCode.waitFor();
    invitationToken = (await tokenCode.textContent())?.trim() || "";
    assert.match(invitationToken, /^[a-f0-9]{64}$/);
    await childClaimCard.getByText("ממתין לחיבור").waitFor();
    assert.equal(await page.evaluate(token => Object.values(localStorage).some(value => String(value).includes(token)), invitationToken), false, "raw invitation token is never persisted in browser storage");
    assert.equal(decodeURIComponent(page.url()).includes(invitationToken), false, "raw invitation token is never placed in the URL");
    assert.equal(await page.evaluate(() => window.__familyInvitationEmailCalls.length), 0, "email is never sent automatically");
    await childClaimCard.getByText("שליחה פרטית", { exact: true }).click();
    await childClaimCard.getByLabel("מייל של מקבל/ת ההזמנה").fill("child@example.test");
    await childClaimCard.getByRole("button", { name: "שלח במייל" }).click();
    await accountContinuity.getByText("ההזמנה נמסרה לספק המייל. כתובת הנמען לא נשמרה במסע החיים.").waitFor();
    const emailDelivery = await page.evaluate(() => window.__familyInvitationEmailCalls[0]);
    assert.equal(emailDelivery.rawToken, invitationToken);
    assert.equal(emailDelivery.recipientEmail, "child@example.test");
    assert.match(emailDelivery.claimId, /^[0-9a-f-]{36}$/);
    assert.equal(await childClaimCard.getByLabel("מייל של מקבל/ת ההזמנה").inputValue(), "");
    await childClaimCard.getByRole("button", { name: "שתף באופן פרטי" }).click();
    await accountContinuity.getByText("חלון השיתוף הפרטי נפתח במכשיר.").waitFor();
    assert.deepEqual(await page.evaluate(() => window.__familyInvitationShareCalls), [invitationToken]);
    assert.equal(await page.evaluate(() => Object.values(localStorage).some(value => String(value).includes("child@example.test"))), false, "recipient email is never persisted");
    assert.equal(decodeURIComponent(page.url()).includes("child@example.test"), false, "recipient email is never placed in the URL");

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
    assert.equal(await page.getByLabel("שעת לידה מדויקת").first().inputValue(), "05:30");
    assert.equal(await page.getByLabel("מקום לידה").first().inputValue(), "עיר בדיקה");
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneyPersonRef), firstRef);
    assert.equal(await childSelection.isChecked(), true, "family selection survives refresh through Research Context");
    await family.getByText("חיבור חשבונות והזמנות", { exact: true }).click();
    await accountContinuity.getByText("קיימת הזמנה ממתינה. הקוד הגולמי אינו נשמר; אם הוא אבד, בטלו וצרו קוד חדש.").waitFor();
    assert.equal(await childClaimCard.locator("code").count(), 0, "raw invitation token disappears after refresh");
    await familyScope.getByRole("button", { name: "נקה בחירה" }).click();
    assert.deepEqual(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneySelectedMemberRefs), []);
    await familyScope.getByRole("button", { name: "בחר את כולם" }).click();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneySelectedMemberRefs?.length), 2);
    assert.equal(await childSelection.isChecked(), true);
    const lifeMaps = family.locator('[data-experience-capability="life-journey-maps"]');
    await lifeMaps.getByRole("heading", { name: "מפות החיים" }).waitFor();
    const guidedFlow = family.locator('[data-experience-capability="life-journey-guided-map-flow"]');
    await guidedFlow.getByRole("heading", { name: "המסלול המודרך" }).waitFor();
    await guidedFlow.getByLabel("4 מתוך 8 תחנות הושלמו").waitFor();
    assert.equal(await guidedFlow.locator('button[aria-current="step"]').innerText().then(text => text.includes("מחקר")), true);
    const callsBeforeGuidedNavigation = await page.evaluate(() => ({
      matrix: window.__matrixCalls.length,
      reflection: window.__reflectionCalls.length,
      names: window.__nameCalls.length,
      dates: window.__dateCalls.length,
      els: window.__elsCalls.length,
    }));
    await guidedFlow.getByRole("button", { name: "המשך ל־מחקר" }).click();
    await lifeMaps.getByText("המטריצה תופיע לאחר הפעלת המחקר המפורש לאנשים שנבחרו.", { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => ({
      matrix: window.__matrixCalls.length,
      reflection: window.__reflectionCalls.length,
      names: window.__nameCalls.length,
      dates: window.__dateCalls.length,
      els: window.__elsCalls.length,
    })), callsBeforeGuidedNavigation, "guided navigation never starts research");
    await lifeMaps.getByRole("tab", { name: "מפת־על" }).click();
    await lifeMaps.getByRole("tab", { name: "ציר זמן" }).click();
    const birthTimeline = family.locator('[data-experience-capability="life-journey-birth-timeline"]');
    await birthTimeline.getByRole("heading", { name: "ציר אירועי היסוד" }).waitFor();
    assert.deepEqual(await birthTimeline.locator("time").allTextContents(), ["15.02.1990", "04.03.2020"]);
    assert.deepEqual(await birthTimeline.locator("li strong").allTextContents(), ["הורה בדיקה משפחה", "ילד בדיקה"]);
    assert.equal(await birthTimeline.getByText("י״א בתשרי").count(), 2);
    assert.equal(await birthTimeline.getByText("שעת לידה · 05:30").count(), 1);
    assert.equal(await birthTimeline.getByText("שעת לידה · 14:45").count(), 1);
    assert.equal(await birthTimeline.getByText("מקום לידה · עיר בדיקה").count(), 1);
    assert.equal(await birthTimeline.getByText("מקום לידה · יישוב מעודכן").count(), 1);
    await lifeMaps.getByRole("tab", { name: "שערי זמן" }).click();
    const timeMap = family.locator('[data-experience-capability="life-journey-time-gates-map"]');
    await timeMap.getByRole("heading", { name: "מפת שערי הזמן" }).waitFor();
    await timeMap.getByRole("button", { name: /ילד בדיקה/ }).click();
    await timeMap.getByRole("heading", { name: "י״א בתשרי תשפ״ז" }).waitFor();
    await timeMap.getByText("יום עברי", { exact: true }).waitFor();
    await timeMap.getByRole("tab", { name: "התכנסויות זמן" }).click();
    await timeMap.getByText(/בחירת אנשים לבדה אינה מפעילה חיפוש/).waitFor();
    await timeMap.getByRole("tab", { name: "מרווחי לידה" }).click();
    await timeMap.getByText("ימים בדיוק", { exact: true }).waitFor();
    await lifeMaps.getByRole("tab", { name: "מפת יצירה" }).click();
    const birthStudio = family.locator('[data-experience-capability="life-journey-birth-map-studio"]');
    await birthStudio.getByRole("heading", { name: "סטודיו מפת החיים" }).waitFor();
    const activateThree = birthStudio.getByRole("button", { name: "הפעל תלת־ממד חי" });
    await activateThree.waitFor();
    await activateThree.click();
    await page.waitForTimeout(350);
    assert.ok(
      await birthStudio.locator('[data-experience-capability="life-journey-birth-map-3d"]').count()
        + await birthStudio.locator('[role="status"]').count() >= 1,
      "explicit 3D activation renders WebGL or an accessible capability fallback",
    );
    await birthStudio.getByRole("tab", { name: "משפחה" }).click();
    const spatialLegend = birthStudio.locator(".birth-map-spatial-details");
    await spatialLegend.getByRole("button", { name: /הורה בדיקה משפחה/ }).waitFor();
    await spatialLegend.getByRole("button", { name: /ילד בדיקה/ }).click();
    assert.equal(await spatialLegend.locator('button[data-focused="true"]').count(), 1);
    await birthStudio.getByRole("tab", { name: "התכנסויות" }).click();
    await spatialLegend.getByText(/עדיין אין התכנסות מנורמלת/).waitFor();
    await birthStudio.getByRole("tab", { name: "Human Design" }).click();
    await birthStudio.getByRole("heading", { name: "Human Design" }).waitFor();
    assert.equal(await birthStudio.locator('[data-result="human-design"]').count(), 0, "birth calculations never run on tab open");
    await birthStudio.getByLabel("אזור זמן בלידה").fill("Asia/Jerusalem");
    await birthStudio.getByLabel(/קו רוחב/).fill("31.7683");
    await birthStudio.getByLabel(/קו אורך/).fill("35.2137");
    const birthCalculationRequestIndex = requestUrls.length;
    await birthStudio.getByRole("button", { name: "חשב מפה מקומית" }).click();
    const humanDesignResult = birthStudio.locator('[data-result="human-design"]');
    await humanDesignResult.waitFor();
    await humanDesignResult.getByText("Strategy · Definition", { exact: true }).waitFor();
    await birthStudio.getByText(/natalengine 1\.6\.0/).waitFor();
    await birthStudio.getByRole("tab", { name: "מפת שמיים" }).click();
    const skyResult = birthStudio.locator('[data-result="sky-map"]');
    await skyResult.waitFor();
    assert.equal(await skyResult.locator(".birth-map-sky-wheel article").count(), 12);
    await skyResult.getByText("אופק עולה", { exact: true }).waitFor();
    await skyResult.getByText("היבטים מרכזיים", { exact: true }).waitFor();
    for (const theme of ["light", "parchment", "dark"]) {
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(value => window.__setLifeJourneyTheme(value), theme);
        await page.waitForFunction(value => document.querySelector("[data-fixture-theme]")?.dataset.fixtureTheme === value, theme);
        const birthLayout = await birthStudio.evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
        assert.ok(birthLayout.scrollWidth <= birthLayout.clientWidth + 1, `birth studio ${theme} ${width}px must not overflow`);
        assert.equal(await skyResult.isVisible(), true, `sky result remains visible in ${theme} at ${width}px`);
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    const calculationRequests = requestUrls.slice(birthCalculationRequestIndex).map(url => decodeURIComponent(url)).join("\n");
    const calculationBodies = requestBodies.join("\n");
    for (const privateValue of ["1990-02-15", "05:30", "Asia/Jerusalem", "31.7683", "35.2137", "הורה בדיקה", "עיר בדיקה"]) {
      assert.equal(calculationRequests.includes(privateValue), false, `local calculation keeps ${privateValue} out of request URLs`);
      assert.equal(calculationBodies.includes(privateValue), false, `local calculation keeps ${privateValue} out of request bodies`);
    }
    await birthStudio.getByRole("tab", { name: "ספר יצירה" }).click();
    const creationMap = family.locator('[data-experience-capability="life-journey-sefer-yetzirah-map"]');
    await creationMap.getByRole("heading", { name: "מפת האותיות והמערכות" }).waitFor();
    assert.equal(await creationMap.locator(".person-journey-creation-people>article").count(), 2);
    await creationMap.getByText("7 כוכבים · 7 ימים · 7 שערים", { exact: true }).waitFor();
    await creationMap.getByText("שבתאי", { exact: true }).waitFor();
    await creationMap.getByText("מקום לידה · עיר בדיקה", { exact: true }).waitFor();
    await creationMap.getByText("הקשר בין הקבוצות מאומת במקור; התאמה אישית לא חושבה.", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0, "select-all remains navigation context only");
    assert.equal(await page.evaluate(() => window.__nameCalls.some(call => call.kind === "name_lab" && call.name === "ילד בדיקה")), false, "family names are not researched by selection");
    assert.equal(await page.evaluate(() => window.__dateCalls.some(call => call.name === "ילד")), false, "family dates are not researched by selection");
    assert.equal(await page.evaluate(() => window.__reflectionCalls.length), 0, "the normalized message engine waits for the explicit research action");
    await family.getByRole("button", { name: "צור מחקר ומסר ל־2 אנשים" }).click();
    await family.getByRole("heading", { name: "תוצאות המחקר המשפחתי" }).waitFor();
    await lifeMaps.getByRole("tab", { name: "מטריצה" }).click();
    assert.equal(await lifeMaps.locator("tbody tr").count(), 2, "one matrix row is shown per selected person");
    await lifeMaps.getByRole("tab", { name: "דורות" }).click();
    await lifeMaps.getByText("הורה של", { exact: true }).waitFor();
    await lifeMaps.getByRole("tab", { name: "קשרים" }).click();
    await lifeMaps.getByText(/הורה בדיקה משפחה · הורה של · ילד בדיקה/).waitFor();
    await lifeMaps.getByRole("tab", { name: "התכנסויות" }).click();
    await lifeMaps.getByText("73", { exact: true }).first().waitFor();
    await lifeMaps.getByRole("tab", { name: "עוצמות/פערים" }).click();
    await lifeMaps.getByRole("heading", { name: "ראיה חישובית שנמצאה" }).waitFor();
    await lifeMaps.getByText("קבוצת שיטה עצמאית אחת", { exact: true }).waitFor();
    await lifeMaps.getByRole("tab", { name: "מקורות" }).click();
    await lifeMaps.getByText("תהלים א׳, א׳", { exact: true }).first().waitFor();
    await lifeMaps.getByRole("tab", { name: "כיסוי" }).click();
    assert.equal(await lifeMaps.locator(".person-journey-coverage-map article").count(), 2);
    await lifeMaps.getByText("זוגות עם חיבור", { exact: true }).first().waitFor();
    await lifeMaps.getByRole("tab", { name: "סיכום" }).click();
    await lifeMaps.getByRole("heading", { name: "הסיכום המשפחתי" }).waitFor();
    await lifeMaps.getByText("מסר בדיקה מבוסס ממצאים.", { exact: true }).waitFor();
    await lifeMaps.getByRole("tab", { name: "מפת יצירה" }).click();
    await birthStudio.getByRole("tab", { name: "תלת־ממד" }).click();
    await birthStudio.getByRole("tab", { name: "התכנסויות" }).click();
    await birthStudio.locator(".birth-map-spatial-details.is-convergences article").first().waitFor();
    await birthStudio.locator(".birth-map-spatial-details.is-convergences").getByText("73", { exact: true }).first().waitFor();
    await lifeMaps.getByRole("tab", { name: "שערי זמן" }).click();
    await timeMap.getByRole("tab", { name: "התכנסויות זמן" }).click();
    await timeMap.locator(".life-time-convergences").getByText("73", { exact: true }).first().waitFor();
    await timeMap.getByText(/ביטויי תאריך בלבד/).first().waitFor();
    await lifeMaps.getByRole("tab", { name: "מפת־על" }).click();
    await guidedFlow.getByLabel("8 מתוך 8 תחנות הושלמו").waitFor();
    await guidedFlow.getByText("השרשרת המחקרית מלאה. אפשר לחזור לכל תחנה בלי להפעיל את המנוע מחדש.", { exact: true }).waitFor();
    await guidedFlow.getByText("המסלול הושלם", { exact: true }).waitFor();
    await lifeMaps.getByRole("tab", { name: "מסלול" }).click();
    await lifeMaps.getByText("זהות", { exact: true }).waitFor();
    assert.equal(await lifeMaps.locator(".person-journey-path-map li").count(), 8);
    await family.getByText("פתח פירוט מלא של הממצאים והמקורות", { exact: true }).click();
    assert.equal(await family.locator('.person-journey-relation-list article').count(), 1, "two selected people produce one normalized cross-person pair");
    await family.locator('.person-journey-family-shared[data-kind="cross-expression"]', { hasText: "2 אנשים" }).waitFor();
    await family.locator('.person-journey-family-shared[data-kind="shared-expression"]', { hasText: "לא התכנסות עצמאית" }).waitFor();
    assert.equal(await family.locator(".person-journey-family-member", { hasText: "ילד בדיקה" }).count(), 1, "each person has one canonical row on the main family surface");
    assert.equal(await page.evaluate(() => window.__matrixCalls.some(call => call.kind === "name-methods" && call.args.phrase === "ילד בדיקה")), true, "explicit family research includes the selected child through the canonical method profile");
    assert.equal(await page.evaluate(() => window.__matrixCalls.some(call => call.kind === "name-methods" && call.args.phrase === "י״א")), true, "family matrix converts the Hebrew day into a canonical method profile");
    assert.equal(await page.evaluate(() => window.__matrixCalls.some(call => call.kind === "name-methods" && call.args.phrase === "בתשרי")), true, "family matrix converts the Hebrew month into a canonical method profile");
    assert.equal(await page.evaluate(() => window.__nameCalls.filter(call => call.kind === "name_lab").length), 2, "the explicit family action reads the existing bounded non-ELS name source once per selected person");
    assert.equal(await page.evaluate(() => window.__nameCalls.filter(call => call.kind === "name_lab").every(call => call.options.skip_els === "1")), true, "every name source read carries the non-ELS contract");
    await family.getByRole("heading", { name: "מילים וביטויים סביב המספרים" }).waitFor();
    await family.getByText("פסוק לשם", { exact: true }).first().waitFor();
    await family.getByText("תהלים א׳, א׳", { exact: true }).first().waitFor();
    assert.equal(await page.evaluate(() => window.__sourceCalls.length > 0), true, "canonical number lookup supplies equal-value phrases");
    assert.equal(await page.evaluate(() => window.__dateCalls.some(call => call.name === "ילד")), true, "explicit family research includes the selected date");
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0, "explicit family research still excludes ELS");
    const normalizedFamilyAnalysis = family.locator('[data-experience-capability="life-journey-family-normalized-analysis"]');
    await normalizedFamilyAnalysis.getByRole("heading", { name: "המסר המשפחתי" }).waitFor();
    await normalizedFamilyAnalysis.getByText("מסר בדיקה מבוסס ממצאים.", { exact: true }).waitFor();
    const familyAnalysisCalls = await page.evaluate(() => window.__reflectionCalls);
    assert.deepEqual(familyAnalysisCalls.map(call => call.kind), ["ai", "tarot"]);
    assert.equal(familyAnalysisCalls[0].args.persistAnalysis, false, "private family analysis is never copied to AI style telemetry");
    assert.equal(familyAnalysisCalls[0].args.surface, "research:life-journey-family-analysis");
    assert.equal(familyAnalysisCalls[0].args.facts.includes("ילד בדיקה"), false, "family names are removed before interpretation");
    assert.equal(familyAnalysisCalls[0].args.facts.includes("person:"), false, "person refs are removed before interpretation");
    assert.match(familyAnalysisCalls[0].args.facts, /ביטויי שם ותאריך שנבדקו: 16/);
    assert.deepEqual(familyAnalysisCalls[1].args, { p_cards: 3 });
    assert.equal(await normalizedFamilyAnalysis.locator(".person-journey-reflection-cards").count(), 0, "internal cards are not rendered");
    assert.equal(await normalizedFamilyAnalysis.getByText("הקוסם", { exact: true }).count(), 0, "card identities remain internal");
    await page.reload();
    await family.getByRole("heading", { name: "תוצאות המחקר המשפחתי" }).waitFor();
    await normalizedFamilyAnalysis.getByRole("heading", { name: "המסר המשפחתי" }).waitFor();
    assert.deepEqual(await page.evaluate(() => ({
      matrix: window.__matrixCalls.length,
      reflection: window.__reflectionCalls.length,
      sources: window.__sourceCalls.length,
      names: window.__nameCalls.length,
      els: window.__elsCalls.length,
    })), { matrix: 0, reflection: 0, sources: 0, names: 0, els: 0 }, "refresh restores the private family snapshot without automatically researching names, sources or ELS again");
    await family.getByText("פתח פירוט מלא של הממצאים והמקורות", { exact: true }).click();
    await family.getByRole("button", { name: "פתח את ממצא 73 של ילד בדיקה" }).click();
    await page.getByRole("heading", { name: "דף המספר 73" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/2029/number/73");
    assert.equal(decodeURIComponent(page.url()).includes("ילד בדיקה"), false, "private family name never enters the Finding URL");
    const findingContext = await page.evaluate(() => window.__lifeJourneyContext);
    assert.match(findingContext.selection.findingId, /^life-journey-finding:[a-z0-9]+$/);
    assert.equal(findingContext.selection.focusKind, "life_journey_date_cross");
    assert.equal(findingContext.returnTo.subject.id, firstRef);
    assert.equal(findingContext.dimensions.journey2029Kind, "person_life");
    assert.equal(findingContext.journey.pendingSteps.at(-1).selection.findingId, findingContext.selection.findingId);
    await page.getByRole("button", { name: "חזרה מדויקת למסע החיים" }).click();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/2029/journey");
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.subject?.id), firstRef);
    assert.equal(await childSelection.isChecked(), true, "Finding exact return preserves the selected family scope");

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
    await page.getByRole("button", { name: "פתח את המחקר שלי" }).first().click();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await page.getByRole("button", { name: "המשך למטריצת השם והתאריך" }).click();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.getByRole("heading", { name: "מה המטריצה מראה עכשיו" }).waitFor();
    assert.equal(new URL(page.url()).search, "");
    assert.equal(await page.locator('[data-experience-capability="life-journey-normalized-message-reflection"]').count(), 0);
    assert.equal(await page.evaluate(() => window.__reflectionCalls.length), 0, "name and date views do not replay the restored family analysis");
    const matrixCallsBeforeThemes = await page.evaluate(() => window.__matrixCalls.length);
    for (const theme of ["light", "parchment", "dark"]) {
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(value => window.__setLifeJourneyTheme(value), theme);
        await page.waitForFunction(value => document.querySelector("[data-fixture-theme]")?.dataset.fixtureTheme === value, theme);
        const matrixLayout = await page.evaluate(() => {
          const surface = document.querySelector('[data-experience-capability="life-journey-name-date-matrix"]');
          const message = surface?.querySelector(".person-journey-research-message");
          return {
            viewport: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            surfaceWidth: surface?.getBoundingClientRect().width || 0,
            messageWidth: message?.getBoundingClientRect().width || 0,
            message: message?.textContent || "",
          };
        });
        assert.ok(matrixLayout.scrollWidth <= matrixLayout.viewport + 1, `matrix ${theme} ${width}px must not overflow`);
        assert.ok(matrixLayout.surfaceWidth > 0 && matrixLayout.messageWidth > 0, `matrix ${theme} ${width}px stays visible`);
        assert.match(matrixLayout.message, /החיבור הבולט כרגע/);
      }
    }
    assert.equal(await page.evaluate(() => window.__matrixCalls.length), matrixCallsBeforeThemes, "theme and viewport changes never rerun research");
    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByText("רשימות הגימטריה המלאות", { exact: true }).click();
    await page.getByRole("button", { name: "פתח רגיל 73 עבור שם פרטי" }).click();
    await page.getByRole("heading", { name: "דף המספר 73" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/2029/number/73");
    assert.equal(decodeURIComponent(page.url()).includes("הורה בדיקה"), false);
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.selection?.focusKind), "life_journey_gematria");
    assert.match(await page.evaluate(() => window.__lifeJourneyContext?.selection?.findingId), /^life-journey-finding:[a-z0-9]+$/);
    await page.getByRole("button", { name: "חזרה מדויקת למסע החיים" }).click();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    await page.getByRole("button", { name: "פתח את המחקר שלי" }).first().click();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await page.getByRole("button", { name: "המשך למטריצת השם והתאריך" }).click();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.getByRole("heading", { name: "מה המטריצה מראה עכשיו" }).waitFor();
    await page.locator(".person-journey-capability-summary").getByText("י״א בתשרי תשפ״ז", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneyView), "date");
    assert.equal(new URL(page.url()).search, "");
    await page.getByRole("button", { name: "סיים וחזור למסע החיים" }).click();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.subject?.id), firstRef);
    assert.equal(await childSelection.isChecked(), true, "exact return preserves the family selection");

    const childCard = family.locator(".person-journey-family-member", { hasText: "ילד בדיקה" });
    assert.equal(await page.evaluate(() => window.__nameCalls.some(call => call.kind === "name_lab" && call.name === "ילד בדיקה")), false, "refresh preserves selection but never replays family research automatically");
    const elsCallsBefore = await page.evaluate(() => window.__elsCalls.length);
    await childCard.getByRole("button", { name: "פתח מחקר שם", exact: true }).click();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await page.getByRole("button", { name: "המשך למטריצת השם והתאריך" }).click();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.getByRole("heading", { name: "מה המטריצה מראה עכשיו" }).waitFor();
    await page.locator(".person-journey-capability-summary").getByText("י״א בתשרי תשפ״ז", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__elsCalls.length), elsCallsBefore, "date research does not scan ELS");
    assert.equal(await page.getByText("תוכנית ELS אוטומטית").count(), 0, "ELS is parked outside the active Life Journey path");
    assert.equal(new URL(page.url()).search, "");
    await page.getByText("רשימות הגימטריה המלאות", { exact: true }).click();
    await page.getByRole("button", { name: "פתח רגיל 73 עבור שם פרטי" }).click();
    await page.getByRole("heading", { name: "דף המספר 73" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/2029/number/73");
    assert.match(await page.evaluate(() => window.__lifeJourneyContext?.selection?.findingId), /^life-journey-finding:[a-z0-9]+$/);
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.returnTo?.subject?.id), firstRef);
    await page.getByRole("button", { name: "חזרה מדויקת למסע החיים" }).click();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.subject?.id), firstRef);
    assert.equal(await childSelection.isChecked(), true, "child Finding exact return preserves the family selection");
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0);

    await family.getByText("חיבור חשבונות והזמנות", { exact: true }).click();
    const ownerClaimInput = accountContinuity.getByLabel("קוד הזמנה");
    await ownerClaimInput.fill(invitationToken);
    await accountContinuity.getByRole("button", { name: "אמת וחבר את הזהות" }).click();
    await accountContinuity.getByText(/אי אפשר לפדות הזמנה שנוצרה מהחשבון שלך/).waitFor();
    await childClaimCard.getByText("ממתין לחיבור").waitFor();

    await page.evaluate(() => localStorage.setItem("life-journey-account-fixture", "claimant"));
    await page.reload();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    await page.getByText("חיבור חשבונות והזמנות", { exact: true }).click();
    const claimantContinuity = page.locator('[data-experience-capability="life-journey-account-continuity"]');
    await claimantContinuity.getByLabel("קוד הזמנה").fill(invitationToken);
    await claimantContinuity.getByRole("button", { name: "אמת וחבר את הזהות" }).click();
    await claimantContinuity.getByText("הזהות אומתה. לא הועבר מחקר פרטי ולא ניתנה גישה ל־Ledger של חשבון אחר.").waitFor();
    assert.equal(new URL(page.url()).search, "");
    assert.equal(await page.evaluate(token => Object.values(localStorage).some(value => String(value).includes(token)), invitationToken), false, "claimant storage never receives the raw invitation token");

    await page.evaluate(() => localStorage.setItem("life-journey-account-fixture", "owner"));
    await page.reload();
    await page.getByRole("button", { name: "עדכן וחבר מחדש" }).waitFor();
    await page.getByText("חיבור חשבונות והזמנות", { exact: true }).click();
    const ownerContinuity = page.locator('[data-experience-capability="life-journey-account-continuity"]');
    await ownerContinuity.locator("article", { hasText: "ילד בדיקה" }).getByText("זהות אומתה").waitFor();
    await ownerContinuity.locator("article", { hasText: "ילד בדיקה" }).getByRole("button", { name: "נתק אימות חשבון" }).waitFor();
    await page.locator(".person-journey-family-member", { hasText: "ילד בדיקה" }).getByText(/זהות החשבון אומתה/).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.subject?.id), firstRef, "account-scoped Research Context returns only for the owner account");

    const privacy = await page.evaluate(() => ({
      telemetry: window.__telemetry,
      ledger: JSON.parse(localStorage.getItem("life-journey-ledger-fixture:owner")),
      hintReads: window.__hintReads,
      storageValues: Object.values(localStorage),
      context: window.__lifeJourneyContext,
      contextStorage: Object.entries(sessionStorage).filter(([key]) => key.startsWith("life-journey-context-fixture:")),
    }));
    assert.equal(JSON.stringify(privacy.telemetry).includes("הורה בדיקה"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("ילד בדיקה"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("עיר בדיקה"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("יישוב בדיקה"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("יישוב מעודכן"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("05:30"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("14:45"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("child@example.test"), false);
    assert.equal(privacy.ledger.members.length, 2);
    assert.equal(privacy.ledger.relations.length, 1);
    assert.equal(privacy.ledger.members.find(member => member.source_ref.endsWith(":self"))?.meta?.birth_place, "עיר בדיקה");
    assert.equal(privacy.ledger.members.find(member => member.source_ref.endsWith(":self"))?.meta?.birth_time_local, "05:30");
    assert.equal(privacy.ledger.members.find(member => member.source_ref.endsWith(":self"))?.meta?.profile_source, "account_owner_entered");
    assert.equal(privacy.ledger.members.find(member => member.source_ref.includes(":p:"))?.meta?.birth_place, "יישוב מעודכן");
    assert.equal(privacy.ledger.members.find(member => member.source_ref.includes(":p:"))?.meta?.birth_time_local, "14:45");
    assert.equal(privacy.ledger.members.find(member => member.source_ref.includes(":p:"))?.meta?.profile_source, "journey_owner_entered");
    assert.ok(privacy.hintReads.every(call => call.options?.fallbackLocal === false));
    assert.equal(privacy.storageValues.some(value => String(value).includes(invitationToken)), false);
    for (const privateValue of ["הורה בדיקה", "ילד בדיקה", "1990-02-15", "2020-03-04", "05:30", "14:45", "עיר בדיקה", "יישוב בדיקה", "יישוב מעודכן"]) {
      assert.equal(JSON.stringify(privacy.context).includes(privateValue), false, `Research Context excludes ${privateValue}`);
      assert.equal(JSON.stringify(privacy.contextStorage).includes(privateValue), false, `stored Research Context excludes ${privateValue}`);
    }
    assert.equal(requestUrls.some(url => decodeURIComponent(url).includes("הורה בדיקה") || decodeURIComponent(url).includes("ילד בדיקה")), false);
    assert.equal(requestUrls.some(url => decodeURIComponent(url).includes("עיר בדיקה") || decodeURIComponent(url).includes("יישוב בדיקה")), false);
    assert.equal(requestUrls.some(url => /1990-02-15|2020-03-04|05%3A30|14%3A45/.test(url)), false);
    assert.equal(requestUrls.some(url => /Asia%2FJerusalem|31\.7683|35\.2137/.test(url)), false);
    assert.equal(requestBodies.some(body => /1990-02-15|05:30|Asia\/Jerusalem|31\.7683|35\.2137/.test(body)), false);
    assert.equal(requestUrls.some(url => decodeURIComponent(url).includes(invitationToken)), false);
    assert.deepEqual(browserErrors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
