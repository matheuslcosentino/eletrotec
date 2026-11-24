/* ==========================================================================
   ELETROTEC — Orquestração (Lenis + GSAP ScrollTrigger + interações)
   Funciona sem animações com "reduzir movimento" ou se a CDN falhar.
   ?animacoes=on força as animações para pré-visualização.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var C = window.SITE_CONFIG || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var pad = function (n) { return String(n).padStart(2, '0'); };

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqDesktop = window.matchMedia('(min-width: 1024px)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var prefersReduce = mqReduce.matches && !root.classList.contains('force-motion');
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var motion = hasGSAP && root.classList.contains('motion-ok') && !prefersReduce;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var lenis = null, phoneApi = null, matrix = null;

  if (window.SiteRender) window.SiteRender.init();
  var Links = window.SiteLinks;

  if (hasGSAP) gsap.registerPlugin(ST);
  if (motion) root.classList.add('motion-ready'); else root.classList.remove('motion-ok');

  var refreshTimer = 0;
  function refreshSoon() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { if (hasGSAP) ST.refresh(); if (window.ScrollDot) window.ScrollDot.measure(); }, 140);
  }

  if (motion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* Âncoras --------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    var target = id.length > 1 && document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    if (root.classList.contains('menu-open')) closeMenu(true);
    if (lenis) lenis.scrollTo(target, { duration: 1.5, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else target.scrollIntoView({ behavior: prefersReduce ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* Navbar ---------------------------------------------------------------- */
  (function () {
    var nav = $('[data-nav]');
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    var links = $$('[data-nav-link]');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.getAttribute('data-section');
        links.forEach(function (l) {
          if (l.getAttribute('data-nav-link') === id) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -54% 0px' });
    $$('[data-section]').forEach(function (s) { io.observe(s); });
  })();

  /* Menu mobile ----------------------------------------------------------- */
  var menu = $('[data-menu]'), menuBtn = $('[data-menu-toggle]'), menuLabel = $('[data-menu-label]');
  var inertables = function () { return [$('main'), $('.footer'), $('[data-wa-float]')].filter(Boolean); };
  function openMenu() {
    menu.hidden = false;
    root.classList.add('menu-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuLabel.textContent = 'Fechar menu';
    inertables().forEach(function (el) { el.inert = true; });
    if (lenis) lenis.stop();
    if (motion) {
      gsap.fromTo(menu, { clipPath: 'circle(0% at 92% 4%)' }, { clipPath: 'circle(150% at 92% 4%)', duration: 0.8, ease: 'expo.inOut' });
      gsap.fromTo('.menu__link, .menu__footer > *', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.05, delay: 0.25, ease: 'expo.out' });
    }
    var first = $('.menu__link', menu);
    if (first) first.focus({ preventScroll: true });
  }
  function closeMenu(instant) {
    if (!menu || menu.hidden) return;
    root.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuLabel.textContent = 'Abrir menu';
    inertables().forEach(function (el) { el.inert = false; });
    if (lenis) lenis.start();
    if (motion && !instant) {
      gsap.to(menu, { clipPath: 'circle(0% at 92% 4%)', duration: 0.6, ease: 'expo.inOut', onComplete: function () { menu.hidden = true; } });
    } else {
      menu.hidden = true;
    }
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', function () { if (root.classList.contains('menu-open')) { closeMenu(); menuBtn.focus(); } else openMenu(); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a') && !e.target.closest('a[href^="#"]')) closeMenu(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('menu-open')) { closeMenu(); menuBtn.focus(); } });
    mqDesktop.addEventListener('change', function (e) { if (e.matches) closeMenu(true); });
  }

  /* Serviços + celular 3D ------------------------------------------------- */
  var PART_LABEL = { screen: 'tela', battery: 'bateria', port: 'conector de carga', board: 'placa', back: 'tampa traseira', frame: 'moldura' };
  var svc = { active: 0, lastUser: 0 };
  (function () {
    var items = $$('.svc');
    if (!items.length) return;
    var detail = $('[data-service-detail]');
    var num = $('[data-detail-num]'), title = $('[data-detail-title]'), text = $('[data-detail-text]'), link = $('[data-detail-link]');
    var readout = $('[data-readout]');
    var hoverT = 0, swapT = 0;
    function fill(i) {
      var s = C.services[i];
      num.textContent = pad(i + 1) + ' / ' + pad(C.services.length);
      title.textContent = s.name;
      text.textContent = s.description;
      link.href = Links.service(s);
      if (readout) readout.textContent = 'vista explodida · ' + (PART_LABEL[s.part] || 'aparelho');
    }
    function a11y() {
      var desk = mqDesktop.matches;
      items.forEach(function (el, i) {
        var b = el.querySelector('.svc__btn');
        if (desk) { b.removeAttribute('aria-expanded'); b.setAttribute('aria-controls', 'service-detail'); b.setAttribute('aria-pressed', String(i === svc.active)); }
        else { b.removeAttribute('aria-pressed'); b.setAttribute('aria-controls', 'svc-panel-' + i); b.setAttribute('aria-expanded', String(el.classList.contains('is-open'))); }
      });
    }
    function setActive(i, user) {
      if (user) svc.lastUser = performance.now();
      if (i === svc.active && title.textContent === C.services[i].name) return;
      svc.active = i;
      items.forEach(function (el, k) { el.classList.toggle('is-active', k === i); });
      a11y();
      if (mqDesktop.matches) {
        detail.classList.add('is-swapping');
        clearTimeout(swapT);
        swapT = setTimeout(function () { fill(i); detail.classList.remove('is-swapping'); }, 240);
      } else fill(i);
      if (phoneApi) phoneApi.focus(C.services[i].part);
    }
    items.forEach(function (el, i) {
      var b = el.querySelector('.svc__btn');
      b.addEventListener('click', function () {
        if (mqDesktop.matches) { setActive(i, true); return; }
        var open = !el.classList.contains('is-open');
        items.forEach(function (o) { o.classList.remove('is-open'); });
        if (open) el.classList.add('is-open');
        setActive(i, true); a11y(); refreshSoon(); setTimeout(refreshSoon, 600);
      });
      b.addEventListener('pointerenter', function () {
        if (!mqDesktop.matches || !mqFine.matches) return;
        clearTimeout(hoverT);
        hoverT = setTimeout(function () { setActive(i, true); }, 70);
      });
      b.addEventListener('pointerleave', function () { clearTimeout(hoverT); });
      b.addEventListener('focus', function () { if (mqDesktop.matches) setActive(i, true); });
    });
    fill(0); a11y();
    mqDesktop.addEventListener('change', a11y);
    if (hasGSAP) {
      gsap.matchMedia().add('(min-width: 1024px)', function () {
        items.forEach(function (el, i) {
          ST.create({ trigger: el, start: 'top 58%', end: 'bottom 58%', onToggle: function (self) { if (self.isActive && performance.now() - svc.lastUser > 1600) setActive(i); } });
        });
      });
    }
  })();

  (function () {
    var stage = $('[data-phone-stage]');
    if (!stage || !window.PhoneScene) return;
    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      window.PhoneScene.mount(stage, { reduceMotion: !motion }).then(function (api) {
        phoneApi = api;
        if (!api) return;
        api.focus(C.services[svc.active].part);
        if (hasGSAP) ST.create({ trigger: '#servicos', start: 'top 70%', end: 'bottom 30%', onUpdate: function (self) { api.setProgress(self.progress); } });
        else api.setProgress(1);
      });
    };
    var io = new IntersectionObserver(function (en) { if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: '900px 0px' });
    io.observe(stage);
  })();

  /* Hero: matriz de pontos e digitação ------------------------------------ */
  (function () {
    var canvas = $('[data-hero-matrix]');
    if (canvas && window.HeroMatrix) {
      matrix = window.HeroMatrix.init(canvas, { reduceMotion: !motion });
      if (hasGSAP) ST.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: function (self) { matrix.setScroll(self.progress); } });
    }
    var el = $('[data-typer]');
    if (!el || !motion) return;
    var lines = ['Quebrou a tela do celular?', 'Notebook não liga?', 'Videogame travando?', 'Celular não carrega?'];
    var li = 0, ci = lines[0].length, deleting = false;
    el.textContent = '';
    ci = 0;
    (function step() {
      var full = lines[li];
      if (!deleting) {
        ci++;
        el.textContent = full.slice(0, ci);
        if (ci >= full.length) { deleting = true; return setTimeout(step, 2200); }
        return setTimeout(step, 42 + Math.random() * 40);
      }
      ci--;
      el.textContent = full.slice(0, ci);
      if (ci <= 0) { deleting = false; li = (li + 1) % lines.length; return setTimeout(step, 350); }
      setTimeout(step, 22);
    })();
  })();

  /* FAQ ------------------------------------------------------------------- */
  $$('.faq-item').forEach(function (item) {
    var b = item.querySelector('.faq-item__btn');
    b.addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      b.setAttribute('aria-expanded', String(open));
      setTimeout(refreshSoon, 550);
    });
  });

  /* Mapa sob demanda ------------------------------------------------------ */
  (function () {
    var box = $('[data-map]');
    if (!box || !Links) return;
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      var f = document.createElement('iframe');
      f.src = Links.embed();
      f.title = 'Mapa com a localização da EletroTEC em Balneário Piçarras';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.addEventListener('load', function () { box.classList.add('is-loaded'); });
      box.appendChild(f);
    }, { rootMargin: '600px 0px' });
    io.observe(box);
  })();

  /* WhatsApp flutuante ---------------------------------------------------- */
  (function () {
    var fab = $('[data-wa-float]'), hero = $('.hero');
    if (!fab || !hero) return;
    var heroOut = false, endIn = false, seen = new Set();
    var upd = function () { fab.classList.toggle('is-visible', heroOut && !endIn); };
    new IntersectionObserver(function (en) { heroOut = en[0].intersectionRatio < 0.35; upd(); }, { threshold: [0, 0.35, 1] }).observe(hero);
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) seen.add(x.target); else seen.delete(x.target); });
      endIn = seen.size > 0; upd();
    }, { rootMargin: '0px 0px -25% 0px' });
    [$('.cta'), $('.footer')].filter(Boolean).forEach(function (n) { io.observe(n); });
  })();

  /* Brilho que segue o mouse nas dicas ------------------------------------ */
  $$('.tip').forEach(function (t) {
    t.addEventListener('pointermove', function (e) {
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* Coreografia ------------------------------------------------------------ */
  function heroIntro() {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.1 });
    tl.from('.hero__glow', { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0)
      .to('[data-hero="eyebrow"]', { opacity: 1, duration: 1 }, 0.3)
      .fromTo('[data-hero="problem"]', { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 1 }, 0.45)
      .to('.hero__headline .ln > span', { y: 0, duration: 1.3, stagger: 0.12 }, 0.55)
      .fromTo('[data-hero="fade"]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.1 }, 0.95)
      .fromTo('[data-hero="ctas"] > *', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 1.1)
      .fromTo('[data-hero="facts"]', { opacity: 0 }, { opacity: 1, duration: 1 }, 1.3)
      .fromTo('[data-hero="foot"]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 1.4)
      .add(function () {
        var h = $('.hero__headline'); if (h) h.classList.add('is-revealed');
        if (window.ScrollDot) window.ScrollDot.reveal();
      }, 1.8);
    gsap.to('.hero__content', { y: -60, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  function reveals() {
    $$('[data-anim="lines"]').forEach(function (h) {
      gsap.to($$('.ln > span', h), {
        y: 0, duration: 1.25, ease: 'expo.out', stagger: 0.1,
        scrollTrigger: { trigger: h, start: 'top 88%', once: true },
        onComplete: function () { h.classList.add('is-revealed'); },
      });
    });
    ST.batch('[data-anim="fade-up"]', {
      start: 'top 92%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }); },
    });
    $$('[data-anim="image"]').forEach(function (el) {
      var img = el.querySelector('img');
      var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' });
      if (img) tl.fromTo(img, { scale: 1.22 }, { scale: 1, duration: 2, ease: 'expo.out' }, 0.1);
    });
    $$('.bento__art svg').forEach(function (svg) {
      var paths = $$('.draw', svg);
      paths.forEach(function (p) { var L = p.getTotalLength ? p.getTotalLength() : 300; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      gsap.to(paths, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: 0.15, scrollTrigger: { trigger: svg, start: 'top 85%', once: true } });
    });
    var pic = $('.about__media picture');
    if (pic) gsap.fromTo(pic, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: '.about__media', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  function marquee() {
    var track = $('[data-marquee-track]');
    if (!track) return;
    var tween = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    var boost = { v: 1 };
    ST.create({
      onUpdate: function (self) {
        var v = Math.min(Math.abs(self.getVelocity()) / 500, 5);
        gsap.to(boost, { v: 1 + v, duration: 0.2, overwrite: true, onUpdate: function () { tween.timeScale(boost.v * (self.direction < 0 ? -1 : 1)); } });
        gsap.to(boost, { v: 1, duration: 1.4, delay: 0.25, ease: 'power2.out', onUpdate: function () { tween.timeScale(Math.max(1, boost.v)); } });
      },
    });
  }

  function magnetic() {
    if (!mqFine.matches) return;
    $$('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  function steps() {
    $$('.step').forEach(function (s) {
      ST.create({ trigger: s.querySelector('.step__node'), start: 'center 50%', onEnter: function () { s.classList.add('is-active'); }, onLeaveBack: function () { s.classList.remove('is-active'); } });
    });
    var fill = $('[data-steps-fill]');
    if (fill) gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.steps__line', start: 'top 50%', end: 'bottom 50%', scrub: true } });
  }

  function power() {
    var cta = $('.cta');
    if (!cta) return;
    document.addEventListener('signal:arrive', function (e) { cta.classList.toggle('is-powered', !!e.detail.arrived); });
    ST.create({ trigger: '.cta__power', start: 'center 72%', onEnter: function () { cta.classList.add('is-powered'); } });
  }

  if (motion) {
    heroIntro();
    reveals();
    marquee();
    magnetic();
    steps();
    power();
    if (window.ScrollDot) window.ScrollDot.init({ lenis: lenis });
  } else {
    $$('.step').forEach(function (s) { s.classList.add('is-active'); });
    var cta = $('.cta');
    if (cta) cta.classList.add('is-powered');
  }

  var refreshAll = function () { if (hasGSAP) ST.refresh(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshAll);
  window.addEventListener('load', refreshAll);
})();
