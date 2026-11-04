import { gaInsightsHandler } from "../../api/ga-insights.js";
import { publicReadingAdminApi } from "../read-only-api.js";

// This admin view reads the existing provider; simply opening Control must not
// run the Legacy country-history writer in the shared database.
export default publicReadingAdminApi((req, res) => gaInsightsHandler(req, res, { refreshCountryHistory: false }));
