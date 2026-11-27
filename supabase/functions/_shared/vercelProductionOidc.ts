// Verifier for the OIDC token that Vercel hands to the Production deployment of this project (decision 337, 26.11.2026).
// The constants and checks are the ones sg-rate-limit has used since it was deployed; test/security-probe-log-20261126.test.mjs asserts
// that the two files agree, so the second caller cannot drift from the first. sg-rate-limit itself is not changed or redeployed here.
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "npm:jose@6.2.12";

const TEAM_SLUG = "sod1820-s-projects";
const TEAM_ID = "team_vtfWHZfKvdbob8gvynQb5N89";
const PROJECT_ID = "prj_43q7k7QFAcWnin1tcBjce5xOi7Cq";
const PROJECT_NAME = "sod1820";
const AUDIENCE = `https://vercel.com/${TEAM_SLUG}`;
const EXPECTED_SUBJECT = `owner:${TEAM_SLUG}:project:${PROJECT_NAME}:environment:production`;
const TEAM_ISSUER = `https://oidc.vercel.com/${TEAM_SLUG}`;
const GLOBAL_ISSUER = "https://oidc.vercel.com";
const ALLOWED_ISSUERS = new Set([TEAM_ISSUER, GLOBAL_ISSUER]);
const JWKS = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(issuer: string) {
  let set = JWKS.get(issuer);
  if (!set) {
    set = createRemoteJWKSet(new URL("/.well-known/jwks", issuer));
    JWKS.set(issuer, set);
  }
  return set;
}

export async function verifyVercelProductionToken(token: string) {
  const decoded = decodeJwt(token);
  const issuer = typeof decoded.iss === "string" ? decoded.iss : "";
  if (!ALLOWED_ISSUERS.has(issuer)) throw new Error("issuer_not_allowed");

  const { payload } = await jwtVerify(token, jwksFor(issuer), {
    issuer,
    audience: AUDIENCE,
  });

  if (payload.owner_id !== TEAM_ID) throw new Error("owner_mismatch");
  if (payload.project_id !== PROJECT_ID) throw new Error("project_mismatch");
  if (payload.project !== PROJECT_NAME) throw new Error("project_name_mismatch");
  if (payload.environment !== "production") throw new Error("environment_mismatch");
  if (payload.sub !== EXPECTED_SUBJECT) throw new Error("subject_mismatch");
  return payload;
}
