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
