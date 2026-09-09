// 🔗 Share Object / Intent — W1 Slice 2 foundation (Scope B/E/F).
//
// ⛔ NOT AN OWNER, NOT A STORE. This module holds zero state and performs no I/O.
// It is a pure normalizer that turns "what is being shared, from where, how" into one
// typed value, so every surface (Number, Post, Video, 3D, Journey…) describes a share
// the same way instead of each screen inventing its own argument shape.
//
// Execution still belongs to the existing owners: share.js performs the share,
// propagation.js produces the attributed URL, ShareActions renders the controls,
// /api/og + /api/card produce the representation. This file only describes.
//
// Dependency-free on purpose (React-free, no imports) so it is unit-testable and can
// never quietly become a provider.

// The telemetry family is LOCKED by SHARE_ATTRIBUTION_CONTRACT_SYNC. These are the only
// two subtypes; they are not ours to extend.
export const SHARE_SUBTYPES = ["share", "share_story"];

// HOW the thing travels. Distinct from the channel (WHERE it travels).
// The existing producer conflates these — an image share historically emits
// meta.platform="image" — and that is deliberately NOT corrected here, because changing
// it would alter analytics interpretation, which is the Analytics owner's decision.
export const SHARE_MODALITIES = {
  link: { id: "link", carriesLink: true, needsFileShare: false },
  card: { id: "card", carriesLink: true, needsFileShare: false },   // link + rich OG/card representation
  image_file: { id: "image_file", carriesLink: true, needsFileShare: true },
};

// Bounded extension seams — DECLARED, deliberately NOT implemented in this slice.
// Each names the owner that would have to supply the state before it can be built, so a
// later slice extends rather than invents. Listing one here is not permission to ship it.
export const SHARE_EXTENSION_SEAMS = {
  video_file: { status: "SEAM_ONLY", needs: "media owner + platform file-share capability" },
  clip: { status: "SEAM_ONLY", needs: "clip/trim owner (does not exist yet)" },
  state_capture: { status: "SEAM_ONLY", needs: "3D/ELS surface must expose exact state + poster" },
  journey_point: { status: "SEAM_ONLY", needs: "journey_saves position identity" },
  research_finding: { status: "SEAM_ONLY", needs: "research_objects finding identity + access gate" },
  embed: { status: "SEAM_ONLY", needs: "embeddable route contract" },
};

const clean = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
};

// Locale is representation only (Scope E): one share identity, one canonical entity.
// A locale never forks the URL or the entity.
const cleanLocale = (v) => {
  const s = clean(v);
  return s ? s.toLowerCase() : null;
};

/**
 * Normalize a share request into one typed Share Intent.
 * Every field is optional; callers that pass nothing still get a valid link share, which
 * is what keeps every existing ShareActions call site working unchanged.
 */
export function createShareIntent(input = {}) {
  const entityType = clean(input.entityType ?? input.type);
  const entityId = clean(input.entityId ?? input.id);
  const canonicalUrl = clean(input.canonicalUrl ?? input.url);
  const subtype = SHARE_SUBTYPES.includes(input.subtype) ? input.subtype : "share";
  const requested = SHARE_MODALITIES[input.modality] ? input.modality : "link";

  return {
    // WHAT — canonical identity. One entity, one URL, regardless of locale or channel.
    entity: { type: entityType, id: entityId, canonicalUrl },
    // WHERE FROM — the surface that initiated the share (evidence for attribution).
    sourceSurface: clean(input.sourceSurface),
    // WHICH FAMILY — locked vocabulary.
    subtype,
    // WHERE TO — resolved per action, may be null until the user picks a channel.
    channel: clean(input.channel),
    // HOW — requested representation; the actual one is resolved against real capability.
    modality: requested,
    // Representation inputs. Media is referenced, never embedded or re-encoded here.
    title: clean(input.title),
    text: clean(input.text),
    media: {
      image: clean(input.image),
      video: clean(input.video),
      poster: clean(input.poster),
    },
    locale: cleanLocale(input.locale),
    // Exact-state deep link, supplied by the surface's own owner when it has one
    // (system frame v2 §5 return_exact). Never synthesized here.
    exactState: input.exactState && typeof input.exactState === "object" ? { ...input.exactState } : null,
    // Scope D: identity/entitlement/campaign are carried as OPAQUE context so a future
    // rewards consumer can attach to a share. No business rule, no reward, no tier gate,
    // and no assumption that a share implies a human.
    context: input.context && typeof input.context === "object" ? { ...input.context } : null,
  };
}

/**
 * Scope F — honest capability resolution.
 * Returns the modality that will ACTUALLY be used plus whether it degraded, so the UI can
 * tell the truth instead of offering a control that silently does something else.
 * `capabilities` is injected (never probed here) to keep this module pure.
 */
export function resolveModality(intent, capabilities = {}) {
  const wanted = SHARE_MODALITIES[intent?.modality] ? intent.modality : "link";
  const spec = SHARE_MODALITIES[wanted];
  const canFile = Boolean(capabilities.canShareFile);
  const hasImage = Boolean(intent?.media?.image);

  if (wanted === "image_file" && (!canFile || !hasImage)) {
    // Degrade to a link share that still carries the canonical attributed URL.
    // The old "video must always be link-only" rule is a DEFAULT here, not a law:
    // a platform that supports file share can carry media, and one that does not falls
    // back to the link — which is the behavior that actually brings people to the site.
    return { modality: "link", degradedFrom: wanted, reason: !hasImage ? "no_media" : "platform_cannot_share_files" };
  }
  if (wanted === "card" && !hasImage) {
    return { modality: "link", degradedFrom: wanted, reason: "no_card_image" };
  }
  return { modality: wanted, degradedFrom: null, reason: null, carriesLink: spec.carriesLink };
}

/**
 * The evidence an attributed share should preserve. Returned as a plain object so the
 * telemetry layer decides how to emit it — this module never talks to the network.
 * Null/empty fields are dropped so the payload stays small and honest about what is known.
 */
export function shareEvidence(intent, resolved = null) {
  const out = {
    entity_type: intent?.entity?.type || null,
    entity_id: intent?.entity?.id || null,
    canonical_url: intent?.entity?.canonicalUrl || null,
    source_surface: intent?.sourceSurface || null,
    subtype: intent?.subtype || null,
    channel: intent?.channel || null,
    modality: resolved?.modality || intent?.modality || null,
    modality_requested: resolved?.degradedFrom || null,
    modality_degraded_reason: resolved?.reason || null,
    locale: intent?.locale || null,
    has_exact_state: intent?.exactState ? true : null,
  };
  for (const k of Object.keys(out)) if (out[k] == null) delete out[k];
  return out;
}

/**
 * Build the `meta` payload of the canonical share event.
 *
 * Lives in this pure module (rather than beside the emit call) so the exact payload shape
 * is unit-testable without a network, a Supabase client or a DOM — which is what lets the
 * byte-identical-legacy-fields guarantee be proven by a test instead of asserted in prose.
 *
 * The first four keys are the LEGACY CONTRACT that analytics reads today. They are
 * produced here exactly as the pre-Slice-2 producer produced them, including
 * `image: undefined` when there is no image (an absent key, not a null one).
 * `share_object` is the only addition and is additive/non-canonical.
 */
export function buildShareMeta({ channel, url, image = null, contentType = null, contentId, evidence = null } = {}) {
  return {
    platform: channel,
    content_type: contentType,
    // `url`/`image`/`content_id` are set to undefined when a producer never emitted them.
    // An undefined value is dropped on serialization, so each existing producer keeps its
    // OWN exact payload shape — ShareActions has always sent url, QuickActions has always
    // sent content_id and no url, and routing both through this builder changes neither.
    url,
    image: image || undefined,
    content_id: contentId,
    ...(evidence && Object.keys(evidence).length ? { share_object: evidence } : null),
  };
}
