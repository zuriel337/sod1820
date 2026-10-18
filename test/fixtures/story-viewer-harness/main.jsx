// The Legacy-facing story rail (src/components/OrGeulaStoryColumn.jsx) with synthetic rows: rows come through the brand's own `fetchRows`, so no request is made.
import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import OrGeulaStoryColumn, { BRAND_OR_GEULA } from "../../../src/components/OrGeulaStoryColumn.jsx";

const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const rows = [{ id: 1, text: "synthetic story one", image_url: PIXEL, thumb_url: PIXEL, created_at: new Date().toISOString(), priority: 0, link_url: null }, { id: 2, text: "synthetic story two", image_url: PIXEL, thumb_url: PIXEL, created_at: new Date(Date.now() - 36e5).toISOString(), priority: 0, link_url: null }];
const brand = { ...BRAND_OR_GEULA, seenKey: "harness-seen", fetchRows: async () => rows };
createRoot(document.getElementById("root")).render(<MemoryRouter><OrGeulaStoryColumn variant="shortcut" limit={12} brand={brand} /></MemoryRouter>);
