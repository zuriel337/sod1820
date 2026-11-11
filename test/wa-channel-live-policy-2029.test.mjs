// Live-publication policy of a WhatsApp channel source, per message (ZURIEL 11.11.2026, «הגילוי היומי»).
// Proves: (1) deploying the code opens nothing — before live_from is set every channel behaves as before; (2) the policy applies only
// from the approved activation moment, by the message's own provider time — an older message that is processed later (backlog,
// outage recovery, targeted recovery) keeps the previous policy; (3) a live row never carries a regular member's name; (4) writer
// pins are by number only, with the name from the registry.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  waLiveFrom, waGroupOpenAt, waAllowlistAdmits, waPinHours, waPinWriter, waRowPolicy, WA_PIN_HOURS_DEFAULT, WA_PIN_HOURS_MAX,
} from "../supabase/functions/_shared/waChannelPolicy.js";

const T = Date.parse("2026-11-12T08:00:00Z");           // the approved activation moment
const sec = ms => Math.floor(ms / 1000);
const ADMIN = "972500000010@c.us", KANDRO = "972500000011@c.us", LEVI = "972500000012@c.us", MEMBER = "972500000099@c.us";
const before = { channel: "gilui-yomi", admin_only: true, admin_ids: [ADMIN, KANDRO, LEVI], use_sender_name: true,
  live_from: null, pin_writers: [], pin_hours: 24 };                       // the registry row as it is today
const activated = { ...before, admin_only: false, live_from: new Date(T).toISOString(), pin_writers: [
  { jid: KANDRO, name: "יצחק שחר קנדרו" }, { jid: LEVI, name: "יניב לוי" }] };
const orGeula = { channel: "or-geula", admin_only: true, admin_ids: [ADMIN], use_sender_name: false, live_from: null };

test("before activation the registry decides nothing new: admin gate, private rows, no pins, no anonymity (= v33)", () => {
  for (const ts of [sec(T) - 86400, sec(T), sec(T) + 86400]) {
    assert.equal(waAllowlistAdmits(before, MEMBER, ts), false, "a non-admin stays out at any time");
    assert.equal(waAllowlistAdmits(before, ADMIN, ts), true);
    assert.deepEqual(waRowPolicy(before, { ts, senderId: KANDRO, storyLive: false }),
      { open: false, status: "private", pinWriter: null, pinnedUntil: null, anonymousMember: false });
  }
  // A group without an allowlist (Torat HaRemez today) keeps admitting everyone, privately.
  const torat = { channel: "torat-haremez", admin_only: false, admin_ids: [], use_sender_name: true };
  assert.equal(waAllowlistAdmits(torat, MEMBER, sec(T)), true);
  assert.equal(waRowPolicy(torat, { ts: sec(T), senderId: MEMBER, storyLive: false }).status, "private");
});

test("Or HaGeula keeps its permanent live state and its attribution; a live_from on it would only open its membership", () => {
  const p = waRowPolicy(orGeula, { ts: sec(T), senderId: ADMIN, storyLive: true });
  assert.deepEqual(p, { open: false, status: "live", pinWriter: null, pinnedUntil: null, anonymousMember: false });
  assert.equal(waAllowlistAdmits(orGeula, MEMBER, sec(T)), false);
});

test("the activation moment is inclusive and read from the message time", () => {
  assert.equal(waLiveFrom(activated), T);
  assert.equal(waGroupOpenAt(activated, sec(T) - 1), false);
  assert.equal(waGroupOpenAt(activated, sec(T)), true);
  assert.equal(waRowPolicy(activated, { ts: sec(T) - 1, senderId: ADMIN }).status, "private");
  assert.equal(waRowPolicy(activated, { ts: sec(T), senderId: ADMIN }).status, "live");
  for (const bad of [null, "", "not-a-date", undefined]) {
    const src = { ...activated, live_from: bad };
    assert.equal(waGroupOpenAt(src, sec(T) + 10), false, String(bad));
    assert.equal(waRowPolicy(src, { ts: sec(T) + 10, senderId: KANDRO }).status, "private");
  }
  assert.equal(waGroupOpenAt(activated, 0), false);
  assert.equal(waGroupOpenAt(activated, "x"), false);
});

test("a backlog processed after activation: every message keeps the policy of its OWN time", () => {
  // One recovery poll that runs a day after activation and drains messages from both sides of the moment.
  const backlog = [
    { senderId: MEMBER, ts: sec(T) - 3600 },   // before: non-admin -> never admitted
    { senderId: ADMIN, ts: sec(T) - 60 },      // before: admin -> private, previous attribution
    { senderId: KANDRO, ts: sec(T) - 5 },      // before: listed writer -> private, NOT pinned
    { senderId: MEMBER, ts: sec(T) },          // at the moment: admitted, live, anonymous
    { senderId: KANDRO, ts: sec(T) + 100 },    // after: live, pinned 24h from his message
    { senderId: LEVI, ts: sec(T) + 200 },
    { senderId: ADMIN, ts: sec(T) + 300 },     // after: an admin who is not a listed writer is a regular member publicly
  ];
  const decided = backlog.map(m => {
    if (!waAllowlistAdmits(activated, m.senderId, m.ts)) return "skip";
    const p = waRowPolicy(activated, { ts: m.ts, senderId: m.senderId, storyLive: false });
    return [p.status, p.pinWriter?.name || (p.anonymousMember ? "anonymous" : "attributed"), p.pinnedUntil];
  });
  assert.deepEqual(decided, [
    "skip",
    ["private", "attributed", null],
    ["private", "attributed", null],
    ["live", "anonymous", null],
    ["live", "יצחק שחר קנדרו", new Date((sec(T) + 100 + 24 * 3600) * 1000).toISOString()],
    ["live", "יניב לוי", new Date((sec(T) + 200 + 24 * 3600) * 1000).toISOString()],
    ["live", "anonymous", null],
  ]);
});

test("the policy never reads the clock: the same messages decide the same way whenever they are processed", () => {
  const msgs = [[MEMBER, sec(T) - 30], [KANDRO, sec(T) - 30], [MEMBER, sec(T) + 30], [KANDRO, sec(T) + 30]];
  const run = () => msgs.map(([senderId, ts]) => [waAllowlistAdmits(activated, senderId, ts), waRowPolicy(activated, { ts, senderId })]);
  const now = Date.now;
  const first = run();
  try {
    Date.now = () => T + 10 * 365 * 86400000; // ten years later (targeted recovery of an old message, a late backlog …)
    assert.deepEqual(run(), first);
    Date.now = () => T - 86400000;           // or a poll whose clock is behind
    assert.deepEqual(run(), first);
  } finally { Date.now = now; }
  const code = readFileSync(new URL("../supabase/functions/_shared/waChannelPolicy.js", import.meta.url), "utf8");
  assert.doesNotMatch(code, /Date\.now\(|new Date\(\)|performance\.now/, "no wall clock in the policy");
});

test("public attribution: a live row of a sender-name group never names a regular member; outgoing and private rows unchanged", () => {
  const live = waRowPolicy(activated, { ts: sec(T) + 1, senderId: MEMBER });
  assert.equal(live.anonymousMember, true);
  assert.equal(waRowPolicy(activated, { ts: sec(T) + 1, senderId: MEMBER, outgoing: true }).anonymousMember, false,
    "outgoing rows already carry the brand / the configured author, never a member name");
  assert.equal(waRowPolicy(activated, { ts: sec(T) - 1, senderId: ADMIN }).anonymousMember, false, "private rows keep the attribution");
  assert.equal(waRowPolicy({ ...activated, use_sender_name: false }, { ts: sec(T) + 1, senderId: MEMBER }).anonymousMember, false,
    "a group that never stores sender names has nothing to hide");
});

test("writer pins: number only, live incoming only, name from the registry, length from pin_hours", () => {
  assert.deepEqual(waPinWriter(activated, KANDRO), { jid: KANDRO, name: "יצחק שחר קנדרו" });
  assert.equal(waPinWriter(activated, "יצחק שחר קנדרו"), null, "a display name never pins");
  assert.equal(waPinWriter(activated, "972500000011"), null, "a bare number is not a sender id");
  assert.equal(waPinWriter(activated, MEMBER), null);
  assert.equal(waPinWriter({ ...activated, pin_writers: [{ jid: KANDRO, name: " " }] }, KANDRO), null, "a writer needs a name");
  assert.equal(waPinWriter({ ...activated, pin_writers: [{ jid: "x@g.us", name: "קבוצה" }] }, "x@g.us"), null);
  assert.equal(waPinWriter({ ...activated, pin_writers: "nope" }, KANDRO), null);
  assert.equal(waRowPolicy(activated, { ts: sec(T) + 1, senderId: KANDRO, outgoing: true }).pinWriter, null, "outgoing never pins");
  assert.equal(WA_PIN_HOURS_DEFAULT, 24);
  for (const [v, h] of [[undefined, 24], [0, 24], [-3, 24], ["x", 24], [6, 6], [72, 72], [1000, WA_PIN_HOURS_MAX]]) assert.equal(waPinHours({ pin_hours: v }), h);
  const six = waRowPolicy({ ...activated, pin_hours: 6 }, { ts: sec(T), senderId: LEVI });
  assert.equal(six.pinnedUntil, new Date(T + 6 * 3600000).toISOString());
  assert.equal(waRowPolicy(activated, { ts: sec(T), senderId: LEVI }).anonymousMember, false, "a listed writer is named, not anonymous");
});

test("the ingest applies the policy in one place, by message time, before media and before the insert", () => {
  const ts = readFileSync(new URL("../supabase/functions/wa-channel-ingest/index.ts", import.meta.url), "utf8");
  const admit = ts.indexOf("if (!waAllowlistAdmits(src, senderId, ts)) continue;");
  const blocks = ts.indexOf("if (blockIds.length && blockIds.includes(senderId)) continue;");
  const policy = ts.indexOf('const policy = waRowPolicy(src, { ts, senderId, outgoing, storyLive: channelStatus(src.channel) === "live" });');
  const media = ts.indexOf('policy.status === "private",');
  const insert = ts.indexOf('status: policy.status,');
  assert.ok(admit > 0 && blocks > admit, "allowlist first, block lists still applied after it");
  assert.ok(policy > blocks && media > policy && insert > media, "one policy decides media privacy and the stored status");
  assert.equal(ts.match(/waRowPolicy\(/g).length, 1, "exactly one policy decision per message");
  assert.doesNotMatch(ts, /admins\.includes\(senderId\)/, "no second, time-blind allowlist check");
  assert.match(ts, /if \(outgoing\) \{\n\s+if \(!captureOutgoing\) continue;/, "outgoing capture is unchanged");
});
