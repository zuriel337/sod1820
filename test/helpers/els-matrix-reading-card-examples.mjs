// Builds the example responses a card is developed against. Every example is TEST DATA: the stream window, the model answer and the engine replays are the
// recorded EXP-18 run C3 (Columbia axis, 23x41), served through fakes. They are never a product reading and never a verified finding of a real run.
import { writeFileSync, mkdirSync } from "node:fs";
import { AXIS, WINDOW23, call, message, req, world } from "./els-matrix-reading-world.mjs";

const wrap = (name, response) => ({
  _fixture: { name, is_test_fixture: true, source: "recorded EXP-18 run C3 (window, model answer, engine replays) served through fakes; not a live reading", note: "a real response has is_test_fixture:false" },
  response: { ...response, is_test_fixture: true },
});

export async function buildCardExamples() {
  const ack = 3;
  const preview = (await call(world(), req("preview"))).body;
  const wCreate = world();
  const created = (await call(wCreate, req("create", { ack_upper_bound_usd: ack }))).body;
  const running = (await call(world({ batchState: "in_progress" }), { els_matrix_reading: { contract: "els_matrix_reading_request_v1", op: "status", job_token: created.job.token } })).body;
  const complete = (await call(world({ batchState: "ended" }), { els_matrix_reading: { contract: "els_matrix_reading_request_v1", op: "status", job_token: created.job.token } }, { now: Date.parse("2026-10-29T10:04:00.000Z") })).body;
  const cut = (await call(world({ batchState: "ended", result: { type: "succeeded", message: message({ stopReason: "max_tokens", text: "{\"findings\":[" }) } }), { els_matrix_reading: { contract: "els_matrix_reading_request_v1", op: "status", job_token: created.job.token } }, { now: Date.parse("2026-10-29T10:04:00.000Z") })).body;
  const denied = (await call(world(), req("preview"), { tier: "user" })).body;
  return {
    "preview.json": wrap("preview", preview),
    "running.json": wrap("running", running),
    "complete.json": wrap("complete", complete),
    "incomplete-max-tokens.json": wrap("incomplete-max-tokens", cut),
    "error-admin-only.json": wrap("error-admin-only", denied),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL("../fixtures/els-matrix-reading/card-examples/", import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const [name, value] of Object.entries(await buildCardExamples())) writeFileSync(new URL(name, dir), `${JSON.stringify(value, null, 2)}\n`);
  console.log("card examples written");
}
