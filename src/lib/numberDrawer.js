import { useSyncExternalStore } from "react";
import { supabase } from "./supabase.js";

// חנות גלובלית קטנה ל"מגירת המספר" — נפתחת מכל מקום באתר (חיפוש, לחיצה על מספר).
let state = { open: false, term: null };
const subs = new Set();
const emit = () => subs.forEach(f => f());

export function openNumberDrawer(term) {
  state = { open: true, term: term != null ? String(term).trim() : (state.term || null) };
  emit();
}

// 👁️ תצוגה פרטית בעורך הפוסטים:
// PostEditorPage כבר מרנדר את גוף הפוסט עם אותם data-gem של הפוסט הציבורי,
// אבל עד עכשיו הקליקים בתצוגה לא הגיעו ל-NumberDrawer הקנוני.
// הגשר הזה מצומצם ל-.pe-prev בלבד, כדי לא ליצור מערכת Preview/Calculator מקבילה.
// במצב עריכה-חיה (contentEditable) לא פותחים Drawer כדי לא להפריע לעריכה.
const EDITOR_PREVIEW_BRIDGE_KEY = "__sodEditorNumberDrawerBridgeV1";
if (typeof window !== "undefined" && typeof document !== "undefined" && !window[EDITOR_PREVIEW_BRIDGE_KEY]) {
  document.addEventListener("click", (event) => {
    const gem = event.target?.closest?.(".pe-prev [data-gem]");
    if (!gem || gem.closest?.('[contenteditable="true"]')) return;
    const term = gem.getAttribute("data-gem");
    if (!term || !term.trim()) return;
    event.preventDefault();
    event.stopPropagation();
    openNumberDrawer(term);
  });
  window[EDITOR_PREVIEW_BRIDGE_KEY] = true;
}

// 🔢 Gematria Post Card — Projection בלבד של המנוע/Registry הקנוניים.
// שימוש בתוך HTML של פוסט/טיוטה:
// <sod-gematria-card expression="חכמה" hint-expression="הריון" hint-method="רגיל"></sod-gematria-card>
// אין ערכים hard-coded בפוסט. הערכים נמשכים בזמן אמת מ-fn_all_methods,
// והסבר/Meaning נמשכים מ-public.gematria_methods.
const CORE_METHODS = [
  { key: "רגיל", resultKey: "רגיל" },
  { key: "גדול", resultKey: "גדול" },
  { key: "קדמי", resultKey: "קדמי" },
  { key: "ריבוע", resultKey: "ריבוע" },
  { key: "מילוי", resultKey: "מילוי" },
  { key: "מסתתר", resultKey: "מסתתר" },
];

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

function normalizeMethodsPayload(data) {
  if (Array.isArray(data)) return data[0] || {};
  return data || {};
}

async function fetchAllMethods(expression) {
  const { data, error } = await supabase.rpc("fn_all_methods", { p_word: expression });
  if (error) throw error;
  return normalizeMethodsPayload(data);
}

async function fetchCoreRegistry() {
  const keys = CORE_METHODS.map(m => m.key);
  const { data, error } = await supabase
    .from("gematria_methods")
    .select("method_key,display_label,sub,soul,db_column,sort_order,active,in_engine")
    .in("method_key", keys)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const map = new Map((data || []).map(r => [r.method_key, r]));
  return CORE_METHODS.map(m => ({ ...m, ...(map.get(m.key) || {}) }));
}

function methodExplanation(method) {
  const label = method.display_label || method.key;
  const sub = method.sub || "שיטה קנונית במערכת";
  const soul = method.soul ? `<div class="gpc-soul"><b>משמעות מחקרית:</b> ${esc(method.soul)}</div>` : "";
  return `<div class="gpc-explain"><b>${esc(label)}</b><div>${esc(sub)}</div>${soul}<div class="gpc-boundary">החישוב הוא Fact של המנוע; המשמעות המחקרית מוצגת בנפרד.</div></div>`;
}

if (typeof window !== "undefined" && window.customElements && !window.customElements.get("sod-gematria-card")) {
  class SodGematriaCard extends HTMLElement {
    constructor() {
      super();
      this._tab = "word";
      this._selectedMethod = null;
      this._data = null;
      this._hintData = null;
      this._registry = [];
    }

    connectedCallback() {
      this.setAttribute("dir", "rtl");
      this.load();
    }

    async load() {
      const expression = (this.getAttribute("expression") || "").trim();
      const hintExpression = (this.getAttribute("hint-expression") || "").trim();
      if (!expression) {
        this.innerHTML = '<div class="gpc-error">חסר ביטוי לחישוב.</div>';
        return;
      }
      this.innerHTML = '<div class="gpc-loading">מחשב דרך המנוע הקנוני…</div>';
      try {
        const [data, registry, hintData] = await Promise.all([
          fetchAllMethods(expression),
          fetchCoreRegistry(),
          hintExpression ? fetchAllMethods(hintExpression) : Promise.resolve(null),
        ]);
        this._data = data;
        this._registry = registry;
        this._hintData = hintData;
        this.render();
      } catch (error) {
        console.error("GematriaPostCard load failed", error);
        this.innerHTML = '<div class="gpc-error">לא ניתן לטעון כרגע את מפת הגימטריה.</div>';
      }
    }

    render() {
      const expression = (this.getAttribute("expression") || "").trim();
      const hintExpression = (this.getAttribute("hint-expression") || "").trim();
      const hintMethod = (this.getAttribute("hint-method") || "רגיל").trim();
      const primaryMethod = (this.getAttribute("primary-method") || "קדמי").trim();
      const rows = this._registry.map(method => {
        const value = this._data?.[method.resultKey];
        if (value == null) return "";
        const label = method.display_label || method.key;
        const on = this._selectedMethod === method.key ? " on" : "";
        return `<button type="button" class="gpc-row${on}" data-method="${esc(method.key)}">
          <span class="gpc-method">${esc(label)}</span>
          <span class="gpc-eq"><b data-gem="${esc(expression)}">${esc(expression)}</b> = <strong data-gem="${esc(value)}">${esc(value)}</strong></span>
        </button>`;
      }).join("");

      const selected = this._selectedMethod ? this._registry.find(m => m.key === this._selectedMethod) : null;
      const primaryValue = this._data?.[primaryMethod];
      const hintValue = this._hintData?.[hintMethod];
      const hintMatch = hintExpression && primaryValue != null && hintValue != null && Number(primaryValue) === Number(hintValue);

      let body = rows;
      if (this._tab === "calc") {
        body = `<div class="gpc-calc-intro">בחר שיטה כדי לראות מה היא עושה. הערך עצמו מגיע בכל טעינה מהמנוע הקנוני.</div>${rows}${selected ? methodExplanation(selected) : ""}`;
      } else if (this._tab === "hints") {
        body = hintExpression
          ? `<div class="gpc-hint ${hintMatch ? "match" : ""}">
              <div class="gpc-hint-title">רמז מרכזי</div>
              <div><b data-gem="${esc(expression)}">${esc(expression)}</b> = <strong>${esc(primaryValue ?? "—")}</strong> (${esc(primaryMethod)})</div>
              <div class="gpc-arrow">↕</div>
              <div><b data-gem="${esc(hintExpression)}">${esc(hintExpression)}</b> = <strong>${esc(hintValue ?? "—")}</strong> (${esc(hintMethod)})</div>
              <div class="gpc-boundary">${hintMatch ? "התאמה מספרית מאומתת במנוע. המשמעות שלה היא פרשנות מחקרית." : "אין התאמה מספרית בשיטות שנבחרו."}</div>
            </div>`
          : '<div class="gpc-empty">לא הוגדר רמז לפוסט הזה.</div>';
      }

      this.innerHTML = `<style>
        sod-gematria-card{display:block;margin:22px 0;font-family:inherit;color:inherit}
        sod-gematria-card *{box-sizing:border-box}
        .gpc{border:1px solid rgba(180,145,55,.55);border-radius:16px;padding:16px;background:rgba(127,127,127,.055);box-shadow:0 8px 30px rgba(0,0,0,.08)}
        .gpc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
        .gpc-title{font-weight:900;font-size:1.08em}.gpc-expression{font-weight:900;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:4px}
        .gpc-tabs{display:flex;gap:6px;flex-wrap:wrap}.gpc-tab{border:1px solid rgba(180,145,55,.55);background:transparent;color:inherit;border-radius:999px;padding:7px 12px;cursor:pointer;font:inherit;font-weight:800}
        .gpc-tab.on{background:rgba(212,175,55,.18);border-color:rgba(212,175,55,.9)}
        .gpc-rows{display:grid;gap:7px}.gpc-row{width:100%;display:grid;grid-template-columns:minmax(120px,.8fr) 1.2fr;gap:12px;align-items:center;text-align:right;border:1px solid rgba(127,127,127,.22);background:rgba(127,127,127,.04);color:inherit;border-radius:10px;padding:10px 12px;cursor:pointer;font:inherit}
        .gpc-row:hover,.gpc-row.on{border-color:rgba(212,175,55,.85);background:rgba(212,175,55,.09)}
        .gpc-method{font-weight:800}.gpc-eq{direction:rtl}.gpc-eq [data-gem],.gpc-hint [data-gem]{cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
        .gpc-explain,.gpc-calc-intro,.gpc-hint,.gpc-empty{margin-top:12px;border-top:1px solid rgba(127,127,127,.24);padding-top:12px;line-height:1.75}.gpc-soul{margin-top:7px}.gpc-boundary{margin-top:7px;font-size:.88em;opacity:.72}.gpc-hint{text-align:center}.gpc-hint-title{font-weight:900;margin-bottom:8px}.gpc-arrow{font-size:1.25em;margin:5px}.gpc-hint.match strong{font-size:1.12em}.gpc-foot{margin-top:12px;font-size:.82em;opacity:.68}.gpc-loading,.gpc-error{padding:14px;border:1px solid rgba(127,127,127,.25);border-radius:12px}.gpc-error{color:#b33}
        @media(max-width:560px){.gpc-row{grid-template-columns:1fr;padding:9px 10px}.gpc-method{font-size:.9em}}
      </style>
      <div class="gpc">
        <div class="gpc-head"><div class="gpc-title">מפת הגימטריה · <span class="gpc-expression" data-gem="${esc(expression)}">${esc(expression)}</span></div>
          <div class="gpc-tabs">
            <button class="gpc-tab ${this._tab === "word" ? "on" : ""}" data-tab="word">מילה</button>
            <button class="gpc-tab ${this._tab === "calc" ? "on" : ""}" data-tab="calc">חישוב</button>
            <button class="gpc-tab ${this._tab === "hints" ? "on" : ""}" data-tab="hints">רמזים</button>
          </div>
        </div>
        <div class="gpc-rows">${body}</div>
        <div class="gpc-foot">Registry + fn_all_methods · מספר תמיד עם השיטה שיצרה אותו</div>
      </div>`;

      this.querySelectorAll("[data-tab]").forEach(btn => btn.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation(); this._tab = btn.getAttribute("data-tab"); this.render();
      }));
      this.querySelectorAll("[data-method]").forEach(btn => btn.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation(); this._selectedMethod = btn.getAttribute("data-method"); this._tab = "calc"; this.render();
      }));
      this.querySelectorAll("[data-gem]").forEach(el => el.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation(); openNumberDrawer(el.getAttribute("data-gem"));
      }));
    }
  }
  window.customElements.define("sod-gematria-card", SodGematriaCard);
}

export function toggleNumberDrawer() {
  state = { ...state, open: !state.open };
  emit();
}
export function closeNumberDrawer() {
  state = { ...state, open: false };
  emit();
}
export function useNumberDrawer() {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => subs.delete(cb); },
    () => state, () => state
  );
}
