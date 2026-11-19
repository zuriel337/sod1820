// The PUBLISHED form of a unit (a plain `<section id>` inside the post body, like the six units already in post 5107) and the one safe way to add it to a post body.
// PURE: it writes nothing. Text is escaped (nothing in the words can become markup), the markup is a closed set (section, hr, h2, h3, p, small, span[data-gem], a, blockquote,
// table), and the insertion is checked before it is returned: the unit id is not in the body yet, every existing section survives unchanged and in order, nothing outside the
// insertion point changes, and the fragment passes the same safety validator the save plan uses.
import { parseYaminSmolText, parseFieldLine, parseBylineLine, YAMIN_SMOL_TRACE_CLAIMS, YAMIN_SMOL_UNIT_ID } from "./postPreviewUnits2029.js";
import { inspectFragment, allSections, contentSha256 } from "./unitFragmentSavePlan2029.js";
import { cleanGematriaItem } from "./postUnitBody2029.js";

const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const NUMBER = /(?<![\d.])\d{3,5}(?![\d.])/g;
const withNumbers = (text) => { let out = "", last = 0; for (const m of String(text).matchAll(NUMBER)) { out += esc(text.slice(last, m.index)) + `<span data-gem="${m[0]}">${m[0]}</span>`; last = m.index + m[0].length; } return out + esc(String(text).slice(last)); };
const CENTER = 'style="text-align:center!important"';
const BIG = 'style="text-align:center!important;font-size:clamp(2.4rem,10vw,4.5rem);line-height:1;margin:22px 0 6px;font-weight:900;color:var(--gold,#e8c840)"';
const LINE = 'style="text-align:center!important;font-size:1.08rem;margin:4px 0;font-weight:700"';
const fieldHtml = (label, valueHtml) => `<p ${LINE}><b>${esc(label)}:</b> ${valueHtml}</p>`;
const peakHtml = number => `<p ${BIG}><span data-gem="${esc(number)}">${esc(number)}</span></p>`;

export function unitToPublishedHtml(unit, text) {
  return unitBlocksToPublishedHtml(unit, parseYaminSmolText(text));
}

export function unitBlocksToPublishedHtml(unit, blocks) {
  if (!unit?.id || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,120}$/.test(unit.id)) throw new Error("bad_unit_id");
  const out = [];
  let table = null;
  const closeTable = () => { if (table) { out.push(`<table style="margin:14px auto;border-collapse:collapse"><tbody>${table.join("")}</tbody></table>`); table = null; } };
  for (const block of blocks) {
    if (block.kind !== "row") closeTable();
    switch (block.kind) {
      case "title": out.push(`<h2 id="${unit.id}-title" ${CENTER}>${esc(block.text)}</h2>`); break;
      case "subtitle": out.push(`<p ${CENTER}>${esc(block.text)}</p>`); break;
      case "numbers": out.push(`<p style="text-align:center!important;font-size:1.4rem;font-weight:800;margin:14px 0">${block.numbers.map((n) => `<span data-gem="${esc(n)}">${esc(n)}</span>`).join(" · ")}</p>`); break;
      case "kicker": out.push(`<p ${CENTER}>${esc(block.text)}</p>`); break;
      case "heading": out.push(`<h3 ${CENTER}>${esc(block.text)}</h3>`); break;
      case "closing": out.push(`<p style="text-align:center!important;font-size:1.15rem;font-weight:800;margin:18px auto;max-width:640px">${esc(block.text)}</p>`); break;
      case "verse": out.push(`<blockquote ${CENTER}>${esc(block.text)}</blockquote>`); break;
      case "rule": out.push('<hr style="opacity:.22;margin:34px auto;max-width:660px">'); break;
      case "row": {
        table = table || [];
        table.push(`<tr>${block.cells.map((cell) => `<${block.head ? "th" : "td"} style="padding:4px 14px;border:1px solid rgba(128,128,128,.35)">${withNumbers(cell)}</${block.head ? "th" : "td"}>`).join("")}</tr>`);
        break;
      }
      case "claim": {
        const field = parseFieldLine(block.text);
        if (field) { out.push(fieldHtml(field.label, withNumbers(field.value))); if (field.label === "התוצאה" && field.number) {
            out.push(peakHtml(field.number));
            // the beautiful canonical breakdown (letters, values, sum) is hosted here: an empty host the page fills from the engine, exactly as in the Preview
            const claim = unit.id === YAMIN_SMOL_UNIT_ID && YAMIN_SMOL_TRACE_CLAIMS.find((c) => c.number === field.number);
            if (claim) out.push(`<div data-pu-trace="${claim.id}" data-pu-published="true" class="sod29-pu-host sod29-pu-trace-host"></div>`);
          } }
        else out.push(`<p ${LINE}>${withNumbers(block.text)}</p>`);
        break;
      }
      case "gematria": {
        const item = cleanGematriaItem(block.item);
        if (!item) throw new Error("bad_gematria_item");
        out.push(fieldHtml("הביטוי", esc(item.phrase)), fieldHtml("השיטה", esc(item.methodKey)));
        if (item.stated != null) {
          out.push(fieldHtml("התוצאה", `<span data-gem="${item.stated}">${item.stated}</span>`), peakHtml(item.stated));
        }
        out.push(`<div data-pu-published="true" data-gx-item="${esc(JSON.stringify(item))}" class="sod29-pu-host sod29-pu-trace-host"></div>`);
        break;
      }
      case "peak": out.push(peakHtml(block.number)); break;
      default: {
        const byline = parseBylineLine(block.text);
        if (byline) out.push(`<p style="text-align:center!important;font-weight:800;margin:16px 0 6px">מאת: ${byline.href ? `<a href="${esc(byline.href)}">${esc(byline.name)}</a>` : esc(byline.name)}</p>`);
        else out.push(`<p ${CENTER}>${withNumbers(block.text)}</p>`);
      }
    }
  }
  closeTable();
  const inner = out.join("\n");
  // the title heading is the unit's own label; every other block follows it
  return `<section id="${unit.id}" aria-labelledby="${unit.id}-title" dir="rtl" style="max-width:760px;margin:44px auto;line-height:1.85;text-align:center">\n<hr style="opacity:.22;margin:34px auto;max-width:660px">\n${inner}\n</section>\n`;
}

// Insert the unit at the TOP of the body (right after the outer wrapper's opening tag). Returns { ok, content, ... } or { ok:false, code }. Never mutates its inputs.
export async function insertUnitAtTop({ content, expectedSha256, fragmentHtml, unitId }) {
  if (typeof content !== "string" || typeof fragmentHtml !== "string" || !/^[a-f0-9]{64}$/.test(String(expectedSha256))) return { ok: false, code: "bad_input" };
  const before = await contentSha256(content);
  if (before !== expectedSha256) return { ok: false, code: "conflict", before };
  const wrapper = content.match(/^<div dir="rtl" style="text-align:center;">/);
  if (!wrapper) return { ok: false, code: "unknown_wrapper" };
  const existing = allSections(content);
  if (!existing.ok) return { ok: false, code: existing.code };
  if (existing.sections.some((s) => s.id === unitId)) return { ok: false, code: "unit_already_present" };
  const inspected = inspectFragment(fragmentHtml);
  if (inspected.unsafe.length) return { ok: false, code: "unsafe_markup", unsafe: inspected.unsafe };
  if (inspected.duplicateIds.length) return { ok: false, code: "duplicate_ids", duplicateIds: inspected.duplicateIds };
  const at = wrapper[0].length;
  const next = content.slice(0, at) + "\n" + fragmentHtml + content.slice(at);
  const after = allSections(next);
  if (!after.ok) return { ok: false, code: after.code };
  const idsBefore = existing.sections.map((s) => s.id), idsAfter = after.sections.map((s) => s.id);
  if (idsAfter.join("|") !== [unitId, ...idsBefore].join("|")) return { ok: false, code: "sections_changed" };
  if (next.slice(0, at) !== content.slice(0, at) || next.slice(next.length - (content.length - at)) !== content.slice(at)) return { ok: false, code: "outside_changed" };
  return { ok: true, content: next, newSha256: await contentSha256(next), previousSha256: before, addedChars: next.length - content.length };
}
