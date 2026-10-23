import { buildContributorFindingsProjection } from "../../lib/research/contributorFindingsProjection.js";
import { buildContributorSourceCatalogProjection } from "../../lib/research/contributorSourceCatalogProjection.js";
import { publicSourceCatalog2029 } from "./publicSourceCatalog2029Model.js";

// Synthetic fixtures only. No production import or copy of a real contributor's corpus.
export const catalogFixtureIdentity = { id: "11111111-1111-4111-8111-111111111111", slug: "tzvi-opoc", code: null,
  display_name: "צבי · נתוני בדיקה", role: "researcher", active: true, wa_names: ["כינוי בדיקה מאושר"] };
export function catalogFixtureSources(total = 25) {
  return Array.from({length:total},(_,i)=>({id:`00000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`,
    contributor_id:catalogFixtureIdentity.id, created_at:new Date(Date.UTC(2026,9,1+i,10)).toISOString(),
    text:`מקור מספר ${i+1} — שומרים על הכותרת, ההקשר וההופעה המקורית`, channel:"fixture",status:"on",
    ...(i===total-2?{text:"📷 עדכון",image_url:"/test/fixtures/public-contributor-catalog.svg"}:{}),
    ...(i===total-1?{created_at:new Date(Date.UTC(2026,9,i,10,0,5)).toISOString(),text:"תמונה והסבר בפרסום אחד [Image 1.jpg]",topics:["נושא שנרשם במקור"]}:{})}));
}
export function sourceCatalogFixture(total = 25) {
  const p=buildContributorFindingsProjection({contributor:catalogFixtureIdentity,sourceMessages:catalogFixtureSources(total)});
  return buildContributorSourceCatalogProjection({...p,availability:{sources:"ok",research:"deferred",contributions:"ok",topics:"unavailable"},loadState:{researchObjectsDeferred:true}});
}
export function sourceCatalogFixtureView(total = 25) {
  return publicSourceCatalog2029(sourceCatalogFixture(total),{profile:{name:catalogFixtureIdentity.display_name,
    role:"חוקר",bio:"דוגמה מקומית בלבד. המקור, התמונה והטקסט נשארים פרסום אחד; ההעמקה נפתחת בעולם.",avatar:null},
    canonicalHref:"/community/researcher/tzvi-opoc",communityAvailable:true,community:[{id:"community-test",title:"הודעה לדוגמה בקהילה",date:"2026-10-22T10:00:00Z"}]});
}
