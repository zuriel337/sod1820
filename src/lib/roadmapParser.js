// roadmapParser.js — Stage 1 of the "Command Center 3D Roadmap" side-project.
//
// Pure function: SOD1820_MASTER_ROADMAP.md text -> normalizedRoadmapViewModel.
//
// Hard rules (per Zuriel's Stage-1 brief):
//   - READ-ONLY. This module never writes anything, never mutates the source text.
//   - FAIL LOUDLY. If a field cannot be extracted unambiguously, it becomes
//     `null` (or a warning entry) — never a guessed value. The original raw
//     text is always preserved alongside any interpretation, as provenance.
//   - group_hint is NOT a canonical world/ontology. It is a naive prefix-split
//     of the workstream id (e.g. WS-ELS-CORPUS -> "ELS"), offered only as a
//     hint for a future Lens to cluster on — never treated as ground truth.
//   - Dependency edges and return-point chains are extracted ONLY from
//     explicit, backtick-fenced tokens — never inferred from prose.
//
// This module has zero dependencies (not even on the rest of the app) and
// does not read any file itself — callers pass in the markdown text.

const KNOWN_STATE_TAGS = [
  // v5-tags (used inside workstream STATE fields) — legend at top of the Roadmap
  "DB-LIVE",
  "LIVE",
  "BUILDING",
  "PREVIEW-VERIFIED", // more specific, must be checked before PREVIEW
  "PREVIEW",
  "OPEN-HUMAN-GATE",
  "INTAKE-CRITICAL", // introduced 21.8 alongside Gate #4/#18 renames; not in the original legend table but used consistently
  "PARKED",
  "SUPERSEDED",
  "DESIGN",
  "OUTSIDE",
  // PROJECT STATE 5-axis vocabulary (session-navigation / top-level sections)
  "DONE",
  "ACTIVE_NOW",
  "PARALLEL_READY",
  "OPEN",
  "BLOCKED",
  "FROZEN",
  "FUTURE",
  "UNKNOWN",
  // RELEASE STATE vocabulary, sometimes quoted inline in STATE/WHERE_WE_ARE
  "MERGED",
  "DEPLOYED",
  "VERIFIED",
];

// Fields the Roadmap's own registry header promises for every card. Observed
// coverage in the canonical v5 file: WHERE_WE_ARE/STATE/PROVENANCE/NEXT_ACTION/
// HUMAN_GATE/DEPENDENCIES are present on all 23 cards ("core"); the rest are
// present on most but not all cards ("optional" — their absence is not an
// anomaly, just a shorter card).
const CORE_FIELDS = [
  "WHERE_WE_ARE",
  "STATE",
  "PROVENANCE",
  "NEXT_ACTION",
  "HUMAN_GATE",
  "DEPENDENCIES",
];
const OPTIONAL_FIELDS = [
  "WHAT_IS_DONE",
  "WHAT_IS_OPEN",
  "WHAT_IS_BLOCKED",
  "CANONICAL_HOME",
  "LAST_VERIFIED",
];
const ALL_FIELDS = [...CORE_FIELDS, ...OPTIONAL_FIELDS];

const WS_HEADER_RE = /^### (WS-[A-Z0-9-]+) — (.+)$/;
const FIELD_LINE_RE = /^- \*\*([A-Z_]+):\*\* ?(.*)$/;
const SECTION_HEADER_RE = /^## /;
const NUMBERED_GATE_RE = /^(\d+)\.\s+(.*)$/;
const BACKTICK_WS_ID_RE = /`(WS-[A-Z0-9-]+)`/g;
const BACKTICK_ARROW_CHAIN_RE = /`([^`]*→[^`]*)`/g;
// Tolerant of markdown bold wrapping the code span (e.g. "בקומיט **`sha`**"),
// introduced in the v5.1 reconciliation pass — still anchored to an explicit
// keyword + explicit backticks, never a guess.
const SHA_AFTER_KEYWORD_RE = /(?:בקומיט|HEAD)\s*\*{0,2}\s*`([0-9a-f]{6,40})`/;
const ISO_DATE_IN_BACKTICKS_RE = /`(\d{4}-\d{2}-\d{2})`/;

function splitLines(markdown) {
  return markdown.split(/\r?\n/);
}

/** Extract known/unclassified STATE-style tags from a chunk of raw text. */
function extractTags(rawText) {
  const known = [];
  const seen = new Set();
  for (const tag of KNOWN_STATE_TAGS) {
    // word-boundary-ish match on the literal tag, tolerant of surrounding backticks/punctuation.
    const re = new RegExp(`(?<![A-Z0-9_-])${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Z0-9_-])`);
    if (re.test(rawText) && !seen.has(tag)) {
      known.push(tag);
      seen.add(tag);
    }
  }
  // Unclassified: backtick-wrapped ALL-CAPS-with-hyphens/underscore tokens that
  // aren't already in `known` and aren't obviously something else (a WS-id, a sha).
  const unclassified = [];
  const backtickTokenRe = /`([A-Z][A-Z0-9_-]{2,})`/g;
  let m;
  while ((m = backtickTokenRe.exec(rawText))) {
    const tok = m[1];
    if (known.includes(tok)) continue;
    if (tok.startsWith("WS-")) continue;
    if (unclassified.includes(tok)) continue;
    unclassified.push(tok);
  }
  return { known, unclassified };
}

/** Extract explicit backtick-fenced "A → B → C" chains from raw text. */
function extractReturnPointChains(rawText) {
  const chains = [];
  let m;
  BACKTICK_ARROW_CHAIN_RE.lastIndex = 0;
  while ((m = BACKTICK_ARROW_CHAIN_RE.exec(rawText))) {
    const steps = m[1]
      .split("→")
      .map((s) => s.trim())
      .filter(Boolean);
    if (steps.length >= 2) chains.push(steps);
  }
  return chains;
}

/** Extract explicit backtick-wrapped WS-ids referenced in raw text. */
function extractWsIdRefs(rawText) {
  const ids = [];
  BACKTICK_WS_ID_RE.lastIndex = 0;
  let m;
  while ((m = BACKTICK_WS_ID_RE.exec(rawText))) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

const GATE_MENTION_RE = /Gate #(\d+)/g;

/**
 * Distinct "Gate #N" numbers literally mentioned across the given raw field
 * texts. This is a MENTION signal, not a governance claim — e.g. WS-SEC's
 * WHAT_IS_OPEN mentions "Gate #18" only as a dateline for when 2 unrelated
 * security findings were discovered, not because Gate #18 gates WS-SEC. Stage
 * 2's diagnostic UI must present this as "gate numbers mentioned in this
 * card's own text", not "the gate governing this workstream".
 */
function extractGateMentions(rawTexts) {
  const numbers = [];
  for (const text of rawTexts) {
    if (!text) continue;
    GATE_MENTION_RE.lastIndex = 0;
    let m;
    while ((m = GATE_MENTION_RE.exec(text))) {
      const n = parseInt(m[1], 10);
      if (!numbers.includes(n)) numbers.push(n);
    }
  }
  return numbers.sort((a, b) => a - b);
}

/**
 * Naive, explicitly-not-canonical grouping hint from a workstream id.
 * WS-ELS-CORPUS -> "ELS" (3+ hyphen-separated segments -> use the 2nd segment)
 * WS-CC -> "CC" (2 segments -> the id's own remainder)
 */
function groupHintFromId(id) {
  const parts = id.split("-");
  if (parts.length >= 3) return parts[1];
  return parts.slice(1).join("-");
}

function parseMeta(lines, warnings) {
  const titleLine = lines[0] || "";
  const blockquoteLine = lines[1] || "";

  let canonical_status = "UNKNOWN";
  if (/DRAFT/.test(titleLine)) canonical_status = "DRAFT";
  else if (/\(קנוני\)/.test(titleLine)) canonical_status = "CANONICAL";
  else {
    warnings.push({
      scope: "global",
      code: "canonical_status_ambiguous",
      detail: "Title line contains neither '(קנוני)' nor 'DRAFT'",
    });
  }

  const versionMatch = titleLine.match(/·\s*(v\d+(?:\.\d+)?)/i);
  const version_label = versionMatch ? versionMatch[1] : null;
  if (!version_label) {
    warnings.push({ scope: "global", code: "version_label_not_found", detail: titleLine });
  }

  const shaMatch = (lines.slice(0, 3).join(" ")).match(SHA_AFTER_KEYWORD_RE);
  const main_head_sha = shaMatch ? shaMatch[1] : null;
  if (!main_head_sha) {
    warnings.push({
      scope: "global",
      code: "main_head_sha_not_found",
      detail: lines.slice(0, 3).join(" "),
    });
  }

  // FRESHNESS section
  let last_reconciled_raw = null;
  let last_reconciled_date = null;
  let sync_status_raw = null;
  let sync_status = null;
  for (const line of lines) {
    if (line.startsWith("- **LAST_RECONCILED:**") && !last_reconciled_raw) {
      last_reconciled_raw = line;
      const d = line.match(ISO_DATE_IN_BACKTICKS_RE);
      last_reconciled_date = d ? d[1] : null;
      if (!last_reconciled_date) {
        warnings.push({
          scope: "global",
          code: "last_reconciled_date_not_found",
          detail: line,
        });
      }
    }
    if (line.startsWith("- **SYNC STATUS:**") && !sync_status_raw) {
      sync_status_raw = line;
      const s = line.match(/`([A-Z]+)`/);
      sync_status = s ? s[1] : null;
    }
  }
  if (!last_reconciled_raw) {
    warnings.push({ scope: "global", code: "last_reconciled_field_missing", detail: null });
  }

  return {
    title_line: titleLine,
    canonical_status,
    canonical_status_raw: titleLine,
    version_label,
    main_head_sha,
    last_reconciled_date,
    last_reconciled_raw,
    sync_status,
    sync_status_raw,
  };
}

function parseActiveNow(lines, warnings) {
  const headerIdx = lines.findIndex((l) => l.startsWith("## 🔵 ACTIVE_NOW"));
  if (headerIdx === -1) {
    warnings.push({ scope: "global", code: "active_now_section_not_found", detail: null });
    return { workstream_id: null, raw_heading: null, confidence: "none" };
  }
  const raw_heading = lines[headerIdx];
  // The convention used throughout v5: the first blockquote line under the
  // heading is "> **📍 איפה אני:** ... `WS-XXX` ...".
  let anchorLine = null;
  for (let i = headerIdx + 1; i < lines.length && i < headerIdx + 8; i++) {
    if (lines[i].includes("איפה אני")) {
      anchorLine = lines[i];
      break;
    }
    if (SECTION_HEADER_RE.test(lines[i])) break;
  }
  if (!anchorLine) {
    warnings.push({
      scope: "global",
      code: "active_now_anchor_line_not_found",
      detail: raw_heading,
    });
    return { workstream_id: null, raw_heading, confidence: "none" };
  }
  const ids = extractWsIdRefs(anchorLine);
  if (ids.length === 1) {
    return { workstream_id: ids[0], raw_heading: anchorLine, confidence: "explicit" };
  }
  if (ids.length === 0) {
    warnings.push({
      scope: "global",
      code: "active_now_no_ws_id_found",
      detail: anchorLine,
    });
    return { workstream_id: null, raw_heading: anchorLine, confidence: "none" };
  }
  // More than one WS-id mentioned in the anchor line — ambiguous on purpose,
  // do not guess which one is "the" active workstream.
  warnings.push({
    scope: "global",
    code: "active_now_multiple_ws_ids",
    detail: { anchorLine, ids },
  });
  return { workstream_id: null, raw_heading: anchorLine, confidence: "ambiguous" };
}

function parseWorkstreams(lines, warnings) {
  const workstreams = [];
  let i = 0;
  while (i < lines.length) {
    const headerMatch = lines[i].match(WS_HEADER_RE);
    if (!headerMatch) {
      i++;
      continue;
    }
    const id = headerMatch[1];
    const title = headerMatch[2];
    const header_raw = lines[i];
    const fields = Object.fromEntries(ALL_FIELDS.map((f) => [f, null]));
    const cardWarnings = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const line = lines[j];
      if (WS_HEADER_RE.test(line)) break; // next card
      if (SECTION_HEADER_RE.test(line)) break; // next top-level section
      const fieldMatch = line.match(FIELD_LINE_RE);
      if (fieldMatch) {
        const [, fieldName, value] = fieldMatch;
        if (!ALL_FIELDS.includes(fieldName)) {
          cardWarnings.push({
            field: fieldName,
            code: "unrecognized_field_name",
            detail: line,
          });
          continue;
        }
        if (fields[fieldName] !== null) {
          cardWarnings.push({
            field: fieldName,
            code: "duplicate_field_in_card",
            detail: line,
          });
          continue;
        }
        fields[fieldName] = { raw: value };
      }
    }

    // STATE tag extraction
    if (fields.STATE) {
      const { known, unclassified } = extractTags(fields.STATE.raw);
      fields.STATE.known_tags = known;
      fields.STATE.unclassified_tags = unclassified;
      if (known.length === 0 && unclassified.length === 0) {
        cardWarnings.push({
          field: "STATE",
          code: "no_recognized_status_tag",
          detail: fields.STATE.raw,
        });
      }
    }

    const missing_core_fields = CORE_FIELDS.filter((f) => fields[f] === null);
    if (missing_core_fields.length) {
      cardWarnings.push({
        field: missing_core_fields.join(","),
        code: "missing_core_field",
        detail: missing_core_fields,
      });
    }

    const dependency_refs = fields.DEPENDENCIES
      ? extractWsIdRefs(fields.DEPENDENCIES.raw)
      : [];

    const return_point_chain =
      (fields.NEXT_ACTION && extractReturnPointChains(fields.NEXT_ACTION.raw)[0]) ||
      (fields.WHERE_WE_ARE && extractReturnPointChains(fields.WHERE_WE_ARE.raw)[0]) ||
      null;

    // Gate numbers literally mentioned in this card's own HUMAN_GATE/WHAT_IS_OPEN
    // text — a mention signal, not a governance claim (see extractGateMentions doc).
    const gate_mentions = extractGateMentions([
      fields.HUMAN_GATE && fields.HUMAN_GATE.raw,
      fields.WHAT_IS_OPEN && fields.WHAT_IS_OPEN.raw,
    ]);

    workstreams.push({
      id,
      title,
      header_raw,
      group_hint: groupHintFromId(id),
      fields,
      missing_core_fields,
      dependency_refs,
      return_point_chain,
      gate_mentions,
      parse_warnings: cardWarnings,
    });

    for (const w of cardWarnings) {
      warnings.push({ scope: "workstream", id, ...w });
    }

    i = j;
  }
  return workstreams;
}

function parseOpenHumanGates(lines, warnings) {
  const headerIdx = lines.findIndex((l) =>
    l.startsWith("## 🚪 שערי")
  );
  if (headerIdx === -1) {
    warnings.push({ scope: "global", code: "open_gates_section_not_found", detail: null });
    return [];
  }
  const gates = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (SECTION_HEADER_RE.test(line)) break; // end of section
    const m = line.match(NUMBERED_GATE_RE);
    if (!m) continue;
    const number = parseInt(m[1], 10);
    const rest = m[2];
    const hasStrike = /~~/.test(rest);
    const hasClosedMark = /✅.{0,12}נסגר/.test(rest);
    let status, status_confidence;
    if (hasStrike && hasClosedMark) {
      status = "CLOSED";
      status_confidence = "high";
    } else if (hasStrike && !hasClosedMark) {
      status = "UNKNOWN";
      status_confidence = "ambiguous";
      warnings.push({
        scope: "gate",
        id: number,
        code: "strikethrough_without_closed_confirmation",
        detail: rest,
      });
    } else if (/OPEN\/INTAKE-CRITICAL/.test(rest)) {
      status = "OPEN_INTAKE_CRITICAL";
      status_confidence = "high";
    } else {
      // Not struck through, no explicit tag: still listed under the "open
      // gates" section header, so treated as OPEN by structural position —
      // NOT a guess about its content, a rule about the section it's in.
      status = "OPEN";
      status_confidence = "structural_inference";
    }
    const titleMatch = rest.match(/\*\*(.+?)\*\*/) || rest.match(/~~(.+?)~~/);
    const title = titleMatch ? titleMatch[1] : null;
    if (!title) {
      warnings.push({ scope: "gate", id: number, code: "title_not_extracted", detail: rest });
    }
    const return_point_chains = extractReturnPointChains(rest);
    gates.push({
      number,
      raw: rest,
      title,
      status,
      status_confidence,
      return_point_chain: return_point_chains[0] || null,
    });
  }
  return gates;
}

function parseDecisionRegister(lines, warnings) {
  const headerIdx = lines.findIndex((l) => l.startsWith("## 🎯 Decision Register"));
  if (headerIdx === -1) {
    warnings.push({ scope: "global", code: "decision_register_section_not_found", detail: null });
    return [];
  }
  const rows = [];
  let sawHeaderRow = false;
  let sawSeparatorRow = false;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (SECTION_HEADER_RE.test(line)) break;
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length !== 5) {
      warnings.push({
        scope: "decision_register",
        code: "unexpected_column_count",
        detail: line,
      });
      continue;
    }
    if (!sawHeaderRow) {
      sawHeaderRow = true;
      continue; // header row itself
    }
    if (!sawSeparatorRow) {
      sawSeparatorRow = true;
      continue; // |---|---|... row
    }
    const [gateCell, decision, options, why, changes] = cells;
    const gateMatch = gateCell.match(/#(\d+)/);
    const gate_ref = gateMatch ? `#${gateMatch[1]}` : gateCell === "—" ? null : gateCell;
    const closed = /~~/.test(gateCell);
    rows.push({
      gate_ref,
      gate_ref_raw: gateCell,
      closed,
      decision,
      options,
      why,
      changes,
    });
  }
  return rows;
}

/**
 * @param {string} roadmapMarkdown - raw text of SOD1820_MASTER_ROADMAP.md
 * @returns {object} normalizedRoadmapViewModel
 */
export function parseRoadmap(roadmapMarkdown) {
  if (typeof roadmapMarkdown !== "string" || roadmapMarkdown.length === 0) {
    throw new TypeError("parseRoadmap expects a non-empty markdown string");
  }
  const lines = splitLines(roadmapMarkdown);
  const warnings = [];

  const meta = parseMeta(lines, warnings);
  const active_now = parseActiveNow(lines, warnings);
  const workstreams = parseWorkstreams(lines, warnings);
  const open_human_gates = parseOpenHumanGates(lines, warnings);
  const decision_register = parseDecisionRegister(lines, warnings);

  // Dependency edges: only from explicit backtick WS-id refs inside a card's
  // own DEPENDENCIES field. Cross-checked against the known workstream-id set
  // so a typo'd/renamed id becomes a warning, not a silent dangling edge.
  const knownIds = new Set(workstreams.map((w) => w.id));
  const dependency_edges = [];
  for (const ws of workstreams) {
    for (const dep of ws.dependency_refs) {
      if (!knownIds.has(dep)) {
        const warning = {
          scope: "workstream",
          id: ws.id,
          code: "dependency_ref_unknown_id",
          detail: dep,
        };
        warnings.push(warning);
        // Also backfill onto the card's own parse_warnings so a UI reading
        // ws.parse_warnings alone (the per-card warning badge) sees it too —
        // the global `warnings` list and each card's own list must agree.
        ws.parse_warnings.push({ field: "DEPENDENCIES", code: warning.code, detail: warning.detail });
        continue;
      }
      dependency_edges.push({ from: ws.id, to: dep, source: "DEPENDENCIES_field" });
    }
  }

  return {
    meta,
    active_now,
    workstreams,
    open_human_gates,
    decision_register,
    dependency_edges,
    warnings,
  };
}

/** Small summary of parse coverage, for reporting — not part of the core model. */
export function summarizeCoverage(viewModel) {
  const totalWorkstreams = viewModel.workstreams.length;
  const workstreamsWithWarnings = viewModel.workstreams.filter(
    (w) => w.parse_warnings.length > 0
  ).length;
  return {
    workstreams: totalWorkstreams,
    workstreams_with_warnings: workstreamsWithWarnings,
    gates: viewModel.open_human_gates.length,
    gates_open: viewModel.open_human_gates.filter((g) => g.status !== "CLOSED").length,
    gates_closed: viewModel.open_human_gates.filter((g) => g.status === "CLOSED").length,
    decision_register_rows: viewModel.decision_register.length,
    dependency_edges: viewModel.dependency_edges.length,
    total_warnings: viewModel.warnings.length,
  };
}

export const _internal = {
  KNOWN_STATE_TAGS,
  CORE_FIELDS,
  OPTIONAL_FIELDS,
  extractTags,
  extractReturnPointChains,
  extractWsIdRefs,
  extractGateMentions,
  groupHintFromId,
};
