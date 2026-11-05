import React, { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { publicLaunchActionsLocked } from "../../lib/publicLaunch2029.js";
import { supabase } from "../../lib/supabase.js";
import { use2029Palette } from "../../lib/palette.js";
import { writerSelfRequest } from "../../lib/userCenter/writerPersonal2029.js";
import ProfileSettings from "../ProfileSettings.jsx";
import "./quickProfileAvatar2029.css";

export default function QuickProfileAvatar2029({ view, onSaved }) {
  const { user, loading, isAdmin } = useAuth(), P = use2029Palette(), location = useLocation();
  const actionsLocked = publicLaunchActionsLocked(isAdmin);
  const visitor = new URLSearchParams(location.search).get("view") === "public";
  const scope = `${user?.id || "guest"}:${view.communityAuthorKey || view.canonicalHref}:${visitor}:${actionsLocked}`;
  const active = useRef(scope); active.current = scope;
  const [capability, setCapability] = useState({ scope: null, owned: false });
  const [openedScope, setOpenedScope] = useState(null);
  const modal = useRef(null), trigger = useRef(null), titleId = useId();
  const owned = !actionsLocked && !visitor && capability.scope === scope && capability.owned;
  const open = owned && openedScope === scope;
  useEffect(() => {
    active.current = scope;
    if (actionsLocked || loading || !user || visitor) return;
    const abort = new AbortController();
    Promise.all([writerSelfRequest({ userId: user.id, signal: abort.signal }), supabase.auth.getUser()]).then(([self, identity]) => {
      if (abort.signal.aborted || active.current !== scope) return;
      const key = view.communityAuthorKey;
      const verified = !identity.error && identity.data?.user?.id === user.id;
      const match = key ? key === `user:${user.id}` || key === self.writer?.id : self.writer?.href === view.canonicalHref;
      setCapability({ scope, owned: verified && self.state === "ready" && self.capabilities?.avatarUpdate === true && match });
    }).catch(() => { if (!abort.signal.aborted) setCapability({ scope, owned: false }); });
    return () => { active.current = null; abort.abort(); };
  }, [scope, loading, user?.id, actionsLocked]);
  useEffect(() => { if (open) modal.current?.showModal(); else if (modal.current?.open) modal.current.close(); }, [open]);
  const close = () => { setOpenedScope(null); requestAnimationFrame(() => trigger.current?.focus()); };
  const save = async ({ url }) => {
    if (actionsLocked || !owned || active.current !== scope) return { ok: false, error: "עדכון תמונה עדיין אינו זמין בגרסה זו." };
    const requested = scope;
    const result = await writerSelfRequest({ userId: user.id, action: "avatar", payload: { url, publish: true, ack: true } });
    if (active.current !== requested) return { ok: false, error: "החשבון השתנה. יש לפתוח שוב את החלפת התמונה." };
    return { ok: result.state === "saved", error: result.state === "account_saved"
      ? "תמונת החשבון נשמרה, אך הפרסום בפרופיל לא אושר. אפשר לנסות שוב בלי להעלות את התמונה מחדש."
      : "לא התקבל אישור לעדכון התמונה. אפשר לנסות שוב." };
  };
  if (!owned) return null;
  return <span className="qa29" onClick={e => e.stopPropagation()} style={{ "--pm-card": P.card, "--pm-soft": P.cardSoft, "--pm-ink": P.ink, "--pm-border": P.border, "--pm-focus": P.focusRing || P.accent }}>
    <button ref={trigger} className="qa29-trigger" type="button" aria-haspopup="dialog" aria-label="החלפת תמונת הפרופיל שלי" onClick={() => setOpenedScope(scope)}><span>📷 החלפת תמונה</span></button>
    <dialog ref={modal} className="qa29-dialog" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); e.stopPropagation(); close(); }} onKeyDown={e => { if (e.key === "Escape") e.stopPropagation(); }} onPointerMove={e => e.stopPropagation()}>
      {open ? <div className="qa29-content"><header><h2 id={titleId}>החלפת תמונת הפרופיל</h2><button className="qa29-close" type="button" onClick={close} aria-label="סגירת החלפת התמונה">×</button></header>
        <ProfileSettings key={scope} avatarOnly onAvatarSave={save} onDone={() => { if (active.current === scope) { close(); onSaved?.(); } }} t={{ fieldBg: P.cardSoft, ink: P.ink, line: P.border, sub: P.inkSoft, acc: P.accentText, danger: P.dangerText, btnBg: P.accentBtn, btnText: P.onAccent }} />
      </div> : null}
    </dialog>
  </span>;
}
