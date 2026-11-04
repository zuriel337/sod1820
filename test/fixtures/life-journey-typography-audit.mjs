// Design V2 computed-style audit for the 2029 Life Journey. Runs inside the page (page.evaluate).
// Contract: SOD1820_DESIGN_CONTRACT_V2.md §5 (type), §12 (acceptance) and the System Frame token set.
export function auditLifeJourneyTypography(scopeSelector = ".person-journey") {
  const scope = document.querySelector(scopeSelector);
  if (!scope) return { scanned: 0, violations: [{ issue: "scope-missing", selector: scopeSelector }] };
  const desktop = innerWidth >= 1024;
  const violations = [];
  const describe = (el) => {
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const chain = [];
    for (let node = el.parentElement, depth = 0; node && depth < 3; node = node.parentElement, depth += 1) {
      const name = typeof node.className === "string" && node.className.trim() ? "." + node.className.trim().split(/\s+/)[0] : node.tagName.toLowerCase();
      chain.unshift(name);
    }
    return `${chain.join(" > ")} > ${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0;
  };
  const controlSel = "button,summary,select,input:not([type=hidden]),textarea,[role=tab],[role=button],a[href]";
  const numericOnly = /^[\d\s.,:;/%·\-–+×=()״׳']+$/;
  const family = (s) => s.fontFamily.split(",")[0].replace(/["']/g, "").trim();
  let scanned = 0;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el) continue;
    // Classify by the element's own text (React splits "3 רמזים" into two text nodes).
    const text = [...el.childNodes].filter(child => child.nodeType === 3).map(child => child.textContent).join(" ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (!el || seen.has(el) || el.closest("script,style,svg,option,[aria-hidden=true],[data-chart],canvas")) continue;
    if (!visible(el)) continue;
    seen.add(el);
    scanned += 1;
    const s = getComputedStyle(el);
    const size = parseFloat(s.fontSize);
    const weight = Number(s.fontWeight);
    const control = Boolean(el.closest(controlSel));
    const numeric = numericOnly.test(text) && /\d/.test(text) && !control;
    const fam = family(s);
    const where = `${describe(el)} "${text.slice(0, 28)}"`;
    const flag = (issue, extra = "") => violations.push({ issue, where, size, weight, family: fam, extra });
    if (size < 14) flag("below-14px-floor");
    else if (control && size < 16) flag("control-below-16px");
    else if (desktop && !control && size < 15 && text.length > 24) flag("desktop-support-below-15px");
    if (!control && !numeric && text.length > 90 && size < 15) flag("prose-below-15px");
    if (control && fam !== "Rubik") flag("control-not-rubik");
    if (numeric && fam !== "IBM Plex Mono") flag("numeric-not-plex-mono");
    if (!control && !numeric && /[֐-׿]/.test(text) && text.length > 60 && fam !== "Noto Sans Hebrew") flag("prose-not-noto-hebrew");
    if (weight >= 800 && !numeric && text.length > 4) flag("weight-800-plus");
    const lines = el.getBoundingClientRect().height / (parseFloat(s.lineHeight) || size * 1.4);
    if (lines > 1.6 && /[֐-׿]/.test(text) && weight > 500 && (weight < 650 || weight > 760)) flag("multiline-weight-outside-650-760");
  }
  const targetOk = (r) => r.width >= 43.5 && r.height >= 43.5;
  for (const el of scope.querySelectorAll(controlSel)) {
    if (!visible(el)) continue;
    if (el.matches("a[href]") && el.closest("p,li,span,small,dd")) continue; // inline prose links keep WCAG inline-target exemption
    let target = el;
    if (el.matches("input[type=checkbox],input[type=radio]")) target = el.closest("label") || el;
    if (el.closest("summary") && !el.matches("summary")) continue;
    let r = target.getBoundingClientRect();
    if (target !== el && !targetOk(r)) r = el.getBoundingClientRect(); // the input itself may be the 44px target
    if (!targetOk(r)) violations.push({ issue: "target-below-44px", where: `${describe(el)} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24)}"`, size: `${Math.round(r.width)}x${Math.round(r.height)}` });
  }
  const doc = document.documentElement;
  if (doc.scrollWidth > innerWidth + 1) violations.push({ issue: "horizontal-scroll", where: "document", size: `${doc.scrollWidth}>${innerWidth}` });
  return { scanned, violations };
}

export function summarizeViolations(violations) {
  const grouped = new Map();
  for (const v of violations) {
    const key = `${v.issue} | ${v.where.replace(/^\[[^\]]*\] /, "").split(" \"")[0].split(" > ").slice(-3).join(" > ")}`;
    const entry = grouped.get(key) || { count: 0, sample: v };
    entry.count += 1;
    grouped.set(key, entry);
  }
  return [...grouped.entries()].map(([key, { count, sample }]) => `${count}× ${key} e.g. ${sample.where} size=${sample.size} w=${sample.weight ?? ""} fam=${sample.family ?? ""}`).sort();
}
