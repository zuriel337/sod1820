// src/lib/dayContext.js — הקשר-יום קנוני משותף לכל שכבות SOD1820 שצריכות לפרש תנועה.
// מקור-אמת אחד: @hebcal/core + לוח ישראל + Asia/Jerusalem.
// ⛔ זהו context בלבד: אינו משנה Human/Bot/Unknown, אינו הופך JS challenge ל-Human proof,
// ואינו רשאי לשנות traffic policy / strict_level / mode ללא Human Gate מפורש.
import { HDate, HebrewCalendar, flags } from "@hebcal/core";

export const ISRAEL_TIME_ZONE = "Asia/Jerusalem";
export const DAY_CONTEXT_VERSION = "traffic-day-context-v1";

const ISO_DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function israelYmd(input = new Date()) {
  if (typeof input === "string") {
    const m = input.match(ISO_DAY_RE);
    if (m) return { year: +m[1], month: +m[2], day: +m[3] };
  }

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function stableGregorianDate(ymd) {
  // Noon UTC keeps the intended Israel calendar date stable across DST/time-zone conversions.
  return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12, 0, 0));
}

function holidayName(ev) {
  try { return ev.render("he"); } catch { /* fall through */ }
  try { return ev.getDesc(); } catch { return null; }
}

export function getDayContext(input = new Date()) {
  const ymd = israelYmd(input);
  if (!ymd) return null;
  const greg = stableGregorianDate(ymd);
  const hdate = new HDate(greg);
  const events = HebrewCalendar.getHolidaysOnDate(hdate, true) || [];
  const isShabbat = greg.getUTCDay() === 6;
  const isHoliday = events.some((ev) => ((ev.getFlags?.() || 0) & flags.CHAG) !== 0);
  const lowHumanExpected = isShabbat || isHoliday;
  const day = `${ymd.year}-${String(ymd.month).padStart(2, "0")}-${String(ymd.day).padStart(2, "0")}`;

  return {
    version: DAY_CONTEXT_VERSION,
    day,
    time_zone: ISRAEL_TIME_ZONE,
    schedule: "israel",
    day_type: isShabbat ? "shabbat" : isHoliday ? "holiday" : "normal",
    is_shabbat: isShabbat,
    is_holiday: isHoliday,
    holiday_names: events.map(holidayName).filter(Boolean),
    hebrew_date: hdate.toString(),

    // Traffic interpretation contract.
    expected_human_traffic: lowHumanExpected ? "very_low" : "normal",
    suppress_human_drop_as_policy_success: lowHumanExpected,
    compare_human_to_same_day_type: true,

    // Classification / Human-Gate invariants. Consumers must not override these.
    human_bot_unknown_separate: true,
    js_challenge_is_human_proof: false,
    automatic_policy_change_allowed: false,
    human_gate_required_for_policy_change: true,
  };
}

export function annotateTrafficRows(rows, dayKeys = ["day", "date"]) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    const key = dayKeys.find((k) => row[k]);
    if (!key) return row;
    const dayContext = getDayContext(String(row[key]).slice(0, 10));
    return dayContext ? { ...row, day_context: dayContext } : row;
  });
}

export function attachTrafficDayContext(payload, input = new Date()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const context = getDayContext(input);
  return context ? { ...payload, day_context: context } : payload;
}

export function annotateTrafficPayloadDaily(payload, input = new Date()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const out = attachTrafficDayContext(payload, input);
  for (const key of ["daily", "days", "series"]) {
    if (Array.isArray(out[key])) out[key] = annotateTrafficRows(out[key], ["day", "date", "period"]);
  }
  return out;
}
