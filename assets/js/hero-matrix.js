/* ==========================================================================
   ELETROTEC — Matriz de pontos da hero (canvas 2D)
   Um celular desenhado em pontos (eco do "TEC" do logotipo). Na abertura,
   a tela aparece trincada; uma varredura "conserta" os pontos e acende o
   "TEC". Depois: brilho que acompanha o cursor e um reflexo diagonal suave.
   API: HeroMatrix.init(canvas, { reduceMotion }) → { setScroll(p), destroy() }
   ========================================================================== */
(function () {
  'use strict';

  var GLYPHS = {
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  };
  var CHECK = ['0000001', '0000011', '1000110', '1101100', '0111000', '0010000', '0000000'];
  // categorias de cor: 0 fundo, 1 moldura, 2 tela, 3 glifo claro, 4 glifo azul, 5 trinca
  var COLORS = [[92, 200, 214], [139, 227, 238], [47, 168, 200], [196, 244, 250], [40, 150, 214], [255, 255, 255]];
  var BUCKETS = 20;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  function sdRoundRect(px, py, hw, hh, r) {
    var qx = Math.abs(px) - hw + r, qy = Math.abs(py) - hh + r;
    var ox = Math.max(qx, 0), oy = Math.max(qy, 0);
    return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
  }
  function distSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1);
    t = clamp(t, 0, 1);
    var x = ax + dx * t - px, y = ay + dy * t - py;
    return Math.sqrt(x * x + y * y);
  }

  function init(canvas, opts) {
    opts = opts || {};
    var reduce = !!opts.reduceMotion;
    var ctx = canvas.getContext('2d');
    var dots = [], W = 0, H = 0, S = 13, size = 3, dpr = 1;
    var styles = [], buckets = [], counts = [];
    var pointer = { x: -9999, y: -9999, k: 0, tk: 0 };
    var scroll = 0, running = false, raf = 0, t0 = performance.now();
    var phone = null;

    for (var c = 0; c < COLORS.length; c++) {
      styles[c] = [];
      for (var b = 0; b <= BUCKETS; b++) styles[c][b] = 'rgba(' + COLORS[c].join(',') + ',' + (b / BUCKETS).toFixed(3) + ')';
    }

    function build() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(1, rect.width); H = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var narrow = W < 900;
      var ph = narrow ? Math.min(H * 0.33, 280) : Math.min(H * 0.66, 600);
      var pw = ph * 0.5;
      // densidade da grade: no desktop, garante ~21 colunas no visor para caber o "TEC"
      S = narrow ? 12 : clamp(Math.floor(pw / 25), 9, 13);
      size = Math.max(2, Math.round(S * 0.3));
      var cx = narrow ? W * 0.5 : W * 0.75, cy = narrow ? Math.max(ph / 2 + 70, H * 0.21) : H * 0.5;
      phone = { cx: cx, cy: cy, hw: pw / 2, hh: ph / 2, r: pw * 0.18 };

      var cols = Math.ceil(W / S) + 1, rows = Math.ceil(H / S) + 1;
      var offX = (W - (cols - 1) * S) / 2, offY = (H - (rows - 1) * S) / 2;
      var scrTop = cy - phone.hh + S * 2, scrH = ph - S * 4, scrL = cx - phone.hw + S * 2, scrW = pw - S * 4;
      var crack = [
        [0.86, 0.06], [0.62, 0.28], [0.7, 0.44], [0.36, 0.6], [0.46, 0.76], [0.14, 0.96],
      ].map(function (p) { return [scrL + p[0] * scrW, scrTop + p[1] * scrH]; });
      var branch = [[scrL + 0.62 * scrW, scrTop + 0.28 * scrH], [scrL + 0.28 * scrW, scrTop + 0.22 * scrH], [scrL + 0.08 * scrW, scrTop + 0.3 * scrH]];

      // glifo: "TEC" se couber, senão um "check"
      var screenCols = Math.floor(scrW / S);
      var glyphRows = [];
      if (screenCols >= 19) {
        for (var gr = 0; gr < 7; gr++) {
          glyphRows.push(GLYPHS.T[gr] + '0' + GLYPHS.E[gr] + '0' + GLYPHS.C[gr]);
        }
      } else {
        glyphRows = CHECK.slice();
      }
      var gw = glyphRows[0].length, gh = glyphRows.length;

      dots = [];
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var x = offX + i * S, y = offY + j * S;
          var d = sdRoundRect(x - cx, y - cy, phone.hw, phone.hh, phone.r);
          var cat = 0, base;
          if (d < S * 0.3 && d > -S * 1.2) { cat = 1; base = 0.5; }
          else if (d <= -S * 1.2) { cat = 2; base = 0.11; }
          else {
            var side = narrow ? 1 : 0.28 + 0.72 * smooth(x / W);
            base = 0.075 * side;
          }
          var dot = { x: x, y: y, cat: cat, base: base, ox: 0, oy: 0, crack: 0, glyph: false, phase: Math.random() * 6.28 };
          if (cat === 2) {
            // glifo centralizado
            var gc = Math.round((x - cx) / S + gw / 2 - 0.5), grr = Math.round((y - (cy - phone.hh * 0.12)) / S + gh / 2 - 0.5);
            if (gc >= 0 && gc < gw && grr >= 0 && grr < gh && glyphRows[grr][gc] === '1') {
              dot.glyph = true; dot.cat = grr < gh / 2 ? 3 : 4; dot.base = 0.95;
            }
            // barra de status e indicador inferior
            if (Math.abs(y - (scrTop + S * 0.5)) < S * 0.5 && x > scrL + scrW - S * 3.5) dot.base = 0.4;
            if (Math.abs(y - (scrTop + scrH - S * 0.5)) < S * 0.5 && Math.abs(x - cx) < S * 2.6) dot.base = 0.45;
          }
          if (cat === 1 && Math.abs(x - cx) < S * 1.6 && y < cy - phone.hh + S * 2) { dot.cat = 2; dot.base = 0.05; } // notch
          if (cat >= 1 || dot.glyph) {
            var dc = Infinity, k;
            for (k = 0; k < crack.length - 1; k++) dc = Math.min(dc, distSeg(x, y, crack[k][0], crack[k][1], crack[k + 1][0], crack[k + 1][1]));
            for (k = 0; k < branch.length - 1; k++) dc = Math.min(dc, distSeg(x, y, branch[k][0], branch[k][1], branch[k + 1][0], branch[k + 1][1]));
            if (dc < S * 1.25 && d < 0) {
              dot.crack = reduce ? 0 : 1;
              dot.cox = (Math.random() - 0.5) * S * 0.9;
              dot.coy = (Math.random() - 0.5) * S * 0.9;
            }
          }
          dots.push(dot);
        }
      }
      phone.scrTop = scrTop; phone.scrH = scrH;
      for (c = 0; c < COLORS.length; c++) {
        buckets[c] = [];
        counts[c] = [];
        for (b = 0; b <= BUCKETS; b++) { buckets[c][b] = new Int32Array(dots.length); counts[c][b] = 0; }
      }
    }

    function frame(now) {
      var t = (now - t0) / 1000;
      var repair = reduce ? 1 : smooth((t - 0.7) / 1.8);
      var scanY = phone.scrTop + repair * (phone.scrH + 40) - 20;
      var shimmerX = ((t * 0.14) % 1.6 - 0.3) * (W + H);
      pointer.k += (pointer.tk - pointer.k) * 0.12;
      var fade = 1 - smooth(scroll * 1.25);
      var R = 130;
      var c, b, i;
      for (c = 0; c < COLORS.length; c++) for (b = 0; b <= BUCKETS; b++) counts[c][b] = 0;

      for (i = 0; i < dots.length; i++) {
        var p = dots[i];
        var a = p.base, cat = p.cat, ox = 0, oy = 0;
        if (p.cat >= 2 || p.glyph) {
          if (repair < 1) a *= 0.35 + 0.65 * smooth((scanY - p.y) / 60);
        }
        if (p.crack > 0) {
          var healed = smooth((scanY - p.y) / 50);
          var k = 1 - healed;
          if (k > 0.01) {
            ox = p.cox * k; oy = p.coy * k;
            cat = 5;
            a = 0.35 + 0.4 * k * (0.6 + 0.4 * Math.sin(t * 14 + p.phase));
          }
        }
        if (!reduce) {
          var dy = Math.abs(p.y - scanY);
          if (repair > 0 && repair < 1 && dy < 14 && p.cat >= 1) a += 0.6 * (1 - dy / 14);
          var sd = Math.abs(p.x + p.y - shimmerX);
          if (sd < 90) a += (p.cat === 0 ? 0.06 : 0.14) * (1 - sd / 90);
          if (pointer.k > 0.01) {
            var px = p.x - pointer.x, py = p.y - pointer.y, dd = px * px + py * py;
            if (dd < R * R) { var f = 1 - Math.sqrt(dd) / R; a += (p.cat === 0 ? 0.55 : 0.4) * f * f * pointer.k; }
          }
        }
        a *= fade;
        if (a <= 0.02) continue;
        b = Math.min(BUCKETS, Math.round(a * BUCKETS));
        var arr = buckets[cat][b];
        arr[counts[cat][b]++] = i;
        p._ox = ox; p._oy = oy;
      }

      ctx.clearRect(0, 0, W, H);
      var half = size / 2;
      for (c = 0; c < COLORS.length; c++) {
        for (b = 1; b <= BUCKETS; b++) {
          var n = counts[c][b];
          if (!n) continue;
          ctx.fillStyle = styles[c][b];
          var list = buckets[c][b];
          for (i = 0; i < n; i++) {
            var q = dots[list[i]];
            ctx.fillRect(q.x - half + q._ox, q.y - half + q._oy, size, size);
          }
        }
      }
    }

    function loop(now) {
      frame(now);
      if (running) raf = requestAnimationFrame(loop);
    }
    function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    build();
    frame(performance.now());

    var onMove = function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.tk = 1;
    };
    var onLeave = function () { pointer.tk = 0; };
    var host = canvas.parentElement;
    if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      host.addEventListener('pointermove', onMove, { passive: true });
      host.addEventListener('pointerleave', onLeave);
    }
    var ro = new ResizeObserver(function () { build(); frame(performance.now()); });
    ro.observe(host);
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !document.hidden) start(); else stop();
    });
    io.observe(canvas);
    var onVis = function () { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onVis);

    return {
      setScroll: function (p) { scroll = clamp(p, 0, 1); if (reduce) frame(performance.now()); },
      destroy: function () {
        stop(); ro.disconnect(); io.disconnect();
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerleave', onLeave);
        document.removeEventListener('visibilitychange', onVis);
      },
    };
  }

  window.HeroMatrix = { init: init };
})();
