// Pre-launch SEO/build self-check: verifies every generated page and support file.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pages as enPages } from "./content/en.js";
import { pages as jaPages } from "./content/ja.js";
import { SITE_ORIGIN, toEnPath, toJaPath, escapeHtml } from "./content/site.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, "../dist");
const errors = [];
const pages = [...enPages, ...jaPages];

for (const page of pages) {
  const file = resolve(dist, page.file);
  if (!existsSync(file)) {
    errors.push("missing file: " + page.file);
    continue;
  }
  const html = readFileSync(file, "utf8");
  const enPath = page.lang === "ja" ? toEnPath(page.path) : page.path;
  const jaPath = page.lang === "en" ? toJaPath(page.path) : page.path;
  const checks = [
    ["<html lang=\"" + page.lang + "\">", "html lang=" + page.lang],
    ["<title>" + escapeHtml(page.title) + "</title>", "title"],
    ['<meta name="description" content="' + escapeHtml(page.description) + '">', "description"],
    ['<link rel="canonical" href="' + SITE_ORIGIN + page.path + '">', "canonical"],
    ['hreflang="en" href="' + SITE_ORIGIN + enPath + '"', "hreflang en"],
    ['hreflang="ja" href="' + SITE_ORIGIN + jaPath + '"', "hreflang ja"],
    ['hreflang="x-default" href="' + SITE_ORIGIN + enPath + '"', "hreflang x-default"],
    ["<h1>", "h1"],
    ['property="og:image" content="' + SITE_ORIGIN + '/og-image.png"', "og:image"],
    ['type="application/ld+json"', "JSON-LD"],
  ];
  for (const [needle, label] of checks) {
    if (!html.includes(needle)) errors.push(page.path + " missing " + label);
  }
  // every JSON-LD block must be valid JSON
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const m of ldBlocks) {
    try {
      JSON.parse(m[1]);
    } catch {
      errors.push(page.path + " has invalid JSON-LD");
    }
  }
  if (page.path === "/" || page.path === "/ja/") {
    if (!html.includes('id="coreball-canvas"')) errors.push(page.path + " missing game canvas");
    if (!html.includes('/assets/')) errors.push(page.path + " missing bundled game script");
  }
}

// support files
const support = ["robots.txt", "sitemap.xml", "_headers", "404.html", "favicon.svg", "og-image.png", "apple-touch-icon.png"];
for (const f of support) {
  if (!existsSync(resolve(dist, f))) errors.push("missing public file: " + f);
}
const robots = readFileSync(resolve(dist, "robots.txt"), "utf8");
if (!robots.includes("User-agent: *") || !robots.includes("Allow: /") || !robots.includes("Sitemap: " + SITE_ORIGIN + "/sitemap.xml")) {
  errors.push("robots.txt content incorrect");
}
const sitemap = readFileSync(resolve(dist, "sitemap.xml"), "utf8");
for (const page of pages) {
  if (!sitemap.includes("<loc>" + SITE_ORIGIN + page.path + "</loc>")) {
    errors.push("sitemap missing: " + page.path);
  }
}

// no stray html outside expected pages
const htmlFiles = [];
for (const entry of readdirSync(dist, { recursive: true })) {
  if (String(entry).endsWith(".html")) htmlFiles.push(String(entry).replace(/\\/g, "/"));
}
const expected = pages.map((p) => p.file).concat(["404.html"]);
for (const f of htmlFiles) {
  if (!expected.includes(f)) errors.push("unexpected html in dist: " + f);
}

if (errors.length) {
  console.error("VERIFY FAILED");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
} else {
  console.log("VERIFY OK: " + pages.length + " pages, all SEO tags, sitemap, robots, assets, and support files present.");
}
