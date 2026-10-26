import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createLifeJourneyFixturePlugin as lifeJourneyFixturePlugin } from "./fixtures/life-journey-fixture-plugin.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright;
let vite;
let reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional outside browser-capable CI. */ }

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const available = Boolean(playwright && vite && reactPlugin && existsSync(executablePath));


test("Life Journey keeps Person and explicit family selection through Name and Date across mobile/desktop themes", { skip: !available, timeout: 180_000 }, async () => {
  const server = await vite.createServer({
    root,
    configFile: false,
    plugins: [lifeJourneyFixturePlugin(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 },
  });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const browserErrors = [];
    const requestUrls = [];
    const requestBodies = [];
    let invitationToken = "";
    page.on("pageerror", error => browserErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) browserErrors.push(message.text()); });
    page.on("request", request => {
      requestUrls.push(request.url());
      if (request.postData()) requestBodies.push(request.postData());
    });

    await page.goto(`${origin}/2029/journey`);
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    await page.getByLabel("שם פרטי").fill("הורה בדיקה");
    await page.getByLabel("שם משפחה").fill("משפחה");
    await page.getByLabel("תאריך לידה").first().fill("1990-02-15");
    await page.getByLabel("שעת לידה מדויקת").first().fill("05:30");
    await page.getByLabel("מקום לידה").first().fill("עיר בדיקה");
    await page.getByRole("button", { name: "פתח את מסע החיים" }).click();
    await page.getByRole("button", { name: "עדכן וחבר מחדש" }).waitFor();
    assert.equal(await page.evaluate(() => window.__matrixCalls.length), 0, "saving a Person does not start research automatically");
    await page.getByRole("button", { name: "פתח את המחקר שלי" }).first().click();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await page.getByText("מסר מנורמל · מבוסס תוצאות מנוע", { exact: true }).waitFor();
    assert.equal(await page.locator(".person-journey-expression-matrix article").count(), 3);
    assert.equal(await page.evaluate(() => window.__matrixCalls.filter(call => call.kind === "name-methods").length), 3);
    assert.equal(await page.evaluate(() => window.__matrixCalls.filter(call => call.kind === "relation").length), 3);
    await page.getByRole("button", { name: "המשך למטריצת השם והתאריך" }).click();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.getByRole("heading", { name: "מה המטריצה מראה עכשיו" }).waitFor();
    assert.equal(await page.locator(".person-journey-expression-matrix article").count(), 8);
    assert.equal(await page.evaluate(() => window.__matrixCalls.filter(call => call.kind === "methods").length), 8);
    assert.equal(await page.evaluate(() => window.__matrixCalls.filter(call => call.kind === "relation").length), 31);
    assert.equal(await page.getByText("רשימות הגימטריה המלאות", { exact: true }).count(), 1);
    assert.equal(await page.locator(".person-journey-reflection-cards").count(), 0, "no cards are mounted in Life Journey");
    await page.getByRole("button", { name: "סיים וחזור למסע החיים" }).click();
    await page.getByRole("button", { name: "עדכן וחבר מחדש" }).waitFor();

    const family = page.locator('[data-experience-capability="life-journey-family"]');
    const resumeControls = family.getByRole("region", { name: "שמירה והמשך של מסע החיים" });
    await family.getByLabel("שם בן/בת משפחה").fill("ילד בדיקה");
    await family.getByLabel("תאריך לידה").fill("2020-03-04");
    await family.getByLabel("שעת לידה מדויקת").fill("14:20");
    await family.getByLabel("מקום לידה", { exact: true }).fill("יישוב בדיקה");
    await family.getByLabel("הקשר אליי").selectOption("child_of_me");
    await family.getByRole("button", { name: "הוסף למסע" }).click();
    await family.locator(".person-journey-family-member strong", { hasText: "ילד בדיקה" }).waitFor();
    const childMemberCard = family.locator(".person-journey-family-member", { hasText: "ילד בדיקה" });
    await childMemberCard.getByRole("button", { name: "עריכה" }).click();
    assert.equal(await family.getByLabel("שם בן/בת משפחה").inputValue(), "ילד בדיקה");
    await family.getByLabel("שעת לידה מדויקת").fill("14:45");
    await family.getByLabel("מקום לידה", { exact: true }).fill("יישוב מעודכן");
    await family.getByRole("button", { name: "שמור שינויים" }).click();
    await childMemberCard.getByText("פרטי לידה ומקור", { exact: true }).click();
    await childMemberCard.getByText("מקום לידה · יישוב מעודכן").waitFor();

    await family.getByLabel("שם בן/בת משפחה").fill("רשומה למחיקה");
    await family.getByRole("button", { name: "הוסף למסע" }).click();
    const disposableCard = family.locator(".person-journey-family-member", { hasText: "רשומה למחיקה" });
    await disposableCard.waitFor();
    page.once("dialog", dialog => dialog.accept());
    await disposableCard.getByRole("button", { name: "מחיקה" }).click();
    await disposableCard.waitFor({ state: "detached" });
    await family.getByText("חיבור חשבונות והזמנות", { exact: true }).click();
    await family.getByRole("heading", { name: "אותו אדם, גם כשנפתח חשבון נפרד" }).waitFor();
    assert.ok(await family.getByText("זהות משפחתית · חשבון עתידי אפשרי").count() >= 1);
    assert.equal(await family.getByText(/מקור הפרטים: הוזן בחשבון שלך/).count(), 1);
    assert.ok(await family.getByText(/מקור הפרטים: הוזן על ידך במסע החיים/).count() >= 1);
    const accountContinuity = family.locator('[data-experience-capability="life-journey-account-continuity"]');
    const childClaimCard = accountContinuity.locator("article", { hasText: "ילד בדיקה" });
    await childClaimCard.getByRole("button", { name: "צור הזמנה לחיבור חשבון" }).waitFor();
    await childClaimCard.getByRole("button", { name: "צור הזמנה לחיבור חשבון" }).click();
    const tokenCode = childClaimCard.locator("code");
    await tokenCode.waitFor();
    invitationToken = (await tokenCode.textContent())?.trim() || "";
    assert.match(invitationToken, /^[a-f0-9]{64}$/);
    await childClaimCard.getByText("ממתין לחיבור").waitFor();
    assert.equal(await page.evaluate(token => Object.values(localStorage).some(value => String(value).includes(token)), invitationToken), false, "raw invitation token is never persisted in browser storage");
    assert.equal(decodeURIComponent(page.url()).includes(invitationToken), false, "raw invitation token is never placed in the URL");
    assert.equal(await page.evaluate(() => window.__familyInvitationEmailCalls.length), 0, "email is never sent automatically");
    await childClaimCard.getByText("שליחה פרטית", { exact: true }).click();
    await childClaimCard.getByLabel("מייל של מקבל/ת ההזמנה").fill("child@example.test");
    await childClaimCard.getByRole("button", { name: "שלח במייל" }).click();
    await accountContinuity.getByText("ההזמנה נמסרה לספק המייל. כתובת הנמען לא נשמרה במסע החיים.").waitFor();
    const emailDelivery = await page.evaluate(() => window.__familyInvitationEmailCalls[0]);
    assert.equal(emailDelivery.rawToken, invitationToken);
    assert.equal(emailDelivery.recipientEmail, "child@example.test");
    assert.match(emailDelivery.claimId, /^[0-9a-f-]{36}$/);
    assert.equal(await childClaimCard.getByLabel("מייל של מקבל/ת ההזמנה").inputValue(), "");
    await childClaimCard.getByRole("button", { name: "שתף באופן פרטי" }).click();
    await accountContinuity.getByText("חלון השיתוף הפרטי נפתח במכשיר.").waitFor();
    assert.deepEqual(await page.evaluate(() => window.__familyInvitationShareCalls), [invitationToken]);
    assert.equal(await page.evaluate(() => Object.values(localStorage).some(value => String(value).includes("child@example.test"))), false, "recipient email is never persisted");
    assert.equal(decodeURIComponent(page.url()).includes("child@example.test"), false, "recipient email is never placed in the URL");

    const familyScope = family.getByRole("group", { name: "מי משתתף במחקר המשפחתי?" });
    const childSelection = familyScope.getByRole("checkbox", { name: /ילד בדיקה/ });
    assert.equal(await childSelection.isChecked(), false);
    await childSelection.check();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneySelectedMemberRefs?.length), 2);
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0, "family selection never starts ELS");

    const firstRef = await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneyPersonRef);
    assert.match(firstRef, /^person:11111111-1111-4111-8111-111111111111:self$/);
    await page.reload();
    await page.getByRole("button", { name: "עדכן וחבר מחדש" }).waitFor();
    assert.equal(await page.getByLabel("שם פרטי").inputValue(), "הורה בדיקה");
    assert.equal(await page.getByLabel("שם משפחה").inputValue(), "משפחה");
    assert.equal(await page.getByLabel("תאריך לידה").first().inputValue(), "1990-02-15");
    assert.equal(await page.getByLabel("שעת לידה מדויקת").first().inputValue(), "05:30");
    assert.equal(await page.getByLabel("מקום לידה").first().inputValue(), "עיר בדיקה");
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneyPersonRef), firstRef);
    assert.equal(await childSelection.isChecked(), true, "family selection survives refresh through Research Context");
    await family.getByText("חיבור חשבונות והזמנות", { exact: true }).click();
    await accountContinuity.getByText("קיימת הזמנה ממתינה. הקוד הגולמי אינו נשמר; אם הוא אבד, בטלו וצרו קוד חדש.").waitFor();
    assert.equal(await childClaimCard.locator("code").count(), 0, "raw invitation token disappears after refresh");
    await familyScope.getByRole("button", { name: "נקה בחירה" }).click();
    assert.deepEqual(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneySelectedMemberRefs), []);
    await familyScope.getByRole("button", { name: "בחר את כולם" }).click();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneySelectedMemberRefs?.length), 2);
    assert.equal(await childSelection.isChecked(), true);
    const lifeMaps = page.locator('[data-experience-capability="life-journey-maps"]');
    const openMap = id => lifeMaps.locator(`[data-map-card="${id}"] [data-atlas-action]`).click();
    const mapCurrent = id => lifeMaps.locator(`[data-map-card="${id}"] [data-atlas-action]`).getAttribute("aria-current");
    await lifeMaps.getByRole("heading", { name: "מפות החיים" }).waitFor();
    assert.equal(await lifeMaps.locator(".person-journey-map-panel").count(), 0, "the atlas is shown first; no map is forced open");
    await openMap("summary");
    const picture = lifeMaps.locator('[data-experience-capability="life-journey-personal-picture"]');
    await picture.getByRole("heading", { name: "התמונה שלי", exact: true }).waitFor();
    assert.equal(await mapCurrent("summary"), "true");
    const guidedFlow = page.locator('[data-experience-capability="life-journey-guided-map-flow"]');
    await guidedFlow.getByRole("heading", { name: "המסלול המודרך" }).waitFor();
    await guidedFlow.getByLabel("4 מתוך 10 תחנות הושלמו").waitFor();
    assert.equal(await guidedFlow.getByRole("button", { name: /ELS/ }).isDisabled(), true);
    const hintPanel = page.locator('[data-experience-capability="life-journey-hint-references"]');
    const hintBranch = lifeMaps.locator('[data-tree-branch="private-hints"]');
    const callsBeforeHints = await page.evaluate(() => [window.__matrixCalls.length, window.__reflectionCalls.length, window.__nameCalls.length, window.__dateCalls.length, window.__elsCalls.length]);
    await hintBranch.getByRole("button", { name: /הרמזים הפרטיים שלי/ }).click();
    await hintPanel.getByText(/2024-02-29/).waitFor();
    await hintPanel.getByText("מועד האירוע לא צוין", { exact: true }).waitFor();
    await hintPanel.getByText("מועד האירוע דורש הבהרה לפני בדיקה", { exact: true }).waitFor();
    assert.equal(await hintPanel.getByText(/2035-11-03/).count(), 0, "submission date is not displayed as the event date");
    assert.equal(await page.evaluate(() => window.__hintReads.length), 1, "picture and hint list share one owned read");
    assert.equal(await hintBranch.getByRole("button").getAttribute("aria-pressed"), "true", "private hints are an active branch in the same research tree");
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneyMapTab), "hints");
    assert.deepEqual(await page.evaluate(() => [window.__matrixCalls.length, window.__reflectionCalls.length, window.__nameCalls.length, window.__dateCalls.length, window.__elsCalls.length]), callsBeforeHints, "opening owned hint references starts no research, AI or ELS call");
    const privateObservation = "מצאתי חזרה פרטית בבדיקה";
    const privateQuestion = "האם היא קשורה לתאריך האירוע?";
    await hintPanel.getByRole("button", { name: "הוסף תצפית פרטית" }).click();
    await hintPanel.getByLabel("התצפית הפרטית").fill(privateObservation);
    await hintPanel.getByLabel("מה תרצו לבדוק בהמשך?").fill(privateQuestion);
    await hintPanel.getByLabel("מועד האירוע — אם ידוע בדיוק").fill("2026-10-26");
    await hintPanel.getByLabel("למי זה קשור? — לא חובה").selectOption({ label: "ילד בדיקה" });
    await hintPanel.getByLabel("מספר מדויק — לא חובה").fill("337");
    await hintPanel.getByRole("button", { name: "המשך לאישור" }).click();
    const confirmation = hintPanel.getByRole("region", { name: "אישור תצפית פרטית" });
    await confirmation.getByText(privateObservation, { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__hintWrites.length), 0, "review does not write before explicit confirmation");
    await confirmation.getByRole("button", { name: "אשר ושמור כפרטי" }).click();
    await hintPanel.getByText("התצפית נשמרה כרמז פרטי ואושרה על ידי הכותב הקיים.", { exact: true }).waitFor();
    const savedHint = hintPanel.locator(".person-journey-hint-list article", { hasText: "רמז · 337" });
    await savedHint.getByText("משויך במפורש אל ילד בדיקה", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__hintWrites.length), 1);
    assert.deepEqual(await page.evaluate(() => window.__hintWrites[0].options), { fallbackLocal: false });
    assert.deepEqual(await page.evaluate(() => [window.__matrixCalls.length, window.__reflectionCalls.length, window.__nameCalls.length, window.__dateCalls.length, window.__elsCalls.length]), callsBeforeHints, "private capture starts no research, AI or ELS call");
    assert.equal(decodeURIComponent(page.url()).includes(privateObservation), false, "private observation is never placed in the URL");
    assert.equal(JSON.stringify(await page.evaluate(() => window.__lifeJourneyContext)).includes(privateObservation), false, "private observation is not copied into Research Context");
    assert.equal(JSON.stringify(await page.evaluate(() => window.__telemetry)).includes(privateObservation), false, "private observation is not copied into telemetry");
    const boundedCallsBefore = await page.evaluate(() => ({
      sources: window.__sourceCalls.length,
      matrix: window.__matrixCalls.length,
      reflection: window.__reflectionCalls.length,
      names: window.__nameCalls.length,
      dates: window.__dateCalls.length,
      els: window.__elsCalls.length,
    }));
    await savedHint.getByRole("button", { name: "בדוק תאריך ומספר" }).click();
    const boundedCheck = savedHint.locator('[data-experience-capability="life-journey-hint-bounded-checks"]');
    await boundedCheck.getByRole("heading", { name: "מה נמצא בבדיקה" }).waitFor();
    await boundedCheck.getByText(/2026-10-26/).waitFor();
    await boundedCheck.getByText("ילד בדיקה", { exact: true }).waitFor();
    await boundedCheck.getByText("אור", { exact: true }).waitFor();
    await boundedCheck.getByText("דרך", { exact: true }).waitFor();
    const boundedCallsAfter = await page.evaluate(() => ({
      sources: window.__sourceCalls.length,
      matrix: window.__matrixCalls.length,
      reflection: window.__reflectionCalls.length,
      names: window.__nameCalls.length,
      dates: window.__dateCalls.length,
      els: window.__elsCalls.length,
    }));
    assert.deepEqual(boundedCallsAfter, { ...boundedCallsBefore, sources: boundedCallsBefore.sources + 1 }, "explicit hint check performs exactly one canonical number read and starts no AI, ELS, name or family research");
    assert.deepEqual(await page.evaluate(() => window.__sourceCalls.at(-1)), { kind: "number_lookup", value: 337 });
    assert.equal(JSON.stringify(await page.evaluate(() => window.__sourceCalls)).includes(privateObservation), false, "private hint narrative is not sent to the canonical number reader");
    assert.equal(JSON.stringify(await page.evaluate(() => window.__sourceCalls)).includes(privateQuestion), false, "private hint question is not sent to the canonical number reader");
    assert.equal(await page.evaluate(() => (window.__razielCalls || []).length), 0, "bounded checks never start Raziel automatically");
    const engineCountsBeforeExplanation = await page.evaluate(() => [window.__matrixCalls.length, window.__reflectionCalls.length, window.__nameCalls.length, window.__dateCalls.length, window.__elsCalls.length, window.__sourceCalls.length]);
    await boundedCheck.getByRole("button", { name: "בקש פענוח מרזיאל" }).click();
    await boundedCheck.getByText("החבילה נשלחה בפעולה מפורשת והתשובה נפתחה ברזיאל.", { exact: true }).waitFor();
    const explanationSubmission = await page.evaluate(() => window.__razielCalls[0]);
    assert.equal(explanationSubmission.contract, "life_journey_hint_evidence_explanation_v1");
    assert.match(explanationSubmission.facts, /confirmed_number=337/);
    assert.match(explanationSubmission.facts, /canonical_source_match_1=.*אור/);
    for (const privateValue of [privateObservation, privateQuestion, "ילד בדיקה", "הורה בדיקה", "2026-10-26", "2020-03-04", "person:"]) {
      assert.equal(JSON.stringify(explanationSubmission).includes(privateValue), false, `${privateValue} stays outside the Raziel evidence request`);
    }
    assert.deepEqual(await page.evaluate(() => [window.__matrixCalls.length, window.__reflectionCalls.length, window.__nameCalls.length, window.__dateCalls.length, window.__elsCalls.length, window.__sourceCalls.length]), engineCountsBeforeExplanation, "requested explanation reuses checked evidence without rerunning any engine or ELS");
    assert.equal(decodeURIComponent(page.url()).includes(privateObservation), false);
    assert.equal(JSON.stringify(await page.evaluate(() => window.__lifeJourneyContext)).includes(privateQuestion), false);
    assert.equal(JSON.stringify(await page.evaluate(() => window.__telemetry)).includes(privateObservation), false);
    await savedHint.getByRole("button", { name: "הצג בציר החיים" }).click();
    const hintTimeline = page.getByRole("region", { name: "תצפיות פרטיות מתוארכות" });
    await hintTimeline.getByText("תצפית פרטית · ילד בדיקה", { exact: true }).waitFor();
    assert.equal(await hintTimeline.getByText(privateObservation, { exact: true }).count(), 0, "timeline receives a generic private event, not hint content");
    await hintBranch.getByRole("button", { name: /הרמזים הפרטיים שלי/ }).click();
    await savedHint.locator('[data-experience-capability="life-journey-hint-bounded-checks"]').waitFor();
    assert.equal(await page.evaluate(() => window.__sourceCalls.length), boundedCallsAfter.sources, "screen switching preserves the bounded result without rerunning it");
    await openMap("summary");
    await guidedFlow.getByRole("heading", { name: "המסלול המודרך" }).waitFor();
    assert.equal(await guidedFlow.locator('button[aria-current="step"]').innerText().then(text => text.includes("חיבורים")), true);
    const callsBeforeGuidedNavigation = await page.evaluate(() => ({
      matrix: window.__matrixCalls.length,
      reflection: window.__reflectionCalls.length,
      names: window.__nameCalls.length,
      dates: window.__dateCalls.length,
      els: window.__elsCalls.length,
    }));
    await guidedFlow.getByRole("button", { name: "המשך ל־חיבורים" }).click();
    await lifeMaps.getByText("המטריצה תופיע לאחר הפעלת המחקר המפורש לאנשים שנבחרו.", { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => ({
      matrix: window.__matrixCalls.length,
      reflection: window.__reflectionCalls.length,
      names: window.__nameCalls.length,
      dates: window.__dateCalls.length,
      els: window.__elsCalls.length,
    })), callsBeforeGuidedNavigation, "guided navigation never starts research");
    await openMap("guide");
    await openMap("timeline");
    const birthTimeline = page.locator('[data-experience-capability="life-journey-birth-timeline"]');
    await birthTimeline.getByRole("heading", { name: "ציר אירועי היסוד" }).waitFor();
    assert.deepEqual(await birthTimeline.locator(":scope > ol > li time").allTextContents(), ["15.02.1990", "04.03.2020"]);
    assert.deepEqual(await birthTimeline.locator(":scope > ol > li strong").allTextContents(), ["הורה בדיקה משפחה", "ילד בדיקה"]);
    assert.equal(await birthTimeline.getByText("י״א בתשרי").count(), 2);
    assert.equal(await birthTimeline.getByText("שעת לידה · 05:30").count(), 1);
    assert.equal(await birthTimeline.getByText("שעת לידה · 14:45").count(), 1);
    assert.equal(await birthTimeline.getByText("מקום לידה · עיר בדיקה").count(), 1);
    assert.equal(await birthTimeline.getByText("מקום לידה · יישוב מעודכן").count(), 1);
    await openMap("time");
    const timeMap = page.locator('[data-experience-capability="life-journey-time-gates-map"]');
    await timeMap.getByRole("heading", { name: "מפת שערי הזמן" }).waitFor();
    await timeMap.getByRole("button", { name: /ילד בדיקה/ }).click();
    await timeMap.getByRole("heading", { name: "י״א בתשרי תשפ״ז" }).waitFor();
    await timeMap.getByText("יום עברי", { exact: true }).waitFor();
    await timeMap.getByRole("tab", { name: "התכנסויות זמן" }).click();
    await timeMap.getByText(/בחירת אנשים לבדה אינה מפעילה חיפוש/).waitFor();
    await timeMap.getByRole("tab", { name: "מרווחי לידה" }).click();
    await timeMap.getByText("ימים בדיוק", { exact: true }).waitFor();
    await openMap("creation");
    const birthStudio = page.locator('[data-experience-capability="life-journey-birth-map-studio"]');
    await birthStudio.getByRole("heading", { name: "סטודיו מפת החיים" }).waitFor();
    const activateThree = birthStudio.getByRole("button", { name: "הפעל תלת־ממד חי" });
    await activateThree.waitFor();
    await activateThree.click();
    await page.waitForTimeout(350);
    assert.ok(
      await birthStudio.locator('[data-experience-capability="life-journey-birth-map-3d"]').count()
        + await birthStudio.locator('[role="status"]').count() >= 1,
      "explicit 3D activation renders WebGL or an accessible capability fallback",
    );
    await birthStudio.getByRole("tab", { name: "משפחה" }).click();
    const spatialLegend = birthStudio.locator(".birth-map-spatial-details");
    await spatialLegend.getByRole("button", { name: /הורה בדיקה משפחה/ }).waitFor();
    await spatialLegend.getByRole("button", { name: /ילד בדיקה/ }).click();
    assert.equal(await spatialLegend.locator('button[data-focused="true"]').count(), 1);
    await birthStudio.getByRole("tab", { name: "התכנסויות" }).click();
    await spatialLegend.getByText(/עדיין אין התכנסות מנורמלת/).waitFor();
    await birthStudio.getByRole("tab", { name: "המפה האישית" }).click();
    await birthStudio.getByRole("heading", { name: "המפה האישית · Human Design" }).waitFor();
    await birthStudio.getByLabel("עבור מי לחשב?").selectOption(firstRef);
    assert.equal(await birthStudio.locator('[data-result="human-design"]').count(), 0, "birth calculations never run on tab open");
    const temporaryBirthdate = birthStudio.getByLabel(/תאריך לידה לבדיקה/);
    const temporaryBirthtime = birthStudio.getByLabel(/שעת לידה לבדיקה/);
    assert.equal(await temporaryBirthdate.inputValue(), "1990-02-15");
    assert.equal(await temporaryBirthtime.inputValue(), "05:30");
    await temporaryBirthtime.fill("");
    assert.equal(await birthStudio.getByRole("button", { name: "חשב מפה מקומית" }).isDisabled(), true, "a missing exact time stays explicit");
    await temporaryBirthtime.fill("05:30");
    await birthStudio.getByLabel("עיר לידה לחיפוש מקומי").fill("ירושלים");
    await birthStudio.getByRole("option", { name: /ירושלים/ }).click();
    await birthStudio.getByText("ירושלים · ישראל", { exact: true }).waitFor();
    assert.equal(await birthStudio.getByLabel("אזור זמן בלידה").inputValue(), "Asia/Jerusalem");
    assert.equal(await birthStudio.getByLabel(/קו רוחב/).inputValue(), "31.76904");
    assert.equal(await birthStudio.getByLabel(/קו אורך/).inputValue(), "35.21633");
    const birthCalculationRequestIndex = requestUrls.length;
    await birthStudio.getByRole("button", { name: "חשב מפה מקומית" }).click();
    const humanDesignResult = birthStudio.locator('[data-result="human-design"]');
    await humanDesignResult.waitFor();
    await humanDesignResult.getByText("הקריאה שלך לפי השיטה", { exact: true }).waitFor();
    await humanDesignResult.getByText("דרך פעולה · מבנה החיבור", { exact: true }).waitFor();
    const bodyGraph = humanDesignResult.locator('[data-chart="human-design"]');
    assert.equal(await bodyGraph.locator("polygon").count(), 9);
    assert.equal(await bodyGraph.locator(".birth-chart__channel").count(), 36);
    await bodyGraph.getByRole("button", { name: /מרכז שורש/ }).click();
    await bodyGraph.locator(".birth-chart__detail h6").filter({ hasText: "שורש" }).waitFor();
    const rootCenter = bodyGraph.getByRole("button", { name: /מרכז ראש ·/ });
    await rootCenter.focus();
    await page.keyboard.press("Enter");
    assert.equal(await rootCenter.getAttribute("aria-pressed"), "true");
    const channelButtons = bodyGraph.getByLabel("ערוצים לחיצים").getByRole("button");
    if (await channelButtons.count()) {
      await channelButtons.first().click();
      await bodyGraph.locator(".birth-chart__detail h6").filter({ hasText: "ערוץ" }).waitFor();
      assert.equal(await bodyGraph.locator('.birth-chart__channel[data-selected="true"]').count(), 1);
    }
    await birthStudio.getByText(/natalengine 1\.6\.0/).waitFor();
    await birthStudio.getByRole("tab", { name: "מפת שמיים" }).click();
    const skyResult = birthStudio.locator('[data-result="sky-map"]');
    await skyResult.waitFor();
    const skyChart = skyResult.locator('[data-chart="sky"]');
    assert.equal(await skyChart.locator(".birth-chart__sign").count(), 12);
    assert.equal(await skyChart.locator(".birth-chart__position").count(), 12);
    await skyChart.getByRole("button", { name: "2 ירח", exact: true }).click();
    await skyChart.locator(".birth-chart__detail h6").filter({ hasText: "ירח" }).waitFor();
    await skyResult.getByText("כל מיקומי גרמי השמיים", { exact: true }).click();
    assert.equal(await skyResult.locator(".birth-map-sky-wheel article").count(), 12);
    await skyResult.getByText("אופק עולה", { exact: true }).waitFor();
    await skyResult.getByText("היבטים מרכזיים", { exact: true }).waitFor();
    for (const theme of ["light", "parchment", "dark"]) {
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(value => window.__setLifeJourneyTheme(value), theme);
        await page.waitForFunction(value => document.querySelector("[data-fixture-theme]")?.dataset.fixtureTheme === value, theme);
        const birthLayout = await birthStudio.evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
        assert.ok(birthLayout.scrollWidth <= birthLayout.clientWidth + 1, `birth studio ${theme} ${width}px must not overflow`);
        assert.equal(await skyResult.isVisible(), true, `sky result remains visible in ${theme} at ${width}px`);
        for (const lens of ["מפת שמיים", "המפה האישית"]) {
          await birthStudio.getByRole("tab", { name: lens, exact: true }).click();
          const chart = birthStudio.locator(".birth-chart");
          const metrics = await chart.evaluate(element => ({
            overflow: element.scrollWidth > element.clientWidth + 1,
            bodySize: parseFloat(getComputedStyle(element.querySelector(".birth-chart__reading p")).fontSize),
            smallTargets: [...element.querySelectorAll("button")].filter(button => button.getBoundingClientRect().width < 43.5 || button.getBoundingClientRect().height < 43.5).length,
          }));
          assert.equal(metrics.overflow, false, `${lens} ${theme} ${width}px chart fits`);
          assert.ok(metrics.bodySize >= 18, `${lens} uses readable body text`);
          assert.equal(metrics.smallTargets, 0, `${lens} has 44px touch targets`);
          if (process.env.LIFE_JOURNEY_CHART_SCREENSHOT_DIR) {
            mkdirSync(process.env.LIFE_JOURNEY_CHART_SCREENSHOT_DIR, { recursive: true });
            await chart.screenshot({ path: `${process.env.LIFE_JOURNEY_CHART_SCREENSHOT_DIR}/${lens === "המפה האישית" ? "human" : "sky"}-${theme}-${width}.png` });
          }
        }
        await birthStudio.getByRole("tab", { name: "מפת שמיים", exact: true }).click();
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await skyChart.getByRole("button", { name: "1 שמש", exact: true }).focus();
    assert.equal(await skyChart.getByRole("button", { name: "1 שמש", exact: true }).evaluate(element => getComputedStyle(element).transitionDuration), "0s");
    await page.keyboard.press("Enter");
    await skyChart.locator(".birth-chart__detail h6").filter({ hasText: "שמש" }).waitFor();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const calculationRequests = requestUrls.slice(birthCalculationRequestIndex).map(url => decodeURIComponent(url)).join("\n");
    const calculationBodies = requestBodies.join("\n");
    for (const privateValue of ["1990-02-15", "05:30", "Asia/Jerusalem", "31.76904", "35.21633", "ירושלים", "הורה בדיקה", "עיר בדיקה"]) {
      assert.equal(calculationRequests.includes(privateValue), false, `local calculation keeps ${privateValue} out of request URLs`);
      assert.equal(calculationBodies.includes(privateValue), false, `local calculation keeps ${privateValue} out of request bodies`);
    }
    const pictureNavigationCalls = await page.evaluate(() => [window.__matrixCalls.length, window.__reflectionCalls.length, window.__nameCalls.length, window.__dateCalls.length, window.__elsCalls.length]);
    await birthStudio.getByRole("button", { name: "חזרה לתמונה שלי", exact: true }).click();
    const picturePerson = picture.getByLabel("של מי להציג את התמונה?");
    await picture.getByRole("button", { name: "פתח את המפה האישית", exact: true }).waitFor();
    await picturePerson.selectOption({ label: "ילד בדיקה" });
    const pictureChildRef = await picturePerson.inputValue();
    await picture.getByRole("button", { name: "לתאריך ולמילים", exact: true }).click();
    assert.equal(await timeMap.getByRole("button", { name: /ילד בדיקה/ }).getAttribute("data-active"), "true", "the date link opens the focused person's date");
    await openMap("summary");
    await picture.getByRole("button", { name: "הכן את המפה האישית", exact: true }).click();
    assert.equal(await birthStudio.getByLabel("עבור מי לחשב?").inputValue(), pictureChildRef);
    assert.equal(await birthStudio.locator('[data-result="human-design"]').count(), 0, "a child does not inherit the owner's computed chart");
    await birthStudio.getByRole("button", { name: "חזרה לתמונה שלי", exact: true }).click();
    assert.equal(await picturePerson.inputValue(), pictureChildRef, "return to the picture keeps the focused person");
    await picturePerson.selectOption(firstRef);
    await picture.getByRole("button", { name: "פתח את מפת השמיים", exact: true }).click();
    await skyResult.waitFor();
    assert.equal(await birthStudio.getByLabel("עבור מי לחשב?").inputValue(), firstRef);
    await birthStudio.getByRole("button", { name: "חזרה לתמונה שלי", exact: true }).click();
    assert.deepEqual(await page.evaluate(() => [window.__matrixCalls.length, window.__reflectionCalls.length, window.__nameCalls.length, window.__dateCalls.length, window.__elsCalls.length]), pictureNavigationCalls, "picture and exact chart reopening never start a research action");
    await openMap("creation");
    await birthStudio.getByRole("tab", { name: "ספר יצירה" }).click();
    const creationMap = page.locator('[data-experience-capability="life-journey-sefer-yetzirah-map"]');
    await creationMap.getByRole("heading", { name: "מפת האותיות והמערכות" }).waitFor();
    assert.equal(await creationMap.locator(".person-journey-creation-people>article").count(), 2);
    await creationMap.getByText("7 כוכבים · 7 ימים · 7 שערים", { exact: true }).waitFor();
    await creationMap.getByText("שבתאי", { exact: true }).waitFor();
    await creationMap.getByText("מקום לידה · עיר בדיקה", { exact: true }).waitFor();
    await creationMap.getByText("הקשר בין הקבוצות מאומת במקור; התאמה אישית לא חושבה.", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0, "select-all remains navigation context only");
    assert.equal(await page.evaluate(() => window.__nameCalls.some(call => call.kind === "name_lab" && call.name === "ילד בדיקה")), false, "family names are not researched by selection");
    assert.equal(await page.evaluate(() => window.__dateCalls.some(call => call.name === "ילד")), false, "family dates are not researched by selection");
    assert.equal(await page.evaluate(() => window.__reflectionCalls.length), 0, "the normalized message engine waits for the explicit research action");
    await family.getByRole("button", { name: "בנה מפת חיבורים ל־2 אנשים" }).click();
    await family.getByRole("heading", { name: "מפת החיבורים המשפחתית" }).waitFor();
    await openMap("matrix");
    assert.equal(await lifeMaps.locator("tbody tr").count(), 2, "one matrix row is shown per selected person");
    await openMap("generations");
    await lifeMaps.getByText("הורה של", { exact: true }).waitFor();
    await openMap("relationships");
    await lifeMaps.getByText(/הורה בדיקה משפחה · הורה של · ילד בדיקה/).waitFor();
    await openMap("convergences");
    await lifeMaps.getByText("73", { exact: true }).first().waitFor();
    await openMap("evidence");
    await lifeMaps.getByRole("heading", { name: "ראיה חישובית שנמצאה" }).waitFor();
    await lifeMaps.getByText("קבוצת שיטה עצמאית אחת", { exact: true }).waitFor();
    await openMap("sources");
    await lifeMaps.getByText("תהלים א׳, א׳", { exact: true }).first().waitFor();
    await openMap("coverage");
    assert.equal(await lifeMaps.locator(".person-journey-coverage-map article").count(), 2);
    await lifeMaps.getByText("זוגות עם חיבור", { exact: true }).first().waitFor();
    await openMap("summary");
    await lifeMaps.getByRole("heading", { name: "התמונה המשפחתית" }).waitFor();
    await lifeMaps.getByText("מסר בדיקה מבוסס ממצאים.", { exact: true }).waitFor();
    await picture.getByText("איך הורכבה התמונה?", { exact: true }).click();
    await lifeMaps.getByRole("heading", { name: "חבילת המחקר המאוחדת" }).waitFor();
    await picture.getByText("ELS · ממתין לחיבור · טרם נבדק", { exact: true }).waitFor();
    await picture.getByText("רמזים ואירועי חיים · רמזים שמורים · טרם נבדקו", { exact: true }).waitFor();
    await picture.getByText(/4 רמזים שמורים; 2 עם תאריך יום מפורש/).waitFor();
    await lifeMaps.getByText("Human Design · עדשת עזר פנימית", { exact: true }).waitFor();
    await lifeMaps.getByText("מפת שמיים · עדשת עזר פנימית", { exact: true }).waitFor();
    await lifeMaps.getByText(/במשקל ראיה אפס ואינם משנים אותו/).waitFor();
    await picture.getByText("איך הורכבה התמונה?", { exact: true }).click();
    for (const theme of ["light", "parchment", "dark"]) {
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(value => window.__setLifeJourneyTheme(value), theme);
        await page.waitForFunction(value => document.querySelector("[data-fixture-theme]")?.dataset.fixtureTheme === value, theme);
        await openMap("summary");
        const metrics = await picture.evaluate(element => ({
          overflow: element.scrollWidth > element.clientWidth + 1,
          bodySize: parseFloat(getComputedStyle(element.querySelector("header p")).fontSize),
          smallTargets: [...element.querySelectorAll("button")].filter(button => button.getBoundingClientRect().width < 43.5 || button.getBoundingClientRect().height < 43.5).length,
        }));
        assert.equal(metrics.overflow, false, `personal picture fits ${theme} ${width}px`);
        assert.ok(metrics.bodySize >= 18);
        assert.equal(metrics.smallTargets, 0);
        const resumeMetrics = await resumeControls.evaluate(element => ({
          overflow: element.scrollWidth > element.clientWidth + 1,
          smallTargets: [...element.querySelectorAll("button")].filter(button => button.getBoundingClientRect().width < 43.5 || button.getBoundingClientRect().height < 43.5).length,
        }));
        assert.equal(resumeMetrics.overflow, false, `save/resume fits ${theme} ${width}px`);
        assert.equal(resumeMetrics.smallTargets, 0);
        await openMap("private-hints");
        const hintMetrics = await hintPanel.evaluate(element => ({
          overflow: element.scrollWidth > element.clientWidth + 1,
          smallTargets: [...element.querySelectorAll("button")].filter(button => button.getBoundingClientRect().width < 43.5 || button.getBoundingClientRect().height < 43.5).length,
        }));
        assert.equal(hintMetrics.overflow, false, `dated hints fit ${theme} ${width}px`);
        assert.equal(hintMetrics.smallTargets, 0);
        if (process.env.LIFE_JOURNEY_CHART_SCREENSHOT_DIR) await hintPanel.screenshot({ path: `${process.env.LIFE_JOURNEY_CHART_SCREENSHOT_DIR}/hints-${theme}-${width}.png` });
        if (process.env.LIFE_JOURNEY_CHART_SCREENSHOT_DIR) await resumeControls.screenshot({ path: `${process.env.LIFE_JOURNEY_CHART_SCREENSHOT_DIR}/resume-${theme}-${width}.png` });
        if (process.env.LIFE_JOURNEY_CHART_SCREENSHOT_DIR) await picture.screenshot({ path: `${process.env.LIFE_JOURNEY_CHART_SCREENSHOT_DIR}/picture-${theme}-${width}.png` });
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await openMap("creation");
    await birthStudio.getByRole("tab", { name: "תלת־ממד" }).click();
    await birthStudio.getByRole("tab", { name: "התכנסויות" }).click();
    await birthStudio.locator(".birth-map-spatial-details.is-convergences article").first().waitFor();
    await birthStudio.locator(".birth-map-spatial-details.is-convergences").getByText("73", { exact: true }).first().waitFor();
    await openMap("time");
    await timeMap.getByRole("tab", { name: "התכנסויות זמן" }).click();
    await timeMap.locator(".life-time-convergences").getByText("73", { exact: true }).first().waitFor();
    await timeMap.getByText(/ביטויי תאריך בלבד/).first().waitFor();
    await openMap("guide");
    await guidedFlow.getByLabel("8 מתוך 10 תחנות הושלמו").waitFor();
    await guidedFlow.getByRole("button", { name: "המשך ל־הרמזים הפרטיים שלי" }).waitFor();
    await openMap("guide");
    await lifeMaps.getByText("רשימת התחנות המלאה", { exact: true }).click();
    await lifeMaps.locator(".person-journey-path-map").getByText("זהות", { exact: true }).waitFor();
    assert.equal(await lifeMaps.locator(".person-journey-path-map li").count(), 10);
    await family.getByText("פתח פירוט מלא של הממצאים והמקורות", { exact: true }).click();
    assert.equal(await family.locator('.person-journey-relation-list article').count(), 1, "two selected people produce one normalized cross-person pair");
    await family.locator('.person-journey-family-shared[data-kind="cross-expression"]', { hasText: "2 אנשים" }).waitFor();
    await family.locator('.person-journey-family-shared[data-kind="shared-expression"]', { hasText: "לא התכנסות עצמאית" }).waitFor();
    assert.equal(await family.locator(".person-journey-family-member", { hasText: "ילד בדיקה" }).count(), 1, "each person has one canonical row on the main family surface");
    assert.equal(await page.evaluate(() => window.__matrixCalls.some(call => call.kind === "name-methods" && call.args.phrase === "ילד בדיקה")), true, "explicit family research includes the selected child through the canonical method profile");
    assert.equal(await page.evaluate(() => window.__matrixCalls.some(call => call.kind === "name-methods" && call.args.phrase === "י״א")), true, "family matrix converts the Hebrew day into a canonical method profile");
    assert.equal(await page.evaluate(() => window.__matrixCalls.some(call => call.kind === "name-methods" && call.args.phrase === "בתשרי")), true, "family matrix converts the Hebrew month into a canonical method profile");
    assert.equal(await page.evaluate(() => window.__nameCalls.filter(call => call.kind === "name_lab").length), 2, "the explicit family action reads the existing bounded non-ELS name source once per selected person");
    assert.equal(await page.evaluate(() => window.__nameCalls.filter(call => call.kind === "name_lab").every(call => call.options.skip_els === "1")), true, "every name source read carries the non-ELS contract");
    await family.getByRole("heading", { name: "מילים וביטויים סביב המספרים" }).waitFor();
    await family.getByText("פסוק לשם", { exact: true }).first().waitFor();
    await family.getByText("תהלים א׳, א׳", { exact: true }).first().waitFor();
    assert.equal(await page.evaluate(() => window.__sourceCalls.length > 0), true, "canonical number lookup supplies equal-value phrases");
    assert.equal(await page.evaluate(() => window.__dateCalls.some(call => call.name === "ילד")), true, "explicit family research includes the selected date");
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0, "explicit family research still excludes ELS");
    const normalizedFamilyAnalysis = family.locator('[data-experience-capability="life-journey-family-normalized-analysis"]');
    assert.equal(await normalizedFamilyAnalysis.isVisible(), false, "the duplicate standalone summary is folded by default");
    await family.getByText("פירוט הסיכום המשפחתי", { exact: true }).click();
    await normalizedFamilyAnalysis.getByRole("heading", { name: "התמונה המשפחתית" }).waitFor();
    await normalizedFamilyAnalysis.getByText("מסר בדיקה מבוסס ממצאים.", { exact: true }).waitFor();
    const familyAnalysisCalls = await page.evaluate(() => window.__reflectionCalls);
    assert.deepEqual(familyAnalysisCalls.map(call => call.kind), ["ai", "tarot"]);
    assert.equal(familyAnalysisCalls[0].args.persistAnalysis, false, "private family analysis is never copied to AI style telemetry");
    assert.equal(familyAnalysisCalls[0].args.surface, "research:life-journey-family-analysis");
    assert.equal(familyAnalysisCalls[0].args.facts.includes("ילד בדיקה"), false, "family names are removed before interpretation");
    assert.equal(familyAnalysisCalls[0].args.facts.includes("person:"), false, "person refs are removed before interpretation");
    assert.match(familyAnalysisCalls[0].args.facts, /ביטויי שם ותאריך שנבדקו: 16/);
    assert.deepEqual(familyAnalysisCalls[1].args, { p_cards: 3 });
    assert.equal(await normalizedFamilyAnalysis.locator(".person-journey-reflection-cards").count(), 0, "internal cards are not rendered");
    assert.equal(await normalizedFamilyAnalysis.getByText("הקוסם", { exact: true }).count(), 0, "card identities remain internal");
    await page.reload();
    await family.getByRole("heading", { name: "מפת החיבורים המשפחתית" }).waitFor();
    assert.equal(await mapCurrent("guide"), "true", "refresh restores the open map");
    await openMap("summary");
    await picture.getByRole("button", { name: "הכן את המפה האישית", exact: true }).waitFor();
    await family.getByText("פירוט הסיכום המשפחתי", { exact: true }).click();
    await normalizedFamilyAnalysis.getByRole("heading", { name: "התמונה המשפחתית" }).waitFor();
    assert.deepEqual(await page.evaluate(() => ({
      matrix: window.__matrixCalls.length,
      reflection: window.__reflectionCalls.length,
      sources: window.__sourceCalls.length,
      names: window.__nameCalls.length,
      els: window.__elsCalls.length,
    })), { matrix: 0, reflection: 0, sources: 0, names: 0, els: 0 }, "refresh restores the private family snapshot without automatically researching names, sources or ELS again");

    // The transport is a synthetic backend; production save/resume adapters are real.
    await openMap("summary");
    await picture.getByLabel("של מי להציג את התמונה?").selectOption({ label: "ילד בדיקה" });
    await picture.getByRole("button", { name: "לתאריך ולמילים", exact: true }).click();
    await page.evaluate(() => { window.__nextPathResponse = "failure"; });
    await resumeControls.getByRole("button", { name: "שמור נקודת המשך", exact: true }).click();
    await resumeControls.getByRole("alert").filter({ hasText: "נקודת ההמשך לא נשמרה לחשבון" }).waitFor();
    assert.equal(await resumeControls.locator('[data-save-state="success"]').count(), 0);
    await page.evaluate(() => { window.__nextPathResponse = "incomplete"; });
    await resumeControls.getByRole("button", { name: "שמור נקודת המשך", exact: true }).click();
    await resumeControls.getByRole("alert").filter({ hasText: "נקודת ההמשך לא אושרה" }).waitFor();
    assert.equal(await resumeControls.locator('[data-save-state="success"]').count(), 0, "an incomplete ok:true response never claims saved");
    await resumeControls.getByRole("button", { name: "שמור נקודת המשך", exact: true }).click();
    await resumeControls.getByRole("status").filter({ hasText: "נקודת ההמשך נשמרה לחשבון" }).waitFor();
    await resumeControls.getByRole("button", { name: "המשך מהמסע השמור", exact: true }).waitFor();
    const savedPath = await page.evaluate(() => JSON.parse(localStorage.getItem("life-journey-path-backend-fixture:owner")));
    assert.equal(savedPath.representation.context.dimensions.lifeJourneyMapTab, "time");
    assert.equal(savedPath.representation.context.dimensions.lifeJourneyMapMemberRef, pictureChildRef);
    assert.equal(typeof savedPath.representation.context.dimensions.lifeJourneyFamilyResearchSnapshot, "string", "saved Path retains the existing family findings snapshot");
    assert.equal(savedPath.revision_no, 1, "failed/incomplete responses did not create a saved revision");
    for (const privateValue of ["הורה בדיקה", "ילד בדיקה", "1990-02-15", "05:30", "עיר בדיקה", "Asia/Jerusalem", "31.76904", "35.21633"]) {
      assert.equal(JSON.stringify(savedPath).includes(privateValue), false, `saved Path excludes private input ${privateValue}`);
    }
    await openMap("sources");
    await resumeControls.getByRole("button", { name: "שמור נקודת המשך", exact: true }).click();
    await resumeControls.getByRole("status").filter({ hasText: "נקודת ההמשך נשמרה לחשבון" }).waitFor();
    const updatedPath = await page.evaluate(() => JSON.parse(localStorage.getItem("life-journey-path-backend-fixture:owner")));
    assert.equal(updatedPath.revision_no, 2, "an explicit second checkpoint saves the changed representation");
    assert.equal(updatedPath.representation.context.dimensions.lifeJourneyMapTab, "sources");
    await openMap("time");
    await resumeControls.getByRole("button", { name: "שמור נקודת המשך", exact: true }).click();
    await resumeControls.getByRole("status").filter({ hasText: "נקודת ההמשך נשמרה לחשבון" }).waitFor();
    // Simulate a new session without the existing Context; only the owned backend Path remains.
    await page.evaluate(() => sessionStorage.removeItem("life-journey-context-fixture:owner"));
    await page.reload();
    await page.getByRole("heading", { name: "מי אני", exact: true }).waitFor();
    await resumeControls.getByRole("button", { name: "המשך מהמסע השמור", exact: true }).click();
    await timeMap.getByRole("button", { name: /ילד בדיקה/ }).waitFor();
    assert.equal(await timeMap.getByRole("button", { name: /ילד בדיקה/ }).getAttribute("data-active"), "true");
    assert.equal(await mapCurrent("time"), "true");
    assert.equal(await page.evaluate(() => typeof window.__lifeJourneyContext?.dimensions?.lifeJourneyFamilyResearchSnapshot), "string", "resume retains the existing family findings snapshot");
    assert.deepEqual(await page.evaluate(() => [window.__matrixCalls.length, window.__reflectionCalls.length, window.__sourceCalls.length, window.__nameCalls.length, window.__elsCalls.length]), [0,0,0,0,0], "explicit resume restores references and findings without restarting research");
    await family.getByText("פירוט הסיכום המשפחתי", { exact: true }).click();
    await family.getByText("פתח פירוט מלא של הממצאים והמקורות", { exact: true }).click();
    await family.getByRole("button", { name: "פתח את ממצא 73 של ילד בדיקה" }).click();
    await page.getByRole("heading", { name: "דף המספר 73" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/2029/number/73");
    assert.equal(decodeURIComponent(page.url()).includes("ילד בדיקה"), false, "private family name never enters the Finding URL");
    const findingContext = await page.evaluate(() => window.__lifeJourneyContext);
    assert.match(findingContext.selection.findingId, /^life-journey-finding:[a-z0-9]+$/);
    assert.equal(findingContext.selection.focusKind, "life_journey_date_cross");
    assert.equal(findingContext.returnTo.subject.id, firstRef);
    assert.equal(findingContext.dimensions.journey2029Kind, "person_life");
    assert.equal(findingContext.journey.pendingSteps.at(-1).selection.findingId, findingContext.selection.findingId);
    await page.getByRole("button", { name: "חזרה מדויקת למסע החיים" }).click();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/2029/journey");
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.subject?.id), firstRef);
    assert.equal(await childSelection.isChecked(), true, "Finding exact return preserves the selected family scope");

    for (const theme of ["light", "parchment", "dark"]) {
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(value => window.__setLifeJourneyTheme(value), theme);
        await page.waitForFunction(value => document.querySelector("[data-fixture-theme]")?.dataset.fixtureTheme === value, theme);
        const layout = await page.evaluate(() => ({
          viewport: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          panel: (style => style.backgroundColor !== "rgba(0, 0, 0, 0)" ? style.backgroundColor : style.backgroundImage)(getComputedStyle(document.querySelector(".person-journey-panel"))),
          ink: getComputedStyle(document.querySelector(".person-journey")).color,
        }));
        assert.ok(layout.scrollWidth <= layout.viewport + 1, `${theme} ${width}px must not overflow`);
        assert.notEqual(layout.panel, "rgba(0, 0, 0, 0)");
        assert.notEqual(layout.panel, "none", "panel paints a real Design V2 surface");
        assert.notEqual(layout.ink, "rgba(0, 0, 0, 0)");
      }
    }

    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByRole("button", { name: "פתח את המחקר שלי" }).first().click();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await page.getByRole("button", { name: "המשך למטריצת השם והתאריך" }).click();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.getByRole("heading", { name: "מה המטריצה מראה עכשיו" }).waitFor();
    assert.equal(new URL(page.url()).search, "");
    assert.equal(await page.locator('[data-experience-capability="life-journey-normalized-message-reflection"]').count(), 0);
    assert.equal(await page.evaluate(() => window.__reflectionCalls.length), 0, "name and date views do not replay the restored family analysis");
    const matrixCallsBeforeThemes = await page.evaluate(() => window.__matrixCalls.length);
    for (const theme of ["light", "parchment", "dark"]) {
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(value => window.__setLifeJourneyTheme(value), theme);
        await page.waitForFunction(value => document.querySelector("[data-fixture-theme]")?.dataset.fixtureTheme === value, theme);
        const matrixLayout = await page.evaluate(() => {
          const surface = document.querySelector('[data-experience-capability="life-journey-name-date-matrix"]');
          const message = surface?.querySelector(".person-journey-research-message");
          return {
            viewport: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            surfaceWidth: surface?.getBoundingClientRect().width || 0,
            messageWidth: message?.getBoundingClientRect().width || 0,
            message: message?.textContent || "",
          };
        });
        assert.ok(matrixLayout.scrollWidth <= matrixLayout.viewport + 1, `matrix ${theme} ${width}px must not overflow`);
        assert.ok(matrixLayout.surfaceWidth > 0 && matrixLayout.messageWidth > 0, `matrix ${theme} ${width}px stays visible`);
        assert.match(matrixLayout.message, /החיבור הבולט כרגע/);
      }
    }
    assert.equal(await page.evaluate(() => window.__matrixCalls.length), matrixCallsBeforeThemes, "theme and viewport changes never rerun research");
    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByText("רשימות הגימטריה המלאות", { exact: true }).click();
    await page.getByRole("button", { name: "פתח רגיל 73 עבור שם פרטי" }).click();
    await page.getByRole("heading", { name: "דף המספר 73" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/2029/number/73");
    assert.equal(decodeURIComponent(page.url()).includes("הורה בדיקה"), false);
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.selection?.focusKind), "life_journey_gematria");
    assert.match(await page.evaluate(() => window.__lifeJourneyContext?.selection?.findingId), /^life-journey-finding:[a-z0-9]+$/);
    await page.getByRole("button", { name: "חזרה מדויקת למסע החיים" }).click();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    await page.getByRole("button", { name: "פתח את המחקר שלי" }).first().click();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await page.getByRole("button", { name: "המשך למטריצת השם והתאריך" }).click();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.getByRole("heading", { name: "מה המטריצה מראה עכשיו" }).waitFor();
    await page.locator(".person-journey-capability-summary").getByText("י״א בתשרי תשפ״ז", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneyView), "date");
    assert.equal(new URL(page.url()).search, "");
    await page.getByRole("button", { name: "סיים וחזור למסע החיים" }).click();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.subject?.id), firstRef);
    assert.equal(await childSelection.isChecked(), true, "exact return preserves the family selection");

    const childCard = family.locator(".person-journey-family-member", { hasText: "ילד בדיקה" });
    assert.equal(await page.evaluate(() => window.__nameCalls.some(call => call.kind === "name_lab" && call.name === "ילד בדיקה")), false, "refresh preserves selection but never replays family research automatically");
    const elsCallsBefore = await page.evaluate(() => window.__elsCalls.length);
    await childCard.getByRole("button", { name: "פתח מחקר שם", exact: true }).click();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await page.getByRole("button", { name: "המשך למטריצת השם והתאריך" }).click();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.getByRole("heading", { name: "מה המטריצה מראה עכשיו" }).waitFor();
    await page.locator(".person-journey-capability-summary").getByText("י״א בתשרי תשפ״ז", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__elsCalls.length), elsCallsBefore, "date research does not scan ELS");
    assert.equal(await page.getByText("תוכנית ELS אוטומטית").count(), 0, "ELS is parked outside the active Life Journey path");
    assert.equal(new URL(page.url()).search, "");
    await page.getByText("רשימות הגימטריה המלאות", { exact: true }).click();
    await page.getByRole("button", { name: "פתח רגיל 73 עבור שם פרטי" }).click();
    await page.getByRole("heading", { name: "דף המספר 73" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/2029/number/73");
    assert.match(await page.evaluate(() => window.__lifeJourneyContext?.selection?.findingId), /^life-journey-finding:[a-z0-9]+$/);
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.returnTo?.subject?.id), firstRef);
    await page.getByRole("button", { name: "חזרה מדויקת למסע החיים" }).click();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.subject?.id), firstRef);
    assert.equal(await childSelection.isChecked(), true, "child Finding exact return preserves the family selection");
    assert.equal(await page.evaluate(() => window.__elsCalls.length), 0);

    await family.getByText("חיבור חשבונות והזמנות", { exact: true }).click();
    const ownerClaimInput = accountContinuity.getByLabel("קוד הזמנה");
    await ownerClaimInput.fill(invitationToken);
    await accountContinuity.getByRole("button", { name: "אמת וחבר את הזהות" }).click();
    await accountContinuity.getByText(/אי אפשר לפדות הזמנה שנוצרה מהחשבון שלך/).waitFor();
    await childClaimCard.getByText("ממתין לחיבור").waitFor();

    await page.evaluate(() => localStorage.setItem("life-journey-account-fixture", "claimant"));
    await page.reload();
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    await hintPanel.getByText("אין כרגע רמזים שמורים ב־research_items / hint.", { exact: true }).waitFor();
    assert.equal(await hintPanel.getByText("רמז קיים", { exact: true }).count(), 0, "another account never inherits the owner's hint projection");
    assert.deepEqual(await page.evaluate(() => window.__hintReads.map(call => call.user.id)), ["fixture-claimant"]);
    await page.getByText("חיבור חשבונות והזמנות", { exact: true }).click();
    const claimantContinuity = page.locator('[data-experience-capability="life-journey-account-continuity"]');
    await claimantContinuity.getByLabel("קוד הזמנה").fill(invitationToken);
    await claimantContinuity.getByRole("button", { name: "אמת וחבר את הזהות" }).click();
    await claimantContinuity.getByText("הזהות אומתה. לא הועבר מחקר פרטי ולא ניתנה גישה ל־Ledger של חשבון אחר.").waitFor();
    assert.equal(new URL(page.url()).search, "");
    assert.equal(await page.evaluate(token => Object.values(localStorage).some(value => String(value).includes(token)), invitationToken), false, "claimant storage never receives the raw invitation token");

    await page.evaluate(() => localStorage.setItem("life-journey-account-fixture", "owner"));
    await page.reload();
    await page.getByRole("button", { name: "עדכן וחבר מחדש" }).waitFor();
    await page.getByText("חיבור חשבונות והזמנות", { exact: true }).click();
    const ownerContinuity = page.locator('[data-experience-capability="life-journey-account-continuity"]');
    await ownerContinuity.locator("article", { hasText: "ילד בדיקה" }).getByText("זהות אומתה").waitFor();
    await ownerContinuity.locator("article", { hasText: "ילד בדיקה" }).getByRole("button", { name: "נתק אימות חשבון" }).waitFor();
    await page.locator(".person-journey-family-member", { hasText: "ילד בדיקה" }).getByText(/זהות החשבון אומתה/).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.subject?.id), firstRef, "account-scoped Research Context returns only for the owner account");

    const privacy = await page.evaluate(() => ({
      telemetry: window.__telemetry,
      ledger: JSON.parse(localStorage.getItem("life-journey-ledger-fixture:owner")),
      hintReads: window.__hintReads,
      storageValues: Object.values(localStorage),
      context: window.__lifeJourneyContext,
      contextStorage: Object.entries(sessionStorage).filter(([key]) => key.startsWith("life-journey-context-fixture:")),
    }));
    assert.equal(JSON.stringify(privacy.telemetry).includes("הורה בדיקה"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("ילד בדיקה"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("עיר בדיקה"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("יישוב בדיקה"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("יישוב מעודכן"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("05:30"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("14:45"), false);
    assert.equal(JSON.stringify(privacy.telemetry).includes("child@example.test"), false);
    assert.equal(privacy.ledger.members.length, 2);
    assert.equal(privacy.ledger.relations.length, 1);
    assert.equal(privacy.ledger.members.find(member => member.source_ref.endsWith(":self"))?.meta?.birth_place, "עיר בדיקה");
    assert.equal(privacy.ledger.members.find(member => member.source_ref.endsWith(":self"))?.meta?.birth_time_local, "05:30");
    assert.equal(privacy.ledger.members.find(member => member.source_ref.endsWith(":self"))?.meta?.profile_source, "account_owner_entered");
    assert.equal(privacy.ledger.members.find(member => member.source_ref.includes(":p:"))?.meta?.birth_place, "יישוב מעודכן");
    assert.equal(privacy.ledger.members.find(member => member.source_ref.includes(":p:"))?.meta?.birth_time_local, "14:45");
    assert.equal(privacy.ledger.members.find(member => member.source_ref.includes(":p:"))?.meta?.profile_source, "journey_owner_entered");
    assert.ok(privacy.hintReads.every(call => call.options?.fallbackLocal === false));
    assert.equal(privacy.storageValues.some(value => String(value).includes(invitationToken)), false);
    for (const privateValue of ["הורה בדיקה", "ילד בדיקה", "1990-02-15", "2020-03-04", "05:30", "14:45", "עיר בדיקה", "יישוב בדיקה", "יישוב מעודכן", "2024-02-29", "תוכן רמז פרטי"]) {
      assert.equal(JSON.stringify(privacy.context).includes(privateValue), false, `Research Context excludes ${privateValue}`);
      assert.equal(JSON.stringify(privacy.contextStorage).includes(privateValue), false, `stored Research Context excludes ${privateValue}`);
    }
    assert.equal(requestUrls.some(url => decodeURIComponent(url).includes("הורה בדיקה") || decodeURIComponent(url).includes("ילד בדיקה")), false);
    assert.equal(requestUrls.some(url => decodeURIComponent(url).includes("עיר בדיקה") || decodeURIComponent(url).includes("יישוב בדיקה")), false);
    assert.equal(requestUrls.some(url => /1990-02-15|2020-03-04|05%3A30|14%3A45/.test(url)), false);
    assert.equal(requestUrls.some(url => /Asia%2FJerusalem|31\.7683|35\.2137/.test(url)), false);
    assert.equal(requestBodies.some(body => /1990-02-15|05:30|Asia\/Jerusalem|31\.7683|35\.2137/.test(body)), false);
    assert.equal(requestUrls.some(url => decodeURIComponent(url).includes(invitationToken)), false);
    await page.evaluate(() => localStorage.setItem("life-journey-deny-hints-fixture", "1"));
    await page.reload();
    await openMap("private-hints");
    await hintPanel.getByText("הרמזים אינם זמינים כרגע.", { exact: true }).waitFor();
    assert.equal(await hintPanel.getByText("רמז קיים", { exact: true }).count(), 0);
    assert.equal(await hintPanel.getByText("אין כרגע רמזים שמורים ב־research_items / hint.", { exact: true }).count(), 0, "a denied read is not an empty result");
    await openMap("summary");
    await picture.getByText("איך הורכבה התמונה?", { exact: true }).click();
    await picture.getByText("רמזים ואירועי חיים · קריאת הרמזים לא הושלמה", { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => [window.__matrixCalls.length, window.__reflectionCalls.length, window.__elsCalls.length]), [0,0,0]);
    assert.deepEqual(browserErrors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
