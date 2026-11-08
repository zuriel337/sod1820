import handler from "../../api/contributor-interactions.js";
import { publicReadingWritableApi } from "../read-only-api.js";
// ZURIEL, 8.11.2026: this one endpoint needs the real Authorization header and a
// real POST (sending a message), unlike the other public adapters in this folder,
// which stay GET-only/anonymous. See read-only-api.js for why this is safe.
export default publicReadingWritableApi(handler);
