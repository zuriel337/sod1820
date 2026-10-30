import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildWorldMapViewModel, describeWorldMapNode, relationStatusCopy, isTreeEdgeEvidence, neighborInDirection,
} from "../src/lib/research/worldMapViewModel2029.js";
import { buildPublicWorldContentProjectionV1 } from "../src/lib/research/publicWorldContentProjectionV1.js";
import {
  buildWorldMapFixtureProjection, WORLD_MAP_FIXTURE_CANDIDATES, createFixtureRelationOpener,
} from "../src/lib/research/worldMapFixture2029.js";
import { normalizeOpenedRelations, createCanonicalRelationOpener } from "../src/lib/research/worldGraphRelationOpener2029.js";

const projection = buildWorldMapFixtureProjection();
const model = buildWorldMapViewModel({ projection });

test("layers stay separate: source / occurrence / finding / tree are distinct node kinds", () => {
  const kinds = new Set(model.nodes.map((node) => node.kind));
  assert.deepEqual([...kinds].sort(), ["finding", "occurrence", "source", "tree"]);
  const ids = model.nodes.map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length, "an occurrence/finding never reuses a source id");
});

test("only the window reaches the canvas; the hidden remainder is counted honestly", () => {
  assert.equal(model.stats.sourcesShown, 6);
  assert.equal(model.stats.sourcesTotal, 8);
  assert.equal(model.stats.sourcesHidden, 2);
  assert.equal(model.stats.occurrencesHidden, 1, "third occurrence of source A is outside the per-source window");
  assert.ok(!model.nodes.some((node) => node.ref === "fixture:source:g"));
});

test("unavailable source coverage yields no total, never a fabricated zero", () => {
  const unavailable = buildPublicWorldContentProjectionV1({ sources: [{ sourceRef: "s:1" }], coverage: { sources: { available: false } } });
  const out = buildWorldMapViewModel({ projection: unavailable });
  assert.equal(out.stats.sourcesTotal, null);
  assert.equal(out.stats.sourcesHidden, null);
  assert.equal(out.coverage.sources, false);
});

test("a tree edge exists only with edgeRef or governanceRef", () => {
  const treeEdges = model.edges.filter((edge) => edge.kind === "tree");
  assert.equal(treeEdges.length, 2);
  for (const edge of treeEdges) assert.ok(edge.edgeRef || edge.governanceRef);
  assert.equal(isTreeEdgeEvidence({ targetRef: "x" }), false);
  // A relation without evidence is dropped even when handed straight to the model.
  const forged = { ...projection, treeRelations: [{ findingRef: "fixture:finding:3", targetRef: "node:1", edgeRef: null, governanceRef: null }] };
  assert.equal(buildWorldMapViewModel({ projection: forged }).edges.filter((edge) => edge.kind === "tree").length, 0);
});

test("provenance links are never tree edges and series/category/topic never create edges", () => {
  const provenance = model.edges.filter((edge) => edge.kind === "provenance");
  assert.ok(provenance.length > 0);
  assert.ok(provenance.every((edge) => !edge.edgeRef && !edge.governanceRef));
  assert.ok(!model.nodes.some((node) => /series|category|topic/i.test(node.ref)), "tags are not nodes");
  const shared = describeWorldMapNode(model, projection, "source:fixture:source:a");
  assert.ok(shared.tags.length === 2 && /לא קשר עץ/.test(shared.tagNote));
});

test("candidates are not edges", () => {
  assert.ok(WORLD_MAP_FIXTURE_CANDIDATES.length > 0);
  const edgeRefs = model.edges.map((edge) => edge.id).join("|");
  for (const candidate of WORLD_MAP_FIXTURE_CANDIDATES) assert.ok(!edgeRefs.includes(candidate.candidateRef));
  // handing candidates through the projection's treeRelations still draws nothing.
  const forged = buildPublicWorldContentProjectionV1({
    sources: [{ sourceRef: "s:1" }], findings: [{ findingRef: "f:1", sourceRefs: ["s:1"] }],
    treeRelations: [{ findingRef: "f:1", targetRef: "node:9" }],
  });
  assert.equal(buildWorldMapViewModel({ projection: forged }).edges.filter((edge) => edge.kind === "tree").length, 0);
});

test("inspector DTO keeps source, occurrence and finding semantics apart", () => {
  const source = describeWorldMapNode(model, projection, "source:fixture:source:a");
  assert.match(source.boundary, /ממצא והופעה.*אינם מקור נוסף/);
  assert.equal(source.occurrences.length, 3);
  const occurrence = describeWorldMapNode(model, projection, "occurrence:fixture:occ:a1");
  assert.match(occurrence.boundary, /אינה מקור עצמאי/);
  assert.equal(occurrence.parentSourceRef, "fixture:source:a");
  const finding = describeWorldMapNode(model, projection, "finding:fixture:finding:1");
  assert.match(finding.boundary, /אינו המקור/);
  const tree = describeWorldMapNode(model, projection, "tree:fixture:node:374");
  assert.equal(tree.evidence[0].governanceRef, "fixture:decision:374");
});

test("relation status copy never says 'no relation' for a partial, failed or unavailable window", () => {
  for (const status of ["partial", "failed", "unavailable", "loading", "idle"]) {
    const copy = relationStatusCopy(status, 0);
    assert.doesNotMatch(copy, /לא נמצאו קשרים|^אין קשר/, status);
    if (["partial", "failed"].includes(status)) assert.match(copy, /לא ידוע/, status);
  }
  assert.match(relationStatusCopy("partial", 0), /אין זה אומר שאין קשר/);
  assert.match(relationStatusCopy("failed", 0), /אין זה אומר שאין קשר/);
  assert.match(relationStatusCopy("ok", 0), /בחלון שנקרא/);
});

test("opened relations render as tree edges only with an edge: ref, and keep existing nodes in place", () => {
  const before = Object.fromEntries(model.nodes.map((node) => [node.id, [node.x, node.y]]));
  const opened = buildWorldMapViewModel({
    projection,
    relationStates: { "fixture:finding:3": { status: "ok", anchorNodeId: "n3", relations: [
      { edgeRef: "edge:7", relationType: "קשור", fromNodeId: "n3", toNodeId: "n9", fromLabel: "א", toLabel: "יעד" },
      { edgeRef: "candidate:8", relationType: "הצעה", fromNodeId: "n3", toNodeId: "n10", toLabel: "לא קשר" },
    ] } },
  });
  assert.ok(opened.nodes.some((node) => node.ref === "node:n9"));
  assert.ok(!opened.nodes.some((node) => node.ref === "node:n10"), "a non-edge relation is ignored");
  for (const node of model.nodes) assert.deepEqual([node.x, node.y], before[node.id], `${node.id} did not move`);
});

test("canonical opener marks a full window partial and never queries by itself", async () => {
  const anchor = "10000000-0000-4000-8000-000000000001";
  const edgeFinding = (index) => {
    const id = `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    return { kind: "graph-relation", identity: { relationRef: `edge:${id}` }, source: { sourceRef: `edge:${id}` },
      projection: { relations: [{ id, relationType: "r", fromNodeId: anchor, toNodeId: "20000000-0000-4000-8000-000000000001" }] } };
  };
  assert.equal(normalizeOpenedRelations([edgeFinding(1)], { relationLimit: 50 }).status, "ok");
  assert.equal(normalizeOpenedRelations(Array.from({ length: 50 }, (_, i) => edgeFinding(i)), { relationLimit: 50 }).status, "partial");
  const calls = [];
  const entity = { kind: "graph-entity", identity: { entityRef: `node:${anchor}`, sourceIdentity: { nodeId: anchor } }, source: { sourceRef: `node:${anchor}` } };
  const open = createCanonicalRelationOpener({ fetcher: async (id) => { calls.push(id); return [entity, edgeFinding(1)]; } });
  assert.deepEqual(await open({ nodeId: "" }), { status: "unavailable", anchorNodeId: "", relations: [] });
  assert.equal(calls.length, 0);
  assert.equal((await open({ nodeId: anchor })).anchorNodeId, anchor);
  assert.deepEqual(calls, [anchor]);
  await assert.rejects(createFixtureRelationOpener("failed")({ nodeId: "x" }));
});

test("arrow navigation follows RTL layers (left goes deeper) and stays in the layer for up/down", () => {
  const source = model.nodes.find((node) => node.id === "source:fixture:source:a");
  const left = neighborInDirection(model.nodes, source.id, "left");
  assert.ok(model.nodes.find((node) => node.id === left).x < source.x);
  assert.equal(neighborInDirection(model.nodes, source.id, "right"), null, "source layer is the rightmost");
  const down = neighborInDirection(model.nodes, source.id, "down");
  assert.equal(model.nodes.find((node) => node.id === down).kind, "source");
});

test("isolation: no reader, DB, router or legacy import in the shell files", () => {
  const files = ["src/lib/research/worldMapViewModel2029.js", "src/lib/research/worldMapFixture2029.js",
    "src/components/research/WorldGraphCanvas2029.jsx", "src/components/research/WorldMiniMap2029.jsx",
    "src/components/research/WorldMapShell2029.jsx", "src/components/research/WorldSourceInspector2029.jsx"];
  for (const file of files) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /(from|import)\s*\(?\s*["'][^"']*(supabase|SystemFrame|App2029|beit|legacy|entityGraph)/i, file);
    assert.doesNotMatch(text, /\bfetch\(|\.rpc\(|\.from\(["']/, file);
  }
  const opener = readFileSync(new URL("../src/lib/research/worldGraphRelationOpener2029.js", import.meta.url), "utf8");
  assert.match(opener, /fetchCanonicalGraphEntityFindings/);
  const css = readFileSync(new URL("../src/components/research/worldMapShell2029.css", import.meta.url), "utf8");
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, "").split("{").slice(0, -1).map((chunk) => chunk.split("}").pop().trim()).filter((s) => s && !s.startsWith("@"));
  for (const selector of selectors) for (const part of selector.replace(/\([^)]*\)/g, "()").split(",")) assert.match(part.trim(), /\.wm29|^:root\[data-theme-preset/, `unscoped selector: ${part}`);
});
