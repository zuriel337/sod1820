// W2.2d — bounded text/name representation expansion.
// EXTEND_EXISTING: representations are views of an existing identity, never new Person/Name truth.
// Orthography is preserved exactly; no spelling correction, plene/defective collapse or role inference.

const DEFAULT_MAX_REPRESENTATIONS = 16;
const HEBREW_UNIT_DIGITS = Object.freeze(['א','ב','ג','ד','ה','ו','ז','ח','ט']);

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function identityKey(identity, index) {
  return clean(identity?.key)
    || clean(identity?.identity_key)
    || clean(identity?.ref)
    || clean(identity?.id)
    || `identity:${index}`;
}

// ── REPRESENTATION REFERENCES MUST NOT CARRY PERSONAL TEXT ────────────────────────────────
// A representation ref is built from the PARENT IDENTITY KEY, and a caller is free to use the name
// itself as that key (a Person/Name identity commonly does). The ref then travels in the executor's
// source_refs and trace — and those are part of the capability record, which the composition
// boundary does NOT access-filter: only Findings are filtered. The observed result was a Bundle that
// correctly withheld all three personal Findings while still printing the person's name in
// source_refs and trace.
//
// So for any non-public representation the ref is derived from a stable, non-reversible digest of
// the parent key instead of the key itself. Refs stay deterministic (replay and continuation still
// work, the same identity always yields the same ref) but stop disclosing who the subject is.
// Public identities keep their readable key, which is what makes public research traces debuggable.
// FNV-1a is used deliberately: dependency-free and identical in node and the browser.
export function stableIdentityDigest(value) {
  let hash = 0x811c9dc5;
  for (const ch of String(value)) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

function refKeyFor(parentKey, accessTier) {
  return accessTier === 'public' ? parentKey : `anon:${stableIdentityDigest(parentKey)}`;
}

function wordsOf(text) {
  return clean(text)?.split(/\s+/u).map(clean).filter(Boolean) || [];
}

function roleParts(identity) {
  const meta = identity?.metadata && typeof identity.metadata === 'object' ? identity.metadata : {};
  const explicit = [];

  if (Array.isArray(meta.name_parts)) {
    for (const raw of meta.name_parts) {
      if (typeof raw === 'string') {
        const text = clean(raw);
        if (text) explicit.push({ text, role: null, role_source: 'source_unspecified' });
      } else if (raw && typeof raw === 'object') {
        const text = clean(raw.text ?? raw.value ?? raw.label);
        if (text) explicit.push({ text, role: clean(raw.role), role_source: clean(raw.role) ? 'source_declared' : 'source_unspecified' });
      }
    }
  }

  const declared = [
    ['given_name', meta.given_name ?? meta.givenName],
    ['middle_name', meta.middle_name ?? meta.middleName],
    ['family_name', meta.family_name ?? meta.familyName ?? meta.surname],
  ];
  for (const [role, raw] of declared) {
    const text = clean(raw);
    if (text && !explicit.some(x => x.text === text && x.role === role)) {
      explicit.push({ text, role, role_source: 'source_declared' });
    }
  }

  if (Array.isArray(meta.middle_names ?? meta.middleNames)) {
    for (const raw of (meta.middle_names ?? meta.middleNames)) {
      const text = clean(raw);
      if (text && !explicit.some(x => x.text === text)) explicit.push({ text, role: 'middle_name', role_source: 'source_declared' });
    }
  }

  return explicit;
}

function representationAccess(identity) {
  const tier = clean(identity?.access?.tier);
  return tier || 'public';
}

function addRepresentation(out, seen, rep, max) {
  if (out.length >= max) return;
  const text = clean(rep.text);
  if (!text) return;
  const key = `${rep.parent_identity_key}|${rep.kind}|${rep.role || ''}|${text}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(Object.freeze({ ...rep, text }));
}

/**
 * Expand already-resolved identities into a bounded representation set.
 *
 * Rules:
 * - exact full expression is always preserved when eligible;
 * - each token is available separately only when the expression actually has multiple tokens;
 * - given/family roles are used only when supplied by the source/user metadata;
 * - whitespace alone NEVER fabricates surname/given-name roles;
 * - arbitrary permutations/subsets are deliberately absent.
 */
export function expandResearchTextRepresentations(identityResolution, { maxRepresentations = DEFAULT_MAX_REPRESENTATIONS } = {}) {
  const max = Math.max(1, Math.min(Number(maxRepresentations) || DEFAULT_MAX_REPRESENTATIONS, 32));
  const out = [];
  const seen = new Set();
  const identities = Array.isArray(identityResolution?.identities) ? identityResolution.identities : [];
  const textAllowed = identityResolution?.text_calculation_allowed !== false;

  identities.forEach((identity, index) => {
    const type = clean(identity?.type) || 'entity';
    const parentKey = identityKey(identity, index);
    const accessTier = representationAccess(identity);
    // Everything that can leave the executor uses this, never the raw parent key.
    const refKey = refKeyFor(parentKey, accessTier);
    const label = clean(identity?.label ?? identity?.value);
    const isNativeText = type === 'phrase' || type === 'word';
    const isNameLike = type === 'name' || type === 'person';
    if (!label || (!isNativeText && !(isNameLike && textAllowed))) return;

    const fullKind = type === 'word' ? 'word' : isNameLike ? 'full_name' : 'phrase';
    addRepresentation(out, seen, {
      ref: `repr:${refKey}:full`,
      parent_identity_key: refKey,
      parent_identity_type: type,
      kind: fullKind,
      role: isNameLike ? 'full_name' : null,
      role_source: isNameLike ? 'representation' : null,
      text: label,
      token_index: null,
      component_refs: [],
      access_tier: accessTier,
      primary_for_identity: true,
    }, max);

    const explicitParts = isNameLike ? roleParts(identity) : [];
    if (explicitParts.length) {
      explicitParts.forEach((part, partIndex) => {
        // If the only declared part is text-identical to the full expression, the full
        // representation already gives the engine the same input. Do not double-count it.
        if (explicitParts.length === 1 && part.text === label) return;
        addRepresentation(out, seen, {
          ref: `repr:${refKey}:part:${partIndex + 1}`,
          parent_identity_key: refKey,
          parent_identity_type: type,
          kind: 'name_part',
          role: part.role || `word_${partIndex + 1}`,
          role_source: part.role_source,
          text: part.text,
          token_index: partIndex,
          component_refs: [],
          access_tier: accessTier,
          primary_for_identity: false,
        }, max);
      });

      const given = explicitParts.filter(x => x.role === 'given_name').map(x => x.text);
      const family = explicitParts.filter(x => x.role === 'family_name').map(x => x.text);
      if (given.length && family.length) {
        const combined = `${given.join(' ')} ${family.join(' ')}`;
        if (combined !== label) {
          addRepresentation(out, seen, {
            ref: `repr:${refKey}:given-family`,
            parent_identity_key: refKey,
            parent_identity_type: type,
            kind: 'name_combination',
            role: 'given_family',
            role_source: 'source_declared_roles',
            text: combined,
            token_index: null,
            component_refs: ['given_name', 'family_name'],
            access_tier: accessTier,
            primary_for_identity: false,
          }, max);
        }
      }
    } else {
      // Tokenization is a representation fact only. Do not infer "first name" or "surname".
      const words = wordsOf(label);
      if (words.length > 1) {
        words.forEach((word, tokenIndex) => {
          addRepresentation(out, seen, {
            ref: `repr:${refKey}:word:${tokenIndex + 1}`,
            parent_identity_key: refKey,
            parent_identity_type: type,
            kind: isNameLike ? 'name_part' : 'word_part',
            role: `word_${tokenIndex + 1}`,
            role_source: 'whitespace_position_only',
            text: word,
            token_index: tokenIndex,
            component_refs: [],
            access_tier: accessTier,
            primary_for_identity: false,
          }, max);
        });
      }
    }
  });

  return Object.freeze(out);
}

/**
 * How many representations the identity set WOULD have produced, so a bounded result can report
 * truncation truthfully instead of inferring it from "the budget is full".
 */
export function representationOverflow(identityResolution, produced, maxRepresentations = DEFAULT_MAX_REPRESENTATIONS) {
  const cap = Math.max(1, Math.min(Number(maxRepresentations) || DEFAULT_MAX_REPRESENTATIONS, 32));
  // Re-expand with the hard ceiling: anything beyond `cap` is what the budget actually cut.
  const unbounded = expandResearchTextRepresentations(identityResolution, { maxRepresentations: 32 });
  const available = unbounded.length;
  const returned = Array.isArray(produced) ? produced.length : 0;
  return { available, returned, cap, truncated: available > returned };
}

/**
 * Bounded structural control for Hebrew numeral-unit suffixes.
 * This is REPRESENTATION-level only: it does not claim a Year identity.
 * Example: תשפו + תשפז -> controls תשפא..תשפט.
 */
export function hebrewUnitSuffixControlSet(representations, { maxControls = 9 } = {}) {
  const anchors = (Array.isArray(representations) ? representations : [])
    .filter(x => x?.primary_for_identity === true)
    .map(x => clean(x?.text))
    .filter(Boolean);
  const unique = [...new Set(anchors)];
  if (unique.length < 2) return null;
  const chars = unique.map(x => Array.from(x));
  const len = chars[0].length;
  if (len < 2 || chars.some(x => x.length !== len)) return null;
  const prefix = chars[0].slice(0, -1).join('');
  if (!prefix || chars.some(x => x.slice(0, -1).join('') !== prefix)) return null;
  const suffixes = chars.map(x => x[x.length - 1]);
  if (suffixes.some(x => !HEBREW_UNIT_DIGITS.includes(x))) return null;

  const limit = Math.max(2, Math.min(Number(maxControls) || 9, HEBREW_UNIT_DIGITS.length));
  return Object.freeze({
    kind: 'hebrew_unit_suffix_structural_control',
    prefix,
    anchors: unique,
    controls: HEBREW_UNIT_DIGITS.slice(0, limit).map(ch => `${prefix}${ch}`),
    semantic_identity_claimed: false,
  });
}

export default expandResearchTextRepresentations;
