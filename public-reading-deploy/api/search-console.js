import handler from "../../api/search-console.js";
import { publicReadingAdminApi } from "../read-only-api.js";

export default publicReadingAdminApi(handler);
