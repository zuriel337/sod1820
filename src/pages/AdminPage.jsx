import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import WarRoomTab from "../components/WarRoomTab.jsx";
import AudienceOverlapTab from "../components/admin/AudienceOverlapTab.jsx";
import AiStylesTab from "../components/AiStylesTab.jsx";
import SystemSuggestionsTab from "../components/SystemSuggestionsTab.jsx";
import CalendarHeatmap from "../components/CalendarHeatmap.jsx";
import NumberHeatGrid from "../components/NumberHeatGrid.jsx";
import { computePulse } from "../lib/reality.js";
import { computeNumberHeat, computeSectionHeat, sectionLabel, heatColor } from "../lib/heatmap.js";

// 🎨 פלטת-אדמין תמה-מודעת (בהיר/כהה) — כל C.* ממופה ל-CSS variable, כך שכל המסך
// מגיב ל-data-theme של האתר בלי לגעת ב-theme.js הגלובלי (city_background_dual_theme_law).
// ברירת-מחדל = כהה; light מוגדר תחת [data-theme="light"].
// 🔒 Human-Gate 5.9.2026: התכלת/כחול של חדר המפקדה הוא Reference accent של סביבת הניהול/מחקר.
// זהב נשאר נגיעת-מותג מצומצמת בלבד. שמות --adm-gold* הם compatibility aliases היסטוריים.
const C = {
  bg: "var(--adm-bg)", bgGlow: "var(--adm-bgGlow)", gold: "var(--adm-gold)", goldLight: "var(--adm-goldLight)",
  goldBright: "var(--adm-goldBright)", goldDim: "var(--adm-goldDim)", goldDark: "var(--adm-goldDark)",
  goldDeep: "var(--adm-goldDeep)", crimson: "var(--adm-crimson)", crimsonLight: "var(--adm-crimsonLight)",
  royal: "var(--adm-royal)", royalLight: "var(--adm-royalLight)", surface: "var(--adm-surface)",
  surface2: "var(--adm-surface2)", border: "var(--adm-border)", borderGold: "var(--adm-borderGold)",
  muted: "var(--adm-muted)", faint: "var(--adm-faint)", danger: "var(--adm-danger)",
};
const ADMIN_THEME_CSS = `
:root{
  --adm-bg:#11131b; --adm-bgGlow:#191d2a; --adm-gold:#6f93ff; --adm-goldLight:#f3f6fc;
  --adm-goldBright:#91adff; --adm-goldDim:#99a3b5; --adm-goldDark:#26365f; --adm-goldDeep:#0c1220;
  --adm-crimson:#a83d4f; --adm-crimsonLight:#d45a69; --adm-royal:#5954c7; --adm-royalLight:#8c88f5;
  --adm-surface:#181b25; --adm-surface2:#202431; --adm-border:rgba(145,173,255,0.16);
  --adm-borderGold:rgba(145,173,255,0.34); --adm-muted:#b7c0cf; --adm-faint:#2a3040; --adm-danger:#d45a69;
  --adm-tile:linear-gradient(145deg, rgba(111,147,255,.08), rgba(24,27,37,.92));
  --adm-active:linear-gradient(145deg, rgba(111,147,255,.22), rgba(32,36,49,.92));
  --adm-active-soft:rgba(111,147,255,.13);
}
:root[data-theme="light"]{
  --adm-bg:#f6f7f9; --adm-bgGlow:#eef2f8; --adm-gold:#2f6df6; --adm-goldLight:#1b1d22;
  --adm-goldBright:#1c4bbf; --adm-goldDim:#667085; --adm-goldDark:#d9e3fb; --adm-goldDeep:#ffffff;
  --adm-crimson:#b42318; --adm-crimsonLight:#d92d20; --adm-royal:#6941c6; --adm-royalLight:#7f56d9;
  --adm-surface:#ffffff; --adm-surface2:#f8fafc; --adm-border:#e4e7ec;
  --adm-borderGold:#cdd6e4; --adm-muted:#5b6472; --adm-faint:#eef2f8; --adm-danger:#b42318;
  --adm-tile:linear-gradient(145deg, #ffffff, #f4f7fb);
  --adm-active:linear-gradient(145deg, rgba(47,109,246,.14), #ffffff);
  --adm-active-soft:rgba(47,109,246,.09);
}`;

// ===== פאנל הניהול (/admin) — נעול ל-role=admin, טאבים =====
const TABS = [
  { key: "warroom",  label: "🎛️ חדר המפקדה" },
  { key: "roadmap",  label: "🧭 מפת העבודה" },
  { key: "entries",  label: "🛰️ כניסות אמיתיות" },
  { key: "stats",    label: "📊 סטטיסטיקות" },
  { key: "aicost",   label: "💰 עלות AI" },
  { key: "agents",   label: "🤖 סוכנים ועלויות" },
  { key: "aistyles", label: "🤖 ניתוחי AI" },
  { key: "suggest",  label: "🧠 המלצות המערכת" },
  { key: "live",     label: "🔴 שידור חי" },
  { key: "hidden",   label: "🙈 מוסתרים" },
  { key: "traffic",  label: "📊 תנועה" },
  { key: "audience", label: "🫂 קהלים (מימד חמש/אור הגאולה)" },
  { key: "infra",    label: "🩺 עומסים ותשתית" },
  { key: "retention",label: "🔁 חוזרים" },
  { key: "users",    label: "👤 משתמשים" },
  { key: "walink",   label: "🟢 חיבור וואטסאפ" },
  { key: "jexp",     label: "🧪 ניסויי מסע" },
  { key: "audienceoverlap", label: "🧩 חפיפת קהלים" },
  { key: "cal",      label: "🗓️ לוח פעילות" },
  { key: "heat",     label: "🔥 מפת חום" },
  { key: "els",      label: "🔠 ELS" },
  { key: "elsmoderation", label: "🛡️ אישור צפנים" },
  { key: "languages",label: "🌍 מנוע שפות" },
  { key: "media",    label: "🖼️ מדיה" },
  { key: "upload",   label: "⬆️ העלאה" },
  { key: "researchviewer", label: "🧭 Research Viewer" },
];

// NOTE: remainder of file unchanged; this write is intentionally limited to the canonical theme owner block.
