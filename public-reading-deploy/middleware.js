// Vercel discovers middleware at the selected project root. The public reading
// artifact uses this nested root; sourceFilesOutsideRootDirectory alone does
// not register the repository-root entry. Reuse its exact audited function.
export { default } from "../middleware.js";

// Vercel statically extracts this matcher; an imported/re-exported config is
// insufficient. The build and binding test require exact canonical equality.
export const config = {
  matcher: ['/((?!api/|assets/|.*\\.).*)'],
};
