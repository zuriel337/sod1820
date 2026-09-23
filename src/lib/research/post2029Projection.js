import { getPostBySlug, supabase } from "../supabase.js";
import { getCurrentTemporalContext, classifyTemporalYearValue } from "../timeFlow.js";

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
    const rawMethodLabel = clean(stripTags(match[3] || "רגיל")).replace(/^·\s*/, "");
    // Cross-equality labels describe left ↔ right methods. This regex captures the
    // right-hand expression/value, so its canonical method is the right-most label.
    const methodLabel = rawMethodLabel.includes("↔")
      ? clean(rawMethodLabel.split("↔").at(-1))
      : rawMethodLabel;
    const methodKey = METHOD_LABEL_TO_KEY[methodLabel] || (methodLabel || "רגיל");
    const key = `${expression}|${methodKey}|${value}`;
    if (!expression || !Number.isFinite(value) || seen.has(key)) continue;
    seen.add(key);
    rows.push({ expression, claimedValue: value, methodKey, methodLabel: methodLabel || methodKey });
  }
  return rows;
}

function extractContributorAddition(html = "") {
  const source = String(html || "");
  const marker = /מקור\s*·?\s*מאת/i.exec(source);
  if (!marker) return "";
  const start = marker.index;
  const rest = source.slice(start);
  const endMatch = /בדיקת מערכת\s*·?/i.exec(rest);
  return endMatch ? rest.slice(0, endMatch.index) : rest;
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

async function fetchActiveNumberReadings(values = []) {
  const numbers = [...new Set(values.map(Number).filter(Number.isSafeInteger))];
  if (!numbers.length) return new Map();
  const { data, error } = await supabase
    .from("number_readings")
    .select("id,number,digit_sequence,reading,meaning,proof_words,layer,source_type")
    .in("number", numbers)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) return new Map();

  const byNumber = new Map();
  for (const row of data || []) {
    const number = Number(row?.number);
    if (!Number.isSafeInteger(number)) continue;
    if (!byNumber.has(number)) byNumber.set(number, []);
    byNumber.get(number).push(row);
  }
  return byNumber;
}

async function fetchTemporalContributions(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) return [];
  const { data, error } = await supabase
    .from("research_contributions")
    .select("id,author_name,title,body,target_type,target_id,gematria_claim,created_at")
    .eq("target_type", "number")
    .eq("target_id", String(number))
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) return [];
  return (data || []).filter((row) => Number(row?.gematria_claim?.value) === number);
}

async function fetchTemporalAnchors(values = []) {
  const numbers = [...new Set(values.map(Number).filter(Number.isSafeInteger))];
  if (!numbers.length) return new Map();
  const { data, error } = await supabase
    .from("number_anchors")
    .select("value,category,fact,hint")
    .in("value", numbers);
  if (error) return new Map();
  const out = new Map();
  for (const row of data || []) out.set(Number(row.value), row);
  return out;
}

function extractHebrewYearLabel(anchor) {
  const text = `${anchor?.fact || ""} ${anchor?.hint || ""}`;
  return text.match(/תש[א-ת״׳"']{1,6}/)?.[0] || null;
}

async function verifyCurrentHebrewYear(context) {
  const phrase = context?.hebrew?.year_expression;
  const expected = Number(context?.hebrew?.year_value);
  if (!phrase || !Number.isSafeInteger(expected)) return { verified: false, value: null };
  const { data, error } = await supabase.rpc("fn_method_value", {
    p_method_key: "רגיל",
    p_phrase: phrase,
  });
  const value = Number(data);
  return {
    verified: !error && Number.isSafeInteger(value) && value === expected,
    value: Number.isSafeInteger(value) ? value : null,
  };
}

export async function fetchPost2029Projection(slug) {
  const post = await getPostBySlug(slug);
  if (!post) return null;

  const media = extractLeadMedia(post.content);
  const split = splitTranscript(media.rest);
  const additionHtml = unwrapAddition(post.ai_addition || "");
  const calculations = extractCalculations(additionHtml);
  const contributorHtml = extractContributorAddition(additionHtml);
  const contributorCalculations = extractCalculations(contributorHtml);
  const readingMap = await fetchActiveNumberReadings(calculations.map((row) => row.claimedValue));
  const enrich = (row) => ({
    ...row,
    readings: readingMap.get(Number(row.claimedValue)) || [],
  });
  const enrichedCalculations = calculations.map(enrich);
  const enrichedContributorCalculations = contributorCalculations.map(enrich);
  const contributor = contributorFromAddition(additionHtml);

  const temporalContext = getCurrentTemporalContext();
  const contributorValues = enrichedContributorCalculations.map((row) => row.claimedValue);
  const temporalAnchorMap = await fetchTemporalAnchors(contributorValues);
  const currentYearVerification = await verifyCurrentHebrewYear(temporalContext);

  const temporalRows = enrichedContributorCalculations
    .map((row) => {
      const value = Number(row.claimedValue);
      const currentState = classifyTemporalYearValue(value, temporalContext);
      const anchor = temporalAnchorMap.get(value) || null;
      const historicalYearAnchor = !!anchor && /(?:שנת|תשפ|תשע|תש״|תש')/.test(`${anchor.fact || ""} ${anchor.hint || ""}`);
      const isCurrent = currentState?.state === "active";
      if (!isCurrent && !historicalYearAnchor) return null;
      return { ...row, temporalState: isCurrent ? "active" : "axis", temporalAnchor: anchor };
    })
    .filter(Boolean);

  const temporalValue = temporalRows[0]?.claimedValue ?? null;
  const temporalContributions = temporalValue != null
    ? await fetchTemporalContributions(temporalValue)
    : [];

  const temporalIsActive = temporalRows.some((row) => row.temporalState === "active");
  const temporalAnchor = temporalRows[0]?.temporalAnchor || null;
  const temporalLens = temporalRows.length ? {
    context: temporalContext,
    currentYearVerification,
    state: temporalIsActive ? "active" : "axis",
    value: Number(temporalValue),
    yearLabel: temporalIsActive
      ? temporalContext?.hebrew?.year_label
      : extractHebrewYearLabel(temporalAnchor),
    rows: temporalRows,
    localContributor: contributor,
    contributions: temporalContributions,
    axisHref: "/timeline",
    publicLabel: temporalIsActive ? "העת עכשיו" : "תחנה בציר ההתגלות",
  } : null;

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
      title: "רמזים שנוספו",
      html: additionHtml,
      contributor,
      addedAt: post.modified || null,
      timeBasis: "posts.modified",
      calculations: enrichedCalculations,
      contributorCalculations: enrichedContributorCalculations,
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
    temporalLens,
    unitCounts: units.reduce((acc, unit) => {
      acc[unit.type] = (acc[unit.type] || 0) + 1;
      return acc;
    }, {}),
    caveats: [
      "חישוב שאומת אומר שהמספר נכון בשיטה שנבדקה; הוא לא הופך את הפרשנות לעובדה.",
      "בדוגמה הזאת זמן «נוסף אחר כך» נשען על זמן העדכון של הפוסט. לפני פתיחה לכל האתר נחבר חותמת זמן ייעודית לכל תוספת.",
    ],
  };
}

export const post2029ProjectionInternals = {
  stripTags,
  extractLeadMedia,
  splitTranscript,
  unwrapAddition,
  extractCalculations,
  extractContributorAddition,
  fetchActiveNumberReadings,
  fetchTemporalContributions,
  fetchTemporalAnchors,
  verifyCurrentHebrewYear,
  extractHebrewYearLabel,
};
