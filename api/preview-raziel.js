// Vercel function entrypoint for the explicitly allowlisted functional Preview.
// The shared handler itself rejects Production and every unapproved Git branch.
export { default } from "../preview-deploy/api/preview-raziel.js";
