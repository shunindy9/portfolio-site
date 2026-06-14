/* CONTROL deck — cockpit logic. ES module (control.html loads it with
 * type="module" + an importmap for Three.js). Sections:
 *   i18n-lite · entrance/exit · deck keys + holograms + PARTICLE REVEAL ·
 *   clocks + world ticker · Open-Meteo gauges · data columns + parallax ·
 *   encrypted ticker · TRIM sliders · WAVE scope · Three.js SPECIMEN LAB.
 *
 * No audio: the cockpit is silent by request. The MUTE lever is a
 * decorative ship switch (native checkbox toggle, no handler). */

const CONFIG = window.SITE_CONFIG || {};
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const q  = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
const root = document.documentElement;

/* ----------------------------------------------------------------
 * I18N-LITE — saved language carries over from the rest of the site.
 * ---------------------------------------------------------------- */
let lang = "en";
try { if (localStorage.getItem("portfolio-lang") === "ja") lang = "ja"; } catch (_) {}
const S = (key) => (lang === "ja" && CONFIG.ja && CONFIG.ja[key] != null) ? CONFIG.ja[key] : CONFIG[key];

qa("[data-ctl]").forEach((el) => {
  const v = S(el.dataset.ctl);
  if (typeof v === "string") el.textContent = v;
});
document.documentElement.lang = lang === "ja" ? "ja" : "en";

// SERVICES hologram — built from CONFIG.capabilities.
const svcList = q("#holo-services");
const caps = (lang === "ja" && CONFIG.ja && CONFIG.ja.capabilities) || CONFIG.capabilities || [];
if (svcList) {
  svcList.innerHTML = caps.map((c, i) => `
    <li>
      <span class="holo-svc__num">0${i + 1}</span>
      <div>
        <p class="holo-svc__title"></p>
        <p class="holo-svc__note"></p>
      </div>
    </li>
  `).join("");
  qa(".holo-svc__title", svcList).forEach((el, i) => { el.textContent = caps[i].title; });
  qa(".holo-svc__note",  svcList).forEach((el, i) => { el.textContent = caps[i].note; });
}

/* ----------------------------------------------------------------
 * ENTRANCE / EXIT — silent. sessionStorage flag drives the snap.
 * ---------------------------------------------------------------- */
let flag = null;
try {
  flag = sessionStorage.getItem("cockpit-transition");
  sessionStorage.removeItem("cockpit-transition");
} catch (_) {}

if (flag === "in" && !reduceMotion) {
  document.body.classList.add("is-entering");
  setTimeout(() => document.body.classList.remove("is-entering"), 1400);
}

function exitToHome(href) {
  if (reduceMotion) { location.href = href; return; }
  document.body.classList.add("is-exiting");
  try { sessionStorage.setItem("cockpit-transition", "out"); } catch (_) {}
  setTimeout(() => { location.href = href; }, 520);
}
["#exit-top", "#exit-key"].forEach((sel) => {
  const el = q(sel);
  if (el) el.addEventListener("click", (e) => { e.preventDefault(); exitToHome(el.getAttribute("href")); });
});

/* ----------------------------------------------------------------
 * DECK KEYS → HOLOGRAMS (+ particle reveal)
 * ---------------------------------------------------------------- */
const holo = q("#holo");
const panes = qa(".holo__pane");
let openPane = null;

function showHolo(name) {
  panes.forEach((p) => { p.hidden = p.dataset.pane !== name; });
  holo.hidden = false;
  holo.classList.remove("is-open", "holo--delayed");
  void holo.offsetWidth; // restart the pop animation
  // When particles run, the crisp panel waits for them to assemble.
  holo.classList.add("is-open");
  if (particlesActive()) holo.classList.add("holo--delayed");
  openPane = name;
  qa("[data-holo]").forEach((k) => k.classList.toggle("is-active", k.dataset.holo === name));
  if (name === "system") startSecondsClock();
  revealWord(name.toUpperCase());
}
function hideHolo() {
  holo.hidden = true;
  openPane = null;
  qa("[data-holo]").forEach((k) => k.classList.remove("is-active"));
  stopSecondsClock();
  disperse();
}

qa("[data-holo]").forEach((key) => {
  key.addEventListener("click", () => {
    if (openPane === key.dataset.holo) { hideHolo(); return; }
    showHolo(key.dataset.holo);
  });
});
q("#holo-close").addEventListener("click", () => hideHolo());
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && openPane) hideHolo(); });

/* ----------------------------------------------------------------
 * CLOCKS — deck CRTs HH:MM every 30s; world ticker on the same beat
 * (its slide is pure CSS); SYSTEM pane gets a 1s seconds clock.
 * ---------------------------------------------------------------- */
function cityTime(tz, showSeconds) {
  try {
    return new Date().toLocaleTimeString("en-GB", {
      timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit",
      ...(showSeconds ? { second: "2-digit" } : {})
    });
  } catch (_) { return showSeconds ? "--:--:--" : "--:--"; }
}
const TICKER_CITIES = [
  ["TOKYO", "Asia/Tokyo"], ["LOS ANGELES", "America/Los_Angeles"],
  ["NEW YORK", "America/New_York"], ["LONDON", "Europe/London"],
  ["PARIS", "Europe/Paris"], ["BERLIN", "Europe/Berlin"],
  ["DUBAI", "Asia/Dubai"], ["SINGAPORE", "Asia/Singapore"],
  ["SYDNEY", "Australia/Sydney"]
];
const tickerSeqs = qa("[data-ticker-seq]");
function tickMinutes() {
  const t = cityTime("Asia/Tokyo");
  qa(".jst-clock").forEach((el) => { el.textContent = t; });
  if (tickerSeqs.length) {
    const html = TICKER_CITIES.map((c) =>
      `<span class="tick-city">${c[0]}</span> ${cityTime(c[1])}`
    ).join("  ·  ") + "  ·  ";
    tickerSeqs.forEach((el) => { el.innerHTML = html; });
  }
}
tickMinutes();
setInterval(tickMinutes, 30000);

let secTimer = null;
function startSecondsClock() {
  if (secTimer) return;
  const els = qa(".jst-clock-s");
  const tick = () => els.forEach((el) => { el.textContent = cityTime("Asia/Tokyo", true); });
  tick();
  secTimer = setInterval(tick, 1000);
}
function stopSecondsClock() {
  if (secTimer) { clearInterval(secTimer); secTimer = null; }
}

/* ----------------------------------------------------------------
 * WEATHER — Open-Meteo, Tokyo, no API key. Cached 10 minutes.
 * ---------------------------------------------------------------- */
const WMO = {
  0: "CLEAR", 1: "MOSTLY CLEAR", 2: "PARTLY CLOUDY", 3: "OVERCAST",
  45: "FOG", 48: "RIME FOG",
  51: "DRIZZLE", 53: "DRIZZLE", 55: "DRIZZLE", 56: "FRZ DRIZZLE", 57: "FRZ DRIZZLE",
  61: "RAIN", 63: "RAIN", 65: "HEAVY RAIN", 66: "FRZ RAIN", 67: "FRZ RAIN",
  71: "SNOW", 73: "SNOW", 75: "HEAVY SNOW", 77: "SNOW GRAINS",
  80: "SHOWERS", 81: "SHOWERS", 82: "VIOLENT SHOWERS",
  85: "SNOW SHOWERS", 86: "SNOW SHOWERS",
  95: "THUNDERSTORM", 96: "THUNDER + HAIL", 99: "THUNDER + HAIL"
};
function paintWeather(w) {
  const set = (id, v) => { const el = q(id); if (el) el.textContent = v; };
  set("#g-temp", `${Math.round(w.temperature_2m)}°C`);
  set("#g-cond", WMO[w.weather_code] || `CODE ${w.weather_code}`);
  set("#g-wind", `${Math.round(w.wind_speed_10m)} KM/H`);
  set("#g-hum",  `${Math.round(w.relative_humidity_2m)}%`);
  set("#deck-temp", `${Math.round(w.temperature_2m)}°`);
}
async function loadWeather() {
  const KEY = "control-weather";
  try {
    const cached = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (cached && Date.now() - cached.at < 10 * 60 * 1000) { paintWeather(cached.w); return; }
  } catch (_) {}
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503"
      + "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FTokyo";
    const res = await fetch(url);
    const json = await res.json();
    paintWeather(json.current);
    try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), w: json.current })); } catch (_) {}
  } catch (_) {
    const set = (id) => { const el = q(id); if (el) el.textContent = "NO SIGNAL"; };
    ["#g-temp", "#g-cond", "#g-wind", "#g-hum"].forEach(set);
  }
}
loadWeather();

/* ----------------------------------------------------------------
 * ENCRYPTED TICKER — a long random crawl along the deck's top edge.
 * Static text; the slide is pure CSS.
 * ---------------------------------------------------------------- */
const CRYPT = "0123456789ABCDEF アイウエオカキクケコサシスセソ #%&*+=<>/\\|:";
function cryptString(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += CRYPT[(Math.random() * CRYPT.length) | 0] + (Math.random() < 0.2 ? " " : "");
  return s + "  ::  ";
}
qa("[data-crypt-seq]").forEach((el) => { el.textContent = cryptString(80); });

/* ----------------------------------------------------------------
 * TRIM SLIDERS — live readouts that feed the projection params.
 *   flux  → particle shimmer amplitude
 *   gain  → oscilloscope amplitude
 *   drift → idle dust drift amplitude
 * ---------------------------------------------------------------- */
const trims = { flux: 0.62, gain: 0.38, drift: 0.5 };
["flux", "gain", "drift"].forEach((name) => {
  const inp = q("#trim-" + name);
  const out = q("#trim-" + name + "-val");
  if (!inp) return;
  const upd = () => {
    trims[name] = inp.value / 100;
    if (out) out.textContent = String(inp.value).padStart(2, "0");
  };
  inp.addEventListener("input", upd);
  upd();
});

/* ----------------------------------------------------------------
 * CURSOR PARALLAX — feeds --par-x / --par-y (rAF-coalesced) so the
 * data columns drift at different rates than the hologram → fake depth.
 * ---------------------------------------------------------------- */
if (!reduceMotion) {
  let px = 0, py = 0, parPending = false;
  window.addEventListener("pointermove", (e) => {
    px = (e.clientX / window.innerWidth) - 0.5;
    py = (e.clientY / window.innerHeight) - 0.5;
    if (parPending) return;
    parPending = true;
    requestAnimationFrame(() => {
      parPending = false;
      root.style.setProperty("--par-x", px.toFixed(3));
      root.style.setProperty("--par-y", py.toFixed(3));
    });
  }, { passive: true });
}

/* ----------------------------------------------------------------
 * DATA COLUMNS — Image 3's flanking telemetry. One row mutates per
 * column per tick (~2.5Hz); contain:layout paint keeps repaints small.
 * ---------------------------------------------------------------- */
const GLYPHS = "アイウエオカキクケコサシスセソ0123456789#%&*+-=◇◆▲▼■□:.｜";
function glyphRow(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.random() < 0.16 ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
  return s;
}
function initDataCols() {
  const cols = [q(".data-col--left"), q(".data-col--right")];
  if (!cols[0] || reduceMotion) return;
  const ROWS = 30;
  const stores = cols.map((col) => {
    const wrap = document.createElement("div");
    wrap.className = "data-col__rows";
    const rows = [];
    for (let i = 0; i < ROWS; i++) {
      const r = document.createElement("div");
      r.textContent = glyphRow(8 + ((Math.random() * 9) | 0));
      wrap.appendChild(r);
      rows.push(r);
    }
    col.prepend(wrap);
    return rows;
  });
  // Mutate ONE row across both columns per tick at ~1.5Hz. Each row
  // sits in a masked fixed layer whose repaint is the cockpit's main
  // frame-time spike source, so we keep the churn rate low — it still
  // reads as live telemetry.
  const allRows = stores.flat();
  const PERIOD = 650;
  let timer = setInterval(mutate, PERIOD);
  function mutate() {
    const r = allRows[(Math.random() * allRows.length) | 0];
    r.textContent = glyphRow(8 + ((Math.random() * 9) | 0));
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { clearInterval(timer); timer = null; }
    else if (!timer) { timer = setInterval(mutate, PERIOD); }
  });
}
initDataCols();

/* ================================================================
 * PARTICLE REVEAL — the hero. A 2D canvas of ~2200 glowing motes
 * that idle as drifting dust, then CONVERGE into the pressed
 * section's word (easeOut via per-particle critically-damped lerp,
 * staggered draw-in), HOLD with a shimmer, and DISPERSE back to dust
 * when you change or close. The crisp DOM panel fades in on top once
 * they've settled, guaranteeing readability.
 * Disabled under reduced-motion (CSS hides the canvas; crisp text
 * shows immediately, with no delay class).
 * ================================================================ */
const pcanvas = q("#particle-canvas");
let pctx, PW = 0, PH = 0;
const N = 1600;
const parts = [];
const wordCache = new Map();
let mode = "idle";          // 'idle' | 'text'
const easeK = { text: 0.12, idle: 0.05 };

function particlesActive() { return !reduceMotion && !!pctx; }

function sizeParticles() {
  // Cap the backing store at 1.5x — particles are soft motes, so the
  // lower density is invisible but the per-frame fill cost drops ~44%.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  PW = window.innerWidth; PH = window.innerHeight;
  pcanvas.width = PW * dpr;
  pcanvas.height = PH * dpr;
  pctx = pcanvas.getContext("2d");
  pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function seedParticles() {
  for (let i = 0; i < N; i++) {
    const hx = PW / 2 + (Math.random() - 0.5) * PW * 0.5;
    const hy = PH * 0.37 + (Math.random() - 0.5) * PH * 0.42;
    parts.push({
      hx, hy, x: hx, y: hy,
      tx: 0, ty: 0, has: false, activate: 0,
      lit: 0.12, seed: Math.random() * Math.PI * 2,
      warm: Math.random() < 0.42        // orange vs cyan split
    });
  }
}

// Render a word to an offscreen canvas and sample lit pixels → points
// mapped into the centered display region above the deck.
function sampleWord(word) {
  if (wordCache.has(word)) return wordCache.get(word);
  const fs = 150;
  const o = document.createElement("canvas");
  const octx = o.getContext("2d");
  const font = `700 ${fs}px "Space Mono", ui-monospace, monospace`;
  octx.font = font;
  const w = Math.max(1, Math.ceil(octx.measureText(word).width));
  o.width = w; o.height = Math.ceil(fs * 1.4);
  octx.font = font;
  octx.fillStyle = "#fff";
  octx.textBaseline = "middle";
  octx.fillText(word, 0, o.height / 2);
  const data = octx.getImageData(0, 0, o.width, o.height).data;
  const raw = [];
  const gap = 4;
  for (let y = 0; y < o.height; y += gap) {
    for (let x = 0; x < o.width; x += gap) {
      if (data[(y * o.width + x) * 4 + 3] > 128) raw.push([x, y]);
    }
  }
  const targetW = Math.min(PW * 0.62, 600);
  const scale = targetW / o.width;
  const cx = PW / 2, cy = PH * 0.37;
  const pts = raw.map(([x, y]) => [cx + (x - o.width / 2) * scale, cy + (y - o.height / 2) * scale]);
  wordCache.set(word, pts);
  return pts;
}

function assemble(word) {
  if (!particlesActive()) return;
  const pts = sampleWord(word);
  if (!pts.length) return;
  const now = performance.now();
  const stagger = 600;
  for (let i = 0; i < N; i++) {
    const p = parts[i];
    const [tx, ty] = pts[Math.floor(i * pts.length / N)];
    p.tx = tx + (Math.random() - 0.5) * 3;
    p.ty = ty + (Math.random() - 0.5) * 3;
    p.has = true;
    p.activate = now + (i / N) * stagger;
  }
  mode = "text";
}

function disperse() {
  if (!particlesActive()) return;
  for (let i = 0; i < N; i++) parts[i].has = false;
  mode = "idle";
}

// On change while already showing: scatter outward, then re-form.
function revealWord(word) {
  if (!particlesActive()) return;
  if (mode === "text") {
    disperse();
    setTimeout(() => assemble(word), 240);
  } else {
    assemble(word);
  }
}

function drawParticles(now) {
  if (!pctx) return;
  pctx.clearRect(0, 0, PW, PH);
  const fluxAmp = 0.6 + trims.flux * 2.2;     // shimmer px
  const driftAmp = 6 + trims.drift * 16;      // idle drift px
  // First pass: advance physics (cheap). We render in two color batches
  // afterward so fillStyle is set twice per frame, not once per particle —
  // and use globalAlpha instead of rebuilding rgba strings (no GC churn).
  for (let i = 0; i < N; i++) {
    const p = parts[i];
    let gx, gy, k, targetLit;
    if (p.has && now >= p.activate) {
      gx = p.tx + Math.sin(now * 0.004 + p.seed) * fluxAmp;
      gy = p.ty + Math.cos(now * 0.004 + p.seed) * fluxAmp * 0.6;
      k = easeK.text;
      targetLit = 0.95;
    } else {
      gx = p.hx + Math.sin(now * 0.0006 + p.seed) * driftAmp;
      gy = p.hy + Math.cos(now * 0.0005 + p.seed * 1.3) * driftAmp * 0.8;
      k = easeK.idle;
      targetLit = 0.16;
    }
    p.x += (gx - p.x) * k;
    p.y += (gy - p.y) * k;
    p.lit += (targetLit - p.lit) * 0.08;
  }
  // Two batched passes — warm (orange) then cool (cyan).
  for (let pass = 0; pass < 2; pass++) {
    const warm = pass === 0;
    pctx.fillStyle = warm ? "rgb(255,138,30)" : "rgb(79,224,224)";
    for (let i = 0; i < N; i++) {
      const p = parts[i];
      if (p.warm !== warm || p.lit < 0.03) continue;
      pctx.globalAlpha = p.lit;
      const s = p.has ? 1.7 : 1.3;
      pctx.fillRect(p.x, p.y, s, s);
    }
  }
  pctx.globalAlpha = 1;
}

/* ----------------------------------------------------------------
 * WAVE SCOPE — phosphor oscilloscope, amplitude tied to TRIM gain.
 * ---------------------------------------------------------------- */
const scopeCanvas = q("#scope-canvas");
let sctx, SW = 132, SH = 56;
function initScope() {
  if (!scopeCanvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  scopeCanvas.width = SW * dpr;
  scopeCanvas.height = SH * dpr;
  sctx = scopeCanvas.getContext("2d");
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.lineWidth = 1.4;
}
function drawScope(now) {
  if (!sctx) return;
  sctx.clearRect(0, 0, SW, SH);
  sctx.strokeStyle = "rgba(87,224,106,0.18)";
  sctx.beginPath();
  sctx.moveTo(0, SH / 2); sctx.lineTo(SW, SH / 2); sctx.stroke();
  const amp = (0.18 + trims.gain * 0.7) * SH * 0.42;
  sctx.strokeStyle = "rgba(87,224,106,0.9)";
  sctx.shadowColor = "rgba(87,224,106,0.7)";
  sctx.shadowBlur = 4;
  sctx.beginPath();
  for (let x = 0; x <= SW; x += 2) {
    const t = x / SW;
    const y = SH / 2
      + Math.sin(t * Math.PI * 6 + now * 0.004) * amp * Math.sin(t * Math.PI)
      + Math.sin(t * Math.PI * 13 - now * 0.006) * amp * 0.28;
    if (x === 0) sctx.moveTo(x, y); else sctx.lineTo(x, y);
  }
  sctx.stroke();
  sctx.shadowBlur = 0;
}

/* ----------------------------------------------------------------
 * 2D FX LOOP — particles + scope on one rAF, paused when hidden.
 * (Three.js runs its own setAnimationLoop for the 3D lab.)
 * ---------------------------------------------------------------- */
function initFX() {
  initScope();
  if (!reduceMotion && pcanvas) {
    sizeParticles();
    seedParticles();
    window.addEventListener("resize", () => {
      sizeParticles();
      for (const p of parts) {            // re-home on resize
        p.hx = PW / 2 + (Math.random() - 0.5) * PW * 0.5;
        p.hy = PH * 0.37 + (Math.random() - 0.5) * PH * 0.42;
      }
      wordCache.clear();
      if (mode === "text" && openPane) assemble(openPane.toUpperCase());
    });
  }
  let running = true;
  function loop(now) {
    if (!running) return;
    if (!reduceMotion && pctx) drawParticles(now);
    if (!reduceMotion) drawScope(now);
    requestAnimationFrame(loop);
  }
  if (reduceMotion) { drawScope(0); return; }   // static scope, no loop
  requestAnimationFrame(loop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { running = false; }
    else if (!running) { running = true; requestAnimationFrame(loop); }
  });
}
initFX();

/* ================================================================
 * THREE.JS — the SPECIMEN LAB (Image 3). A receding perspective grid
 * (floor + back wall) sits behind a tall cyan wireframe lattice with
 * stacked strata (clouds / greenery / green grid / orange grid /
 * water + rocks). The current specimen hovers inside. OrbitControls
 * drag/zoom; gentle pointer parallax; paused when hidden; DOM
 * fallback when WebGL is missing.
 * ================================================================ */
const canvas = q("#scene-canvas");

function showFallback() {
  canvas.remove();
  const fb = q(".stage__fallback");
  if (fb) fb.hidden = false;
  const hint = q("#stage-hint");
  if (hint) hint.textContent = "STATIC HOLOGRAM — WEBGL OFFLINE";
  qa("[data-scene]").forEach((k) => { k.disabled = true; k.style.opacity = 0.4; });
}
function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (_) { return false; }
}

async function initScene() {
  if (!webglAvailable()) { showFallback(); return; }
  let THREE, OrbitControls;
  try {
    THREE = await import("three");
    ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
  } catch (_) { showFallback(); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (_) { showFallback(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  camera.position.set(0, 0.4, 8.4);

  const CYAN = 0x4fe0e0, GREEN = 0x57e06a, ORANGE = 0xff7a1e,
        BLUE = 0x3b7bd6, AMBER = 0xff9d3a, WHITE = 0xeaf2f4;

  const wire = (color, opacity = 0.85) =>
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });
  const lineMat = (color, opacity) =>
    new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const pointsMat = (color, size, opacity = 0.9) =>
    new THREE.PointsMaterial({ color, size, transparent: true, opacity, sizeAttenuation: true });

  function pointCloud(count, color, size, spread, center, opacity) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = center[0] + (Math.random() - 0.5) * spread[0];
      pos[i * 3 + 1] = center[1] + (Math.random() - 0.5) * spread[1];
      pos[i * 3 + 2] = center[2] + (Math.random() - 0.5) * spread[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, pointsMat(color, size, opacity));
  }

  /* --- Environment: receding perspective grid (floor + back wall) --- */
  const env = new THREE.Group();
  scene.add(env);
  const floor = new THREE.GridHelper(60, 60, CYAN, CYAN);
  floor.material.transparent = true; floor.material.opacity = 0.11;
  floor.position.y = -3.4;
  env.add(floor);
  const backWall = new THREE.GridHelper(60, 60, CYAN, CYAN);
  backWall.material.transparent = true; backWall.material.opacity = 0.06;
  backWall.rotation.x = Math.PI / 2;
  backWall.position.z = -8;
  env.add(backWall);

  /* --- The lab group (parallaxes together) --- */
  const lab = new THREE.Group();
  scene.add(lab);

  const W = 3.4, H = 5.4, D = 3.4;
  lab.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), lineMat(CYAN, 0.55)
  ));
  lab.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W * 0.66, H, D * 0.66)), lineMat(CYAN, 0.18)
  ));

  const clouds = new THREE.Group();
  clouds.add(pointCloud(160, WHITE, 0.075, [2.2, 0.5, 1.8], [-0.3, 0, 0], 0.85));
  clouds.add(pointCloud(110, WHITE, 0.06, [1.6, 0.4, 1.4], [0.8, 0.18, 0.3], 0.7));
  clouds.position.y = 1.95;
  lab.add(clouds);

  const greenery = pointCloud(320, GREEN, 0.05, [2.8, 0.5, 2.8], [0, 0, 0], 0.85);
  greenery.position.y = 0.85;
  lab.add(greenery);

  const gridGreen = new THREE.GridHelper(W * 0.94, 16, GREEN, GREEN);
  gridGreen.material.transparent = true; gridGreen.material.opacity = 0.45;
  gridGreen.position.y = 0.35;
  lab.add(gridGreen);

  const gridOrange = new THREE.GridHelper(W * 0.94, 16, ORANGE, ORANGE);
  gridOrange.material.transparent = true; gridOrange.material.opacity = 0.4;
  gridOrange.position.y = -0.5;
  lab.add(gridOrange);

  const water = new THREE.Group();
  const gridWater = new THREE.GridHelper(W * 0.94, 12, BLUE, BLUE);
  gridWater.material.transparent = true; gridWater.material.opacity = 0.5;
  water.add(gridWater);
  water.add(pointCloud(240, BLUE, 0.045, [3.0, 0.35, 3.0], [0, -0.15, 0], 0.8));
  for (const rx of [-0.9, 0.5, 1.1]) {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + Math.random() * 0.12, 0), wire(0x6b86c8, 0.65));
    rock.position.set(rx, -0.1, (Math.random() - 0.5) * 1.6);
    water.add(rock);
  }
  water.position.y = -1.75;
  lab.add(water);

  /* --- Specimens --- */
  const planet = new THREE.Group();
  planet.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 2), wire(AMBER)));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.014, 6, 70), wire(CYAN, 0.7));
  ring.rotation.x = Math.PI / 2.4; ring.rotation.y = 0.25;
  planet.add(ring);
  const moonPivot = new THREE.Group();
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), wire(CYAN, 0.9));
  moon.position.set(1.45, 0.2, 0);
  moonPivot.add(moon);
  planet.add(moonPivot);
  planet.position.y = 1.42;

  const visitor = new THREE.Group();
  {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), wire(CYAN));
    head.scale.set(1, 1.25, 0.95); head.position.y = 0.62;
    visitor.add(head);
    const eyeGeo = new THREE.SphereGeometry(0.105, 10, 8);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, wire(AMBER, 1));
      eye.position.set(sx * 0.17, 0.65, 0.32);
      eye.scale.set(1, 1.6, 0.6); eye.rotation.z = sx * -0.35;
      visitor.add(eye);
    }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.74, 10, 3), wire(CYAN, 0.8));
    body.position.y = -0.04;
    visitor.add(body);
    const limbGeo = new THREE.CylinderGeometry(0.035, 0.026, 0.56, 6, 2);
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(limbGeo, wire(CYAN, 0.8));
      arm.position.set(sx * 0.31, 0.1, 0); arm.rotation.z = sx * 0.5;
      visitor.add(arm);
      const leg = new THREE.Mesh(limbGeo, wire(CYAN, 0.8));
      leg.position.set(sx * 0.11, -0.66, 0); leg.rotation.z = sx * 0.08;
      visitor.add(leg);
    }
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.3, 5), wire(AMBER, 0.9));
    antenna.position.y = 1.18;
    visitor.add(antenna);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), wire(AMBER, 1));
    tip.position.y = 1.34;
    visitor.add(tip);
  }
  visitor.position.y = 1.35;
  visitor.visible = false;

  lab.add(planet);
  lab.add(visitor);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 13;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.5;

  let targetRX = 0, targetRZ = 0;
  if (!reduceMotion) {
    window.addEventListener("pointermove", (e) => {
      targetRZ = ((e.clientX / window.innerWidth) - 0.5) * 0.08;
      targetRX = ((e.clientY / window.innerHeight) - 0.5) * 0.06;
    }, { passive: true });
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function frame() {
    const dt = clock.getDelta();
    if (!reduceMotion) {
      planet.rotation.y += dt * 0.16;
      moonPivot.rotation.y += dt * 0.5;
      visitor.rotation.y += dt * 0.22;
      clouds.rotation.y += dt * 0.02;
      greenery.rotation.y -= dt * 0.015;
      lab.rotation.x += (targetRX - lab.rotation.x) * 0.04;
      lab.rotation.z += (targetRZ - lab.rotation.z) * 0.04;
      env.position.z = (env.position.z + dt * 0.45) % 2;   // receding drift
    }
    controls.update();
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener("visibilitychange", () => {
    renderer.setAnimationLoop(document.hidden ? null : frame);
  });

  qa("[data-scene]").forEach((key) => {
    key.addEventListener("click", () => {
      const isPlanet = key.dataset.scene === "planet";
      planet.visible = isPlanet;
      visitor.visible = !isPlanet;
      qa("[data-scene]").forEach((k) => k.classList.toggle("is-active", k === key));
    });
  });
}

if (flag === "in" && !reduceMotion) {
  setTimeout(initScene, 1050); // after the deck snap settles
} else {
  initScene();
}
