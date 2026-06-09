/* ----------------------------------------------------------------------------
 * SITE CONFIG — edit this object to change all copy + links across the site.
 *
 * The site is bilingual. Top-level keys are the English copy (default).
 * `ja` mirrors the same keys with TODO_JA_* placeholders — fill those in to
 * make the Japanese version real. The JP/EN toggle in the top-right flips
 * between them with a glitch animation.
 *
 * TODO_ markers (English) and TODO_JA_ markers (Japanese) are placeholders
 * you should replace before going live.
 * -------------------------------------------------------------------------- */
window.SITE_CONFIG = {

  /* ===== English (default) ===== */
  name: "TODO_NAME",                                  // e.g. "Shunsuke Indy"
  roleLabel: "Interactive Designer & Creative Technologist",
  eyebrow: "Tokyo · Bilingual JP / EN",
  bio: "TODO_ONE_LINE_BIO",

  // Editorial / status
  available: true,
  availableLabel: "Available for work",
  coordinates: "35.6762°N · 139.6503°E",

  // About
  about: "TODO_ABOUT_2_3_SENTENCES",
  aboutImageAlt: "Portrait — replace with your studio / working-element shot",
  aboutImageSrc: "",

  // Capabilities — `detail` is an optional one-liner revealed on hover (desktop)
  capabilities: [
    { title: "UX / UI Design",            note: "Clean, intentional product interfaces.",                        detail: "From brief to ship — flows, systems, prototypes." },
    { title: "Motion & Animation",        note: "Purposeful motion, never decorative.",                          detail: "GSAP, Lottie, scroll choreography, micro-states." },
    { title: "Brand & Visual Identity",   note: "Bespoke design systems, made with pro tools.",                  detail: "Figma, Framer, Cinema 4D — hand-tuned to your world." },
    { title: "Front-end Build",           note: "Shipped with Claude Code — fast, semantic, accessible.",        detail: "Static & framework sites, performance-first." }
  ],

  // Contact
  email: "TODO_EMAIL@example.com",
  ctaLabel: "Start a project",

  // Nav labels
  navCaps:    "Capabilities",
  navAbout:   "About",
  navContact: "Contact",

  // Section labels (numbered eyebrows + display titles)
  capsEyebrow:  "01 — Capabilities",
  capsTitle:    "What I can be hired for.",
  aboutEyebrow: "02 — About",
  aboutTitle:   "A short story.",
  contactEyebrow: "03 — Contact",
  contactTitle:   "Let's build something quiet and loud.",

  // Footer
  backToTopLabel: "Back to top",
  credit: "Designed & built with Claude Code + TouchDesigner",

  // Toggle labels (top-right JP/EN switch)
  langLabelEN: "EN",
  langLabelJP: "JP",
  langAria: "Switch site language",

  // Links — leave a url empty string ("") or TODO_ to hide that link
  links: [
    { label: "GitHub / Portfolio",         url: "https://shunindy9.github.io/lemon-king-library" },
    { label: "Lemon King · Tokyo Analog",  url: "TODO_LEMON_KING_URL" },
    { label: "LinkedIn",                   url: "TODO_LINKEDIN_URL" }
  ],

  /* ===== Japanese — fill in to enable the JP toggle ===== */
  ja: {
    name:            "TODO_JA_NAME",
    roleLabel:       "TODO_JA_ROLE_LABEL",
    eyebrow:         "東京 · 日英バイリンガル",
    bio:             "TODO_JA_BIO",

    availableLabel:  "ご依頼受付中",
    coordinates:     "北緯35.6762° · 東経139.6503°",

    navCaps:    "提供スキル",
    navAbout:   "プロフィール",
    navContact: "お問い合わせ",

    about:           "TODO_JA_ABOUT",

    capabilities: [
      { title: "TODO_JA_CAP1_TITLE", note: "TODO_JA_CAP1_NOTE", detail: "TODO_JA_CAP1_DETAIL" },
      { title: "TODO_JA_CAP2_TITLE", note: "TODO_JA_CAP2_NOTE", detail: "TODO_JA_CAP2_DETAIL" },
      { title: "TODO_JA_CAP3_TITLE", note: "TODO_JA_CAP3_NOTE", detail: "TODO_JA_CAP3_DETAIL" },
      { title: "TODO_JA_CAP4_TITLE", note: "TODO_JA_CAP4_NOTE", detail: "TODO_JA_CAP4_DETAIL" }
    ],

    ctaLabel:        "プロジェクトを始める",

    capsEyebrow:     "01 — 提供スキル",
    capsTitle:       "TODO_JA_CAPS_TITLE",
    aboutEyebrow:    "02 — プロフィール",
    aboutTitle:      "TODO_JA_ABOUT_TITLE",
    contactEyebrow:  "03 — お問い合わせ",
    contactTitle:    "TODO_JA_CONTACT_TITLE",

    backToTopLabel:  "トップへ戻る",
    credit:          "Claude Code + TouchDesigner で設計・構築",

    links: [
      { label: "GitHub / ポートフォリオ",       url: "https://shunindy9.github.io/lemon-king-library" },
      { label: "Lemon King · Tokyo Analog",    url: "TODO_LEMON_KING_URL" },
      { label: "LinkedIn",                     url: "TODO_LINKEDIN_URL" }
    ]
  }
};
