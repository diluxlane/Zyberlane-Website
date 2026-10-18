// Run: node tests/reviews-faq.cjs. State/geometry harness; not a browser layout test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/reviews-faq.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

class Element {
  constructor() {
    this.attrs = {}; this.events = {}; this.classes = new Set(); this.disabled = false;
    this.classList = {
      add: c => this.classes.add(c), remove: c => this.classes.delete(c),
      toggle: (c, on) => on ? this.classes.add(c) : this.classes.delete(c)
    };
    this.style = { setProperty: (k, v) => this.style[k] = v, removeProperty: k => delete this.style[k] };
  }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(k, fn, options) { (this.events[k] ||= []).push({ fn, options }); }
  emit(k, event = {}) { for (const { fn } of this.events[k] || []) fn({ target: this, ...event }); }
  contains(el) { return el === this; }
  focus() { this.focused = true; }
}
function setup({ desktop = true, reduced = false, height = 900, observer = true, distance = 300 } = {}) {
  const window = new Element();
  const document = { activeElement: null };
  const section = new Element(), sticky = new Element(), viewport = new Element(), track = new Element();
  const previous = new Element(), next = new Element(), disclosure = new Element(), faq = new Element();
  const items = Array.from({ length: 10 }, () => {
    const button = new Element(), answer = new Element();
    const item = { button, answer, querySelector: s => s === '.faq-trigger' ? button : answer };
    return item;
  });
  faq.querySelectorAll = () => items;
  section.querySelector = s => ({ '.stories-sticky': sticky, '.stories-viewport': viewport, '.stories-track': track, '.review-more': disclosure })[s];
  document.getElementById = id => ({ faq, testimonials: section, storiesPrevious: previous, storiesNext: next })[id];
  const first = new Element(), last = new Element();
  track.firstElementChild = first;
  track.scrollWidth = 1000 + distance; viewport.clientWidth = 1000; sticky.offsetHeight = 500;
  section.top = 200; section.getBoundingClientRect = () => ({ top: section.top });
  disclosure.open = false;
  window.innerHeight = height; window.scrollY = 1000;
  const desktopMedia = new Element(), reducedMedia = new Element();
  desktopMedia.matches = desktop; reducedMedia.matches = reduced;
  window.matchMedia = q => q.includes('reduced-motion') ? reducedMedia : desktopMedia;
  const scrolls = []; window.scrollTo = options => scrolls.push(options);
  const frames = new Map(); let nextFrame = 0, resize;
  const context = {
    window, document,
    requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; },
    ResizeObserver: class { constructor(fn) { resize = fn; } observe(el) { assert.equal(el, sticky); } }
  };
  if (observer) window.ResizeObserver = context.ResizeObserver;
  vm.runInNewContext(source, context);
  function flush() {
    let iterations = 0;
    while (frames.size) {
      assert.ok(++iterations < 10, 'no self-sustaining animation loop');
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn());
    }
  }
  return { window, document, section, sticky, viewport, track, previous, next, disclosure, faq, items, first, last, desktopMedia, reducedMedia, scrolls, frames, flush, resize };
}

const faq = setup();
assert.ok(faq.faq.classes.has('faq-ready'));
for (const item of faq.items) {
  assert.equal(item.button.disabled, false);
  assert.equal(item.button.getAttribute('aria-expanded'), 'false');
  assert.equal(item.answer.getAttribute('aria-hidden'), 'true');
  assert.equal(item.answer.inert, true);
}
faq.items[0].button.emit('click');
assert.equal(faq.items[0].button.getAttribute('aria-expanded'), 'true');
assert.equal(faq.items[0].answer.inert, false);
faq.items[1].button.emit('click');
assert.equal(faq.items[0].button.getAttribute('aria-expanded'), 'false');
assert.equal(faq.items[1].answer.classes.has('is-open'), true);
faq.items[1].button.emit('click');
assert.equal(faq.items.filter(i => i.answer.classes.has('is-open')).length, 0);
faq.items[0].button.emit('click');
faq.document.activeElement = faq.items[0].answer;
faq.items[2].button.emit('click');
assert.equal(faq.items[0].button.focused, true, 'closing content does not strand focus');

const rail = setup();
assert.ok(rail.section.classes.has('scroll-stories'));
assert.equal(rail.section.style['--stories-height'], '800px');
assert.equal(rail.viewport.getAttribute('tabindex'), '0');
assert.equal(rail.previous.disabled, true);
rail.section.top = -60;
for (let i = 0; i < 20; i++) rail.window.emit('scroll');
assert.equal(rail.frames.size, 1, 'scroll updates coalesce into one animation frame');
rail.flush();
assert.equal(rail.track.style.transform, 'translate3d(-150px,0,0)');
rail.section.top = -1000; rail.window.emit('scroll'); rail.flush();
assert.equal(rail.track.style.transform, 'translate3d(-300px,0,0)');
assert.equal(rail.next.disabled, true);
rail.section.top = 200; rail.window.emit('scroll'); rail.flush();
assert.equal(rail.track.style.transform, 'translate3d(0px,0,0)');
assert.equal(rail.previous.disabled, true);
assert.equal(rail.window.events.scroll[0].options.passive, true);
assert.equal(rail.window.events.wheel, undefined);
assert.equal(rail.viewport.events.touchmove, undefined);
rail.next.emit('click'); assert.equal(rail.scrolls.at(-1).top, 1410);
let prevented = false;
rail.viewport.emit('keydown', { key: 'ArrowLeft', preventDefault: () => { prevented = true; } });
assert.equal(prevented, true); assert.equal(rail.scrolls.at(-1).top, 1110);
rail.viewport.emit('keydown', { target: { closest: () => rail.last }, key: 'ArrowRight', preventDefault: () => assert.fail('nested controls keep their keys') });
rail.viewport.emit('focusin', { target: { closest: () => rail.last } });
assert.equal(rail.scrolls.at(-1).top, 1410, 'keyboard focus reveals the Google panel');
rail.track.scrollWidth = 1400; rail.sticky.offsetHeight = 510;
rail.resize(); rail.flush(); assert.equal(rail.section.style['--stories-height'], '910px');

rail.section.top = -110; rail.disclosure.open = true; rail.disclosure.emit('toggle'); rail.flush();
assert.equal(rail.section.classes.has('scroll-stories'), false);
assert.equal(rail.track.style.transform, '');
assert.equal(rail.section.style['--stories-height'], undefined);
assert.equal(rail.scrolls.at(-1).top, 800, 'expanding a pinned review returns it to readable page flow');
rail.disclosure.open = false; rail.disclosure.emit('toggle'); rail.flush();
assert.equal(rail.section.classes.has('scroll-stories'), true);
rail.reducedMedia.matches = true; rail.reducedMedia.emit('change');
assert.equal(rail.section.classes.has('scroll-stories'), false);
assert.equal(rail.track.style.transform, '');
assert.equal(rail.viewport.getAttribute('tabindex'), undefined);

for (const options of [{ desktop: false }, { reduced: true }, { height: 500 }, { distance: 0 }]) {
  const state = setup(options);
  assert.equal(state.section.classes.has('scroll-stories'), false);
  state.window.emit('scroll'); assert.equal(state.frames.size, 0);
  state.items[4].button.emit('click'); assert.equal(state.items[4].answer.inert, false);
}
assert.ok(setup({ observer: false }).section.classes.has('scroll-stories'));

const stories = html.slice(html.indexOf('<section id="testimonials"'), html.indexOf('<!-- ================= SKILLS'));
const review = stories.match(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/)[1];
const paragraphs = [...review.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1]);
assert.deepEqual(paragraphs, [
  'I had a great experience working with Zyberlane. He created an absolutely amazing website for my business, and I’m genuinely impressed with the final result. The design is modern, professional, clean, and perfectly matches my brand.',
  'What I really appreciated was his excellent communication, patience, attention to detail, and willingness to understand exactly what I needed. He didn’t just make a website — he turned my idea into something much better than I expected.',
  'If you’re looking for someone who is talented, reliable, creative, and takes their work seriously, I highly recommend Zyberlane. Excellent work and excellent service! 🔥❤️',
  'Definitely 5 Stars! ⭐⭐⭐⭐⭐'
], 'all four review paragraphs retain the supplied wording');
assert.ok(html.indexOf('<section id="work"') < html.indexOf('<section id="testimonials"'));
assert.ok(html.indexOf('<section id="testimonials"') < html.indexOf('<section id="skills"'));
assert.ok(html.indexOf('<section class="quote-section"') < html.indexOf('<section id="faq"'));
assert.ok(html.indexOf('<section id="faq"') < html.indexOf('<section id="contact"'));
assert.equal((stories.match(/<article /g) || []).length, 1, 'only one genuine testimonial');
assert.equal((stories.match(/<aside /g) || []).length, 1, 'Google CTA is not a second testimonial');
assert.ok(!stories.includes('libfile_') && !stories.includes('openinapp'));
assert.equal((stories.match(/href="https:\/\/maps.app.goo.gl\/43SbLYGa6dmvyjkN6" target="_blank" rel="noopener noreferrer"/g) || []).length, 2);
assert.ok(!html.includes("sb.from('testimonials')"), 'CMS cannot replace or hide the supplied review');
assert.ok(!html.includes('"@type": "FAQPage"'));
assert.equal((html.match(/class="faq-trigger"/g) || []).length, 10);
assert.equal((html.match(/class="faq-answer"/g) || []).length, 10);
console.log('PASS: FAQ state/ARIA/focus; scroll progress/clamping/coalescing; controls/focus reveal; resize; disclosure; mobile/short-window/reduced-motion/static fallbacks; one testimonial and first-party links.');
console.log('Synthetic DOM/geometry only. Browser layout, native input, visual smoothness and device performance need browser QA.');
