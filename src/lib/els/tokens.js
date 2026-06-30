// 🔒 טוקנים לצופן (Sod Credits) — תשתית-גייטינג. כרגע **לא נאכף** (כמו ELS_PUBLIC):
// אדמין עובד מלא, לציבור מוצגות תוויות-טוקנים, וניכוי-קרדיט אמיתי ייכנס כשתיבנה
// טבלת profiles/credits. ביום ההפעלה — הופכים ELS_TOKENS_ENFORCED ל-true, בשורה אחת.
export const ELS_TOKENS_ENFORCED = false;

// עלויות (placeholder — צוריאל מכוון; תואם platform_tiers_law: ELS=10 קרדיט).
export const TOKEN_COST = {
  tanakh: 10,      // חיפוש בכל התנ״ך
  crossExtra: 15,  // חיפוש מוצלב מעבר לחינמי הראשון
};
export const FREE_CROSS = 1; // חיפוש מוצלב חינם ראשון; מעבר לזה — טוקנים

// תווית-טוקנים למצב (להצגה בשער). admin = פתוח; אכיפה אמיתית בעתיד.
export function tokenLabel(mode, isAdmin) {
  if (isAdmin || !ELS_TOKENS_ENFORCED) {
    if (mode === "tanakh") return `🔒 ${TOKEN_COST.tanakh} טוקנים`;
    if (mode === "cross") return `🔒 ${TOKEN_COST.crossExtra} טוקנים (1 חינם)`;
    return "חינם";
  }
  return mode === "torah" ? "חינם" : "🔒 טוקנים";
}
