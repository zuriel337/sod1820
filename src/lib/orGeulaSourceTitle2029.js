// The one source-title decision for "אור הגאולה" (#1448), shared with the ingest Edge function. Pure functions only:
// no database or network client is imported here (network reads are injected by server callers).
export { captionDescription, captionTitle, isMeaningfulTitle, orGeulaItemKind, orGeulaSitemapAdmits, resolveOrGeulaTitle, youtubeVideoId } from "../../supabase/functions/_shared/orGeulaSourceTitle.js";
