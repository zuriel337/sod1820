import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/pages/ContributorPage.jsx", import.meta.url), "utf8");
const start = source.indexOf('  // נעול / בבנייה / לא-רשום/פרטי / תיק-ריק');
const end = source.indexOf('  // 📝 הפוסטים על שמו', start);
assert.ok(start >= 0 && end > start, "the existing indexability effect must remain identifiable");
const effectSource = source.slice(start, end);

function indexability({ contributor = {}, dossier = null, postCount = 0, publicConvergences = [], privilegedFindings = [] } = {}) {
  const tags = [];
  let cleanup;
  vm.runInNewContext(effectSource, {
    c: contributor,
    dossierCount: dossier,
    posts: Array.from({ length: postCount }),
    convergences: publicConvergences,
    findingsLens: { projection: privilegedFindings },
    useEffect: (fn) => { cleanup = fn(); },
    document: {
      createElement: () => ({}),
      head: {
        appendChild: (tag) => tags.push(tag),
        removeChild: (tag) => tags.splice(tags.indexOf(tag), 1),
      },
    },
  });
  return { tags, cleanup };
}

test("a public contributor with approved convergences is indexable without legacy media or author-name posts", () => {
  const { tags } = indexability({ contributor: { slug: "tzvi-opoc", locked: false, building: false }, publicConvergences: [{ slug: "approved-topic" }] });
  assert.equal(tags.length, 0);
});

for (const [name, contributor] of [
  ["private", { dossier_settings: { visibility: "private" } }],
  ["locked", { locked: true }],
  ["building", { building: true }],
  ["unresolved", null],
]) {
  test(`${name} contributor remains noindex even when public relations or privileged findings are present`, () => {
    const { tags } = indexability({ contributor, publicConvergences: [{ slug: "approved-topic" }], privilegedFindings: [{ status: "candidate" }] });
    assert.equal(tags.length, 1);
    assert.equal(tags[0].name, "robots");
    assert.equal(tags[0].content, "noindex");
  });
}

test("an empty or privileged-findings-only page stays noindex", () => {
  assert.equal(indexability().tags[0].content, "noindex");
  assert.equal(indexability({ privilegedFindings: [{ status: "candidate" }] }).tags[0].content, "noindex");
});

test("existing dossier, media and authored-post evidence retain their previous behavior", () => {
  for (const fixture of [{ dossier: 1 }, { contributor: { media: [{ url: "public-image" }] } }, { postCount: 1 }]) {
    assert.equal(indexability(fixture).tags.length, 0);
  }
});

test("removing a guard-owned noindex tag does not remove the canonical robots tag", () => {
  const result = indexability();
  assert.equal(result.tags.length, 1);
  result.cleanup();
  assert.equal(result.tags.length, 0);
});

test("the public convergence reader and automatic-profile exclusion remain the existing owners", () => {
  assert.match(source, /convergences\.length/);
  assert.match(source, /getResearcherConvergences\(name\)/);
  assert.match(source, /from\("topic_cards_public"\)/);
  assert.match(source, /noindex: autoProfile/);
  assert.doesNotMatch(effectSource, /findingsLens|waFindings|waUpdates|studioBlocks|isAdmin|unlocked/);
});
