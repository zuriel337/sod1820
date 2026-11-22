import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import WorldZviApprovedFindings2029 from "../components/research/WorldZviApprovedFindings2029.jsx";
import { PUBLISHED_FINDINGS_READING } from "../lib/publishedFindingsReading2029.js";
import { applySeo } from "../lib/seo.js";

export default function PublishedFindings2029Page() {
  const { search } = useLocation();
  const { title, description } = PUBLISHED_FINDINGS_READING;
  useEffect(() => {
    applySeo({ title, description, path: "/findings", noindex: Boolean(search), follow: true });
  }, [title, description, search]);
  return <Sod2029Shell surface="world" title={title} introVariant="none">
    <section className="sod29-section">
      <h1>{title}</h1>
      <p>{description}</p>
      <nav className="sod29-actions" aria-label="המשך קריאה">
        <Link to="/books">ספרים ומקורות</Link>
        <Link to="/codes/מחקר">צפני מחקר שפורסמו</Link>
      </nav>
    </section>
    <WorldZviApprovedFindings2029 scope="all" autoOpen />
  </Sod2029Shell>;
}
