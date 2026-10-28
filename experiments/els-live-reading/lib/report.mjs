// The report ZURIEL asked for: which model ran, exactly what it received, what it proposed before verification, what the engine verified and what it did not,
// time and cost, what the region left out, and (separately, after the run) whether the evaluation targets were found.
import { createHash } from "node:crypto";

const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const parts = (finding) => (Array.isArray(finding.parts) && finding.parts.length > 1 ? finding.parts.join(" + ") : "");

export function renderReport({ meta, input, rounds, classified, evaluation }) {
  const out = [];
  out.push("# קריאת עברית חיה באזור מוגבל של מטריצה — דוח", "");
  out.push("## 1. מה הופעל");
  out.push(`- מודל שהתבקש: \`${meta.requestedModel}\`; מודל שהוחזר בתשובת ה-API: \`${rounds.map((r) => r.servedModel).join("`, `")}\``);
  out.push(`- בדיקת זמינות לפני הבחירה: ${meta.preflight ? `רשום ברשימת המודלים של המפתח; חלון הקלט ${meta.preflight.max_input_tokens}, פלט מקסימלי ${meta.preflight.max_tokens_limit}; ספירת קלט מדויקת לפני השליחה: ${meta.preflight.input_tokens_counted}` : "לא בוצעה"}`);
  out.push(`- הגדרות: thinking adaptive (summarized), effort \`${meta.effort}\`, max_tokens ${meta.maxTokens}, structured output (JSON schema), ללא fallback למודל אחר, ללא כלים`);
  out.push("");
  out.push("## 2. מה בדיוק התקבל");
  out.push(`- בקשה סבב 1: sha256 \`${input.round1Sha}\`, ${input.systemChars} תווים בהנחיית המערכת, ${input.userChars} תווים בהודעת המשתמש (הקובץ המלא נשמר ב-review/request-round1.txt).`);
  out.push(`- האזור: ${input.nRows} שורות × ${input.nCols} עמודות (${input.cells} תאים), ${input.lines} קווים בשני כיווני קריאה (שורות ${input.byKind.R}, טורים ${input.byKind.C}, אלכסונים ↘ ${input.byKind.D}, אלכסונים ↙ ${input.byKind.A}). האותיות מהמנוע הקנוני, נבדקו אחת-אחת מול האותיות המוטמעות בעמוד: ${input.pageMismatches} אי-התאמות.`);
  out.push(`- מה לא נכלל: ${input.omittedShortLines} קווים קצרים משלוש אותיות (פינות), ומה שמחוץ לגבולות האזור (המטריצה ממשיכה למעלה, שמאלה וימינה; למטה זרם האותיות נגמר). לא קוצץ שום קו בגלל מגבלת גודל; בדיקת הגודל נעשית לפני השליחה והריצה נעצרת במקום לקצץ.`);
  out.push(`- סבבים: ${rounds.length}${rounds.length > 1 ? " (השני כלל כרטיסי שכונה שהוכנו מהמנוע להצעות מאומתות)" : ""}`);
  out.push("");
  out.push("## 3. מה המודל הציע לפני האימות");
  rounds.forEach((round, k) => {
    out.push(`### סבב ${k + 1}: ${round.findings.length} הצעות (stop_reason: ${round.stopReason}${round.stopDetails ? `, ${JSON.stringify(round.stopDetails)}` : ""})`);
    out.push("| id | קו | טקסט | חלוקה | סוג | בנושא | המשך | ממנה | הערת המודל |", "|---|---|---|---|---|---|---|---|---|");
    for (const f of round.findings) out.push(`| ${cell(f.id)}${f.modelId ? ` (${cell(f.modelId)})` : ""} | ${cell(f.line)} | ${cell(f.text)} | ${cell(parts(f))} | ${cell(f.kind)} | ${f.story_related ? "כן" : "לא"} | ${f.continue_from ? "כן" : ""} | ${cell(f.from_finding)} | ${cell(f.note)} |`);
    if (round.observations) out.push("", `הערות המודל על כיסוי: ${round.observations}`);
    out.push("");
  });
  const verified = classified.filter((f) => f.verdict !== "not_verified");
  const notVerified = classified.filter((f) => f.verdict === "not_verified");
  out.push("## 4. מה המנוע הקנוני אימת");
  out.push(`${verified.length} מתוך ${classified.length} הצעות. אימות = האותיות בזרם בעמדה שנטענה זהות להצעה, ובדילוג 2 ומעלה גם המנוע הקנוני עצמו (\`els_search_page_core_v1\`) מחזיר מופע באותה התחלה ובאותו כיוון. שורות רגילות (דילוג 1) מאומתות רק כטקסט רגיל, לא כ-ELS. אימות אינו שיפוט על המשמעות.`);
  out.push("| הצעה | טקסט | קו | אומת ע\"י | מופעים מאומתים מתוך | הערה |", "|---|---|---|---|---|---|");
  for (const f of verified) out.push(`| ${cell(f.id)} | ${cell(f.text)} | ${cell(f.occurrences[0]?.reading)} | ${f.verdict === "verified_by_engine" ? "המנוע" : "טקסט רגיל בלבד"} | ${f.verifiedOccurrences}/${f.occurrences.length} (${f.totalOccurrences} בקטע) | ${cell(f.segmentationOk ? "" : "החלוקה נדחתה: החלקים אינם מרכיבים את הטקסט")} |`);
  out.push("");
  out.push("## 5. מה לא אומת");
  out.push(`${notVerified.length} הצעות.`);
  out.push("| הצעה | טקסט | קו שצוין | סיבה |", "|---|---|---|---|");
  for (const f of notVerified) out.push(`| ${cell(f.id)} | ${cell(f.rawText)} | ${cell(f.line)} | ${cell(f.reasons.join("; "))} |`);
  out.push("");
  out.push("## 6. זמן ועלות");
  rounds.forEach((round, k) => out.push(`- סבב ${k + 1}: ${(round.ms / 1000).toFixed(1)} ש'; טוקנים: קלט ${round.usage?.input_tokens ?? "?"}, כתיבה למטמון ${round.usage?.cache_creation_input_tokens ?? 0}, קריאה ממטמון ${round.usage?.cache_read_input_tokens ?? 0}, פלט (כולל חשיבה) ${round.usage?.output_tokens ?? "?"}; עלות לפי מחירון: ${round.cost.usd === null ? round.cost.basis : `$${round.cost.usd}`}`));
  const total = rounds.reduce((s, r) => s + (r.cost.usd ?? 0), 0);
  out.push(`- סה"כ: ${(rounds.reduce((s, r) => s + r.ms, 0) / 1000).toFixed(1)} ש', $${total.toFixed(4)} (חישוב לפי מחירון ולא לפי חשבונית; ${rounds[0]?.cost.basis ?? ""})`);
  out.push("");
  if (evaluation) {
    out.push("## 7. האם נמצאו יעדי ההערכה (נבדק רק אחרי התשובה; לא היו בקלט או בקוד הריצה)");
    out.push("| יעד | מיקומים בקטע | התוצאה הטובה ביותר | הצעות |", "|---|---|---|---|");
    for (const e of evaluation) out.push(`| ${cell(e.target)} | ${e.placementsInRegion.join(", ") || "אין"} | ${e.best} | ${Object.entries(e.hits).filter(([, v]) => v.length).map(([k, v]) => `${k}: ${v.join(",")}`).join("; ") || "—"} |`);
    out.push("");
  }
  out.push("## 8. מגבלות", "- בדיקה ראשונית על אזור אחד ומודל אחד, לא הוכחה לאיכות כללית.", "- אימות הוא על האותיות והמיקום בלבד; המשמעות היא פרשנות של המודל ולא ממצא.", "- חישוב העלות לפי מחירון, לא לפי חשבונית.");
  const text = out.join("\n");
  return { text, sha256: sha(text) };
}
