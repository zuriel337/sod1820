// Isolated Preview test data, never a runtime transport/engine/registry owner.
// Generate executable suggestions with the real server registry, not a second
// implementation. No network, API keys, real accounts or model calls exist here.
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";

export function buildRazielSafeActionsPreviewFixture() {
  const source = readFileSync(new URL("../../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");
  const start = source.indexOf("function razielSafeSuggestedPaths(");
  const end = source.indexOf("const svcHeaders", start);
  if (start < 0 || end < start) throw new Error("canonical_suggestion_registry_not_found");
  const registry = runInNewContext(stripTypeScriptTypes(source.slice(start, end)) + "\nrazielSafeSuggestedPaths;", {}, { timeout: 1000 });
  const expression = "משיח";
  const navigation = [{ href: "/2029/number/358" }];
  const response = (kind) => ({
    deterministic: true,
    intelligence_level: "fast",
    model: "preview:mock-only",
    raziel: {
      v: 1,
      agent: "raziel",
      answer: kind === "expression"
        ? "תשובת דמה לבדיקת הממשק בלבד. כאן אפשר לבדוק את המשך השיחה על משיח ואת הפתיחה של דף 358. אין כאן תשובת מודל או ממצא חדש."
        : kind === "methods"
          ? "תשובת דמה לבדיקת הממשק בלבד. הבקשה לבדוק בכל השיטות ממשיכה דרך אותו session. בפריוויו הזה לא הופעל מנוע מחקר ולא התבצעה קריאת מודל."
          : "תשובת דמה לבדיקת הממשק בלבד. אפשר לשמור את השיחה בלחיצה מפורשת. לא נשמר דבר לפני הלחיצה; כאורח השמירה מקומית בדפדפן בלבד.",
      facts: [],
      suggested_paths: registry({
        trusted: false,
        expression: kind === "save" ? null : expression,
        navigation: kind === "save" ? [] : navigation,
        canonicalReady: kind !== "save",
        question: kind === "methods" ? "בדוק את משיח בכל השיטות" : "בדיקת ממשק",
      }),
      // A synthetic ready envelope is only a UI contract fixture, not live
      // research evidence. Its source and every visible answer say mock-only.
      ...(kind === "save" ? {} : { plan_meta: { canonical_result_bundle: {
        contract: "public-expression-crossing-run-v1", status: "ready",
        source: "synthetic-preview-fixture", expression, numbers: [358],
      } } }),
    },
  });
  return {
    version: "raziel-safe-actions-preview-v1",
    expression: response("expression"), methods: response("methods"), save: response("save"),
    // Explicit test input only, not a local quota counter or an invented limit.
    quota: { error: "quota", tier: "anon", surface: "raziel", model: "preview:mock-only" },
  };
}

export function buildRazielSafeActionsPreviewWorker(baseWorker) {
  const fixture = buildRazielSafeActionsPreviewFixture();
  const marker = " const safe=";
  if (!baseWorker.includes(marker)) throw new Error("preview_guard_marker_missing");
  const interception = `
 if(req.method==='POST'&&u.origin===authOrigin&&u.pathname==='/functions/v1/ai-analyze'){
  event.respondWith((async()=>{
   try{
    const body=await req.clone().json();
    if(body.persona!=='raziel')throw new Error('unsupported_fixture');
    const subject=String(body.subject||'');
    const key=subject==='בדיקת מכסת אורח'?'quota':/בכל\\s+השיטות/u.test(subject)?'methods':subject.includes('משיח')?'expression':'save';
    const data=JSON.parse(JSON.stringify(razielPreviewFixture[key]));
    if(data.raziel&&['landscape','exploratory'].includes(body.view_mode)&&key!=='save')data.raziel.view_mode={requested:body.view_mode,applied:true,reason:'synthetic-preview-fixture'};
    return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Raziel-Preview-Transport':'mock-only'}});
   }catch{
    return new Response(JSON.stringify({error:'preview_fixture_unavailable'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}});
   }
  })());return;
 }
 // Even "get or create" identity access stays blocked in this no-write demo.
 if(u.origin===authOrigin&&req.method==='POST'&&rpc===existingPersonAccess){
  event.respondWith(new Response(JSON.stringify({error:'preview_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}}));return;
 }
`;
  return "const razielPreviewFixture=" + JSON.stringify(fixture) + ";\n" + baseWorker.replace(marker, interception + marker);
}
