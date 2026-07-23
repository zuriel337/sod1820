import { getChannelUpdates, getRealityHints, getPostsFromSupabase } from "./supabase.js";
import { getForumFeed, forumItemMeta } from "./contributions.js";
import { getSystemCiphers } from "./elsMatrices.js";
import { seenCutoff } from "./crossesNew.js";

// 🔔 «מה חדש מאז ביקורך» — ספירה מאוחדת של 4 הזרמים, פר-משתמש (whats_new_law).
// מקור אחד: אותם מפתחות-«נראה» של מרכז השידורים ("bc-forum"/"bc-channels"/"bc-activity"/"bc-dev"),
// כך שפתיחת טאב במרכז מורידה גם את המונה בבית — אף פעם לא סותר. משמש את הכרטיס בדף הבית.
const REAL_CHANNELS = ["gilui-yomi", "torat-haremez", "sod-hachashmal", "reality-code", "or-geula"];
const ms = v => { const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? t : 0; };

// 🔔 מי «מקפיץ» את כרטיס «מה חדש» (החלטת צוריאל): צופן-גולש (kind=cipher) · חידוש-מערכת
//    (kind=insight — קהילה כבר מסוננת בפיד, נשארים ai/צוריאל) · חידוש/עדכון של ישראל פנצ׳ר.
//    כל שאר תרומות-הגולשים לא מקפיצות. שם-הכותב נבדק כתת-מחרוזת (עמיד לגרש ׳/').
const POP_WRITERS = ["ישראל פנצ"];
function popsWhatsNew(it) {
  if (!it) return false;
  if (it.kind === "cipher" || it.kind === "insight") return true;
  const who = (it.author_display || it.author_name || "").trim();
  return POP_WRITERS.some(w => who.includes(w));
}

export async function getWhatsNewCounts() {
  const cut = k => ms(seenCutoff("bc-" + k));
  try {
    const [forum, hints, posts, sysCiphers, chanArr, dev] = await Promise.all([
      getForumFeed({ limit: 30, includePosts: false }).catch(() => []),   // פורום = קהילה בלבד
      getRealityHints(25).catch(() => []),
      getPostsFromSupabase({ limit: 20, orderBy: "modified" }).then(r => r?.posts || []).catch(() => []),
      getSystemCiphers(20).catch(() => []),
      Promise.all(REAL_CHANNELS.map(ch => getChannelUpdates(20, ch, true).catch(() => []))),
      getChannelUpdates(30, "site-news", true).catch(() => []),
    ]);
    const cF = cut("forum"), cC = cut("channels"), cA = cut("activity"), cD = cut("dev");
    // 🔔 החלטת צוריאל: הכרטיס «מה חדש» קופץ רק על — צופן-גולש · חידוש-מערכת (insights=ai/צוריאל)
    //    · חידוש/תרומה/פוסט של ישראל פנצ׳ר. לא על חידושי-גולשים/תרומות אחרים.
    const eligibleForum = (forum || []).filter(popsWhatsNew);
    // גם פוסט של ישראל פנצ׳ר מקפיץ — בפורמט פריט-פורום (forumItemMeta מטפל ב-kind=post).
    const pancherPosts = (posts || [])
      .filter(p => POP_WRITERS.some(w => (p.author || "").includes(w)))
      .map(p => ({ kind: "post", id: "p_" + p.id, ts: p.modified || p.date, author_name: p.author, title: p.title, slug: p.slug, image_url: p.image_url }));
    const eligible = [...eligibleForum, ...pancherPosts].sort((a, b) => ms(b.ts) - ms(a.ts));
    const forumN = eligible.filter(x => ms(x.ts) > cF).length;
    // פעילות = עדכונים אחרונים (כל הפוסטים, כולל מערכת) + זרם המציאות + צפני-מערכת
    const postsN = (posts || []).filter(p => ms(p.modified || p.date) > cA).length;
    const hintsN = (hints || []).filter(h => ms(h.occurred_at || h.created_at) > cA).length;
    const ciphersN = (sysCiphers || []).filter(c => ms(c.created_at) > cA).length;
    const activityN = postsN + hintsN + ciphersN;
    const channelsN = (chanArr || []).flat().filter(u => ms(u.created_at) > cC).length;
    const devN = (dev || []).filter(u => ms(u.created_at) > cD).length;
    // 🌐 הכרטיס בבית = פורום-בלבד (החלטת צוריאל): הזרמים האחרים כבר מוצגים בבית (רצועת «עדכונים אחרונים»
    // = פעילות · טיקר תחתון = ערוצים · טיקר עליון = פיתוח) → כאן רק «מה חדש בקהילה מאז ביקורך».
    // forumLatest = הפריט האחרון בפורום (getForumFeed ממוין חדש-first) → הכרטיס מציג את כותרתו.
    const forumLatest = eligible[0] ? forumItemMeta(eligible[0]) : null;
    return { forum: forumN, channels: channelsN, activity: activityN, dev: devN, forumLatest, total: forumN + activityN + devN };
  } catch {
    return { forum: 0, channels: 0, activity: 0, dev: 0, total: 0 };
  }
}
