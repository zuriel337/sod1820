// A thumbnail with our logo in its corner, when the update is ours (model.logo is set only for our material, see logoKeyOf in nowPublications2029.js).
import React from "react";
import "./ownMark2029.css";

export default function OwnMarkBox2029({ logo, size = 44, children }) {
  if (!logo?.src) return children;
  return <span className="sod29-ownbox" style={{ "--own-size": `${size}px` }}>{children}
    <img className="sod29-ownmark" src={logo.src} alt="" width="20" height="20" loading="lazy" decoding="async" title={logo.label || undefined} data-own-mark="true" /></span>;
}
