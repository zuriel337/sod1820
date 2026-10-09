// RAZIEL_CANONICAL_CONTINUATION_HREF_V1 — deterministic canonical href transport (no registry, no URL hardcodes).
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { buildRazielSurfaceContext } from "../src/lib/research/razielSurfaceContext.js";
import { normalizeResearchContext } from "../src/lib/research/researchContext.js";
import { safeCanonicalHref, continuationHrefFromSurface, whatsappContinuationLink, renderWhatsappReply } from "../supabase/functions/_shared/waRazielRender.ts";

for (const f of ["supabase/functions/ai-analyze/index.ts", "supabase/functions/wa-raziel/index.ts", "supabase/functions/_shared/waRazielRender.ts"]) {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--check", f], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || `${f} syntax check failed`);
}
const ORIGIN = "https://example.test";
const ctx = normalizeResearchContext({
  subject: { type: "number", id: "26", label: "26", href: "/x/subject-26" },
  returnTo: { href: "/x/return-here", label: "חזרה", subject: { type: "topic", id: "t1" } },
});

// subject.href survives Research Context → surface semantic; returnTo.href survives distinctly
const sc = buildRazielSurfaceContext(ctx);
assert.equal(sc.subjectHref, "/x/subject-26");
assert.equal(sc.navigation.returnTo.href, "/x/return-here");
assert.notEqual(sc.subjectHref, sc.navigation.returnTo.href);
const noSubjHref = buildRazielSurfaceContext(normalizeResearchContext({ subject: { type: "number", id: "1" }, returnTo: { href: "/x/r" } }));
assert.equal(noSubjHref.subjectHref, undefined);          // returnTo never substituted into subject
assert.equal(noSubjHref.navigation.returnTo.href, "/x/r");

// server selection: subject href only; returnTo never becomes the continuation; missing ⇒ null
assert.equal(continuationHrefFromSurface({ context: sc }), "/x/subject-26");
assert.equal(continuationHrefFromSurface({ context: noSubjHref }), null);
assert.equal(continuationHrefFromSurface(null), null);
assert.equal(continuationHrefFromSurface({ subject: { href: "/x/y" } }), null);   // only the Research Context projection field

// model-written URLs never become continuation_href
const modelData = { raziel: { answer: "ראה https://evil.example/a או /x/model", continuation_href: "/x/model-chosen" }, analysis: "/x/prose" };
assert.equal(whatsappContinuationLink(modelData, ORIGIN), "");
assert.equal(renderWhatsappReply(modelData).includes("evil.example"), true);   // prose untouched, but no link is derived from it

// missing href ⇒ no link; external/malformed rejected
for (const bad of [undefined, null, "", "   ", "https://evil.example/x", "http://a/b", "//evil.example/x", "/\\evil", "javascript:alert(1)", "x/relative", "/a b", "/a\n/b", "/a/../b", "/a/%2e%2e/b", "/a<script>", 'a"b', 42, {}, "/" + "a".repeat(400)]) {
  assert.equal(safeCanonicalHref(bad), null, String(bad));
  assert.equal(whatsappContinuationLink({ continuation_href: bad }, ORIGIN), "", String(bad));
}
assert.equal(whatsappContinuationLink({}, ORIGIN), "");
assert.equal(whatsappContinuationLink(null, ORIGIN), "");
assert.equal(whatsappContinuationLink({ continuation_href: "/x/ok" }, "http://insecure.test"), "");
assert.equal(whatsappContinuationLink({ continuation_href: "/x/ok" }, "not a url"), "");

// existing canonical href rendered against the transport origin; route change inherited by changing only the input href
assert.equal(whatsappContinuationLink({ continuation_href: "/x/subject-26" }, ORIGIN), `${ORIGIN}/x/subject-26`);
assert.equal(whatsappContinuationLink({ continuation_href: "/y/new-route/26?a=1#h" }, ORIGIN), `${ORIGIN}/y/new-route/26?a=1#h`);
assert.equal(whatsappContinuationLink({ continuation_href: "/x/עברית" }, ORIGIN), `${ORIGIN}/x/עברית`);
const e2e = (href) => continuationHrefFromSurface({ context: buildRazielSurfaceContext(normalizeResearchContext({ subject: { type: "number", id: "9", href } })) });
assert.equal(e2e("/a/1"), "/a/1");
assert.equal(e2e("/b/2"), "/b/2");

// wiring + no route literals in adapter code
const ai = fs.readFileSync("supabase/functions/ai-analyze/index.ts", "utf8");
const wa = fs.readFileSync("supabase/functions/wa-raziel/index.ts", "utf8");
const shared = fs.readFileSync("supabase/functions/_shared/waRazielRender.ts", "utf8");
assert.match(ai, /const rCont = continuationHrefFromSurface\(body\?\.surface_semantic\)/);
assert.match(ai, /continuation_href: rCont/);
assert.doesNotMatch(ai, /continuation_href[^\n]*(contract|out\.text|parseContract)/);
assert.match(wa, /whatsappContinuationLink\(data, SITE\)/);
const helperSrc = shared.slice(shared.indexOf("Canonical continuation href"));
assert.doesNotMatch(helperSrc, /["'`]\/(?:number|topic|post|journey|els|research|heichal|world)\b/);   // no legacy route fallbacks
assert.doesNotMatch(helperSrc, /https?:\/\/(?!canonical\.invalid)/);
const sysFrame = fs.readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
assert.match(sysFrame, /buildRazielSurfaceContext\(context\)/);   // hrefs come from current Research Context only
console.log("raziel-canonical-continuation-href: OK");
