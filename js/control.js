/* CONTROL deck — cockpit logic. ES module (control.html loads it with
 * type="module" + an importmap for Three.js). Sections:
 *   i18n-lite · audio · entrance/exit · deck keys + holograms ·
 *   clocks + world ticker · Open-Meteo gauges · data columns ·
 *   Three.js SPECIMEN LAB (Image-3 lattice + strata + entity). */

const CONFIG = window.SITE_CONFIG || {};
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const q  = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => Array.from(r.querySelectorAll(s));

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
 * AUDIO — Web Audio, no files. Lazy context (browsers block audio
 * before a user gesture; the entrance whoosh is best-effort).
 * ---------------------------------------------------------------- */
const muteSwitch = q("#mute-switch");
let muted = false;
try { muted = localStorage.getItem("control-mute") === "1"; } catch (_) {}
if (muteSwitch) {
  muteSwitch.checked = muted;
  muteSwitch.addEventListener("change", () => {
    muted = muteSwitch.checked;
    try { localStorage.setItem("control-mute", muted ? "1" : "0"); } catch (_) {}
    if (!muted) keyClick(660);
  });
}

let actx = null;
function audio() {
  if (muted) return null;
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; }
  }
  if (actx.state === "suspended") actx.resume().catch(() => {});
  return actx;
}

function keyClick(freq = 520) {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.06);
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

function whoosh() {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 1.1;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(220, t);
  filter.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.7);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
}

/* ----------------------------------------------------------------
 * ENTRANCE / EXIT
 * ---------------------------------------------------------------- */
let flag = null;
try {
  flag = sessionStorage.getItem("cockpit-transition");
  sessionStorage.removeItem("cockpit-transition");
} catch (_) {}

if (flag === "in" && !reduceMotion) {
  document.body.classList.add("is-entering");
  whoosh(); // best effort — silently blocked unless the browser carried the gesture
  setTimeout(() => document.body.classList.remove("is-entering"), 1400);
}

function exitToHome(href) {
  if (reduceMotion) { location.href = href; return; }
  document.body.classList.add("is-exiting");
  try { sessionStorage.setItem("cockpit-transition", "out"); } catch (_) {}
  keyClick(330);
  setTimeout(() => { location.href = href; }, 520);
}
["#exit-top", "#exit-key"].forEach((sel) => {
  const el = q(sel);
  if (el) el.addEventListener("click", (e) => { e.preventDefault(); exitToHome(el.getAttribute("href")); });
});

/* ----------------------------------------------------------------
 * DECK KEYS → HOLOGRAMS
 * ---------------------------------------------------------------- */
const holo = q("#holo");
const panes = qa(".holo__pane");
let openPane = null;

function showHolo(name) {
  panes.forEach((p) => { p.hidden = p.dataset.pane !== name; });
  holo.hidden = false;
  holo.classList.remove("is-open");
  void holo.offsetWidth; // restart the pop animation
  holo.classList.add("is-open");
  openPane = name;
  qa("[data-holo]").forEach((k) => k.classList.toggle("is-active", k.dataset.holo === name));
  if (name === "system") startSecondsClock();
}
function hideHolo() {
  holo.hidden = true;
  openPane = null;
  qa("[data-holo]").forEach((k) => k.classList.remove("is-active"));
  stopSecondsClock();
}

qa("[data-holo]").forEach((key) => {
  key.addEventListener("click", () => {
    keyClick(key.dataset.holo === "system" ? 740 : 520);
    if (openPane === key.dataset.holo) { hideHolo(); return; }
    showHolo(key.dataset.holo);
  });
});
q("#holo-close").addEventListener("click", () => { keyClick(380); hideHolo(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && openPane) hideHolo(); });

/* ----------------------------------------------------------------
 * CLOCKS — deck CRTs HH:MM every 30s; the world ticker re-renders on
 * the same beat (its slide is pure CSS); SYSTEM pane gets seconds.
 * ---------------------------------------------------------------- */
function cityTime(tz, showSeconds) {
  try {
    return new Date().toLocaleTimeString("en-GB", {
      timeZone: tz,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      ...(showSeconds ? { second: "2-digit" } : {})
    });
  } catch (_) { return showSeconds ? "--:--:--" : "--:--"; }
}
const TICKER_CITIES = [
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
    const w = json.current;
    paintWeather(w);
    try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), w })); } catch (_) {}
  } catch (_) {
    const set = (id) => { const el = q(id); if (el) el.textContent = "NO SIGNAL"; };
    ["#g-temp", "#g-cond", "#g-wind", "#g-hum"].forEach(set);
  }
}
loadWeather();

/* ----------------------------------------------------------------
 * DATA COLUMNS — Image 3's flanking terminal text. Pre-render rows
 * of glyph noise, then mutate a couple of rows on a slow interval
 * (8Hz would be churn; 3.5Hz reads "telemetry"). Paused when hidden.
 * ---------------------------------------------------------------- */
const GLYPHS = "アイウエオカキクケコサシスセソ0123456789#%&*+-=◇◆▲▼■□:.｜";
function glyphRow(len) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += Math.random() < 0.16 ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }
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
  // One row per column per tick at ~2.5Hz — telemetry feel without
  // measurable frame-time spikes (2 rows @ 3.5Hz pushed p95 to 13ms).
  let timer = setInterval(mutate, 400);
  function mutate() {
    stores.forEach((rows) => {
      const r = rows[(Math.random() * rows.length) | 0];
      r.textContent = glyphRow(8 + ((Math.random() * 9) | 0));
    });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { clearInterval(timer); timer = null; }
    else if (!timer) { timer = setInterval(mutate, 400); }
  });
}
initDataCols();

/* ----------------------------------------------------------------
 * THREE.JS — the SPECIMEN LAB (Image 3). A tall cyan wireframe
 * lattice with stacked strata: cloud points up top, greenery points,
 * a green grid plane, an orange grid plane, and a blue water plane
 * with rock clusters at the bottom. The current specimen (planet or
 * visitor) hovers inside the chamber. OrbitControls for drag/zoom,
 * subtle pointer parallax on the lab group (pacomepertant feel),
 * paused when the tab is hidden, DOM fallback when WebGL is missing.
 * ---------------------------------------------------------------- */
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.4, 8.4);

  const CYAN   = 0x4fd6e0;
  const GREEN  = 0x46ff5a;
  const ORANGE = 0xff8a1e;
  const BLUE   = 0x3b7bd6;
  const AMBER  = 0xffb35c;
  const WHITE  = 0xf2f5f8;

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

  /* --- The lab group (everything parallaxes together) --- */
  const lab = new THREE.Group();
  scene.add(lab);

  /* Lattice — tall wireframe chamber, Image 3's cyan cage. */
  const W = 3.4, H = 5.4, D = 3.4;
  const lattice = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)),
    lineMat(CYAN, 0.55)
  );
  lab.add(lattice);
  // Inner vertical rails — extra cage lines so it reads as scaffold.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const rail = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(W * 0.66, H, D * 0.66)),
        lineMat(CYAN, 0.18)
      );
      lab.add(rail);
      break; // one inner cage is enough
    }
    break;
  }

  /* Strata, top → bottom (Image 3): clouds / greenery / green grid /
     orange grid / water + rocks. */
  const clouds = new THREE.Group();
  clouds.add(pointCloud(160, WHITE, 0.075, [2.2, 0.5, 1.8], [-0.3, 0, 0], 0.85));
  clouds.add(pointCloud(110, WHITE, 0.06,  [1.6, 0.4, 1.4], [0.8, 0.18, 0.3], 0.7));
  clouds.position.y = 1.95;
  lab.add(clouds);

  const greenery = pointCloud(320, GREEN, 0.05, [2.8, 0.5, 2.8], [0, 0, 0], 0.85);
  greenery.position.y = 0.85;
  lab.add(greenery);

  const gridGreen = new THREE.GridHelper(W * 0.94, 16, GREEN, GREEN);
  gridGreen.material.transparent = true;
  gridGreen.material.opacity = 0.45;
  gridGreen.position.y = 0.35;
  lab.add(gridGreen);

  const gridOrange = new THREE.GridHelper(W * 0.94, 16, ORANGE, ORANGE);
  gridOrange.material.transparent = true;
  gridOrange.material.opacity = 0.4;
  gridOrange.position.y = -0.5;
  lab.add(gridOrange);

  const water = new THREE.Group();
  const gridWater = new THREE.GridHelper(W * 0.94, 12, BLUE, BLUE);
  gridWater.material.transparent = true;
  gridWater.material.opacity = 0.5;
  water.add(gridWater);
  water.add(pointCloud(240, BLUE, 0.045, [3.0, 0.35, 3.0], [0, -0.15, 0], 0.8));
  for (const rx of [-0.9, 0.5, 1.1]) {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + Math.random() * 0.12, 0), wire(0x6b86c8, 0.65));
    rock.position.set(rx, -0.1, (Math.random() - 0.5) * 1.6);
    water.add(rock);
  }
  water.position.y = -1.75;
  lab.add(water);

  /* --- Specimens — materialized inside the chamber --- */
  const planet = new THREE.Group();
  planet.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 2), wire(AMBER)));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.014, 6, 70), wire(CYAN, 0.7));
  ring.rotation.x = Math.PI / 2.4;
  ring.rotation.y = 0.25;
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
    head.scale.set(1, 1.25, 0.95);
    head.position.y = 0.62;
    visitor.add(head);
    const eyeGeo = new THREE.SphereGeometry(0.105, 10, 8);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, wire(AMBER, 1));
      eye.position.set(sx * 0.17, 0.65, 0.32);
      eye.scale.set(1, 1.6, 0.6);
      eye.rotation.z = sx * -0.35;
      visitor.add(eye);
    }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.74, 10, 3), wire(CYAN, 0.8));
    body.position.y = -0.04;
    visitor.add(body);
    const limbGeo = new THREE.CylinderGeometry(0.035, 0.026, 0.56, 6, 2);
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(limbGeo, wire(CYAN, 0.8));
      arm.position.set(sx * 0.31, 0.1, 0);
      arm.rotation.z = sx * 0.5;
      visitor.add(arm);
      const leg = new THREE.Mesh(limbGeo, wire(CYAN, 0.8));
      leg.position.set(sx * 0.11, -0.66, 0);
      leg.rotation.z = sx * 0.08;
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

  /* Pointer parallax — the lab leans gently toward the cursor
   * (pacomepertant look-around), independent of OrbitControls. */
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
    }
    controls.update();
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener("visibilitychange", () => {
    renderer.setAnimationLoop(document.hidden ? null : frame);
  });

  /* Specimen keys — swap which entity is in the chamber. */
  qa("[data-scene]").forEach((key) => {
    key.addEventListener("click", () => {
      keyClick(880);
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
