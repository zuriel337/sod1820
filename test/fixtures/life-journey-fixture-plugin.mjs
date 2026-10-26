export function createLifeJourneyFixturePlugin() {
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
      export async function getMyHints(user,options){window.__hintReads.push({user,options});if(localStorage.getItem("life-journey-deny-hints-fixture")==="1")throw new Error("denied");return user?.id==="fixture-owner"?[
        {id:"hint-1",hint_type:"idea",number:73,title:"רמז קיים",source_url:"https://example.test/source",occurred_at:"2024-02-29",created_at:"2035-11-03",note:"תוכן רמז פרטי"},
        {id:"hint-2",hint_type:"idea",title:"רמז ללא מועד",created_at:"2035-11-03"},
        {id:"hint-3",hint_type:"idea",title:"רמז עם שעה",occurred_at:"2024-02-29T21:30:00+02:00"},
      ]:[];}
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
        if(name==="fn_research_path_append_v1"||name==="fn_research_path_resume_v1"){
          window.__pathCalls=window.__pathCalls||[];window.__pathCalls.push({name,args});
          const key="life-journey-path-backend-fixture:"+account();
          if(name==="fn_research_path_resume_v1")return {data:JSON.parse(localStorage.getItem(key)||"null")||{ok:false,error:"not_found"},error:null};
          if(window.__nextPathResponse==="failure"){window.__nextPathResponse=null;return {error:{message:"preview_read_only"}};}
          if(window.__nextPathResponse==="incomplete"){window.__nextPathResponse=null;return {data:{ok:true},error:null};}
          const previous=JSON.parse(localStorage.getItem(key)||"null");
          const snapshot={ok:true,path_id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",revision_id:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",revision_no:(previous?.revision_no||0)+1,access_scope:"private",representation:args.p_representation,steps:[...(previous?.steps||[]),...args.p_steps]};
          localStorage.setItem(key,JSON.stringify(snapshot));return {data:snapshot,error:null};
        }
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
      import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from "react";
      import {mergeResearchContext,normalizeResearchContext} from "/src/lib/research/researchContext.js";
      import {continueResearchPathContext,saveResearchPathSnapshot,getLatestResearchPath,contextFromResearchPathSnapshot,resumeHrefFromResearchPath} from "/src/lib/research/researchPathRuntime.js";
      const account=()=>localStorage.getItem("life-journey-account-fixture")==="claimant"?"claimant":"owner";
      const contextKey=()=>"life-journey-context-fixture:"+account();const Ctx=createContext(null);
      const initial=()=>{try{return normalizeResearchContext(JSON.parse(sessionStorage.getItem(contextKey())||"null"));}catch{return null;}};
      export default function Provider({children}){const [context,setContextState]=useState(initial);const ref=useRef(context);
        const [pathResume,setPathResume]=useState({loading:false,latest:null,error:null});
        useEffect(()=>{getLatestResearchPath().then(latest=>setPathResume({loading:false,latest:latest?.ok?latest:null,error:null}));},[]);
        window.__lifeJourneyContext=context;
        const commit=value=>{const next=normalizeResearchContext(value);ref.current=next;if(next)sessionStorage.setItem(contextKey(),JSON.stringify(next));else sessionStorage.removeItem(contextKey());window.__lifeJourneyContext=next;setContextState(next);return true;};
        const actions=useMemo(()=>({
          setResearchContext:value=>commit(value),
          updateResearchContext:patch=>commit(mergeResearchContext(ref.current,patch)),
          continueResearchPath(options={}){const selected=options.context?mergeResearchContext(ref.current,options.context):ref.current;const result=continueResearchPathContext(selected,options);if(result.ok)commit(result.context);return result;},
          async saveCurrentResearchPath(options={}){const result=await saveResearchPathSnapshot({context:ref.current,...options,pathId:ref.current?.journey?.id||null});if(result?.ok&&result.representation){commit(contextFromResearchPathSnapshot(result));setPathResume({loading:false,latest:result,error:null});}return result;},
          async resumeResearchPath(pathId){const result=await getLatestResearchPath(pathId);if(!result?.ok)return result;const next=contextFromResearchPathSnapshot(result);commit(next);return {...result,context:next,href:resumeHrefFromResearchPath(result)};},
        }),[]);
        return React.createElement(Ctx.Provider,{value:{...actions,context,pathResume}},children);
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
        const html = "<!doctype html><html lang=\"he\" dir=\"rtl\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>*{box-sizing:border-box}body{margin:0}@font-face{font-family:'Noto Sans Hebrew';src:url('/fonts/NotoSansHebrew-Regular.ttf') format('truetype');font-weight:400}@font-face{font-family:'Noto Sans Hebrew';src:url('/fonts/NotoSansHebrew-Bold.ttf') format('truetype');font-weight:700}@font-face{font-family:'Rubik';src:url('/fonts/Rubik-Hebrew.woff2') format('woff2');font-weight:400 900;unicode-range:U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}@font-face{font-family:'Rubik';src:url('/fonts/Rubik-Latin.woff2') format('woff2');font-weight:400 900;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}</style><div id=\"root\"></div><script type=\"module\" src=\"/test/fixtures/life-journey-person-context-browser-entry.jsx\"></script></html>";
        response.end(await server.transformIndexHtml(request.url, html));
      });
    },
  };
}
