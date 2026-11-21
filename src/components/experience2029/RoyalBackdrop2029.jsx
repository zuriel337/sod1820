import React from "react";
import { use2029Palette } from "../../lib/palette2029.js";
// Re-encoded derivatives of brandAssets2029's approved palace, desktop crops only unseen rows; kept in this lazy chunk.
const art = {"mobile": {"avif": "/backgrounds/2029/royal-connected-mobile-ee14537e1801.avif", "webp": "/backgrounds/2029/royal-connected-mobile-96cbcf5c1e1e.webp"}, "desktop": {"avif": "/backgrounds/2029/royal-connected-desktop-7cad736e16eb.avif", "webp": "/backgrounds/2029/royal-connected-desktop-c7b865b042af.webp"}};
import "./royalBackdrop2029.css";

// App-owned, outside the route and account-keyed subtrees: internal navigation retains this DOM/image.
// Decoration never suspends text, controls or the route.
export default function RoyalBackdrop2029() {
  const palette = use2029Palette();
  return <div className="r29-site-backdrop" aria-hidden="true" style={{ "--s29-page": palette.pageBg, "--s29-frame": palette.frame || palette.card }}>
    <picture className="r29-connected-art" aria-hidden="true">
    <source media="(min-width:650px)" type="image/avif" srcSet={art.desktop.avif} />
    <source media="(min-width:650px)" type="image/webp" srcSet={art.desktop.webp} />
    <source type="image/avif" srcSet={art.mobile.avif} />
    <img src={art.mobile.webp} width="500" height="547" alt="" decoding="async" fetchPriority="low" />
  </picture></div>;
}
