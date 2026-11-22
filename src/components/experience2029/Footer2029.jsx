import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./footer2029.css";
import { useAuth } from "../../lib/AuthContext.jsx";
import { trackWhatsappJoin } from "../../lib/tracking.js";
import { PUBLIC_READING_RELEASE, publicReadingLinkState2029, publicReadingPath } from "../../lib/publicReadingRelease2029.js";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";
import { NewsletterSignup2029 } from "../StayUpdatedCTA.jsx";
import {
  SITE_LINK_GROUPS, siteLinkById, siteLinksForFooterGroup,
} from "../../../supabase/functions/_shared/siteLinkRegistry.js";

// Smart Footer for the 2029 shell: the end of the page, never fixed, never a second bottom navigation.
// Every link comes from the one SITE_LINK_REGISTRY_V1 and its presentation state from the same router the
// pages use (`publicReadingPath`): a route that is closed is shown as "בבנייה", never as an active link.

const NAV_GROUPS = ["discover", "research", "personal", "info"];

// States in which a link is a real, working destination for the viewer.
const ACTIVE_STATES = new Set(["public", "continuation", "account", "service-closed", "post-lookup"]);

export function footerLinkState(item, { isAdmin = false } = {}) {
  if (item.external) return "active";
  // These entries name workspaces; the footer has a separate published findings link.
  const workspace = item.id === "heichal" || item.id === "research-tools";
  const state = publicReadingLinkState2029(workspace ? item.href + "?mode=workspace" : item.href, { isAdmin });
  if (state === "admin-view") return isAdmin ? "admin" : "closed";
  return ACTIVE_STATES.has(state) ? "active" : "closed";
}


export function footerRouteFamily(pathname) {
  const path = String(pathname || "/");
  if (path === "/" || path === "/2029") return "home";
  if (/^\/(?:2029\/)?posts?(?:\/|$)/.test(path) || /^\/(?:category|tag)\//.test(path)) return "post";
  if (/^\/(?:2029\/)?number(?:\/|$)/.test(path)) return "number";
  if (/^\/world(?:\/|$)/.test(path)) return "world";
  if (/^\/(?:2029\/)?(?:gematria|calculator)(?:\/|$)/.test(path) || path.startsWith("/community/calculator")) return "gematria";
  if (/^\/community(?:\/|$)/.test(path)) return "community";
  if (/^\/(?:books?|codes?)(?:\/|$)/.test(path)) return "library";
  // A historical single-segment Post slug is what the router calls "post-lookup"; /privacy, /map, /contact ... are not.
  return publicReadingPath(path) === "post-lookup" ? "post" : "default";
}


const OPEN_UNDER_CONSTRUCTION = new Set(["world", "els"]);

function FooterLink({ item, state }) {
  if (state === "closed") {
    return <li className="f29-closed"><span>{item.label}</span><small>בבנייה</small></li>;
  }
  const badge = state === "admin" ? <small className="f29-admin">למנהל</small> : null;
  if (item.external) {
    return <li><a className="f29-link" href={item.href} target="_blank" rel="noopener noreferrer"
      onClick={item.tracking === "whatsapp-join" ? () => trackWhatsappJoin("footer") : undefined}>
      {item.label}<span className="f29-sr"> (נפתח בלשונית חדשה)</span></a></li>;
  }
  // Preview can mark unfinished links; the public release already resolves the read state above.
  const building = !PUBLIC_READING_RELEASE && OPEN_UNDER_CONSTRUCTION.has(item.id) ? <small className="f29-admin">בבנייה</small> : null;
  return <li><Link className="f29-link" to={item.href}>{item.label}</Link>{badge}{building}</li>;
}

// Joining the community group is a real entry point of the system (carried over from the Legacy footer), not a
// "tracking" feature; the join counter stays an internal measurement and never drives the label.
function WhatsappJoin({ item }) {
  return <a className="f29-join" href={item.href} target="_blank" rel="noopener noreferrer"
    onClick={() => trackWhatsappJoin("footer")}>
    <span aria-hidden="true">{item.glyph}</span> עדכונים בוואטסאפ<span className="f29-sr"> — הצטרפות לקבוצה (נפתח בלשונית חדשה)</span>
  </a>;
}

export default function Footer2029() {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const options = { isAdmin: isAdmin === true };
  const isHome = pathname === "/" || pathname === "/2029";
  const social = siteLinksForFooterGroup("social");
  const whatsapp = siteLinkById("whatsapp");

  return (
    <footer className="f29" aria-label="תחתית האתר" data-footer-2029="smart">
      <div className="f29-rule" aria-hidden="true" />
      <div className="f29-wrap">
        <section className="f29-brand" aria-label="סוד 1820">
          <img src={BRAND_LOCKUP_NAV_2029.src} width="48" height="48" alt="" loading="lazy" decoding="async" draggable="false" />
          <div>
            <strong>סוד 1820</strong>
            <span>כי לה׳ המלוכה</span>
          </div>
        </section>

        <ul className="f29-social" aria-label="רשתות חברתיות וקהילה">
          {social.map((item) => (
            <li key={item.id}>
              <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.label} (נפתח בלשונית חדשה)`} title={item.label}
                onClick={item.tracking === "whatsapp-join" ? () => trackWhatsappJoin("footer") : undefined}>
                <span aria-hidden="true">{item.glyph}</span>
              </a>
            </li>
          ))}
        </ul>

        {/* The "להמשיך מכאן" suggestion row left the footer (ZURIEL 19.11.2026); the link columns below stay. */}

        <nav className="f29-nav" aria-label="ניווט תחתון">
          {NAV_GROUPS.map((group) => (
            <section key={group} className="f29-col" aria-labelledby={`f29-h-${group}`}>
              <h2 id={`f29-h-${group}`}>{SITE_LINK_GROUPS[group]}</h2>
              <ul>
                {siteLinksForFooterGroup(group).map((item) => <FooterLink key={item.id} item={item} state={footerLinkState(item, options)} />)}
              </ul>
            </section>
          ))}
        </nav>

        <section className="f29-updates" aria-label="עדכונים">
          {/* Compact strip (ZURIEL 5.11.2026): email updates + joining the WhatsApp group, one line, no card.
              On Home the page already carries its own updates section, so only the WhatsApp entry is shown there. */}
          {!isHome ? (
            <NewsletterSignup2029 variant="compact" submitLabel="עדכונים במייל">
              {whatsapp ? <WhatsappJoin item={whatsapp} /> : null}
            </NewsletterSignup2029>
          ) : (
            <div className="sod29-action-row">
              <strong className="sod29-updates-title">עדכונים</strong>
              {whatsapp ? <WhatsappJoin item={whatsapp} /> : null}
            </div>
          )}
        </section>

        <div className="f29-meta">
          <span>© {new Date().getFullYear()} סוד 1820 · כל הזכויות שמורות</span>
        </div>
      </div>
    </footer>
  );
}
