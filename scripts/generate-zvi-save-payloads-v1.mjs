// Frozen ZVI save-payload generator (RESEARCH_2029_ADMIN_INTAKE_V1). Offline + deterministic: reuses the already-audited
// canonical parser (triage.js) over the exact-text snapshot (zviSourceTextsV1.json, md5-verified against the canonical DB)
// and the frozen admission manifest. Output is a provenance/release artifact - NOT a runtime store.
//   node scripts/generate-zvi-save-payloads-v1.mjs          -> writes src/lib/research/intake/zviSavePayloadsV1.json
//   node scripts/generate-zvi-save-payloads-v1.mjs --check  -> exits 1 if the committed artifact is stale
import fs from "node:fs";
import crypto from "node:crypto";
import { buildZviPayload } from "../src/lib/research/adminIntakeBatch.js";
import {
  ZVI_ADMISSION_MANIFEST_V1, ZVI_CONTRIBUTOR_ID, ZVI_CONTRIBUTOR_LABEL,
} from "../src/lib/research/intake/zviAdmissionManifestV1.js";

const TEXTS = new URL("../src/lib/research/intake/zviSourceTextsV1.json", import.meta.url);
const OUT = new URL("../src/lib/research/intake/zviSavePayloadsV1.json", import.meta.url);
const EXECUTABLE = ["READY_ENGINE_VERIFIED", "READY_SOURCE_ATTESTED", "READY_MIXED"];

const texts = JSON.parse(fs.readFileSync(TEXTS, "utf8"));
const entries = [];
const counts = { payloads: 0, read_only: 0, reuse: 0, blocked: 0 };
for (const e of ZVI_ADMISSION_MANIFEST_V1.entries) {
  const r = texts.rows[e.source_id];
  if (!r) throw new Error(`missing frozen text ${e.source_id}`);
  if (crypto.createHash("md5").update(r.text, "utf8").digest("hex") !== r.db_md5) throw new Error(`text md5 drift ${e.source_id}`);
  const base = { source_id: e.source_id, class: e.class, disposition: e.disposition, audit_note: e.note, text_md5: r.db_md5 };
  if (!EXECUTABLE.includes(e.disposition)) {
    counts[e.disposition === "REUSE_CLAIM_OCCURRENCE" ? "reuse" : "read_only"] += 1;
    entries.push({ ...base, save: null });
    continue;
  }
  const built = buildZviPayload(e, { id: e.source_id, channel: r.channel, credit: ZVI_CONTRIBUTOR_LABEL, contributor_id: ZVI_CONTRIBUTOR_ID, created_at: r.created_at, text: r.text });
  if (!built.ok) { counts.blocked += 1; entries.push({ ...base, save: null, blockers: built.blockers }); continue; }
  counts.payloads += 1;
  entries.push({ ...base, save: built.payload });
}
const artifact = {
  version: "ZVI_SAVE_PAYLOADS_V1",
  manifest: ZVI_ADMISSION_MANIFEST_V1.version,
  manifest_generated_at: ZVI_ADMISSION_MANIFEST_V1.generated_at,
  counts,
  entries,
};
const json = JSON.stringify(artifact, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== json) { console.error("zviSavePayloadsV1.json is stale - regenerate"); process.exit(1); }
  console.log("fresh", counts);
} else {
  fs.writeFileSync(OUT, json);
  console.log("written", counts);
}
