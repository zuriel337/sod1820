// Synthetic public-only fixture. Never imported by the production page/loader.
import { buildContributorFindingsProjection } from "../../lib/research/contributorFindingsProjection.js";
import { buildPublicContributorView } from "./publicContributor2029Model.js";

export const fixtureIdentity = { id: "11111111-1111-4111-8111-111111111111", slug: "public-writer-test", code: "2042",
  display_name: "כותב לדוגמה — מקורות, כתבים והקשרים במחקר", role: "researcher", active: true,
  wa_names: ["כינוי בדיקה מאושר"], bio: "דף בדיקה מקומי: אותם מקורות, מבטים שונים. כל התוכן כאן נכתב לצורך בדיקות התצוגה." };
export const fixtureSource = { id: "source-one", created_at: "2026-10-20T12:00:00Z", text: "מקור אחד, כמה הקשרים\nהטקסט נשמר כפי שנמסר. המקור הזה עומד בפני עצמו, גם כאשר עדיין אין ממנו ממצאים.", credit: "כינוי בדיקה מאושר", status: "approved", link_url: "/post/fixture-source#source-section-one" };
export const fixtureFinding = { id: "finding-one", created_at: "2026-10-21T12:00:00Z", kind: "equality",
  statement: "שוויון שנמסר למחקר — ההקשר והמקור נשמרים בנפרד מהאימות", value: 207, terms: ["אור"],
  contributor: "כינוי בדיקה מאושר", source_ref: "channel_updates:source-two", privacy_scope: "public", status: "candidate",
  engine_detail: { verification_state: "not_tested" }, meta: { contributor_id: fixtureIdentity.id } };
export function fixtureProjection({ research = "ok", sources = "ok", empty = false } = {}) {
  return { ...buildContributorFindingsProjection({ contributor: fixtureIdentity,
    sourceMessages: empty ? [] : [fixtureSource, { ...fixtureSource, id: "source-two", text: "מקור למחקר של ביטוי ומספר", created_at: "2026-10-21T12:00:00Z" }],
    researchObjects: empty || research !== "ok" ? [] : [fixtureFinding],
    contributions: empty ? [] : [{ id: "article-one", author_contributor_id: fixtureIdentity.id,
      title: "כתב קצר על קריאת מקורות ושמירת ההקשר", body: "הטקסט הציבורי נשאר מחובר למקורו. אין כאן ציון חוזק מומצא או העתק למאגר אחר.", status: "approved", created_at: "2026-10-19T12:00:00Z" }],
  }), mode: "public_view", availability: { research, sources, contributions: "ok", topics: "unavailable" } };
}
export function fixtureView(options) {
  return { ...buildPublicContributorView(fixtureProjection(options), fixtureIdentity), canonicalHref: "/community/researcher/2042" };
}
