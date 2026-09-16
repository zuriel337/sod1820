import React from "react";
import EntityHubPreviewPageFunctional from "./EntityHubPreviewPageFunctional.jsx";

// G3 Golden 1237 review route: reuse the real functional Entity Hub and its live adapters,
// but expose only the product opening that is already part of the 2029 Number/Expression plan.
// Lower unfinished legacy/prototype sections stay hidden during this review so ZURIEL sees no
// presentation that is not intended for the original opening. No truth/data logic lives here.
export default function EntityHubPreviewPage() {
  return <>
    <style>{`
      .eh-func > div > header { display:none !important; }
      .eh-func > div > header + div { display:none !important; }
      .eh-func > div > section { display:none !important; }
      .eh-func { padding-top:16px !important; }
    `}</style>
    <EntityHubPreviewPageFunctional />
  </>;
}
