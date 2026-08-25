# CoreBall — coreball.online

A fast, SEO-first single-game website for **CoreBall** (Coreball / まち針ゲーム style gameplay).
The game is an original implementation: deterministic 500-level generator, canvas rendering, and
separate English (`/`) and Japanese (`/ja/`) URL versions.

## Live structure

```text
/                         English game page (canonical)
/ja/                      Japanese game page (まち針ゲーム)
/guides/                  English guides hub
/guides/how-to-play/      English how-to guide
/guides/tips/             English tips guide
/about/ /privacy/ /terms/ English legal/info pages
/ja/guides/ ...           Japanese guides + legal pages
/sitemap.xml              all SEO URLs
/robots.txt               allow all + sitemap
```

## Tech stack

- **Vite + TypeScript**, fully static output (no server, no runtime framework).
- Hand-rolled HTML page generator (`scripts/generate-pages.mjs`) renders complete SEO HTML into `src/pages/**` before Vite builds.
- Canvas game engine (`src/game/engine.ts`) with real rotation/angle/projectile/collision math.
- WebAudio sound effects generated in code (no audio assets, muted by default).
- `localStorage` progress saving. No accounts, no backend.

## Commands

```bash
npm install
npm run dev        # generate pages + Vite dev server
npm run build      # generate everything + static production build
npm run verify     # pre-launch SEO/build self-check against dist/
npm run typecheck  # TypeScript check
```

The build also runs `postbuild` (`scripts/verify-dist.mjs`) automatically to confirm every page
has its title, description, canonical, bidirectional hreflang, H1, JSON-LD, and game canvas.

## Cloudflare Pages deployment

1. Push this repository to GitHub.
2. In Cloudflare Pages create a project connected to that repo.
3. Set:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - Framework preset: `None` (or `Vite`).
4. Attach the custom domain `coreball.online` and enable HTTPS. Use the apex domain
   (`https://coreball.online/`), not `www`, and keep all canonical/hreflang/sitemap URLs on apex.

`public/_headers` ships security + cache headers. A custom 404 page is at `public/404.html`.

## Integrations (optional, build-time)

The page generator reads these environment variables so the site ships with zero third-party
requests when they are unset:

```bash
GA_MEASUREMENT_ID=G-XXXXXXXXXX      # enables async GA4 loader + event bridge
ADSENSE_PUB_ID=9073496682747119     # publisher id (default already set; `ca-pub-` is prepended)
ADSENSE_SLOT_TOP=0000000000         # top ad unit id
ADSENSE_SLOT_BOTTOM=0000000000      # bottom ad unit id
```

Set these as Cloudflare Pages environment variables before the build. The AdSense global
`<head>` loader (`pagead2.googlesyndication.com` with `ca-pub-9073496682747119`) is always
emitted; ad units stay as CLS-safe labeled placeholders until slot ids are configured. GA4 is a
commented-out snippet until a measurement id is set.

GA4 events emitted by the game: `game_start`, `level_start`, `level_complete`, `level_failed`,
`level_retry`, `level_select`, `game_complete`, `sound_toggle`.

## SEO implementation

- Canonical URLs point at each language version itself.
- Every page lists `en`, `ja`, and `x-default` hreflang alternates (bidirectional).
- `<html lang>` is `en` or `ja` per page.
- Structured data: `WebApplication`, `VideoGame`, `FAQPage`, `BreadcrumbList`, `Article`, `HowTo`,
  `AboutPage`, `WebPage` — only for real, visible content.
- SEO copy lives in static HTML (server/SSG output), never inside the canvas or client-rendered DOM.
- Game-first layout: minimal header, full-viewport game area, then content below.

## Game design

- 500 deterministic levels generated at build time by `scripts/generate-levels.mjs`.
- Layouts use a seeded PRNG (`seed = level id`) so every level is reproducible.
- Every level starts with pre-inserted pins (Level 1 has two) that are real collision objects;
  the player fills the remaining gaps. The core is kept small so the pins are the visual focus,
  and the next pin waits visibly below the core.
- Difficulty ramps through speed, rotation direction, pin counts, and layout patterns
  (`normal`, `fast`, `slow`, `accel`, `mirror`, `dense`, `cluster`, `narrow`).
- Collision fairness is validated twice: at generation time (gap-width guarantee) and by
  `scripts/simulate-collisions.mjs`, which simulates a perfectly centered shot into the widest gap of
  every level (must attach) and a shot aimed at an occupied angle (must fail).

## Originality note

This project only references the publicly observable mechanics of classic Coreball-style games.
It does not copy any site's source code, assets, CSS, sound, or level data. CoreBall is an
independent fan-made game and is not affiliated with or endorsed by any original publisher.

## Files of interest

```text
scripts/generate-levels.mjs   level generator + fairness validation
scripts/generate-assets.mjs   favicon, OG image, robots, sitemap, _headers
scripts/generate-pages.mjs    renders SEO HTML pages
scripts/content/en.js         English content (one language = one URL)
scripts/content/ja.js         Japanese content
scripts/content/site.js       shared SEO/head/JSON-LD/game markup builders
scripts/verify-dist.mjs       pre-launch SEO self-check
src/game/engine.ts            canvas game engine
src/game/main.ts              DOM wiring, input, save, analytics
src/game/levels.ts            level data model
src/game/data/levels.generated.ts  generated 500-level data (build artifact)
```
