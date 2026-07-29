// 💳 שכבת-קרדיטים — עלויות-חיוב ועוזרי-לקוח.
// הבקאנד: credit_spend(p_cost,p_reason,p_ref) (SECURITY DEFINER) — מנכה אם יש יתרה, אחרת מחזיר insufficient.
// ⚠️ גידור פעולה = החלטת-מוצר: להחיל רק על פעולות פרימיום (לא על דף ויראלי כמו /name),
//    ורק למשתמש מחובר. אנונימי → נשאר בשער-ההרשמה הקיים.
import { supabase } from "./supabase.js";

// עלויות (קרדיטים) — תואם כלכלת-הקרדיטים שסוכמה עם צוריאל
export const CREDIT_COST = {
  els: 30,        // חיפוש/ניתוח ELS מלא
  cross: 20,      // הצלבה
  name_deep: 40,  // מעבדת-שם עומק (לא הטעימה החינמית)
  report: 50,     // דוח-AI עומק («חקור הכל»)
  journey: 60,    // מסע-AI
};

// מנסה לחייב. מחזיר {ok:true, balance} או {ok:false, error:'insufficient'|'auth'|'err', balance, need}.
// עלות 0/חסרה → מחזיר ok בלי לחייב (fail-open).
export async function spendCredits(cost, reason, ref = null) {
  if (!supabase || !cost) return { ok: true, balance: null };
  try {
    const { data, error } = await supabase.rpc("credit_spend", {
      p_cost: cost, p_reason: reason, p_ref: ref,
    });
    if (error) return { ok: false, error: "err" };
    return data || { ok: false, error: "err" };
  } catch { return { ok: false, error: "err" }; }
}

// בדיקה מהירה אם ליתרה (מ-profile.credits) יש מספיק — לפני שמריצים פעולה יקרה.
export function hasCredits(profile, cost) {
  return (profile?.credits ?? 0) >= (cost || 0);
}
