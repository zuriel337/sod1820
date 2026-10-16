// Test harness (bundled by test/home-story-2029.test.mjs): the plane story as the Home surface and as the World surface, current component or the one before package 2.
import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import Story from "@story";

window.__api = {
  mount(surface, initialEntry = "/") {
    createRoot(document.getElementById("root")).render(<MemoryRouter initialEntries={[initialEntry]}>
      <Story surface={surface} research={{ updateResearchContext() {}, context: null }} shell={{ go() {} }} />
    </MemoryRouter>);
  },
};
