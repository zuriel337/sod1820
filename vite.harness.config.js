import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Isolated build of the UX-audit harness (harness/preview.html). Not part of the app.
export default defineConfig({
  root: "harness",
  plugins: [react()],
  base: "./",
  build: { outDir: "../dist-harness", emptyOutDir: true },
});
