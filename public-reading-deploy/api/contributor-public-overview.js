import handler from "../../api/contributor-public-overview.js";
import { publicReadingReadOnlyApi } from "../read-only-api.js";
export default publicReadingReadOnlyApi(handler);
