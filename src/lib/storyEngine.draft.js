// ⚠️ טיוטה (DRAFT) — מנוע הסיפור · "מה המספר שלך מנסה לספר לך"
// ---------------------------------------------------------------
// הרעיון: לא להציג טבלת מספרים — אלא לקחת מילה, לחשב אותה דרך
// המנוע הרשמי (src/lib/gematria.js), ולשזור מתוך התוצאה *סיפור*:
// כל שיטה היא "פָּנים" אחרות של אותה מילה, ולכל שיטה יש נשמה (soul).
// המנוע מחפש את ה"קול שחוזר" (התכנסות פנימית) ואת המגע ב-1820.
//
// חוק (gematria_engine_law): אסור לחשב גימטריה מהזיכרון — לכן כל
// החישובים כאן עוברים אך ורק דרך METHODS שמיוצא מ-gematria.js.
// כשנעבור מטיוטה למנוע אמיתי — כאן נחבר גם: מילים שוות (cross-method),
// פסוקים מקושרים, פוסטים, וזיהוי התכנסויות מה-DB.

import { METHODS, onlyHeb } from "./gematria.js";

// מספרים בעלי "משקל" במערכת — מתי מילה "נוגעת" במשהו גדול.
const ANCHORS = {
  1820: "שם ה׳ בתורה — 1820 פעם. סוד הפרויקט כולו.",
  26: "שם הוי״ה (יהוה).",
  13: "אחד / אהבה.",
  18: "חי.",
  91: "אמן (יהוה+אדני) — האיחוד.",
};

// בודק קרבה של ערך לעוגן: קודם התאמה מדויקת, ואחריה כפולה.
function anchorTouch(value) {
  const entries = Object.entries(ANCHORS).map(([n, meaning]) => ({ num: Number(n), meaning }));
  for (const { num, meaning } of entries)
    if (value === num) return { num, meaning, kind: "שווה בדיוק ל" };
  for (const { num, meaning } of entries)
    if (value !== 0 && num !== 0 && value % num === 0)
      return { num, meaning, kind: `כפולה (×${value / num}) של ` };
  return null;
}

// ===== המנוע (טיוטה) =====
// מקבל מילה → מחזיר אובייקט "סיפור" שאפשר לרנדר.
export function tellStory(rawWord) {
  const word = String(rawWord || "").trim();
  const letters = onlyHeb(word);
  if (!letters.length) {
    return { word, empty: true, opening: "תן לי מילה בעברית ואספר לך מה היא מנסה לומר." };
  }

  // 1) שמונה פנים — ערך + נשמה לכל שיטה (דרך המנוע הרשמי בלבד)
  const faces = METHODS.map(m => ({
    method: m.key,
    soul: m.soul,
    value: m.fn(word),
  }));

  // 2) הקול שחוזר — ערך שמופיע ביותר משיטה אחת = התכנסות פנימית
  const counts = faces.reduce((acc, f) => {
    (acc[f.value] = acc[f.value] || []).push(f.method);
    return acc;
  }, {});
  const echoes = Object.entries(counts)
    .filter(([, methods]) => methods.length > 1)
    .map(([value, methods]) => ({ value: Number(value), methods }));

  // 3) מגע בעוגן — האם פָּנים כלשהן נוגעות ב-1820 / 26 / 13 ...
  const touches = faces
    .map(f => ({ ...f, touch: anchorTouch(f.value) }))
    .filter(f => f.touch);

  // 4) המסר — שזירה לשורה אחת אנושית
  const ragil = faces.find(f => f.method === "רגיל");
  const lines = [];
  lines.push(`לקחת את «${word}». ביסוד (רגיל) היא ${ragil.value}.`);
  for (const e of echoes) {
    lines.push(
      `יש כאן קול שחוזר: ${e.methods.join(" ו")} מתלכדים שניהם על ${e.value} — המילה "מסכימה עם עצמה".`
    );
  }
  for (const t of touches) {
    lines.push(
      `ב${t.method} (${t.soul}) היא ${t.value} — ${t.touch.kind}${t.touch.num}: ${t.touch.meaning}`
    );
  }
  if (!echoes.length && !touches.length) {
    lines.push("היא שומרת על עצמה — אין כאן עדיין מגע גלוי בעוגנים. הסיפור האמיתי מתחיל כשמשווים אותה למילים אחרות.");
  }

  return {
    word,
    faces,
    echoes,
    touches,
    opening: lines[0],
    message: lines.join(" "),
  };
}
