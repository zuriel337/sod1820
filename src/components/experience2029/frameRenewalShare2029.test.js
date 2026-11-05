import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transformWithOxc } from "vite";
import { contactSourceHref } from "./contactSource2029.js";
import { adminOpenClosedDestinations } from "./adminOpenDestinations2029.js";
import { publicPageShareUrl, postAddressSlug } from "../../lib/publicPostUrls.js";

const read = file => readFile(new URL(file, import.meta.url), "utf8");
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
const elements = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree)
  ? tree.flatMap(elements) : [tree, ...elements(tree.props?.children)];
const text = tree => elements(tree).flatMap(node => node.props?.children || []).filter(value => typeof value === "string").join(" ");

async function componentFixture(file, names, overrides = {}) {
  const slots = [];
  const transportCalls = [];
  let cursor = 0;
  const context = {
    React: react, Date, URL, URLSearchParams,
    window: { location: { origin: "https://preview.example" }, innerWidth: 390 },
    useEffect() {}, useMemo: get => get(), useCallback: callback => callback,
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useAuth: () => ({ user: { id: "signed-in" }, isAdmin: false }),
    PUBLIC_READING_RELEASE: true, publicLaunchActionsLocked: () => true,
    contactSourceHref: value => contactSourceHref(value, "https://preview.example"),
    newInteractionId: () => "unit-correlation", copyLink: async () => false,
    track() { transportCalls.push("track"); throw new Error("blocked preview must not emit"); },
    sendContactMessage() { transportCalls.push("sendContactMessage"); throw new Error("blocked preview must not send"); },
    getMyCommunityHintStatuses() { transportCalls.push("getMyCommunityHintStatuses"); throw new Error("blocked preview must not read private hints"); },
    ...overrides,
  };
  const { code } = await transformWithOxc(await read(file), file, { jsx: { runtime: "classic" } });
  for (const match of code.matchAll(/^import (.+?) from /gm)) {
    for (const name of match[1].replace(/[{}]/g, "").split(",").map(value => value.trim()).filter(Boolean)) {
      if (!(name in context)) context[name] = name;
    }
  }
  vm.runInNewContext(code.replace(/^import[\s\S]*?;\n/gm, "").replace(/\bexport (?:default )?/g, "")
    + `\nthis.exports = { ${names.join(",")} };`, context, { filename: file });
  return { ...context.exports, transportCalls, render(fn, props) { cursor = 0; return fn(props); } };
}

test("verse ribbon renders one exact static verse with its source, no action, timers or feed consumption", async () => {
  const h = await componentFixture("./GlobalLivingRibbon2029.jsx", ["GlobalLivingRibbon2029", "ELIJAH_VERSE_2029"]);
  const tree = h.render(h.GlobalLivingRibbon2029, { feed: { error: true, rows: [{ title: "other" }] } });
  const nodes = elements(tree);
  assert.equal(h.ELIJAH_VERSE_2029.text, "הִנֵּה אָנֹכִי שֹׁלֵחַ לָכֶם אֵת אֵלִיָּה הַנָּבִיא לִפְנֵי בּוֹא יוֹם ה׳ הַגָּדוֹל וְהַנּוֹרָא");
  assert.equal(h.ELIJAH_VERSE_2029.source, "מלאכי ג׳, כג");
  assert.equal(nodes.filter(node => node.type === "button").length, 0, "the verse ribbon carries no action");
  assert.equal(nodes.filter(node => node.type === "p").length, 1);
  assert.equal(nodes.find(node => node.type === "section").props["data-ribbon-state"], "verse");
  const source = await read("./GlobalLivingRibbon2029.jsx"), css = await read("./globalLivingRibbon2029.css");
  assert.doesNotMatch(source, /setInterval|setTimeout|Marquee|useEffect|useState|useMemo/);
  assert.doesNotMatch(css, /line-clamp|text-overflow|white-space:nowrap|@keyframes|(?:^|[;{])height:52px[;}]/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /white-space:normal/); assert.match(css, /min-height:52px/);
  // Typography comes from the Design V2 tokens the System Frame publishes, never page-local literals.
  assert.match(css, /var\(--s29-type-lead,21px\)/); assert.match(css, /var\(--s29-type-body,18px\)/); assert.match(css, /var\(--s29-type-micro,14px\)/);
  assert.match(css, /var\(--s29-brand-gold/); assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
});

test("approved explicit forms wait for persistence and never claim success after failure", async () => {
  for (const kind of ["idea", "contact"]) for (const fails of [false,true]) {
    let ack; const pending=new Promise(resolve=>{ack=resolve}); let calls=0;
    const h=await componentFixture("../ContactGateway.jsx",["ContactForm"],{sendContactMessage:async()=>{calls++;await pending;if(fails)throw Error("synthetic unavailable");}});
    const props={kind,initialText:"synthetic",pathname:"/post/current",contactContext:{},user:{email:"owner@example.invalid"}};
    const form=h.render(h.ContactForm,props);assert.equal(calls,0);
    const submit=form.props.onSubmit({preventDefault(){}});assert.equal(calls,1);
    assert.doesNotMatch(text(h.render(h.ContactForm,props)),/קיבלנו, תודה/);ack();await submit;
    const result=text(h.render(h.ContactForm,props));
    if(fails){assert.doesNotMatch(result,/קיבלנו, תודה/);assert.match(result,/לא הצלחנו לשלוח/);}else assert.match(result,/קיבלנו, תודה/);
  }
  for(const fails of [false,true]){
    let ack;const pending=new Promise(resolve=>ack=resolve);let calls=0;
    const h=await componentFixture("../IssueReport.jsx",["IssueReport"],{persistExplicitIssueReport:async()=>{calls++;await pending;if(fails)throw Error("synthetic rejection");}});
    const props={pathname:"/number/1820",initialText:"synthetic"};const form=h.render(h.IssueReport,props);
    const submit=form.props.onSubmit({preventDefault(){}});assert.equal(calls,1);
    assert.doesNotMatch(text(h.render(h.IssueReport,props)),/הדיווח נשלח/);
    await form.props.onSubmit({preventDefault(){}});assert.equal(calls,1);ack();await submit;
    const result=text(h.render(h.IssueReport,props));
    if(fails){assert.doesNotMatch(result,/הדיווח נשלח/);assert.match(result,/לא התקבל אישור שמירה/);}else assert.match(result,/הדיווח נשלח/);
  }
});

test("ordinary contact and issue forms retain their existing emitters and optional source metadata", async () => {
  for (const withSource of [false, true]) {
    const sourceHref = withSource ? "https://preview.example/post/current?page=2&token=SECRET#SECRET" : null;
    const sends = [], events = [];
    const gateway = await componentFixture("../ContactGateway.jsx", ["ContactForm", "buildContactGatewayContext"], {
      PUBLIC_READING_RELEASE: false, sendContactMessage: async payload => sends.push(payload),
    });
    const contactContext = gateway.buildContactGatewayContext({ sourceHref });
    const props = { kind: "contact", pathname: "/post/current?private=1#private", contactContext, initialText: "my note", user: { email: "reader@example.test" } };
    const form = gateway.render(gateway.ContactForm, props);
    assert.equal(elements(form).find(node => node.type === "button" && node.props.type === "submit").props.disabled, false);
    await form.props.onSubmit({ preventDefault() {} });
    assert.equal(sends.length, 1);
    assert.equal(sends[0].message, `my note\n\n[path=/post/current${withSource ? " · source=https://preview.example/post/current?page=2" : ""}]`);
    assert.match(text(gateway.render(gateway.ContactForm, props)), /קיבלנו, תודה/);

    const issue = await componentFixture("../IssueReport.jsx", ["IssueReport"], {
      PUBLIC_READING_RELEASE: false, track: (...args) => events.push(args),
    });
    const issueProps = { pathname: "/post/current?private=1#private", surface: "post", sourceHref, initialText: "my note" };
    const issueForm = issue.render(issue.IssueReport, issueProps);
    issueForm.props.onSubmit({ preventDefault() {} });
    issueForm.props.onSubmit({ preventDefault() {} });
    assert.equal(events.length, 1, "the existing issue emitter remains idempotent");
    assert.equal(events[0][3].path, "/post/current");
    assert.equal(events[0][3].message, "my note");
    assert.equal(events[0][3].source_href, withSource ? "https://preview.example/post/current?page=2" : undefined);
  }
});

test("locked public gateway does not mount private hint status or hint submission", async () => {
  const h = await componentFixture("../ContactGateway.jsx", ["ContactGateway"]);
  const tree = h.render(h.ContactGateway, { pathname: "/world" });
  assert.equal(elements(tree).some(node => typeof node.type === "function" && node.type.name === "MyCommunityHintStatusLoop"), false);
  assert.equal(elements(tree).some(node => node.type === "ReportHint"), false);
  assert.doesNotMatch(text(tree), /מצאתי רמז/);
});

test("global share follows the current public destination and suppresses personal/auth/mail routes", async () => {
  const source = await read("./SystemFrame2029.jsx");
  const start = source.indexOf("export function framePublicShareHref(");
  const helper = source.slice(start, source.indexOf("\n}", start) + 2).replace("export ", "");
  const context = { URL, URLSearchParams, publicPageShareUrl, postAddressSlug };
  vm.runInNewContext(helper, context);
  const share = context.framePublicShareHref;
  assert.equal(share({ pathname: "/post/current", search: "?page=2&method=standard&returnTo=%2F2029%2Fme&access_token=SECRET", hash: "#section-2" }, "https://sod1820.co.il/post/previous"), "https://sod1820.co.il/post/current?page=2&method=standard#section-2");
  assert.equal(share({ pathname: "/current", search: "?page=2", hash: "#section-2" }, "https://sod1820.co.il/post/current"), "https://sod1820.co.il/post/current?page=2#section-2");
  assert.equal(share({ pathname: "/community/chat", search: "?member=user%3A11111111-1111-4111-8111-111111111111", hash: "" }, "https://sod1820.co.il/community/researcher/another"), "https://sod1820.co.il/community/chat?member=user%3A11111111-1111-4111-8111-111111111111");
  for (const pathname of ["/2029/me/messages", "/community/researcher/me", "/profile", "/admin", "/2029/raziel", "/auth/callback", "/%61uth/callback", "/unsubscribe", "/credits"]) assert.equal(share({ pathname, search: "?code=SECRET", hash: "" }), null);
  assert.equal(share({ pathname: "/community/chat", search: "?claim=account" }), null);
});

test("global dock opens ShareActions directly with all approved choices and keeps More/tools and Now separate", async () => {
  const source = await read("./SystemFrame2029.jsx");
  const begin = source.indexOf("    if (transientKind === TRANSIENT.MORE) return");
  const branch = source.slice(begin, source.indexOf("    if (transientKind === TRANSIENT.TOOLS)", begin));
  const { code } = await transformWithOxc(`function render(){${branch}}`, "share-branch.jsx", { jsx: { runtime: "classic" } });
  for (const shareOnly of [true, false]) {
    const context = { React: react, transientKind: "more", TRANSIENT: { MORE: "more" }, transient: { payload: { shareOnly } },
      common: {}, PanelShell: "PanelShell", ShareActions: "ShareActions", FrameState: "FrameState", inspectTarget: null,
      activeToolDock: null, shareHref: "https://sod1820.co.il/post/current", surface: "post", title: "Current", openAction() {}, openTools() {},
      // The "עוד" panel also renders the administrator's list of still-closed destinations (#1214). This fixture is an ordinary visitor, and the real
      // helper answers an empty list for anyone who is not the administrator, so the share branch is exercised exactly as before.
      isAdmin: false, adminOpenClosedDestinations };
    vm.runInNewContext(code, context);
    const tree = context.render(), share = elements(tree).find(node => node.type === "ShareActions");
    assert.equal(tree.props.title, shareOnly ? "שיתוף" : "עוד");
    assert.equal(JSON.stringify(share.props.channels), JSON.stringify(["native", "whatsapp", "telegram", "facebook", "copy"]));
    assert.equal(share.props.url, context.shareHref);
    assert.equal(elements(tree).some(node => node.type === "button" && node.props.children.includes("כלים")), !shareOnly);
  }
  assert.match(source, /const openShare = useCallback\(\(\) => openTransient\(TRANSIENT\.MORE, \{ shareOnly: true \}\)/);
  assert.match(source, /<GlobalLivingRibbon2029 \/>/);
  assert.match(source, /sourceHref: contactSourceHref\(location\)/);
  assert.match(source, /const feed = useSystemFeed2029\(\{ enabled: surface !== "control", nowOpen: transient\?\.kind === TRANSIENT\.ATTENTION \}\)/);
  assert.match(source, /data-command-mode="tool"[\s\S]*activeToolDock\.actions\.slice\(0, 2\)[\s\S]*activeToolDock\.actions\.slice\(2, 4\)/);
  // #1214 replaced the share-only dock button with the one full "עוד" entry: sharing is a section of that panel (the branch exercised above, ShareActions
  // with every approved channel) and test/dock-more-2029.test.mjs pins the five-control dock. The dock entry must open that panel.
  assert.match(source, /onClick=\{openMore\}[^>]*aria-label="עוד · פעולות, כלים ושיתוף"/);
});
