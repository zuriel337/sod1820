import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { HDate } from "@hebcal/core";
import { calculateGematriaEnvelope, CLIENT_GEMATRIA_METHODS } from "../src/lib/research/gematriaCalculationContract.js";
import {
  parseCommunityCalculatorState, selectCommunityCalculatorResult,
  communityCalculatorHref, communityCalculatorNumberNavigation, validCommunityCalculatorDate,
} from "../src/lib/research/communityCalculatorContinuity2029.js";

const location = search => ({ pathname: "/community/calculator", search, hash: "#comparison" });

test("Legacy w and ordinary-calculator input aliases retain expression and explicit method/result", () => {
  for (const key of ["w", "q", "calc"]) {
    const parsed = parseCommunityCalculatorState(`?${key}=משיח+בן+דוד&method=מסתתר&result=604&share=old-share`);
    assert.equal(parsed.name1, "משיח בן דוד");
    assert.equal(parsed.method, "מסתתר");
    assert.equal(parsed.resultRaw, "604");
  }
  const viral = parseCommunityCalculatorState("?w=אור&m=מילוי&v=713");
  assert.equal(viral.method, "מילוי");
  assert.equal(viral.resultRaw, "713");
});

test("comparison round trip keeps both names, selected method, share/source parameters and fragment", () => {
  const source = location("?w=אור&w2=רז&mode=compare&method=מילוי&result=713&share=abc&source=a&source=b");
  const parsed = parseCommunityCalculatorState(source.search);
  const href = communityCalculatorHref(source, parsed, 713);
  const target = new URL(href, "https://sod1820.co.il");
  const restored = parseCommunityCalculatorState(target.search);
  assert.equal(restored.name1, "אור");
  assert.equal(restored.name2, "רז");
  assert.equal(restored.compare, true);
  assert.equal(restored.method, "מילוי");
  assert.equal(restored.resultRaw, "713");
  assert.deepEqual(target.searchParams.getAll("source"), ["a", "b"]);
  assert.equal(target.searchParams.get("share"), "abc");
  assert.equal(target.hash, "#comparison");
});

test("baby names, empty comparison slots, family and date/sunset remain distinct on reload", () => {
  const source = location("?mode=baby&babyName=אור&babyName=&babyName=שלום&family=לוי&birthDate=2024-04-22&babyAfterSunset=1&context=1");
  const parsed = parseCommunityCalculatorState(source.search);
  const restored = parseCommunityCalculatorState(new URL(communityCalculatorHref(source, parsed), "https://sod1820.co.il").search);
  assert.equal(restored.babyMode, true);
  assert.deepEqual(restored.baby.names, ["אור", "", "שלום"]);
  assert.equal(restored.baby.family, "לוי");
  assert.equal(restored.baby.bDate, "2024-04-22");
  assert.equal(restored.baby.afterSunset, true);
  assert.equal(restored.baby.showCtx, true);
});

test("date mode and afterSunset use the existing next-Hebrew-day semantics", () => {
  const source = location("?mode=date&date=2024-04-22&afterSunset=true");
  const parsed = parseCommunityCalculatorState(source.search);
  const restored = parseCommunityCalculatorState(new URL(communityCalculatorHref(source, parsed), "https://sod1820.co.il").search);
  assert.equal(restored.dateMode, true);
  assert.equal(restored.afterSunset, true);
  const [y, m, d] = restored.gDate.split("-").map(Number);
  const before = new HDate(new Date(y, m - 1, d));
  const after = restored.afterSunset ? before.next() : before;
  assert.equal(before.getDate(), 14);
  assert.equal(after.getDate(), 15);
  assert.equal(after.abs() - before.abs(), 1);
  const dateLetters = after.renderGematriya().replace(/[^א-ת]/g, "");
  assert.ok(calculateGematriaEnvelope(dateLetters).results.find(row => row.key === "רגיל").value > 0);
});

test("switching tools retains hidden input without silently reopening comparison/date on refresh", () => {
  const parsed = parseCommunityCalculatorState("?mode=compare&w=אור&w2=רז&date=2024-04-22");
  const state = { ...parsed, compare: false, dateMode: false, babyMode: true };
  const restored = parseCommunityCalculatorState(new URL(communityCalculatorHref(location(""), state), "https://sod1820.co.il").search);
  assert.equal(restored.compare, false);
  assert.equal(restored.dateMode, false);
  assert.equal(restored.babyMode, true);
  assert.equal(restored.name2, "רז");
  assert.equal(restored.gDate, "2024-04-22");
});

test("invalid dates are not silently converted to another calendar day", () => {
  for (const value of ["2024-02-31", "2023-02-29", "2024-13-01", "2024-00-01", "2024-01-00", "2024-1-1", "garbage"]) {
    assert.equal(validCommunityCalculatorDate(value), false, value);
    const parsed = parseCommunityCalculatorState(`?mode=date&date=${value}&birthDate=${value}`);
    assert.equal(parsed.gDate, "");
    assert.equal(parsed.baby.bDate, "");
    assert.equal(parsed.invalidDate, true);
    assert.equal(parsed.invalidBirthDate, true);
  }
  assert.equal(validCommunityCalculatorDate("2024-02-29"), true);
});

test("every existing calculation row remains selectable; no fixed thirteen-method replacement", () => {
  const results = calculateGematriaEnvelope("משיח בן דוד").results;
  assert.equal(results.length, CLIENT_GEMATRIA_METHODS.length);
  assert.ok(results.length >= 13);
  for (const row of results) {
    assert.equal(selectCommunityCalculatorResult(results, row.key).row, row);
  }
  assert.equal(selectCommunityCalculatorResult(results, "מסתתר", "604").mismatch, false);
  assert.equal(selectCommunityCalculatorResult(results, "משולש").row.key, "קדמי");
});

test("unknown method and conflicting result never become a Regular result", () => {
  const results = calculateGematriaEnvelope("אור").results;
  const unknown = selectCommunityCalculatorResult(results, "unknown-method", "207");
  assert.equal(unknown.unavailable, true);
  assert.equal(unknown.row, null);
  for (const value of ["208", "-1", "NaN", "207.0", "9007199254740992"]) {
    assert.equal(selectCommunityCalculatorResult(results, "רגיל", value).mismatch, true);
  }
  assert.equal(selectCommunityCalculatorResult(results, "רגיל", "207").mismatch, false);
});

test("number and phrase navigation preserve focus, method and complete calculator return", () => {
  const source = location("?w=משיח+בן+דוד&w2=שלום&compare=1&method=מסתתר&result=604&date=2024-04-22&afterSunset=1&source=x&source=y");
  const state = parseCommunityCalculatorState(source.search);
  const returnHref = communityCalculatorHref(source, state, 604);
  const destination = communityCalculatorNumberNavigation({ value: 604, expression: "משיח בן דוד", method: "מסתתר", returnHref });
  const target = new URL(destination.href, "https://sod1820.co.il");
  assert.match(target.pathname, /\/number\/604$/);
  assert.equal(target.searchParams.get("focus"), "משיח בן דוד");
  assert.equal(target.searchParams.get("method"), "מסתתר");
  assert.equal(destination.context.selection.resultValue, 604);
  assert.equal(destination.context.returnTo.href, returnHref);
  assert.equal(destination.context.returnTo.label, "מחשבון הקהילה");
  const phrase = communityCalculatorNumberNavigation({ value: 207, expression: "רז", returnHref });
  assert.equal(new URL(phrase.href, "https://sod1820.co.il").searchParams.get("focus"), "רז");
});

test("sharing retains harmless parameters but excludes credentials through the existing sanitizer", () => {
  const source = location("?w=אור&token=private&access_token=private&_vercel_share=grant&source=one&source=two");
  const url = new URL(communityCalculatorHref(source, parseCommunityCalculatorState(source.search), 207), "https://sod1820.co.il");
  for (const key of ["token", "access_token", "_vercel_share"]) assert.equal(url.searchParams.has(key), false);
  assert.deepEqual(url.searchParams.getAll("source"), ["one", "two"]);
});

test("presentation is opt-in; public mount guards existing wall, telemetry and AI entry points", () => {
  const controller = fs.readFileSync(new URL("../src/pages/CommunityCalculatorPage.jsx", import.meta.url), "utf8");
  const adapter = fs.readFileSync(new URL("../src/pages/CommunityCalculator2029Page.jsx", import.meta.url), "utf8");
  assert.match(controller, /if \(renderCalculator\) return renderCalculator/);
  assert.match(controller, /if \(renderTool\) return renderTool/);
  assert.match(controller, /if \(actionsLocked \|\| !r1 \|\| aiBusy\) return/);
  assert.match(controller, /if \(actionsLocked \|\| !a \|\| ai\[idx\]\?\.busy\) return/);
  assert.match(controller, /if \(passive \|\| actionsLocked\) return undefined/);
  assert.match(controller, /if \(!passive && !actionsLocked\) addWallWord/);
  assert.match(controller, /if \(!passive && !actionsLocked && r2\)/);
  assert.match(adapter, /publicLaunchActionsLocked\(useAuth\(\)\.isAdmin\)/);
  assert.match(adapter, /initialState=\{initialState\} passive actionsLocked=\{actionsLocked\}/);
  assert.match(adapter, /<Sod2029Shell surface="community"/);
  assert.match(adapter, /key=\{location\.key\}/);
  assert.match(adapter, /window\.history\.replaceState\(window\.history\.state, "", returnHref\)/);
  assert.doesNotMatch(adapter, /calculateGematriaEnvelope|\bMETHODS\b|fetch\(|getAiAnalysis|addWallWord|track\(/);
});
