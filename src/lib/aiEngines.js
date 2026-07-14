// 🤖 שני מנועי-ה-AI — מזוהים לפי *המהות* שלהם, לא לפי שם-החברה (החלטת צוריאל 14.7):
//   הפרשן (Claude)  = עומק, חום ופרשנות נאמנה — הכי חזק בניתוח הממוזג הארוך והפרשני.
//   האנליטי (Gemini) = זווית אנליטית מהירה, מבט רחב ומשלים — «דעה שנייה» על אותן עובדות.
// ⚠️ המפתחות הפנימיים נשארים 'claude'/'gemini' (חוזה ה-Edge Function + לוג ai_analysis_log) —
//    זהו שם-תצוגה בלבד. אין לשנות את המפתחות, רק את השם/התיאור שהמשתמש רואה.
export const AI_ENGINES = {
  claude: { key: "claude", name: "הפרשן",  emoji: "🔵", color: "#3ea6ff", tagline: "עומק, חום ופרשנות נאמנה" },
  gemini: { key: "gemini", name: "האנליטי", emoji: "🟣", color: "#8a63f4", tagline: "זווית אנליטית מהירה, מבט משלים" },
};
export const engInfo = (k) => AI_ENGINES[k] || AI_ENGINES.claude;
export const engName = (k) => engInfo(k).name;
export const engEmoji = (k) => engInfo(k).emoji;
