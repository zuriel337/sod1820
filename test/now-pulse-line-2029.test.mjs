import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import fsSync from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import Renderer, { act } from "react-test-renderer";

// «דופק האתר» at the top of "עכשיו" (ZURIEL 25.11.2026): one fixed 168h read of the one public reader, aggregates above the privacy floor only, TI v10-v12:
// no audience size, no totals, no invented zero. The network is injected; nothing here reaches the database.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const outfile = resolve(`.test-now-pulse-${process.pid}.mjs`);
await build({ entryPoints: ["src/components/experience2029/NowPulseLine2029.jsx"], bundle: true, platform: "node", format: "esm", outfile, external: ["react"],
  loader: { ".css": "empty", ".js": "jsx" }, define: { "import.meta.env": "{}" }, jsx: "automatic" });
const Line = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); });
const { default: NowPulseLine2029, pulseLineModel, NOW_PULSE_HOURS, NOW_PULSE_WINDOW_LABEL } = Line;

// A payload shaped exactly like research_pulse_2029(168) on 25.11.2026 (the unused fields are kept: the line must ignore them).
const pulse168 = () => ({ version: 1, state: "measured", hours: 168, numbers: [{ n: 345, events: 32, last_at: "2026-11-24T08:00:00+00:00" }, { n: 14, events: 10, last_at: "2026-11-24T05:00:00+00:00" }],
  content: [{ href: "/post/x", title: "פוסט", events: 75 }], computed: [], phrases: [], trend: [{ recent: 560, earlier: 162, surface: "activity_2029", event_type: "compute" }],
  totals: { human: { actions: 171, page_views: 287 }, unknown: { page_views: 186 } }, sections: [{ views: 689, section: "home" }], crawlers: { served: 35847 }, added: { posts: 3, community_messages: 22 } });
const render = async (data, extra = {}) => { let root; const read = () => Promise.resolve(data); await act(async () => { root = Renderer.create(React.createElement(NowPulseLine2029, { read, ...extra })); }); await act(async () => {}); return root; };
const text = root => JSON.stringify(root.toJSON());
const links = root => root.root.findAll(node => node.type === "a");

test("fixed window: 168 hours, named «השבוע האחרון»; the default reader is called once with exactly 168", async () => {
  assert.equal(NOW_PULSE_HOURS, 168); assert.equal(NOW_PULSE_WINDOW_LABEL, "השבוע האחרון");
  let calls = 0, asked = null;
  await act(async () => { Renderer.create(React.createElement(NowPulseLine2029, { read: () => { calls += 1; asked = NOW_PULSE_HOURS; return Promise.resolve(pulse168()); } })); });
  assert.equal(calls, 1); assert.equal(asked, 168);
  const source = await readFile("src/components/experience2029/NowPulseLine2029.jsx", "utf8");
  assert.match(source, /readResearchPulse\(NOW_PULSE_HOURS\)/);
  assert.doesNotMatch(source, /readAdaptivePulse|PULSE_WINDOWS\.map|supabase\.rpc/, "no adaptive windows, no second reader");
});

test("hot numbers are links to their number page; the trend is computations, from the server's own halves, with exact labels", async () => {
  const root = await render(pulse168());
  const out = text(root);
  assert.ok(out.includes("דופק האתר") && out.includes("השבוע האחרון"));
  const numbers = links(root).filter(node => /\/number\/\d+$/.test(node.props.href));
  assert.deepEqual(numbers.map(node => node.props.href.split("/").pop()), ["345", "14"]);
  assert.ok(out.includes("מספרים חמים") && out.includes("חצי שבוע מול קודמו"), "the long labels (wide) and the exact basis of the comparison");
  assert.ok(out.includes("מול הקודם") && out.includes("חמים"), "the short labels (phone) are rendered too and only one set is shown per width (CSS)");
  assert.ok(out.includes("חישובים") && out.includes("↑") && out.includes("246%"), "(560-162)/162 = 246%");
  const trend = root.root.findAll(node => node.props["data-now-pulse-part"] === "trend")[0];
  assert.match(trend.props.title, /560 ב־3\.5 הימים האחרונים לעומת 162 ב־3\.5 הימים שלפניהם \(אירועים, לא אנשים\)/);
  const stats = links(root).find(node => node.props.href === "/stats");
  assert.ok(stats, "an entrance to the statistics");
});

test("TI v10-v12: no totals, per-section views, per-post counts, crawlers, people or audience size anywhere in the line", async () => {
  const out = text(await render(pulse168()));
  for (const forbidden of ["287", "186", "689", "35847", "35,847", "171", "events", "מבקרים", "גולשים", "משתמשים", "אנשים מחוברים", "צפיות", "קהל"]) assert.ok(!out.includes(forbidden), forbidden);
  assert.ok(!out.includes("75"), "no per-post count");
});

test("missing data is left out, never a zero and never invented; nothing usable shows an honest note", async () => {
  const noTrend = text(await render({ ...pulse168(), trend: [] }));
  assert.ok(noTrend.includes("מספרים חמים") && !noTrend.includes("מגמה") && !noTrend.includes("↑") && !noTrend.includes("חישובים"));
  const noNumbers = text(await render({ ...pulse168(), numbers: [] }));
  assert.ok(!noNumbers.includes("מספרים חמים") && noNumbers.includes("↑"));
  const none = await render({ ...pulse168(), numbers: [], trend: [] });
  assert.ok(text(none).includes("אין עדיין נתונים מעל סף הפרטיות"));
  assert.ok(!/[>"]0[<"]/.test(text(none).replace(/\\"/g, '"')), "no drawn zero");
  const refreshing = await render({ ...pulse168(), state: "refreshing" });
  assert.ok(text(refreshing).includes("אין עדיין נתונים"), "a refreshing/unusable payload is not shown as data");
  assert.equal(pulseLineModel(null), null); assert.equal(pulseLineModel({ version: 2 }), null);
  // a trend without a real earlier half (division by zero) or with an invalid number is dropped, not shown as infinity or 0%
  assert.deepEqual(pulseLineModel({ ...pulse168(), trend: [{ recent: 50, earlier: 0, surface: "activity_2029", event_type: "compute" }, { recent: "x", earlier: 3, surface: "activity_2029", event_type: "search" }] }).trends, []);
});

test("a failed read is an honest note, not an error and not a zero; a down trend is shown as down", async () => {
  let root; const read = () => Promise.reject(new Error("PGRST202"));
  await act(async () => { root = Renderer.create(React.createElement(NowPulseLine2029, { read })); }); await act(async () => {});
  assert.ok(text(root).includes("הדופק אינו זמין כרגע"));
  const down = text(await render({ ...pulse168(), trend: [{ recent: 100, earlier: 200, surface: "activity_2029", event_type: "compute" }] }));
  assert.ok(down.includes("↓") && down.includes("50%"));
});

test("inside the Now window links go through onOpen (the window's own navigation), and the slot keeps a fixed height", async () => {
  const opened = [];
  const root = await render(pulse168(), { onOpen: href => opened.push(href) });
  const prevented = [];
  for (const node of links(root)) node.props.onClick({ preventDefault: () => prevented.push(node.props.href) });
  assert.ok(opened.includes("/stats") && opened.some(h => /\/number\/345$/.test(h)) && opened.some(h => /\/number\/14$/.test(h)) && opened.length === 3, opened.join(","));
  assert.equal(prevented.length, 3);
  const css = await readFile("src/components/experience2029/nowPulseLine2029.css", "utf8");
  assert.match(css, /\.nowpulse29-slot\{min-block-size:44px/);
  assert.match(css, /container-type:inline-size/, "the slot's own width decides what gives way (same on the Home and inside Now)");
  assert.match(css, /flex-wrap:nowrap;overflow:hidden;block-size:44px/, "one thin 44px row at every width, never a wrap");
  assert.doesNotMatch(css, /grid-template-rows/, "no stacked rows on any phone width");
  assert.doesNotMatch(css, /overflow-x\s*:\s*(auto|scroll)/, "no horizontal scroll on a phone");
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, "canonical colour roles only");
});

test("ELS searches this week (ZURIEL 25.11.2026): events of the cipher surface, only at/above the privacy floor, never people", () => {
  const base = { ...pulse168(), threshold: { events: 10, sessions: 5 } };
  const m = pulseLineModel({ ...base, activity: [{ events: 122, surface: "els", event_type: "search" }, { events: 17, surface: "els", event_type: "cross_search" }, { events: 722, surface: "activity_2029", event_type: "compute" }] });
  assert.equal(m.els, 139);
  assert.equal(pulseLineModel({ ...base, activity: [{ events: 6, surface: "els", event_type: "search" }] }).els, null);
  assert.equal(pulseLineModel({ ...base, activity: [] }).els, null);
});

test("alive (ZURIEL 25.11.2026): the server's own newest event time is carried, only when valid; the Home mounts the line BELOW the updates", () => {
  assert.equal(pulseLineModel({ ...pulse168(), latest_event: "2026-11-25T14:00:00+00:00" }).latestAt, "2026-11-25T14:00:00+00:00");
  assert.equal(pulseLineModel({ ...pulse168(), latest_event: "not a time" }).latestAt, null);
  const home = fsSync.readFileSync("src/components/experience2029/HomeComposition2029.jsx", "utf8");
  assert.ok(home.indexOf("<HomeLiveUpdates updates=") < home.indexOf("<NowPulseLineSlot2029"), "pulse line after the updates");
  assert.ok(home.indexOf("<NowPulseLineSlot2029") < home.indexOf('className="h29-lead-pair"'), "and before the flagship pair");
});
