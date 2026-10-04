// Canonical site-chrome metrics owner.
// The sticky Navbar is the visual origin of normal public pages. Consumers must not guess 64/70/74px.
// This module is intentionally browser-global because portal overlays mount under document.body and do not
// inherit CSS variables from the React Layout subtree.

export const SITE_HEADER_BASE_HEIGHT = 64;
export const SITE_HEADER_CSS_VAR = "--site-header-h";
export const SITE_HEADER_OFFSET = `var(${SITE_HEADER_CSS_VAR}, ${SITE_HEADER_BASE_HEIGHT}px)`;

const STYLE_ID = "sod-site-chrome-metrics";

function findStickyHeader() {
  if (typeof document === "undefined") return null;
  const navs = Array.from(document.querySelectorAll("nav"));
  return navs.find((el) => {
    try {
      const cs = window.getComputedStyle(el);
      return cs.position === "sticky" && Math.abs(parseFloat(cs.top || "0")) < 0.5;
    } catch {
      return false;
    }
  }) || null;
}

function writeHeaderHeight() {
  if (typeof document === "undefined") return;
  const header = findStickyHeader();
  const measured = header ? Math.round(header.getBoundingClientRect().height) : SITE_HEADER_BASE_HEIGHT;
  const h = measured > 0 ? measured : SITE_HEADER_BASE_HEIGHT;
  document.documentElement.style.setProperty(SITE_HEADER_CSS_VAR, `${h}px`);
}

function installBridgeStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    :root { ${SITE_HEADER_CSS_VAR}: ${SITE_HEADER_BASE_HEIGHT}px; }
    html { scroll-padding-top: calc(${SITE_HEADER_OFFSET} + 12px); }

    /* Migration bridge for existing gallery/media portals.
       Normal viewers begin BELOW the sticky site header. True immersive viewers (StoryViewer/XR/etc.)
       are intentionally not matched here and may own the whole viewport. */
    @supports selector(body:has(*)) {
      body > [role="dialog"][aria-modal="true"]:has(.lb-main),
      body > [role="dialog"][aria-modal="true"]:has(button[aria-label="סגירה"]),
      body > div[style*="position: fixed"]:has(button[aria-label="סגור גלריה"]),
      body > div[style*="position: fixed"]:has(button[aria-label="סגור תמונה"]) {
        top: ${SITE_HEADER_OFFSET} !important;
        bottom: 0 !important;
      }

      /* ArchivePage and PostImageCarousel use viewport-fixed X buttons; move those below the header too. */
      body > div[style*="position: fixed"]:has(button[aria-label="סגור גלריה"]) button[aria-label="סגור גלריה"],
      body > div[style*="position: fixed"]:has(button[aria-label="סגור תמונה"]) button[aria-label="סגור"] {
        top: calc(${SITE_HEADER_OFFSET} + max(12px, env(safe-area-inset-top))) !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function installSiteChromeMetrics() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  installBridgeStyles();
  writeHeaderHeight();

  // Navbar may mount after this module is evaluated. Measure again after layout and whenever its size changes.
  const measureSoon = () => window.requestAnimationFrame(writeHeaderHeight);
  measureSoon();
  window.addEventListener("resize", measureSoon, { passive: true });

  if (typeof ResizeObserver !== "undefined") {
    let observed = null;
    const ro = new ResizeObserver(writeHeaderHeight);
    const attach = () => {
      const header = findStickyHeader();
      if (header && header !== observed) {
        if (observed) ro.unobserve(observed);
        observed = header;
        ro.observe(header);
        writeHeaderHeight();
      }
    };
    attach();
    const mo = new MutationObserver(attach);
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
}

installSiteChromeMetrics();
