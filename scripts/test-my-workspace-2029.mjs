import assert from "node:assert/strict";
import fs from "node:fs";

// The personal area is the frame's projection (SystemFrame2029) over the pure card model and the Royal presentation (PersonalHome2029).
const frame = ["src/components/experience2029/SystemFrame2029.jsx", "src/components/experience2029/PersonalHome2029.jsx", "src/lib/userCenter/personalArea2029.js"]
  .map(file => fs.readFileSync(file, "utf8")).join("\n");
const css = fs.readFileSync("src/components/experience2029/myWorkspace2029.css", "utf8");

for (const label of [
  "האזור האישי שלי",
  "החשבון שלי",
  "הדף שלי",
  "המחקר והשמורים",
  "ההתקדמות שלי",
  "מעקב ועדכונים",
  "מסע החיים שלי",
  "הרמזים שלי",
  "התרומות שלי",
  "הקרדיטים שלי",
  "הצפנים שלי",
  "החיבור לרזיאל",
]) assert.match(frame, new RegExp(label));

assert.match(frame, /href: "\/2029\/journey"/);
assert.match(frame, /data-workspace-section="research"/);
assert.match(frame, /בבנייה/);


/* Native 2029 account connection — reuses canonical AuthProvider/auth helpers, no legacy login handoff. */
assert.match(frame, /function AccountConnection2029/);
const authEntry = fs.readFileSync("src/components/auth2029/AccountEntry2029.jsx", "utf8");
assert.match(frame, /<AccountEntry2029 inline variant="account"/);
for (const helper of ["requestEmailOtp", "verifyEmailOtp", "isValidEmailOtp", "sanitizeEmailOtp"]) assert.match(authEntry, new RegExp(helper));
assert.match(frame, /data-workspace-section="account"/);
// Accepted public and functional preview registration remains available;
// a read-only preview must still refuse account creation.
const creationExpression = authEntry.match(/shouldCreateUser: ([^}]+) \}/)?.[1];
assert.ok(creationExpression, "canonical OTP entry must choose account creation explicitly");
assert.equal(creationExpression.trim(), 'PUBLIC_READING_RELEASE || !preview || import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW === "true"');
const chooseCreation = new Function("PUBLIC_READING_RELEASE", "preview", "functionalPreview", `return (${creationExpression.replace("import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW", "functionalPreview")})`);
for (const [name, publicReading, preview, functional, expected] of [
  ["public registration", true, true, "false", true],
  ["ordinary account entry", false, false, undefined, true],
  ["approved functional preview", false, true, "true", true],
  ["read-only preview", false, true, "false", false],
  ["missing functional grant", false, true, undefined, false],
]) assert.equal(chooseCreation(publicReading, preview, functional), expected, name);
assert.match(authEntry, /signOut\(\{ scope: "local" \}\)/);
assert.match(frame, /signOut/);
assert.match(frame, /focusAccount/);
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



// Workspace summaries are read-only; the accepted native center owns management.
assert.match(frame, /getNotificationPrefs/);
assert.match(frame, /followTopics\(row\)/);
assert.match(frame, /getUnreadCount\(\{ strict: true, userId \}\)/);
assert.match(frame, /getMyProfile\(\{ strict: true, userId \}\)/);
assert.doesNotMatch(frame, /watchToggle|markNotificationRead|getMyNotifications/);
assert.match(frame, /openExistingModule\("notifications"\)/);
assert.match(frame, /writerPersonalHref\(module, \{ returnTo \}\)/);
assert.match(frame, /new Set\(WRITER_PERSONAL_MODULES\.map/);
assert.doesNotMatch(frame, /\/profile\?|MembersPage|JoinPage|UserCenter/);
assert.match(frame, /<WorkspaceProjection key=\{authLoading \? "auth-loading" : user\?\.id \|\| "guest"\}/);
assert.match(frame, /data-workspace-section="follow"/);
assert.match(frame, /אחרי מה אני עוקב/);
assert.doesNotMatch(frame, /supabase\.from\(|\.rpc\(/);
// Access and membership is a closed card of the model: no price, checkout, entitlement or action of its own.
const model = fs.readFileSync("src/lib/userCenter/personalArea2029.js", "utf8");
const home = fs.readFileSync("src/components/experience2029/PersonalHome2029.jsx", "utf8");
const membership = model.slice(model.indexOf('id: "access"'), model.indexOf("return cards;"));
assert.match(membership, /גישה ומנוי · בהכנה/);
assert.match(membership, /to: null/);
assert.doesNotMatch(membership, /₪|checkout|cardcom|entitlement|active|monthly|annually|onClick|href/i);
// the follow card comes after the research card; the account summary (pulse) is the first section and the research list opens from the cards below it
assert.ok(model.indexOf('id: "follow"') > model.indexOf('id: "research"'));
assert.ok(home.indexOf('data-workspace-section="pulse"') < home.lastIndexOf("PERSONAL_GROUPS.map"));
// Personal entry: the single existing command bar reaches WORKSPACE through the typed Now "for me" tab,
// and the top bar carries a visible sign-in / name control. No separate avatar button in the bar.
assert.equal((frame.match(/data-command-mode="global"/g) || []).length, 1);
assert.equal((frame.match(/data-command-mode="tool"/g) || []).length, 1);
assert.match(frame, /unifiedGlobalDock \? <div className="sod29-command-island[^]*data-command-mode="global"[^]*<\/div> : <div className="sod29-command-island[^]*data-command-mode="tool"/);
assert.match(frame, /onMe=\{openWorkspace\}/);
assert.equal((frame.match(/sod29-island-personal/g) || []).length, 0);
assert.match(frame, /sod29-header-workspace\$\{user \? "" : " is-signed-out"\}`\} onClick=\{openWorkspace\}/);
assert.match(frame, /accountShortName\(user, profile\)/);


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
