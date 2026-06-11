/* Info page (site home) — JST clock, year, EN/JP translation with the same
 * glitch-scramble engine as the work page, reveal-on-scroll (which also
 * triggers the line-art logo draw-ins), and the interactive background. */
(function () {
  var CONFIG = window.SITE_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var q  = function (s, r) { return (r || document).querySelector(s); };
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

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
   * Live JST clock (HH:MM, ticks every 30s) + year.
   * -------------------------------------------------------------- */
  var clockEls = qa(".jst-clock");
  function tick() {
    var t;
    try {
      t = new Date().toLocaleTimeString("en-GB", {
        timeZone: "Asia/Tokyo",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_) { t = "--:--"; }
    clockEls.forEach(function (el) { el.textContent = t; });
  }
  if (clockEls.length) {
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
    root.style.setProperty("--mouse-x", (lastPointer.x * 100).toFixed(2) + "%");
    root.style.setProperty("--mouse-y", (lastPointer.y * 100).toFixed(2) + "%");
    var lensHue = 260 + (lastPointer.x - 0.5) * 200;
    root.style.setProperty("--lens-hue", lensHue.toFixed(1));
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
