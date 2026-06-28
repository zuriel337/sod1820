import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { useThemeMode } from "../lib/themeMode.js";
import { chromeColors } from "../lib/chromeTheme.js";
import { canInstall, promptInstall, onInstallChange, isStandalone, isIOS, installSnoozed, snoozeInstall } from "../lib/install.js";

// כפתור התקנה מותאם — «📲 התקן את סוד1820». מובייל: פס עליון; דסקטופ: פס תחתון.
// אנדרואיד/כרום: כפתור «התקן עכשיו» שמפעיל את ההצעה ומודד accept/dismiss.
// iOS: אין beforeinstallprompt — מציג הנחיה ידנית («הוסף למסך הבית»).
// לא מופיע אם כבר מותקן (standalone) או נדחה לאחרונה (snooze 14 יום).
// קודם התקנה, פוש אחר כך — בקשת הפוש (UpdatesBar) נדחית כל עוד זה פעיל.

export default function InstallPrompt() {
  const cc = chromeColors(useThemeMode());
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 640);

  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  useEffect(() => {
    if (isStandalone() || installSnoozed()) return;
    if (isIOS()) {
      const t = setTimeout(() => { setIos(true); setShow(true); }, 8000); // אחרי קצת שהייה, לא על המסך הראשון
      return () => clearTimeout(t);
    }
    const check = () => { if (canInstall()) setShow(true); };
    check();
    return onInstallChange(check);
  }, []);

  const close = () => { snoozeInstall(); setShow(false); };

  async function install() {
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === "accepted") setShow(false); else close(); // ביטול → snooze
  }

  if (!show) return null;

  const btnPrimary = {
    cursor: busy ? "wait" : "pointer", border: "none", borderRadius: 999, padding: "8px 20px",
    background: cc.accentBtn || cc.goldBright, color: cc.onAccent || "#1a0e00",
    fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap",
  };
  const btnGhost = {
    cursor: "pointer", border: `1px solid ${cc.border}`, borderRadius: 999, padding: "8px 16px",
    background: "transparent", color: cc.muted, fontFamily: F.heading, fontSize: 13.5, whiteSpace: "nowrap",
  };

  // מובייל: פס עליון (כמו בקשת הפוש); דסקטופ: פס תחתון.
  const bar = isMobile
    ? { top: 0, borderBottom: `1px solid ${cc.borderGold}`, boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }
    : { bottom: 0, borderTop: `1px solid ${cc.borderGold}`, boxShadow: "0 -8px 30px rgba(0,0,0,0.35)" };

  return (
    <div style={{
      position: "fixed", insetInline: 0, zIndex: 950, direction: "rtl",
      background: cc.bgScrolled || cc.bg, backdropFilter: "blur(14px)", padding: "12px 16px",
      ...bar,
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: cc.goldLight, fontFamily: F.heading, fontSize: 14.5, fontWeight: 700 }}>
          📲 התקן את סוד1820
        </span>
        <span style={{ color: cc.muted, fontFamily: F.body, fontSize: 13 }}>
          {ios ? "הוסף למסך הבית — גישה מהירה, בלי חנות אפליקציות." : "אפליקציה מלאה במסך הבית — נטענת מהר, גם בלי רשת."}
        </span>
        <div style={{ display: "flex", gap: 8, marginInlineStart: "auto" }}>
          {ios
            ? <button onClick={() => setIosHelp(v => !v)} style={btnPrimary}>איך מתקינים?</button>
            : <button onClick={install} disabled={busy} style={btnPrimary}>{busy ? "רגע…" : "התקן עכשיו"}</button>}
          <button onClick={close} style={btnGhost}>לא עכשיו</button>
        </div>
        {ios && iosHelp && (
          <div style={{ flexBasis: "100%", color: cc.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.8, marginTop: 4, textAlign: "center" }}>
            לחצו על כפתור השיתוף <b style={{ color: cc.goldLight }}>⬆️</b> ← גללו ובחרו <b style={{ color: cc.goldLight }}>«הוסף למסך הבית»</b> ← אשרו.
          </div>
        )}
      </div>
    </div>
  );
}
