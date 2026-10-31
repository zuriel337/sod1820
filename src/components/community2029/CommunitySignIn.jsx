import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import AccountEntry2029 from "../auth2029/AccountEntry2029.jsx";

export default function CommunitySignIn({ compact = false }) {
  const { user } = useAuth(), location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const join = useRef(null);
  const form = useRef(null);
  const collapsed = compact && !expanded && !user;
  const close = () => { setExpanded(false); requestAnimationFrame(() => join.current?.focus()); };
  useEffect(() => {
    if (!expanded || user) return;
    // The shared entry loads configured methods asynchronously. Focus only once
    // when its email field becomes available, without interrupting later typing.
    const focus = () => { const input = form.current?.querySelector('input[type="email"]'); if (!input) return false; input.focus(); return true; };
    if (focus()) return;
    const observer = new MutationObserver(() => { if (focus()) observer.disconnect(); });
    if (form.current) observer.observe(form.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [expanded, user?.id]);
  const className = `sod29-community-sign-in${compact ? " sod29-community-sign-in--compact" : ""}`;
  return <section className={`${className}${collapsed ? " sod29-community-sign-in--collapsed" : ""}`} aria-label="התחברות לקהילה" onKeyDown={event => { if (compact && expanded && !user && event.key === "Escape") { event.preventDefault(); close(); } }}>
    {collapsed ? <button ref={join} type="button" className="sod29-community-secondary" aria-expanded="false" aria-controls="community-sign-in-form" onClick={() => setExpanded(true)}>הצטרפו לשיחה</button> : null}
    <div ref={form} hidden={collapsed} id="community-sign-in-form">
      <AccountEntry2029 inline returnHref={location.pathname + location.search} />
      {compact && !user ? <button type="button" className="sod29-auth-link" aria-label="סגירת טופס ההתחברות" onClick={close}>חזרה לשיחה</button> : null}
    </div>
  </section>;
}
