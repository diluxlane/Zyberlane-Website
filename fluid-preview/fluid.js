/* Zyberlane Fluid Lab: original grid-based incompressible fluid solver.
 * Algorithm background: Mark Harris, GPU Gems chapter 38 (Stable Fluids).
 * No particle sprites, external libraries, telemetry, or production-page imports.
 */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const canvas = byId('fluid');
  const status = byId('status');
  const engine = byId('engine');
  const metrics = byId('metrics');
  const input = byId('input');
  const health = byId('health');
  const pauseButton = byId('pause');
  const burstButton = byId('burst');
  const clearButton = byId('clear');
  const ambient = byId('ambient');
  const quality = byId('quality');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const pointers = new Map();
  const pending = [];
  let errorCount = 0, frameCount = 0, moveCount = 0, splatCount = 0;
  let lastInput = 'none';
  let paused = motion.matches, lost = false, failed = false;
  let raf = 0, lastTime = 0, elapsed = 0, lastAmbient = 0, lastMetrics = 0;
  let sampleFrames = 0, sampleTime = 0, adaptiveLow = false;
  let gl, programs, velocity, dye, pressure, divergence, curl;
  let targets = [];

  function reportError(message) {
    errorCount++;
    health.textContent = `Runtime errors: ${errorCount} · ${String(message).slice(0, 140)}`;
  }
  addEventListener('error', event => reportError(event.message || 'Resource load failed'));
  addEventListener('unhandledrejection', event => reportError(event.reason?.message || 'Unhandled promise rejection'));

  const vertex = `#version 300 es
    precision highp float;
    layout(location = 0) in vec2 aPosition;
    out vec2 vUv;
    void main() { vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }
  `;
  const fragment = `#version 300 es
    precision highp float;
    precision highp sampler2D;
    in vec2 vUv;
    out vec4 fragColor;
  `;
  const shaders = {
    clear: `uniform sampler2D uSource; uniform float uValue;
      void main() { fragColor = texture(uSource, vUv) * uValue; }`,
    splat: `uniform sampler2D uTarget; uniform vec2 uPoint; uniform vec3 uColor;
      uniform float uAspect; uniform float uRadius;
      void main() {
        vec2 p = vUv - uPoint; p.x *= uAspect;
        vec3 addition = exp(-dot(p, p) / uRadius) * uColor;
        fragColor = vec4(texture(uTarget, vUv).xyz + addition, 1.0);
      }`,
    advect: `uniform sampler2D uVelocity; uniform sampler2D uSource;
      uniform vec2 uVelocityTexel; uniform float uDt; uniform float uDecay;
      void main() {
        vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;
        fragColor = vec4(texture(uSource, coord).xyz * exp(-uDecay * uDt), 1.0);
      }`,
    curl: `uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main() {
        float l = texture(uVelocity, vUv - vec2(uTexel.x, 0)).y;
        float r = texture(uVelocity, vUv + vec2(uTexel.x, 0)).y;
        float b = texture(uVelocity, vUv - vec2(0, uTexel.y)).x;
        float t = texture(uVelocity, vUv + vec2(0, uTexel.y)).x;
        fragColor = vec4(0.5 * (r - l - t + b), 0, 0, 1);
      }`,
    vorticity: `uniform sampler2D uVelocity; uniform sampler2D uCurl;
      uniform vec2 uTexel; uniform float uDt;
      void main() {
        float l = texture(uCurl, vUv - vec2(uTexel.x, 0)).x;
        float r = texture(uCurl, vUv + vec2(uTexel.x, 0)).x;
        float b = texture(uCurl, vUv - vec2(0, uTexel.y)).x;
        float t = texture(uCurl, vUv + vec2(0, uTexel.y)).x;
        float c = texture(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
        force /= length(force) + 0.0001;
        force *= 28.0 * c; force.y *= -1.0;
        vec2 v = texture(uVelocity, vUv).xy + force * uDt;
        fragColor = vec4(clamp(v, vec2(-350), vec2(350)), 0, 1);
      }`,
    divergence: `uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main() {
        float l = texture(uVelocity, vUv - vec2(uTexel.x, 0)).x;
        float r = texture(uVelocity, vUv + vec2(uTexel.x, 0)).x;
        float b = texture(uVelocity, vUv - vec2(0, uTexel.y)).y;
        float t = texture(uVelocity, vUv + vec2(0, uTexel.y)).y;
        vec2 c = texture(uVelocity, vUv).xy;
        if (vUv.x < uTexel.x) l = -c.x;
        if (vUv.x > 1.0 - uTexel.x) r = -c.x;
        if (vUv.y < uTexel.y) b = -c.y;
        if (vUv.y > 1.0 - uTexel.y) t = -c.y;
        fragColor = vec4(0.5 * (r - l + t - b), 0, 0, 1);
      }`,
    pressure: `uniform sampler2D uPressure; uniform sampler2D uDivergence; uniform vec2 uTexel;
      void main() {
        float l = texture(uPressure, vUv - vec2(uTexel.x, 0)).x;
        float r = texture(uPressure, vUv + vec2(uTexel.x, 0)).x;
        float b = texture(uPressure, vUv - vec2(0, uTexel.y)).x;
        float t = texture(uPressure, vUv + vec2(0, uTexel.y)).x;
        float d = texture(uDivergence, vUv).x;
        fragColor = vec4((l + r + b + t - d) * 0.25, 0, 0, 1);
      }`,
    gradient: `uniform sampler2D uPressure; uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main() {
        float l = texture(uPressure, vUv - vec2(uTexel.x, 0)).x;
        float r = texture(uPressure, vUv + vec2(uTexel.x, 0)).x;
        float b = texture(uPressure, vUv - vec2(0, uTexel.y)).x;
        float t = texture(uPressure, vUv + vec2(0, uTexel.y)).x;
        vec2 v = texture(uVelocity, vUv).xy - 0.5 * vec2(r - l, t - b);
        if (vUv.x < uTexel.x || vUv.x > 1.0 - uTexel.x) v.x = 0.0;
        if (vUv.y < uTexel.y || vUv.y > 1.0 - uTexel.y) v.y = 0.0;
        fragColor = vec4(v, 0, 1);
      }`,
    display: `uniform sampler2D uDye; uniform vec2 uTexel;
      void main() {
        float d = max(texture(uDye, vUv).r, 0.0);
        float l = texture(uDye, vUv - vec2(uTexel.x, 0)).r;
        float r = texture(uDye, vUv + vec2(uTexel.x, 0)).r;
        float b = texture(uDye, vUv - vec2(0, uTexel.y)).r;
        float t = texture(uDye, vUv + vec2(0, uTexel.y)).r;
        vec3 normal = normalize(vec3((r-l)*2.0, (t-b)*2.0, 0.65));
        float light = 0.74 + 0.26 * max(dot(normal, normalize(vec3(-0.4, 0.65, 1.0))), 0.0);
        float ink = (1.0 - exp(-d * 1.25)) * light;
        fragColor = vec4(vec3(0.01176) + ink * vec3(0.93, 0.012, 0.025), 1.0);
      }`
  };

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Fluid shader compilation failed: ${message}`);
    }
    return shader;
  }

  function program(source) {
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment + source);
    const id = gl.createProgram();
    gl.attachShader(id, vs); gl.attachShader(id, fs); gl.linkProgram(id);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(id, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(id));
    const uniforms = {};
    const count = gl.getProgramParameter(id, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(id, i).name;
      uniforms[name] = gl.getUniformLocation(id, name);
    }
    return { id, uniforms };
  }

  function target(width, height, filter) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fbo); gl.deleteTexture(texture);
      throw new Error('Floating-point render targets are not supported.');
    }
    gl.viewport(0, 0, width, height); gl.clear(gl.COLOR_BUFFER_BIT);
    const result = { texture, fbo, width, height, texel: [1 / width, 1 / height] };
    targets.push(result);
    return result;
  }

  function doubleTarget(width, height, filter) {
    return {
      read: target(width, height, filter), write: target(width, height, filter),
      swap() { const previous = this.read; this.read = this.write; this.write = previous; }
    };
  }

  function size(shortSide) {
    const aspect = canvas.width / canvas.height;
    return aspect >= 1 ? [Math.round(shortSide * Math.min(aspect, 2.5)), shortSide]
      : [shortSide, Math.round(shortSide / Math.max(aspect, 0.4))];
  }

  function allocate() {
    for (const item of targets) { gl.deleteTexture(item.texture); gl.deleteFramebuffer(item.fbo); }
    targets = [];
    const low = quality.value === 'low' || (quality.value === 'auto' && (coarse.matches || adaptiveLow));
    const simSize = size(low ? 96 : 144);
    const dyeSize = size(low ? 384 : 640);
    velocity = doubleTarget(...simSize, gl.LINEAR);
    dye = doubleTarget(...dyeSize, gl.LINEAR);
    pressure = doubleTarget(...simSize, gl.NEAREST);
    divergence = target(...simSize, gl.NEAREST);
    curl = target(...simSize, gl.NEAREST);
    engine.textContent = `Renderer: WebGL2 fluid · grid ${simSize.join('×')} · dye ${dyeSize.join('×')}${low ? ' · low' : ''}`;
    canvas.dataset.renderer = 'webgl2-fluid';
  }

  function draw(p, destination, textures = {}, values = {}) {
    gl.useProgram(p.id);
    let unit = 0;
    for (const [name, texture] of Object.entries(textures)) {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture.texture);
      gl.uniform1i(p.uniforms[name], unit++);
    }
    for (const [name, value] of Object.entries(values)) {
      if (Array.isArray(value)) {
        if (value.length === 2) gl.uniform2f(p.uniforms[name], ...value);
        else gl.uniform3f(p.uniforms[name], ...value);
      } else gl.uniform1f(p.uniforms[name], value);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination?.fbo || null);
    gl.viewport(0, 0, destination?.width || canvas.width, destination?.height || canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    if (!gl || lost || failed) return;
    const ratio = Math.min(devicePixelRatio || 1, coarse.matches ? 1.25 : 1.5);
    const scale = Math.min(ratio, 1920 / Math.max(innerWidth, innerHeight));
    const width = Math.max(1, Math.round(innerWidth * scale));
    const height = Math.max(1, Math.round(innerHeight * scale));
    if (canvas.width === width && canvas.height === height && velocity) return;
    canvas.width = width; canvas.height = height;
    pointers.clear(); pending.length = 0; allocate();
    if (!paused) seed();
    render();
  }

  function splat(x, y, dx, dy, strength = 0.65, radius = 0.00065) {
    const common = { uPoint: [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))], uAspect: canvas.width / canvas.height, uRadius: radius };
    draw(programs.splat, velocity.write, { uTarget: velocity.read }, {
      ...common, uColor: [Math.max(-250, Math.min(250, dx)), Math.max(-250, Math.min(250, dy)), 0]
    });
    velocity.swap();
    draw(programs.splat, dye.write, { uTarget: dye.read }, { ...common, uColor: [strength, 0, 0] });
    dye.swap(); splatCount++;
  }

  function seed() {
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2;
      splat(0.5 + Math.cos(angle) * 0.27 / Math.max(1, canvas.width / canvas.height),
        0.5 + Math.sin(angle) * 0.27, -Math.sin(angle) * 95, Math.cos(angle) * 95, 0.65, 0.0012);
    }
  }

  function step(dt) {
    while (pending.length) splat(...pending.shift());
    if (ambient.checked && elapsed - lastAmbient > 0.12) {
      lastAmbient = elapsed;
      const a = elapsed * 0.26;
      for (const offset of [0, Math.PI]) {
        splat(0.5 + Math.cos(a + offset) * 0.28, 0.5 + Math.sin(a * 1.3 + offset) * 0.22,
          -Math.sin(a + offset) * 16, Math.cos(a * 1.3 + offset) * 20, 0.075, 0.0006);
      }
    }
    const texel = velocity.read.texel;
    draw(programs.advect, velocity.write, { uVelocity: velocity.read, uSource: velocity.read }, { uVelocityTexel: texel, uDt: dt, uDecay: 0.32 });
    velocity.swap();
    draw(programs.curl, curl, { uVelocity: velocity.read }, { uTexel: texel });
    draw(programs.vorticity, velocity.write, { uVelocity: velocity.read, uCurl: curl }, { uTexel: texel, uDt: dt });
    velocity.swap();
    draw(programs.divergence, divergence, { uVelocity: velocity.read }, { uTexel: texel });
    draw(programs.clear, pressure.write, { uSource: pressure.read }, { uValue: 0.8 });
    pressure.swap();
    for (let i = 0; i < 20; i++) {
      draw(programs.pressure, pressure.write, { uPressure: pressure.read, uDivergence: divergence }, { uTexel: texel });
      pressure.swap();
    }
    draw(programs.gradient, velocity.write, { uPressure: pressure.read, uVelocity: velocity.read }, { uTexel: texel });
    velocity.swap();
    draw(programs.advect, dye.write, { uVelocity: velocity.read, uSource: dye.read }, { uVelocityTexel: texel, uDt: dt, uDecay: 0.42 });
    dye.swap();
  }

  function render() { draw(programs.display, null, { uDye: dye.read }, { uTexel: dye.read.texel }); }

  function updateStatus() {
    pauseButton.textContent = paused ? 'Play' : 'Pause';
    pauseButton.setAttribute('aria-pressed', String(paused));
    status.textContent = failed ? 'Fluid unavailable · WebGL2 required' : lost ? 'Graphics interrupted · waiting to restore'
      : paused ? (motion.matches ? 'Reduced motion · press Play to explore' : 'Paused · press Play to continue') : 'Live fluid · move or drag to stir';
    canvas.dataset.state = failed ? 'unavailable' : lost ? 'context-lost' : paused ? 'paused' : 'running';
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; lastTime = 0; pointers.clear(); pending.length = 0;
  }
  function start() {
    if (raf || paused || lost || failed || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    if (paused || lost || failed || document.hidden) return;
    const rawDt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
    const dt = Math.min(1 / 30, Math.max(1 / 240, rawDt));
    lastTime = now; elapsed += dt;
    try {
      step(dt); render(); frameCount++; sampleTime += rawDt; sampleFrames++;
      if (now - lastMetrics >= 750) {
        const fps = Math.round(sampleFrames / Math.max(sampleTime, 0.001));
        metrics.textContent = `Frames: ${frameCount} · ${fps} fps · ${canvas.width}×${canvas.height}`;
        input.textContent = `Input: ${lastInput} · moves: ${moveCount} · splats: ${splatCount}`;
        if (frameCount > 150 && quality.value === 'auto' && !adaptiveLow && !coarse.matches && fps < 38) {
          adaptiveLow = true; allocate(); seed();
        }
        sampleTime = 0; sampleFrames = 0; lastMetrics = now;
      }
    } catch (error) { fail(error); return; }
    start();
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: 1 - (event.clientY - rect.top) / rect.height, time: event.timeStamp };
  }
  function queueStroke(previous, current, touch) {
    const dx = current.x - previous.x, dy = current.y - previous.y;
    const distance = Math.hypot(dx * canvas.width / canvas.height, dy);
    const count = Math.max(1, Math.min(10, Math.ceil(distance / 0.018)));
    // Interpolate sparse events into continuous trails and cap per-frame GPU work.
    for (let i = 1; i <= count; i++) {
      if (pending.length >= 24) pending.shift();
      const t = i / count;
      pending.push([previous.x + dx * t, previous.y + dy * t, dx * 4200, dy * 4200, 0.4, touch ? 0.001 : 0.00065]);
    }
  }
  canvas.addEventListener('pointerdown', event => {
    if (paused || lost || failed || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const current = point(event);
    pointers.set(event.pointerId, current); canvas.setPointerCapture(event.pointerId);
    lastInput = event.pointerType || 'mouse';
    if (pending.length < 24) pending.push([current.x, current.y, 0, 30, 0.7, 0.001]);
  });
  canvas.addEventListener('pointermove', event => {
    if (paused || lost || failed) return;
    const touch = event.pointerType === 'touch';
    if (event.pointerType !== 'mouse' && !pointers.has(event.pointerId)) return;
    const current = point(event), previous = pointers.get(event.pointerId);
    lastInput = event.pointerType || 'mouse'; moveCount++;
    if (previous && current.time - previous.time < 180) queueStroke(previous, current, touch);
    else if (pending.length < 24) pending.push([current.x, current.y, 0, 12, 0.4, touch ? 0.001 : 0.00065]);
    pointers.set(event.pointerId, current);
  });
  function release(event) { pointers.delete(event.pointerId); }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, release);
  canvas.addEventListener('pointerleave', event => { if (!canvas.hasPointerCapture(event.pointerId)) release(event); });
  addEventListener('blur', () => { pointers.clear(); pending.length = 0; });

  pauseButton.addEventListener('click', () => {
    if (failed || lost) return;
    paused = !paused;
    if (paused) stop(); else start();
    updateStatus();
  });
  burstButton.addEventListener('click', () => {
    if (failed || lost) return;
    if (paused) { paused = false; updateStatus(); }
    seed(); render(); start();
  });
  clearButton.addEventListener('click', () => {
    if (failed || lost) return;
    pointers.clear(); pending.length = 0; ambient.checked = false;
    for (const item of targets) { gl.bindFramebuffer(gl.FRAMEBUFFER, item.fbo); gl.clear(gl.COLOR_BUFFER_BIT); }
    render();
  });
  quality.addEventListener('change', () => {
    if (failed || lost) return;
    try { adaptiveLow = false; allocate(); if (!paused) seed(); render(); }
    catch (error) { fail(error); }
  });
  motion.addEventListener('change', event => {
    paused = event.matches;
    if (paused) stop(); else start();
    updateStatus();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  addEventListener('resize', () => { try { resize(); } catch (error) { fail(error); } }, { passive: true });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; stop(); updateStatus(); });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false; targets = []; velocity = null;
    try { initialize(); updateStatus(); start(); } catch (error) { fail(error); }
  });

  function fail(error) {
    failed = true; stop(); reportError(error.message);
    engine.textContent = 'Renderer unavailable · WebGL2 + floating-point textures required';
    for (const control of [pauseButton, burstButton, clearButton, quality, ambient]) control.disabled = true;
    updateStatus(); console.error('[Zyberlane fluid]', error);
  }
  function initialize() {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) throw new Error('WebGL2 floating-point rendering is unavailable.');
    gl.clearColor(0, 0, 0, 0); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    programs = Object.fromEntries(Object.entries(shaders).map(([name, source]) => [name, program(source)]));
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    resize(); updateStatus();
  }
  try { initialize(); start(); } catch (error) { fail(error); }
})();
