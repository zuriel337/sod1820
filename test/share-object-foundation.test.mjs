// W1 Slice 2 — Share Object / Intent foundation (Scope B/D/E/F).
import assert from "node:assert/strict";
import {
  createShareIntent, resolveModality, shareEvidence, buildShareMeta,
  SHARE_SUBTYPES, SHARE_MODALITIES, SHARE_EXTENSION_SEAMS,
} from "../src/lib/share/shareObject.js";

// --- locked telemetry family: exactly two subtypes, not ours to extend ---
assert.deepEqual(SHARE_SUBTYPES, ["share", "share_story"]);
assert.equal(createShareIntent({ subtype: "share_story" }).subtype, "share_story");
assert.equal(createShareIntent({ subtype: "invented_subtype" }).subtype, "share",
  "an unknown subtype must fall back, never be minted");

// --- an empty call still yields a valid link share (backward compatibility) ---
const bare = createShareIntent();
assert.equal(bare.modality, "link");
assert.equal(bare.subtype, "share");
assert.equal(bare.entity.type, null);
assert.equal(bare.entity.canonicalUrl, null);

// --- legacy prop names keep working alongside the new ones ---
assert.equal(createShareIntent({ type: "number" }).entity.type, "number");
assert.equal(createShareIntent({ entityType: "number" }).entity.type, "number");
assert.equal(createShareIntent({ url: "/number/1820" }).entity.canonicalUrl, "/number/1820");

// --- normalization: whitespace-only is null, not "" ---
assert.equal(createShareIntent({ type: "   " }).entity.type, null);
assert.equal(createShareIntent({ locale: " HE " }).locale, "he");

// --- Scope F: honest capability resolution -------------------------------
const withImage = createShareIntent({ image: "https://x/card.png", modality: "image_file" });
// platform CAN share files -> the request stands
assert.deepEqual(resolveModality(withImage, { canShareFile: true }).modality, "image_file");
// platform CANNOT -> degrade to link, and say so honestly
const degraded = resolveModality(withImage, { canShareFile: false });
assert.equal(degraded.modality, "link");
assert.equal(degraded.degradedFrom, "image_file");
assert.equal(degraded.reason, "platform_cannot_share_files");
// asked for a file share but there is no media at all
const noMedia = resolveModality(createShareIntent({ modality: "image_file" }), { canShareFile: true });
assert.equal(noMedia.modality, "link");
assert.equal(noMedia.reason, "no_media");
// a card without an image is still a link, not a broken card
assert.equal(resolveModality(createShareIntent({ modality: "card" }), {}).modality, "link");
// every modality carries the canonical link — that is the whole point of attribution
for (const m of Object.values(SHARE_MODALITIES)) assert.equal(m.carriesLink, true);

// --- Scope B: extension seams are declared, not implemented ---
for (const [name, seam] of Object.entries(SHARE_EXTENSION_SEAMS)) {
  assert.equal(seam.status, "SEAM_ONLY", `${name} must remain a seam in this slice`);
  assert.ok(seam.needs, `${name} must name what it still needs`);
}

// --- evidence: only known facts, never fabricated ---
const full = createShareIntent({
  entityType: "number", entityId: "1820", url: "https://sod1820.co.il/number/1820",
  sourceSurface: "EntityPage", channel: "whatsapp", locale: "he",
  image: "https://x/card.png", modality: "image_file",
  exactState: { skip: 7 },
});
const ev = shareEvidence(full, resolveModality(full, { canShareFile: false }));
assert.equal(ev.entity_type, "number");
assert.equal(ev.entity_id, "1820");
assert.equal(ev.source_surface, "EntityPage");
assert.equal(ev.channel, "whatsapp");
assert.equal(ev.modality, "link", "evidence records what actually happened");
assert.equal(ev.modality_requested, "image_file", "…and what was asked for");
assert.equal(ev.has_exact_state, true);
// unknown facts are absent, not null — no fabricated attribution
const thin = shareEvidence(createShareIntent({ channel: "copy" }));
assert.ok(!("entity_id" in thin), "unknown entity id must be omitted entirely");
assert.ok(!("source_surface" in thin));
assert.ok(!("has_exact_state" in thin));

// --- Scope D: identity/entitlement context is carried opaquely, never interpreted ---
const rewarded = createShareIntent({ context: { tier: "premium", campaign: "x" } });
assert.deepEqual(rewarded.context, { tier: "premium", campaign: "x" });
const evNoBusiness = shareEvidence(rewarded);
for (const k of Object.keys(evNoBusiness)) {
  assert.ok(!/credit|reward|amount|tier|referral/i.test(k), `evidence must carry no business rule (${k})`);
}

// --- Scope E: locale never forks the entity or the URL ---
const he = createShareIntent({ url: "https://sod1820.co.il/number/1820", locale: "he" });
const en = createShareIntent({ url: "https://sod1820.co.il/number/1820", locale: "en" });
assert.equal(he.entity.canonicalUrl, en.entity.canonicalUrl, "one entity, one canonical URL per locale");

// --- Scope C: LEGACY PAYLOAD IS BYTE-IDENTICAL -----------------------------
// This is the contract with the Analytics workstream. Without an intent, the meta must
// be exactly what the pre-Slice-2 producer emitted — same keys, same values, no extras.
// Assert on the SERIALIZED shape: undefined-valued keys exist in memory but never reach
// the wire or the database, and the wire is what the Analytics workstream reads.
const wireKeys = (m) => Object.keys(JSON.parse(JSON.stringify(m)));
const legacy = buildShareMeta({ channel: "whatsapp", url: "https://sod1820.co.il/number/1820", image: null, contentType: "number" });
assert.deepEqual(wireKeys(legacy), ["platform", "content_type", "url"]);
assert.equal(legacy.platform, "whatsapp");
assert.equal(legacy.content_type, "number");
assert.equal(legacy.url, "https://sod1820.co.il/number/1820");
assert.equal(legacy.image, undefined, "absent image must be undefined (absent key), not null");
assert.equal(JSON.stringify(legacy), JSON.stringify({ platform: "whatsapp", content_type: "number", url: "https://sod1820.co.il/number/1820" }),
  "serialized legacy payload must be unchanged");

// with an image, exactly as before
assert.equal(buildShareMeta({ channel: "image", url: "u", image: "https://x/c.png", contentType: "number" }).image, "https://x/c.png");

// with evidence: legacy keys untouched, one additive namespaced key only
const enriched = buildShareMeta({ channel: "whatsapp", url: "u", contentType: "number", evidence: ev });
assert.deepEqual(wireKeys(enriched), ["platform", "content_type", "url", "share_object"],
  "the ONLY addition may be share_object");
assert.equal(enriched.platform, "whatsapp");
assert.equal(enriched.content_type, "number");
assert.equal(enriched.url, "u");
// empty evidence must not even create the key
assert.ok(!wireKeys(buildShareMeta({ channel: "copy", url: "u", evidence: {} })).includes("share_object"));

// --- both existing producers keep their OWN exact serialized payload -------
// ShareActions has always sent url (+image when present) and never content_id.
const saMeta = buildShareMeta({ channel: "telegram", url: "https://sod1820.co.il/x", contentType: "post" });
assert.equal(JSON.stringify(saMeta), JSON.stringify({ platform: "telegram", content_type: "post", url: "https://sod1820.co.il/x" }));
// QuickActions has always sent content_id and never url/image.
const qaMeta = buildShareMeta({ channel: "copy", contentType: "number", contentId: "1820" });
assert.equal(JSON.stringify(qaMeta), JSON.stringify({ platform: "copy", content_type: "number", content_id: "1820" }),
  "QuickActions payload must serialize exactly as before — no url, no image key");
// a null content_id is still emitted (that is what the producer did)
assert.equal(JSON.stringify(buildShareMeta({ channel: "copy", contentType: null, contentId: null })),
  JSON.stringify({ platform: "copy", content_type: null, content_id: null }));
// omitting content_id entirely must not introduce the key
assert.ok(!wireKeys(buildShareMeta({ channel: "copy", url: "u", contentType: "post" })).includes("content_id"));

console.log("share-object-foundation: ok");
