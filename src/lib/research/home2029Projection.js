import { supabase } from "../supabase.js";
import { getCurrentTemporalContext } from "../timeFlow.js";

const clean = (value) => value == null ? "" : String(value).trim();

function stripTags(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractContributorFinding(html = "", expectedValue) {
  const source = String(html || "");
  const marker = /מקור\s*·?\s*מאת/i.exec(source);
  if (!marker) return [];
  const rest = source.slice(marker.index);
  const end = /בדיקת מערכת\s*·?/i.exec(rest);
  const contributorBlock = end ? rest.slice(0, end.index) : rest;
  const text = stripTags(contributorBlock);
  const contributor = text.match(/מקור\s*·?\s*מאת\s+([^·]+?)(?=\s+(?:היה|צורת|בדיקת|$))/)?.[1]?.trim()
    || text.match(/מאת\s+([א-ת][א-ת\s]{1,40})/)?.[1]?.trim()
    || null;
  const rows = [];
  const seen = new Set();
  const pattern = /<b>([^<]+)<\/b>\s*=\s*<b>(\d[\d,]*)<\/b>/gi;
  for (const match of contributorBlock.matchAll(pattern)) {
    const expression = stripTags(match[1]);
    const value = Number(String(match[2]).replace(/,/g, ""));
    if (!expression || value !== Number(expectedValue)) continue;
    const key = expression + "|" + value + "|" + contributor;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ expression, value, contributor });
  }
  return rows;
}

async function verifyCurrentYear(context) {
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

async function fetchApprovedContributions(value) {
  const { data, error } = await supabase
    .from("research_contributions")
    .select("id,author_name,title,gematria_claim,created_at")
    .eq("target_type", "number")
    .eq("target_id", String(value))
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) return [];
  return (data || []).filter((row) => {
    const claim = row?.gematria_claim || {};
    return Number(claim.value) === Number(value)
      && claim.engine_verified === true
      && clean(claim.phrase);
  });
}

async function fetchPublicPostFindings(value) {
  const { data, error } = await supabase
    .from("posts")
    .select("id,title,slug,link,modified,date,author,ai_addition,space,home_hidden")
    .eq("space", "core")
    .eq("home_hidden", false)
    .not("ai_addition", "is", null)
    .ilike("ai_addition", `%${value}%`)
    .order("modified", { ascending: false, nullsFirst: false })
    .limit(12);
  if (error) return [];

  const out = [];
  for (const post of data || []) {
    for (const finding of extractContributorFinding(post.ai_addition, value)) {
      out.push({
        id: `post-${post.id}-${finding.expression}`,
        sourceKey: `post:${post.id}`,
        sourceType: "post_update",
        expression: finding.expression,
        value: Number(value),
        attribution: finding.contributor || clean(post.author) || "מקור הפוסט",
        sourceTitle: clean(post.title),
        sourceHref: post.slug ? `/${post.slug}` : clean(post.link) || null,
        occurredAt: post.modified || post.date || null,
      });
    }
  }
  return out;
}

function dedupeFindings(rows = []) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = [row.expression, row.value, row.attribution].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export async function fetchHome2029Projection() {
  const temporalContext = getCurrentTemporalContext();
  const value = Number(temporalContext?.hebrew?.year_value);
  if (!Number.isSafeInteger(value)) return { temporalNow: null };

  const yearVerification = await verifyCurrentYear(temporalContext);
  if (!yearVerification.verified) return { temporalNow: null };

  const [contributions, postFindings] = await Promise.all([
    fetchApprovedContributions(value),
    fetchPublicPostFindings(value),
  ]);

  const contributionFindings = contributions.map((row) => ({
    id: `contribution-${row.id}`,
    sourceKey: `contribution:${row.id}`,
    sourceType: "contribution",
    expression: clean(row.gematria_claim?.phrase),
    value,
    attribution: clean(row.author_name) || clean(row.gematria_claim?.attribution) || "תרומה",
    sourceTitle: clean(row.title),
    sourceHref: null,
    occurredAt: row.created_at || null,
  }));

  const findings = dedupeFindings([...postFindings, ...contributionFindings]).slice(0, 4);
  const sourceCount = new Set(findings.map((row) => row.sourceKey)).size;

  // Materiality gate: Global Now should stay silent rather than manufacture a story.
  if (sourceCount < 2 || findings.length < 2) return { temporalNow: null };

  return {
    temporalNow: {
      kind: "temporal_now",
      publicLabel: "העת עכשיו",
      yearLabel: temporalContext.hebrew.year_label,
      yearExpression: temporalContext.hebrew.year_expression,
      gregorianYear: temporalContext.gregorian.year,
      value,
      verified: true,
      sourceCount,
      findings,
      whyNow: "אותו מספר של השנה הנוכחית חוזר בכמה מקורות נפרדים ומאומתים.",
      worldLens: "time",
      worldDimension: "now",
    },
  };
}
