import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the canonical Workspace uses the shared centered workspace projection", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  const frameCss = read("src/components/experience2029/systemFrame2029.css");
  const workspaceCss = read("src/components/experience2029/myWorkspace2029.css");
  assert.match(frame, /PanelShell \{\.\.\.common\} panelKind="workspace"[^>]*title="האזור האישי שלי"/);
  assert.match(frameCss, /\.sod29-frame-panel\[data-panel-kind="workspace"\]\{[^}]*width:min\(960px,calc\(100vw - 48px\)\);margin-inline:auto/);
  assert.match(frameCss, /data-panel-kind="workspace"[^}]*\.sod29-frame-panel-body\{[^}]*width:min\(100%,900px\);margin-inline:auto/);
  assert.match(frameCss, /data-panel-kind="workspace"[^}]*height:min\(92dvh,860px\)/);
  assert.match(workspaceCss, /data-panel-kind="workspace"[^}]*\.sod29-panel-lead\{text-align:center/);
  for (const label of ["המחקר שלי", "השיחות שלי", "הדף שלי", "הפרופיל וההגדרות", "ההודעות שלי", "ההתקדמות שלי"]) {
    assert.match(frame, new RegExp(label));
  }
  assert.match(frame, /title: "השיחות שלי"[\s\S]{0,220}state: "live"[\s\S]{0,120}setWorkspaceSection\("raziel"\)/);
});

test("all personal modules consume one bounded balanced RTL layout", () => {
  const page = read("src/pages/WriterPersonal2029Page.jsx");
  const view = read("src/components/contributor2029/WriterPersonalViews2029.jsx");
  const css = read("src/components/contributor2029/writerPersonalViews2029.css");
  assert.match(page, /module=\{selected\}/);
  assert.match(page, /onOpenWorkspace=\{shell\.openWorkspace\}/);
  assert.match(page, /צריך להתחבר כדי לראות את האזור האישי/);
  assert.match(view, /data-personal-module=\{text\(module\) \|\| undefined\}/);
  assert.match(view, /<div className="wp-head-actions">/);
  assert.match(css, /\.wp-layout\{[^}]*width:min\(100%,980px\);margin-inline:auto/);
  assert.match(css, /\.wp-head\{[^}]*justify-items:center;text-align:center/);
  assert.match(css, /\.wp-nav\{[^}]*justify-content:center/);
  assert.match(css, /@media\(max-width:620px\)[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /:is\(button,select,textarea,a,input:not\(\[type=checkbox\],\[type=radio\]\)\)[^}]*min-height:44px!important;min-width:44px/);
});

test("Preview reuses contributor-self GET and fails closed for writes", () => {
  const api = read("api/contributor-self.js");
  assert.match(api, /previewReadOnly = process\.env\.VERCEL_ENV === "preview"/);
  assert.match(api, /previewReadOnly && req\.method === "POST"/);
  assert.match(api, /X-Preview-Write-Blocked/);
  assert.doesNotMatch(api, /mockProfile|fixtureProfile|previewUser/);
});
