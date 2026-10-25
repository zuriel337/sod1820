// "חבילת מחקר לקלוד" — a deterministic, offline research packet built ONLY from the canonical gematria engine
// (src/lib/gematria.js). It is a plain text hand-off the user pastes to Claude in the active session; Claude then
// writes the interpretation. No network, no database, no model call, no Raziel session: this module has no side effects
// and never computes anything beyond what the canonical engine already defines.
import { METHODS, methodLabel, normalizeForCalc, onlyHeb } from "../gematria.js";

export const CLAUDE_PACKET_VERSION = 1;
export const CLAUDE_PACKET_MAX_LENGTH = 80;

const GROUP_ROLE = Object.freeze({ "אתבש": "מראה", "מילוי": "פנימיות", "מסתתר": "רובד נסתר" });

export function normalizeClaudePacketExpression(raw) {
  const text = normalizeForCalc(String(raw ?? "")).trim().replace(/\s+/gu, " ");
  if (!text || text.length > CLAUDE_PACKET_MAX_LENGTH || onlyHeb(text).length === 0) return null;
  return text;
}

// Returns null for an empty/non-Hebrew expression; otherwise a frozen object { expression, rows, groups, text }.
export function buildClaudePacket(raw) {
  const expression = normalizeClaudePacketExpression(raw);
  if (!expression) return null;
  const rows = METHODS.map((method) => ({ key: method.key, label: methodLabel(method.key), value: method.fn(expression) }));
  const byValue = new Map();
  for (const row of rows) byValue.set(row.value, [...(byValue.get(row.value) || []), row.label]);
  const groups = [...byValue.entries()].filter(([, labels]) => labels.length > 1).map(([value, labels]) => ({ value, labels }));
  const regular = rows.find((row) => row.key === "רגיל");
  // Final letters are visible in the engine's own values: גדול differs from רגיל exactly when the expression has final letters.
  const sofiyot = rows.find((row) => row.key === "גדול").value !== regular.value;
  const lines = [
    "חבילת מחקר לקלוד — SOD1820 / 2029",
    `גרסה: ${CLAUDE_PACKET_VERSION}`,
    `מקור המספרים: מנוע הגימטריה הקנוני (src/lib/gematria.js), חישוב דטרמיניסטי בדפדפן. אל תחשב מחדש ואל תוסיף מספרים.`,
    "",
    `הביטוי: ${expression}`,
    `הערך הרגיל: ${regular.value}`,
    "",
    "ערכי כל השיטות:",
    ...rows.map((row) => `${row.label} = ${row.value}${GROUP_ROLE[row.key] ? ` (${GROUP_ROLE[row.key]})` : ""}`),
    "",
    groups.length
      ? `שיטות שמחזירות אותו ערך: ${groups.map((group) => `${group.value}: ${group.labels.join(" · ")}`).join("; ")}.`
      : "אין שיטות שמחזירות אותו ערך.",
    sofiyot
      ? "בביטוי יש אותיות סופיות: רגיל וגדול נבדלים."
      : "בביטוי אין אותיות סופיות: רגיל = גדול הוא כפילות מבנית ולא הצלבה.",
    "",
    "הוראה לקלוד: כתוב פרשנות בפרוזה זורמת, מתחילה מהביטוי עצמו ומערכו הרגיל, ואחר כך על השכבות לפי הסדר: קבוצת הביטויים באותו ערך (אם הועברה), אתבש כמראה, מילוי כפנימיות, מסתתר כרובד נסתר, וסינתזה אחת. הפרד עובדה (המספרים שכאן) מפרשנות; אל תמציא מקור, ביוגרפיה או קשר מסורתי; הנרמול הוא בלם אמינות בלבד. השער האנושי נשאר של צוריאל.",
  ];
  return Object.freeze({ version: CLAUDE_PACKET_VERSION, expression, rows: Object.freeze(rows), groups: Object.freeze(groups), text: lines.join("\n") });
}
