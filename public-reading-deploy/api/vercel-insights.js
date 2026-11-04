import handler from "../../api/vercel-insights.js";
import { publicReadingAdminApi } from "../read-only-api.js";

export default publicReadingAdminApi(handler);
