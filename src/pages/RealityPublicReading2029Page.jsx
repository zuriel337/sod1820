import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import PublicRealityRiver from "../components/research/RealityRiver2029.jsx";
import { PUBLIC_REALITY_STREAM_2029 } from "../lib/publicReadingRelease2029.js";
import { applySeo } from "../lib/seo.js";

export default function RealityPublicReading2029Page() {
  const { search } = useLocation();
  const { title, description } = PUBLIC_REALITY_STREAM_2029;
  useEffect(() => {
    applySeo({ title, description, path: "/reality", noindex: Boolean(search), follow: true });
  }, [search, title, description]);
  return <Sod2029Shell surface="world" title={title} introVariant="none">
    <section className="sod29-section">
      <h1>{title}</h1>
      <p>{description}</p>
      <Link to="/gallery">גלריות ומקורות</Link>
    </section>
    <PublicRealityRiver />
  </Sod2029Shell>;
}
