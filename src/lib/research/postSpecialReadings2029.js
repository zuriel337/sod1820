// The Posts the reading projection transforms specially (golden calibration, pilots). Moved out of post2029ReadingProjection.js unchanged so a
// server path can recognise them without loading the projection (which imports the Supabase client). Values are the projection's own.
export const GOLDEN_SLUG = "remzei-geula-ai-sod-hashir";
export const FZ1073_SLUG = "flydubai-fz1073-363-14000-remzei-geula";
export const BENNETT_SALT_SLUG = "bennett-melach-631-78";
export const ELECTIONS_SLUG = "sharshar-elections-redemption-hints-draft";
export const SPECIAL_READING_SLUGS = Object.freeze([GOLDEN_SLUG, FZ1073_SLUG, BENNETT_SALT_SLUG, ELECTIONS_SLUG]);
