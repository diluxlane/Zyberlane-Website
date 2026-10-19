(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Answers stay readable without JavaScript; enhancement collapses them together.
  var faq = document.getElementById('faq');
  if (faq) {
    var items = Array.from(faq.querySelectorAll('.faq-item')).map(function (item) {
      return { button: item.querySelector('.faq-trigger'), answer: item.querySelector('.faq-answer') };
    });
    function setOpen(item, open) {
      if (!open && item.answer.contains(document.activeElement)) item.button.focus();
      item.button.setAttribute('aria-expanded', String(open));
      item.answer.setAttribute('aria-hidden', String(!open));
      item.answer.inert = !open;
      item.answer.classList.toggle('is-open', open);
    }
    items.forEach(function (item) {
      item.button.disabled = false;
      setOpen(item, false);
      item.button.addEventListener('click', function () {
        var open = item.button.getAttribute('aria-expanded') !== 'true';
        items.forEach(function (other) { setOpen(other, other === item && open); });
      });
    });
    faq.classList.add('faq-ready');
  }

  var section = document.getElementById('testimonials');
  if (!section) return;
  var sticky = section.querySelector('.stories-sticky');
  var viewport = section.querySelector('.stories-viewport');
  var track = section.querySelector('.stories-track');
  var previous = document.getElementById('storiesPrevious');
  var next = document.getElementById('storiesNext');
  var disclosures = Array.from(section.querySelectorAll('.review-more'));
  var active = false, distance = 0, index = 0, frame = 0, measureFrame = 0, stickyTop = 90;
  function panels() { return Array.from(track.querySelectorAll('.story-panel')); }

  function update() {
    frame = 0;
    if (!active) return;
    var progress = Math.max(0, Math.min(1, (stickyTop - section.getBoundingClientRect().top) / distance));
    // Portfolio moves left as progress increases. A reversed flex track keeps
    // the real review first while these panels move right toward the Google CTA.
    track.style.transform = 'translate3d(' + (-(1 - progress) * distance) + 'px,0,0)';
    index = Math.round(progress * (panels().length - 1));
    previous.disabled = index === 0;
    next.disabled = index === panels().length - 1;
  }
  function schedule() {
    if (active && !frame) frame = requestAnimationFrame(update);
  }
  function measure() {
    measureFrame = 0;
    var wasActive = active;
    var oldTop = section.getBoundingClientRect().top;
    var wasPinned = wasActive && oldTop <= stickyTop && oldTop > stickyTop - distance;
    active = false;
    section.classList.remove('scroll-stories');
    section.style.removeProperty('--stories-height');
    track.style.removeProperty('--stories-panel-width');
    track.style.transform = '';
    viewport.scrollLeft = 0;
    viewport.removeAttribute('tabindex');
    // Reading the complete review uses normal page flow, including short windows.
    if (!reduced.matches && !disclosures.some(function (disclosure) { return disclosure.open; })) {
      track.style.setProperty('--stories-panel-width', viewport.clientWidth + 'px');
      section.classList.add('scroll-stories');
      distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      active = distance > 0 && sticky.offsetHeight <= window.innerHeight - stickyTop - 24;
      if (active) {
        section.style.setProperty('--stories-height', (sticky.offsetHeight + distance + 56) + 'px');
        viewport.setAttribute('tabindex', '0');
      } else {
        section.classList.remove('scroll-stories');
      }
    }
    // Preserve the reading position when an expanded review leaves the pinned rail.
    if (wasPinned && !active) window.scrollTo({ top: window.scrollY + oldTop - stickyTop, behavior: 'instant' });
    update();
  }
  function scheduleMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }
  function go(target) {
    if (!active) return;
    var list = panels();
    target = Math.max(0, Math.min(list.length - 1, target));
    var offset = list[0].offsetLeft - list[target].offsetLeft;
    window.scrollTo({
      top: window.scrollY + section.getBoundingClientRect().top - stickyTop + offset,
      behavior: reduced.matches ? 'instant' : 'smooth'
    });
  }
  previous.addEventListener('click', function () { go(index - 1); });
  next.addEventListener('click', function () { go(index + 1); });
  viewport.addEventListener('keydown', function (event) {
    if (!active || event.target !== viewport) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + (event.key === 'ArrowLeft' ? 1 : -1));
    }
  });
  viewport.addEventListener('focusin', function (event) {
    var panel = event.target.closest('.story-panel');
    if (active && panel) {
      // A keyboard focus move must also bring the focused panel into view.
      viewport.scrollLeft = 0;
      go(panels().indexOf(panel));
    }
  });
  disclosures.forEach(function (disclosure) { disclosure.addEventListener('toggle', scheduleMeasure); });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', scheduleMeasure);
  window.addEventListener('load', scheduleMeasure);
  window.addEventListener('pageshow', scheduleMeasure);
  reduced.addEventListener('change', measure);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleMeasure).observe(sticky);
  if (document.fonts) document.fonts.ready.then(scheduleMeasure);
  measure();
})();
