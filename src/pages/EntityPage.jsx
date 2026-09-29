import React from "react";
import EntityPageBase from "./EntityPageBase.jsx";

// SEO_GATE_DELEGATE: ./EntityPageBase.jsx
// 🚧 PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1
// Keep the traffic measurement experiment, but never mutate React-owned DOM.
// The previous MutationObserver + replaceChildren wrapper could race React
// reconciliation after async Number-page updates and crash the whole route.
export default function EntityPage(props) {
  return (
    <div data-number-traffic-surface-experiment="paused">
      <EntityPageBase {...props} pausePublicTrafficSurface />
    </div>
  );
}
