import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import React, { lazy, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import WorldZviApprovedFindings2029 from "../components/research/WorldZviApprovedFindings2029.jsx";
import { PUBLISHED_FINDINGS_READING } from "../lib/publishedFindingsReading2029.js";
import { applySeo } from "../lib/seo.js";

import { requestedPublicInsight2029 } from "../lib/publicInsightReading2029.js";

const PublicInsight2029 = lazy(() => import("./PublicInsight2029.jsx"));

export default function PublishedFindings2029Page() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (params.has("insight")) {
    const id = requestedPublicInsight2029(params);
    return <PublicInsight2029 key={id || "missing"} id={id} indexable={params.size === 1} />;
  }
  return <FindingsIndex search={search} />;
}

function FindingsIndex({ search }) {
  const { title, description } = PUBLISHED_FINDINGS_READING;
  useEffect(() => {
    applySeo({ title, description, path: "/findings", noindex: Boolean(search), follow: true });
  }, [title, description, search]);
  return <Sod2029Shell surface="world" symbol={<NavigationIcon2029 name="heichal" />} title={title} introVariant="none">
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
