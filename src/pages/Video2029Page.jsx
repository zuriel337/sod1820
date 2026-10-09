import React from "react";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import VideoAssetPage from "./VideoAssetPage.jsx";

export default function Video2029Page() {
  return <Sod2029Shell
    surface="video"
    symbol="▶"
    eyebrow="VIDEO · SOURCE · CONTEXT"
    title="וידאו · SOD1820"
    description="נכס וידאו אחד, הקשרים רבים — מקור, סדרה, צופן ופוסטים על אותה זהות מדיה."
  >
    <VideoAssetPage />
  </Sod2029Shell>;
}
