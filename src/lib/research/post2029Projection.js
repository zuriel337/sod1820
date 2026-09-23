import { getPostBySlug } from "../supabase.js";

const clean = (value) => value == null ? "" : String(value).trim();

function stripTags(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, "\"")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAttr(tag = "", name) {
  const match = String(tag).match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
  return match?.[1] || null;
}

function extractLeadMedia(content = "") {
  const html = String(content || "");
  const wrapperMatch = html.match(/^\s*(<div[^>]*>\s*<video[\s\S]*?<\/video>\s*(?:<div[\s\S]*?<\/div>)?\s*<\/div>)/i);
  const leadHtml = wrapperMatch?.[1] || "";
  const videoTag = (leadHtml || html).match(/<video\b[^>]*>[\s\S]*?<\/video>/i)?.[0] || "";
  if (!videoTag) return { html: "", rest: html, video: null };

  const opening = videoTag.match(/<video\b[^>]*>/i)?.[0] || "";
  const sourceMatch = videoTag.match(/<source\b[^>]*src=["']([^"']+)["']/i);
  const directSrc = matchAttr(opening, "src");
  const tracks = [...videoTag.matchAll(/<track\b([^>]*)>/gi)].map((match) => ({
    src: matchAttr(match[0], "src"),
    lang: matchAttr(match[0], "srclang"),
    label: matchAttr(match[0], "label"),
    kind: matchAttr(match[0], "kind") || "subtitles",
    default: /\bdefault\b/i.test(match[0]),
  })).filter((track) => track.src);

  return {
    html: leadHtml || videoTag,
    rest: leadHtml ? html.slice(wrapperMatch.index + wrapperMatch[0].length) : html.replace(videoTag, ""),
    video: {
      src: directSrc || sourceMatch?.[1] || null,
      poster: matchAttr(opening, "poster"),
      tracks,
    },
  };
}

function splitTranscript(html = "") {
  const source = String(html || "");
  const heading = /<h[1-6][^>]*>\s*התמלול המלא\s*<\/h[1-6]>/i;
  const match = heading.exec(source);
  if (!match) return { storyHtml: source, transcriptHtml: "" };
  return {
    storyHtml: source.slice(0, match.index).trim(),
    transcriptHtml: source.slice(match.index + match[0].length).trim(),
  };
}

function unwrapAddition(html = "") {
  const source = String(html || "").trim();
  const outer = source.match(/^<div\b[^>]*>([\s\S]*)<\/div>$/i);
  return outer?.[1]?.trim() || source;
}

const METHOD_LABEL_TO_KEY = Object.freeze({
  "רגיל": "רגיל",
  "מסתתר": "מסתתר",
  "מילוי": "מילוי",
  "משולש": "קדמי",
});

function extractCalculations(html = "") {
  const source = String(html || "");
  const rows = [];
  const seen = new Set();
  const pattern = /<b>([^<]+)<\/b>\s*=\s*<b>(\d[\d,]*)<\/b>(?:\s*<span[^>]*>\s*·\s*([^<]+)<\/span>)?/gi;
  for (const match of source.matchAll(pattern)) {
    const expression = stripTags(match[1]);
    const value = Number(String(match[2]).replace(/,/g, ""));
    const methodLabel = clean(stripTags(match[3] || "רגיל")).replace(/^·\s*/, "");
    const methodKey = METHOD_LABEL_TO_KEY[methodLabel] || (methodLabel || "רגיל");
    const key = `${expression}|${methodKey}|${value}`;
    if (!expression || !Number.isFinite(value) || seen.has(key)) continue;
    seen.add(key);
    rows.push({ expression, claimedValue: value, methodKey, methodLabel: methodLabel || methodKey });
  }
  return rows;
}

function contributorFromAddition(html = "") {
  const text = stripTags(html);
  return text.match(/מקור\s*·?\s*מאת\s+([^·\n]+?)(?=\s+(?:היה|צורת|בדיקת|$))/)?.[1]?.trim()
    || text.match(/מאת\s+([א-ת][א-ת\s]{1,40})/)?.[1]?.trim()
    || null;
}

function formatExcerpt(post, storyHtml) {
  return clean(post?.excerpt) || stripTags(storyHtml).slice(0, 240);
}

export async function fetchPost2029Projection(slug) {
  const post = await getPostBySlug(slug);
  if (!post) return null;

  const media = extractLeadMedia(post.content);
  const split = splitTranscript(media.rest);
  const additionHtml = unwrapAddition(post.ai_addition || "");
  const calculations = extractCalculations(additionHtml);
  const contributor = contributorFromAddition(additionHtml);

  const units = [
    media.video?.src ? {
      id: "primary-media",
      type: "source_media",
      role: "source",
      title: "המקור לצפייה",
      sourceLabel: clean(post.author) || "מקור הפוסט",
      media: media.video,
    } : null,
    split.storyHtml ? {
      id: "authored-story",
      type: "authored_content",
      role: "source",
      title: "הסיפור המקורי",
      html: split.storyHtml,
      sourceLabel: clean(post.author) || "מקור הפוסט",
    } : null,
    split.transcriptHtml ? {
      id: "transcript",
      type: "transcript",
      role: "source_representation",
      title: "התמלול המלא",
      html: split.transcriptHtml,
      sourceLabel: clean(post.author) || "מקור הפוסט",
    } : null,
    additionHtml ? {
      id: "research-update",
      type: "research_update",
      role: "system_analysis",
      title: "נוסף למחקר",
      html: additionHtml,
      contributor,
      addedAt: post.modified || null,
      timeBasis: "posts.modified",
      calculations,
    } : null,
  ].filter(Boolean);

  return {
    version: "post-2029-projection-v1",
    identity: {
      type: "post",
      id: String(post.id),
      wpId: post.wp_id ?? null,
      slug: post.slug,
      canonicalHref: `/${post.slug}`,
      previewHref: `/2029/post/${post.slug}`,
    },
    post,
    medium: media.video?.src ? "video" : post.image_url ? "image" : "text",
    excerpt: formatExcerpt(post, split.storyHtml),
    units,
    unitCounts: units.reduce((acc, unit) => {
      acc[unit.type] = (acc[unit.type] || 0) + 1;
      return acc;
    }, {}),
    caveats: [
      "המקור, החישוב והפרשנות נשמרים כשכבות שונות. אימות מספרי אינו מאמת פרשנות.",
      "ב־Golden Preview זמן התוספת נשען על posts.modified. לפני rollout רחב נדרש public-safe provenance timestamp ייעודי או projection מאושר; אין להסיק ממנו זמן אירוע בעולם.",
    ],
  };
}

export const post2029ProjectionInternals = {
  stripTags,
  extractLeadMedia,
  splitTranscript,
  unwrapAddition,
  extractCalculations,
};
