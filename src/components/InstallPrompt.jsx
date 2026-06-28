import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { useThemeMode } from "../lib/themeMode.js";
import { chromeColors } from "../lib/chromeTheme.js";
import { canInstall, promptInstall, onInstallChange, isStandalone, isIOS } from "../lib/install.js";

// כפתור התקנה מותאם — «📲 התקן את סוד1820». פס תחתון עדין.
// אנדרואיד/כרום: כפתור «התקן עכשיו» שמפעיל את ההצעה ומודד accept/dismiss.
// iOS: אין beforeinstallprompt — מציג הנחיה ידנית («הוסף למסך הבית»).
// לא מופיע אם כבר מותקן (standalone) או נדחה לאחרונה (snooze 14 יום).
const KEY = "sod_install_prompt_dismissed";
const SNOOZE_DAYS = 14;

function snoozed() {
  try { const t = +localStorage.getItem(KEY); return !!t && Date.now() - t < SNOOZE_DAYS * 86400000; }
  catch { return false; }
}

export default function InstallPrompt() {
  const cc = chromeColors(useThemeMode());
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isStandalone() || snoozed()) return;
    if (isIOS()) {
      const t = setTimeout(() => { setIos(true); setShow(true); }, 8000); // אחרי קצת שהייה, לא על המסך הראשון
      return () => clearTimeout(t);
    }
    const check = () => { if (canInstall()) setShow(true); };
    check();
    return onInstallChange(check);
  }, []);

  const close = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* noop */ } setShow(false); };

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

  return (
    <div style={{
      position: "fixed", insetInline: 0, bottom: 0, zIndex: 300, direction: "rtl",
      background: cc.bgScrolled || cc.bg, borderTop: `1px solid ${cc.borderGold}`,
      backdropFilter: "blur(14px)", boxShadow: "0 -8px 30px rgba(0,0,0,0.35)", padding: "12px 16px",
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
