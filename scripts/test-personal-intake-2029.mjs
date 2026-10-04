import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const intake = read("src/components/experience2029/PersonalIntake2029.jsx");
const helper = read("src/lib/research/personalIntake2029.js");
const edge = read("supabase/functions/media-upload-intent/index.ts");
const migration = read("supabase/migrations/20261004165000_personal_intake_2029_media_binding_v1.sql");
const css = read("src/components/experience2029/personalIntake2029.css");

assert.match(frame, /PersonalIntake2029/);
assert.match(frame, /<PersonalIntake2029 \/>/);
assert.match(intake, /הוסף למחקר שלי/);
for (const label of ["טקסט \/ ביטוי","מספר","תאריך","אדם","אירוע","קישור","קובץ"]) assert.match(intake, new RegExp(label));
assert.match(intake, /פרטי כברירת מחדל/);
assert.match(intake, /saveItem/);
assert.match(intake, /removeSaved/);

assert.match(helper, /buildResearchIntakeTransport/);
assert.match(helper, /uploadResumableMedia/);
assert.match(helper, /verifyUploadedMedia/);
assert.match(helper, /scope: "personal"/);
assert.match(helper, /type: "personal_intake"/);
assert.match(helper, /privacy: "personal"/);
assert.match(helper, /storage_object_id/);
const contract = read("supabase/functions/media-upload-intent/contract.mjs");
assert.match(contract, /scope === "submission" \|\| scope === "personal"/);
assert.match(contract, /scope === "personal"/);
assert.match(contract, /accounts\/\$\{userId\}/);
assert.doesNotMatch(helper, /research_contributions|community_hints|contact_messages/);
assert.doesNotMatch(helper, /\.from\(["']personal/i);

assert.match(edge, /storage_object_id/);
assert.match(edge, /read_personal_media/);
assert.match(edge, /delete_personal_media/);
assert.match(edge, /delete_verified_upload/);
assert.match(edge, /cleanup_personal_media/);
assert.match(edge, /accounts\/\$\{actor\.userId\}/);
assert.match(edge, /private_personal_intake_media_access_v1/);
assert.match(edge, /storage\.from\(resolved\.bucket\)\.remove/);

assert.match(migration, /private_personal_intake_media_access_v1/);
assert.match(migration, /where id=p_item_id and user_id=p_actor_id and bucket='library' and entity_type='personal_intake'/);
assert.match(migration, /metadata#>>'\{artifact,storage_object_id\}'/);
assert.match(migration, /grant execute on function public\.private_personal_intake_media_access_v1\(uuid,uuid,uuid\) to service_role/);
assert.match(migration, /guard_personal_intake_media_delete_v1/);
assert.match(migration, /PERSONAL_MEDIA_CLEANUP_REQUIRED/);
assert.match(migration, /before delete on public\.research_items/);
assert.doesNotMatch(migration, /create table/i);
assert.doesNotMatch(migration, /delete from storage\.objects/i);

assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);

console.log("Personal Intake 2029 unified contract: PASS");
