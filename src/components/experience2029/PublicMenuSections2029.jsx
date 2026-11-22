import React from "react";
import { Link, useLocation } from "react-router-dom";
import { publicMapGroups2029 } from "../../lib/publicMap2029.js";
import { PUBLIC_READING_PRODUCTION_ARTIFACT } from "../../lib/publicReadingRelease2029.js";
import "./publicMenuSections2029.css";

const sections = publicMapGroups2029(PUBLIC_READING_PRODUCTION_ARTIFACT);

// The compact rail keeps its immediate destinations. On opening the menu we arrange the same
// resolved controls (including their permission, pending and return states) alongside the site map.
export default function PublicMenuSections2029({ home, direct, NavGroup, ...controls }) {
  const location = useLocation();
  const existing = new Map([...home, ...direct].filter(item => item.to).map(item => [item.to === "/els" ? "/code" : item.to, item]));
  const current = location.pathname + location.search + location.hash;
  const drawn = new Set();
  function renderLink([href, label]) {
    const prior = existing.get(href);
    if (prior) {
      drawn.add(prior);
      return <NavGroup key={href} items={[{ ...prior, to: href, label }]} {...controls} />;
    }
    return <Link key={href} to={href} state={{ sodEntryArrival: "internal" }} className="sod29-menu-section-link" aria-current={current === href ? "page" : undefined}
      onClick={() => { controls.preserveReturnFor(href); controls.onNavigate?.(); }}>{label}</Link>;
  }
  const groups = sections.map(({ title, links }, i) => {
    const content = links.map(renderLink);
    if (i === 0) return <React.Fragment key={title}>{content}</React.Fragment>;
    return <details key={title} className="sod29-menu-section"><summary>{title}</summary><div>{content}</div></details>;
  });
  const remaining = [...home, ...direct].filter(item => !drawn.has(item));
  return <div className="sod29-menu-sections" data-public-menu="sections">{groups}
    {remaining.length > 0 && <NavGroup title="יעדים ופעולות נוספים" items={remaining} {...controls} />}
  </div>;
}
