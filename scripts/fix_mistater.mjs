// מחשב מחדש מסתתר דרך המנוע הרשמי, מייצר גיבוי + SQL תיקון.
// תיקון רק כאשר: הערך המאוחסן שגוי וגם שווה לחישוב "מילה אחת" (שורש הבאג הוודאי).
// 3 חריגים (סיבה אחרת) — לא נוגעים, לבדיקה ידנית.
import { mistater } from "../src/lib/gematria.js";
import { readFileSync, writeFileSync } from "fs";

const rows = JSON.parse(readFileSync("/tmp/mw_id.json", "utf8"));
const fixes = [], skipped = [];
for (const r of rows) {
  if (r.misratar == null) continue;
  const correct = mistater(r.phrase);
  if (correct === r.misratar) continue;
  const oneWord = mistater(r.phrase.replace(/\s+/g, ""));
  if (oneWord === r.misratar) fixes.push({ id: r.id, phrase: r.phrase, old: r.misratar, neu: correct });
  else skipped.push({ id: r.id, phrase: r.phrase, old: r.misratar, correct, oneWord });
}

// גיבוי (לשחזור): id, ערך ישן, ערך חדש
writeFileSync("/tmp/mistater_backup.json", JSON.stringify(fixes, null, 0));

// SQL תיקון — UPDATE ... FROM (VALUES ...) לפי id, בבאצ'ים של 500
const esc = s => "'" + String(s).replace(/'/g, "''") + "'";
let sql = "-- תיקון מסתתר (misratar_multi): " + fixes.length + " שורות, חישוב מחדש דרך המנוע הרשמי\n";
for (let i = 0; i < fixes.length; i += 500) {
  const batch = fixes.slice(i, i + 500);
  const vals = batch.map(f => `(${esc(f.id)}::uuid, ${f.neu})`).join(",\n  ");
  sql += `update gematria_words g set misratar = v.neu\nfrom (values\n  ${vals}\n) as v(id, neu)\nwhere g.id = v.id;\n\n`;
}
writeFileSync("/tmp/fix_mistater.sql", sql);

// SQL שחזור (ליתר ביטחון)
let revert = "-- שחזור מסתתר לערכים הישנים\n";
for (let i = 0; i < fixes.length; i += 500) {
  const batch = fixes.slice(i, i + 500);
  const vals = batch.map(f => `(${esc(f.id)}::uuid, ${f.old})`).join(",\n  ");
  revert += `update gematria_words g set misratar = v.old\nfrom (values\n  ${vals}\n) as v(id, old)\nwhere g.id = v.id;\n\n`;
}
writeFileSync("/tmp/revert_mistater.sql", revert);

console.log("לתיקון:", fixes.length, "| חריגים שדולגו:", skipped.length);
console.log("חריגים:", JSON.stringify(skipped, null, 0));
console.log("נכתב: /tmp/fix_mistater.sql, /tmp/revert_mistater.sql, /tmp/mistater_backup.json");
