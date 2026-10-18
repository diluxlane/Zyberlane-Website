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
  var disclosure = section.querySelector('.review-more');
  var desktop = window.matchMedia('(min-width:861px) and (hover:hover) and (pointer:fine)');
  var active = false, distance = 0, frame = 0, measureFrame = 0, stickyTop = 90;

  function update() {
    frame = 0;
    if (!active) return;
    var progress = Math.max(0, Math.min(1, (stickyTop - section.getBoundingClientRect().top) / distance));
    track.style.transform = 'translate3d(' + (-progress * distance) + 'px,0,0)';
    previous.disabled = progress <= 0.001;
    next.disabled = progress >= 0.999;
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
    track.style.transform = '';
    viewport.scrollLeft = 0;
    viewport.removeAttribute('tabindex');
    // Reading the complete review uses normal page flow, including short windows.
    if (desktop.matches && !reduced.matches && !disclosure.open) {
      section.classList.add('scroll-stories');
      distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      active = distance > 0 && sticky.offsetHeight <= window.innerHeight - stickyTop - 24;
      if (active) {
        section.style.setProperty('--stories-height', (sticky.offsetHeight + distance) + 'px');
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
  function go(last) {
    if (!active) return;
    window.scrollTo({
      top: window.scrollY + section.getBoundingClientRect().top - stickyTop + (last ? distance : 0),
      behavior: reduced.matches ? 'instant' : 'smooth'
    });
  }
  previous.addEventListener('click', function () { go(false); });
  next.addEventListener('click', function () { go(true); });
  viewport.addEventListener('keydown', function (event) {
    if (!active || event.target !== viewport) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      go(event.key === 'ArrowRight');
    }
  });
  viewport.addEventListener('focusin', function (event) {
    var panel = event.target.closest('.story-panel');
    if (active && panel) {
      // A keyboard focus move must also bring the focused panel into view.
      viewport.scrollLeft = 0;
      go(panel !== track.firstElementChild);
    }
  });
  disclosure.addEventListener('toggle', scheduleMeasure);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', scheduleMeasure);
  window.addEventListener('load', scheduleMeasure);
  window.addEventListener('pageshow', scheduleMeasure);
  desktop.addEventListener('change', scheduleMeasure);
  reduced.addEventListener('change', measure);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleMeasure).observe(sticky);
  if (document.fonts) document.fonts.ready.then(scheduleMeasure);
  measure();
})();
