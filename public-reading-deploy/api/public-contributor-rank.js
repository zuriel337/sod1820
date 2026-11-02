import handler from "../../api/public-contributor-rank.js";
import { publicReadingReadOnlyApi } from "../read-only-api.js";
export default publicReadingReadOnlyApi(handler);
