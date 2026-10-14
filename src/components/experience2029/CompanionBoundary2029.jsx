// Scoped loading/error shell for the lazily loaded desktop companion capsule. It carries no heavy imports on purpose:
// the placeholder reuses the capsule's own classes, so geometry (slim/peek/pinned) is unchanged while the module loads.
import React from "react";

export function CompanionPlaceholder2029({ mode, hoverProps, children = null, ...rest }) {
  return <aside className={`sod29-companion is-${mode}`} aria-label="עדכונים, הקשר ורצף האירועים" data-companion-mode={mode} data-companion-state="loading" aria-busy="true" {...hoverProps} {...rest}>{children}</aside>;
}

export default class CompanionBoundary2029 extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    // The module could not be fetched. The cached failed import cannot be retried reliably, so the only honest action is
    // an explicit, user-initiated page reload; the main content stays usable and nothing reloads on its own.
    return <CompanionPlaceholder2029 mode={this.props.mode === "slim" ? "slim" : "peek"} data-companion-state="failed" aria-busy="false">
      <div className="sod29-companion-full" role="status">
        <p>לא הצלחנו לטעון את פאנל העדכונים.</p>
        <button type="button" className="sod29-companion-pin" onClick={() => { try { window.location.reload(); } catch {} }}>טען את הדף מחדש</button>
      </div>
    </CompanionPlaceholder2029>;
  }
}
