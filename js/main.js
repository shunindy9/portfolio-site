/* ----------------------------------------------------------------------------
 * main.js — bind CONFIG into the DOM, choreograph the hero, drive scroll
 * choreography (Lenis + ScrollTrigger), and the small editorial details.
 * Vanilla JS. GSAP, ScrollTrigger, Lenis loaded via CDN (optional fallbacks).
 * -------------------------------------------------------------------------- */
(function () {
  const CONFIG = window.SITE_CONFIG || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasHover     = window.matchMedia("(hover: hover)").matches;

  const q  = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ============================================================
   * DIAGONAL STAGE — module state shared by reveals, anchors,
   * shader-zoom, and the section pager.
   * ============================================================ */
  const _panelIds = ["hero", "capabilities", "about", "contact"];
  let _diagonalTL = null;
  let _diagonalST = null;
  let _stageEl    = null;

  /* ============================================================
   * I18N — string lookup. CONFIG holds English; CONFIG.ja mirrors keys
   * for Japanese with TODO_JA_* placeholders. Missing JA keys fall back to EN.
   * ============================================================ */
  let currentLang = "en";

  function getStrings(lang) {
    if (lang === "ja" && CONFIG.ja) {
      return new Proxy(CONFIG.ja, {
        get(t, k) {
          const v = t[k];
          return (v !== undefined && v !== null) ? v : CONFIG[k];
        }
      });
    }
    return CONFIG;
  }

  /* ============================================================
   * BIND COPY + LINKS — applyStrings rebinds everything for a language.
   * Safe to call multiple times (idempotent).
   * ============================================================ */
  function setBoundText(sel, value) {
    qa(`[data-bind="${sel}"]`).forEach(el => { el.textContent = value; });
  }

  // Cached references — never re-rebuilt across renders
  const markEl     = q('[data-bind="name-mark"]');
  const statusEl   = q('[data-bind="status"]');
  const aboutMedia = q('[data-bind="about-media"]');
  const capList    = q('[data-bind="capabilities"]');
  const ctaEl      = q('[data-bind="cta-email"]');
  const linkRow    = q('[data-bind="links"]');
  const footerEmail = q('[data-bind="footer-email"]');
  const wm         = q('[data-bind="footer-wordmark"]');

  function applyStrings(lang) {
    const S = getStrings(lang);

    // Hero / nav / sections / footer — simple text binds
    setBoundText("eyebrow",        S.eyebrow || "");
    setBoundText("name",           S.name || "");
    setBoundText("roleLabel",      S.roleLabel || "");
    setBoundText("bio",            S.bio || "");
    setBoundText("coordinates",    S.coordinates || "");
    setBoundText("about",          S.about || "");
    setBoundText("navCaps",        S.navCaps || "Capabilities");
    setBoundText("navAbout",       S.navAbout || "About");
    setBoundText("navContact",     S.navContact || "Contact");
    setBoundText("capsEyebrow",    S.capsEyebrow || "");
    setBoundText("capsTitle",      S.capsTitle || "");
    setBoundText("aboutEyebrow",   S.aboutEyebrow || "");
    setBoundText("aboutTitle",     S.aboutTitle || "");
    setBoundText("contactEyebrow", S.contactEyebrow || "");
    setBoundText("contactTitle",   S.contactTitle || "");
    setBoundText("contactIntro",   S.contactIntro || "");
    setBoundText("backToTopLabel", S.backToTopLabel || "");
    setBoundText("credit",         S.credit || "");
    setBoundText("langLabelEN",    S.langLabelEN || "EN");
    setBoundText("langLabelJP",    S.langLabelJP || "JP");

    // Site mark — explicit `siteMark` overrides; otherwise full name (max 24).
    if (markEl) {
      const mark = (S.siteMark && !String(S.siteMark).startsWith("TODO_"))
        ? S.siteMark
        : (S.name || "").slice(0, 24);
      markEl.textContent = mark;
    }

    // Status
    if (statusEl && S.available !== false && CONFIG.available !== false) {
      const label = statusEl.querySelector(".status__label");
      if (label) label.textContent = S.availableLabel || "";
      statusEl.hidden = false;
    }

    // About image (only set once)
    if (aboutMedia && S.aboutImageSrc && !aboutMedia.querySelector("img")) {
      const img = document.createElement("img");
      img.src = S.aboutImageSrc;
      img.alt = S.aboutImageAlt || "";
      aboutMedia.appendChild(img);
    }

    // Capabilities — rebuild
    if (capList && Array.isArray(S.capabilities)) {
      capList.innerHTML = S.capabilities.map((c, i) => `
        <li class="cap-grid__item reveal-on-scroll is-in" style="opacity:1;transform:none;--shimmer-i:${i}">
          <span class="cap-grid__num">0${i + 1}</span>
          <div class="cap-grid__row">
            <h3 class="cap-grid__title">${escapeHTML(c.title)}</h3>
            <span class="cap-grid__arrow" aria-hidden="true">↗</span>
          </div>
          <p class="cap-grid__note">${escapeHTML(c.note)}</p>
          ${c.detail ? `<p class="cap-grid__detail">${escapeHTML(c.detail)}</p>` : ""}
        </li>
      `).join("");
    }

    // CTA
    if (ctaEl && CONFIG.email) {
      ctaEl.href = `mailto:${CONFIG.email}`;
      ctaEl.textContent = S.ctaLabel || "Get in touch";
    }

    // Social-proof links
    if (linkRow && Array.isArray(S.links)) {
      linkRow.innerHTML = S.links
        .filter(l => l.url && !String(l.url).startsWith("TODO_"))
        .map(l => `<li><a href="${escapeAttr(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(l.label)}</a></li>`)
        .join("");
    }

    // Footer email — same in both languages
    if (footerEmail && CONFIG.email) {
      footerEmail.href = `mailto:${CONFIG.email}`;
      footerEmail.textContent = CONFIG.email;
    }
    setBoundText("year", new Date().getFullYear().toString());

    // Footer wordmark — uses English name (artist identity, not translated)
    if (wm) {
      const base = (CONFIG.name && !CONFIG.name.startsWith("TODO_")) ? CONFIG.name : "Tokyo Analog";
      wm.textContent = (base + "  •  ").repeat(4).trim();
    }

    // HTML lang attribute for accessibility
    document.documentElement.lang = (lang === "ja") ? "ja" : "en";
  }

  // Initial render — English
  applyStrings("en");

  /* ============================================================
   * GLITCH TRANSLATE — char scramble + RGB split + scanline overlay.
   * Selectors below cover all visible translatable text. Non-translatable
   * elements (clock, year, site-mark, email, the toggle labels themselves)
   * are intentionally excluded.
   * ============================================================ */
  const GLITCH_DURATION_MS = 700;
  const SCRAMBLE_POOL =
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "abcdefghijklmnopqrstuvwxyz" +
    "0123456789#%&*+-=◇◆◢◤★▲▼■□";

  // CSS-class selectors for translatable text in the rebuilt lists.
  const DYNAMIC_TEXT_SELECTORS = [
    ".cap-grid__title", ".cap-grid__note", ".cap-grid__detail",
    ".link-row a"
  ];
  // data-bind keys that should NOT be glitched (numbers / static identifiers).
  const SKIP_BIND = new Set([
    "name-mark", "clock", "year", "cta-email", "footer-email",
    "footer-wordmark", "about-media", "status", "capabilities", "links",
    "langLabelEN", "langLabelJP" // toggle stays steady during transition
  ]);

  function collectGlitchTargets() {
    const seen = new Set();
    const out = [];
    qa("[data-bind]").forEach(el => {
      if (SKIP_BIND.has(el.dataset.bind)) return;
      if (!el.textContent.trim()) return;
      if (seen.has(el)) return;
      seen.add(el); out.push(el);
    });
    DYNAMIC_TEXT_SELECTORS.forEach(sel => {
      qa(sel).forEach(el => {
        if (seen.has(el)) return;
        seen.add(el); out.push(el);
      });
    });
    return out;
  }

  function scrambleToward(el, finalText, duration) {
    el.classList.add("glitching");
    const start = performance.now();
    const len = finalText.length;

    function step() {
      const elapsed = performance.now() - start;
      if (elapsed >= duration) {
        el.textContent = finalText;
        el.classList.remove("glitching");
        return;
      }
      const t = elapsed / duration;
      let out = "";
      for (let i = 0; i < len; i++) {
        const ch = finalText[i];
        if (ch === " " || ch === "\n" || ch === "\t") {
          out += ch;
        } else if (t > (i / Math.max(1, len)) * 0.85 + 0.12) {
          out += ch;
        } else {
          out += SCRAMBLE_POOL[(Math.random() * SCRAMBLE_POOL.length) | 0];
        }
      }
      el.textContent = out;
      requestAnimationFrame(step);
    }
    step();
  }

  function setLang(lang) {
    if (lang === currentLang) return;
    currentLang = lang;

    // Update toggle UI state
    const tog = q(".lang-toggle");
    if (tog) tog.dataset.state = lang;
    qa(".lang-toggle__btn").forEach(b => {
      b.setAttribute("aria-pressed", b.dataset.lang === lang ? "true" : "false");
    });

    if (reduceMotion) {
      applyStrings(lang);
      return;
    }

    // Apply new strings FIRST, then glitch each target back to its final text.
    applyStrings(lang);
    document.body.classList.add("is-translating");

    const targets = collectGlitchTargets();
    targets.forEach(el => {
      // Snapshot the now-current (new-language) text, then scramble toward it.
      const finalText = el.textContent;
      // Per-element duration variance for a less mechanical feel.
      const d = GLITCH_DURATION_MS * (0.85 + Math.random() * 0.35);
      scrambleToward(el, finalText, d);
    });

    setTimeout(() => {
      document.body.classList.remove("is-translating");
      qa(".glitching").forEach(el => el.classList.remove("glitching"));
    }, GLITCH_DURATION_MS + 200);
  }

  // Toggle wiring
  qa(".lang-toggle__btn").forEach(btn => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  /* ============================================================
   * THEME — dark / light. Inline head script already set
   * <html data-theme="..."> before first paint. This block keeps
   * the toggle UI in sync, persists explicit user choices, and
   * follows OS preference changes for users who haven't chosen.
   * ============================================================ */
  /* ----- Per-theme shader colors. Tweak these to change the background
   * plasma's hue / saturation / brightness for each theme. You can also
   * live-tweak from the browser console:
   *   shaderColor(hue, saturation, brightness)   // dial in a single value
   *   shaderColor(220, 0.45, 0.6)                // try cool blue
   * ------------------------------------------------------------------ */
  const SHADER_THEME = {
    dark:  { hue: 130, saturation: 0.62, brightness: 0.72, invert: 0 },  // neon green on black
    light: { hue: 135, saturation: 0.85, brightness: 1.10, invert: 1 }   // saturated green flow on white
  };

  function applyShaderTheme(theme) {
    const s = SHADER_THEME[theme];
    if (!s || !window.__heroShader) return;
    if (window.__heroShader.setHue)        window.__heroShader.setHue(s.hue);
    if (window.__heroShader.setSat)        window.__heroShader.setSat(s.saturation);
    if (window.__heroShader.setBrightness) window.__heroShader.setBrightness(s.brightness);
    if (window.__heroShader.setInvert)     window.__heroShader.setInvert(s.invert);
  }

  // Browser-console live tweaker. Example:
  //   shaderColor(60, 0.6, 0.7)   // warm amber, medium saturation
  //   shaderColor(280)            // just shift hue to violet
  window.shaderColor = function (hue, sat, brightness) {
    if (!window.__heroShader) return null;
    if (hue        != null) window.__heroShader.setHue(hue);
    if (sat        != null) window.__heroShader.setSat(sat);
    if (brightness != null) window.__heroShader.setBrightness(brightness);
    return window.__heroShader.getParams();
  };

  function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }
  function getStoredTheme() {
    try { return localStorage.getItem("portfolio-theme"); } catch (_) { return null; }
  }
  function storeTheme(v) {
    try { localStorage.setItem("portfolio-theme", v); } catch (_) {}
  }
  function syncThemeToggleUI() {
    const t = getCurrentTheme();
    const wrap = q(".theme-toggle");
    if (wrap) wrap.dataset.state = t;
    qa(".theme-toggle__btn").forEach(b => {
      b.setAttribute("aria-pressed", b.dataset.theme === t ? "true" : "false");
    });
  }
  function setTheme(theme, persist) {
    if (theme !== "dark" && theme !== "light") return;
    if (theme === getCurrentTheme()) return; // already in this theme
    document.documentElement.setAttribute("data-theme", theme);
    if (persist) storeTheme(theme);
    syncThemeToggleUI();

    // Shader stays mounted in both themes (light just dims it via opacity +
    // multiply). Push the per-theme shader colors so the background actively
    // reflects the theme, not just the foreground. Refresh viewport +
    // ScrollTrigger defensively in the next layout-stable frame.
    applyShaderTheme(theme);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (window.__heroShader && window.__heroShader.refresh) {
          window.__heroShader.refresh();
        } else {
          window.dispatchEvent(new Event("resize"));
        }
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    });
  }
  syncThemeToggleUI();
  applyShaderTheme(getCurrentTheme());
  qa(".theme-toggle__btn").forEach(btn => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme, true));
  });

  // Follow OS changes only if the user hasn't made an explicit choice.
  const osPref = window.matchMedia("(prefers-color-scheme: light)");
  if (osPref && osPref.addEventListener) {
    osPref.addEventListener("change", (e) => {
      if (getStoredTheme()) return;
      setTheme(e.matches ? "light" : "dark", false);
    });
  }

  /* ============================================================
   * LIVE JST CLOCK
   * ============================================================ */
  const clockEl = q('[data-bind="clock"]');
  if (clockEl) {
    const tick = () => {
      try {
        clockEl.textContent = new Date().toLocaleTimeString("en-GB", {
          timeZone: "Asia/Tokyo",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit"
        });
      } catch (_) {
        clockEl.textContent = "--:--";
      }
    };
    tick();
    setInterval(tick, 30000);
  }

  /* ============================================================
   * LENIS SMOOTH SCROLL  +  SCROLLTRIGGER BRIDGE
   * ============================================================ */
  let lenis = null;
  function initLenis() {
    if (reduceMotion || !window.Lenis) return;
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      smoothTouch: false
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (window.gsap && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    // Re-route in-page anchor links: panel anchors → diagonal stage progress
    // when the stage is active; other anchors → Lenis as usual.
    qa('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (!id || id === "#") return;

        const panelIdx = _panelIds.indexOf(id.slice(1));
        if (panelIdx >= 0 && _diagonalTL) {
          e.preventDefault();
          scrollToPanel(panelIdx);
          return;
        }

        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0, duration: 1.2 });
      });
    });
  }

  /* ============================================================
   * scrollToPanel — used by anchor handler + section pager.
   * In diagonal mode: scroll to the panel's progress fraction within
   * the pinned stage. In vertical mode: scrollTo the section element.
   * ============================================================ */
  function scrollToPanel(idx) {
    if (_diagonalTL && _diagonalST) {
      const targetProgress = idx / 3;
      const targetY = _diagonalST.start + (_diagonalST.end - _diagonalST.start) * targetProgress;
      if (lenis) lenis.scrollTo(targetY, { duration: 1.2 });
      else window.scrollTo({ top: targetY, behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      const el = document.getElementById(_panelIds[idx]);
      if (!el) return;
      if (lenis) lenis.scrollTo(el, { duration: 1.2 });
      else el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  /* ============================================================
   * HERO ENTRANCE — masked reveals + role/bio
   * ============================================================ */
  function runHeroEntrance() {
    document.body.classList.remove("is-loading");
    const inners = qa(".hero .mask__inner");
    if (!inners.length) return;

    if (reduceMotion || !window.gsap) {
      inners.forEach(el => { el.style.transform = "none"; });
      return;
    }

    gsap.set(inners, { yPercent: 110 });
    gsap.to(inners, {
      yPercent: 0,
      duration: 1.1,
      ease: "expo.out",
      stagger: 0.1,
      delay: 0.2,
      onComplete: () => {
        // Drop the overflow clip so char-dispersion isn't cut off on hover.
        qa(".hero .mask").forEach(m => { m.style.overflow = "visible"; });
      }
    });

    // The meta block (bottom-right) fades in last, quiet.
    const meta = q(".hero__meta");
    if (meta) {
      gsap.fromTo(meta, { opacity: 0, y: 8 }, {
        opacity: 1, y: 0, duration: 1.0, ease: "expo.out", delay: 0.9
      });
    }
    const cue = q(".scroll-cue");
    if (cue) {
      gsap.fromTo(cue, { opacity: 0, y: 8 }, {
        opacity: 1, y: 0, duration: 1.0, ease: "expo.out", delay: 1.0
      });
    }
  }

  /* ============================================================
   * SCROLL REVEALS — masked headings + fade-ups
   * ============================================================ */
  function runScrollReveals() {
    const masked  = qa(".section .section__title .mask__inner, .section .mask__inner");
    const targets = qa(".reveal-on-scroll");

    if (reduceMotion) {
      targets.forEach(el => el.classList.add("is-in"));
      masked.forEach(el => { el.style.transform = "none"; });
      return;
    }

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      // Diagonal mode: pre-reveal everything since elements live inside a
      // pinned/transformed stage and don't intersect the window viewport in
      // the way ScrollTrigger expects. The shimmer rings + entrance already
      // give each panel its own grand-arrival feel.
      if (_diagonalTL) {
        masked.forEach(el => gsap.set(el, { yPercent: 0 }));
        targets.forEach(el => {
          el.style.opacity = "1";
          el.style.transform = "none";
          el.classList.add("is-in");
        });
        return;
      }

      masked.forEach(el => {
        gsap.fromTo(el,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 1.1,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true }
          }
        );
      });

      targets.forEach(el => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onStart: () => el.classList.add("is-in")
        });
      });
      return;
    }

    // Fallback: IntersectionObserver — no GSAP available.
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        const inner = e.target.querySelector ? e.target.querySelector(".mask__inner") : null;
        if (inner) inner.style.transform = "translateY(0)";
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    [...targets, ...qa(".section .mask")].forEach(el => io.observe(el));
  }

  /* ============================================================
   * MAGNETIC BUTTONS — eases toward cursor on hover
   * ============================================================ */
  function initMagnetic() {
    if (reduceMotion || !hasHover || !window.gsap) return;
    qa("[data-magnetic]").forEach(el => {
      const setX = gsap.quickTo(el, "x", { duration: 0.6, ease: "expo.out" });
      const setY = gsap.quickTo(el, "y", { duration: 0.6, ease: "expo.out" });
      const STRENGTH = 0.35;
      const RADIUS   = 120;

      el.addEventListener("pointermove", (e) => {
        const rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width  / 2);
        const dy = e.clientY - (rect.top  + rect.height / 2);
        const dist = Math.hypot(dx, dy);
        // Falloff: full pull near center, zero outside the radius.
        const k = Math.max(0, 1 - dist / RADIUS) * STRENGTH;
        setX(dx * k);
        setY(dy * k);
      });
      el.addEventListener("pointerleave", () => { setX(0); setY(0); });
    });
  }

  /* ============================================================
   * WORDMARK PARALLAX — pulled along the cursor at a soft offset
   * ============================================================ */
  function initWordmarkParallax() {
    if (reduceMotion || !hasHover || !window.gsap) return;
    const inner = q(".hero__inner");
    if (!inner) return;
    const amt = parseFloat(inner.getAttribute("data-parallax") || "0.04");
    const xTo = gsap.quickTo(inner, "x", { duration: 0.9, ease: "expo.out" });
    const yTo = gsap.quickTo(inner, "y", { duration: 0.9, ease: "expo.out" });

    window.addEventListener("pointermove", (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      const nx = (e.clientX / w) - 0.5;
      const ny = (e.clientY / h) - 0.5;
      xTo(nx * w * amt);
      yTo(ny * h * amt * 0.6);
    }, { passive: true });
  }

  /* ============================================================
   * SHADER BACKGROUND — promote the hero shader to a permanent
   * body-level fixed backdrop so it's the whole-page background, not
   * just the first viewport. Runs on every layout mode.
   * ============================================================ */
  function mountShaderBackground() {
    const heroVisual = document.querySelector(".hero__visual");
    if (!heroVisual) return;
    // Skip if already mounted (e.g. from a hot reload).
    const parent = heroVisual.parentElement;
    if (parent && parent.classList.contains("hero__visual-host")) return;

    const host = document.createElement("div");
    host.className = "hero__visual-host";
    host.appendChild(heroVisual);
    document.body.insertBefore(host, document.body.firstChild);

    // Nudge the WebGL canvas to recompute its size in its new fixed host.
    if (window.__heroShader && window.__heroShader.refresh) {
      window.__heroShader.refresh();
    } else {
      window.dispatchEvent(new Event("resize"));
    }
  }

  /* ============================================================
   * DIAGONAL STAGE — desktop-only camera-pan navigation.
   * Wraps the four panels in a stage, pins it for 300vh of scroll budget,
   * and zigzag-translates the camera so each section enters from the
   * opposite corner.  Mobile / reduced-motion / no-GSAP → no-op.
   * ============================================================ */
  function initDiagonalStage() {
    const mq = window.matchMedia("(min-width: 1024px)").matches;
    if (!mq || reduceMotion || !window.gsap || !window.ScrollTrigger) return;

    const main = document.getElementById("main");
    if (!main) return;

    const sections = _panelIds.map(id => document.getElementById(id));
    if (sections.some(s => !s)) return;

    // Wrap the four panels in a stage.
    const stage = document.createElement("div");
    stage.className = "diagonal-stage";
    main.insertBefore(stage, sections[0]);
    sections.forEach(s => stage.appendChild(s));

    // Canvas was already moved to a body-level host by mountShaderBackground().
    // Diagonal mode just opts in to the transformed stage on top.

    document.body.classList.add("is-diagonal");
    _stageEl = stage;

    // Nudge the WebGL canvas to recompute its size in the new fixed host.
    window.dispatchEvent(new Event("resize"));

    gsap.registerPlugin(ScrollTrigger);

    // Lock the starting transform so GSAP records (0, 0) as the timeline origin.
    gsap.set(stage, { x: 0, y: 0, force3D: true });

    // Drive transforms directly from scroll progress. The zigzag path is a
    // sequence of (x, y) waypoints in viewport units; we lerp between them.
    const lerp = (a, b, t) => a + (b - a) * t;
    const xSetter = gsap.quickSetter(stage, "x", "px");
    const ySetter = gsap.quickSetter(stage, "y", "px");

    const waypoints = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return [
        { x: 0,         y: 0      },
        { x: -w * 0.5,  y: -h     },
        { x:  w * 0.5,  y: -h * 2 },
        { x: -w * 0.5,  y: -h * 3 }
      ];
    };
    let pts = waypoints();
    let smoothedProgress = 0;

    // Initial paint at progress 0.
    xSetter(0); ySetter(0);

    _diagonalST = ScrollTrigger.create({
      id: "diagonal",
      trigger: stage,
      pin: true,
      start: "top top",
      end: "+=300%",
      anticipatePin: 1,
      invalidateOnRefresh: true,
      snap: {
        snapTo: [0, 1/3, 2/3, 1],
        duration: { min: 0.25, max: 0.7 },
        ease: "expo.out"
      },
      onRefresh: () => { pts = waypoints(); },
      onUpdate: (self) => {
        // Manual scrub smoothing — lerp the rendered progress toward the
        // ScrollTrigger's reported progress for a weighted feel.
        const target = self.progress;
        smoothedProgress += (target - smoothedProgress) * 0.18;
        const p = smoothedProgress;
        const seg = Math.min(2, Math.floor(p * 3));
        const t   = (p * 3) - seg;
        const a = pts[seg];
        const b = pts[seg + 1];
        xSetter(lerp(a.x, b.x, t));
        ySetter(lerp(a.y, b.y, t));
      }
    });

    // Keep smoothing alive while scroll is idle (so it converges to snap point).
    gsap.ticker.add(() => {
      if (!_diagonalST) return;
      const target = _diagonalST.progress;
      if (Math.abs(target - smoothedProgress) < 1e-4) return;
      smoothedProgress += (target - smoothedProgress) * 0.18;
      const p = smoothedProgress;
      const seg = Math.min(2, Math.floor(p * 3));
      const t   = (p * 3) - seg;
      const a = pts[seg];
      const b = pts[seg + 1];
      xSetter(lerp(a.x, b.x, t));
      ySetter(lerp(a.y, b.y, t));
    });

    // Surface a fake `progress` getter for the existing code that references
    // _diagonalST.progress and scrollToPanel math.
    _diagonalTL = { __direct: true }; // marker so reveals/anchors know diagonal mode is on
  }

  /* ============================================================
   * SECTION PAGER — fixed-right dot column showing current panel.
   * Clicks scroll to that panel. Desktop diagonal mode only.
   * ============================================================ */
  function initSectionPager() {
    const dots = qa(".section-pager__dot");
    if (!dots.length) return;

    const setActive = (idx) => {
      dots.forEach((d, i) => d.classList.toggle("is-active", i === idx));
    };

    dots.forEach(dot => {
      dot.addEventListener("click", () => {
        const idx = parseInt(dot.dataset.section, 10) || 0;
        scrollToPanel(idx);
      });
    });

    if (!_diagonalTL || !window.ScrollTrigger) {
      setActive(0);
      return;
    }

    let lastIdx = -1;
    const update = (p) => {
      let idx;
      if      (p < 0.166) idx = 0;
      else if (p < 0.500) idx = 1;
      else if (p < 0.833) idx = 2;
      else                idx = 3;
      setActive(idx);
      if (idx !== lastIdx) {
        const prev = lastIdx;
        lastIdx = idx;
        if (prev !== -1) glitchPanel(idx);  // skip first paint
      }
    };

    ScrollTrigger.create({
      trigger: _stageEl,
      start: "top top",
      end: "+=300%",
      onUpdate: (self) => update(self.progress)
    });
    update(0);
  }

  /* ============================================================
   * GLITCH PANEL — fires on every diagonal panel arrival.
   * Reuses the JP/EN translate engine (char-scramble + RGB split +
   * scanline shimmer) so section transitions feel like part of the
   * same motion language.
   * ============================================================ */
  function glitchPanel(idx) {
    if (reduceMotion) return;
    const id = _panelIds[idx];
    const root = document.getElementById(id);
    if (!root) return;

    // RGB neon strobe — flashes the panel's heading + eyebrow in cycling neon
    // colors for ~2 seconds on arrival. Sits ON TOP of the existing scramble
    // so the words simultaneously decode AND glow.
    const NEON_DURATION = 2000;
    const neonTargets = qa(".section__title, .hero__name, .eyebrow, .cap-grid__title", root);
    neonTargets.forEach(el => {
      el.classList.remove("neon-strobe");
      // Force restart by reading offsetWidth between remove + add.
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add("neon-strobe");
    });
    setTimeout(() => {
      neonTargets.forEach(el => el.classList.remove("neon-strobe"));
    }, NEON_DURATION + 50);

    // What to glitch inside the target panel. The hero's wordmark mask__inner
    // is excluded — it contains per-char .char spans for the dispersion
    // effect, and a textContent scramble would wipe them.
    const selectors = [
      ".eyebrow",
      ".section__title .mask__inner",
      ".hero__role",
      ".hero__bio",
      ".about__text",
      ".cap-grid__title",
      ".cap-grid__note",
      ".cap-grid__detail",
      ".cta"
    ];
    const targets = [];
    selectors.forEach(sel => {
      qa(sel, root).forEach(el => {
        if (!el.textContent.trim()) return;
        if (root.id === "hero" && el.closest(".hero__name")) return;
        targets.push(el);
      });
    });
    if (!targets.length) return;

    document.body.classList.add("is-translating");
    targets.forEach(el => {
      const finalText = el.textContent;
      const d = GLITCH_DURATION_MS * (0.7 + Math.random() * 0.35);
      scrambleToward(el, finalText, d);
    });
    setTimeout(() => {
      document.body.classList.remove("is-translating");
      qa(".glitching", root).forEach(el => el.classList.remove("glitching"));
    }, GLITCH_DURATION_MS + 200);
  }

  /* ============================================================
   * SHADER ZOOM — drives the hero shader's uZoom uniform from the page's
   * scroll progress (1.6 at top → 3.2 at bottom). Works in both layout
   * modes; in diagonal mode the trigger is the pinned stage; in vertical
   * mode the trigger is the document. Reduced-motion → static.
   * ============================================================ */
  function initShaderZoom() {
    if (reduceMotion) return;
    if (!window.gsap || !window.ScrollTrigger || !window.__heroShader) return;
    gsap.registerPlugin(ScrollTrigger);

    // The shader uses `uv *= uZoom`, so HIGHER uZoom = the camera samples
    // a WIDER noise field = features get smaller (zoom OUT) AND the vignette
    // tightens to near-black. That was the bug: zooming "in" to 4.6 made
    // the frame go dark. We want features to GROW (true push-in) so we
    // DECREASE uZoom from 1.6 → 0.55 with cubic ease-out. The vignette stays
    // open at low uZoom, so the plasma stays visible the whole scroll.
    const Z0 = 1.6;
    const Z1 = 0.55;
    const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);

    const cfg = {
      id: "shader-zoom",
      scrub: 0.3,
      onUpdate: (self) => {
        window.__heroShader.setZoom(Z0 + (Z1 - Z0) * easeOutCubic(self.progress));
      }
    };
    if (_diagonalTL && _stageEl) {
      cfg.trigger = _stageEl;
      cfg.start = "top top";
      cfg.end = "+=300%";
    } else {
      cfg.trigger = "body";
      cfg.start = "top top";
      cfg.end = "bottom bottom";
    }
    ScrollTrigger.create(cfg);
  }

  /* ============================================================
   * PULSE-BEAMS — warm-neon ring around CTA + Back-to-top.
   * Measures each wrapper, draws a pill path matching its shape,
   * and animates a bright segment around it via WAAPI.
   * ============================================================ */
  function pillPath(w, h) {
    const r = Math.min(h, w) / 2;
    return (
      `M ${r} 0 ` +
      `H ${w - r} ` +
      `A ${r} ${r} 0 0 1 ${w} ${r} ` +
      `V ${h - r} ` +
      `A ${r} ${r} 0 0 1 ${w - r} ${h} ` +
      `H ${r} ` +
      `A ${r} ${r} 0 0 1 0 ${h - r} ` +
      `V ${r} ` +
      `A ${r} ${r} 0 0 1 ${r} 0 Z`
    );
  }

  function initPulseBeams() {
    qa("[data-pulse]").forEach(wrap => {
      const svg   = wrap.querySelector(".pulse-beam__svg");
      const base  = wrap.querySelector(".pulse-beam__base");
      const pulse = wrap.querySelector(".pulse-beam__pulse");
      if (!svg || !base || !pulse) return;

      let anim = null;

      const update = () => {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        if (w < 4 || h < 4) return;

        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        const d = pillPath(w, h);
        base.setAttribute("d", d);
        pulse.setAttribute("d", d);

        const len = pulse.getTotalLength();
        const seg = len * 0.18; // bright segment ≈ 18% of perimeter
        pulse.style.strokeDasharray = `${seg} ${len - seg}`;

        if (anim) anim.cancel();
        if (reduceMotion) {
          pulse.style.strokeDashoffset = 0;
          return;
        }
        anim = pulse.animate(
          [{ strokeDashoffset: 0 }, { strokeDashoffset: -len }],
          { duration: 3200, iterations: Infinity, easing: "linear" }
        );
      };

      update();
      // Recompute on size changes (font load, viewport resize).
      if (window.ResizeObserver) {
        new ResizeObserver(update).observe(wrap);
      } else {
        window.addEventListener("resize", update);
      }
    });
  }

  /* ============================================================
   * TEXT DISPERSE — chars scatter on hover; tap-toggle on touch.
   * Applied to the hero wordmark only.
   * ============================================================ */
  const DISPERSE_TRANSFORMS = [
    { x: -0.80, y: -0.60, r: -29 },
    { x: -0.20, y: -0.40, r:  -6 },
    { x: -0.05, y:  0.10, r:  12 },
    { x: -0.05, y: -0.10, r:  -9 },
    { x: -0.10, y:  0.55, r:   3 },
    { x:  0.00, y: -0.10, r:   9 },
    { x:  0.00, y:  0.15, r: -12 },
    { x:  0.00, y:  0.15, r: -17 },
    { x:  0.00, y: -0.65, r:   9 },
    { x:  0.10, y:  0.40, r:  12 },
    { x:  0.00, y: -0.15, r:  -9 },
    { x:  0.20, y:  0.15, r:  12 },
    { x:  0.80, y:  0.60, r:  20 }
  ];

  function initTextDisperse() {
    const inner = q(".hero__name .mask__inner");
    const nameEl = q(".hero__name");
    if (!inner || !nameEl || !CONFIG.name) return;

    const text = CONFIG.name;
    // Rebuild the name content as per-char spans with CSS vars from transforms.
    inner.textContent = "";
    [...text].forEach((ch, i) => {
      const t = DISPERSE_TRANSFORMS[i % DISPERSE_TRANSFORMS.length];
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch === " " ? " " : ch;
      span.style.setProperty("--cx", `${t.x}em`);
      span.style.setProperty("--cy", `${t.y}em`);
      span.style.setProperty("--cr", `${t.r}deg`);
      inner.appendChild(span);
    });

    if (reduceMotion) return;

    if (hasHover) {
      nameEl.addEventListener("pointerenter", () => nameEl.classList.add("is-dispersed"));
      nameEl.addEventListener("pointerleave", () => nameEl.classList.remove("is-dispersed"));
    } else {
      // Touch: tap to scatter, auto-snap back.
      nameEl.addEventListener("click", () => {
        nameEl.classList.add("is-dispersed");
        clearTimeout(nameEl._disperseT);
        nameEl._disperseT = setTimeout(
          () => nameEl.classList.remove("is-dispersed"),
          1400
        );
      });
    }
  }

  /* ============================================================
   * BACK-TO-TOP
   * ============================================================ */
  const backToTop = q(".back-to-top");
  if (backToTop) {
    backToTop.addEventListener("click", () => {
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.4 });
      } else {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  }

  /* ============================================================
   * UTILS
   * ============================================================ */
  function escapeHTML(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function escapeAttr(s) { return escapeHTML(s); }

  /* ============================================================
   * BOOT — wait for fonts so the masked reveal lands at final metrics.
   * ============================================================ */
  let booted = false;
  const start = () => {
    if (booted) return;
    booted = true;
    initLenis();
    initTextDisperse();        // char spans BEFORE entrance so they slide up together
    mountShaderBackground();   // permanent fullscreen shader backdrop (all modes)
    initDiagonalStage();       // BEFORE reveals + shader zoom so they pick up the timeline
    runHeroEntrance();
    runScrollReveals();
    initMagnetic();
    initWordmarkParallax();
    initPulseBeams();
    initShaderZoom();
    initSectionPager();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start).catch(start);
    setTimeout(start, 1200); // safety net
  } else {
    start();
  }
})();
