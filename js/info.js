/* Info page — minimal. Live JST clock, year, a simple IntersectionObserver
 * for .reveal fade-up, and a 0.25x slow-down on the background video. */
(function () {

  // Background video — slow to 0.25x once it's playable. Set on both
  // `canplay` (first load) and `loadedmetadata` (some browsers reset
  // rate on metadata) so it sticks across loop boundaries.
  var bgVideo = document.querySelector(".info-bg-video");
  if (bgVideo) {
    var SLOW = 0.25;
    var applyRate = function () { bgVideo.playbackRate = SLOW; };
    bgVideo.addEventListener("loadedmetadata", applyRate);
    bgVideo.addEventListener("canplay", applyRate);
    bgVideo.addEventListener("play", applyRate);
    // Belt-and-braces: also set immediately in case the video is already
    // ready when this script runs.
    applyRate();
  }

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
