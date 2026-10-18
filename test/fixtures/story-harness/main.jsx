// Test harness (bundled by test/home-story-2029.test.mjs): the plane story as the Home surface and as the World surface, current component or the one before package 2.
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import Story from "@story";

let root = null;
function Harness({ surface }) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    window.__api.navigate = (to) => navigate(to);
    window.__api.back = () => navigate(-1);
    window.__location = { pathname: location.pathname, hash: location.hash };
  }, [location, navigate]);
  const research = {
    updateResearchContext(value) { window.__contextCalls.push(value); },
    context: { journey: { id: "fixture-journey" } },
  };
  const shell = { go(path, options) { window.__shellCalls.push({ path, options }); } };
  return <Story surface={surface} research={research} shell={shell} />;
}

window.__api = {
  mount(surface, initialEntry = "/") {
    root = createRoot(document.getElementById("root"));
    root.render(<MemoryRouter initialEntries={[initialEntry]}>
      <Harness surface={surface} />
    </MemoryRouter>);
  },
  unmount() { root?.unmount(); root = null; },
};
