// M0-C / DEF-004 contract: every client path builder that uploads into Storage bucket `gallery` produces names the proposed policies admit
// (supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql), dormant helpers stay admin-only, the 120 MiB ceiling sits above
// every client cap, and administrators keep a path for larger files through the existing media-upload-intent gateway.
// The path templates below are the exact source expressions; the test fails if a builder changes, so the policy and the builder move together.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { COMMUNITY_UPLOAD_POLICY } from "../src/lib/community/communityUploadPolicy.js";
import { AVATAR_UPLOAD_POLICY, ownedProfileAvatarUrl } from "../src/lib/userCenter/avatarPolicy.js";
import { buildUploadIntent, MIME_POLICY } from "../supabase/functions/media-upload-intent/contract.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const PROPOSAL = "supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql";
const ROLLBACK = "supabase/proposed/ROLLBACK_20261106130000_def004_gallery_storage_upload_policies.sql";
const sql = read(PROPOSAL);
const CEILING = 125829120;
const UID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

// --- policy patterns, parsed from the proposal ------------------------------------------------------------------------------------
function policyBody(name) {
  const start = sql.indexOf(`create policy ${name} on storage.objects`);
  assert.ok(start >= 0, `policy ${name} exists in the proposal`);
  return sql.slice(start, sql.indexOf(";\n", start)).replace(/--[^\n]*/g, "");
}
function patterns(name) {
  const body = policyBody(name);
  const out = [];
  for (const m of body.matchAll(/name ~\* (\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)|'(?:[^']|'')*')/g)) {
    const expr = m[1].startsWith("(") ? m[1].slice(1, -1) : m[1];
    const pieces = [...expr.matchAll(/'((?:[^']|'')*)'|\(select auth\.uid\(\)\)::text/g)];
    assert.equal(expr.replace(/'((?:[^']|'')*)'|\(select auth\.uid\(\)\)::text/g, "").replace(/\|\||\s/g, ""), "", `only literals and auth.uid() in ${name}`);
    out.push((uid) => new RegExp(pieces.map((p) => (p[1] !== undefined ? p[1].replace(/''/g, "'") : uid)).join(""), "i"));
  }
  return out;
}
const flat = patterns("gallery_flat_image_upload_v1");
const scoped = patterns("gallery_client_upload_scoped_v1");
// The RESTRICTIVE policy from supabase/migrations/20261031090008_community_authenticated_media_paths_v1.sql (unchanged by the proposal).
const restrictive = (name, uid) => !name.startsWith("community/")
  || (!/\.(mp4|webm|mov)$/i.test(name) && !/^community\/[0-9a-f-]{36}\//i.test(name))
  || (!!uid && new RegExp(`^community/${uid}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp|gif|pdf|txt|docx|mp4|webm|mov)$`, "i").test(name));
const anonAllows = (name) => flat.some((p) => p().test(name)) && restrictive(name, null);
const memberAllows = (name, uid) => [...flat.map((p) => p()), ...scoped.map((p) => p(uid))].some((re) => re.test(name)) && restrictive(name, uid);

// --- the real client path builders (exact source expressions) ---------------------------------------------------------------------
const EXT_DQ = '(file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"';
const EXT_F = '(f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"';
const EXT_SQ = "(file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'";
const RASTER = ["jpg", "jpeg", "png", "webp", "gif", "avif"];
const ROUTES = [
  { id: "R1", file: "src/components/ReportHint.jsx", ext: EXT_DQ, path: "`community/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`",
    actors: ["anon", "member"], allowed: RASTER, denied: ["svg", "html", "heic", "pdf", "mp4"] },
  { id: "R2", file: "src/lib/community/communityAttachments.js", path: "`community/${data.user.id}/${crypto.randomUUID()}.${validated.extension}`",
    actors: ["member"], allowed: Object.values(COMMUNITY_UPLOAD_POLICY.types).flatMap((t) => t.extensions), denied: ["svg", "html", "avif", "exe"] },
  { id: "R3", file: "src/components/ProfileSettings.jsx", ext: EXT_F, path: "`avatars/${user.id}-${Date.now()}.${ext}`",
    actors: ["member"], allowed: [...Object.values(AVATAR_UPLOAD_POLICY.types).flat(), "avif"], denied: ["svg", "html", "heic"] },
  { id: "R4", file: "src/components/TzofenEmbed.jsx", path: "`sod1820/ciphers/c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.png`",
    actors: ["member"], allowed: ["png"], denied: [] },
  { id: "R5", file: "src/lib/hints.js", ext: EXT_DQ, path: '`sod1820/hints/${user?.id || "anon"}/${Date.now()}-${Math.round(Math.random() * 1e5)}.${ext}`',
    actors: [], allowed: [], denied: ["jpg", "png"], dormant: "uploadHintImage" },
  { id: "R6", file: "src/lib/supabase.js", path: "`sod1820/${keyHint}-thumbs/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`",
    actors: [], allowed: [], denied: ["jpg"], dormant: "broadcastChannelUpdate", keyHints: ["broadcast", "or-geula", "channel"] },
  { id: "R7", file: "src/lib/supabase.js", ext: EXT_SQ, path: "`sod1820/replaced/${Date.now()}-${Math.round(Math.random() * 1e5)}.${ext}`",
    actors: [], allowed: [], denied: ["jpg", "png"], dormant: "uploadGalleryImage" },
];
function samples(route, extension, n = 150) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const now = Date.now() + Math.floor(Math.random() * 315576000000); // up to ten years ahead: still 13 digits
    const ctx = { Math, crypto: globalThis.crypto, Date: { now: () => now }, user: { id: UID }, data: { user: { id: UID } }, validated: { extension },
      keyHint: route.keyHints ? route.keyHints[i % route.keyHints.length] : undefined };
    ctx.ext = route.ext ? vm.runInNewContext(route.ext, { file: { name: `photo.${extension}` }, f: { name: `photo.${extension}` } }) : extension;
    out.push(vm.runInNewContext(route.path, ctx));
  }
  return out;
}

test("each gallery path builder is still the exact expression this contract (and the policy) was written for", () => {
  for (const route of ROUTES) {
    const source = read(route.file);
    assert.ok(source.includes(route.path), `${route.id}: ${route.file} no longer builds ${route.path}; update DEF-004 and this test together`);
    if (route.ext) assert.ok(source.includes(`const ext = ${route.ext};`), `${route.id}: extension expression changed in ${route.file}`);
  }
});

test("every mounted client route produces names the proposed policies admit, for each file type the client accepts", () => {
  for (const route of ROUTES.filter((r) => r.actors.length)) {
    for (const extension of route.allowed) {
      for (const name of samples(route, extension)) {
        if (route.actors.includes("anon")) assert.ok(anonAllows(name), `${route.id} anon: ${name}`);
        assert.ok(memberAllows(name, UID), `${route.id} signed-in: ${name}`);
        if (!route.actors.includes("anon")) assert.ok(!anonAllows(name), `${route.id} must not be open to anon: ${name}`);
        if (/^(community\/[0-9a-f-]{36}\/|avatars\/)/.test(name)) assert.ok(!memberAllows(name, OTHER), `${route.id} another account: ${name}`);
      }
    }
    for (const extension of route.denied) {
      for (const name of samples(route, extension, 20)) assert.ok(!memberAllows(name, UID), `${route.id} type ${extension} must be refused: ${name}`);
    }
  }
});

test("dormant helpers have no caller and their paths are admin-only", () => {
  const SCAN = ["src", "public-reading-deploy", "api", "server", "public"];
  const files = [];
  const walk = (p) => {
    const full = path.join(root, p);
    if (!fs.existsSync(full)) return;
    if (fs.statSync(full).isFile()) { if (/\.(js|jsx|mjs|ts|html)$/.test(p) && !/\.test\./.test(p)) files.push(p); return; }
    for (const e of fs.readdirSync(full)) if (!["node_modules", "dist"].includes(e)) walk(path.join(p, e));
  };
  SCAN.forEach(walk);
  for (const route of ROUTES.filter((r) => r.dormant)) {
    const callers = files.filter((f) => f !== route.file && new RegExp(`\\b${route.dormant}\\b`).test(read(f)));
    assert.deepEqual(callers, [], `${route.dormant} gained a caller: give its path a non-admin clause in DEF-004 first`);
    for (const extension of route.denied) for (const name of samples(route, extension, 20)) assert.ok(!memberAllows(name, UID), `${route.id} not for members: ${name}`);
  }
  // captureAndUploadPoster is reachable only through broadcastChannelUpdate.
  const supa = read("src/lib/supabase.js");
  assert.equal([...supa.matchAll(/\bcaptureAndUploadPoster\(/g)].length, 2, "captureAndUploadPoster: definition + the broadcastChannelUpdate call only");
});

test("no unregistered client upload into gallery", () => {
  const registered = new Set(ROUTES.map((r) => r.file));
  const found = new Map();
  const walk = (p) => {
    const full = path.join(root, p);
    if (!fs.existsSync(full)) return;
    if (fs.statSync(full).isFile()) {
      if (/\.(js|jsx|mjs)$/.test(p) && !/\.test\./.test(p)) {
        const n = [...read(p).matchAll(/storage\.from\(\s*["'`]gallery["'`]\s*\)\.upload\(/g)].length;
        if (n) found.set(p, n);
      }
      return;
    }
    for (const e of fs.readdirSync(full)) if (!["node_modules", "dist"].includes(e)) walk(path.join(p, e));
  };
  ["src", "public-reading-deploy", "api", "server", "public"].forEach(walk);
  assert.deepEqual([...found.keys()].filter((f) => !registered.has(f)), [], "new gallery uploader: add it to the DEF-004 route map");
  assert.equal(found.get("src/lib/supabase.js"), 2, "supabase.js: poster + replace image");
});

test("the public-reading worker admits nothing the policy refuses", () => {
  const transport = read("public-reading-deploy/transport.js");
  assert.ok(transport.includes("/^\\/storage\\/v1\\/object\\/gallery\\/community\\/([0-9a-f-]{36})\\/([0-9a-f-]{36})\\.([a-z0-9]+)$/i"), "worker community path");
  for (const [mime, type] of Object.entries(COMMUNITY_UPLOAD_POLICY.types)) {
    for (const extension of type.extensions) {
      assert.ok(memberAllows(`community/${UID}/${crypto.randomUUID()}.${extension}`, UID), `worker-admitted ${mime} .${extension}`);
      assert.ok((type.kind === "video" ? COMMUNITY_UPLOAD_POLICY.videoMaxBytes : COMMUNITY_UPLOAD_POLICY.fileMaxBytes) <= CEILING);
    }
  }
  const personal = read("public-reading-deploy/personal-request.js");
  const worker = /new RegExp\("\^"\+uid\+"(-\[0-9\]\{10,17\}\\\\\.\(\?:([a-z?|]+)\)\$)", "i"\)/.exec(personal);
  assert.ok(worker, "worker avatar pattern found");
  for (const extension of ["jpg", "jpeg", "png", "webp", "gif", "avif"]) {
    const name = `avatars/${UID}-${Date.now()}.${extension}`;
    assert.ok(new RegExp(`^${UID}-[0-9]{10,17}\\.(?:jpe?g|png|webp|gif|avif)$`, "i").test(name.slice(8)), `worker admits ${extension}`);
    assert.ok(memberAllows(name, UID), `policy admits worker avatar .${extension}`);
  }
  assert.ok(ownedProfileAvatarUrl(`https://x.test/storage/v1/object/public/gallery/avatars/${UID}-${Date.now()}.png`, UID, "https://x.test"), "account avatar URL rule unchanged");
  assert.ok(transport.includes('"media-upload-intent"') && transport.includes("/^\\/storage\\/v1\\/upload\\/resumable(?:\\/[^/?#]+)?$/"), "admin gateway + TUS admitted for admins");
});

test("120 MiB ceiling: set on gallery only, no MIME list, above every client cap; no UPDATE/DELETE grant", () => {
  assert.equal(CEILING, 120 * 1024 * 1024);
  assert.match(sql, /update storage\.buckets set file_size_limit = 125829120 where id = 'gallery';/);
  assert.equal([...sql.matchAll(/update storage\.buckets/g)].length, 1, "only one bucket statement");
  assert.doesNotMatch(sql.replace(/--[^\n]*/g, ""), /set[^;]*allowed_mime_types\s*=/i, "allowed_mime_types is not set");
  assert.doesNotMatch(sql.replace(/--[^\n]*/g, ""), /for (update|delete|all)\b/i, "no UPDATE/DELETE/ALL policy");
  assert.match(policyBody("gallery_admin_upload_v1"), /u\.role = 'admin'/);
  assert.doesNotMatch(policyBody("gallery_admin_upload_v1"), /name ~/, "admin is not path-restricted");
  const reportHint = read("src/components/ReportHint.jsx"), profile = read("src/components/ProfileSettings.jsx");
  assert.ok(reportHint.includes("f.size > 12 * 1024 * 1024") && profile.includes("f.size > 5 * 1024 * 1024"));
  for (const cap of [COMMUNITY_UPLOAD_POLICY.fileMaxBytes, COMMUNITY_UPLOAD_POLICY.videoMaxBytes, AVATAR_UPLOAD_POLICY.maxBytes, 12 * 1024 * 1024]) assert.ok(cap < CEILING);
});

test("administrators keep a path for files above 120 MiB: the existing gateway into bucket media", () => {
  const big = 1.5 * 1024 * 1024 * 1024;
  const intent = buildUploadIntent({ scope: "public", kind: "video", mime: "video/mp4", size: big, filename: "film.mp4", userId: UID, isAdmin: true, idFactory: () => crypto.randomUUID() });
  assert.equal(intent.bucket, "media");
  assert.match(intent.path, /^sod1820\/2029\/video\/\d{4}\/\d{2}\/[0-9a-f-]{36}\/original\.mp4$/);
  assert.equal(intent.transport, "tus");
  assert.ok(MIME_POLICY.video.maxBytes > CEILING && MIME_POLICY.audio.maxBytes > CEILING && MIME_POLICY.document.maxBytes > CEILING);
  assert.throws(() => buildUploadIntent({ scope: "public", kind: "video", mime: "video/mp4", size: big, filename: "film.mp4", userId: UID, isAdmin: false, idFactory: () => crypto.randomUUID() }), /admin_required/);
  assert.ok(read("supabase/functions/media-upload-intent/index.ts").includes("createSignedUploadUrl(intent.path, { upsert: false })"), "non-overwriting signed upload");
});

test("rollback restores the 12.11.2026 production policies verbatim and both NULL bucket limits", () => {
  const rb = read(ROLLBACK);
  assert.ok(rb.includes("create policy community_anon_upload on storage.objects as permissive for insert to anon, authenticated\n  with check ((bucket_id = 'gallery'::text) AND ((storage.foldername(name))[1] = 'community'::text));"));
  assert.ok(rb.includes("create policy public_upload on storage.objects as permissive for insert to authenticated\n  with check ((bucket_id = 'gallery'::text));"));
  assert.match(rb, /update storage\.buckets set file_size_limit = null, allowed_mime_types = null where id = 'gallery';/);
  for (const name of ["gallery_admin_upload_v1", "gallery_client_upload_scoped_v1", "gallery_flat_image_upload_v1"]) assert.ok(rb.includes(`drop policy if exists ${name} on storage.objects;`));
  assert.doesNotMatch(rb.replace(/--[^\n]*/g, ""), /community_authenticated_media_paths_v1|public_read|magar_/, "rollback leaves the untouched policies alone");
});
