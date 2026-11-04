import React, { useEffect, useState } from "react";

// The canonical gateway and all props are unchanged. Its form code is requested
// only after the existing explicit issue/contact action opens the PanelShell.
export default function ContactGatewayOnDemand2029(props) {
  const [state, setState] = useState({ Gateway: null, failed: false });
  useEffect(() => {
    let alive = true;
    import("../ContactGateway.jsx").then((module) => {
      if (alive) setState({ Gateway: module.default, failed: false });
    }).catch(() => { if (alive) setState({ Gateway: null, failed: true }); });
    return () => { alive = false; };
  }, []);
  if (state.Gateway) return <state.Gateway {...props} />;
  return state.failed ? <div role="alert">
    <p>טופס הפנייה לא נטען. אפשר לסגור את החלון או לרענן את הדף ולנסות שוב.</p>
    <button className="sod29-action" type="button" onClick={() => window.location.reload()}>רענון הדף</button>
  </div> : <p role="status">פותח את טופס הפנייה…</p>;
}
