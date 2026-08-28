// Shared site config + HTML builders for the static page generator.
import { CSS } from "./style.js";

export { CSS };

export const SITE_ORIGIN = "https://coreball.online";
export const SITE_NAME = "CoreBall";
export const LEVEL_COUNT = 500;
export const BUILD_DATE = new Date().toISOString().slice(0, 10);

// Build-time integrations. Unset => feature stays disabled (no third-party request).
const GA_ID = (process.env.GA_MEASUREMENT_ID || "").trim();
// Publisher id for Google AdSense. The global <head> loader is always emitted
// so AdSense can serve ads site-wide; ad units remain placeholders until
// ADSENSE_SLOT_TOP / ADSENSE_SLOT_BOTTOM (or per-slot ids) are provided.
const AD_PUB_ID = (process.env.ADSENSE_PUB_ID || "9073496682747119").trim();
const AD_SLOT_TOP = (process.env.ADSENSE_SLOT_TOP || "0000000000").trim();
const AD_SLOT_BOTTOM = (process.env.ADSENSE_SLOT_BOTTOM || "0000000000").trim();

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function toEnPath(path) {
  if (path === "/ja/") return "/";
  return path.replace(/^\/ja(?=\/)/, "");
}

export function toJaPath(path) {
  if (path === "/") return "/ja/";
  return "/ja" + path;
}

export function homePath(lang) {
  return lang === "ja" ? "/ja/" : "/";
}

function gaHead() {
  if (!GA_ID) {
    return "<!-- GA4 is disabled. To enable: build with GA_MEASUREMENT_ID=G-XXXXXXXXXX -->";
  }
  return "<link rel=\"preconnect\" href=\"https://www.googletagmanager.com\">" +
    "<script async src=\"https://www.googletagmanager.com/gtag/js?id=" + escapeHtml(GA_ID) + "\"></script>" +
    "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','" + escapeHtml(GA_ID) + "');</script>";
}

function adsLoaderHead() {
  if (!AD_PUB_ID) return "";
  return "<link rel=\"preconnect\" href=\"https://pagead2.googlesyndication.com\">" +
    "<script async src=\"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-" + escapeHtml(AD_PUB_ID) + "\" crossorigin=\"anonymous\"></script>";
}

export function adTop() {
  return adUnit(AD_SLOT_TOP);
}

export function adBottom() {
  return adUnit(AD_SLOT_BOTTOM, true);
}

export function adUnit(slot, compact = false) {
  // "0000000000" is the sentinel for "no real ad unit id configured yet":
  // keep the CLS-safe placeholder instead of pushing an invalid ad request.
  if (!AD_PUB_ID || slot === "0000000000") {
    const cls = compact ? "ad-slot ad-slot--compact" : "ad-slot";
    return '<div class="' + cls + '" aria-hidden="true"><span>Advertisement</span></div>';
  }
  return '<div class="ad-slot' + (compact ? " ad-slot--compact" : "") + '">' +
    '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-' + escapeHtml(AD_PUB_ID) + '" ' +
    'data-ad-slot="' + escapeHtml(slot) + '" data-ad-format="auto" data-full-width-responsive="true"></ins>' +
    '<script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>';
}

export function headMeta({ lang, path, title, description, imageAlt, jsonLd, robots = "index, follow, max-image-preview:large" }) {
  const enPath = lang === "ja" ? toEnPath(path) : path;
  const jaPath = lang === "en" ? toJaPath(path) : path;
  const canonical = SITE_ORIGIN + path;
  const ogLocale = lang === "ja" ? "ja_JP" : "en_US";
  const jsonLdTags = jsonLd.map((obj) =>
    '<script type="application/ld+json">' + JSON.stringify(obj) + "</script>"
  ).join("\n");

  const parts = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    "<title>" + escapeHtml(title) + "</title>",
    '<meta name="description" content="' + escapeHtml(description) + '">',
    '<meta name="robots" content="' + robots + '">',
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">',
    '<link rel="alternate" hreflang="en" href="' + escapeHtml(SITE_ORIGIN + enPath) + '">',
    '<link rel="alternate" hreflang="ja" href="' + escapeHtml(SITE_ORIGIN + jaPath) + '">',
    '<link rel="alternate" hreflang="x-default" href="' + escapeHtml(SITE_ORIGIN + enPath) + '">',
    '<meta name="theme-color" content="#26314f">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="CoreBall">',
    '<meta property="og:title" content="' + escapeHtml(title) + '">',
    '<meta property="og:description" content="' + escapeHtml(description) + '">',
    '<meta property="og:url" content="' + escapeHtml(canonical) + '">',
    '<meta property="og:image" content="' + SITE_ORIGIN + '/og-image.png">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="' + escapeHtml(imageAlt || title) + '">',
    '<meta property="og:locale" content="' + ogLocale + '">',
    '<meta property="og:locale:alternate" content="' + (lang === "ja" ? "en_US" : "ja_JP") + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + escapeHtml(title) + '">',
    '<meta name="twitter:description" content="' + escapeHtml(description) + '">',
    '<meta name="twitter:image" content="' + SITE_ORIGIN + '/og-image.png">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    "<style>" + CSS + "</style>",
    gaHead(),
    adsLoaderHead(),
    jsonLdTags,
  ];
  return parts.filter(Boolean).join("\n");
}

export function siteHeader(lang, path) {
  const home = homePath(lang);
  const brand = '<a class="brand" href="' + home + '"><span class="brand-dot" aria-hidden="true"></span><span>CoreBall</span></a>';
  const enActive = lang === "en" ? ' aria-current="page"' : "";
  const jaActive = lang === "ja" ? ' aria-current="page"' : "";
  return '<header class="site-header"><div class="header-inner">' + brand +
    '<nav class="lang-nav" aria-label="Language">' +
    '<a class="lang-link" href="/" hreflang="en" lang="en"' + enActive + ' onclick="if(window.gtag)try{gtag(\'event\',\'language_switch\',{target_language:\'en\'})}catch(e){}">EN</a>' +
    '<a class="lang-link" href="/ja/" hreflang="ja" lang="ja"' + jaActive + ' onclick="if(window.gtag)try{gtag(\'event\',\'language_switch\',{target_language:\'ja\'})}catch(e){}">日本語</a>' +
    "</nav></div></header>";
}

export function siteFooter(lang) {
  if (lang === "ja") {
    return '<footer class="site-footer"><div class="footer-inner"><div class="footer-grid">' +
      footerCol("ゲーム", [["まち針ゲームを遊ぶ", "/ja/"], ["まち針ゲームの遊び方", "/ja/guides/how-to-play/"], ["まち針ゲームのコツ・攻略", "/ja/guides/tips/"]]) +
      footerCol("サイト", [["このサイトについて", "/ja/about/"], ["プライバシーポリシー", "/ja/privacy/"], ["利用規約", "/ja/terms/"]]) +
      footerCol("言語", [["English", "/"], ["日本語", "/ja/"]]) +
      '</div><p class="footer-note">このサイトは独立したファンメイドのブラウザゲームです。特定の原作者、出版社、公式サイトとは提携・承認関係にありません。CoreBall は当サイトが独自に実装したゲームです。</p></div></footer>';
  }
  return '<footer class="site-footer"><div class="footer-inner"><div class="footer-grid">' +
    footerCol("Game", [["Play Coreball", "/"], ["How to Play", "/guides/how-to-play/"], ["Tips & Tricks", "/guides/tips/"]]) +
    footerCol("Site", [["About", "/about/"], ["Privacy", "/privacy/"], ["Terms", "/terms/"]]) +
    footerCol("Languages", [["English", "/"], ["日本語", "/ja/"]]) +
    '</div><p class="footer-note">This is an independent fan-made browser game inspired by classic Coreball-style gameplay. It is not affiliated with or endorsed by any original publisher or website. CoreBall is an original implementation.</p></div></footer>';
}

function footerCol(title, links) {
  let out = '<div class="footer-col"><h2>' + escapeHtml(title) + "</h2><ul>";
  for (const [label, href] of links) out += '<li><a href="' + href + '">' + escapeHtml(label) + "</a></li>";
  return out + "</ul></div>";
}

export function breadcrumbsHtml(items) {
  const crumbs = items.map((it, i) => {
    const label = escapeHtml(it[0]);
    if (it[1] && i < items.length - 1) return '<a href="' + it[1] + '">' + label + "</a>";
    return "<span>" + label + "</span>";
  });
  return '<nav class="breadcrumbs" aria-label="Breadcrumb">' + crumbs.join('<span aria-hidden="true">/</span>') + "</nav>";
}

export function gameI18n(lang) {
  if (lang === "ja") return {
    play: "まち針ゲーム",
    playSub: "500レベル。タップ、クリック、またはスペースキーで発射。",
    continueLabel: "続きから – レベル{0}",
    level: "レベル {0}",
    levelOfTotal: "レベル {0} / {1}",
    pins: "残り: {0}本",
    pauseLabel: "一時停止",
    restartLabel: "リスタート",
    levelComplete: "レベル {0} クリア",
    nextLevelSub: "レベル {0} の準備をしよう",
    nextLevel: "次のレベル",
    levels: "レベル一覧",
    tryAgain: "もう一度",
    gameOver: "ゲームオーバー",
    allClear: "全レベルクリア！",
    allClearSub: "500レベルすべてクリアしました！",
    paused: "一時停止",
    resume: "再開",
    soundOn: "サウンド: ON",
    soundOff: "サウンド: OFF",
    close: "閉じる",
    levelSelectTitle: "レベルを選ぶ",
    locked: "レベル {0} はロック中",
    completed: "レベル {0} クリア済み",
    currentLevel: "レベル {0}（現在）",
    statusReady: "準備完了。スタートボタンを押してください。",
    statusPlaying: "レベル {0}。残り {1} 本。",
    statusFailed: "レベル {0} でゲームオーバー。",
    statusSuccess: "レベル {0} クリア。",
    statusPaused: "一時停止中。",
  };
  return {
    play: "Play Coreball",
    playSub: "500 levels. Tap, click or press Space to shoot.",
    continueLabel: "Continue – Level {0}",
    level: "Level {0}",
    levelOfTotal: "Level {0} / {1}",
    pins: "Pins: {0}",
    pauseLabel: "Pause",
    restartLabel: "Restart",
    levelComplete: "Level {0} Complete",
    nextLevelSub: "Get ready for Level {0}",
    nextLevel: "Next Level",
    levels: "Levels",
    tryAgain: "Try Again",
    gameOver: "Game Over",
    allClear: "All Levels Complete!",
    allClearSub: "You cleared all 500 levels. Amazing!",
    paused: "Paused",
    resume: "Resume",
    soundOn: "Sound: ON",
    soundOff: "Sound: OFF",
    close: "Close",
    levelSelectTitle: "Select a Level",
    locked: "Level {0} locked",
    completed: "Level {0} completed",
    currentLevel: "Level {0} (current)",
    statusReady: "Coreball ready. Press Play to start.",
    statusPlaying: "Level {0}. {1} balls left.",
    statusFailed: "Game over on level {0}.",
    statusSuccess: "Level {0} complete.",
    statusPaused: "Game paused.",
  };
}

export function gameSection(lang, filePath) {
  const i18n = gameI18n(lang);
  const dirParts = filePath.split("/").slice(0, -1).filter(Boolean);
  const gameRel = "../".repeat(dirParts.length + 1) + "game/main.ts";

  const readyTitle = lang === "ja" ? "まち針ゲーム" : "Play Coreball";
  const readySub = lang === "ja" ? "500レベル。タップ、クリック、またはスペースキーで発射。" : "500 levels. Tap, click or press Space to shoot.";
  const playLabel = lang === "ja" ? "今すぐ遊ぶ" : "Play";
  const nextLabel = lang === "ja" ? "次のレベル" : "Next Level";
  const levelsLabel = lang === "ja" ? "レベル一覧" : "Levels";
  const retryLabel = lang === "ja" ? "もう一度" : "Try Again";
  const gameOverLabel = lang === "ja" ? "ゲームオーバー" : "Game Over";
  const pausedLabel = lang === "ja" ? "一時停止" : "Paused";
  const resumeLabel = lang === "ja" ? "再開" : "Resume";
  const hudLevel = lang === "ja" ? "レベル 1 / 500" : "Level 1 / 500";
  const hudBalls = lang === "ja" ? "残り: 6本" : "Pins: 6";
  const soundLabel = lang === "ja" ? "サウンド: OFF" : "Sound: OFF";
  const pauseLabel = lang === "ja" ? "一時停止" : "Pause";
  const restartLabel = lang === "ja" ? "リスタート" : "Restart";
  const hint = lang === "ja" ? "タップ / クリック / スペースで発射・P 一時停止・R リスタート" : "Tap / Click / Space to shoot · P pause · R restart";
  const modalTitle = lang === "ja" ? "レベルを選ぶ" : "Select a Level";
  const closeLabel = lang === "ja" ? "閉じる" : "Close";
  const ariaGame = lang === "ja" ? "まち針ゲームのプレイエリア。クリックまたはスペースキーで発射します。" : "Coreball game area. Click or press Space to shoot.";

  return [
    '<section class="game-shell" aria-label="' + ariaGame + '">',
    '<div class="game-zone">',
    '<canvas id="coreball-canvas" role="img" aria-label="' + ariaGame + '">',
    lang === "ja" ? "お使いのブラウザは Canvas に対応していません。" : "Your browser does not support the HTML5 canvas element.",
    "</canvas>",
    '<div class="game-overlay overlay-hidden" id="game-overlay">',
    '<div class="overlay-panel" id="overlay-ready" hidden><h2 id="ready-title">' + readyTitle + '</h2><p id="ready-sub">' + readySub + '</p><div class="overlay-actions"><button type="button" class="btn btn-primary" id="btn-play">' + playLabel + "</button></div></div>",
    '<div class="overlay-panel" id="overlay-success" hidden><h2 id="success-title">Level Complete</h2><p id="success-sub"></p><div class="overlay-actions"><button type="button" class="btn btn-primary" id="btn-next">' + nextLabel + '</button><button type="button" class="btn" id="btn-levels-success">' + levelsLabel + "</button></div></div>",
    '<div class="overlay-panel" id="overlay-failed" hidden><h2 id="failed-title">' + gameOverLabel + '</h2><p id="failed-sub"></p><div class="overlay-actions"><button type="button" class="btn btn-primary btn-danger" id="btn-retry">' + retryLabel + '</button><button type="button" class="btn" id="btn-levels-failed">' + levelsLabel + "</button></div></div>",
    '<div class="overlay-panel" id="overlay-paused" hidden><h2 id="paused-title">' + pausedLabel + '</h2><div class="overlay-actions"><button type="button" class="btn btn-primary" id="btn-resume">' + resumeLabel + "</button></div></div>",
    "</div>",
    '<div class="level-banner" id="level-banner" hidden aria-hidden="true"></div>',
    '<noscript><div class="overlay-panel"><p>' + (lang === "ja" ? "ゲームを開始するには JavaScript を有効にしてください。" : "Please enable JavaScript to play the game.") + "</p></div></noscript>",
    "</div>",
    '<div class="game-status">',
    '<div class="hud"><span id="hud-level">' + hudLevel + '</span><span id="hud-dots" class="hud-dots" aria-hidden="true"></span><span id="hud-balls" class="muted">' + hudBalls + "</span></div>",
    '<div class="progress-track" aria-hidden="true"><div class="progress-fill" id="progress-fill"></div></div>',
    '<div class="game-actions"><button type="button" class="btn" id="btn-sound" aria-pressed="false"><span id="sound-label">' + soundLabel + '</span></button><button type="button" class="btn" id="btn-pause" aria-pressed="false"><span id="pause-label">' + pauseLabel + '</span></button><button type="button" class="btn" id="btn-restart" aria-label="' + restartLabel + '">↻</button><button type="button" class="btn" id="btn-levels">' + levelsLabel + "</button></div>",
    '<p class="hint">' + hint + "</p>",
    '<p class="sr-only" id="hud-status" aria-live="polite"></p>',
    "</div>",
    '<dialog class="modal" id="level-modal" aria-labelledby="level-modal-title">',
    '<div class="modal-card"><div class="modal-head"><h2 id="level-modal-title">' + modalTitle + '</h2><button type="button" class="icon-btn" id="level-close" aria-label="' + closeLabel + '">×</button></div><div class="level-grid" id="level-grid"></div></div>',
    "</dialog>",
    "<script>window.__COREBALL_I18N__ = " + JSON.stringify(i18n) + ";</script>",
    '<script type="module" src="' + gameRel + '"></script>',
    "</section>",
  ].join("\n");
}

// JSON-LD builders
export function webSiteSchema(lang, path) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_ORIGIN + homePath(lang),
    inLanguage: lang,
    description: lang === "ja" ? "まち針ゲームを無料で遊べるブラウザゲーム。" : "Play Coreball online free in your browser.",
  };
}

export function webApplicationSchema(lang, path, description) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: lang === "ja" ? "まち針ゲーム（CoreBall）" : "CoreBall",
    url: SITE_ORIGIN + path,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    inLanguage: lang,
    description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    browserRequirements: "Requires JavaScript and an HTML5 canvas-capable browser.",
    featureList: ["500 levels", "Touch and mouse controls", "No registration", "Free to play"],
  };
}

export function videoGameSchema(lang, path, description) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: lang === "ja" ? "まち針ゲーム（CoreBall）" : "CoreBall",
    url: SITE_ORIGIN + path,
    applicationCategory: "Game",
    genre: ["Arcade", "Puzzle"],
    gamePlatform: ["Web browser"],
    playMode: "SinglePlayer",
    numberOfPlayers: "1",
    inLanguage: lang,
    isAccessibleForFree: true,
    description,
  };
}

export function faqSchema(qa) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a },
    })),
  };
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it[0],
      item: SITE_ORIGIN + it[1],
    })),
  };
}

export function articleSchema(lang, path, title, description) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    inLanguage: lang,
    url: SITE_ORIGIN + path,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_ORIGIN + homePath(lang) },
  };
}

export function howToSchema(lang, path, title, description, steps) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    inLanguage: lang,
    url: SITE_ORIGIN + path,
    step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
  };
}

export function webPageSchema(lang, path, title, description) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    inLanguage: lang,
    url: SITE_ORIGIN + path,
  };
}

export function aboutPageSchema(lang, path, title, description) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: title,
    description,
    inLanguage: lang,
    url: SITE_ORIGIN + path,
  };
}
