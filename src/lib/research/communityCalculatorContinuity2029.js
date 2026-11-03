import { publicPageShareUrl } from "../publicPostUrls.js";
import { canonicalMethodPublicLabel } from "../presentation/canonicalPresentation.js";
import { buildCalculatorNumberNavigation } from "./calculator2029Model.js";

// Address/state adaptation for the existing community calculator. Calculation
// stays in CommunityCalculatorPage and its existing gematria/date engines.
const text = value => String(value ?? "");
const enabled = value => /^(?:1|true|yes)$/i.test(text(value));
const first = (params, keys) => keys.map(key => params.get(key)).find(value => value != null) ?? "";

export function validCommunityCalculatorDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(value))) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  return year > 0 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function parseCommunityCalculatorState(search = "") {
  const params = new URLSearchParams(search);
  const mode = params.get("mode");
  const name1 = first(params, ["w", "q", "calc", "name1"]);
  const name2 = first(params, ["w2", "name2", "compareWith"]);
  const rawDate = first(params, ["date", "gDate"]);
  const rawBirthDate = first(params, ["birthDate", "bDate"]);
  const family = first(params, ["family", "surname"]);
  const babyMode = mode === "baby" || enabled(params.get("babyMode"));
  const names = params.getAll("babyName");
  const oldNames = params.getAll("names");
  const babyNames = names.length ? names : oldNames.length ? oldNames : [babyMode ? name1 : ""];
  const resultRaw = first(params, ["result", "v"]);
  return {
    name1, name2,
    compare: params.has("compare") ? enabled(params.get("compare")) : mode === "compare" || Boolean(name2),
    babyMode,
    dateMode: params.has("dateMode") ? enabled(params.get("dateMode")) : mode === "date" || Boolean(rawDate),
    gDate: validCommunityCalculatorDate(rawDate) ? rawDate : "",
    afterSunset: enabled(params.get("afterSunset")),
    method: first(params, ["method", "m"]) || "רגיל",
    resultRaw,
    invalidDate: Boolean(rawDate && !validCommunityCalculatorDate(rawDate)),
    invalidBirthDate: Boolean(rawBirthDate && !validCommunityCalculatorDate(rawBirthDate)),
    baby: {
      names: babyNames.slice(0, 3), family,
      bDate: validCommunityCalculatorDate(rawBirthDate) ? rawBirthDate : "",
      afterSunset: enabled(params.get("babyAfterSunset")) || (babyMode && enabled(params.get("afterSunset"))),
      showCtx: enabled(params.get("context")) || Boolean(family || rawBirthDate),
    },
  };
}

export function selectCommunityCalculatorResult(rows = [], method = "רגיל", resultRaw = "") {
  // A requested method is identity, not a hint to fall back to Regular.
  const row = rows.find(item => item.key === method || canonicalMethodPublicLabel(item.key) === method) || null;
  const expected = /^\d+$/.test(text(resultRaw)) && Number.isSafeInteger(Number(resultRaw)) ? Number(resultRaw) : null;
  const hasClaim = text(resultRaw) !== "";
  return {
    row,
    unavailable: rows.length > 0 && !row,
    mismatch: Boolean(row && hasClaim && (expected == null || expected !== row.value)),
  };
}

export function communityCalculatorHref(location = {}, state = {}, resultValue) {
  const safe = publicPageShareUrl(location, "https://sod1820.co.il/community/calculator");
  const url = new URL(safe || "https://sod1820.co.il/community/calculator");
  const p = url.searchParams;
  const set = (key, value, aliases = []) => {
    const next = text(value);
    if (next) p.set(key, next); else p.delete(key);
    for (const alias of aliases) if (p.has(alias)) {
      if (next) p.set(alias, next); else p.delete(alias);
    }
  };
  set("w", state.name1, ["q", "calc", "name1"]);
  set("w2", state.name2, ["name2", "compareWith"]);
  set("method", state.method || "רגיל", ["m"]);
  if (resultValue !== undefined) set("result", resultValue, ["v"]);
  set("mode", state.babyMode ? "baby" : state.dateMode ? "date" : state.compare ? "compare" : "");
  set("compare", state.compare ? "1" : state.name2 ? "0" : "");
  set("babyMode", state.babyMode ? "1" : "");
  set("dateMode", state.dateMode ? "1" : state.gDate ? "0" : "");
  set("date", state.gDate, ["gDate"]);
  set("afterSunset", state.afterSunset ? "1" : "");
  const baby = state.baby || {};
  p.delete("babyName");
  const names = baby.names || [""];
  if (names.some(Boolean) || names.length > 1) names.forEach(name => p.append("babyName", text(name)));
  if (p.has("names")) { p.delete("names"); names.forEach(name => p.append("names", text(name))); }
  set("family", baby.family, ["surname"]);
  set("birthDate", baby.bDate, ["bDate"]);
  set("babyAfterSunset", baby.afterSunset ? "1" : "");
  set("context", baby.showCtx ? "1" : "");
  return url.pathname + url.search + url.hash;
}

export function communityCalculatorNumberNavigation({ value, expression, method = "רגיל", returnHref, current = {} }) {
  const origin = new URL(returnHref, "https://sod1820.co.il");
  // A first anonymous visit has no ResearchProvider context yet. The canonical
  // navigation builder expects an object, not that legitimate null state.
  const destination = buildCalculatorNumberNavigation({ expression, methodKey: method, resultValue: value }, origin, current || {});
  if (destination) destination.context.returnTo.label = "מחשבון הקהילה";
  return destination;
}
