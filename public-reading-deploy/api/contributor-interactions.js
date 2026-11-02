import handler from "../../api/contributor-interactions.js";
import { publicReadingReadOnlyApi } from "../read-only-api.js";
export default publicReadingReadOnlyApi(handler);
