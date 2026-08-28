// English pages: real, people-first content. One language = one URL set.
import {
  adTop,
  adBottom,
  articleSchema,
  breadcrumbSchema,
  breadcrumbsHtml,
  faqSchema,
  gameSection,
  howToSchema,
  videoGameSchema,
  webApplicationSchema,
  webPageSchema,
  aboutPageSchema,
  webSiteSchema,
} from "./site.js";

const HOME = "/";
const HOW = "/guides/how-to-play/";
const TIPS = "/guides/tips/";
const GUIDES = "/guides/";

const homeFaq = [
  {
    q: "What is Coreball?",
    a: "Coreball is a timing and precision arcade game. A central core rotates continuously, and you fire pins or balls into the gaps between the pins that are already attached to it.",
  },
  {
    q: "How do you play Coreball?",
    a: "Tap, click, or press Space to launch a pin toward the rotating core. Try to land every pin without touching an existing pin. Clear the required number of pins to finish the level.",
  },
  {
    q: "Is Coreball free?",
    a: "Yes. This version is completely free to play in your browser, with no registration, login, or download required.",
  },
  {
    q: "Can I play Coreball on mobile?",
    a: "Yes. The game supports touch controls and is optimized for iPhone Safari and Android Chrome, so you can tap the screen to shoot.",
  },
  {
    q: "How many levels are there?",
    a: "The first release includes 500 levels. Your unlocked progress is saved locally in your browser, and you can return to any level you have unlocked.",
  },
  {
    q: "Can I play Coreball online?",
    a: "Yes. You can play right on this page in any modern web browser. There is nothing to install.",
  },
];

export const pages = [
  {
    path: "/",
    file: "index.html",
    lang: "en",
    title: "Coreball – Play Coreball Online Free | CoreBall",
    description:
      "Play Coreball online for free. Throw balls into the rotating core without hitting the other balls. Play instantly in your browser on desktop or mobile.",
    imageAlt: "CoreBall game: pins attached around a rotating blue core.",
    main(site) {
      return "<main id='main'>" +
        "<section class='hero'><h1>Play Coreball Online</h1><p class='tagline'>A free Coreball-inspired browser game. Aim for the gaps, shoot pins into the rotating core, and clear all 500 levels — no download, no login.</p></section>" +
        site.gameSection("en", "index.html") +
        "<section class='content'>" +
        "<p class='lead'>Coreball is a deceptively simple timing game. A central core keeps rotating while you fire pins into the open spaces around it. One mistimed shot ends the run, so every tap counts. It works instantly on desktop and mobile browsers — no account, no tutorial wall, no interstitial ads before your first game.</p>" +
        site.adTop() +
        "<h2>How to Play Coreball</h2>" +
        "<ol><li>Press <strong>Play</strong> or tap the game area.</li><li>Watch the core rotate and look for an open gap.</li><li>Click, tap, or press <strong>Space</strong> to fire a pin.</li><li>Land every required pin without touching an existing pin.</li><li>Clear the level to unlock the next one.</li></ol>" +
        "<h2>Coreball Tips</h2>" +
        "<ul><li>The colored pin waiting below the core is your next shot — its dashed line marks the flight path.</li><li>Aim for the widest visible gap, not the one that is about to disappear.</li><li>Find a steady rhythm instead of chasing the rotation with your eyes.</li><li>On faster levels, fire slightly before the gap lines up with the dashed shot path.</li><li>Watch for direction changes and accelerating levels in the higher ranges.</li><li>Use the level selector to replay any unlocked level as many times as you like.</li></ul>" +
        "<h2>What is Coreball?</h2>" +
        "<p>Coreball — also searched as core ball, coreball online, or coreball game — is an arcade-style precision game. A large core sits in the center of the screen, and your goal is to attach pins or balls around it. Every successful shot makes the next gap smaller and the timing tighter.</p>" +
        "<p>This version is an independent, fan-made browser game inspired by the classic Coreball-style gameplay. It is not the official or original Coreball, and it is not affiliated with or endorsed by any publisher or website. The code, level data, and graphics here are original.</p>" +
        site.adBottom() +
        "<h2>Coreball Levels</h2>" +
        "<p>There are 500 levels in this release. Every level starts with pins already inserted into the core — Level 1 begins with two — and your job is to squeeze the remaining pins into the open gaps. Later levels add higher speed, direction changes, more pre-inserted pins, and denser layouts. Your highest unlocked level is saved in your browser, so you can continue where you left off instead of restarting from Level 1.</p>" +
        "<h2>Frequently Asked Questions</h2>" +
        "<div class='faq'>" +
        homeFaq.map((f) => "<details><summary>" + f.q + "</summary><p class='a'>" + f.a + "</p></details>").join("") +
        "</div>" +
        "<h2>More Coreball Guides</h2>" +
        "<div class='card-grid'>" +
        "<div class='card'><h2>How to Play Coreball</h2><p>Learn the controls, the rules, and how collision works — step by step.</p><a class='btn' href='" + HOW + "'>Read the guide</a></div>" +
        "<div class='card'><h2>Coreball Tips &amp; Tricks</h2><p>Practical techniques for reading gaps, keeping rhythm, and beating harder levels.</p><a class='btn' href='" + TIPS + "'>Get the tips</a></div>" +
        "</div>" +
        "</section>" +
        "</main>";
    },
    jsonLd(site) {
      const desc = "Play Coreball online free in your browser. A timing game where you shoot pins into a rotating core without hitting the pins already attached.";
      return [
        webSiteSchema("en", "/"),
        webApplicationSchema("en", "/", desc),
        videoGameSchema("en", "/", desc),
        faqSchema(homeFaq),
      ];
    },
  },

  {
    path: "/guides/",
    file: "guides/index.html",
    lang: "en",
    title: "Coreball Guides – How to Play, Tips & Tricks | CoreBall",
    description:
      "Coreball guides: learn the rules, master the controls, and pick up practical tips for beating harder Coreball levels.",
    imageAlt: "CoreBall guides for how to play and improve.",
    main() {
      return "<main id='main' class='legal'>" +
        breadcrumbsHtml([["Home", "/"], ["Guides", GUIDES]]) +
        "<h1>Coreball Guides</h1>" +
        "<p class='lead'>Short, practical guides that help you go from your first shot to the later, faster levels of Coreball. No fluff — just the rules, controls, and timing ideas that matter.</p>" +
        "<div class='card-grid'>" +
        "<div class='card'><h2>How to Play Coreball</h2><p>The full beginner guide: goal, controls, step-by-step play, collision, and level progression.</p><a class='btn' href='" + HOW + "'>Read How to Play</a></div>" +
        "<div class='card'><h2>Coreball Tips &amp; Tricks</h2><p>How to read gaps, keep a reliable rhythm, and handle speed changes and direction flips.</p><a class='btn' href='" + TIPS + "'>Read the Tips</a></div>" +
        "</div>" +
        "<h2>Start Playing Now</h2>" +
        "<p>Ready to put the advice into practice? The game is available on the homepage with all 500 levels unlocked progressively.</p>" +
        "<p><a class='btn btn-primary' href='/'>Play Coreball Online</a></p>" +
        "</main>";
    },
    jsonLd() {
      return [
        breadcrumbSchema([["Home", "/"], ["Guides", GUIDES]]),
        webPageSchema("en", GUIDES, "Coreball Guides", "How to play Coreball and improve with practical tips."),
      ];
    },
  },

  {
    path: "/guides/how-to-play/",
    file: "guides/how-to-play/index.html",
    lang: "en",
    title: "How to Play Coreball – Controls, Rules & Scoring | CoreBall",
    description:
      "Learn how to play Coreball: mouse, touch and keyboard controls, the shooting rules, how collisions work, and how the 500-level progression system works.",
    imageAlt: "How to play Coreball: controls and rules explained.",
    main() {
      const steps = [
        "Press Play to start Level 1. The core begins rotating with a set speed and direction.",
        "Look at the core and find the widest open gap between the pins already attached.",
        "Tap the screen, click the mouse, or press Space to fire one pin from the bottom toward the core.",
        "Repeat until you have attached all the required pins for the level.",
        "Clear the level to unlock the next one, or retry if your pin touches an existing pin.",
      ];
      return "<main id='main' class='legal'>" +
        breadcrumbsHtml([["Home", "/"], ["Guides", GUIDES], ["How to Play", HOW]]) +
        "<h1>How to Play Coreball</h1>" +
        "<p class='lead'>Coreball is easy to learn and hard to master. You do not need an account or a download — just open the page, press Play, and shoot.</p>" +
        "<h2>The Goal</h2>" +
        "<p>Attach the required number of pins to the rotating core without letting a new pin touch any pin that is already attached. If you touch one, the game is over and you can retry the same level instantly.</p>" +
        "<h2>Controls</h2>" +
        "<ul><li><strong>Mouse:</strong> click anywhere on the game area to shoot.</li><li><strong>Touch:</strong> tap the game area on your phone or tablet to shoot.</li><li><strong>Keyboard:</strong> press Space or Enter to shoot.</li><li><strong>Sound:</strong> use the Sound button to toggle generated sound effects on or off.</li><li><strong>Levels:</strong> open the level selector to replay any unlocked level.</li></ul>" +
        "<h2>Step by Step</h2>" +
        "<ol>" + steps.map((s) => "<li>" + s + "</li>").join("") + "</ol>" +
        "<h2>How Collisions and Attachment Work</h2>" +
        "<p>The projectile travels from the bottom of the screen toward the center of the core. When its head reaches the core, it attaches at the angle you chose and starts rotating with the core. If its head or shaft touches an existing pin first, the run fails.</p>" +
        "<p>The game uses real angle, rotation, and collision calculations rather than a scripted animation, so the timing you see is the timing you get. Each level is generated deterministically, which means Level 27 always has the same layout every time you play it.</p>" +
        "<h2>Levels and Progress</h2>" +
        "<p>The first release has 500 levels. Every level starts with a few pins already inserted — Level 1 has two. Early levels are slow and spacious, then speed, direction changes, more pre-inserted pins, and denser patterns ramp up gradually. Your progress is saved locally in your browser and you can continue from your highest unlocked level.</p>" +
        "<h2>Mobile Play</h2>" +
        "<p>The game is designed for both iPhone Safari and Android Chrome. The canvas resizes to your screen, touch targets are large, and the page does not scroll horizontally while you play.</p>" +
        "<p><a class='btn btn-primary' href='/'>Play Coreball Now</a></p>" +
        "</main>";
    },
    jsonLd() {
      const title = "How to Play Coreball";
      const desc = "Learn Coreball controls, rules, collision timing, and level progression.";
      const steps = [
        "Press Play to start Level 1.",
        "Watch the rotating core and find the widest open gap.",
        "Tap, click, or press Space to fire a pin.",
        "Repeat until all required pins are attached.",
        "Clear the level to unlock the next one.",
      ];
      return [
        breadcrumbSchema([["Home", "/"], ["Guides", GUIDES], ["How to Play", HOW]]),
        articleSchema("en", HOW, title, desc),
        howToSchema("en", HOW, title, desc, steps),
      ];
    },
  },

  {
    path: "/guides/tips/",
    file: "guides/tips/index.html",
    lang: "en",
    title: "Coreball Tips & Tricks – Beat Harder Levels | CoreBall",
    description:
      "Practical Coreball tips: how to read gaps, keep a shooting rhythm, handle speed changes and direction flips, and practice effectively.",
    imageAlt: "Coreball tips and tricks for harder levels.",
    main() {
      return "<main id='main' class='legal'>" +
        breadcrumbsHtml([["Home", "/"], ["Guides", GUIDES], ["Tips", TIPS]]) +
        "<h1>Coreball Tips &amp; Tricks</h1>" +
        "<p class='lead'>Most Coreball failures are not about reflexes alone — they come from chasing gaps instead of reading the rotation. These tips will make your runs more consistent.</p>" +
        "<h2>Read the Rotation Before You Shoot</h2>" +
        "<p>Do not fire at the first gap you see. Watch one full rotation and notice which gap stays widest for the longest time. Shoot for that window, not the one that is already closing.</p>" +
        "<h2>Pick a Rhythm</h2>" +
        "<p>A steady rhythm beats fast reactions. When the rotation speed is constant, try to shoot once per beat rather than reacting to each pin individually. Your timing will become much more predictable.</p>" +
        "<h2>Lead Faster Gaps</h2>" +
        "<p>On faster levels the pin travels for a short but real amount of time. Fire just before your chosen gap lines up with the bottom of the core. The exact lead depends on the level speed, so adjust after the first shot or two.</p>" +
        "<h2>Watch for Direction and Speed Changes</h2>" +
        "<p>Higher levels can reverse direction or accelerate as you attach pins. If the core suddenly feels different, pause for a moment, re-read the rotation, and only then continue shooting.</p>" +
        "<h2>Practice with the Level Selector</h2>" +
        "<p>Every unlocked level can be replayed as many times as you want. If a level is giving you trouble, replay it until the pattern feels familiar — then move on with confidence.</p>" +
        "<h2>Keep Your First Shot Calm</h2>" +
        "<p>There is no timer and no penalty for waiting. The first few shots of a fresh level land in wide-open gaps, so use them to settle into that level's rotation speed before the spacing gets tight.</p>" +
        "<p><a class='btn btn-primary' href='/'>Play Coreball Now</a></p>" +
        "</main>";
    },
    jsonLd() {
      return [
        breadcrumbSchema([["Home", "/"], ["Guides", GUIDES], ["Tips", TIPS]]),
        articleSchema("en", TIPS, "Coreball Tips & Tricks", "Practical tips for reading gaps, keeping rhythm, and beating harder Coreball levels."),
      ];
    },
  },

  {
    path: "/about/",
    file: "about/index.html",
    lang: "en",
    title: "About CoreBall – Independent Coreball-Inspired Browser Game",
    description:
      "About CoreBall: an independent, fan-made browser game inspired by classic Coreball-style gameplay, with 500 original levels.",
    imageAlt: "About CoreBall.",
    main() {
      return "<main id='main' class='legal'>" +
        breadcrumbsHtml([["Home", "/"], ["About", "/about/"]]) +
        "<h1>About CoreBall</h1>" +
        "<p>CoreBall is a free browser game inspired by the classic Coreball-style arcade gameplay: shoot pins into a rotating core, avoid the pins already attached, and clear every level you can. The game is designed to load fast and play instantly on both desktop and mobile browsers.</p>" +
        "<h2>An Original Implementation</h2>" +
        "<p>The code, canvas rendering, level generator, and 500-level data set on this site are original. The game is not a copy of any other website's source code or assets.</p>" +
        "<h2>Not Affiliated with Any Publisher</h2>" +
        "<p>CoreBall is an independent fan-made project. It is not affiliated with, or endorsed by, any original publisher, trademark holder, or competing Coreball website. We do not claim to be the official or original Coreball.</p>" +
        "<h2>What You Get</h2>" +
        "<ul><li>500 deterministic levels with gradually increasing difficulty.</li><li>English and Japanese versions on separate URLs.</li><li>Mouse, touch, and keyboard controls.</li><li>Local progress saving — no account required.</li><li>No login, no download, and no forced tutorial.</li></ul>" +
        "<h2>Contact</h2>" +
        "<p>For questions or feedback, email <a href='mailto:admin@coreball.online'>admin@coreball.online</a>.</p>" +
        "</main>";
    },
    jsonLd() {
      return [
        breadcrumbSchema([["Home", "/"], ["About", "/about/"]]),
        aboutPageSchema("en", "/about/", "About CoreBall", "Independent fan-made Coreball-inspired browser game with 500 original levels."),
      ];
    },
  },

  {
    path: "/privacy/",
    file: "privacy/index.html",
    lang: "en",
    title: "Privacy Policy – CoreBall",
    description:
      "CoreBall privacy policy: what data the game stores locally, how analytics and advertising work, and how to contact us.",
    imageAlt: "CoreBall privacy policy.",
    main(site) {
      return "<main id='main' class='legal'>" +
        breadcrumbsHtml([["Home", "/"], ["Privacy", "/privacy/"]]) +
        "<h1>Privacy Policy</h1>" +
        "<p>Last updated: " + site.BUILD_DATE + "</p>" +
        "<h2>Overview</h2>" +
        "<p>CoreBall is a browser game that does not require an account. We do not ask for your name, email address, or any other personal information to play.</p>" +
        "<h2>Local Storage</h2>" +
        "<p>The game saves your unlocked level and sound setting in your browser's local storage. This data stays on your device and is not sent to our servers. You can clear it at any time through your browser settings.</p>" +
        "<h2>Analytics</h2>" +
        "<p>When enabled, the site uses Google Analytics 4 to understand basic, aggregated usage such as page views and game events (for example, starting or completing a level). Google may process your IP address as part of this service. Analytics is loaded asynchronously and does not block the game.</p>" +
        "<h2>Advertising</h2>" +
        "<p>When enabled, the site displays Google AdSense ads in clearly labeled slots that are kept away from game controls. Google and its partners may use cookies to serve ads based on your prior visits to this and other websites. Where required by law, a consent mechanism is provided before personalized advertising. You can opt out of personalized advertising through Google's Ads Settings.</p>" +
        "<h2>Cookies</h2>" +
        "<p>The game itself does not use cookies. Third-party services such as analytics or advertising may set cookies or use similar technologies in accordance with their own policies.</p>" +
        "<h2>Children</h2>" +
        "<p>This game is a general-audience puzzle game. It does not collect personal information from children.</p>" +
        "<h2>Changes</h2>" +
        "<p>We may update this policy as the site evolves. The latest version will always be posted on this page.</p>" +
        "<h2>Contact</h2>" +
        "<p>Questions about this policy: <a href='mailto:admin@coreball.online'>admin@coreball.online</a>.</p>" +
        "</main>";
    },
    jsonLd() {
      return [
        breadcrumbSchema([["Home", "/"], ["Privacy", "/privacy/"]]),
        webPageSchema("en", "/privacy/", "Privacy Policy", "CoreBall privacy policy."),
      ];
    },
  },

  {
    path: "/terms/",
    file: "terms/index.html",
    lang: "en",
    title: "Terms of Use – CoreBall",
    description:
      "CoreBall terms of use: using the free browser game, intellectual property, warranties, and limitations of liability.",
    imageAlt: "CoreBall terms of use.",
    main(site) {
      return "<main id='main' class='legal'>" +
        breadcrumbsHtml([["Home", "/"], ["Terms", "/terms/"]]) +
        "<h1>Terms of Use</h1>" +
        "<p>Last updated: " + site.BUILD_DATE + "</p>" +
        "<h2>Acceptance</h2>" +
        "<p>By using CoreBall, you agree to these terms. If you do not agree, please do not use the site.</p>" +
        "<h2>The Service</h2>" +
        "<p>CoreBall is a free browser game provided as-is for personal, non-commercial entertainment. No account, purchase, or download is required.</p>" +
        "<h2>Intellectual Property</h2>" +
        "<p>The site's original code, level data, text, and graphics belong to the site operator. Coreball-style gameplay mechanics are not owned by this site, and this site is not affiliated with any original Coreball publisher or trademark holder.</p>" +
        "<h2>Acceptable Use</h2>" +
        "<p>Do not attempt to disrupt the site, scrape or republish its content, or use automated tools to interfere with the game or its advertising.</p>" +
        "<h2>No Warranties</h2>" +
        "<p>The game is provided without warranties of any kind. We work to keep it available and compatible with modern browsers, but we do not guarantee uninterrupted or error-free operation.</p>" +
        "<h2>Limitation of Liability</h2>" +
        "<p>To the maximum extent permitted by law, the site operator is not liable for indirect, incidental, or consequential damages arising from use of the site.</p>" +
        "<h2>Changes</h2>" +
        "<p>These terms may change. Continued use after a change means you accept the updated terms.</p>" +
        "<h2>Contact</h2>" +
        "<p>Questions: <a href='mailto:admin@coreball.online'>admin@coreball.online</a>.</p>" +
        "</main>";
    },
    jsonLd() {
      return [
        breadcrumbSchema([["Home", "/"], ["Terms", "/terms/"]]),
        webPageSchema("en", "/terms/", "Terms of Use", "CoreBall terms of use."),
      ];
    },
  },
];
