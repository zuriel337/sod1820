import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import React from "react";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import VideoAssetPage from "./VideoAssetPage.jsx";

export default function Video2029Page() {
  return <Sod2029Shell
    surface="video"
    symbol={<NavigationIcon2029 name="video" />}
    eyebrow="VIDEO · SOURCE · CONTEXT"
    title="וידאו · SOD1820"
    description="נכס וידאו אחד, הקשרים רבים — מקור, סדרה, צופן ופוסטים על אותה זהות מדיה."
  >
    <VideoAssetPage />
  </Sod2029Shell>;
}
