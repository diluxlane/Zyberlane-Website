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
    this.scrollLeft = 0; this.scrolls = [];
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
  scrollTo(options) { this.scrolls.push(options); this.scrollLeft = options.left; this.emit('scroll'); }
}
function setup({ desktop = true, reduced = false, height = 900, observer = true, distance = 300, count = 2, customReview = false } = {}) {
  const window = new Element();
  const document = { activeElement: null };
  const section = new Element(), sticky = new Element(), viewport = new Element(), track = new Element();
  const previous = new Element(), next = new Element(), disclosure = new Element(), faq = new Element();
  const review = new Element(), remainder = new Element();
  review.getBoundingClientRect = () => ({ height: remainder.hidden ? 100 : 300 });
  if (customReview) {
    disclosure.setAttribute('aria-expanded', 'false');
    disclosure.textContent = 'Read more';
    disclosure.hidden = true;
  }
  const items = Array.from({ length: 10 }, () => {
    const button = new Element(), answer = new Element();
    const item = { button, answer, querySelector: s => s === '.faq-trigger' ? button : answer };
    return item;
  });
  faq.querySelectorAll = () => items;
  section.querySelector = s => ({ '.stories-sticky': sticky, '.stories-viewport': viewport, '.stories-track': track, '.review-more': disclosure })[s];
  section.querySelectorAll = () => [disclosure];
  document.getElementById = id => ({
    faq, testimonials: section, storiesPrevious: previous, storiesNext: next,
    divineReviewToggle: customReview ? disclosure : undefined,
    divineReview: review, divineReviewRemainder: remainder
  })[id];
  const first = new Element(), last = new Element();
  const panels = [first, ...Array.from({ length: count - 2 }, () => new Element()), last];
  panels.forEach((panel, i) => Object.defineProperty(panel, 'offsetLeft', { get: () =>
    (track.scrollWidth - viewport.clientWidth) * i / (count - 1)
  }));
  track.querySelectorAll = () => panels;
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
  return { window, document, section, sticky, viewport, track, previous, next, disclosure, review, remainder, faq, items, first, last, panels, desktopMedia, reducedMedia, scrolls, frames, flush, resize };
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
assert.equal(rail.section.style['--stories-height'], '856px');
assert.equal(rail.track.style.transform, 'translate3d(0px,0,0)');
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
rail.viewport.emit('keydown', { key: 'ArrowRight', preventDefault: () => { prevented = true; } });
assert.equal(prevented, true); assert.equal(rail.scrolls.at(-1).top, 1410);
rail.viewport.emit('keydown', { key: 'ArrowLeft', preventDefault() {} });
assert.equal(rail.scrolls.at(-1).top, 1110);
rail.viewport.emit('keydown', { target: { closest: () => rail.last }, key: 'ArrowRight', preventDefault: () => assert.fail('nested controls keep their keys') });
rail.viewport.emit('focusin', { target: { closest: () => rail.last } });
assert.equal(rail.scrolls.at(-1).top, 1410, 'keyboard focus reveals the Google panel');
rail.track.scrollWidth = 1400; rail.sticky.offsetHeight = 510;
rail.resize(); rail.flush(); assert.equal(rail.section.style['--stories-height'], '966px');

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
assert.equal(rail.viewport.getAttribute('tabindex'), '0');
rail.next.emit('click'); rail.flush();
assert.equal(rail.viewport.scrolls.at(-1).left, 400, 'reduced motion can reach the next horizontal panel');
rail.previous.emit('click'); rail.flush();
assert.equal(rail.viewport.scrollLeft, 0);

assert.ok(setup({ desktop: false }).section.classes.has('scroll-stories'), 'touch uses vertical-driven motion when panels fit');
const future = setup({ count: 3, distance: 600 });
future.section.top = -210; future.window.emit('scroll'); future.flush();
assert.equal(future.track.style.transform, 'translate3d(-300px,0,0)');
future.next.emit('click'); assert.equal(future.scrolls.at(-1).top, 1300, 'next reaches the Google panel after future reviews');
future.viewport.emit('focusin', { target: { closest: () => future.panels[1] } });
assert.equal(future.scrolls.at(-1).top, 1000, 'focus can reveal an intermediate future review');

const short = setup({ height: 500 });
assert.ok(short.section.classes.has('scroll-stories'));
assert.equal(short.section.style['--stories-top'], '-24px', 'short screens read the card before pinning');
for (const options of [{ reduced: true }, { distance: 0 }]) {
  const state = setup(options);
  assert.equal(state.section.classes.has('scroll-stories'), false);
  state.window.emit('scroll'); assert.equal(state.frames.size, 1); state.flush();
  state.items[4].button.emit('click'); assert.equal(state.items[4].answer.inert, false);
}
assert.ok(setup({ observer: false }).section.classes.has('scroll-stories'));

for (const reduced of [false, true]) {
  const inline = setup({ customReview: true, reduced });
  assert.equal(inline.disclosure.hidden, false, 'JavaScript enables the inline review control');
  assert.equal(inline.remainder.hidden, true);
  inline.disclosure.emit('click'); inline.flush();
  assert.equal(inline.disclosure.getAttribute('aria-expanded'), 'true');
  assert.equal(inline.disclosure.textContent, 'Read less');
  assert.equal(inline.remainder.hidden, false);
  assert.equal(inline.section.classes.has('scroll-stories'), false, 'expanded review stays in readable page flow');
  inline.disclosure.emit('click'); inline.flush();
  assert.equal(inline.disclosure.getAttribute('aria-expanded'), 'false');
  assert.equal(inline.disclosure.textContent, 'Read more');
  assert.equal(inline.remainder.hidden, true);
  assert.equal(inline.section.classes.has('scroll-stories'), !reduced);
}

const stories = html.slice(html.indexOf('<section id="testimonials"'), html.indexOf('<!-- ================= SKILLS'));
const review = stories.match(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/)[1];
const paragraphs = [...review.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1].replace(/<[^>]*>/g, ''));
assert.deepEqual(paragraphs, [
  'I had a great experience working with Zyberlane. He created an absolutely amazing website for my business, and I’m genuinely impressed with the final result. The design is modern, professional, clean, and perfectly matches my brand.',
  'What I really appreciated was his excellent communication, patience, attention to detail, and willingness to understand exactly what I needed. He didn’t just make a website — he turned my idea into something much better than I expected.',
  'If you’re looking for someone who is talented, reliable, creative, and takes their work seriously, I highly recommend Zyberlane. Excellent work and excellent service! 🔥❤️'
], 'the three retained review paragraphs preserve the supplied wording exactly');
assert.ok(!stories.includes('Definitely 5 Stars!'));
assert.match(review, /perfectly matches my brand\.<\/p>\s*<div class="review-remainder"/, 'preview includes the complete original opening paragraph');
assert.ok(!review.includes('divineReviewContinuation'), 'the final preview sentence is no longer collapsed');
assert.match(review, /aria-controls="divineReviewRemainder" hidden>Read more<\/button>/, 'inline control progressively enhances the remaining review');
const companyRating = stories.match(/<a class="google-rating-link company-google-rating"[^>]*>([\s\S]*?)<\/a>/)[1];
const cardRating = stories.match(/<a class="google-rating-link story-google-rating"[^>]*>([\s\S]*?)<\/a>/)[1];
assert.match(companyRating, /google-g\.png[\s\S]*?5\.0[\s\S]*?★★★★★[\s\S]*?on Google[\s\S]*?↗/, 'header company rating is one complete Google link');
assert.match(cardRating, /google-g\.png/, 'individual Google review keeps its source logo');
assert.ok(!/5\.0|on Google|↗/.test(cardRating), 'individual Google review omits the company score and external arrow');
assert.match(stories, /class="story-stars" role="img" aria-label="Google review: 5 stars">★★★★★<\/span>/, 'individual review stars remain separately labeled');
assert.ok(!stories.includes('class="story-source"'), 'duplicate bottom Google Review link is removed');
assert.ok(html.indexOf('<section id="work"') < html.indexOf('<section id="testimonials"'));
assert.ok(html.indexOf('<section id="testimonials"') < html.indexOf('<section id="skills"'));
assert.ok(html.indexOf('<section class="quote-section"') < html.indexOf('<section id="faq"'));
assert.ok(html.indexOf('<section id="contact"') < html.indexOf('<section id="booking"'));
assert.ok(html.indexOf('<section id="booking"') < html.indexOf('<section id="faq"'));
assert.match(html, /<section id="faq"[\s\S]*?<\/section>\s*<\/main>\s*<footer>/, 'FAQ is the final homepage section before the footer');
assert.equal((stories.match(/<article /g) || []).length, 1, 'only one genuine testimonial');
assert.equal((stories.match(/class="story-panel google-review-panel"/g) || []).length, 1, 'one Google CTA, separate from the genuine testimonial');
assert.match(stories, /<a class="story-panel google-review-panel"[^>]+>[\s\S]*?<\/a>\s*<\/div>\s*<\/div>\s*<div class="stories-controls">/, 'Google CTA is a complete link and always the final panel');
assert.ok(!stories.includes('libfile_') && !stories.includes('openinapp'));
assert.equal((stories.match(/href="https:\/\/maps.app.goo.gl\/43SbLYGa6dmvyjkN6" target="_blank" rel="noopener noreferrer"/g) || []).length, 3);
assert.equal((stories.match(/href="#work"/g) || []).length, 3, 'logo, reviewer and business name navigate to Selected Work');
assert.match(stories, /<img src="\/assets\/divine-tattoo-logo\.jpg" width="52" height="52" alt="Divine Tattoo"/);
assert.ok(!html.includes("sb.from('testimonials')"), 'CMS cannot replace or hide the supplied review');
assert.ok(!html.includes('"@type": "FAQPage"'));
assert.equal((html.match(/class="faq-trigger"/g) || []).length, 10);
assert.equal((html.match(/class="faq-answer"/g) || []).length, 10);
console.log('PASS: FAQ state/ARIA/focus; scroll progress/clamping/coalescing; controls/focus reveal; resize; disclosure; mobile/short-window/reduced-motion/static fallbacks; one testimonial and first-party links.');
console.log('Synthetic DOM/geometry only. Browser layout, native input, visual smoothness and device performance need browser QA.');
