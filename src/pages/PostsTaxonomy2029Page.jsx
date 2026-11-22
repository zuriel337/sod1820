import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { publicResearchCategory2029 } from "../lib/publicReadingRelease2029.js";
import Posts2029Page from "./Posts2029Page.jsx";
import { postsTaxonomyLocation2029, postsTaxonomyRoute2029 } from "../lib/research/postsTaxonomy2029Route.js";

// The same Posts surface and anonymous reader, addressed by its exact taxonomy.
export default function PostsTaxonomy2029Page() {
  const location = useLocation();
  const navigate = useNavigate();
  const reading = publicResearchCategory2029(location.pathname);
  const catalogue = reading ? { ...location, pathname: reading.path } : location;
  const scope = postsTaxonomyRoute2029(catalogue.pathname, location.search) || { kind: "invalid", key: "", label: "כתובת לא תקינה" };
  return <Posts2029Page taxonomyScope={scope} researchCategory={reading}
    onSearchParams={params => navigate(postsTaxonomyLocation2029(catalogue, params))} />;
}
