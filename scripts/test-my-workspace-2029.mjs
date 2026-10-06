import assert from "node:assert/strict";
import fs from "node:fs";

const frame = fs.readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
const css = fs.readFileSync("src/components/experience2029/myWorkspace2029.css", "utf8");

for (const label of [
  "המרחב האישי שלי",
  "החשבון שלי",
  "הדף שלי",
  "המחקר שלי",
  "ההתקדמות שלי",
  "הודעות ועדכונים",
  "מסע החיים שלי",
  "הרמזים שלי",
  "התרומות שלי",
  "הקרדיטים שלי",
  "הצפנים שלי",
  "החיבור לרזיאל",
]) assert.match(frame, new RegExp(label));

assert.match(frame, /go\("\/2029\/journey"\)/);
assert.match(frame, /data-workspace-section="research"/);
assert.match(frame, /שמירה · חזרה מדויקת/);
assert.match(frame, /בבנייה/);


/* Native 2029 account connection — reuses canonical AuthProvider/auth helpers, no legacy login handoff. */
assert.match(frame, /function AccountConnection2029/);
assert.match(frame, /requestEmailOtp/);
assert.match(frame, /verifyEmailOtp/);
assert.match(frame, /isValidEmailOtp/);
assert.match(frame, /sanitizeEmailOtp/);
assert.match(frame, /data-workspace-section="account"/);
assert.match(frame, /אותו חשבון SOD1820 · בתוך 2029/);
assert.match(frame, /התחברו כדי לקחת את המחקר איתכם/);
assert.match(frame, /שלחו לי קוד כניסה/);
assert.match(frame, /כניסה \/ הרשמה/);
assert.match(frame, /signOut/);
assert.match(frame, /onClick: openAccount/);
assert.match(frame, /<AccountConnection2029 user=\{user\} profile=\{profile\} signOut=\{signOut\} \/>/);
assert.doesNotMatch(frame, /AuthPage|goto?\("\/login/);
assert.doesNotMatch(frame, /createClient\(/);
assert.match(css, /\.sod29-workspace-account/);
assert.match(css, /\.sod29-workspace-auth-form/);

// Native 2029 workspace must not import or route into the legacy UserCenter as its target UI.
assert.doesNotMatch(frame, /UserCenter/);
assert.doesNotMatch(frame, /goto?\("\/profile/);

// Old five-world taxonomy was historical and must not reappear as the native home.
for (const legacy of ["העולם שלי", "המעבדה שלי", "הסוכן האישי", "הקהילה שלי", "היצירה שלי"]) {
  assert.doesNotMatch(frame, new RegExp(legacy));
}

assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
assert.match(css, /\.sod29-workspace-core-grid/);
assert.match(css, /@media\(max-width:640px\)/);



// Follows / attention activation — existing owners only, no new store.
assert.match(frame, /getNotificationPrefs/);
assert.match(frame, /topicLabel\(topic\)/);
assert.match(frame, /watchToggle\(topic, "workspace-2029", false/);
assert.match(frame, /getMyNotifications\(4\)/);
assert.match(frame, /getUnreadCount\(\)/);
assert.match(frame, /markNotificationRead/);
assert.match(frame, /getMyProfile/);
assert.match(frame, /data-workspace-section="follow"/);
assert.match(frame, /\/2029\/number\/\$\{m\[1\]\}/);
assert.match(frame, /אחרי מה אני עוקב/);
assert.doesNotMatch(frame, /supabase\.from\(|\.rpc\(/);
// follow list sits after research section; summary count near top
assert.ok(frame.indexOf('data-workspace-section="follow"') > frame.indexOf('<section data-workspace-section="research"'));
assert.ok(frame.indexOf('data-workspace-section="pulse"') < frame.indexOf('<section data-workspace-section="research"'));
// bottom personal affordance lives in the single existing command island and opens WORKSPACE
assert.equal((frame.match(/className=\{`sod29-command-island/g) || []).length, 1);
assert.match(frame, /className="sod29-island-personal" onClick=\{openWorkspace\}/);
assert.equal((frame.match(/sod29-island-personal/g) || []).length, 2); // one per island layout, mutually exclusive branches
assert.match(frame, /small>אישי</);


// Saved / research state — ResearchProvider snapshot only, explicit action semantics.
assert.match(frame, /research\.saveItem\(entity\)/);
assert.match(frame, /research\.addToResearch\(entity\)/);
assert.match(frame, /const saveToLibrary = useCallback/);
assert.match(frame, /data-inspect-action="save"[^>]*onClick=\{\(\) => setCommitState\(\{ kind: "save", ok: Boolean\(onSave\?\.\(target\)\) \}\)\}/);
assert.match(frame, /data-inspect-action="research"[^>]*onClick=\{\(\) => setCommitState\(\{ kind: "research", ok: Boolean\(onAddResearch\?\.\(target\)\) \}\)\}/);
assert.doesNotMatch(frame, /onClick=\{\(\) => onAddResearch\(target\)\}>＋ שמור/);
for (const k of ["saved", "cart", "pinned", "history"]) assert.match(frame, new RegExp(`key: "${k}"`));
assert.match(frame, /research\?\.collections/);
for (const label of ["שמורים", "במחקר עכשיו", "מוצמדים", "אחרונים", "אוספים", "מסלול שמור \\(נפרד"]) assert.match(frame, new RegExp(label));
for (const action of ["removeSaved", "removeFromResearch", "togglePin", "clearHistory"]) assert.match(frame, new RegExp(action));
assert.match(frame, /onOpenNumber\?\.\(rowTarget\(e\)\)/);
assert.match(frame, /onInspect\?\.\(rowTarget\(e\)\)/);
assert.match(frame, /מקומי בדפדפן הזה — לא מסונכרן/);
assert.match(frame, /data-research-state-source="ResearchProvider"/);
assert.doesNotMatch(frame, /ResearchCenter|HintsPanel/);
const rs = frame.slice(frame.indexOf("function ResearchStateSections"), frame.indexOf("function WorkspaceProjection"));
assert.ok(rs.length > 500);
assert.doesNotMatch(rs, /localStorage|sessionStorage|supabase|\.rpc\(|createClient/);
assert.ok(frame.indexOf("<ResearchStateSections research") < frame.indexOf('data-workspace-section="follow"'));
// previous PR #954 follows/notifications/island intact (asserted above); no new store in the CSS slice either.

console.log("My Workspace 2029 native home contract: PASS");
