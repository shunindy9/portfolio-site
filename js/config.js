/* ----------------------------------------------------------------------------
 * SITE CONFIG — edit this object to change all copy + links across the site.
 *
 * Top-level keys = English copy (default).
 * `ja` mirrors the same keys with Japanese copy. The JP/EN toggle in the
 * top-right flips between them with a glitch animation. Any key missing from
 * `ja` falls through to the English value.
 *
 * Anything starting with TODO_ is a placeholder Shunsuke still needs to fill
 * in (social URLs). Link entries with a TODO_ URL are hidden from the rendered
 * link list automatically.
 * -------------------------------------------------------------------------- */
window.SITE_CONFIG = {

  /* ===== English (default) ===== */
  name:      "Shunsuke Otsuki",
  siteMark:  "Shunsuke Otsuki",
  roleLabel: "Creative Director · Designer · Technologist · Tokyo",
  eyebrow:   "Restrained by default. Loud when it counts.",
  bio:       "Design, motion, and sound — built in Tokyo, made to feel analog.",

  // Editorial / status
  available: true,
  availableLabel: "Available for work — 2026",
  coordinates: "35.6762°N · 139.6503°E",

  // About — multi-paragraph; split on \n\n at render time would be ideal,
  // but the existing renderer drops it into a single <p>. Joined with a
  // sentence break for now; one block reads cleanly under the title.
  about:
    "I'm Shunsuke — a creative director, designer, and technologist based in Tokyo. " +
    "I grew up between two languages and two instincts: the precision of design and the warmth of analog sound. Most of my work lives in that overlap — restrained, cinematic, built to feel like Tokyo after midnight. " +
    "I treat process as the product. A film, a site, an identity, a score — each one gets sourced, used, documented, and shaped until it earns its quiet, then its loud. References run from Massive Attack and Portishead to DJ Shadow and the hiss of 70s tape. " +
    "I work in English and Japanese, with artists, labels, and brands building things meant to be felt.",
  aboutImageAlt: "Shunsuke Otsuki — studio portrait",
  aboutImageSrc: "",

  // Capabilities — title + one-line description (note) + deliverables (detail)
  capabilities: [
    {
      title:  "Creative Direction & Content",
      note:   "Cinematic and restrained, built to be felt. I direct content that makes the process the story — gear, hands, and Tokyo light over talking heads. Concept to final cut.",
      detail: "Concepts & treatments · Short films & brand documentaries · Content series & systems · On-set art direction"
    },
    {
      title:  "Interactive & Web Design",
      note:   "Sites and interactive work that move like analog — slow-building, deliberate, with a payoff. Designed and built end to end (this site is one of them).",
      detail: "Brand & portfolio sites · Interaction & motion design · Front-end build · Design-to-build handoff"
    },
    {
      title:  "Brand & Art Direction",
      note:   "Visual identity for music, culture, and the underground. Analog warmth, restraint, and a point of view — systems recognizable in three seconds.",
      detail: "Visual identity & logo · Art direction · Release & cover visuals · Brand guidelines"
    },
    {
      title:  "Music & Sound",
      note:   "Original score and sound design — analog psychedelic trip-hop: tape saturation, slow builds, climactic drops. Composition, sample packs, and sonic identity.",
      detail: "Score & soundtrack commissions · Sound design · Sample packs · Sonic branding"
    }
  ],

  // Contact
  email:        "shun.indy@gmail.com",
  ctaLabel:     "Start a project",
  contactIntro:
    "Have a project, a release, or a brand that should feel like something? I take on a few commissions and collaborations at a time. Tell me what you're making.",

  // Nav labels
  navCaps:    "Capabilities",
  navAbout:   "About",
  navContact: "Contact",

  // Section labels
  capsEyebrow:    "01 — Capabilities",
  capsTitle:      "What I can be hired for.",
  aboutEyebrow:   "02 — About",
  aboutTitle:     "A short story.",
  contactEyebrow: "03 — Contact",
  contactTitle:   "Let's build something quiet and loud.",

  // Footer
  backToTopLabel: "Back to top",
  credit:         "Designed & built in Tokyo.",

  // Toggle labels (top-right JP/EN switch)
  langLabelEN: "EN",
  langLabelJP: "JP",
  langAria:    "Switch site language",

  // Links — Email is always rendered (uses CONFIG.email above). Socials use
  // TODO_ URLs so they stay hidden until Shunsuke fills them in.
  links: [
    { label: "Instagram", url: "TODO_INSTAGRAM_URL" },  // FILL IN
    { label: "Bandcamp",  url: "TODO_BANDCAMP_URL"  },  // FILL IN
    { label: "YouTube",   url: "TODO_YOUTUBE_URL"   }   // FILL IN
  ],

  /* ===== Japanese =====
   * Localized — not translated literally. Designer-industry register:
   *  - subject pronouns dropped; sentences land on nouns (体言止め) where
   *    the EN lands on adjectives or verbs.
   *  - JP long-dash 「─」 replaces the EN em-dash「—」.
   *  - "Loud / feel" is varied per context (鳴り響く / 心を動かす / 届く /
   *    手触り) instead of one repeated literal verb.
   *  - Kana / kanji balance tuned for design/music industry copy. */
  ja: {
    name:      "Shunsuke Otsuki",
    siteMark:  "Shunsuke Otsuki",
    roleLabel: "クリエイティブディレクター／デザイナー／テクノロジスト · 東京",
    eyebrow:   "ふだんは、抑えて。鳴らすときは、鳴らす。",
    bio:       "デザイン、モーション、サウンド。東京で、アナログの手触りで作る。",

    availableLabel: "2026年 ご依頼受付中",
    coordinates:    "北緯35.6762° · 東経139.6503°",

    navCaps:    "提供スキル",
    navAbout:   "プロフィール",
    navContact: "お問い合わせ",

    about:
      "東京を拠点に、クリエイティブディレクション／デザイン／テクノロジーを横断して活動。" +
      "二つの言語と、二つの感覚のあいだで育ちました ─ デザインの精度と、アナログサウンドの温度。" +
      "仕事の多くは、その交差点にあります。抑制された、シネマティックな、真夜中の東京のような手触り。" +
      "プロセスそのものを、作品として扱います。映像も、サイトも、アイデンティティも、楽曲も。" +
      "素材を集め、使い、記録し、形にしていく。静けさを獲得し、やがて鳴り響くまで。" +
      "引き出しは Massive Attack、Portishead、DJ Shadow、そして70年代テープのヒスから。" +
      "英語と日本語の両方で、心を動かすものを作るアーティスト、レーベル、ブランドと共に。",

    capabilities: [
      {
        title:  "クリエイティブディレクション／コンテンツ",
        note:   "シネマティックで、抑制された ─ 心に届くコンテンツを。語りより、機材、手元、東京の光に物語らせる。企画から最終編集まで。",
        detail: "コンセプト／トリートメント · ショートフィルム／ブランドドキュメンタリー · コンテンツシリーズ／システム · 現場アートディレクション"
      },
      {
        title:  "インタラクティブ／ウェブデザイン",
        note:   "アナログのように、ゆっくり積み重ね、しっかり着地するウェブ体験。設計から実装まで、一貫してつくります（このサイトもそのひとつ）。",
        detail: "ブランド／ポートフォリオサイト · インタラクション／モーションデザイン · フロントエンド実装 · デザインから実装へのハンドオフ"
      },
      {
        title:  "ブランディング／アートディレクション",
        note:   "音楽、カルチャー、アンダーグラウンドのためのビジュアル・アイデンティティ。アナログの温度、抑制、そして視点 ─ 3秒で見分けがつくシステム。",
        detail: "ビジュアルアイデンティティ／ロゴ · アートディレクション · リリース／カバービジュアル · ブランドガイドライン"
      },
      {
        title:  "音楽／サウンド",
        note:   "オリジナルスコアと、サウンドデザイン。アナログ・サイケデリックなトリップホップ ─ テープの飽和、ゆっくりと積み上がる構成、確かな落としどころ。作曲、サンプルパック、サウンドアイデンティティまで。",
        detail: "スコア／サウンドトラック制作 · サウンドデザイン · サンプルパック · ソニックブランディング"
      }
    ],

    ctaLabel:     "プロジェクトを始める",
    contactIntro: "心を動かしたいプロジェクト、リリース、ブランド ─ お持ちですか。受けられる数を絞って、丁寧にご一緒しています。いま手がけているものを、聞かせてください。",

    capsEyebrow:    "01 — 提供スキル",
    capsTitle:      "ご相談いただける領域。",
    aboutEyebrow:   "02 — プロフィール",
    aboutTitle:     "ちいさな自己紹介。",
    contactEyebrow: "03 — お問い合わせ",
    contactTitle:   "静けさと、確かな鳴り響きを、共に。",

    backToTopLabel: "トップへ戻る",
    credit:         "東京で制作。",

    links: [
      { label: "Instagram", url: "TODO_INSTAGRAM_URL" },
      { label: "Bandcamp",  url: "TODO_BANDCAMP_URL"  },
      { label: "YouTube",   url: "TODO_YOUTUBE_URL"   }
    ]
  }
};
