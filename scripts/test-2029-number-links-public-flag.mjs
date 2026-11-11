// Number links under the public-release flag (isolated: Vite SSR in Node, no browser, no network, no account, no model call).
//
// In the public release (VITE_PUBLIC_FOUNDATION_PREVIEW=true) every internal link to the Number page is /number/<n>, while saved
// Raziel conversations, Posts and saved research paths still carry the older /2029/number/<n>. Plain node tests do not set the flag, so
// they only ever saw the compatibility spelling; this script loads the real modules twice, once per mode, and checks that what a
// producer emits is accepted by the consumer that validates it, in both spellings, and that forged addresses stay rejected.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

const PERSON_REF = "person:11111111-1111-4111-8111-111111111111:self";
const MEMBER_REF = "person:11111111-1111-4111-8111-111111111111:p:child-1";

async function inMode(publicRelease, run) {
  if (publicRelease) process.env.VITE_PUBLIC_FOUNDATION_PREVIEW = "true";
  else delete process.env.VITE_PUBLIC_FOUNDATION_PREVIEW;
  delete process.env.VITE_PUBLIC_READING_RELEASE;
  const { createServer } = await import("vite");
  const server = await createServer({
    root,
    configFile: false,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, entries: [] },
  });
  try {
    return await run((file) => server.ssrLoadModule(file));
  } finally {
    await server.close();
  }
}

const results = [];
const check = (name, fn) => {
  fn();
  results.push(name);
};

async function runMode(publicRelease) {
  const base = publicRelease ? "/number" : "/2029/number";
  const label = publicRelease ? "public release" : "compatibility";
  await inMode(publicRelease, async (load) => {
    const address = await load("/src/lib/research/numberPageAddress.js");
    check(`${label}: internal links use ${base}`, () => {
      assert.equal(address.NUMBER_PAGE_BASE, base);
      assert.equal(address.numberPageHref("0358"), `${base}/358`);
      assert.equal(address.numberPageHref("משיח"), `${base}/${encodeURIComponent("משיח")}`);
      assert.equal(address.isNumberPagePath("/number/358") && address.isNumberPagePath("/2029/number/358"), true);
    });

    // ── Raziel: navigation button, suggested action, one-shot action ─────────────────────────────────────────────────────
    const seam = await load("/src/components/experience2029/razielSessionSeam2029.js");
    check(`${label}: a Raziel navigation action renders in both spellings and nothing forged renders`, () => {
      const render = (href) => seam.razielNavigationButton({ role: "raziel", navigationAction: { href, label: "פתח" } });
      for (const href of ["/number/358", "/2029/number/358", "/number/1", "/number/999999", "/world"]) assert.ok(render(href), href);
      for (const href of ["/number/0358", "/number/0", "/number/1000000", "/number/358?x=1", "/number/358/", "//evil.invalid/number/358",
        "https://evil.invalid/number/358", "/numbers/358", "/number/abc", "/2029/number/0358"]) assert.equal(render(href), null, href);
    });

    const request = await load("/src/lib/research/razielSessionRequest2029.js");
    const oneShot = read("src/components/experience2029/RazielOneShotActions2029.jsx");
    const oneShotPattern = oneShot.match(/action\.id === "open_number"\) \{\s*if \((\/.+?\/)\.test\(action\.href \|\| ""\)\) navigate/s)?.[1];
    assert.ok(oneShotPattern, "the one-shot open_number guard was not found");
    const oneShotAccepts = new Function(`return ${oneShotPattern};`)();
    check(`${label}: a suggested open_number action is normalised to ${base} and the one-shot guard accepts what it emits`, () => {
      for (const href of ["/2029/number/337", "/number/337"]) {
        const actions = request.normalizeRazielSuggestedActions([{ id: "open_number", label: "קישור זר", href }]);
        assert.equal(actions.length, 1, href);
        assert.equal(actions[0].href, `${base}/337`, href);
        assert.equal(actions[0].label, "פתח את המספר 337");
        assert.equal(oneShotAccepts.test(actions[0].href), true, `the click guard accepts ${actions[0].href}`);
        assert.equal(seam.razielNavigationButton({ role: "raziel", navigationAction: { href: actions[0].href, label: "פתח" } }) !== null, true);
      }
      for (const href of ["/number/0358", "/number/0", "/number/1000000", "/number/337?source=private", "https://evil.invalid/number/337", "/numbers/337"]) {
        assert.equal(request.normalizeRazielSuggestedActions([{ id: "open_number", href }]).length, 0, `${href} is dropped`);
        assert.equal(oneShotAccepts.test(href), false, `${href} is refused by the click guard`);
      }
    });

    // ── Saved Raziel conversation: a stored navigation action in either spelling is restored, a forged one is not ───────────
    const saved = await load("/src/lib/research/razielSavedSession2029.js");
    const session = await load("/src/lib/research/razielSession2029.js");
    const navigationState = (question) => {
      const initial = { ...session.createInitialRazielSessionState(), viewMode: "exploratory" };
      const prepared = request.prepareRazielSessionSubmission({ question, state: initial, researchContext: null,
        startedAt: "2026-10-26T12:00:00Z", createTurnId: () => "navigation-turn" });
      assert.ok(prepared.navigation);
      const started = session.razielSessionReducer(initial, { type: "turn_started", turn: prepared.turn, contextSnapshot: prepared.contextSnapshot });
      return session.razielSessionReducer(started, request.createRazielNavigationTurnSucceededAction({ state: started,
        navigation: prepared.navigation, completedAt: "2026-10-26T12:00:01Z" }));
    };
    check(`${label}: a saved Raziel conversation restores its number link in either spelling and rejects forged ones`, () => {
      const built = saved.buildRazielSavedSessionEntity(navigationState("פתח את דף המספר 73"), { now: () => "2026-10-26T12:00:02Z" }).entity;
      const valid = built.thread.at(-1).navigationAction;
      const restoredAction = (patch) => saved.razielSavedSessionState({ ...built, thread: [built.thread[0], { ...built.thread[1], navigationAction: patch }] })
        .thread.at(-1).navigationAction;
      for (const href of ["/2029/number/73", "/number/73"]) {
        const action = restoredAction({ ...valid, href });
        assert.ok(action, `${href} restores`);
        assert.equal(action.href, href, "the stored address is kept exactly");
        assert.equal(action.number, 73);
      }
      for (const href of ["/number/073", "/number/0", "/number/73?source=private", "/number/1000000", "https://evil.invalid/number/73", "/numbers/73"]) {
        assert.equal(restoredAction({ ...valid, href }), undefined, `${href} is rejected`);
      }
      assert.equal(restoredAction({ ...valid, href: "/number/73", number: 337 }), undefined, "a number that disagrees with the address is rejected");
    });

    // ── Post: declared connections to a number page, either spelling ─────────────────────────────────────────────────────
    const post = await load("/src/lib/research/post2029ReadingProjection.js");
    await (async () => {
      const calls = [];
      const result = await post.resolvePostExperienceConnections({ connections: [
        { id: "a", label: "363", href: "/number/363" },
        { id: "b", label: "363", href: "/2029/number/363" },
        { id: "c", label: "363", href: "/number/363?x=1" },
        { id: "d", label: "363", href: "https://evil.invalid/number/363" },
      ] }, { readPost: async (slug) => { calls.push(slug); return null; }, readTopic: async () => null });
      const byId = Object.fromEntries(result.connections.map((item) => [item.id, item.href]));
      check(`${label}: a Post connection to a number page keeps either spelling; a query or foreign address is withheld`, () => {
        assert.equal(byId.a, "/number/363");
        assert.equal(byId.b, "/2029/number/363");
        assert.equal(byId.c, null);
        assert.equal(byId.d, null);
        assert.deepEqual(calls, [], "a number page is never read as a Post");
      });
    })();

    // ── Life Journey: a private finding opens the number page, saves as a research path and returns exactly ─────────────────
    const journey = await load("/src/lib/research/lifeJourneyPersonContext.js");
    const context = await load("/src/lib/research/researchContext.js");
    const pathRuntime = await load("/src/lib/research/researchPathRuntime.js");
    check(`${label}: a Life Journey finding opens ${base}/73, saves as a path, restores and returns exactly; both spellings are valid receipts`, () => {
      const person = journey.buildLifeJourneyPersonContext(PERSON_REF);
      const findingId = "uf1:date_cross:gregorian%3A1990-02-15:private-input";
      const finding = journey.buildLifeJourneyFindingTraversalPatch(person, { personRef: PERSON_REF, memberRef: MEMBER_REF, findingId, value: 73,
        versionRef: "personal-date-representation-v1" });
      assert.equal(finding.subject.href, `${base}/73`);
      assert.equal(finding.subject.href.includes("1990-02-15"), false, "the private input is not in the address");
      assert.equal(journey.lifeJourneyViewFromContext(finding, PERSON_REF), "finding");
      for (const href of [`${base}/73`, "/2029/number/73", "/number/73"]) {
        const asSaved = context.normalizeResearchContext({ ...finding, subject: { ...finding.subject, href } });
        const representation = pathRuntime.buildResearchPathRepresentation(asSaved);
        const receipt = { ok: true, path_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", revision_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          revision_no: 1, access_scope: "private", representation, steps: [] };
        assert.equal(journey.isLifeJourneyPathReceipt(receipt, PERSON_REF), true, `${href} is a valid saved-path receipt`);
        const restored = pathRuntime.contextFromResearchPathSnapshot(receipt);
        assert.equal(restored.subject.href, href, "the saved address is restored exactly");
        assert.equal(restored.returnTo?.subject?.id, PERSON_REF, "the exact-return pointer to the Person is kept");
      }
      const returned = context.mergeResearchContext(finding, journey.buildLifeJourneyExactReturnPatch(finding));
      assert.equal(journey.lifeJourneyViewFromContext(returned, PERSON_REF), "person");
      assert.equal(returned.subject.id, PERSON_REF);
      assert.equal(returned.returnTo, null);
      // The receipt guard has only ever checked the shape /<prefix>/number/<digits>; it does not canonicalise (the route does, with
      // one 308). The new spelling must behave exactly like the old one for every address, forged or not.
      const receiptFor = (href) => ({ ok: true, path_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", revision_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        revision_no: 1, access_scope: "private", steps: [],
        representation: pathRuntime.buildResearchPathRepresentation(context.normalizeResearchContext({ ...finding, subject: { ...finding.subject, href } })) });
      for (const tail of ["73", "073", "0", "x", "73/", "73?x=1", ""]) {
        assert.equal(journey.isLifeJourneyPathReceipt(receiptFor(`/number/${tail}`), PERSON_REF),
          journey.isLifeJourneyPathReceipt(receiptFor(`/2029/number/${tail}`), PERSON_REF), `/number/${tail} behaves like /2029/number/${tail}`);
      }
      for (const href of ["https://evil.invalid/number/73", "/numbers/73", "/world/73"]) {
        assert.equal(journey.isLifeJourneyPathReceipt(receiptFor(href), PERSON_REF), false, `${href} is not a valid finding receipt`);
      }
    });

    // ── The research provider keeps the address the person used (old or new) in the context it stores ────────────────────────
    check(`${label}: the research context keeps the spelling the page was opened with`, () => {
      const source = read("src/lib/research/ResearchProvider.jsx");
      assert.match(source, /href: `\$\{match\[1\] \? "\/2029" : ""\}\/number\//);
    });
  });
}

await runMode(true);
await runMode(false);
for (const name of results) console.log(`PASS ${name}`);
console.log(`Number links under both release modes: PASS (${results.length} checks)`);
