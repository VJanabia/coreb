// Static page generator: renders every language page into src/pages/** so
// Vite can build a fully static, SEO-complete multi-page site.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as site from "./content/site.js";
import { pages as enPages } from "./content/en.js";
import { pages as jaPages } from "./content/ja.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = resolve(__dirname, "../src/pages");
const publicDir = resolve(__dirname, "../public");

function writeFile(rel, content) {
  const out = resolve(pagesDir, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, content, "utf8");
}

const allPages = [...enPages, ...jaPages];
for (const page of allPages) {
  const mainHtml = page.main(site);
  const jsonLd = page.jsonLd(site);
  const head = site.headMeta({
    lang: page.lang,
    path: page.path,
    title: page.title,
    description: page.description,
    imageAlt: page.imageAlt,
    jsonLd,
  });
  const skip = page.lang === "ja" ? "本文へスキップ" : "Skip to content";
  const html = "<!doctype html>\n<html lang=\"" + page.lang + "\">\n<head>\n" + head + "\n</head>\n<body>\n" +
    '<a class="sr-only" href="#main">' + skip + "</a>\n" +
    site.siteHeader(page.lang, page.path) + "\n" +
    mainHtml + "\n" +
    site.siteFooter(page.lang) + "\n" +
    "</body>\n</html>\n";
  writeFile(page.file, html);
}

function build404() {
  const css = site.CSS;
  const html = "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n" +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    "<title>Page Not Found | CoreBall</title>\n" +
    '<meta name="robots" content="noindex, nofollow">\n' +
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' +
    "<style>" + css + "</style>\n</head>\n<body>\n" +
    '<div class="page-wrap" style="padding-top:48px">\n' +
    "<h1>Page not found</h1>\n" +
    "<p>The page you were looking for does not exist. The game is still right here.</p>\n" +
    '<p><a class="btn btn-primary" href="/">Play Coreball</a> ' +
    '<a class="btn" href="/ja/">まち針ゲーム</a></p>\n' +
    "</div>\n</body>\n</html>\n";
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(resolve(publicDir, "404.html"), html, "utf8");
}

build404();
console.log("Generated " + allPages.length + " pages + 404.html into src/pages and public.");
