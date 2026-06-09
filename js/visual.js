/* ----------------------------------------------------------------------------
 * Hero background visual — silver Liquid Crystal WebGL shader.
 *
 * A muted, brushed-silver flow with very low saturation, slow speed, and
 * subtle cursor warp. Replaces the warm bloom canvas with a cooler atmosphere
 * — Tokyo Analog warmth survives in the foreground accents (CTA, role label,
 * pulse-beams), but the air the hero breathes is cool.
 *
 * Drop-in replaceable: this file owns the contents of #hero-canvas. To swap
 * for a TouchDesigner loop later, replace the canvas in index.html and delete
 * this file — the rest of the page doesn't depend on it.
 *
 * Fallbacks:
 *  - No WebGL  → a static silver gradient is painted via 2D canvas.
 *  - Reduced motion → one frame rendered, no animation, no event listeners.
 *  - Touch / no-hover → slow Lissajous ambient drift on iMouse.
 * -------------------------------------------------------------------------- */
(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasHover     = window.matchMedia("(hover: hover)").matches;

  /* Neon green flow. Hue ≈ 130, lifted saturation, slightly brighter — reads
   * as luminous green plasma without ever becoming pure radioactive lime. */
  const PARAMS = {
    hue:        130,   // neon green
    speed:      0.32,
    noise:      0.14,
    warp:       0.10,
    zoom:       1.60,
    brightness: 0.72,
    saturation: 0.62,
    invert:     0.0
  };

  /* ----------------------------------------------------------------
   * 2D fallback (no WebGL): one static silver gradient, no animation.
   * ---------------------------------------------------------------- */
  function fallback2D() {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 30, w * 0.5, h * 0.5, Math.max(w, h));
    g.addColorStop(0,    "#15351e");
    g.addColorStop(0.55, "#0d1d12");
    g.addColorStop(1,    "#0d0b07");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  let gl = null;
  try {
    gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false });
  } catch (_) { /* swallow */ }

  if (!gl) {
    fallback2D();
    window.addEventListener("resize", fallback2D);
    return;
  }

  /* ----------------------------------------------------------------
   * Shaders
   * ---------------------------------------------------------------- */
  const VS = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;

  /* Adapted from the Liquid Crystal shader. Notable changes:
   *  - hsv2rgb takes a `uSat` uniform so the look stays brushed-silver.
   *  - Output is multiplied with a soft vignette built into the shader,
   *    so dark corners marry into the page bg.
   *  - Bands are slightly softer (smoothstep 0.42–0.62) for less digital edge.
   */
  const FS = `
    precision highp float;
    uniform float iTime;
    uniform vec2  iResolution;
    uniform vec2  iMouse;
    uniform float uHue;
    uniform float uSat;
    uniform float uNoise;
    uniform float uWarp;
    uniform float uZoom;
    uniform float uBrightness;
    uniform float uInvert;     // 0 = dark base + neon bands, 1 = white base + neon bands

    vec3 hsv2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                              + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);
      uv *= uZoom;
      vec2 mouseUv = (iMouse * 2.0 - 1.0);
      mouseUv.y *= -1.0;
      uv += mouseUv * uWarp;

      float time = iTime * 0.5;
      float n  = snoise(uv * 1.4 + vec2(time * 0.30, -time * 0.20)) * 0.5;
            n += snoise(uv * 2.8 + vec2(-time * 0.20, time * 0.30)) * 0.25;
      n = (n + 1.0) * 0.5;

      float bands = sin(n * 14.0 - time * 1.8);
      bands = smoothstep(0.42, 0.62, bands);

      float detail = snoise(uv * 9.0 + time) * 0.5 + 0.5;
      bands = mix(bands, bands + detail, uNoise);

      vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, uSat, 1.0));
      vec3 darkColor = baseColor * bands * uBrightness;

      // Marry edges into the page background.
      float vig = smoothstep(1.65, 0.55, length(uv) * 0.7);
      darkColor *= vig;

      // Deep base so dark areas read as the page bg, not pure black.
      darkColor = max(darkColor, vec3(0.043, 0.043, 0.05));

      // Inverted (light theme): white page, green plasma where bands are strong.
      float intensity = clamp(bands * uBrightness * vig, 0.0, 1.0);
      vec3 lightColor = mix(vec3(1.0), baseColor, intensity);

      vec3 color = mix(darkColor, lightColor, uInvert);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("shader compile error:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER,   VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { fallback2D(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("program link error:", gl.getProgramInfoLog(prog));
    fallback2D();
    return;
  }
  gl.useProgram(prog);

  const verts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, "position");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const U = {
    iTime:       gl.getUniformLocation(prog, "iTime"),
    iResolution: gl.getUniformLocation(prog, "iResolution"),
    iMouse:      gl.getUniformLocation(prog, "iMouse"),
    uHue:        gl.getUniformLocation(prog, "uHue"),
    uSat:        gl.getUniformLocation(prog, "uSat"),
    uNoise:      gl.getUniformLocation(prog, "uNoise"),
    uWarp:       gl.getUniformLocation(prog, "uWarp"),
    uZoom:       gl.getUniformLocation(prog, "uZoom"),
    uBrightness: gl.getUniformLocation(prog, "uBrightness"),
    uInvert:     gl.getUniformLocation(prog, "uInvert")
  };

  /* ----------------------------------------------------------------
   * Mouse / ambient state
   * ---------------------------------------------------------------- */
  const target  = { x: 0.5, y: 0.5 };
  const current = { x: 0.5, y: 0.5 };
  const LERP = 0.06;

  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width;
    target.y = 1.0 - (e.clientY - r.top) / r.height;
  }
  function onPointerLeave() { target.x = 0.5; target.y = 0.5; }

  function ambient(time) {
    target.x = 0.5 + Math.sin(time * 0.00010) * 0.18;
    target.y = 0.5 + Math.cos(time * 0.00013) * 0.16;
  }

  /* ----------------------------------------------------------------
   * Resize — cap DPR on mobile to keep fillrate sane.
   * Guard against 0×0 reads: if the canvas's host is display:none (e.g.
   * mid-theme-toggle), clientWidth/Height return 0. Writing zero into
   * canvas.width and gl.viewport would freeze the shader at a blank state
   * until something kicks it. Just skip; the ResizeObserver below will fire
   * the moment dimensions return.
   * ---------------------------------------------------------------- */
  function resize() {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const maxDPR = (window.innerWidth < 600 ? 1.25 : 1.75);
    const dpr = Math.min(window.devicePixelRatio || 1, maxDPR);
    const w = Math.floor(cw * dpr);
    const h = Math.floor(ch * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.iResolution, w, h);
  }

  /* ----------------------------------------------------------------
   * Static uniforms (write once)
   * ---------------------------------------------------------------- */
  function pushStaticUniforms() {
    gl.uniform1f(U.uHue,        PARAMS.hue);
    gl.uniform1f(U.uSat,        PARAMS.saturation);
    gl.uniform1f(U.uNoise,      PARAMS.noise);
    gl.uniform1f(U.uWarp,       PARAMS.warp);
    gl.uniform1f(U.uZoom,       PARAMS.zoom);
    gl.uniform1f(U.uBrightness, PARAMS.brightness);
    gl.uniform1f(U.uInvert,     PARAMS.invert);
  }

  resize();
  pushStaticUniforms();

  /* External hook so main.js (and the browser console) can drive shader
   * parameters live. Each setter clamps + updates both the local PARAMS
   * mirror and the live GL uniform. */
  window.__heroShader = {
    setZoom(v) {
      const clamped = Math.max(0.5, Math.min(8, +v || PARAMS.zoom));
      PARAMS.zoom = clamped;
      gl.uniform1f(U.uZoom, clamped);
    },
    setHue(v) {
      const clamped = ((+v % 360) + 360) % 360;
      PARAMS.hue = clamped;
      gl.uniform1f(U.uHue, clamped);
    },
    setSat(v) {
      const clamped = Math.max(0, Math.min(1, +v));
      PARAMS.saturation = clamped;
      gl.uniform1f(U.uSat, clamped);
    },
    setBrightness(v) {
      const clamped = Math.max(0.05, Math.min(2, +v));
      PARAMS.brightness = clamped;
      gl.uniform1f(U.uBrightness, clamped);
    },
    setInvert(v) {
      const clamped = Math.max(0, Math.min(1, +v));
      PARAMS.invert = clamped;
      gl.uniform1f(U.uInvert, clamped);
    },
    getZoom() { return PARAMS.zoom; },
    getParams() { return Object.assign({}, PARAMS); }
  };

  /* ----------------------------------------------------------------
   * Frame loop
   * ---------------------------------------------------------------- */
  let t0 = 0;
  function frame(ts) {
    if (!t0) t0 = ts;
    const time = ts - t0;

    if (!hasHover) ambient(time);
    current.x += (target.x - current.x) * LERP;
    current.y += (target.y - current.y) * LERP;

    gl.uniform1f(U.iTime, (time / 1000) * PARAMS.speed);
    gl.uniform2f(U.iMouse, current.x, current.y);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    // One frame, no listeners.
    gl.uniform1f(U.iTime, 0);
    gl.uniform2f(U.iMouse, 0.5, 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  } else {
    if (hasHover) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave);
    } else {
      window.addEventListener("touchmove", (e) => {
        if (e.touches[0]) onPointerMove(e.touches[0]);
      }, { passive: true });
    }
    requestAnimationFrame(frame);
  }

  /* Debounced resize */
  let pending = false;
  function scheduleResize() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { resize(); pending = false; });
  }
  window.addEventListener("resize", scheduleResize);

  /* ResizeObserver — the robust path. Fires when the canvas's layout box
   * changes for ANY reason: theme toggle (display:none → block), DOM moves
   * into the .hero__visual-host wrapper for diagonal mode, viewport resize,
   * orientation change. This is what recovers the shader after a theme
   * cycle when the host briefly went display:none. */
  if (typeof ResizeObserver !== "undefined") {
    try {
      const ro = new ResizeObserver(() => scheduleResize());
      ro.observe(canvas);
      // Also watch the immediate parent, since `display:none` on an ancestor
      // doesn't fire RO on the canvas itself reliably across browsers.
      if (canvas.parentElement) ro.observe(canvas.parentElement);
    } catch (_) { /* swallow — window resize is the fallback */ }
  }

  /* WebGL context loss handlers — rare but real (GPU memory pressure,
   * backgrounded tab, certain Safari conditions). On loss, the rAF loop
   * silently no-ops; on restore, we rebuild everything from scratch by
   * letting the user reload, but at minimum we acknowledge to avoid the
   * default browser block. */
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault(); // tells the browser to try to restore
  }, false);
  canvas.addEventListener("webglcontextrestored", () => {
    // Best-effort: re-push static uniforms and force a resize so the next
    // frame paints. If the program object was lost, the shader stays blank
    // until reload — but at least we don't crash.
    try {
      pushStaticUniforms();
      scheduleResize();
    } catch (_) { /* swallow */ }
  }, false);

  /* Expose a manual repaint hook so main.js's theme toggle can be paranoid
   * about recovery without re-implementing internal state. */
  if (window.__heroShader) {
    window.__heroShader.refresh = scheduleResize;
  }
})();
