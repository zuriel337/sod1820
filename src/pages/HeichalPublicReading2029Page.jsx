import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import WorldZviApprovedFindings2029 from "../components/research/WorldZviApprovedFindings2029.jsx";
import { HEICHAL_PUBLIC_READING } from "../lib/heichalPublicReading2029.js";
import { applySeo } from "../lib/seo.js";

export default function HeichalPublicReading2029Page({ canResearch }) {
  const { search } = useLocation();
  const { title, description } = HEICHAL_PUBLIC_READING;
  useEffect(() => {
    applySeo({ title, description, path: "/heichal", noindex: Boolean(search), follow: true });
  }, [title, description, search]);
  return <Sod2029Shell surface="heichal" title={title} introVariant="none">
    <section className="sod29-section">
      <h1>{title}</h1>
      <p>{description}</p>
      <nav className="sod29-actions" aria-label="המשך קריאה">
        <Link to="/books">ספרים ומקורות</Link>
        <Link to="/codes/מחקר">אוסף המחקר</Link>
        {canResearch && <Link to="?mode=research">פתיחת כלי המחקר</Link>}
      </nav>
    </section>
    <WorldZviApprovedFindings2029 scope="all" autoOpen />
  </Sod2029Shell>;
}
