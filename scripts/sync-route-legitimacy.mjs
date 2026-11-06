import { syncRouteLegitimacy } from "./helpers/route-legitimacy-sources.mjs";
const write = process.argv.includes("--write");
const result = syncRouteLegitimacy({ write });
if (write) console.log(`route-legitimacy.js derived block ${result.upToDate ? "already up to date" : "updated"} (${result.routes} routes)`);
else if (!result.upToDate) { console.error("route-legitimacy.js derived block is stale: run `npm run sync:route-legitimacy` and commit the result."); process.exit(1); }
else console.log(`route-legitimacy.js derived block is up to date (${result.routes} routes)`);
