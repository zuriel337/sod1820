import { contributorSelfHandler } from "../../api/contributor-self.js";

// Same canonical Auth/ownership reader. This Preview entry never permits writes.
export default contributorSelfHandler({ previewReadOnly: true });
