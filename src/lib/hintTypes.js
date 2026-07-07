// 🧩 טקסונומיית הרמזים — מקור-אמת יחיד (עץ אחד: כל רמז הוא node שמצביע למספר בגרף).
// כל רמז אישי נשמר כשורת research_items (bucket='hint', entity_type='hint'),
// entity_ref = המספר הדומיננטי (→ /number/:n), metadata = { hint_type, image_url, note, source_url, occurred_at }.
// להוסיף סוג = רשומה כאן, בלי לגעת בשום מקום אחר.

export const HINT_TYPES = [
  { id: "image",  icon: "📷", label: "תמונות",  accent: "#2f6df6" },
  { id: "ai",     icon: "🤖", label: "AI",       accent: "#7c5cff" },
  { id: "video",  icon: "🎥", label: "סרטונים", accent: "#e5484d" },
  { id: "audio",  icon: "🔊", label: "הקלטות",  accent: "#e08c00" },
  { id: "doc",    icon: "📄", label: "מסמכים",  accent: "#5b6472" },
  { id: "plate",  icon: "🚗", label: "לוחיות",  accent: "#0ca678" },
  { id: "dream",  icon: "🌙", label: "חלומות",  accent: "#9b6dff" },
  { id: "sync",   icon: "🔄", label: "סנכרונים", accent: "#0d9488" },
  { id: "news",   icon: "📰", label: "חדשות",   accent: "#c2410c" },
  { id: "link",   icon: "🔗", label: "קישורים", accent: "#2563eb" },
  { id: "idea",   icon: "💡", label: "רעיונות", accent: "#c79a2e" },
];

export const HINT_TYPE_MAP = Object.fromEntries(HINT_TYPES.map(t => [t.id, t]));

export function hintTypeMeta(id) {
  return HINT_TYPE_MAP[id] || { id: id || "idea", icon: "🧩", label: "רמז", accent: "#5b6472" };
}
