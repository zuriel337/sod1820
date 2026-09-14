import React from "react";
import LayoutCore from "./LayoutCore.jsx";
import FeatureSurfaceSync from "../FeatureSurfaceSync.jsx";
import HomeTransitionNotice from "../HomeTransitionNotice.jsx";

// One global projection bridge: public references consume canonical feature availability.
export default function Layout(props) {
  return (
    <>
      <FeatureSurfaceSync />
      <HomeTransitionNotice />
      <LayoutCore {...props} />
    </>
  );
}
