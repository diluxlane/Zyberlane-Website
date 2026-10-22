(function () {
  'use strict';
  // mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  function closeNav(){
    mainNav.classList.remove('open');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded','false');
  }
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen) mainNav.querySelector('a').focus();
  });
  mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
  // Close the dropdown on outside taps/clicks without blocking the page action.
  document.addEventListener('click', (e) => {
    if (mainNav.classList.contains('open') &&
        !mainNav.contains(e.target) && !navToggle.contains(e.target)){
      closeNav();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainNav.classList.contains('open')){
      closeNav();
      navToggle.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width:861px)').matches) closeNav();
  });

  // header scroll state
  const header = document.getElementById('siteHeader');
  function updateHeaderState(){
    header.classList.toggle('scrolled', window.scrollY > 30);
  }
  window.addEventListener('scroll', updateHeaderState, { passive:true });
  window.addEventListener('pageshow', updateHeaderState);
  updateHeaderState();

  // ---------- ADDITIVE: scroll-to-top FAB with liquid scroll-progress fill.
  // WhatsApp stays fixed at the anchor spot; this button pops in/out above it ----------
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  const scrollTopLiquid = document.getElementById('scrollTopLiquid');
  if (scrollTopBtn && scrollTopLiquid){
    let fabVisible = false;
    function updateScrollActions(){
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const pct = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      scrollTopLiquid.style.height = pct + '%';

      const shouldShow = scrollTop > 400;
      if (shouldShow !== fabVisible){
        fabVisible = shouldShow;
        scrollTopBtn.classList.toggle('is-visible', shouldShow);
        scrollTopBtn.tabIndex = shouldShow ? 0 : -1;
        scrollTopBtn.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
      }
    }
    window.addEventListener('scroll', updateScrollActions, { passive: true });
    window.addEventListener('pageshow', updateScrollActions);
    updateScrollActions();
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }


  // Match the homepage's 28px, 800ms reveal and 100ms stagger.
  if (document.body.classList.contains('company-page')) {
    var intro = Array.from(document.querySelectorAll('.page-intro .eyebrow, .page-intro h1, .page-intro .page-description, .page-intro .legal-date'));
    var elements = new Set(document.querySelectorAll('[data-page-reveal], .section-head'));
    intro.forEach(function(element, index) {
      element.style.transitionDelay = (index * 100) + 'ms';
      elements.add(element);
    });
    var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 }) : null;
    elements.forEach(function(element) {
      if (observer) observer.observe(element);
      else element.classList.add('in');
    });
  }
  /* ================= ADDITIVE: CUSTOM CURSOR ================= */
  (function(){
    var pointer = window.matchMedia('(min-width:861px) and (hover: hover) and (pointer: fine)');
    var cursorMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var dot = document.getElementById('cursorDot');
    var ring = document.getElementById('cursorRing');
    if(!dot || !ring) return;
    var cursorFrame;

    var mouseX = window.innerWidth/2, mouseY = window.innerHeight/2;
    var dotX = mouseX, dotY = mouseY;
    var ringX = mouseX, ringY = mouseY;

    window.addEventListener('mousemove', function(e){
      mouseX = e.clientX; mouseY = e.clientY;
    }, { passive:true });

    function tick(){
      // slight lerp/ease for smooth trailing motion instead of instant snapping
      dotX += (mouseX - dotX) * 0.35;
      dotY += (mouseY - dotY) * 0.35;
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      dot.style.transform = 'translate3d(' + dotX + 'px,' + dotY + 'px,0) translate(-50%,-50%)';
      ring.style.transform = 'translate3d(' + ringX + 'px,' + ringY + 'px,0) translate(-50%,-50%)';
      cursorFrame = requestAnimationFrame(tick);
    }
    function updateCursor(){
      cancelAnimationFrame(cursorFrame);
      var enabled = pointer.matches && !cursorMotion.matches;
      document.documentElement.classList.toggle('has-custom-cursor', enabled);
      if(enabled) cursorFrame = requestAnimationFrame(tick);
    }
    pointer.addEventListener('change', updateCursor);
    cursorMotion.addEventListener('change', updateCursor);
    updateCursor();

    var hoverSelector = 'a, button, .skill-card, .p-step, .wa-btn, .cta-btn, .nav-toggle, .fab, [role="button"]';
    document.addEventListener('mouseover', function(e){
      if(e.target.closest && e.target.closest(hoverSelector)){
        ring.classList.add('cursor-hover');
        dot.classList.add('cursor-hover');
      }
    });
    document.addEventListener('mouseout', function(e){
      if(e.target.closest && e.target.closest(hoverSelector)){
        ring.classList.remove('cursor-hover');
        dot.classList.remove('cursor-hover');
      }
    });
  })();

})();
