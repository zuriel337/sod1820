import { mistater } from "../src/lib/gematria.js";
import { readFileSync } from "fs";

const f = process.argv[2];
let raw = readFileSync(f, "utf8");
const a = raw.indexOf("["), b = raw.lastIndexOf("]");
const rows = JSON.parse(raw.slice(a, b + 1));

let bad = [], rootIsOneWord = 0, otherCause = [];
for (const r of rows) {
  if (r.misratar == null) continue;
  const correct = mistater(r.phrase);
  if (correct !== r.misratar) {
    bad.push({ phrase: r.phrase, stored: r.misratar, correct, v: r.is_verified });
    // האם הערך המאוחסן = חישוב כמילה אחת (התעלמות מהרווח)?
    const oneWord = mistater(r.phrase.replace(/\s+/g, ""));
    if (oneWord === r.misratar) rootIsOneWord++;
    else otherCause.push({ phrase: r.phrase, stored: r.misratar, correct, oneWord, v: r.is_verified });
  }
}
const badV = bad.filter(r => r.v).length;
console.log("נבדקו (רב-מיליים):", rows.length);
console.log("אי-התאמות מסתתר:", bad.length, "| מאומתות (חיות):", badV, "| מוסתרות:", bad.length - badV);
console.log("מתוך אי-ההתאמות: שורש = 'חושב כמילה אחת':", rootIsOneWord, "| סיבה אחרת:", otherCause.length);
console.log("\n--- 15 דוגמאות לסיבה אחרת (לא רק הרווח) ---");
otherCause.slice(0, 15).forEach(r =>
  console.log(`${r.v ? "[חי]" : "[מוס]"} "${r.phrase}"  מאוחסן=${r.stored} נכון=${r.correct} מילה-אחת=${r.oneWord}`));
