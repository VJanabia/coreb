// Browser smoke test for the CoreBall game (production build).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

mkdirSync(resolve(dirname(fileURLToPath(import.meta.url)), "screenshots"), { recursive: true });

const BASE = process.env.BASE_URL || "http://localhost:4173";
// ignore ad-network / resource noise so the test focuses on the game itself
const isAdNoise = (t) => /pagead2|adsbygoogle|Failed to load resource|net::|ERR_|localStorage|Access is denied/.test(t || "");
const results = [];
const ok = (name, pass, extra = "") => {
  results.push({ name, pass, extra });
  console.log((pass ? "PASS" : "FAIL") + " " + name + (extra ? " | " + extra : ""));
};

async function canvasPixels(page) {
  return page.evaluate(() => {
    const c = document.getElementById("coreball-canvas");
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(c.clientWidth), h = Math.floor(c.clientHeight);
    const data = ctx.getImageData(0, 0, Math.floor(w * dpr), Math.floor(h * dpr)).data;
    return { w: Math.floor(w * dpr), h: Math.floor(h * dpr), data: Array.from(data) };
  });
}

function regionStats(px, x0, y0, x1, y1) {
  const X0 = Math.floor(x0), Y0 = Math.floor(y0), X1 = Math.floor(x1), Y1 = Math.floor(y1);
  let nonWhite = 0, colored = 0, total = 0;
  const samples = [];
  for (let y = Y0; y < Y1; y += 2) {
    for (let x = X0; x < X1; x += 2) {
      const i = (y * px.w + x) * 4;
      const r = px.data[i], g = px.data[i + 1], b = px.data[i + 2];
      total++;
      if (r < 245 || g < 245 || b < 245) nonWhite++;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn > 40 && mx > 90) { colored++; if (samples.length < 3) samples.push([x, y, r, g, b]); }
    }
  }
  return { nonWhite, colored, total, sample: samples };
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function attachErrorLog(p) {
  const errs = [];
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  return errs;
}

// ---- Page A: default progress (Level 1) ----
const errsA = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", (m) => { if (m.type() === "error" && !isAdNoise(m.text())) errsA.push(m.text()); });
page.on("pageerror", (e) => { if (!isAdNoise(e.message)) errsA.push("pageerror: " + e.message); });

await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
ok("home loads", (await page.title()).includes("Coreball"), await page.title());
ok("play button visible", await page.locator("#btn-play").isVisible());

await page.click("#btn-play");
await page.waitForTimeout(1200);
ok("overlay hidden after play", await page.locator("#game-overlay").evaluate((el) => el.classList.contains("overlay-hidden")));

const hudLevel = await page.textContent("#hud-level");
const hudBalls = await page.textContent("#hud-balls");
ok("HUD level", /Level 1 \/ 500/.test(hudLevel || ""), hudLevel);
ok("HUD pins", /Pins: 6/.test(hudBalls || ""), hudBalls);

let px = await canvasPixels(page);
const cx = Math.floor(px.w / 2), cy = Math.floor(px.h / 2);
const core = regionStats(px, cx - 12, cy - 12, cx + 12, cy + 12);
ok("core visible (dark center)", core.nonWhite / core.total > 0.8, "darkRatio=" + (core.nonWhite / core.total).toFixed(2));

const minDim = Math.min(px.w, px.h);
const band = regionStats(px, cx - minDim * 0.4, cy - minDim * 0.4, cx + minDim * 0.4, cy + minDim * 0.4);
ok("pin heads rendered (colored pixels)", band.colored > 40, "colored=" + band.colored);

const readyRegion = regionStats(px, cx - 24, px.h - 46, cx + 24, px.h - 4);
ok("ready pin visible", readyRegion.colored > 0, JSON.stringify(readyRegion.sample));

const before = await page.textContent("#hud-balls");
await page.click("#coreball-canvas");
await page.waitForTimeout(700);
const after = await page.textContent("#hud-balls");
ok("shot fired and attached (Pins decreased)", before !== after, before + " -> " + after);
ok("progress bar grew", (await page.locator("#progress-fill").evaluate((el) => el.style.width)) !== "0%");

px = await canvasPixels(page);
ok("ready pin re-appears for next shot", regionStats(px, cx - 24, px.h - 46, cx + 24, px.h - 4).colored > 0);

await page.click("#btn-levels");
await page.waitForTimeout(300);
ok("level modal opens", await page.locator("#level-modal").evaluate((el) => el.open));
ok("level grid has 500 buttons", (await page.locator("#level-grid .level-btn").count()) === 500);
ok("locked levels present", (await page.locator(".level-btn-locked").count()) === 499);
await page.click("#level-close");

await page.click("#btn-restart");
await page.waitForTimeout(600);
ok("restart resets pins", /Pins: 6/.test((await page.textContent("#hud-balls")) || ""), await page.textContent("#hud-balls"));

await page.click("#btn-pause");
await page.waitForTimeout(200);
ok("pause overlay shows", await page.locator("#overlay-paused").isVisible());
await page.click("#btn-resume");
await page.waitForTimeout(200);
ok("resume hides overlay", await page.locator("#game-overlay").evaluate((el) => el.classList.contains("overlay-hidden")));

await page.keyboard.press("Space");
await page.waitForTimeout(700);
ok("Space key fires", !/Pins: 6/.test((await page.textContent("#hud-balls")) || ""));
await page.screenshot({ path: "scripts/screenshots/en-desktop-l1.png" });
ok("no console errors (desktop L1)", errsA.length === 0, errsA.slice(0, 3).join(" | "));
await page.close();

// ---- Page B: unlocked=10, layout differences + game over ----
const errsB = [];
const pageB = await browser.newPage({ viewport: { width: 1280, height: 800 } });
pageB.on("pageerror", (e) => { if (!isAdNoise(e.message)) errsB.push(e.message); });
await pageB.addInitScript(() => {
  localStorage.setItem("coreball.progress.v1", JSON.stringify({ unlocked: 10, sound: false }));
});
await pageB.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await pageB.click("#btn-play");
await pageB.waitForTimeout(800);

async function canvasHash(p) {
  return p.evaluate(() => {
    const c = document.getElementById("coreball-canvas");
    const ctx = c.getContext("2d");
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let h1 = 0, h2 = 0;
    for (let i = 0; i < data.length; i += 16) {
      h1 = (h1 * 31 + data[i]) >>> 0;
      h2 = (h2 * 33 + data[i + 1]) >>> 0;
    }
    return h1 + "_" + h2;
  });
}
async function pickLevel(p, n) {
  await p.click("#btn-levels");
  await p.waitForTimeout(250);
  await p.click("#level-grid .level-btn:nth-child(" + n + ")");
  await p.waitForTimeout(800);
}
await pickLevel(pageB, 5);
const h5 = await canvasHash(pageB);
await pickLevel(pageB, 10);
const h10 = await canvasHash(pageB);
ok("level layouts differ (L5 vs L10)", h5 !== h10, h5 + " vs " + h10);

let failed = false;
for (let i = 0; i < 40 && !failed; i++) {
  await pageB.click("#coreball-canvas");
  await pageB.waitForTimeout(110);
  failed = await pageB.locator("#overlay-failed").isVisible().catch(() => false);
}
if (failed) {
  ok("game over overlay appears on collision", true);
  await pageB.click("#btn-retry");
  await pageB.waitForTimeout(400);
  ok("retry restarts level", await pageB.locator("#game-overlay").evaluate((el) => el.classList.contains("overlay-hidden")));
} else {
  ok("game over overlay appears on collision", false, "no fail within 40 shots");
}
ok("no console errors (desktop L5/L10)", errsB.length === 0, errsB.slice(0, 3).join(" | "));
await pageB.close();

// ---- Page C: mobile JA ----
const errsC = [];
const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
mob.on("pageerror", (e) => { if (!isAdNoise(e.message)) errsC.push(e.message); });
await mob.goto(BASE + "/ja/", { waitUntil: "domcontentloaded" });
await mob.tap("#btn-play");
await mob.waitForTimeout(1000);
ok("JA mobile HUD renders", /レベル 1 \/ 500/.test((await mob.textContent("#hud-level")) || ""), await mob.textContent("#hud-level"));
ok("no horizontal scroll on mobile", (await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
const mpx = await canvasPixels(mob);
const mcx = Math.floor(mpx.w / 2);
ok("mobile ready pin visible", regionStats(mpx, mcx - 20, mpx.h - 46, mcx + 20, mpx.h - 4).colored > 0);
const mBefore = await mob.textContent("#hud-balls");
await mob.tap("#coreball-canvas");
await mob.waitForTimeout(700);
const mAfter = await mob.textContent("#hud-balls");
ok("mobile tap shoots", mBefore !== mAfter, mBefore + " -> " + mAfter);
await mob.screenshot({ path: "scripts/screenshots/ja-mobile.png" });
ok("no console errors (mobile)", errsC.length === 0, errsC.slice(0, 3).join(" | "));
await mob.close();

await browser.close();
const failedList = results.filter((r) => !r.pass);
console.log("\nSUMMARY: " + (results.length - failedList.length) + "/" + results.length + " passed");
process.exitCode = failedList.length ? 1 : 0;
