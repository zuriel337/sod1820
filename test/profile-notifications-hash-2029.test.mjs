// Old "העדכונים שלי" links (/profile#notifications, ZURIEL 18.11.2026): every way they arrive ends at /2029/me/profile#notifications —
// the server's /profile → /2029/me/profile continuation (the browser keeps the fragment), the client continuation, a sign-in return —
// and that address now continues to the follow centre, keeping its query and dropping the fragment.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicReadingContinuation } from "../src/lib/publicReadingRelease2029.js";
import { safePreviewOAuthReturnPath } from "../src/lib/oauthReturn.js";

const page = readFileSync(new URL("../src/pages/WriterPersonal2029Page.jsx", import.meta.url), "utf8");

test("the arrival paths keep the fragment up to the personal page", () => {
  assert.equal(publicReadingContinuation("/profile", "", "#notifications"), "/2029/me/profile#notifications");
  assert.equal(publicReadingContinuation("/profile", "?returnTo=%2Fpost", "#notifications"), "/2029/me/profile?returnTo=%2Fpost#notifications");
  assert.equal(safePreviewOAuthReturnPath("/profile#notifications"), "/profile#notifications", "a sign-in return keeps it");
});

test("profile + #notifications continues to the follow centre with its query; other modules and hashes are untouched", () => {
  assert.match(page, /if \(module === "profile" && hash === "#notifications"\) return <Navigate replace to=\{`\/2029\/me\/notifications\$\{search \|\| ""\}`\} \/>;/);
  const at = page.indexOf('if (module === "profile" && hash === "#notifications")');
  const effect = page.lastIndexOf("useEffect(() => { applySeo(", at);
  assert.ok(effect > 0 && effect < at, "the redirect comes after every hook of the component");
});
