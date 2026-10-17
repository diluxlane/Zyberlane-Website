// Exercises the actual CPU solver plus WebGL call/resource and input/lifecycle harnesses.
// This is regression coverage, not a substitute for real browser/device testing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const cpuSource = fs.readFileSync(path.join(root, 'assets/fluid-cpu.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'assets/fluid.js'), 'utf8');

// Records WebGL calls/resources without pretending to rasterize or benchmark a GPU.
function mockGL({ supported, shaderFailure, webgl1, linear }) {
  let serial = 0, activeProgram, boundTexture;
  const live = Object.fromEntries(['Texture', 'Framebuffer', 'Shader', 'Program', 'Buffer'].map(kind => [kind, new Set()]));
  const programs = [], colors = [], contexts = [], sizes = [], physics = [];
  let splatDraws = 0, contextLosses = 0;
  const gl = {};
  const constants = ['TEXTURE0', 'TEXTURE_2D', 'TEXTURE_MIN_FILTER', 'TEXTURE_MAG_FILTER', 'TEXTURE_WRAP_S', 'TEXTURE_WRAP_T', 'NEAREST', 'LINEAR', 'CLAMP_TO_EDGE', 'RGBA16F', 'RGBA', 'RG16F', 'RG', 'R16F', 'RED', 'HALF_FLOAT', 'FRAMEBUFFER', 'COLOR_ATTACHMENT0', 'FRAMEBUFFER_COMPLETE', 'COLOR_BUFFER_BIT', 'ARRAY_BUFFER', 'ELEMENT_ARRAY_BUFFER', 'STATIC_DRAW', 'FLOAT', 'TRIANGLES', 'UNSIGNED_SHORT', 'VERTEX_SHADER', 'FRAGMENT_SHADER', 'COMPILE_STATUS', 'LINK_STATUS', 'ACTIVE_UNIFORMS', 'MAX_TEXTURE_SIZE', 'BLEND', 'ONE', 'ONE_MINUS_SRC_ALPHA'];
  constants.forEach((name, i) => { gl[name] = i + 1; });
  if (!webgl1) gl.drawBuffers = () => {};
  for (const kind of Object.keys(live)) {
    gl[`create${kind}`] = () => { const obj = { kind, id: ++serial }; live[kind].add(obj); return obj; };
    gl[`delete${kind}`] = obj => { live[kind].delete(obj); };
  }
  Object.assign(gl, {
    getExtension(name) {
      if (name === 'WEBGL_lose_context') return { loseContext() { contextLosses++; } };
      if (name === 'OES_texture_half_float') return supported ? { HALF_FLOAT_OES: gl.HALF_FLOAT } : null;
      if (name.includes('linear')) return linear ? {} : null;
      return supported ? {} : null;
    },
    getParameter: () => 4096,
    bindTexture(target, texture) { boundTexture = texture; },
    texImage2D(target, level, format, width, height) { sizes.push([width, height]); if (boundTexture) boundTexture.size = [width, height]; },
    checkFramebufferStatus: () => supported ? gl.FRAMEBUFFER_COMPLETE : 0,
    shaderSource(shader, source) { shader.source = source; },
    getShaderParameter: () => !shaderFailure,
    getShaderInfoLog: () => 'Test compiler failure',
    attachShader(program, shader) { (program.shaders ||= []).push(shader); },
    linkProgram(program) {
      const text = program.shaders.map(shader => shader.source).join('\n');
      program.names = [...new Set([...text.matchAll(/uniform\s+(?:(?:lowp|mediump|highp)\s+)?\w+\s+(\w+)\s*;/g)].map(match => match[1]))];
      program.isSplat = program.names.includes('radius');
      programs.push(program);
    },
    getProgramParameter: (program, name) => name === gl.ACTIVE_UNIFORMS ? program.names.length : true,
    getProgramInfoLog: () => '',
    getActiveUniform: (program, i) => ({ name: program.names[i] }),
    getUniformLocation: (program, name) => ({ name }),
    useProgram(program) { activeProgram = program; },
    uniform1f(location, value) { physics.push([location.name, value]); },
    uniform3f(location, ...value) { if (location.name === 'color') colors.push(value); },
    drawElements() { if (activeProgram?.isSplat) splatDraws++; }
  });
  for (const name of ['clearColor', 'clear', 'disable', 'enable', 'texParameteri', 'activeTexture', 'bindFramebuffer', 'framebufferTexture2D', 'viewport', 'compileShader', 'bindAttribLocation', 'bindBuffer', 'bufferData', 'vertexAttribPointer', 'enableVertexAttribArray', 'uniform1i', 'uniform2f', 'blendFunc']) gl[name] = () => {};
  return { gl, live, programs, colors, contexts, sizes, physics,
    get splatDraws() { return splatDraws; }, get contextLosses() { return contextLosses; } };
}

function harness({ noGL = false, gpu = false, webgl1 = false, linear = true, shaderFailure = false, reduced = false, touch = false, home = false, loading = false, width, height } = {}) {
  let now = 0, nextId = 1, rendered = 0, splats = 0;
  const fluids = [];
  const callbacks = new Map(), elements = new Map(), winEvents = {}, docEvents = {}, errors = [];
  const docRegistrations = {}, queries = new Map();
  let loadingDone = false, loaderObserver;
  const context2D = {
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {}, drawImage() { rendered++; }
  };
  const graphics = mockGL({ supported: gpu || shaderFailure, shaderFailure, webgl1, linear });
  const gl = graphics.gl;
  let activeCanvas;
  Object.defineProperties(gl, {
    drawingBufferWidth: { get: () => activeCanvas.width },
    drawingBufferHeight: { get: () => activeCanvas.height }
  });
  class Element {
    constructor(id) {
      this.id = id; this.dataset = {}; this.events = {}; this.textContent = '';
      this.width = 300; this.height = 150; this.contextType = null;
      this.checked = id === 'ambient'; this.value = id === 'quality' ? 'auto' : '';
      this.disabled = false;
      this.isConnected = true;
      this.classList = { contains: () => loadingDone };
    }
    addEventListener(type, callback) { this.events[type] = callback; }
    removeEventListener(type, callback) { if (this.events[type] === callback) delete this.events[type]; }
    setAttribute(name, value) { this[name] = value; }
    getBoundingClientRect() { return { left: 0, top: 0, width: sandbox.innerWidth, height: sandbox.innerHeight }; }
    getContext(type) {
      const webgl = type.includes('webgl');
      if (webgl && (noGL || (webgl1 && type === 'webgl2'))) return null;
      if (this.contextType && this.contextType !== type) return null;
      this.contextType = type;
      if (webgl) { activeCanvas = this; graphics.contexts.push(type); }
      return webgl ? gl : context2D;
    }
    cloneNode() { const clone = new Element(this.id); clone.dataset = { ...this.dataset }; return clone; }
    replaceWith(other) { elements.set(this.id, other); }
    setPointerCapture() { throw new Error('Contact ended before capture'); }
    hasPointerCapture() { return false; }
  }
  const get = id => { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); };
  get('health').textContent = 'Runtime errors: 0';
  if (home) get('fluid').dataset.fluidHome = '';
  const document = {
    hidden: false,
    getElementById: id => home && id !== 'fluid' && !(loading && id === 'loadingScreen') ? null : get(id),
    createElement: () => new Element(''),
    addEventListener: (type, fn, options) => {
      docEvents[type] = fn;
      (docRegistrations[type] ||= []).push(options);
    },
    removeEventListener: (type, fn) => { if (docEvents[type] === fn) delete docEvents[type]; }
  };
  const sandbox = {
    window: {}, document, innerWidth: width ?? (touch ? 390 : 1280), innerHeight: height ?? 844, devicePixelRatio: 3,
    matchMedia: query => {
      if (!queries.has(query)) queries.set(query, {
        matches: query.includes('reduced-motion') ? reduced : touch,
        addEventListener(type, fn) { this[type] = fn; },
        removeEventListener(type, fn) { if (this[type] === fn) delete this[type]; }
      });
      return queries.get(query);
    },
    MutationObserver: class {
      constructor(fn) { loaderObserver = fn; }
      observe() {} disconnect() {}
    },
    addEventListener: (type, fn) => { winEvents[type] = fn; },
    removeEventListener: (type, fn) => { if (winEvents[type] === fn) delete winEvents[type]; },
    requestAnimationFrame: fn => { const id = nextId++; callbacks.set(id, fn); return id; },
    cancelAnimationFrame: id => callbacks.delete(id),
    console: { info() {}, warn: (...args) => errors.push(args), error: (...args) => errors.push(args) }
  };
  vm.createContext(sandbox);
  vm.runInContext(cpuSource, sandbox);
  const CPUFluid = sandbox.window.ZyberlaneCPUFluid;
  sandbox.window.ZyberlaneCPUFluid = class extends CPUFluid {
    constructor(...args) { super(...args); fluids.push(this); }
    splat(...args) { splats++; return super.splat(...args); }
  };
  vm.runInContext(appSource, sandbox);
  return {
    sandbox, get, callbacks, errors, document, docEvents, docRegistrations, winEvents, fluids, graphics,
    finishLoading() { loadingDone = true; loaderObserver(); },
    changeMotion(matches) {
      const query = queries.get('(prefers-reduced-motion: reduce)');
      query.matches = matches; query.change({ matches });
    },
    tick(count = 1) {
      for (let i = 0; i < count; i++) {
        now += 25; const jobs = [...callbacks.values()]; callbacks.clear();
        for (const job of jobs) job(now);
      }
    },
    click: id => get(id).events.click({}),
    pointer(type, data = {}) { get('fluid').events[type]({ pointerId: 1, pointerType: 'touch', clientX: 150, clientY: 250, timeStamp: now, ...data }); },
    get rendered() { return rendered; },
    get splats() { return splats; }
  };
}

const shaderPairs = [];
for (const options of [{}, { touch: true }, { webgl1: true }, { webgl1: true, linear: false }, { width: 300, height: 150 }]) {
  const test = harness({ home: true, gpu: true, ...options });
  assert.equal(test.get('fluid').dataset.renderer, options.webgl1 ? 'webgl-fluid' : 'webgl2-fluid');
  assert.equal(test.fluids.length, 0, 'capable contexts must run the GPU solver');
  assert.equal(test.graphics.contexts.length, 1);
  test.tick(400);
  assert.equal(test.graphics.splatDraws, 0, 'ten idle seconds must never execute the splat shader');
  assert.equal(test.callbacks.size, 1);
  assert.ok(test.graphics.physics.some(([name, value]) => name === 'curl' && value === 3));
  assert.ok(test.graphics.physics.some(([name, value]) => name === 'dissipation' && value === 3.5));
  assert.ok(test.graphics.sizes.every(([w, h]) => w <= 4096 && h <= 4096));
  if (options.touch) {
    const finger = { identifier: 3, clientX: 120, clientY: 200 };
    test.docEvents.touchstart({ isTrusted: true, changedTouches: [finger], timeStamp: 10010 });
    test.tick();
    assert.equal(test.graphics.splatDraws, 0, 'touchstart alone must not inject');
    test.docEvents.touchmove({ isTrusted: false, changedTouches: [{ ...finger, clientX: 150 }], timeStamp: 10020 });
    test.tick(); assert.equal(test.graphics.splatDraws, 0);
    test.docEvents.touchmove({ isTrusted: true, changedTouches: [{ ...finger, clientX: 160 }], timeStamp: 10030 });
    test.docEvents.touchend({ isTrusted: true, changedTouches: [finger], timeStamp: 10040 });
    assert.equal(test.docRegistrations.touchmove[0].passive, true);
  } else {
    const mouse = { pointerId: 2, pointerType: 'mouse', clientX: 200, clientY: 200, timeStamp: 10010 };
    test.docEvents.pointermove({ ...mouse, isTrusted: true, movementX: 0, movementY: 0 });
    test.docEvents.pointermove({ ...mouse, isTrusted: false, movementX: 20, movementY: 10 });
    test.tick(); assert.equal(test.graphics.splatDraws, 0);
    test.docEvents.pointermove({ ...mouse, isTrusted: true, movementX: 20, movementY: 10 });
  }
  test.tick();
  const emitted = test.graphics.splatDraws;
  assert.ok(emitted >= 2, 'movement must inject both velocity and dye');
  const red = test.graphics.colors.at(-1);
  assert.ok(Math.abs(red[1] / red[0] - 22 / 196) < 1e-6);
  assert.ok(Math.abs(red[2] / red[0] - 42 / 196) < 1e-6);
  test.tick(100); assert.equal(test.graphics.splatDraws, emitted);

  const allocated = Object.fromEntries(Object.entries(test.graphics.live).map(([kind, set]) => [kind, set.size]));
  assert.equal(allocated.Texture, 8); assert.equal(allocated.Framebuffer, 8);
  for (let i = 0; i < 12; i++) {
    test.sandbox.innerWidth = 390 + i * 50; test.sandbox.innerHeight = 844 - i * 15;
    test.winEvents.resize();
    for (const [kind, set] of Object.entries(test.graphics.live)) assert.equal(set.size, allocated[kind], `${kind} must not accumulate after resize`);
    assert.equal(test.callbacks.size, 1);
    assert.equal(test.graphics.splatDraws, emitted, 'resize must not emit');
  }
  assert.equal(test.docRegistrations.pointermove.length, 1);
  assert.equal(test.docRegistrations.touchmove.length, 1);
  test.winEvents.pagehide({ persisted: true }); assert.equal(test.callbacks.size, 0);
  test.winEvents.pageshow({ persisted: true }); test.winEvents.pageshow({ persisted: true }); assert.equal(test.callbacks.size, 1);
  for (const program of test.graphics.programs) shaderPairs.push({
    vertex: program.shaders.find(shader => shader.source.includes('attribute vec2')).source,
    fragment: program.shaders.find(shader => !shader.source.includes('attribute vec2')).source
  });
  test.winEvents.pagehide({ persisted: false });
  assert.equal(test.callbacks.size, 0);
  assert.equal(Object.keys(test.docEvents).length, 0);
  assert.equal(Object.keys(test.winEvents).length, 0);
  assert.equal(Object.keys(test.get('fluid').events).length, 0);
  for (const set of Object.values(test.graphics.live)) assert.equal(set.size, 0, 'teardown must release every GPU resource');
  assert.equal(test.errors.length, 0);
}
const interrupted = harness({ home: true, gpu: true });
const oldCanvas = interrupted.get('fluid');
oldCanvas.events.webglcontextlost({ preventDefault() {} });
assert.notEqual(interrupted.get('fluid'), oldCanvas);
assert.equal(interrupted.get('fluid').dataset.renderer, 'canvas2d-fluid');
assert.equal(Object.keys(oldCanvas.events).length, 0);
assert.equal(interrupted.docRegistrations.pointermove.length, 1);
assert.equal(interrupted.callbacks.size, 1);
for (const set of Object.values(interrupted.graphics.live)) assert.equal(set.size, 0);
interrupted.winEvents.pagehide({ persisted: false });
assert.equal(interrupted.callbacks.size, 0);
if (process.env.ZYBERLANE_SHADER_EXPORT) {
  fs.writeFileSync(process.env.ZYBERLANE_SHADER_EXPORT, JSON.stringify([...new Map(shaderPairs.map(pair => [pair.vertex + pair.fragment, pair])).values()]));
}
console.log('PASS: WebGL2/WebGL1 (linear/manual filtering), desktop/mobile/DPR3 and canvas-sized viewport; zero idle/touchstart/synthetic splats, trusted movement emits brand red; bounded allocations through 12 resizes; one loop/listener set; bfcache/context loss and full teardown');
if (process.argv.includes('--gpu-only')) process.exit(0);

for (const options of [{}, { noGL: true }, { shaderFailure: true }]) {
  const test = harness(options);
  assert.equal(test.get('fluid').dataset.renderer, 'canvas2d-fluid');
  assert.equal(test.get('fluid').dataset.state, 'running');
  assert.equal(test.get('fluid').contextType, '2d');
  assert.equal(test.get('pause').disabled, false);
  assert.equal(test.callbacks.size, 1);
  test.tick(4);
  assert.ok(test.rendered > 1);
  assert.equal(test.errors.length, 0);
}
console.log('PASS: missing float extension, missing WebGL2, and shader failure all recover to working 2D fluid; no fatal errors; controls remain enabled');

const mobile = harness({ touch: true, noGL: true });
assert.match(mobile.get('engine').textContent, /· low$/);
mobile.click('clear');
assert.equal(mobile.get('ambient').checked, false);
mobile.pointer('pointermove'); mobile.tick(33);
assert.match(mobile.get('input').textContent, /moves: 0/);
mobile.pointer('pointerdown');
mobile.tick(); mobile.pointer('pointermove', { clientX: 180 });
mobile.pointer('pointercancel');
mobile.pointer('pointermove', { clientX: 220 }); mobile.tick(33);
assert.match(mobile.get('input').textContent, /Input: touch · moves: 1/);
mobile.click('pause'); assert.equal(mobile.callbacks.size, 0);
const pausedFrames = mobile.rendered; mobile.tick(2); assert.equal(mobile.rendered, pausedFrames);
mobile.click('pause'); assert.equal(mobile.callbacks.size, 1);
mobile.document.hidden = true; mobile.docEvents.visibilitychange(); assert.equal(mobile.callbacks.size, 0);
mobile.document.hidden = false; mobile.docEvents.visibilitychange(); mobile.docEvents.visibilitychange();
assert.equal(mobile.callbacks.size, 1);
assert.equal(mobile.errors.length, 0);
console.log('PASS: replacement canvas accepts touch, guards ended capture, cancels contact, preserves pause/resume, clear, visibility and one RAF loop');

const reduced = harness({ reduced: true, noGL: true });
assert.equal(reduced.get('fluid').dataset.state, 'paused'); assert.equal(reduced.callbacks.size, 0);
reduced.click('burst'); assert.equal(reduced.callbacks.size, 1);
console.log('PASS: CPU fallback respects reduced motion and explicit play');

const sample = harness({ noGL: true, reduced: true });
const Fluid = sample.sandbox.window.ZyberlaneCPUFluid;
const fluid = new Fluid(sample.get('fluid').cloneNode(false));
fluid.resize(96, 96, 16);
fluid.splat(0.5, 0.5, 85, 30, 1, 0.0015);
const originalDye = Array.from(fluid.dye);
for (let i = 0; i < 120; i++) fluid.step(1 / 60);
for (const field of ['u', 'v', 'dye', 'pressure']) assert.ok(fluid[field].every(Number.isFinite), `${field} must remain finite`);
assert.ok(fluid.dye.some(value => value > 0.005));
assert.ok(fluid.dye.some((value, i) => Math.abs(value - originalDye[i]) > 0.01));
fluid.render();
assert.ok(fluid.image.data.some((value, i) => i % 4 === 0 && value > 10));
assert.ok(fluid.image.data.every((value, i) => i % 4 !== 3 || value === 255));
fluid.clear(); assert.ok(fluid.dye.every(value => value === 0));
console.log('PASS: real fluid fields evolve, remain finite for 120 steps, render non-black red pixels, and clear to zero');

const home = harness({ home: true, noGL: true, touch: true });
assert.equal(home.get('fluid').dataset.renderer, 'canvas2d-fluid');
assert.equal(home.get('fluid').dataset.fluidHome, '');
assert.equal(home.docRegistrations.pointermove.length, 1); // fallback must not bind document twice
assert.equal(home.docRegistrations.touchmove.length, 1);
assert.equal(home.docRegistrations.touchmove[0].passive, true);
assert.equal(home.docRegistrations.pointerdown[0].passive, true);
const contact = { identifier: 7, clientX: 120, clientY: 300 };
const noPreventDefault = () => { throw new Error('Homepage must not block native interactions'); };
home.docEvents.touchstart({ isTrusted: true, changedTouches: [contact], timeStamp: 10, preventDefault: noPreventDefault });
home.docEvents.pointermove({ pointerType: 'touch', clientX: 150, clientY: 320 });
home.docEvents.touchmove({ isTrusted: true, changedTouches: [{ ...contact, clientX: 150 }], timeStamp: 20, preventDefault: noPreventDefault });
home.docEvents.touchcancel({ isTrusted: true, changedTouches: [contact], timeStamp: 30, preventDefault: noPreventDefault });
home.docEvents.touchmove({ isTrusted: true, changedTouches: [{ ...contact, clientX: 170 }], timeStamp: 40, preventDefault: noPreventDefault });
home.tick(33);
assert.equal(home.get('fluid').dataset.fluidMoves, '1');
assert.equal(home.get('fluid').dataset.fluidInput, 'touch');
home.docEvents.pointermove({ isTrusted: true, pointerType: 'mouse', pointerId: 2, clientX: 200, clientY: 200, timeStamp: 900, movementX: 20, movementY: 10 });
home.tick(33);
assert.equal(home.get('fluid').dataset.fluidMoves, '2');
assert.equal(home.get('fluid').dataset.fluidInput, 'mouse');
assert.equal(home.errors.length, 0);
console.log('PASS: homepage initializes without lab controls; document handlers bind once after fallback; passive mobile scroll input avoids duplicates and honors cancellation; desktop hover responds');

for (const touch of [false, true]) {
  const idle = harness({ home: true, noGL: true, touch });
  assert.equal(idle.splats, 0, 'initial allocation must not inject dye or velocity');
  idle.tick(400); // Ten simulated seconds with the actual solver/render loop running.
  assert.equal(idle.splats, 0, 'idle frames must not emit');
  assert.ok(idle.rendered >= 400, 'the render loop must continue before interaction');
  for (const field of ['u', 'v', 'dye']) assert.ok(idle.fluids[0][field].every(value => value === 0));
  assert.ok(idle.fluids[0].image.data.every((value, i) => i % 4 === 3 || value === 0));

  const mouse = { pointerType: 'mouse', pointerId: 3, button: 0, clientX: 100, clientY: 180, timeStamp: 10010, movementX: 10, movementY: 5 };
  const finger = { changedTouches: [contact], timeStamp: 10010, preventDefault: noPreventDefault };
  idle.docEvents.pointerdown({ ...mouse, isTrusted: false });
  idle.docEvents.pointermove({ ...mouse, isTrusted: false });
  idle.docEvents.touchstart({ ...finger, isTrusted: false });
  idle.docEvents.touchmove({ ...finger, isTrusted: false });
  idle.docEvents.pointermove({ ...mouse, isTrusted: true, movementX: 0, movementY: 0 });
  idle.docEvents.touchmove({ ...finger, isTrusted: true }); // no matching touchstart
  idle.tick();
  assert.equal(idle.splats, 0, 'synthetic input, stationary mouse events and orphan touchmove must not emit');

  idle.sandbox.innerHeight -= 80;
  idle.winEvents.resize(); idle.tick();
  assert.equal(idle.splats, 0, 'viewport/orientation setup must stay empty');
  if (touch) {
    idle.docEvents.touchstart({ ...finger, isTrusted: true });
    idle.docEvents.touchmove({ ...finger, isTrusted: true, changedTouches: [{ ...contact, clientX: 170 }], timeStamp: 10030 });
    idle.docEvents.touchend({ ...finger, isTrusted: true, timeStamp: 10040 });
  } else {
    idle.docEvents.pointermove({ ...mouse, isTrusted: true });
    idle.docEvents.pointerdown({ ...mouse, isTrusted: true });
    idle.docEvents.pointermove({ ...mouse, isTrusted: true, clientX: 145, timeStamp: 10030 });
    idle.docEvents.pointerup({ ...mouse, isTrusted: true });
  }
  idle.tick();
  assert.ok(idle.splats > 0, 'trusted touch and desktop hover/drag must still emit');
  const count = idle.splats;
  const dye = idle.fluids[0].dye.reduce((sum, value) => sum + value, 0);
  assert.ok(dye > 0);
  idle.docEvents.pointermove({ ...mouse, isTrusted: false });
  idle.docEvents.touchstart({ ...finger, isTrusted: false });
  idle.tick(200);
  assert.equal(idle.splats, count, 'no automatic or synthetic injection after real input either');
  assert.ok(idle.fluids[0].dye.reduce((sum, value) => sum + value, 0) < dye, 'existing dye must naturally dissipate');
  const refreshed = harness({ home: true, noGL: true, touch });
  assert.equal(refreshed.splats, 0, 'fresh initialization must be empty again');
  assert.equal(idle.errors.length, 0);
}
console.log('PASS: desktop/mobile home stays empty for ten simulated seconds and resize; trusted input emits, synthetic/stationary input does not; dye dissipates and fresh initialization is empty');

const calmHome = harness({ home: true, noGL: true, reduced: true });
assert.equal(calmHome.callbacks.size, 0);
assert.equal(calmHome.get('fluid').contextType, null);
assert.equal(calmHome.get('fluid').hidden, true);
calmHome.changeMotion(false);
assert.equal(calmHome.get('fluid').dataset.renderer, 'canvas2d-fluid');
assert.equal(calmHome.callbacks.size, 1);
calmHome.changeMotion(true);
assert.equal(calmHome.callbacks.size, 0);
assert.equal(calmHome.get('fluid').hidden, true);
console.log('PASS: reduced-motion homepage allocates no graphics until enabled and stops/hides when preference changes');

const loadingHome = harness({ home: true, noGL: true, loading: true });
assert.equal(loadingHome.get('fluid').dataset.state, 'waiting-for-page');
assert.equal(loadingHome.callbacks.size, 0);
loadingHome.finishLoading();
assert.equal(loadingHome.get('fluid').dataset.state, 'running');
assert.equal(loadingHome.callbacks.size, 1);
console.log('PASS: homepage waits for the existing loading screen before starting its atmosphere');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /<canvas id="fluid" data-fluid-home aria-hidden="true"><\/canvas>/);
assert.match(html, /<script src="\/assets\/fluid-cpu\.js" defer><\/script>\s*<script src="\/assets\/fluid\.js" defer><\/script>/);
const css = fs.readFileSync(path.join(root, 'assets/home-fluid.css'), 'utf8');
assert.match(css, /pointer-events:\s*none/);
assert.ok(!/touch-action:\s*none|overflow:\s*hidden/.test(css));
console.log('PASS: root homepage loads both fluid engines in order, canvas is decorative and cannot intercept controls or disable page scrolling');
console.log('Browser/device testing still required; these are CPU numerical and synthetic input regressions.');
