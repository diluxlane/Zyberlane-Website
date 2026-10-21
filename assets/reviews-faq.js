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
  var disclosures = Array.from(section.querySelectorAll('.review-more, #divineReviewToggle'));
  var active = false, distance = 0, index = 0, frame = 0, measureFrame = 0, stickyTop = 90;

  var reviewToggle = document.getElementById('divineReviewToggle');
  if (reviewToggle) {
    var review = document.getElementById('divineReview');
    var remainder = document.getElementById('divineReviewRemainder');
    var reviewAnimation = null;
    // Keep the complete review readable when JavaScript is unavailable.
    remainder.hidden = true;
    reviewToggle.hidden = false;
    reviewToggle.addEventListener('click', function () {
      var from = review.getBoundingClientRect().height;
      if (reviewAnimation) reviewAnimation.cancel();
      reviewAnimation = null;
      review.style.overflow = '';
      var expanded = reviewToggle.getAttribute('aria-expanded') !== 'true';
      remainder.hidden = !expanded;
      reviewToggle.setAttribute('aria-expanded', String(expanded));
      reviewToggle.textContent = expanded ? 'Read less' : 'Read more';
      if (!reduced.matches && typeof review.animate === 'function') {
        var animation = review.animate([
          { height: from + 'px' },
          { height: review.getBoundingClientRect().height + 'px' }
        ], { duration: 280, easing: 'cubic-bezier(.16,.8,.24,1)' });
        reviewAnimation = animation;
        review.style.overflow = 'hidden';
        function finishReviewAnimation() {
          if (reviewAnimation !== animation) return;
          reviewAnimation = null;
          review.style.overflow = '';
          scheduleMeasure();
        }
        animation.finished.then(finishReviewAnimation, finishReviewAnimation);
      }
      scheduleMeasure();
    });
    reduced.addEventListener('change', function () {
      if (reduced.matches && reviewAnimation) reviewAnimation.finish();
    });
  }
  function panels() { return Array.from(track.querySelectorAll('.story-panel')); }

  function update() {
    frame = 0;
    var progress = active
      ? Math.max(0, Math.min(1, (stickyTop - section.getBoundingClientRect().top) / distance))
      : distance ? viewport.scrollLeft / distance : 0;
    // Move left from the real review to the Google CTA as progress increases.
    if (active) track.style.transform = 'translate3d(' + (-progress * distance) + 'px,0,0)';
    index = Math.round(progress * (panels().length - 1));
    previous.disabled = index === 0;
    next.disabled = index === panels().length - 1;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  function measure() {
    measureFrame = 0;
    var wasActive = active;
    var oldTop = section.getBoundingClientRect().top;
    var wasPinned = wasActive && oldTop <= stickyTop && oldTop > stickyTop - distance;
    var oldIndex = index;
    // Keep the scroll range stable while measuring the unpinned track.
    var previousHeight = section.style.height;
    section.style.height = section.offsetHeight + 'px';
    active = false;
    section.classList.remove('scroll-stories');
    section.style.removeProperty('--stories-height');
    section.style.removeProperty('--stories-top');
    track.style.removeProperty('--stories-panel-width');
    track.style.transform = '';
    viewport.scrollLeft = 0;
    viewport.setAttribute('tabindex', '0');
    // Reading the complete review uses normal page flow, including short windows.
    if (!reduced.matches && !disclosures.some(function (disclosure) { return disclosure.open || disclosure.getAttribute('aria-expanded') === 'true'; })) {
      track.style.setProperty('--stories-panel-width', viewport.clientWidth + 'px');
      section.classList.add('scroll-stories');
      distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      active = distance > 0;
      if (active) {
        // A tall card enters in normal vertical flow before pinning, so its
        // content can be read even on a short screen without stacking the CTA.
        stickyTop = Math.min(90, window.innerHeight - sticky.offsetHeight - 24);
        section.style.setProperty('--stories-top', stickyTop + 'px');
        section.style.setProperty('--stories-height', (sticky.offsetHeight + distance + 56) + 'px');
      } else {
        section.classList.remove('scroll-stories');
      }
    }
    if (!active) {
      // Expanded reviews and reduced motion keep the same horizontal order
      // using the Portfolio's native overflow fallback, never a stacked CTA.
      track.style.removeProperty('--stories-panel-width');
      distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      var list = panels();
      viewport.scrollLeft = list[Math.min(oldIndex, list.length - 1)].offsetLeft - list[0].offsetLeft;
    }
    section.style.height = previousHeight;
    // Preserve the reading position when an expanded review leaves the pinned rail.
    if (wasPinned && !active) window.scrollTo({ top: window.scrollY + oldTop - stickyTop, behavior: 'instant' });
    update();
  }
  function scheduleMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }
  function go(target) {
    var list = panels();
    target = Math.max(0, Math.min(list.length - 1, target));
    var behavior = reduced.matches ? 'instant' : 'smooth';
    if (active) {
      var offset = list[target].offsetLeft - list[0].offsetLeft;
      window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - stickyTop + offset, behavior: behavior });
    } else {
      viewport.scrollTo({ left: list[target].offsetLeft - list[0].offsetLeft, behavior: behavior });
    }
  }
  previous.addEventListener('click', function () { go(index - 1); });
  next.addEventListener('click', function () { go(index + 1); });
  viewport.addEventListener('keydown', function (event) {
    if (event.target !== viewport) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  viewport.addEventListener('focusin', function (event) {
    var panel = event.target.closest('.story-panel');
    if (panel) {
      // A keyboard focus move must also bring the focused panel into view.
      if (active) viewport.scrollLeft = 0;
      go(panels().indexOf(panel));
    }
  });
  disclosures.forEach(function (disclosure) { disclosure.addEventListener('toggle', scheduleMeasure); });
  viewport.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', scheduleMeasure);
  window.addEventListener('load', scheduleMeasure);
  window.addEventListener('pageshow', scheduleMeasure);
  reduced.addEventListener('change', measure);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleMeasure).observe(sticky);
  if (document.fonts) document.fonts.ready.then(scheduleMeasure);
  section.classList.add('stories-ready');
  measure();
})();
