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
   * CONTROL LAUNCH — warp into the background: video zooms, the
   * flash blooms, a one-shot particle burst radiates from center,
   * then we navigate. control.html reads the sessionStorage flag
   * and plays its entrance. is-returning reverses on the way back.
   * -------------------------------------------------------------- */
  function particleBurst() {
    var c = document.createElement("canvas");
    c.style.cssText = "position:fixed;inset:0;z-index:55;pointer-events:none";
    document.body.appendChild(c);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    var ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    var COLORS = ["#FFB35C", "#4FD6E0", "#fff1a8", "#ff14d4"];
    var parts = [];
    for (var i = 0; i < 140; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 4 + Math.random() * 14;
      parts.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: 0.8 + Math.random() * 2.2,
        col: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }
    var start = performance.now();
    (function draw(now) {
      var t = (now - start) / 700;
      if (t >= 1) { c.remove(); return; }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalAlpha = 1 - t;
      for (var j = 0; j < parts.length; j++) {
        var p = parts[j];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 1.04; p.vy *= 1.04;
        ctx.fillStyle = p.col;
        ctx.fillRect(p.x, p.y, p.r, p.r * 3);
      }
      requestAnimationFrame(draw);
    })(start);
  }

  var controlBtn = document.getElementById("control-launch");
  if (controlBtn) {
    controlBtn.addEventListener("click", function (e) {
      e.preventDefault();
      try { sessionStorage.setItem("cockpit-transition", "in"); } catch (_) {}
      if (reduceMotion) { location.href = controlBtn.href; return; }
      document.body.classList.add("is-warping");
      particleBurst();
      setTimeout(function () { location.href = controlBtn.href; }, 730);
    });
  }
  try {
    if (sessionStorage.getItem("cockpit-transition") === "out") {
      sessionStorage.removeItem("cockpit-transition");
      if (!reduceMotion) {
        document.body.classList.add("is-returning");
        setTimeout(function () { document.body.classList.remove("is-returning"); }, 950);
      }
    }
  } catch (_) {}

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

  var lensCore = document.querySelector(".info-bg-lens-core");

  function applyPointer() {
    pendingPointer = false;
    root.style.setProperty("--mouse-x", (lastPointer.x * 100).toFixed(2) + "%");
    root.style.setProperty("--mouse-y", (lastPointer.y * 100).toFixed(2) + "%");
    // Hue-cycling core rides the cursor on a compositor-only transform.
    if (lensCore) {
      lensCore.style.transform =
        "translate3d(" + (lastPointer.x * window.innerWidth).toFixed(1) + "px," +
        (lastPointer.y * window.innerHeight).toFixed(1) + "px,0)";
    }
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
