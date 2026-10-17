// Exercises the actual CPU solver and app fallback/lifecycle with Canvas stubs.
// This is regression coverage, not a substitute for real browser/device testing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const cpuSource = fs.readFileSync(path.join(root, 'assets/fluid-cpu.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'assets/fluid.js'), 'utf8');

function harness({ noGL = false, shaderFailure = false, reduced = false, touch = false, home = false, loading = false } = {}) {
  let now = 0, nextId = 1, rendered = 0;
  const callbacks = new Map(), elements = new Map(), winEvents = {}, docEvents = {}, errors = [];
  const docRegistrations = {}, queries = new Map();
  let loadingDone = false, loaderObserver;
  const context2D = {
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {}, drawImage() { rendered++; }
  };
  const gl = {
    getExtension: () => shaderFailure ? {} : null,
    clearColor() {}, disable() {}, createShader: () => ({}), shaderSource() {}, compileShader() {},
    getShaderParameter: () => false, getShaderInfoLog: () => 'Test compiler failure', deleteShader() {}
  };
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
    setAttribute(name, value) { this[name] = value; }
    getBoundingClientRect() { return { left: 0, top: 0, width: touch ? 390 : 1280, height: 844 }; }
    getContext(type) {
      if (type === 'webgl2' && noGL) return null;
      if (this.contextType && this.contextType !== type) return null;
      this.contextType = type;
      return type === 'webgl2' ? gl : context2D;
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
    }
  };
  const sandbox = {
    window: {}, document, innerWidth: touch ? 390 : 1280, innerHeight: 844, devicePixelRatio: 3,
    matchMedia: query => {
      if (!queries.has(query)) queries.set(query, {
        matches: query.includes('reduced-motion') ? reduced : touch,
        addEventListener(type, fn) { this[type] = fn; }
      });
      return queries.get(query);
    },
    MutationObserver: class {
      constructor(fn) { loaderObserver = fn; }
      observe() {} disconnect() {}
    },
    addEventListener: (type, fn) => { winEvents[type] = fn; },
    requestAnimationFrame: fn => { const id = nextId++; callbacks.set(id, fn); return id; },
    cancelAnimationFrame: id => callbacks.delete(id),
    console: { info() {}, warn: (...args) => errors.push(args), error: (...args) => errors.push(args) }
  };
  vm.createContext(sandbox);
  vm.runInContext(cpuSource, sandbox); vm.runInContext(appSource, sandbox);
  return {
    sandbox, get, callbacks, errors, document, docEvents, docRegistrations,
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
    get rendered() { return rendered; }
  };
}

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
home.docEvents.touchstart({ changedTouches: [contact], timeStamp: 10, preventDefault: noPreventDefault });
home.docEvents.pointermove({ pointerType: 'touch', clientX: 150, clientY: 320 });
home.docEvents.touchmove({ changedTouches: [{ ...contact, clientX: 150 }], timeStamp: 20, preventDefault: noPreventDefault });
home.docEvents.touchcancel({ changedTouches: [contact], timeStamp: 30, preventDefault: noPreventDefault });
home.docEvents.touchmove({ changedTouches: [{ ...contact, clientX: 170 }], timeStamp: 40, preventDefault: noPreventDefault });
home.tick(33);
assert.equal(home.get('fluid').dataset.fluidMoves, '1');
assert.equal(home.get('fluid').dataset.fluidInput, 'touch');
home.docEvents.pointermove({ pointerType: 'mouse', pointerId: 2, clientX: 200, clientY: 200, timeStamp: 900 });
home.tick(33);
assert.equal(home.get('fluid').dataset.fluidMoves, '2');
assert.equal(home.get('fluid').dataset.fluidInput, 'mouse');
assert.equal(home.errors.length, 0);
console.log('PASS: homepage initializes without lab controls; document handlers bind once after fallback; passive mobile scroll input avoids duplicates and honors cancellation; desktop hover responds');

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
