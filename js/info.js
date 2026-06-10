/* Info page — minimal. Live JST clock, year, a simple IntersectionObserver
 * for .reveal fade-up, and a 0.25x slow-down on the background video. */
(function () {

  // Background video: slow motion (4x slower than source) is now BAKED
  // INTO the encode via ffmpeg motion-compensated interpolation, so we
  // play at normal speed. The file itself is 30s of smooth slow-mo at
  // CRF 20 native 1024x1024 — way smoother than browser frame-hold.

  // Live JST clock (HH:MM, ticks every 30s).
  var clockEls = document.querySelectorAll(".jst-clock");
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

  // Current year.
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
    // DSOTM spectrum: 0 -> red, 0.16 -> orange, 0.32 -> yellow,
    // 0.5 -> green, 0.66 -> blue, 0.82 -> violet, 1 -> red again.
    // hue-rotate spans 360deg total so the loop closes cleanly.
    root.style.setProperty("--bg-hue", (p * 360).toFixed(1) + "deg");
    root.style.setProperty("--bg-con", (1.05 + p * 0.35).toFixed(2));
    // Flash from below kicks in over the last 8% of the page.
    var flash = Math.max(0, (p - 0.92) / 0.08);
    root.style.setProperty("--flash-opacity", flash.toFixed(3));
  }

  function applyPointer() {
    pendingPointer = false;
    root.style.setProperty("--mouse-x", (lastPointer.x * 100).toFixed(2) + "%");
    root.style.setProperty("--mouse-y", (lastPointer.y * 100).toFixed(2) + "%");
    // Lens hue follows the cursor's horizontal position so left side
    // reads warm (magenta/red), right side reads cool (cyan/violet).
    var lensHue = 260 + (lastPointer.x - 0.5) * 200;
    root.style.setProperty("--lens-hue", lensHue.toFixed(1));
    // Mouse vertical distance from center boosts saturation.
    var dy = Math.abs(lastPointer.y - 0.5) * 2;          // 0 (center) .. 1 (edge)
    var sat = 1.4 + dy * 1.4;                            // 1.4 .. 2.8
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

  // Reveal-on-scroll.
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".reveal");
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
