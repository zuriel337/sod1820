// A preview-only presentation adapter over ONE public Post and ONE published gematria corpus.
// It owns no ranking, graph, score, source, approval mechanism, or publication authority.
// "Priority" refers to CONNECTIONS IN THIS TOPIC, never candidates or electoral chances.
import { buildContextDepth } from "./contextDepthProjection2029.js";

export const ELECTIONS_SOURCE_ID = 5107;
export const ELECTIONS_SOURCE_SLUG = "sharshar-elections-redemption-hints-draft";
export const ELECTIONS_REVIEWED_PHRASES = Object.freeze(["הבחירות", "מלך ישראל", "נפתלי בנט", "נס נתניהו", "עופר וינטר"]);

const clean = (v) => String(v == null ? "" : v).trim();
const plain = (html) => clean(String(html || "").replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ").replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&").replace(/\s+/g, " "));
const reEscape = (s) => [...clean(s)].map((c) => "\\^$.*+?()[]{}|".includes(c) ? "\\" + c : c).join("");
const hasEquality = (html, phrase, value) => new RegExp(reEscape(phrase) + "\\s*=\\s*" + value + "(?!\\d)", "u").test(plain(html));

export const isElectionsPublicSource = (post) => Number(post?.id) === ELECTIONS_SOURCE_ID
  && post?.slug === ELECTIONS_SOURCE_SLUG
  && post.home_hidden !== true
  && Array.isArray(post.tags)
  && !post.tags.some((tag) => ["טיוטה", "פורום"].includes(tag));

const has1820Witness = (html) => /<p\b[^>]*>\s*עופר וינטר\s*<\/p>\s*<p\b[^>]*>\s*מילוי\s*=\s*1820\s*<\/p>/iu.test(String(html || ""));
const publicCorpus = (r, phrase) => r?.phrase === phrase && r.ragil === 631
  && r.is_verified === true && r.is_published === true;
const href = (id) => "/post/" + ELECTIONS_SOURCE_SLUG + "#source-region-" + id;
const occurrence = (phrase, number, id) => ({
  kind: "post_body", ref: "post:5107",
  sourceRef: "posts:5107#block:" + id, locatorId: id,
  href: href(id), locator: "מקטע " + number + " בפוסט הבחירות",
  quote: phrase + " = " + number,
});

/**
 * Raw inputs must be from the existing authorized readers. An approved corpus
 * row is not engine parity, an authored equality is not an approved research link.
 * Several methods on the same name are not several independent event witnesses.
 */
export function projectElections631Context({ post, gematriaRows = [] } = {}) {
  if (!isElectionsPublicSource(post)) return { available: false, reason: "source_not_public_or_mismatched" };
  const html = String(post.content || "");
  if (!hasEquality(html, "הבחירות", 631) || !hasEquality(html, "מלך ישראל", 631)) {
    return { available: false, reason: "axis_not_attested_in_source" };
  }
  const rows = Array.isArray(gematriaRows) ? gematriaRows : [];
  const publicMatches = ELECTIONS_REVIEWED_PHRASES
    .filter((phrase) => hasEquality(html, phrase, 631) && rows.some((row) => publicCorpus(row, phrase)))
    .map((phrase) => ({
      phrase, method: "רגיל", value: 631, publication: "published",
      evidenceKind: "published_corpus_value_and_authored_source",
      source: occurrence(phrase, 631, "elections-631"),
    }));
  const winterSourceClaim = hasEquality(html, "עופר וינטר", 631) ? {
    phrase: "עופר וינטר", method: "רגיל", value: 631,
    evidenceKind: "authored_source_only_not_published_corpus",
    source: occurrence("עופר וינטר", 631, "elections-631"),
  } : null;
  const anchor1820 = has1820Witness(html) ? {
    phrase: "עופר וינטר", method: "מילוי", value: 1820,
    sourceRef: "posts:5107#block:elections-1820",
    href: href("elections-1820"), locatorId: "elections-1820",
    evidenceKind: "authored_source_only_not_published_corpus",
    engineParity: null,
  } : null;
  const depth = buildContextDepth({
    subject: { id: "5107", type: "post", label: "רמזי הבחירות · ציר 631" },
    audience: "public",
    numbers: [
      {
        value: 631,
        source: { kind: "הקשר הבחירות", note: "631 הוא המוקד משום שהביטוי ״הבחירות״ מופיע בערך הזה בפוסט. שוויון גימטרי אינו אישור לקשר אירועים." },
        calculations: [], graph: null, convergence: null,
        expressions: publicMatches.map((row) => ({
          phrase: row.phrase, sources: [row.source],
          calculation: { method: "רגיל", value: 631, claimedValue: 631,
            reproducesClaim: null, rowVerified: true, rowPublished: true },
          interpretation: null,
        })),
      }, {
        value: 1820,
        source: { kind: "עוגן נוסף מתוך הפוסט", note: anchor1820
          ? "הפוסט מציג מילוי=1820 לצד עופר וינטר. זוהי הופעת מקור אחת, לא רשומת חישוב מפורסמת ולא עד עצמאי נוסף."
          : "עוגן מקור לא נמצא: אין להניח חיבור." },
        calculations: [], graph: null, convergence: null,
        expressions: anchor1820 ? [{
          phrase: "עופר וינטר",
          sources: [{
            kind: "post_body", ref: "post:5107",
            sourceRef: anchor1820.sourceRef, href: anchor1820.href, locatorId: anchor1820.locatorId,
            locator: "מקטע 1820", quote: "עופר וינטר · מילוי = 1820",
          }],
          calculation: null, interpretation: null,
        }] : [],
      },
    ],
  });

  return {
    available: true, sourceRef: "posts:5107", sourceId: 5107,
    focus: { id: "post:5107#elections-631", value: 631,
      label: "רמזי הבחירות", href: href("elections-631") },
    priority: {
      kind: "context_first_editorial_focus",
      order: [631, 1820], // display sequence only — not a numeric ranking or formula
      reasons: [
        "הביטוי ״הבחירות״ עצמו מופיע במקור עם 631",
        "כמה ביטויים הקשורים לנושא נושאים את הערך 631; כל אחד נבדק בפני עצמו",
        anchor1820 ? "1820 מופיע כמקור נוסף בשיטת מילוי על אותו שם" : null,
      ].filter(Boolean),
      scope: "connections_not_people",
    },
    publicMatches,
    authoredClaim: winterSourceClaim,
    crossMethodAnchor: anchor1820,
    verifiedIndependentSourceCount: null,
    linkApproval: "not_mapped",
    linkedPost: {
      postId: 5113, status: "not_released_by_this_projection",
      reason: "פוסט ההמשך נושא תגית טיוטה: אין להפוך אותו לפריט ציבורי באמצעות ההקשר הזה.",
    },
    depth,
  };
}
