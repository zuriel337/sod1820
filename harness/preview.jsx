// UX-audit harness (NOT shipped): renders the REAL DetailPanel with two fixtures so we can
// eyeball the Field Package placement on desktop/mobile/RTL WITHOUT deploying or admin auth.
// The live engine call (fn_gematria_pack) is server-only (anon/authenticated lack EXECUTE),
// so here we monkeypatch supabase.rpc to return REAL trimmed pack data purely for LAYOUT preview.
import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import supabase from "../src/lib/supabase.js";
import { DetailPanel } from "../src/components/WarRoomTab.jsx";

// ── real trimmed fn_gematria_pack('ובתורתו') — rich case ──
const RICH_PACK = {
  subject: "ובתורתו", value: 1020, cost: { tokens: 0, used_llm: false },
  stages_requested: ["methods", "convergence", "verses", "sources", "notarikon", "decompose", "cross", "zero_scale", "zero_navigation"],
  stages_with_findings: ["cross", "verses", "methods", "sources", "decompose", "zero_scale", "convergence", "zero_navigation"],
  stages: {
    methods: { found: true, method_count: 13, source_of_truth: "gematria_methods",
      evidence: { "רגיל": 1020, "מילוי": 1820, "מסתתר": 1584, "קדמי": 3851, "גדול": 1020, "סידורי": 84, "אתבש": 545, "אלבם": 329, "אטבח": 180, "ריבוע": 3484 } },
    cross: { found: true, cross_count: 2, source_of_truth: "strongest_crossings",
      crossings: [{ partner: "תורה אחת", n_methods: 3, methods_detail: "אלבם=329 · סידורי=84 · רגיל=1020" }, { partner: "שישית", n_methods: 2, methods_detail: "סידורי=84 · רגיל=1020" }] },
    verses: { found: true, evidence: { count: 3, verses: [{ ref: "תהלים 1:2" }, { ref: "ישעיהו 37:15" }, { ref: "יהושע 1:8" }] }, source_of_truth: "tanach_verses" },
    sources: { found: true, evidence: { count: 2, first: { ref: "תהלים 1:2" }, books: [{ book: "תהלים", n: 2 }] }, source_of_truth: "tanach_verses" },
    convergence: { found: true, group_count: 3, source_of_truth: "convergences",
      groups: [
        { kind: "same_method_equality", method: "ragil", score: 13, group_size: 13, status: "new", phrases: ["אותי בראת", "חכמת המציאות"] },
        { kind: "same_method_equality", method: "miluy", score: 6, group_size: 6, status: "new", phrases: ["חקת", "עשיר"] },
        { kind: "same_method_equality", method: "misratar", score: 8, group_size: 8, status: "new", phrases: ["מחשבות"] },
      ] },
    decompose: { found: true, source_of_truth: "maftech_decompose",
      evidence: { FACT: { ragil: 1020, misratar: 1584 }, INTERPRETATION: { note: "שיטת המפתח — השערה", letters: [{ pos: 1, letter: "ו", meaning: "מחברת" }], mirror: ["ר↔ב"], sparks: { count: 0 } } } },
    notarikon: { found: false, method_id: "notarikon" },
    zero_scale: { applicable: true, core_root: 102, scale_chain: [102, 1020, 10200], root_matches: [{ ragil: 102, phrase: "אלהינו" }] },
    zero_navigation: { applicable: true, stripped: 102, core_matches: [{ ragil: 102, phrase: "בעל" }] },
  },
};
// ── sparse pack — missing-info case (few stages found, drives the «חסר» + «ניתן לבדוק» layers) ──
const SPARSE_PACK = {
  subject: "אור", value: 207, cost: { tokens: 0, used_llm: false },
  stages_requested: ["methods", "convergence", "verses", "sources", "notarikon", "decompose", "cross"],
  stages_with_findings: ["methods"],
  stages: {
    methods: { found: true, method_count: 6, source_of_truth: "gematria_methods",
      evidence: { "רגיל": 207, "מילוי": 620, "מסתתר": 413, "קדמי": 907, "סידורי": 34, "אתבש": 800 } },
    cross: { found: false }, verses: { found: false }, sources: { found: false },
    convergence: { found: false }, decompose: { found: false }, notarikon: { found: false },
  },
};

// monkeypatch the singleton rpc → fixture pack (layout preview only). Other calls resolve empty (children degrade).
const params = new URLSearchParams(location.search);
const isMissing = params.get("case") === "missing";
const PACK = isMissing ? SPARSE_PACK : RICH_PACK;
supabase.rpc = (name) => name === "fn_gematria_pack"
  ? Promise.resolve({ data: PACK, error: null })
  : Promise.resolve({ data: null, error: null });
// children that read tables (FullAnalysis/WaContext) → empty, so they render placeholders not crash.
const emptyThen = { then: (r) => r({ data: [], error: null }) };
supabase.from = () => new Proxy({}, { get: () => (() => new Proxy(emptyThen, { get: (t, k) => k in t ? t[k] : () => new Proxy(emptyThen, { get: () => () => emptyThen }) })) });

const RICH_ITEM = {
  key: "zvi-1", source: "פורום", srckind: "forum", ts: "2026-08-10T09:00:00Z",
  raw: "«ובתורתו יהגה יומם ולילה» — צבי מצא ש«ובתורתו» עולה 1020 ברגיל ו-1820 במילוי. הצלבה חזקה.",
  phrase: "ובתורתו", values: [1020], value: 1020, rawAuthor: "צבי",
  writer: { state: "matched", canonical: { display_name: "צבי (OPOC)", slug: "zvi-opoc" }, raw: "צבי" },
  tier: { he: "מועמד", key: "VAULT", color: "#c79a2e" },
  engineVerified: true, hasCross: true, inGraph: false, status: "candidate", link: "/post/example-zvi",
};
const MISSING_ITEM = {
  key: "wa-77", source: "וואטסאפ", srckind: "wa", ts: "2026-08-13T20:12:00Z",
  raw: "מישהו כתב בקבוצה: «אור» — בלי תאריך, בלי מקור, בלי הקשר. צריך לברר מהאדם.",
  phrase: "אור", values: [], value: null, rawAuthor: "לא-מזוהה",
  writer: { state: "unknown", raw: "מספר לא שמור" },
  tier: { he: "חומר-מקור", key: "RAW", color: "#8a8a95" },
  engineVerified: false, hasCross: false, inGraph: false, status: null, link: null,
};

createRoot(document.getElementById("root")).render(
  <MemoryRouter>
    <div style={{ minHeight: "100vh", background: "#0C0818" }}>
      <DetailPanel item={isMissing ? MISSING_ITEM : RICH_ITEM} onClose={() => {}} onFilter={() => {}} onHandle={() => {}} onUnhandle={() => {}} />
    </div>
  </MemoryRouter>
);
