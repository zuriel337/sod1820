import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const icons = read("src/components/experience2029/NavigationIcon2029.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const calculator = read("src/pages/Calculator2029Page.jsx");
const calculatorPro = read("src/pages/CalculatorPro2029Page.jsx");
const calculatorAi = read("src/components/gematria2029/CalculatorAiAnalysis2029.jsx");
const spatial = read("src/components/gematria2029/SpatialMethodStage2029.jsx");
const numberPage = read("src/pages/Number2029Page.jsx");
const numberCore = read("src/components/number2029/NumberCore2029.jsx");
const numberAi = read("src/components/number2029/NumberAiAnalysis2029.jsx");
const numberDeep = read("src/components/number2029/NumberDeepView2029.jsx");
const numberProjection = read("src/lib/research/numberCoreProjection.js");

test("calculator and Number page have distinct canonical identities", () => {
  assert.match(icons, /calculator:\s*<>/);
  assert.match(icons, /\["calculator","מחשבון גימטריה"/);
  assert.match(frame, /label: "מחשבון גימטריה", icon: "calculator"/);
  assert.match(frame, /label: "דף המספר", icon: "number"/);
  assert.match(frame, /calculator: "calculator"/);
  assert.match(calculator, /surface="number"/);
  assert.match(calculator, /introVariant="compact"/);
  assert.match(calculator, /symbol=\{<NavigationIcon2029 name="calculator"/);
  assert.match(calculatorPro, /surface="number"/);
  assert.match(calculatorPro, /symbol=\{<NavigationIcon2029 name="calculator"/);
  assert.match(numberPage, /surface="number"/);
  assert.match(numberPage, /symbol=\{<NavigationIcon2029 name="number"/);
});

test("calculator actions use the canonical semantic family", () => {
  for (const name of ["calculator", "number", "layers", "raziel", "tools", "study", "heichal", "combinations", "discovery"]) {
    assert.ok(calculator.includes(`name="${name}"`), `Calculator is missing ${name}`);
  }
  for (const name of ["number", "discovery", "study", "heichal", "raziel", "calculator"]) {
    assert.ok(calculatorPro.includes(`name="${name}"`), `Professional calculator is missing ${name}`);
  }
  assert.match(calculatorAi, /name="scan"/);
  assert.doesNotMatch(calculator + calculatorPro + calculatorAi, /[✦◈◇✨🗺⚖🧮🔢]/u);
  assert.doesNotMatch(spatial, /name="spark"[^\n]*רזיאל/);
  assert.match(spatial, /name="raziel"[^\n]*רזיאל/);
});

test("Number actions and layer metadata no longer carry legacy glyphs", () => {
  for (const name of ["search", "check", "raziel", "scan", "heichal", "journey", "world", "combinations", "layers"]) {
    assert.ok(numberCore.includes(`name="${name}"`), `Number core is missing ${name}`);
  }
  assert.match(numberAi, /name="scan"/);
  assert.match(numberDeep, /name="heichal"/);
  assert.match(numberDeep, /name="raziel"/);
  assert.doesNotMatch(numberCore + numberAi + numberDeep, /[✦◈◇✨🗺⚖🧮🔢]/u);

  const expectedLayers = {
    methods: "calculator",
    crossings: "combinations",
    meetings: "graph",
    relations: "dna",
    worlds: "world",
    sources: "books",
    findings: "research",
    els: "els",
    time: "now",
    media: "gallery",
    community: "community",
    journey: "journey",
  };
  for (const [key, icon] of Object.entries(expectedLayers)) {
    assert.match(numberProjection, new RegExp(`key: "${key}"[^\\n]+icon: "${icon}"`));
  }
});
