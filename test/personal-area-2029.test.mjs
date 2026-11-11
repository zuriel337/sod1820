// "האזור האישי שלי" (2029): the card model, its destinations and the keyboard clearance. Pure logic and source contracts; no browser.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PERSONAL_GROUPS, personalCards, personalCardHref, personalPrimaryAction } from "../src/lib/userCenter/personalArea2029.js";
import { WRITER_PERSONAL_MODULES } from "../src/lib/userCenter/writerPersonal2029.js";
import { keyboardOpen, watchKeyboardClearance } from "../src/lib/keyboardClearance2029.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const MODULES = new Set(WRITER_PERSONAL_MODULES.map(([id]) => id));
const member = (extra = {}) => personalCards({ signedIn: true, stats: { level: 3, xp: 120, credits: 200 }, follows: { status: "ready", topics: ["a", "b"] }, inbox: { status: "ready", unread: 4 }, research: { saved: [1], cart: [], pinned: [] }, savedConversations: 2, ...extra });

test("every capability has one card, one group and one destination that already exists", () => {
  const cards = member();
  assert.equal(new Set(cards.map(card => card.id)).size, cards.length, "one card per capability");
  const groups = new Set(PERSONAL_GROUPS.map(group => group.id));
  for (const card of cards) {
    assert.ok(groups.has(card.group), card.id + " has a known group");
    assert.ok(card.owner, card.id + " names the owner of its data");
    if (card.state !== "live") continue;
    const to = card.to;
    assert.ok(to && (to.module || to.href || to.section), card.id + " is live, so it has a destination");
    if (to.module) assert.ok(MODULES.has(to.module), card.id + " opens an existing WriterPersonal2029Page module");
    if (to.href) assert.match(to.href, /^\/(?:2029\/journey|els\?library=mine|community\/researcher\/me)$/, card.id + " opens an existing route");
  }
});

test("a closed card says why; it never has a destination", () => {
  const cards = member({ journeyLocked: true, elsLocked: true });
  const closed = cards.filter(card => card.state !== "live");
  assert.deepEqual(closed.map(card => card.id).sort(), ["access", "codes", "credits", "hints", "life-journey"]);
  for (const card of closed) { assert.equal(card.to, null, card.id); assert.ok(card.reason.length > 10, card.id + " states the real reason"); assert.equal(personalCardHref(card), null); }
  const open = member();
  assert.deepEqual(open.filter(card => card.state !== "live").map(card => card.id).sort(), ["access", "credits"], "only what is really not exposed stays closed");
});

test("module destinations resolve to the exact existing address, with the return path and the replies tab", () => {
  const byId = Object.fromEntries(member().map(card => [card.id, card]));
  assert.equal(personalCardHref(byId.profile, { returnTo: "/world" }), "/2029/me/profile?returnTo=%2Fworld");
  assert.equal(personalCardHref(byId["page-editor"]), "/2029/me/page-editor");
  assert.equal(personalCardHref(byId.replies, { returnTo: "/world" }), "/2029/me/messages?returnTo=%2Fworld&tab=replies");
  assert.equal(personalCardHref(byId.messages), "/2029/me/messages");
  assert.equal(personalCardHref(byId.contributions), "/community/researcher/me");
  assert.equal(personalCardHref(byId.codes), "/els?library=mine");
  assert.equal(personalCardHref({ to: { module: "not-a-module" } }), null);
  assert.equal(personalCardHref({ to: { href: "//evil.example/x" } }), null);
  assert.equal(personalCardHref({ to: { href: "https://evil.example/x" } }), null);
  for (const id of ["research", "follow", "raziel", "hints"]) assert.equal(personalCardHref(byId[id]), null, id + " opens inside the panel");
});

test("a guest is sent to the sign-in form, never to a private destination", () => {
  const cards = personalCards({ signedIn: false });
  for (const card of cards.filter(card => card.state === "live" && card.to?.module)) assert.deepEqual(card.to, { signIn: true }, card.id);
  assert.equal(cards.find(card => card.id === "codes").to.signIn, true);
});

test("hints show real numbers or an honest empty state, never a made-up one", () => {
  const by = Object.fromEntries(member().map(card => [card.id, card]));
  assert.match(by.progress.hint, /שלב 3/); assert.match(by.progress.hint, /120 XP/);
  assert.match(by.follow.hint, /4 עדכונים חדשים/); assert.match(by.follow.hint, /2 מעקבים/);
  assert.match(by.research.hint, /1 פריט/); assert.match(by.raziel.hint, /2 שיחות שמורות/);
  const empty = Object.fromEntries(personalCards({ signedIn: true, stats: null, follows: { status: "loading", topics: [] }, inbox: { status: "loading", unread: null }, research: { saved: [], cart: [], pinned: [] }, savedConversations: 0 }).map(card => [card.id, card]));
  assert.match(empty.progress.hint, /עדיין אינם זמינים/); assert.match(empty.research.hint, /אין עדיין פריטים/); assert.match(empty.raziel.hint, /אין עדיין שיחות/);
  assert.doesNotMatch(empty.follow.hint, /\b0\b/, "an unread count that is not loaded yet is not shown as 0");
});

test("the main action is one, and it follows the person's state", () => {
  assert.equal(personalPrimaryAction({ signedIn: false }).id, "sign-in");
  assert.equal(personalPrimaryAction({ signedIn: true, hasContext: true }).id, "resume");
  assert.equal(personalPrimaryAction({ signedIn: true, hasSavedPath: true }).id, "resume-path");
  assert.equal(personalPrimaryAction({ signedIn: true }).id, "research");
});

test("card icons are icons the navigation set really has; the presentation reads no data and defines no colour", () => {
  const icons = read("src/components/experience2029/NavigationIcon2029.jsx");
  for (const card of member()) assert.match(icons, new RegExp(`\\b${card.icon}:`), card.id + " uses icon " + card.icon);
  const home = read("src/components/experience2029/PersonalHome2029.jsx");
  assert.doesNotMatch(home, /supabase|fetch\(|localStorage|sessionStorage|\.rpc\(|createClient/);
  assert.match(home, /royal2029\.css/);
  const css = read("src/components/experience2029/personalArea2029.css");
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/, "colours come from the canonical --s29 roles");
  assert.match(css, /prefers-reduced-motion/); assert.match(css, /forced-colors/);
});

test("keyboard: open only when the visual viewport is clearly shorter AND a text field has focus", () => {
  const field = { matches: selector => /input|textarea/.test(selector) };
  const button = { matches: () => false };
  assert.equal(keyboardOpen({ innerHeight: 844, visualHeight: 520, active: field }), true);
  assert.equal(keyboardOpen({ innerHeight: 844, visualHeight: 520, active: button }), false, "a pinch-zoom is not a keyboard");
  assert.equal(keyboardOpen({ innerHeight: 844, visualHeight: 800, active: field }), false, "a small change is not a keyboard");
  assert.equal(keyboardOpen({ innerHeight: NaN, visualHeight: 500, active: field }), false);
});

test("keyboard watcher toggles the page class, cleans up, and is inert without a visual viewport", () => {
  const classes = new Set(); const root = { classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name), remove: name => classes.delete(name) } };
  const handlers = {}; const viewport = { height: 844, addEventListener: (type, fn) => { handlers[type] = fn; }, removeEventListener: type => { delete handlers[type]; } };
  const docHandlers = {}; const doc = { documentElement: root, activeElement: { matches: () => true, scrollIntoView() {} }, addEventListener: (t, f) => { docHandlers[t] = f; }, removeEventListener: t => { delete docHandlers[t]; } };
  const win = { innerHeight: 844, visualViewport: viewport };
  const stop = watchKeyboardClearance(win, doc);
  assert.equal(classes.has("sod29-kbd-open"), false);
  viewport.height = 500; handlers.resize(); assert.equal(classes.has("sod29-kbd-open"), true);
  viewport.height = 844; handlers.resize(); assert.equal(classes.has("sod29-kbd-open"), false);
  viewport.height = 500; handlers.resize(); stop(); assert.equal(classes.has("sod29-kbd-open"), false, "cleanup removes the class");
  assert.deepEqual(Object.keys(handlers), []);
  assert.equal(typeof watchKeyboardClearance({}, doc), "function");
});

test('the "account" workspace-section marker has exactly one owner (a strict locator must resolve to one element)', async () => {
  const { readFileSync } = await import('node:fs');
  const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  const count = text => (text.match(/<[a-z]+\s[^>]*data-workspace-section="account"/g) || []).length;   // an element carrying the marker (not a selector string)
  const home = read('src/components/experience2029/PersonalHome2029.jsx'), frame = read('src/components/experience2029/SystemFrame2029.jsx');
  assert.equal(count(home), 0, 'the new wrapper must not carry the account marker');
  assert.equal(count(frame), 1, 'the account entry in the frame is the single owner');
  assert.match(home, /data-pa29-account/);
});
