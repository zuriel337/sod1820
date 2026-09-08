import React from "react";
import LayoutCore from "./LayoutCore.jsx";
import FeatureSurfaceSync from "../FeatureSurfaceSync.jsx";

// One global projection bridge: public references consume canonical feature availability.
export default function Layout(props) {
  return (
    <>
      <FeatureSurfaceSync />
      <LayoutCore {...props} />
    </>
  );
}
