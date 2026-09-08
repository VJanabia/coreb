// Extra visual checks: core is small (anchor), ready pin not clipped,
// and consecutive levels have visibly different initial layouts.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:4173";
const results = [];
const ok = (name, pass, extra = "") => {
  results.push({ name, pass });
  console.log((pass ? "PASS" : "FAIL") + " " + name + (extra ? " | " + extra : ""));
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on("pageerror", (e) => { if (!/profitableratecpm|pl31067534|invoke\.js|pagead2|adsbygoogle|net::|ERR_|localStorage|Access is denied/.test(e.message)) errs.push(e.message); });
await page.addInitScript(() => {
  localStorage.setItem("coreball.progress.v1", JSON.stringify({ unlocked: 10, sound: false }));
});
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.click("#btn-play");
await page.waitForTimeout(900);

async function shot() {
  await page.click("#coreball-canvas");
  await page.waitForTimeout(500);
}

async function canvasInfo() {
  return page.evaluate(() => {
    const c = document.getElementById("coreball-canvas");
    const ctx = c.getContext("2d");
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const W = c.width, H = c.height;
    const cx = W / 2, cy = H / 2;
    // core: solid dark blob at the center + background visible around it
    const darkAt = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      const i = ((Math.floor(y) * W + Math.floor(x)) * 4);
      const r = data[i], g = data[i + 1], b = data[i + 2];
      return r < 110 && g < 130 && b > 30 && b < 190 && b > g;
    };
    let darkInCenter = 0, centerSamples = 0;
    for (let y = Math.floor(cy) - 30; y <= Math.floor(cy) + 30; y += 3) {
      for (let x = Math.floor(cx) - 30; x <= Math.floor(cx) + 30; x += 3) {
        centerSamples++;
        if (darkAt(x, y)) darkInCenter++;
      }
    }
    // points at radius ~0.28*minDim should NOT be solid dark (core is small)
    let ringDark = 0, ringSamples = 0;
    const R0 = Math.min(W, H) * 0.28;
    for (let a = 0; a < 360; a += 15) {
      const x = Math.floor(cx + R0 * Math.cos(a * Math.PI / 180));
      const y = Math.floor(cy + R0 * Math.sin(a * Math.PI / 180));
      ringSamples++;
      if (darkAt(x, y)) ringDark++;
    }
    const coreSolid = darkInCenter / centerSamples;
    // ready pin: find lowest colored pixel in the center column strip
    let lowest = -1, coloredCount = 0;
    for (let y = 0; y < H; y++) {
      for (let x = Math.floor(cx) - 22; x <= Math.floor(cx) + 22; x += 2) {
        const i = (y * W + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx - mn > 40 && mx > 90) { coloredCount++; if (y > lowest) lowest = y; }
      }
    }
    // hash of the whole canvas for layout comparison
    let h1 = 0, h2 = 0;
    for (let i = 0; i < data.length; i += 16) {
      h1 = (h1 * 31 + data[i]) >>> 0;
      h2 = (h2 * 33 + data[i + 1]) >>> 0;
    }
    return { W, H, coreSolid, ringDarkRatio: ringDark / ringSamples, lowestReady: lowest, readyGap: H - 1 - lowest, readyColored: coloredCount, hash: h1 + "_" + h2 };
  });
}

const l1 = await canvasInfo();
ok("core is a small centered anchor", l1.coreSolid > 0.9 && l1.ringDarkRatio < 0.5, "centerDark=" + l1.coreSolid.toFixed(2) + " ringDark=" + l1.ringDarkRatio.toFixed(2));
ok("ready pin fully on-canvas (bottom margin)", l1.readyGap >= 2 && l1.lowestReady > -1, "gap=" + l1.readyGap + "px");
ok("ready pin has a colored head", l1.readyColored > 20, String(l1.readyColored));

// compare layouts across levels 1..10 (all unlocked)
const hashes = [];
for (let n = 1; n <= 10; n++) {
  await page.click("#btn-levels");
  await page.waitForTimeout(200);
  await page.click("#level-grid .level-btn:nth-child(" + n + ")");
  await page.waitForTimeout(700);
  const info = await canvasInfo();
  hashes.push(info.hash);
}
const unique = new Set(hashes).size;
ok("consecutive levels 1-10 have distinct layouts", unique >= 8, unique + "/10 unique");

// shots at level 10 should still collide eventually (collision sanity on high level)
await page.click("#btn-levels");
await page.waitForTimeout(200);
await page.click("#level-grid .level-btn:nth-child(10)");
await page.waitForTimeout(700);
const stateOf = () => page.evaluate(() => document.body.getAttribute("data-game-state") || "");
let failed = false;
for (let i = 0; i < 40 && !failed; i++) {
  await shot();
  failed = (await stateOf()) === "failed";
}
ok("collision triggers on L10 (game over)", failed);
if (failed) {
  await page.waitForTimeout(450); // tap lockout after a fail
  await page.click("#coreball-canvas");
  await page.waitForTimeout(500);
  ok("tap after collision restarts level", (await stateOf()) === "playing", await stateOf());
} else {
  ok("tap after collision restarts level", false, "no fail reached");
}
ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));

await browser.close();
const bad = results.filter((r) => !r.pass).length;
console.log("SUMMARY: " + (results.length - bad) + "/" + results.length + " passed");
process.exitCode = bad ? 1 : 0;
