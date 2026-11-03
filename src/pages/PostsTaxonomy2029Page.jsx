import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Posts2029Page from "./Posts2029Page.jsx";
import { postsTaxonomyLocation2029, postsTaxonomyRoute2029 } from "../lib/research/postsTaxonomy2029Route.js";

// The same Posts surface and anonymous reader, addressed by its exact taxonomy.
export default function PostsTaxonomy2029Page() {
  const location = useLocation();
  const navigate = useNavigate();
  const scope = postsTaxonomyRoute2029(location.pathname, location.search) || { kind: "invalid", key: "", label: "כתובת לא תקינה" };
  return <Posts2029Page taxonomyScope={scope}
    onSearchParams={params => navigate(postsTaxonomyLocation2029(location, params))} />;
}
