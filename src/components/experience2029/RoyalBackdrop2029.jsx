import React from "react";
// Re-encoded derivatives of brandAssets2029's approved palace, kept in this lazy chunk.
const art = {"mobile": {"avif": "/backgrounds/2029/royal-connected-mobile-ee14537e1801.avif", "webp": "/backgrounds/2029/royal-connected-mobile-96cbcf5c1e1e.webp"}, "desktop": {"avif": "/backgrounds/2029/royal-connected-desktop-42810d335bd2.avif", "webp": "/backgrounds/2029/royal-connected-desktop-c25f055092d8.webp"}};
import "./royalBackdrop2029.css";

// Optional, shared decoration. Text and controls never suspend on its download.
export default function RoyalBackdrop2029() {
  return <picture className="r29-connected-art" aria-hidden="true">
    <source media="(min-width:650px)" type="image/avif" srcSet={art.desktop.avif} />
    <source media="(min-width:650px)" type="image/webp" srcSet={art.desktop.webp} />
    <source type="image/avif" srcSet={art.mobile.avif} />
    <img src={art.mobile.webp} width="500" height="547" alt="" decoding="async" fetchPriority="low" />
  </picture>;
}
