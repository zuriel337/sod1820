import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { chromium = require("playwright").chromium; } catch { /* optional local browser dependency */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const available = Boolean(chromium && existsSync(executablePath));
const css = fileURLToPath(new URL("../src/components/experience2029/", import.meta.url));

test("ELS desktop tool dock follows the pinned matrix/findings split without moving mobile or unpinned mode", { skip: !available }, async () => {
  const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    for (const [width, direction, pinned] of [[1280, "rtl", true], [1100, "rtl", true], [1280, "ltr", true], [1280, "rtl", false], [390, "rtl", true]]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html dir="${direction}"><style>*{box-sizing:border-box}body{margin:0}</style><div class="sod29-root native-frame surface-els has-tool-dock"><div class="sod29-content wide"><div class="els29-native-classic"><div class="els29-native-layout has-system-dock ${pinned ? "is-panel-pinned" : ""}"><div class="els29-native-stage-column"><div class="els29-native-stage"></div></div><div class="els29-native-panel-wrap"><div class="els29-native-context-panel"></div></div></div></div></div><div class="sod29-command-island" data-command-mode="tool"><button>חיפוש</button><button>סריקה</button><button>תוצאות</button><button>שמירה</button></div></div></html>`);
      await page.addStyleTag({ path: `${css}/systemFrame2029.css` });
      await page.addStyleTag({ path: `${css}/elsNativeClassic2029.css` });
      const positions = await page.evaluate(() => {
        const dock = document.querySelector(".sod29-command-island").getBoundingClientRect();
        const stage = document.querySelector(".els29-native-stage-column").getBoundingClientRect();
        const panel = document.querySelector(".els29-native-panel-wrap").getBoundingClientRect();
        return { dockCenter: dock.left + dock.width / 2, split: document.dir === "rtl" ? stage.left : stage.right,
          panelWidth: panel.width, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      assert.equal(positions.overflow, false, `${width}px ${direction} must fit the viewport`);
      assert.ok(Math.abs(positions.dockCenter - (width <= 980 || !pinned ? width / 2 : positions.split)) < 20,
        `${width}px ${direction} pinned=${pinned}: dock center ${positions.dockCenter}, split ${positions.split}`);
    }
  } finally { await browser.close(); }
});
