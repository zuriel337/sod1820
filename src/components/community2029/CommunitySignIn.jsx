import React, { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import AccountEntry2029 from "../auth2029/AccountEntry2029.jsx";

export default function CommunitySignIn({ compact = false }) {
  const { user } = useAuth(), location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const join = useRef(null);
  const className = `sod29-community-sign-in${compact ? " sod29-community-sign-in--compact" : ""}`;
  if (compact && !expanded && !user) return <section className={`${className} sod29-community-sign-in--collapsed`} aria-label="התחברות לקהילה">
    <button ref={join} type="button" className="sod29-community-secondary" aria-expanded="false" aria-controls="community-sign-in-form" onClick={() => setExpanded(true)}>הצטרפו לשיחה</button>
  </section>;
  return <section className={className} aria-label="חשבון הקהילה" id="community-sign-in-form">
    <AccountEntry2029 inline returnHref={location.pathname + location.search} />
    {compact && !user ? <button type="button" className="sod29-auth-link" onClick={() => { setExpanded(false); requestAnimationFrame(() => join.current?.focus()); }}>חזרה לשיחה</button> : null}
  </section>;
}
