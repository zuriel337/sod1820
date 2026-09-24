import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBeitMidrashSystemNow,
  selectMethodMenu,
  countRegisteredInactive,
  resolveSelectedMethod,
} from "./beitMidrash2029Projection.js";

test("buildBeitMidrashSystemNow shapes convergence/growth/communication/activity without inventing data", () => {
  const out = buildBeitMidrashSystemNow({
    convergence: [{ number: 358 }, { number: 137 }],
    growth: [{ title: "a" }, { title: "b" }, { title: "c" }],
    communication: [{ channel: "main" }],
    activity: { searches24h: 5, numbersOpened: 2, discussionsActive: 1 },
    counts: { convergence: 2, growth: 3, channels: 1 },
  });
  assert.equal(out.counts.convergence, 2);
  assert.equal(out.counts.growth, 3);
  assert.equal(out.counts.channels, 1);
  assert.equal(out.topConvergence.length, 2);
  assert.equal(out.topGrowth.length, 3);
  assert.equal(out.topCommunication.length, 1);
  assert.deepEqual(out.activity, { searches24h: 5, numbersOpened: 2, discussionsActive: 1 });
});

test("buildBeitMidrashSystemNow fails honest on missing/malformed input", () => {
  const out = buildBeitMidrashSystemNow(null);
  assert.deepEqual(out.topConvergence, []);
  assert.deepEqual(out.topGrowth, []);
  assert.deepEqual(out.topCommunication, []);
  assert.equal(out.channelCount, 0);
  assert.equal(out.activity, null);
});

test("buildBeitMidrashSystemNow caps the compact communication summary at 2 channels, no invented fields", () => {
  const out = buildBeitMidrashSystemNow({
    communication: [
      { channel: "site-news", label: "חדשות האתר", em: "📰", latest: "עדכון א", count24h: 3 },
      { channel: "main", label: "ערוץ ראשי", em: "📢", latest: "עדכון ב", count24h: 1 },
      { channel: "extra", label: "נוסף", em: "🔔", latest: "עדכון ג", count24h: 0 },
    ],
  });
  assert.equal(out.topCommunication.length, 2);
  assert.equal(out.topCommunication[0].channel, "site-news");
  assert.equal(out.topCommunication[0].latest, "עדכון א");
});

test("selectMethodMenu returns only active methods, sorted, with no computed value invented", () => {
  const rows = [
    { method_key: "b", display_label: "ב", active: true, sort_order: 2 },
    { method_key: "a", display_label: "א", active: true, sort_order: 1 },
    { method_key: "c", display_label: "ג", active: false, registered: true },
  ];
  const menu = selectMethodMenu(rows);
  assert.equal(menu.length, 2);
  assert.equal(menu[0].methodKey, "a");
  assert.equal(menu[1].methodKey, "b");
  assert.equal("computedValue" in menu[0], false);
});

test("countRegisteredInactive counts only registered+not-active rows", () => {
  const rows = [
    { registered: true, active: true },
    { registered: true, active: false },
    { registered: false, active: false },
  ];
  assert.equal(countRegisteredInactive(rows), 1);
});

test("resolveSelectedMethod never fabricates soul/sub/computedValue when absent", () => {
  const rows = [{ method_key: "x", display_label: "X", active: true, execution_kind: "sql_function" }];
  const resolved = resolveSelectedMethod(rows, [], "x");
  assert.equal(resolved.hasComputed, false);
  assert.equal(resolved.computedValue, null);
  assert.equal(resolved.soul, null);
  assert.equal(resolved.sub, null);
});

test("resolveSelectedMethod surfaces context_activated honestly", () => {
  const rows = [{ method_key: "y", display_label: "Y", active: true, execution_kind: "context_activated" }];
  const resolved = resolveSelectedMethod(rows, [], "y");
  assert.equal(resolved.contextActivated, true);
});

test("resolveSelectedMethod returns null for unknown method key", () => {
  assert.equal(resolveSelectedMethod([{ method_key: "x" }], [], "missing"), null);
  assert.equal(resolveSelectedMethod([{ method_key: "x" }], [], null), null);
});
