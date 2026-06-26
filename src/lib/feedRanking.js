// ===== דירוג פיד קל לפי שערים (הבדלה עדינה — לא פידים נפרדים) =====
// פיד אחד לכולם. פוסט שקשור לשער של המשתמש מקבל BOOST; השאר עדיין מופיע, נמוך יותר.
// מקור האות: הנושאים שנשמרו (notification_prefs) — מצולמים ל-localStorage לדירוג מיידי
// ללא סיבוב-רשת. זה שלב product-market-fit, לא מנוע פרסונליזציה מורכב.

const KEY = "sod_topics";

export function getStoredTopics() {
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export function storeTopics(topics) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set(topics || [])])); }
  catch { /* noop */ }
}

// מיזוג — לא לדרוס בחירות קודמות (שער הבית + פוסט + מרכז התראות מצטברים).
export function mergeStoredTopics(topics = []) {
  storeTopics([...getStoredTopics(), ...topics]);
}

// topic → סימנים לזיהוי קשר בפוסט/כרטיס (קטגוריות / מילות-מפתח / מספרים).
const TOPIC_SIGNALS = {
  beit_midrash: { cats: ["רמזים חזקים", "סוד האותיות והמספרים", "בית המקדש"], kw: ["התכנסות", "הצלבה", "חידוש", "גימטריה"] },
  gematria:     { kw: ["גימטריה", "גימטריא", "מספר", "ערך"] },
  hints:        { kw: ["רמז", "רמזים", "סימן"] },
  news:         { cats: ["תיעוד אירועים"], kw: ["חדשות", "אירוע", "עדכון", "בזמן אמת"] },
  els:          { kw: ["דילוג", "דילוגי אותיות", "els", "צופן"] },
  num_1820:     { nums: [1820], kw: ["1820"] },
  courses:      { cats: ["קורס", "שיעור", "לימוד"], kw: ["קורס", "שיעור"] },
};

// item מנורמל: { text, categories: string[], numbers: number[] }
export function isRelatedToTopics(item, topics) {
  if (!topics?.length || !item) return false;
  const hay = String(item.text || "").toLowerCase();
  const cats = (item.categories || []).map(c => String(c).toLowerCase());
  const nums = item.numbers || [];
  return topics.some(t => {
    const sig = TOPIC_SIGNALS[t];
    if (!sig) return false;
    if (sig.nums && sig.nums.some(n => nums.includes(n))) return true;
    if (sig.cats && sig.cats.some(c => cats.some(pc => pc.includes(c.toLowerCase())))) return true;
    if (sig.kw && sig.kw.some(k => hay.includes(k.toLowerCase()))) return true;
    return false;
  });
}

// boost עדין: פריט קשור "מרגיש" צעיר ב-3 ימים → עולה מעט, בלי לשבור את סדר העדכניות.
export const RELATED_BOOST_MS = 3 * 86400000;
