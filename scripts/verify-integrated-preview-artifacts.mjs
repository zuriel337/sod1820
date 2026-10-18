import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyPreviewArtifactInventory } from "./preview-artifact-inventory.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(process.argv[2] || resolve(root, "preview-deploy/dist"));
const { inventory } = await verifyPreviewArtifactInventory(output);
console.log(`Verified ${inventory.artifacts.length} deployed Preview artifacts.`);
