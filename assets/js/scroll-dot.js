/* ==========================================================================
   ELETROTEC — Sinal que acompanha o scroll (trilha de circuito)
   Um ponto de luz percorre a página como um sinal elétrico em uma placa:
   trechos verticais ligados por diagonais de 45°, com "vias" que acendem
   quando o sinal passa. No CTA final, o sinal chega ao botão de energia.

   Âncoras no HTML:
     data-dot="point" (data-dot-x / data-dot-y = frações 0–1), data-dot="rail",
     data-dot="end", data-dot-zone="expand"
   ========================================================================== */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var wrap, svg, path, grad, dot, viasG;
  var lenis = null, enabled = false;
  var segs = [], verts = [], vias = [], zones = [];
  var startY = 0, endY = 0, vh = 0, maxScroll = 0, kEnd = 0.5;
  var cur = null, last = null, scale = 1;
  var flags = { visible: false, expanded: false, arrived: false };
  var timer = 0;
  var mqMobile = window.matchMedia('(max-width: 767px)');

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function create() {
    wrap = document.createElement('div');
    wrap.className = 'thread';
    wrap.setAttribute('aria-hidden', 'true');
    svg = el('svg', { class: 'thread__svg', focusable: 'false' });
    var defs = el('defs', {});
    grad = el('linearGradient', { id: 'sigGrad', gradientUnits: 'userSpaceOnUse', x1: '0', x2: '0' });
    [['0', '0'], ['0.6', '0.35'], ['1', '1']].forEach(function (s) {
      grad.appendChild(el('stop', { offset: s[0], 'stop-color': '#5cc8d6', 'stop-opacity': s[1] }));
    });
    defs.appendChild(grad);
    svg.appendChild(defs);
    viasG = el('g', {});
    svg.appendChild(viasG);
    path = el('path', { class: 'thread__path', stroke: 'url(#sigGrad)' });
    svg.appendChild(path);
    dot = document.createElement('span');
    dot.className = 'thread__dot';
    dot.innerHTML = '<span class="thread__halo"></span>';
    wrap.appendChild(svg);
    wrap.appendChild(dot);
    document.body.appendChild(wrap);
  }

  function shown(n) {
    if (!n.getClientRects().length) return false;
    var cs = getComputedStyle(n);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function measure() {
    if (!enabled) return;
    var sy = window.scrollY, sx = window.scrollX, docEl = document.documentElement;
    vh = window.innerHeight;
    wrap.style.height = '0px';
    var docH = Math.max(docEl.scrollHeight, document.body.scrollHeight);
    maxScroll = Math.max(0, docH - vh);

    var raw = [];
    document.querySelectorAll('[data-dot]').forEach(function (n) {
      if (!shown(n)) return;
      var r = n.getBoundingClientRect(), type = n.getAttribute('data-dot');
      var top = r.top + sy, left = r.left + sx;
      if (type === 'rail') {
        var x = Math.round(left + r.width / 2);
        raw.push({ x: x, y: top }, { x: x, y: top + r.height });
      } else {
        var fx = n.hasAttribute('data-dot-x') ? +n.getAttribute('data-dot-x') : 0.5;
        var fy = n.hasAttribute('data-dot-y') ? +n.getAttribute('data-dot-y') : 0.5;
        raw.push({ x: Math.round(left + fx * r.width), y: top + fy * r.height, end: type === 'end' });
      }
    });
    raw.sort(function (a, b) { return a.y - b.y; });
    var endIdx = -1;
    raw.forEach(function (p, i) { if (p.end) endIdx = i; });
    if (endIdx >= 0) raw = raw.slice(0, endIdx + 1);

    var pts = [];
    raw.forEach(function (p) {
      var l = pts[pts.length - 1];
      if (l && p.y - l.y < 1) { if (p.end) l.x = p.x; return; }
      pts.push({ x: p.x, y: p.y });
    });
    segs = []; verts = [];
    if (pts.length < 2) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';

    // Cada trecho: vertical → diagonal 45° (centralizada) → vertical
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], D = b.y - a.y, dx = Math.abs(b.x - a.x);
      var dd = Math.min(dx, D * 0.92);
      var ya = a.y + (D - dd) / 2, yb = ya + dd;
      segs.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, ya: ya, yb: yb });
      verts.push({ x: a.x, y: a.y });
      if (dx > 0.5) { verts.push({ x: a.x, y: ya }); verts.push({ x: b.x, y: yb }); }
    }
    verts.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
    startY = pts[0].y;
    endY = pts[pts.length - 1].y;

    // Vias (pontos de solda) nas âncoras
    while (viasG.firstChild) viasG.removeChild(viasG.firstChild);
    vias = pts.slice(1, -1).map(function (p) {
      var c = el('circle', { class: 'thread__via', cx: p.x, cy: p.y.toFixed(1), r: '3.5' });
      viasG.appendChild(c);
      return { y: p.y, node: c, lit: false };
    });

    zones = [];
    document.querySelectorAll('[data-dot-zone]').forEach(function (n) {
      if (!shown(n)) return;
      var r = n.getBoundingClientRect();
      zones.push({ type: n.getAttribute('data-dot-zone'), top: r.top + sy, bottom: r.bottom + sy });
    });

    kEnd = clamp((endY - maxScroll) / vh + 0.02, 0.5, 0.94);
    wrap.style.height = docH + 'px';
    svg.setAttribute('width', String(docEl.clientWidth));
    svg.setAttribute('height', String(docH));
    last = null;
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(measure, 160); }

  function targetFor(s) {
    var k = 0.84 + (0.5 - 0.84) * smooth(s / (vh * 0.9));
    if (kEnd > 0.5) k += (kEnd - k) * smooth((s - (maxScroll - vh)) / vh);
    return s + k * vh;
  }

  function xAt(y) {
    if (y <= startY) return segs[0].x0;
    if (y >= endY) return segs[segs.length - 1].x1;
    var lo = 0, hi = segs.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (segs[mid].y1 < y) lo = mid + 1; else hi = mid; }
    var s = segs[lo];
    if (y <= s.ya) return s.x0;
    if (y >= s.yb) return s.x1;
    return s.x0 + (s.x1 - s.x0) * ((y - s.ya) / (s.yb - s.ya || 1));
  }

  function setFlag(name, v, cls) {
    if (flags[name] === v) return;
    flags[name] = v;
    wrap.classList.toggle(cls, v);
    if (name === 'arrived') document.dispatchEvent(new CustomEvent('signal:arrive', { detail: { arrived: v } }));
  }

  function tick() {
    if (!enabled || !segs.length) return;
    var s = lenis ? lenis.animatedScroll : window.scrollY;
    var target = targetFor(s);
    if (cur == null) cur = target;
    cur += (target - cur) * 0.22;
    if (Math.abs(target - cur) < 0.05) cur = target;
    var y = clamp(cur, startY, endY), x = xAt(y);

    var expand = false;
    for (var i = 0; i < zones.length; i++) if (y >= zones[i].top && y <= zones[i].bottom && zones[i].type === 'expand') expand = true;
    var arrived = cur >= endY - 2;
    setFlag('expanded', expand && !arrived, 'is-expanded');
    setFlag('arrived', arrived, 'is-arrived');
    scale += ((arrived ? 1.6 : expand ? 1.5 : 1) - scale) * 0.12;

    for (i = 0; i < vias.length; i++) {
      var lit = y >= vias[i].y - 1;
      if (lit !== vias[i].lit) { vias[i].lit = lit; vias[i].node.classList.toggle('is-lit', lit); }
    }

    if (last && Math.abs(last.y - y) < 0.02 && Math.abs(last.s - scale) < 0.001) return;
    last = { y: y, s: scale };
    dot.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + scale.toFixed(3) + ')';

    // Cauda: trecho recente da trilha, com os cantos exatos
    var tail = vh * (mqMobile.matches ? 0.45 : 0.85);
    var y0 = Math.max(startY, y - tail);
    if (y - y0 > 2) {
      var d = 'M' + xAt(y0).toFixed(1) + ' ' + y0.toFixed(1);
      for (i = 0; i < verts.length; i++) if (verts[i].y > y0 && verts[i].y < y) d += 'L' + verts[i].x.toFixed(1) + ' ' + verts[i].y.toFixed(1);
      d += 'L' + x.toFixed(1) + ' ' + y.toFixed(1);
      path.setAttribute('d', d);
      grad.setAttribute('y1', y0.toFixed(1));
      grad.setAttribute('y2', y.toFixed(1));
    } else {
      path.setAttribute('d', '');
    }
  }

  window.ScrollDot = {
    init: function (opts) {
      if (enabled) return;
      var forced = document.documentElement.classList.contains('force-motion');
      if (!forced && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      lenis = (opts && opts.lenis) || null;
      enabled = true;
      create();
      measure();
      if (window.gsap) window.gsap.ticker.add(tick);
      else (function loop() { tick(); requestAnimationFrame(loop); })();
      if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', measure);
      window.addEventListener('resize', schedule, { passive: true });
      window.addEventListener('load', measure);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
      if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
      if (window.scrollY > 40) this.reveal();
    },
    reveal: function () { if (enabled && wrap) setFlag('visible', true, 'is-visible'); },
    measure: function () { if (enabled) measure(); },
  };
})();
