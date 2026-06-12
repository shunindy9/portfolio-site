/* CONTROL deck — cockpit logic. ES module (control.html loads it with
 * type="module" + an importmap for Three.js). Sections:
 *   entrance/exit transitions · deck keys + holograms · i18n-lite ·
 *   JST clocks · Open-Meteo gauges · Web Audio (whoosh/clicks/mute) ·
 *   Three.js wireframe planet + visitor with no-WebGL fallback. */

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
 * CLOCKS — deck/header HH:MM every 30s; SYSTEM pane HH:MM:SS at 1s
 * only while that pane is open.
 * ---------------------------------------------------------------- */
function jst(showSeconds) {
  try {
    return new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Tokyo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      ...(showSeconds ? { second: "2-digit" } : {})
    });
  } catch (_) { return showSeconds ? "--:--:--" : "--:--"; }
}
function tickMinutes() { qa(".jst-clock").forEach((el) => { el.textContent = jst(false); }); }
tickMinutes();
setInterval(tickMinutes, 30000);

let secTimer = null;
function startSecondsClock() {
  if (secTimer) return;
  const els = qa(".jst-clock-s");
  const tick = () => els.forEach((el) => { el.textContent = jst(true); });
  tick();
  secTimer = setInterval(tick, 1000);
}
function stopSecondsClock() {
  if (secTimer) { clearInterval(secTimer); secTimer = null; }
}

/* ----------------------------------------------------------------
 * WEATHER — Open-Meteo, Tokyo, no API key. Cached 10 minutes in
 * sessionStorage so deck re-entries don't refetch.
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
 * THREE.JS — wireframe planet + visitor. Dynamically imported after
 * the entrance snap so module parsing never fights the animation.
 * OrbitControls: drag to spin, wheel/pinch to zoom. Pauses when the
 * tab is hidden. Full DOM fallback if WebGL is unavailable.
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
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.4, 6);

  const AMBER = 0xffb35c;
  const CYAN  = 0x4fd6e0;
  const wire = (color, opacity = 0.85) =>
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });

  /* PLANET — icosahedron globe + tilted ring + small moon. */
  const planet = new THREE.Group();
  planet.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 2), wire(AMBER)));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.02, 6, 80), wire(CYAN, 0.7));
  ring.rotation.x = Math.PI / 2.4;
  ring.rotation.y = 0.25;
  planet.add(ring);
  const moonPivot = new THREE.Group();
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), wire(CYAN, 0.9));
  moon.position.set(3.1, 0.4, 0);
  moonPivot.add(moon);
  planet.add(moonPivot);
  scene.add(planet);

  /* VISITOR — a friendly wireframe alien from primitives. */
  const visitor = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.78, 14, 12), wire(CYAN));
  head.scale.set(1, 1.25, 0.95);
  head.position.y = 1.25;
  visitor.add(head);
  const eyeGeo = new THREE.SphereGeometry(0.21, 10, 8);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, wire(AMBER, 1));
    eye.position.set(sx * 0.34, 1.3, 0.62);
    eye.scale.set(1, 1.6, 0.6);
    eye.rotation.z = sx * -0.35;
    visitor.add(eye);
  }
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.52, 1.45, 10, 3), wire(CYAN, 0.8));
  body.position.y = -0.05;
  visitor.add(body);
  const limbGeo = new THREE.CylinderGeometry(0.07, 0.05, 1.1, 6, 2);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(limbGeo, wire(CYAN, 0.8));
    arm.position.set(sx * 0.62, 0.18, 0);
    arm.rotation.z = sx * 0.5;
    visitor.add(arm);
    const leg = new THREE.Mesh(limbGeo, wire(CYAN, 0.8));
    leg.position.set(sx * 0.22, -1.3, 0);
    leg.rotation.z = sx * 0.08;
    visitor.add(leg);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 5), wire(AMBER, 0.9));
  antenna.position.y = 2.35;
  visitor.add(antenna);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), wire(AMBER, 1));
  tip.position.y = 2.68;
  visitor.add(tip);
  visitor.visible = false;
  visitor.position.y = 0.1;
  scene.add(visitor);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 10;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.8;

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
      planet.rotation.y += dt * 0.12;
      moonPivot.rotation.y += dt * 0.45;
      visitor.rotation.y += dt * 0.18;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener("visibilitychange", () => {
    renderer.setAnimationLoop(document.hidden ? null : frame);
  });

  /* Scene keys — swap which hologram object is on stage. */
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
