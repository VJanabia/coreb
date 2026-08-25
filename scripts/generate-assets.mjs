// Generates original, code-drawn assets + SEO support files (robots, sitemap, headers).
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { pages as enPages } from "./content/en.js";
import { pages as jaPages } from "./content/ja.js";
import { SITE_ORIGIN, BUILD_DATE } from "./content/site.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
mkdirSync(publicDir, { recursive: true });

// ---------------------------------------------------------------- robots.txt
writeFileSync(resolve(publicDir, "robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: " + SITE_ORIGIN + "/sitemap.xml\n");

// ---------------------------------------------------------------- _headers
writeFileSync(resolve(publicDir, "_headers"), [
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()",
  "",
  "/assets/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
  "/og-image.png",
  "  Cache-Control: public, max-age=86400",
  "",
  "/apple-touch-icon.png",
  "  Cache-Control: public, max-age=86400",
  "",
  "/ads.txt",
  "  Content-Type: text/plain; charset=utf-8",
  "  Cache-Control: public, max-age=3600",
  "",
].join("\n"));

// ---------------------------------------------------------------- sitemap.xml
const allPages = [...enPages, ...jaPages];
const urlEntries = allPages
  .map((p) => "  <url><loc>" + SITE_ORIGIN + p.path + "</loc><lastmod>" + BUILD_DATE + "</lastmod><changefreq>monthly</changefreq><priority>" + (p.path === "/" || p.path === "/ja/" ? "1.0" : "0.7") + "</priority></url>")
  .join("\n");
const sitemap = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
  "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" + urlEntries + "\n</urlset>\n";
writeFileSync(resolve(publicDir, "sitemap.xml"), sitemap);

// ---------------------------------------------------------------- favicon.svg
const favicon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="14" fill="#26314f"/>' +
  '<circle cx="32" cy="32" r="13" fill="#64779f" stroke="#1c2440" stroke-width="2"/>' +
  '<circle cx="27.5" cy="27.5" r="3.4" fill="#ffffff" opacity="0.35"/>' +
  '<g stroke="#98a3ba" stroke-width="2.6" stroke-linecap="round">' +
  '<line x1="32" y1="19" x2="32" y2="12"/><line x1="43.2" y1="20.8" x2="48.2" y2="15.8"/>' +
  '<line x1="45" y1="32" x2="52" y2="32"/><line x1="43.2" y1="43.2" x2="48.2" y2="48.2"/>' +
  '<line x1="32" y1="45" x2="32" y2="52"/><line x1="20.8" y1="43.2" x2="15.8" y2="48.2"/>' +
  '<line x1="19" y1="32" x2="12" y2="32"/><line x1="20.8" y1="20.8" x2="15.8" y2="15.8"/></g>' +
  '<g>' +
  '<circle cx="32" cy="12" r="3.2" fill="#e5484d"/><circle cx="48.2" cy="15.8" r="3.2" fill="#ffb224"/>' +
  '<circle cx="52" cy="32" r="3.2" fill="#46a758"/><circle cx="48.2" cy="48.2" r="3.2" fill="#12a594"/>' +
  '<circle cx="32" cy="52" r="3.2" fill="#0e8af0"/><circle cx="15.8" cy="48.2" r="3.2" fill="#7c66dc"/>' +
  '<circle cx="12" cy="32" r="3.2" fill="#e05299"/><circle cx="15.8" cy="15.8" r="3.2" fill="#f76b15"/></g>' +
  "</svg>";
writeFileSync(resolve(publicDir, "favicon.svg"), favicon);

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- pixel font
const GLYPHS = {
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
  C: ["01110","10001","10000","10000","10000","10001","01110"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  I: ["01110","00100","00100","00100","00100","00100","01110"],
  ".": ["000","000","000","000","000","110","110"],
};

function textWidth(text, scale) {
  let w = 0;
  for (const ch of text) {
    const g = GLYPHS[ch] || GLYPHS[" "];
    w += (g[0].length + 1) * scale;
  }
  return w - scale;
}

function drawText(target, text, cx, cy, scale, r, g, b) {
  const W = target.length;
  const H = target[0].length;
  const totalW = textWidth(text, scale);
  let x0 = Math.round(cx - totalW / 2);
  for (const ch of text) {
    const glyph = GLYPHS[ch] || GLYPHS[" "];
    const gw = glyph[0].length * scale;
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === "1") {
          const px = x0 + col * scale;
          const py = Math.round(cy - (glyph.length * scale) / 2) + row * scale;
          for (let yy = py; yy < py + scale; yy++) {
            for (let xx = px; xx < px + scale; xx++) {
              if (xx >= 0 && yy >= 0 && xx < W && yy < H) {
                target[xx][yy] = [r, g, b];
              }
            }
          }
        }
      }
    }
    x0 += gw + scale;
  }
}

// ---------------------------------------------------------------- scene painter
const PALETTE = [
  [229, 72, 77], [247, 107, 21], [255, 178, 36], [70, 167, 88], [18, 165, 148],
  [14, 138, 240], [124, 102, 220], [224, 82, 153], [91, 109, 150], [201, 162, 39],
];

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function circleCoverage(px, py, cx, cy, r) {
  const d = Math.hypot(px - cx, py - cy);
  return clamp01(r - d + 0.5);
}

function segmentCoverage(px, py, ax, ay, bx, by, r) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / len2;
  t = clamp01(t);
  const d = Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
  return clamp01(r - d + 0.5);
}

function paintScene(px, py, W, H, withText, textLayer) {
  const top = [255, 255, 255];
  const bottom = [235, 240, 248];
  let c = mix(top, bottom, clamp01(py / H));
  const R = Math.min(W, H) * (withText ? 0.21 : 0.33);
  const cx = W * 0.5;
  const cy = H * (withText ? 0.53 : 0.5);
  const shaftLen = R * 0.38;
  const headR = R * 0.105;
  const rh = R + shaftLen;
  const pinCount = withText ? 12 : 10;

  for (let i = 0; i < pinCount; i++) {
    const ang = (i / pinCount) * Math.PI * 2 - Math.PI / 2;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const hx = cx + dx * rh;
    const hy = cy + dy * rh;
    const ix = cx + dx * R * 0.98;
    const iy = cy + dy * R * 0.98;
    const col = PALETTE[i % PALETTE.length];
    const shaftCov = segmentCoverage(px, py, ix, iy, hx - dx * headR * 0.9, hy - dy * headR * 0.9, headR * 0.3);
    if (shaftCov > 0) c = mix(c, [152, 163, 186], shaftCov * 0.9);
    const headCov = circleCoverage(px, py, hx, hy, headR);
    if (headCov > 0) {
      c = mix(c, col, headCov);
      const hl = circleCoverage(px, py, hx - headR * 0.3, hy - headR * 0.32, headR * 0.28);
      if (hl > 0) c = mix(c, [255, 255, 255], hl * 0.5);
    }
  }

  const d = Math.hypot(px - cx, py - cy);
  const coreCov = circleCoverage(px, py, cx, cy, R);
  if (coreCov > 0) {
    const t = clamp01(d / (R * 1.1));
    const coreCol = mix([100, 119, 159], [38, 49, 79], t);
    c = mix(c, coreCol, coreCov);
    const hl = circleCoverage(px, py, cx - R * 0.32, cy - R * 0.34, R * 0.16);
    if (hl > 0) c = mix(c, [255, 255, 255], hl * 0.16);
  }

  if (withText && textLayer) {
    const xi = Math.max(0, Math.min(W - 1, Math.round(px)));
    const yi = Math.max(0, Math.min(H - 1, Math.round(py)));
    const cell = textLayer[xi][yi];
    if (cell) {
      c = mix(c, cell, 0.96);
    }
  }
  return [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])];
}

function buildTextLayer(W, H) {
  const layer = Array.from({ length: W }, () => Array.from({ length: H }, () => null));
  drawText(layer, "COREBALL", W * 0.5, H * 0.13, Math.max(10, Math.round(W / 70)), 38, 49, 79);
  drawText(layer, "COREBALL.ONLINE", W * 0.5, H * 0.9, Math.max(6, Math.round(W / 150)), 91, 101, 119);
  return layer;
}

function renderPng(W, H, withText) {
  const textLayer = withText ? buildTextLayer(W, H) : null;
  const rgba = Buffer.alloc(W * H * 4);
  const ss = 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const col = paintScene(x + (sx + 0.5) / ss, y + (sy + 0.5) / ss, W, H, withText, textLayer);
          r += col[0]; g += col[1]; b += col[2];
        }
      }
      const n = ss * ss;
      const i = (y * W + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = 255;
    }
  }
  return encodePng(W, H, rgba);
}

writeFileSync(resolve(publicDir, "og-image.png"), renderPng(1200, 630, true));
writeFileSync(resolve(publicDir, "apple-touch-icon.png"), renderPng(180, 180, false));
console.log("Wrote robots.txt, _headers, sitemap.xml, favicon.svg, og-image.png, apple-touch-icon.png");
