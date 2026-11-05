import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { trackWhatsappJoin } from "../../lib/tracking.js";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";
import { BUILD_PUBLIC_PROGRESS } from "../../lib/knowledgeMap.js";
import { SITE_LINK_BY_ID } from "../../../supabase/functions/_shared/siteLinkRegistry.js";
import { FOOTER_COLUMNS, FOOTER_LEGAL_IDS, FOOTER_SOCIAL_IDS, SOCIAL_GLYPH, footerHidden, footerSuggestions } from "./siteFooter2029Model.js";
import "./siteFooter2029.css";

// Smart footer (SMART_FOOTER_LINK_REGISTRY_V1). Page end only: not fixed, not a second bottom navigation.
// Every href comes from SITE_LINK_REGISTRY (the same table Raziel answers from); nothing is typed here.
// Newsletter reuses the existing StayUpdatedCTA (its own availability probe + consent); no second signup.
const StayUpdatedCTA = lazy(() => import("../StayUpdatedCTA.jsx"));

function FooterLink({ item }) {
  if (item.availability === "building") {
    return <li className="sod29-foot-off"><span>{item.label}</span><em>בבנייה</em></li>;
  }
  return (
    <li>
      <Link to={item.href}>{item.label}</Link>
      {item.availability === "account" ? <em>כניסה</em> : null}
    </li>
  );
}

function LazyNewsletter() {
  const host = useRef(null);
  const [near, setNear] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const node = host.current;
    if (near || !node) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: "300px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);
  return (
    <div className="sod29-foot-updates" id="site-footer-updates" ref={host}>
      {near ? <Suspense fallback={null}><StayUpdatedCTA variant="footer" /></Suspense> : null}
    </div>
  );
}

export default function SiteFooter2029() {
  const { pathname } = useLocation();
  if (footerHidden(pathname)) return null;
  const whatsapp = SITE_LINK_BY_ID.whatsapp;
  const suggestions = footerSuggestions(pathname);
  const privacy = SITE_LINK_BY_ID.privacy;
  return (
    <footer className="sod29-footer" aria-label="תחתית האתר" data-site-footer="2029">
      <div className="sod29-foot-brandrow">
        <Link to="/" className="sod29-foot-brand" aria-label="סוד 1820 — לדף הבית">
          <img src={BRAND_LOCKUP_NAV_2029.src} alt="" width="40" height="40" loading="lazy" decoding="async" />
          <span><strong>סוד 1820</strong><small>כי לה׳ המלוכה</small></span>
        </Link>
        <div className="sod29-foot-social">
          {FOOTER_SOCIAL_IDS.map((id) => {
            const item = SITE_LINK_BY_ID[id];
            return <a key={id} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label} title={item.label}><span aria-hidden="true">{SOCIAL_GLYPH[id]}</span></a>;
          })}
          <a className="sod29-foot-wa" href={whatsapp.href} target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsappJoin("footer")}>{whatsapp.label}</a>
        </div>
      </div>

      {suggestions.length ? (
        <nav className="sod29-foot-suggest" aria-label="להמשיך מכאן">
          <span>להמשיך מכאן</span>
          {suggestions.map((item) => <Link key={item.id} to={item.href}>{item.label}</Link>)}
        </nav>
      ) : null}

      <LazyNewsletter />

      <nav className="sod29-foot-nav" aria-label="ניווט תחתון">
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title} className="sod29-foot-col">
            <h2>{column.title}</h2>
            <ul>{column.ids.map((id) => <FooterLink key={id} item={SITE_LINK_BY_ID[id]} />)}</ul>
          </div>
        ))}
      </nav>

      <div className="sod29-foot-meta">
        <span>© {new Date().getFullYear()} סוד 1820</span>
        <Link to={SITE_LINK_BY_ID.map.href} className="sod29-foot-progress">{BUILD_PUBLIC_PROGRESS.label}: {BUILD_PUBLIC_PROGRESS.percent}%</Link>
        <span className="sod29-foot-legal">
          {FOOTER_LEGAL_IDS.map((id) => <Link key={id} to={SITE_LINK_BY_ID[id].href}>{id === "privacy" ? privacy.label : SITE_LINK_BY_ID[id].label}</Link>)}
        </span>
      </div>
    </footer>
  );
}
