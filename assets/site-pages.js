(function () {
  'use strict';
  var nav = document.getElementById('mainNav');
  var toggle = document.getElementById('navToggle');
  var header = document.getElementById('siteHeader');
  function closeNav() {
    nav.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('open');
    toggle.classList.toggle('active', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) nav.querySelector('a').focus();
  });
  nav.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', closeNav); });
  document.addEventListener('click', function (event) {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) closeNav();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && nav.classList.contains('open')) { closeNav(); toggle.focus(); }
  });
  window.addEventListener('resize', function () {
    if (window.matchMedia('(min-width:861px)').matches) closeNav();
  });
  function updateHeader() { header.classList.toggle('scrolled', window.scrollY > 30); }
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('pageshow', updateHeader);
  updateHeader();

  // Content remains visible without JavaScript or when reduced motion is requested.
  var reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (!reducedMotion.matches && entry.target.animate) {
          entry.target.animate([
            { opacity: 0, transform: 'translateY(20px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 650, easing: 'cubic-bezier(.16,.8,.24,1)' });
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('[data-page-reveal]').forEach(function (element) { observer.observe(element); });
  }
})();
