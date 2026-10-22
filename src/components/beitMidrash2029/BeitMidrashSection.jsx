import React from "react";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";

/** Quiet section frame: symbolic icon, one title, one line of purpose. */
export default function BeitMidrashSection({ id, icon, title, description, focused = false, children }) {
  return <section
    id={id}
    className={`bm-section${focused ? " is-focused" : ""}`}
    aria-labelledby={`${id}-title`}
    data-bm-section={id}
  >
    <header className="bm-section-head">
      <span className="bm-glyph" aria-hidden="true"><NavigationIcon2029 name={icon} /></span>
      <div>
        <h3 id={`${id}-title`}>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
    </header>
    {children}
  </section>;
}
