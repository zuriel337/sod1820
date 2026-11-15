// PREPARED, NOT ACTIVE (ZURIEL 15.11.2026, Phase 3): the pure, client-side half of the eventual canonical save of ONE unit through the existing Post owner.
// It READS two versions of `posts.content` and a new unit fragment and answers "may this replace exactly that unit, and nothing else?". It performs no
// network call, imports no Supabase client and is imported by no UI: nothing in the Preview can write with it.
//
// What it guarantees before ANY future write: (1) the latest body is byte-identical to the snapshot the editor started from (otherwise it is a CONFLICT
// and nothing is produced); (2) the unit exists as exactly one <section id="<unitId>"> (any depth) in the latest body; (3) the new fragment keeps the
// unit id, every anchor id, every link and every media source of the old fragment, and contains nothing executable; (4) the result differs from the
// latest body only inside that section; (5) the previous body is returned so it can be stored independently of the throttled `post_revisions` trigger.
//
// What it CANNOT guarantee (so it is not activated): atomicity. The existing writers (`adminUpdatePost`, RPC `admin_save_post`) overwrite the whole
// `content` with no expected-version parameter and no row lock, so a check here is only advisory — another writer can land between the check and the
// write. The server-side half needs a separate Human Gate (see docs/reviews/unified-unit-editor-20261115/CANONICAL_SAVE_PLAN.md).

export async function contentSha256(text) {
  const bytes = new TextEncoder().encode(String(text ?? ""));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SECTION_TAG = /<\/?section\b[^>]*>/gi;
const idOf = (tag) => (tag.match(/\sid="([^"]+)"/) || [])[1] || null;

// every <section> of the body at ANY depth, with its exact character span (in Post 5107 five of the six units are nested inside the main section)
export function allSections(content) {
  const out = [];
  const stack = [];
  for (const m of String(content ?? "").matchAll(SECTION_TAG)) {
    if (m[0][1] === "/") {
      const open = stack.pop();
      if (!open) return { ok: false, code: "unbalanced_sections", sections: out };
      out.push({ id: open.id, depth: stack.length, start: open.start, end: m.index + m[0].length });
    } else stack.push({ id: idOf(m[0]), start: m.index });
  }
  out.sort((x, y) => x.start - y.start);
  return stack.length === 0 ? { ok: true, sections: out } : { ok: false, code: "unbalanced_sections", sections: out };
}
export const topLevelSections = allSections;

export function locateUnitFragment(content, unitId) {
  const found = allSections(content);
  if (!found.ok) return { ok: false, code: found.code };
  const hits = found.sections.filter((s) => s.id === unitId);
  if (hits.length === 0) return { ok: false, code: "unit_not_published" };          // e.g. the Preview-only unit: it is not in posts.content yet
  if (hits.length > 1) return { ok: false, code: "unit_ambiguous" };
  return { ok: true, ...hits[0], html: content.slice(hits[0].start, hits[0].end), sections: found.sections };
}

const UNSAFE = [/<\s*script\b/i, /<\s*iframe\b/i, /<\s*object\b/i, /<\s*embed\b/i, /\son[a-z]+\s*=/i, /javascript\s*:/i, /expression\s*\(/i, /<\s*base\b/i, /<\s*form\b/i, /srcdoc\s*=/i];
const attrValues = (html, attr) => [...html.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, "gi"))].map((m) => m[1]);
export function inspectFragment(html) {
  return {
    ids: new Set(attrValues(html, "id")),
    links: new Set(attrValues(html, "href")),
    media: new Set([...attrValues(html, "src"), ...attrValues(html, "poster")]),
    unsafe: UNSAFE.filter((re) => re.test(html)).map((re) => re.source),
  };
}

export async function planUnitFragmentUpdate({ snapshot, latest, unitId, newFragmentHtml } = {}) {
  const reject = (code, detail = {}) => ({ ok: false, code, ...detail });
  if (!snapshot || typeof snapshot.content !== "string" || !latest || typeof latest.content !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,120}$/.test(String(unitId))) return reject("bad_input");
  const [snapshotSha, latestSha] = await Promise.all([contentSha256(snapshot.content), contentSha256(latest.content)]);
  if (snapshotSha !== latestSha) return reject("conflict", { snapshotSha, latestSha });           // another writer changed the Post: nothing is overwritten
  const located = locateUnitFragment(latest.content, unitId);
  if (!located.ok) return reject(located.code);
  const next = String(newFragmentHtml ?? "").trim();
  const opening = next.match(/^<section\b[^>]*>/i);
  if (!opening || idOf(opening[0]) !== unitId || !/<\/section>\s*$/i.test(next)) return reject("fragment_not_the_unit");
  const own = allSections(next);
  if (!own.ok || own.sections.length !== 1) return reject("fragment_not_one_section");
  const before = inspectFragment(located.html), after = inspectFragment(next);
  if (after.unsafe.length) return reject("unsafe_markup", { unsafe: after.unsafe });
  const lost = (label, a, b) => [...a].filter((value) => !b.has(value)).map((value) => ({ label, value }));
  const dropped = [...lost("anchor", before.ids, after.ids), ...lost("link", before.links, after.links), ...lost("media", before.media, after.media)];
  if (dropped.length) return reject("dropped_identity", { dropped });
  const newContent = latest.content.slice(0, located.start) + next + latest.content.slice(located.end);
  const check = allSections(newContent);
  const idsBefore = located.sections.map((s) => s.id), idsAfter = check.sections.map((s) => s.id);
  if (!check.ok || idsBefore.join("|") !== idsAfter.join("|")) return reject("other_units_changed");
  if (newContent.slice(0, located.start) !== latest.content.slice(0, located.start) || newContent.slice(newContent.length - (latest.content.length - located.end)) !== latest.content.slice(located.end)) return reject("outside_changed");
  return {
    ok: true,
    unitId,
    newContent,
    newSha256: await contentSha256(newContent),
    expectedSha256: latestSha,                                   // what a server-side compare-and-set must check
    previous: { sha256: latestSha, content: latest.content },    // store independently: the revision trigger is throttled (one snapshot per 10 minutes)
    changedChars: { removed: located.html.length, added: next.length },
    atomic: false,
  };
}
