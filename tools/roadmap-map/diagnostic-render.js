// Stage 2 — 2D Diagnostic Lens renderer.
//
// Plain, standalone browser JS (no bundler, no framework, no build step of
// its own). Expects `window.__ROADMAP_DIAGNOSTIC_DATA__` to already be set
// by an inline <script> in diagnostic.html (written by build-diagnostic.mjs)
// to `{ viewModel, coverage }` — the exact object Stage 1's parseRoadmap()
// and summarizeCoverage() produced, with zero re-interpretation here.
//
// This file does NOT parse markdown, does NOT run any regex against the
// Roadmap text, and does NOT derive any new fact. The only text-shaping it
// does is mdText(): a cosmetic-only renderer for the two inline markdown
// forms (**bold**, `code`) that already-parsed raw strings may contain —
// exactly the same class of operation as the project's own
// RoadmapCommandCenter.jsx mdToHtml(). If a diagnostic need can't be met
// from the embedded view model, that's a signal to extend roadmapParser.js
// (+ its tests), never to add extraction logic in this file.

(function () {
  "use strict";

  var data = window.__ROADMAP_DIAGNOSTIC_DATA__;
  var vm = data.viewModel;
  var app = document.getElementById("app");

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }

  // Cosmetic-only inline markdown rendering (bold **x** and inline code-spans).
  // Extracts no new facts and changes no data.
  function mdText(str) {
    var frag = document.createDocumentFragment();
    if (str == null) return frag;
    var BACKTICK = "`";
    var re = new RegExp("(\\*\\*[^*]+\\*\\*)|(" + BACKTICK + "[^" + BACKTICK + "]+" + BACKTICK + ")", "g");
    var lastIndex = 0;
    var m;
    while ((m = re.exec(str))) {
      if (m.index > lastIndex) frag.appendChild(document.createTextNode(str.slice(lastIndex, m.index)));
      if (m[1]) frag.appendChild(el("b", {}, [m[1].slice(2, -2)]));
      else frag.appendChild(el("code", {}, [m[2].slice(1, -1)]));
      lastIndex = re.lastIndex;
    }
    if (lastIndex < str.length) frag.appendChild(document.createTextNode(str.slice(lastIndex)));
    return frag;
  }

  function statusPillClass(status) {
    if (status === "CLOSED") return "pill-ok";
    if (status === "OPEN_INTAKE_CRITICAL") return "pill-crit";
    if (status === "OPEN") return "pill-warn";
    return "pill-gray";
  }

  // ---------- 1. Header ----------
  var header = el("section", {}, [
    el("h1", {}, ["🗺️ Roadmap Diagnostic Lens — Stage 2 (2D, view-model only)"]),
    el("div", { class: "muted" }, [
      "מקור יחיד לתצוגה: normalized View Model של roadmapParser.js (Stage 1). אין parsing נוסף בעמוד הזה.",
    ]),
    el("div", { class: "header-grid", style: "margin-top:12px" }, [
      el("div", { class: "stat" }, [
        el("div", { class: "k" }, ["גרסה"]),
        el("div", { class: "v mono" }, [vm.meta.version_label || "—"]),
      ]),
      el("div", { class: "stat" }, [
        el("div", { class: "k" }, ["סטטוס"]),
        el("div", { class: "v" }, [
          el("span", { class: "pill " + (vm.meta.canonical_status === "CANONICAL" ? "pill-ok" : "pill-warn") }, [
            vm.meta.canonical_status,
          ]),
        ]),
      ]),
      el("div", { class: "stat" }, [
        el("div", { class: "k" }, ["LAST_RECONCILED"]),
        el("div", { class: "v mono" }, [vm.meta.last_reconciled_date || "—"]),
      ]),
      el("div", { class: "stat" }, [
        el("div", { class: "k" }, ["ACTIVE_NOW"]),
        el("div", { class: "v mono" }, [vm.active_now.workstream_id || "—"]),
        el("div", { class: "muted" }, ["confidence: " + vm.active_now.confidence]),
      ]),
      el("div", { class: "stat" }, [
        el("div", { class: "k" }, ["Parse Warnings"]),
        el("div", { class: "v" }, [
          el("span", { class: "pill " + (vm.warnings.length === 0 ? "pill-ok" : "pill-warn") }, [
            String(vm.warnings.length),
          ]),
        ]),
      ]),
    ]),
  ]);
  app.appendChild(header);

  // ---------- 2. Grouped Workstreams ----------
  var wsSection = el("section", {}, [
    el("h2", {}, ["🧩 Workstreams — מקובצים לפי group_hint"]),
    el("div", { class: "disclaimer" }, [
      "group_hint = רמז נגזר מ-ID (למשל WS-ELS-* → \"ELS\") — אינו עולם קנוני, אינו Ontology.",
    ]),
  ]);
  var groups = {};
  vm.workstreams.forEach(function (ws) {
    var g = ws.group_hint || "(ללא)";
    (groups[g] = groups[g] || []).push(ws);
  });
  Object.keys(groups)
    .sort()
    .forEach(function (g) {
      var details = el("details", { class: "group", open: "true" });
      details.appendChild(el("summary", {}, [g + " — " + groups[g].length + " workstream(s)"]));
      groups[g].forEach(function (ws) {
        var warnBadge = ws.parse_warnings.length
          ? el("span", { class: "badge-warn" }, ["⚠ " + ws.parse_warnings.length])
          : null;
        var gateChips = (ws.gate_mentions || []).map(function (n) {
          return el("span", { class: "pill pill-gray" }, ["Gate #" + n + " (mentioned)"]);
        });
        var card = el("div", { class: "ws-card" }, [
          el("div", { class: "ws-title" }, [el("span", { class: "mono" }, [ws.id]), " — ", mdText(ws.title), warnBadge]),
          el("div", { class: "ws-field" }, [
            el("b", {}, ["STATE: "]),
            ws.fields.STATE ? mdText(ws.fields.STATE.raw) : "—",
          ]),
          gateChips.length
            ? el("div", { class: "ws-field" }, [el("b", {}, ["Gate mentions: "])].concat(gateChips))
            : null,
          el("div", { class: "ws-field" }, [
            el("b", {}, ["NEXT_ACTION: "]),
            ws.fields.NEXT_ACTION ? mdText(ws.fields.NEXT_ACTION.raw) : "—",
          ]),
        ]);
        details.appendChild(card);
      });
      wsSection.appendChild(details);
    });
  app.appendChild(wsSection);

  // ---------- 3. Human Gates ----------
  var gatesSection = el("section", {}, [el("h2", {}, ["🚪 Open Human-Gates"])]);
  var gTable = el("table", {}, [
    el("tr", {}, [
      el("th", {}, ["#"]),
      el("th", {}, ["כותרת"]),
      el("th", {}, ["סטטוס"]),
      el("th", {}, ["confidence"]),
      el("th", {}, ["Return-Point chain"]),
    ]),
  ]);
  vm.open_human_gates.forEach(function (g) {
    gTable.appendChild(
      el("tr", {}, [
        el("td", { class: "mono" }, ["#" + g.number]),
        el("td", {}, [g.title ? mdText(g.title) : el("span", { class: "muted" }, ["(לא-חולץ)"])]),
        el("td", {}, [el("span", { class: "pill " + statusPillClass(g.status) }, [g.status])]),
        el("td", { class: "muted" }, [g.status_confidence]),
        el("td", { class: "mono" }, [g.return_point_chain ? g.return_point_chain.join(" → ") : "—"]),
      ])
    );
  });
  gatesSection.appendChild(gTable);
  app.appendChild(gatesSection);

  // ---------- 4. Dependency Graph (2D list, no force-layout) ----------
  var depSection = el("section", {}, [
    el("h2", {}, ["🔗 Dependency Graph — " + vm.dependency_edges.length + " edges"]),
  ]);
  var depList = el("div", { class: "dep-list" });
  vm.dependency_edges.forEach(function (e) {
    depList.appendChild(
      el("div", { class: "dep-edge mono" }, [e.from, el("span", { style: "color:#2f6df6" }, [" → "]), e.to])
    );
  });
  depSection.appendChild(depList);
  app.appendChild(depSection);

  // ---------- 5. Return Point ----------
  var chainSource = vm.open_human_gates.find(function (g) {
    return g.number === 4;
  });
  var rpSection = el("section", {}, [el("h2", {}, ["↩️ Return Point"])]);
  if (chainSource && chainSource.return_point_chain) {
    var chainEl = el("div", { class: "chain" });
    chainSource.return_point_chain.forEach(function (step, idx) {
      if (idx > 0) chainEl.appendChild(el("span", { class: "arrow" }, ["→"]));
      chainEl.appendChild(el("span", { class: "step mono" }, [step]));
    });
    rpSection.appendChild(chainEl);
    rpSection.appendChild(
      el("div", { class: "muted", style: "margin-top:6px" }, [
        "מקור: Gate #4.return_point_chain (Stage 1 parser output)",
      ])
    );
  } else {
    rpSection.appendChild(el("div", { class: "muted" }, ["לא נמצאה שרשרת-חזרה מפורשת ב-Gate #4."]));
  }
  app.appendChild(rpSection);

  // ---------- 6. Parse Warnings (never hidden) ----------
  var wSection = el("section", {}, [el("h2", {}, ["⚠️ Parse Warnings — " + vm.warnings.length + " total"])]);
  if (vm.warnings.length === 0) {
    wSection.appendChild(el("div", { class: "muted" }, ["אין warnings."]));
  }
  vm.warnings.forEach(function (w) {
    wSection.appendChild(
      el("div", { class: "warn-item" }, [
        el("span", { class: "code mono" }, [w.code]),
        " — scope: " + w.scope + (w.id ? ", id: " + w.id : ""),
        el("div", { class: "mono", style: "margin-top:4px; white-space:pre-wrap;" }, [
          typeof w.detail === "string" ? w.detail : JSON.stringify(w.detail),
        ]),
      ])
    );
  });
  app.appendChild(wSection);
})();
