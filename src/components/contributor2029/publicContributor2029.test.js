import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPublicContributorView, approvedReturnHref, isExactlyAttributed, readContributorLocation, safePublicUrl, selectContributorItems } from "./publicContributor2029Model.js";
import { loadPublicContributor2029 } from "./loadPublicContributor2029.js";
import { contributorNavigation2029 } from "./contributorNavigation2029.js";
import { fixtureIdentity as identity, fixtureFinding, fixtureProjection, fixtureView } from "./publicContributor2029Fixtures.js";
import { fetchContributorFindingsProjection } from "../../lib/research/contributorFindingsProjection.js";

const origin = "https://sod1820.co.il";
function fakeClient(tables, calls) {
  return { from(table) {
    const entry = { table, filters: [] }; calls.push(entry);
    let filters = [];
    const b = {
      select: (fields) => { entry.fields = fields; return b; },
      eq: (key, value) => { entry.filters.push([key,value]); filters.push((row) => String(row[key]) === String(value)); return b; },
      in: (key, values) => { filters.push((row) => values.includes(row[key])); return b; },
      or: () => b, like: () => b,
      is: (key, value) => { filters.push((row) => value === null ? row[key] == null : row[key] === value); return b; },
      order: () => b,
      range: () => Promise.resolve(result()), maybeSingle: () => Promise.resolve(result(true)),
      then: (resolve, reject) => Promise.resolve(result()).then(resolve,reject),
    };
    function result(single = false) {
      if (tables[table]?.error) return tables[table];
      const rows = (tables[table] || (table === "world_contributor_research_v1" ? tables.research_objects : null) || []).filter((row) => filters.every((filter) => filter(row)));
      return { data: single ? rows[0] || null : rows, count: rows.length };
    }
    return b;
  }, rpc() { return Promise.resolve({data:[]}); } };
}

test("loader resolves exact code/slug, reuses canonical reader with PUBLIC_VIEW and only anonymous client", async () => {
  const calls = [];
  const client = fakeClient({ contributors: [identity], research_objects: [fixtureFinding],
    channel_updates: [], research_contributions: [], gematria_words: [] }, calls);
  const readerCalls = [];
  const projectionReader = async (slug, options) => {
    readerCalls.push({slug,options});
    assert.equal(options.mode,"public_view");
    await assert.rejects(options.topicsReader(), /anonymous_topic/);
    return fetchContributorFindingsProjection(slug, { ...options,
      sessionClient: { from() { throw new Error("ADMIN_SESSION_TOUCHED"); } } });
  };
  for (const key of [identity.slug, identity.code]) {
    const view = await loadPublicContributor2029(key, { publicClient: () => client, projectionReader });
    assert.equal(view.canonicalHref,"/community/researcher/2042");
    assert.equal(view.items.length,0);
    assert.equal(readerCalls.at(-1).options.loadProfile,"source_library");
    assert.equal(view.availability.topics,"unavailable");
    assert.equal(readerCalls.at(-1).slug,identity.slug);
  }
  assert.ok(calls.some((c) => c.filters.some(([key,value]) => key === "code" && value === identity.code)));
  assert.ok(calls.every((c) => !/email|phone/.test(c.fields)));
  assert.ok(!calls.some((c) => c.table === "world_contributor_research_v1"), "initial catalogue defers full research");
  assert.ok(calls.filter((c)=>c.table==="contributors").every((c)=>!c.fields.includes(",dossier_settings")));
});

test("unknown, inactive and me do not become a public profile; invalid input never reaches DB", async () => {
  const calls = [];
  const client = fakeClient({contributors:[]},calls);
  for (const key of ["me", "../admin", "", "//evil", "bad?slug"]) assert.equal(await loadPublicContributor2029(key,{publicClient:()=>client}),null);
  assert.equal(calls.length,0);
  assert.equal(await loadPublicContributor2029("unknown",{publicClient:()=>client}),null);
  const privateClient=fakeClient({contributors:[{...identity,public_visibility:"private"}]},[]);
  assert.equal(await loadPublicContributor2029(identity.slug,{publicClient:()=>privateClient,projectionReader:()=>{throw new Error("private_profile_read");}}),null);
});

test("automatic contributor remains noindex behind a numeric canonical URL; curated identity keeps its existing policy", async () => {
  const generated = { ...identity, slug: "r-0123456789abcdef0123456789abcdef" };
  const client = fakeClient({ contributors: [generated], research_objects: [fixtureFinding],
    channel_updates: [], research_contributions: [], gematria_words: [] }, []);
  const view = await loadPublicContributor2029(identity.code, { publicClient: () => client });
  assert.equal(view.canonicalHref, "/community/researcher/2042");
  assert.equal(view.noindex, true);
  assert.equal(buildPublicContributorView(fixtureProjection(), identity).noindex, false);
  assert.equal(buildPublicContributorView(fixtureProjection(), { ...identity, slug: "r-CDEF0123456789ABCDEF" }).noindex, true);
  assert.equal(buildPublicContributorView(fixtureProjection(), { ...identity, slug: "r-short" }).noindex, false);
});

test("private/public_candidate/person_only/draft/triage and unresolved display names never enter public view", () => {
  const projection = fixtureProjection();
  const rows = ["private","public_candidate"].map((privacy_scope) => ({...fixtureFinding,id:privacy_scope,privacy_scope}));
  rows.push({...fixtureFinding,id:"personal",meta:{contributor_id:identity.id,ext:{personal_scope:{scope:"person_only"}}}});
  for (const status of ["draft","triage"]) rows.push({...fixtureFinding,id:status,status});
  rows.push({...fixtureFinding,id:"display-name-only",meta:{},contributor:identity.display_name});
  projection.sourceGroups[1].rows.push(...rows);
  projection.contributions.push({ id:"private-contribution",status:"draft",statement:"ADMIN_SECRET" });
  const view = buildPublicContributorView(projection,identity);
  assert.equal(view.items.filter((item)=>item.type==="findings").length,1);
  assert.equal(view.unattributed,true);
  assert.doesNotMatch(JSON.stringify(view),/ADMIN_SECRET|person_only|display-name-only|public_candidate|contributor_id/);
  assert.throws(()=>buildPublicContributorView({...projection,mode:"admin_all"},identity));
});

test("attribution uses exact canonical ID/code/slug or registered alias, explicit conflicts fail closed", () => {
  assert.equal(isExactlyAttributed({contributor:identity.display_name},identity),false);
  assert.equal(isExactlyAttributed({contributor:identity.wa_names[0]},identity),true);
  assert.equal(isExactlyAttributed({contributor_id:"someone-else",contributor:identity.wa_names[0]},identity),false);
  assert.equal(isExactlyAttributed({contributor_code:identity.code},identity),true);
  assert.equal(isExactlyAttributed({contributor_slug:identity.slug},identity),true);
});

test("source without Findings survives, duplicate sources collapse without discarding distinct Findings", () => {
  const projection = fixtureProjection();
  const group = projection.sourceGroups.find((item) => item.source.id === "source-two");
  projection.sourceGroups.push({...group,rows:[...group.rows,{...fixtureFinding,id:"another-finding"}]});
  const view = buildPublicContributorView(projection,identity);
  assert.equal(view.items.filter((item)=>item.group).length,2);
  assert.equal(view.items.filter((item)=>item.type==="findings").length,2);
  assert.ok(view.items.some((item)=>item.sourceOnly));
  assert.equal(view.sourceGroups[0].universalFindings.length,0);
});

test("unavailable research remains unknown; real source is readable without fake Findings/counts", () => {
  const view = fixtureView({research:"unavailable"});
  assert.equal(view.partial,true);
  assert.ok(view.items.filter((item)=>item.group).every((item)=>item.findingsUnavailable && !item.sourceOnly));
  assert.equal(Object.hasOwn(view,"counts"),false);
  assert.equal(view.items.filter((item)=>item.type==="findings").length,0);
});

test("exact return survives URL roundtrip for World, post fragment, topic, number and book", () => {
  for (const href of ["/world?kind=equality&contributor=2042&finding=r-13#source-7", "/post/5107?section=source#paragraph-22",
    "/topic/example?tab=sources#item-a", "/2029/number/207?method=standard#finding-1", "/book/example?page=18#verse-3", "/source/example#part-2", "/community/chat?thread=3#message-8", "/search?q=%D7%90%D7%95%D7%A8#result-3"]) {
    const link = contributorNavigation2029(identity,{returnHref:href,origin});
    const params = new URL(link,origin).searchParams;
    params.set("section","sources"); params.set("item","channel_updates:source-one");
    const context = readContributorLocation(params.toString(),origin);
    assert.equal(context.returnHref,href); assert.equal(context.section,"sources"); assert.equal(context.item,"channel_updates:source-one");
  }
  const matching = {target_type:"number",target_id:"207"};
  const worldAnchor = {type:"number",label:"207"};
  assert.match(contributorNavigation2029(identity,{returnHref:"/world?number=207#finding-1",origin,worldContribution:matching,worldAnchor}),/returnTo/);
  assert.doesNotMatch(contributorNavigation2029(identity,{returnHref:"/world?number=207",origin,worldContribution:{target_type:"number",target_id:"13"},worldAnchor}),/returnTo/);
});

test("return links reject external origins, protocol-relative, backslashes, unsafe and internal routes", () => {
  for (const href of ["https://evil.example/world", "//evil.example/world", "/\\evil.example/world", "javascript:alert(1)",
    "/admin/people", "/researcher/private", "/world/%2f%2fevil", "/world/%5cevil", "/world/%0aevil", "/world/%252f%252fevil", "https://evil.example@sod1820.co.il/world"]) {
    assert.equal(approvedReturnHref(href,origin),null,href);
  }
  assert.equal(approvedReturnHref(`${origin}/world?x=1#anchor`,origin),"/world?x=1#anchor");
  assert.equal(approvedReturnHref("/2029?preview=community&data=live",origin),"/2029?preview=community&data=live","exact Preview community URL");
  for (const bad of ["/2029","/2029?preview=world","/2029?data=live","/2029/x?preview=community","//2029?preview=community",`https://evil.example/2029?preview=community`])
    assert.equal(approvedReturnHref(bad,origin),null,bad);
  assert.equal(safePublicUrl("javascript:alert(1)"),null);
});

test("sorting defaults to recent writings; unknown ratings stay null; strength is Findings-only", () => {
  const view = fixtureView();
  assert.equal(selectContributorItems(view,"all","strength").sort,"newest");
  assert.equal(selectContributorItems(view,"all","discussed").canDiscuss,false);
  assert.equal(selectContributorItems(view,"findings","strength").sort,"newest");
  assert.equal(view.items.find((item)=>item.type==="findings").strength,null);
  const measured = {items:[{id:"low",type:"findings",strength:0,quality:99},{id:"high",type:"findings",strength:30,quality:1},{id:"unknown",type:"findings",strength:null}]};
  assert.deepEqual(selectContributorItems(measured,"findings","strength").rows.map((r)=>r.id),["high","low","unknown"]);
});

test("community messages retain their type and are never relabelled as authored articles", () => {
  const p=fixtureProjection();
  p.contributions=[{id:"community-one",source:"community_2029",status:"approved",statement:"הודעה ציבורית",createdAt:"2026-10-20"}];
  const view=buildPublicContributorView(p,identity);
  assert.equal(view.items.find((item)=>item.id==="community-one").type,"community");
  assert.equal(selectContributorItems(view,"writings","newest").rows.length,0);
});

test("public and admin paths remain separate and original admin noindex is preserved", () => {
  const page = readFileSync(new URL("../../pages/PublicContributor2029Page.jsx",import.meta.url),"utf8");
  const admin = readFileSync(new URL("../../pages/Researcher2029Page.jsx",import.meta.url),"utf8");
  assert.match(admin,/noindex:\s*true/);
  assert.doesNotMatch(page,/useAuth|ADMIN_ALL|fetchResearcherCorpus|Researcher2029Page/);
  assert.match(contributorNavigation2029(identity),/^\/community\/researcher\/2042$/);
  assert.match(contributorNavigation2029({slug:"writer-slug"}),/^\/community\/researcher\/writer-slug$/);
});
