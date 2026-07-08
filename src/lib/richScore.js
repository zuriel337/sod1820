// ===== rich_score — מדד-עושר לדף-מספר (SEO product) =====
// נעילת צוריאל: לפני שמגישים 150 דפים לגוגל, מגדירים «מה נחשב עשיר». דף דל (thin) =
// למה גוגל לא מאנדקס (Crawled-not-indexed). כאן ממירים את תוכן-הגרף לציון 0-100 שקוף,
// עם 4 צירים (בקשת צוריאל: לא רק גימטריה — גם מעורבות):
//   🔢 gematria   — עומק רשימת-הגימטריה (כמה ביטויים שווים לערך)
//   🖼 galleries  — כמה תמונות/גלריות נופלות על הערך
//   📖 content    — פוסטים · אירועים · חידושי-AI · התכנסויות (topic_cards)
//   👁 engagement — כמה חיפשו/צפו במספר (ביקוש אמיתי) — הציר השלישי שצוריאל ביקש
//
// טהור וללא-תופעות-לוואי → נבדק, נשמר ב-baseline, ומשמש לבחירת «גל היהלומים».

// עקומת-רוויה: 0..1 לפי כמה שערך n מתקרב ל-full (חצי-רוויה ב-full/2).
function sat(n, full) {
  const x = Math.max(0, Number(n) || 0);
  return full > 0 ? Math.min(1, x / full) : 0;
}

// משקלים (סכום = 100). ניתן לכיול בעתיד — שקוף בכוונה.
const W = { gem: 30, gal: 20, content: 30, engagement: 20 };
// סף-רוויה לכל ציר (מעליו — ניקוד מלא בציר).
const FULL = { phrases: 12, galleries: 4, content: 8, searched: 20 };

/**
 * מחשב rich_score לדף-מספר מתוך ה-bundle (getBundle) + אות-מעורבות.
 * @param {object} bundle  התוצר של getBundle: {phrasesCount|phrases, galleriesCount, postsCount, eventsCount, insightsCount, topicsCount}
 * @param {object} [opts]
 * @param {number} [opts.searched]  כמה פעמים חיפשו את המספר (getSearchCount) — ציר המעורבות
 * @param {number} [opts.topics]    מספר topic_cards שמכילים את המספר (אם לא ב-bundle)
 * @returns {{score:number, tier:string, axes:object, counts:object}}
 */
export function richScore(bundle = {}, opts = {}) {
  const phrases = bundle.phrasesCount ?? (Array.isArray(bundle.phrases) ? bundle.phrases.length : 0);
  const galleries = bundle.galleriesCount ?? 0;
  const posts = bundle.postsCount ?? 0;
  const events = bundle.eventsCount ?? 0;
  const insights = bundle.insightsCount ?? 0;
  const topics = opts.topics ?? bundle.topicsCount ?? 0;
  const searched = opts.searched ?? 0;

  // ציר-התוכן משקלל מקורות ערוכים חזק יותר (פוסט/התכנסות = עורך אנושי).
  const contentUnits = posts * 2 + events + insights + topics * 2;

  const axes = {
    gem: sat(phrases, FULL.phrases) * W.gem,
    gal: sat(galleries, FULL.galleries) * W.gal,
    content: sat(contentUnits, FULL.content) * W.content,
    engagement: sat(searched, FULL.searched) * W.engagement,
  };
  const score = Math.round(axes.gem + axes.gal + axes.content + axes.engagement);

  return {
    score,
    tier: tierOf(score),
    axes: {
      gem: Math.round(axes.gem),
      gal: Math.round(axes.gal),
      content: Math.round(axes.content),
      engagement: Math.round(axes.engagement),
    },
    counts: { phrases, galleries, posts, events, insights, topics, searched },
  };
}

// דירוג — סף-הגשה לגוגל. «גל היהלומים» = diamond+rich בלבד; thin/sparse לא מוגשים עדיין.
export function tierOf(score) {
  if (score >= 70) return "diamond";   // עשיר מאוד — מגישים ראשונים
  if (score >= 45) return "rich";      // עשיר — גל 1
  if (score >= 20) return "thin";      // דל — לא מגישים; להעשיר קודם
  return "sparse";                     // כמעט ריק — לא לאנדקס עד שיתמלא
}

// האם הדף ראוי להגשה בגל הראשון (סף העשירות).
export function isDeployWorthy(score) { return score >= 45; }

export const RICH_WEIGHTS = W;
export const RICH_FULL = FULL;
