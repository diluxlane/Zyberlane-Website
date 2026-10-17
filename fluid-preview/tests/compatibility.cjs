// Exercises the actual CPU solver and app fallback/lifecycle with Canvas stubs.
// This is regression coverage, not a substitute for real browser/device testing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const cpuSource = fs.readFileSync(path.join(root, 'cpu-fluid.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'fluid.js'), 'utf8');

function harness({ noGL = false, shaderFailure = false, reduced = false, touch = false } = {}) {
  let now = 0, nextId = 1, rendered = 0;
  const callbacks = new Map(), elements = new Map(), winEvents = {}, docEvents = {}, errors = [];
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
    cloneNode() { return new Element(this.id); }
    replaceWith(other) { elements.set(this.id, other); }
    setPointerCapture() { throw new Error('Contact ended before capture'); }
    hasPointerCapture() { return false; }
  }
  const get = id => { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); };
  get('health').textContent = 'Runtime errors: 0';
  const document = {
    hidden: false, getElementById: get, createElement: () => new Element(''),
    addEventListener: (type, fn) => { docEvents[type] = fn; }
  };
  const sandbox = {
    window: {}, document, innerWidth: touch ? 390 : 1280, innerHeight: 844, devicePixelRatio: 3,
    matchMedia: query => ({ matches: query.includes('reduced-motion') ? reduced : touch, addEventListener() {} }),
    addEventListener: (type, fn) => { winEvents[type] = fn; },
    requestAnimationFrame: fn => { const id = nextId++; callbacks.set(id, fn); return id; },
    cancelAnimationFrame: id => callbacks.delete(id),
    console: { info() {}, error: (...args) => errors.push(args) }
  };
  vm.createContext(sandbox);
  vm.runInContext(cpuSource, sandbox); vm.runInContext(appSource, sandbox);
  return {
    sandbox, get, callbacks, errors, document, docEvents,
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
console.log('Browser/device testing still required; these are CPU numerical and synthetic input regressions.');
