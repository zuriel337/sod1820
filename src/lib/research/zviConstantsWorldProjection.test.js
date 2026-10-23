import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ZVI_CONSTANT_CASES,
  buildZviConstantsWorldProjection,
  fetchZviConstantsWorldProjection,
  verifyConstantCase,
} from "./zviConstantsWorldProjection.js";
import {
  ZVI_CONSTANT_CANDIDATES,
  buildConstantAdminQueue,
} from "./zviConstantsAdminProjection.js";

const publicModuleSource = readFileSync(fileURLToPath(new URL("./zviConstantsWorldProjection.js", import.meta.url)), "utf8");

test("pi/e cases are verified deterministically and labelled approximation, never equality", () => {
  const crown = verifyConstantCase(ZVI_CONSTANT_CASES[0]);
  assert.equal(crown.relation, "approximation");
  assert.equal(crown.label, "קירוב — לא שוויון");
  assert.ok(Math.abs(crown.actual - 19.99909997918947) < 1e-12);

  const powers = verifyConstantCase(ZVI_CONSTANT_CASES[1]);
  assert.equal(powers.relation, "approximation");
  assert.ok(powers.absoluteError > 0);
  assert.ok(powers.relativeError < 0.000001);
});

test("public constants projection requires approved public live research and source rows", () => {
  const spec = ZVI_CONSTANT_CASES[0];
  const research = [{ id: spec.researchId, statement: "row", status: "approved", privacy_scope: "public" }];
  const sources = [
    { id: spec.sourceRef.split(":")[1], text: "טענת המקור", image_url: null, thumb_url: null },
    { id: spec.mediaRef.split(":")[1], text: "📷", image_url: "https://example.com/pi.jpg", thumb_url: null },
  ];
  const projection = buildZviConstantsWorldProjection(research, sources);
  assert.equal(projection.cards.length, 1);
  assert.equal(projection.cards[0].geometryLink, null);
  assert.equal(projection.cards[0].diagramKind, "constant-orbit");
  assert.equal(projection.cards[0].image, "https://example.com/pi.jpg");
  assert.equal(projection.rules.noGeometryLinkWithoutGeometry, true);
});

test("the three Human-Gate approved calculations enter the live public series without pi^e", () => {
  const approvedIds = new Set([
    "zvi-constant:pi-power-pi",
    "zvi-constant:e-power-e",
    "zvi-constant:e-power-pi",
  ]);
  const approved = ZVI_CONSTANT_CASES.filter((spec) => approvedIds.has(spec.id));
  const research = approved.map((spec) => ({
    id: spec.researchId,
    statement: `live:${spec.expression}`,
    status: "approved",
    privacy_scope: "public",
  }));
  const sourceIds = [...new Set(approved.flatMap((spec) => [spec.sourceRef, spec.mediaRef]).map((ref) => ref.split(":")[1]))];
  const projection = buildZviConstantsWorldProjection(
    research,
    sourceIds.map((id) => ({ id, text: `source:${id}`, image_url: null, thumb_url: null })),
  );
  assert.deepEqual(projection.cards.map((card) => card.id).sort(), [...approvedIds].sort());
  assert.ok(projection.cards.every((card) => card.review.publicationState === "approved"));
  assert.ok(projection.cards.every((card) => card.review.connectionStrength === "חזק לחישוב בלבד"));
  assert.ok(projection.cards.every((card) => card.review.recommendation.startsWith("מאושר כחישוב")));
  assert.ok(projection.cards.every((card) => card.geometryLink === null));
  assert.ok(!projection.cards.some((card) => card.id.includes("pi-power-e")));
});

test("candidate or non-public constants never enter the public series", () => {
  const spec = ZVI_CONSTANT_CASES[0];
  const source = [{ id: spec.sourceRef.split(":")[1], text: "source" }];
  assert.equal(buildZviConstantsWorldProjection([{ id: spec.researchId, status: "candidate", privacy_scope: "public" }], source).cards.length, 0);
  assert.equal(buildZviConstantsWorldProjection([{ id: spec.researchId, status: "approved", privacy_scope: "private" }], source).cards.length, 0);
});

test("candidate calculations are deterministic while interpretation stays separate", () => {
  const actual = Object.fromEntries(ZVI_CONSTANT_CANDIDATES.map((item) => [item.id, item.evaluate()]));
  assert.ok(Math.abs(actual["zvi-constant-candidate:pi-power-pi"] - 36.4621596072079) < 1e-12);
  assert.ok(Math.abs(actual["zvi-constant-candidate:e-power-e"] - 15.154262241479259) < 1e-12);
  assert.ok(Math.abs(actual["zvi-constant-candidate:pi-power-e"] - 22.45915771836104) < 1e-12);
  assert.ok(Math.abs(actual["zvi-constant-candidate:e-power-pi"] - 23.140692632779263) < 1e-12);
  assert.ok(ZVI_CONSTANT_CANDIDATES.every((item) => item.interpretationBoundary));
});

test("admin queue holds pi^e because ordinary rounding yields 22.46, not 22.45", () => {
  const sourceRef = "channel_updates:a7f7e28d-2aa3-4460-a65a-196e15385953";
  const queue = buildConstantAdminQueue([
    { id: "short", source_ref: sourceRef, statement: "קצר", status: "candidate", privacy_scope: "public", engine_verified: false },
    { id: "long", source_ref: `${sourceRef}#image`, statement: "הנוסח הארוך והמלא ביותר", status: "candidate", privacy_scope: "public", engine_verified: null },
  ], [{ id: sourceRef.split(":")[1], text: "מקור" }]);
  const item = queue.find((row) => row.id === "zvi-constant-candidate:pi-power-e");
  assert.equal(item.displayedValue, 22.46);
  assert.equal(item.claimMatches, false);
  assert.equal(item.promotionState, "hold");
  assert.equal(item.statement, "הנוסח הארוך והמלא ביותר");
  assert.equal(item.occurrenceCount, 1);
  assert.equal(item.findingRows, 2);
  assert.equal(item.independentSourceCount, null);
  assert.match(item.locators[0].href, /source=tzvi-opoc/);
  assert.match(item.locators[0].href, /#source-occurrence-/);
});

test("guest makes no manager read while manager gets a separate candidate queue", async () => {
  const approved = ZVI_CONSTANT_CASES[0];
  const publicClient = {
    from(table) {
      const builder = {
        select() { return builder; },
        in() {
          return Promise.resolve(table === "channel_updates"
            ? { data: [{ id: approved.sourceRef.split(":")[1], text: "מקור חי", status: "live" }], error: null }
            : { data: [{ id: approved.researchId, status: "approved", privacy_scope: "public" }], error: null });
        },
      };
      return builder;
    },
  };
  let adminReads = 0;
  const candidate = ZVI_CONSTANT_CANDIDATES[0];
  const adminClient = {
    from(table) {
      adminReads += 1;
      const builder = {
        select() { return builder; },
        in() {
          return Promise.resolve(table === "channel_updates"
            ? { data: [{ id: candidate.sourceRefs[0].split(":")[1], text: "תמונה" }], error: null }
            : { data: [{ id: "candidate-1", source_ref: candidate.sourceRefs[0], statement: "טענה", status: "candidate", privacy_scope: "public", engine_verified: false }], error: null });
        },
      };
      return builder;
    },
  };
  const guest = await fetchZviConstantsWorldProjection({ publicClient: () => publicClient, adminClient, includeAdmin: false });
  assert.equal(adminReads, 0);
  assert.equal(guest.adminQueue.length, 0);
  assert.equal(guest.access.adminQueue, "not_requested");
  const manager = await fetchZviConstantsWorldProjection({ publicClient: () => publicClient, adminClient, includeAdmin: true });
  assert.equal(adminReads, 2);
  assert.equal(manager.adminQueue.length, 1);
  assert.equal(manager.access.adminQueue, "authorized");
});

test("candidate definitions live outside the public projection bundle", () => {
  assert.match(publicModuleSource, /import\("\.\/zviConstantsAdminProjection\.js"\)/);
  assert.doesNotMatch(publicModuleSource, /a7f7e28d-2aa3-4460-a65a-196e15385953/);
  assert.doesNotMatch(publicModuleSource, /53476dee-38f5-42a7-9788-accc813eedd1/);
  assert.doesNotMatch(publicModuleSource, /22\.45/);
  assert.doesNotMatch(publicModuleSource, /לקדם את החישוב בלבד לאחר אישור/);
});
