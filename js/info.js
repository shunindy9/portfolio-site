/* Info page (site home) — JST clock, year, EN/JP translation with the same
 * glitch-scramble engine as the work page, reveal-on-scroll (which also
 * triggers the line-art logo draw-ins), and the interactive background. */
(function () {
  var CONFIG = window.SITE_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var q  = function (s, r) { return (r || document).querySelector(s); };
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* --------------------------------------------------------------
   * CURSOR — a small circle the user likes, wrapped in a refraction
   * lens that warps + hue-shifts the backdrop behind it (light bending
   * round a black hole) plus a constellation of tiny orbiting motes.
   * Built in JS so the native arrow is only hidden once the cursor is
   * live. Skipped on touch / no-hover. Lens + aura drop on reduced
   * motion. Shared verbatim with main.js.
   * -------------------------------------------------------------- */
  function initCursorDot() {
    if (!window.matchMedia("(hover: hover)").matches) return;

    if (!document.getElementById("cursor-refract")) {
      var holder = document.createElement("div");
      holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
      holder.setAttribute("aria-hidden", "true");
      // Pure refraction: warp the backdrop with one displacement so all
      // channels move together — bends/distorts the scene without any
      // colour shift. No animation, no overlay.
      // #cursor-refract — full strength over the background.
      // #cursor-refract-soft — a tiny ripple used over text so reading
      // is barely disturbed.
      holder.innerHTML =
        '<svg width="0" height="0"><defs>' +
        '<filter id="cursor-refract" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.008 0.01" numOctaves="2" seed="6" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="74" xChannelSelector="R" yChannelSelector="G"/>' +
        '</filter>' +
        '<filter id="cursor-refract-soft" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.02 0.022" numOctaves="2" seed="6" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/>' +
        '</filter></defs></svg>';
      document.body.appendChild(holder);
    }

    var wrap = document.createElement("div");
    wrap.className = "cursor";
    wrap.innerHTML = '<div class="cursor-lens"></div><div class="cursor-dot"></div>';
    document.body.appendChild(wrap);
    document.documentElement.classList.add("cursor-none");

    // Text under the cursor → shrink + soften the lens (set in CSS via
    // .is-over-text). Interactive elements → .is-hover. The cursor is
    // pointer-events:none, so the pointermove event's own target is the
    // real element beneath it — closest() on it is a cheap DOM walk (no
    // layout flush, unlike elementFromPoint).
    var TEXT = "h1,h2,h3,h4,p,li,a,time,.info-list__key,.info-list__val,.nav-label,.site-mark";
    var INTERACTIVE = "a,button,input,label,select,textarea,summary,[role=button]";
    var x = 0, y = 0, target = null, pending = false, lastText = false, lastHover = false;
    window.addEventListener("pointermove", function (e) {
      x = e.clientX; y = e.clientY; target = e.target;
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        wrap.style.transform = "translate3d(" + x + "px," + y + "px,0)";
        var el = target;
        var t = !!(el && el.closest && el.closest(TEXT));
        var h = !!(el && el.closest && el.closest(INTERACTIVE));
        if (t !== lastText) { wrap.classList.toggle("is-over-text", t); lastText = t; }
        if (h !== lastHover) { wrap.classList.toggle("is-hover", h); lastHover = h; }
      });
    }, { passive: true });
    window.addEventListener("pointerdown", function () { wrap.classList.add("is-down"); });
    window.addEventListener("pointerup", function () { wrap.classList.remove("is-down"); });
  }

  /* --------------------------------------------------------------
   * I18N — mirrors main.js. CONFIG holds English at the top level,
   * CONFIG.ja mirrors keys for Japanese; missing JA keys fall back.
   * The chosen language persists in localStorage so it carries
   * across the home and work pages.
   * -------------------------------------------------------------- */
  var currentLang = "en";

  function getString(lang, key) {
    if (lang === "ja" && CONFIG.ja && CONFIG.ja[key] != null) return CONFIG.ja[key];
    return CONFIG[key];
  }

  function applyStrings(lang) {
    qa("[data-bind]").forEach(function (el) {
      var v = getString(lang, el.dataset.bind);
      if (typeof v === "string") el.textContent = v;
    });
    // Capability cards — title/note pulled from CONFIG.capabilities[i]
    var caps = (lang === "ja" && CONFIG.ja && CONFIG.ja.capabilities) || CONFIG.capabilities || [];
    qa("[data-cap]").forEach(function (el) {
      var cap = caps[+el.dataset.cap];
      var field = el.dataset.capField;
      if (cap && typeof cap[field] === "string") el.textContent = cap[field];
    });
    document.documentElement.lang = (lang === "ja") ? "ja" : "en";
  }

  /* Glitch translate — char scramble toward the new-language text.
   * Same pool + motion language as main.js. */
  var GLITCH_DURATION_MS = 700;
  var SCRAMBLE_POOL =
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "abcdefghijklmnopqrstuvwxyz" +
    "0123456789#%&*+-=◇◆◢◤★▲▼■□";
  var SKIP_BIND = { langLabelEN: 1, langLabelJP: 1 };

  function scrambleToward(el, finalText, duration) {
    el.classList.add("glitching");
    var start = performance.now();
    var len = finalText.length;
    (function step() {
      var elapsed = performance.now() - start;
      if (elapsed >= duration) {
        el.textContent = finalText;
        el.classList.remove("glitching");
        return;
      }
      var t = elapsed / duration;
      var out = "";
      for (var i = 0; i < len; i++) {
        var ch = finalText[i];
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
    })();
  }

  function collectGlitchTargets() {
    var out = [];
    qa("[data-bind]").forEach(function (el) {
      if (SKIP_BIND[el.dataset.bind]) return;
      if (!el.textContent.trim()) return;
      out.push(el);
    });
    qa("[data-cap]").forEach(function (el) { out.push(el); });
    return out;
  }

  function syncToggleUI(lang) {
    var tog = q(".lang-toggle");
    if (tog) tog.dataset.state = lang;
    qa(".lang-toggle__btn").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.lang === lang ? "true" : "false");
    });
  }

  function setLang(lang, animate) {
    if (lang === currentLang) return;
    currentLang = lang;
    try { localStorage.setItem("portfolio-lang", lang); } catch (_) {}
    syncToggleUI(lang);

    applyStrings(lang);
    if (!animate || reduceMotion) return;

    document.body.classList.add("is-translating");
    collectGlitchTargets().forEach(function (el) {
      var finalText = el.textContent;
      var d = GLITCH_DURATION_MS * (0.85 + Math.random() * 0.35);
      scrambleToward(el, finalText, d);
    });
    setTimeout(function () {
      document.body.classList.remove("is-translating");
      qa(".glitching").forEach(function (el) { el.classList.remove("glitching"); });
    }, GLITCH_DURATION_MS + 200);
  }

  qa(".lang-toggle__btn").forEach(function (btn) {
    btn.addEventListener("click", function () { setLang(btn.dataset.lang, true); });
  });

  // Initial language — saved choice carries over from the work page.
  var savedLang = null;
  try { savedLang = localStorage.getItem("portfolio-lang"); } catch (_) {}
  if (savedLang === "ja") {
    setLang("ja", false);
  } else {
    applyStrings("en");
  }

  /* --------------------------------------------------------------
   * Clocks — JST for any .jst-clock, plus the world-clock ticker.
   * The ticker belt slides via pure CSS transform; we only re-render
   * its textContent every 30s so the motion is never disturbed.
   * -------------------------------------------------------------- */
  function cityTime(tz) {
    try {
      return new Date().toLocaleTimeString("en-GB", {
        timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit"
      });
    } catch (_) { return "--:--"; }
  }

  var clockEls = qa(".jst-clock");
  var TICKER_CITIES = [
    ["TOKYO",       "Asia/Tokyo"],
    ["LOS ANGELES", "America/Los_Angeles"],
    ["NEW YORK",    "America/New_York"],
    ["LONDON",      "Europe/London"],
    ["PARIS",       "Europe/Paris"],
    ["BERLIN",      "Europe/Berlin"],
    ["DUBAI",       "Asia/Dubai"],
    ["SINGAPORE",   "Asia/Singapore"],
    ["SYDNEY",      "Australia/Sydney"]
  ];
  var tickerSeqs = qa("[data-ticker-seq]");
  function tick() {
    var t = cityTime("Asia/Tokyo");
    clockEls.forEach(function (el) { el.textContent = t; });
    if (tickerSeqs.length) {
      var html = TICKER_CITIES.map(function (c) {
        return '<span class="tick-city">' + c[0] + '</span> ' + cityTime(c[1]);
      }).join("  ·  ") + "  ·  ";
      tickerSeqs.forEach(function (el) { el.innerHTML = html; });
    }
  }
  if (clockEls.length || tickerSeqs.length) {
    tick();
    setInterval(tick, 30000);
  }

  var yearEl = document.getElementById("info-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* --------------------------------------------------------------
   * INTERACTIVE BACKGROUND
   *  - Scroll progress drives --bg-hue through the Dark Side of the
   *    Moon prism (red -> orange -> yellow -> green -> blue -> violet),
   *    and --bg-con ramps contrast slightly so the bg "blooms" deeper
   *    the further you scroll.
   *  - Pointer movement drives --mouse-x/--mouse-y for the radial
   *    lens overlay, plus --lens-hue offset from cursor position so
   *    the lens carries its own color regardless of the global hue.
   *  - Reaching the bottom 8% scrubs --flash-opacity from 0 to 1.
   *  - All updates are coalesced into a single rAF tick so
   *    rapid scroll/move events don't pile up layout reads.
   * -------------------------------------------------------------- */
  var root = document.documentElement;
  var pendingScroll = false;
  var pendingPointer = false;
  var lastPointer = { x: 0.5, y: 0.5 };

  function applyScroll() {
    pendingScroll = false;
    var max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
    var p = Math.min(1, Math.max(0, window.scrollY / max));
    root.style.setProperty("--bg-hue", (p * 360).toFixed(1) + "deg");
    root.style.setProperty("--bg-con", (1.05 + p * 0.35).toFixed(2));
    var flash = Math.max(0, (p - 0.92) / 0.08);
    root.style.setProperty("--flash-opacity", flash.toFixed(3));
  }

  function applyPointer() {
    pendingPointer = false;
    // Cursor vertical distance from center nudges the video saturation.
    var dy = Math.abs(lastPointer.y - 0.5) * 2;
    var sat = 1.4 + dy * 1.4;
    root.style.setProperty("--bg-sat", sat.toFixed(2));
  }

  window.addEventListener("scroll", function () {
    if (!pendingScroll) {
      pendingScroll = true;
      requestAnimationFrame(applyScroll);
    }
  }, { passive: true });

  window.addEventListener("pointermove", function (e) {
    lastPointer.x = e.clientX / window.innerWidth;
    lastPointer.y = e.clientY / window.innerHeight;
    if (!pendingPointer) {
      pendingPointer = true;
      requestAnimationFrame(applyPointer);
    }
  }, { passive: true });

  // Click pulse — flashbulb saturation pop for ~360ms.
  window.addEventListener("pointerdown", function () {
    document.body.classList.add("is-pulsing");
    setTimeout(function () {
      document.body.classList.remove("is-pulsing");
    }, 360);
  });

  // Initial paint.
  applyScroll();
  applyPointer();

  initCursorDot();

  /* --------------------------------------------------------------
   * Reveal-on-scroll. Adding .is-in also kicks off the line-art logo
   * draw-in (stroke-dashoffset transition in info.css) and starts the
   * ambient spin animations on the capability logos.
   * -------------------------------------------------------------- */
  var targets = qa(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });
  targets.forEach(function (el) { io.observe(el); });
})();
