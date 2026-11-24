/* ==========================================================================
   ELETROTEC — Celular 3D em vista explodida (Three.js, carregado sob demanda)
   Camadas: tela · moldura (com conector de carga) · placa · bateria · tampa.
   O scroll da seção "explode" o aparelho; o serviço selecionado acende a peça.
   API: PhoneScene.mount(stage, { reduceMotion }) →
        Promise<{ focus(part), setProgress(p), dispose() } | null>
   ========================================================================== */
(function () {
  'use strict';

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  function webgl() {
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (e) { return false; }
  }
  function loadImage(src) {
    return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; });
  }

  function screenCanvas(logo) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 1040;
    var x = c.getContext('2d');
    x.beginPath(); x.roundRect(0, 0, 512, 1040, 70); x.clip();
    var g = x.createLinearGradient(0, 0, 0, 1040); g.addColorStop(0, '#071420'); g.addColorStop(1, '#03070c');
    x.fillStyle = g; x.fillRect(0, 0, 512, 1040);
    var r = x.createRadialGradient(256, 470, 0, 256, 470, 360); r.addColorStop(0, 'rgba(47,168,200,0.45)'); r.addColorStop(1, 'rgba(47,168,200,0)');
    x.fillStyle = r; x.fillRect(0, 0, 512, 1040);
    x.fillStyle = 'rgba(92,200,214,0.16)';
    for (var yy = 24; yy < 1040; yy += 22) for (var xx = 24; xx < 512; xx += 22) x.fillRect(xx, yy, 3, 3);
    if (logo) { var w = 400, h = w * logo.height / logo.width; x.drawImage(logo, 56, 470 - h / 2, w, h); }
    x.fillStyle = 'rgba(230,240,245,0.85)'; x.beginPath(); x.roundRect(186, 1000, 140, 8, 4); x.fill();
    x.fillStyle = 'rgba(230,240,245,0.7)'; x.beginPath(); x.roundRect(214, 30, 84, 26, 13); x.fill();
    return c;
  }
  function boardCanvas() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var x = c.getContext('2d');
    x.fillStyle = '#0a2a2e'; x.fillRect(0, 0, 512, 256);
    x.strokeStyle = '#1f7a7e'; x.lineWidth = 3;
    for (var i = 0; i < 26; i++) {
      var sx = Math.random() * 512, sy = Math.random() * 256, len = 40 + Math.random() * 120;
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + len, sy); x.lineTo(sx + len + 20, sy + 20); x.lineTo(sx + len + 20, sy + 60); x.stroke();
    }
    x.fillStyle = '#c9a24a';
    for (i = 0; i < 40; i++) { x.beginPath(); x.arc(Math.random() * 512, Math.random() * 256, 3, 0, 6.3); x.fill(); }
    return c;
  }

  async function mount(stage, opts) {
    opts = opts || {};
    if (!stage) return null;
    if (!webgl()) { stage.classList.add('is-fallback'); return null; }
    var THREE, RoomEnvironment, RoundedBoxGeometry;
    try {
      THREE = await import('three');
      RoomEnvironment = (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment;
      RoundedBoxGeometry = (await import('three/addons/geometries/RoundedBoxGeometry.js')).RoundedBoxGeometry;
    } catch (err) {
      console.warn('[EletroTEC] Three.js indisponível.', err);
      stage.classList.add('is-fallback');
      return null;
    }
    var reduce = !!opts.reduceMotion;
    var small = window.matchMedia('(max-width: 1023px)').matches;
    var logo = await loadImage('assets/img/logo-eletrotec.png');

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { stage.classList.add('is-fallback'); return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    var env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 6.4);
    var key = new THREE.DirectionalLight('#ffffff', 1.6); key.position.set(3, 4, 5);
    var rim = new THREE.DirectionalLight('#5cc8d6', 2.2); rim.position.set(-4, 2, -3);
    scene.add(key, rim);

    var W = 0.82, H = 1.7, R = 0.13;
    function rr(w, h, r) {
      var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    var disposables = [];
    var keep = function (o) { disposables.push(o); return o; };
    var parts = {};
    var root = new THREE.Group();
    scene.add(root);

    function part(name, z0, z1) {
      var g = new THREE.Group();
      g.userData = { z0: z0, z1: z1, glow: 0, target: 0, mats: [] };
      root.add(g);
      parts[name] = g;
      return g;
    }
    function glowMat(m) { m.emissive = new THREE.Color('#2fa8c8'); m.emissiveIntensity = 0; return m; }

    // Tela
    var screen = part('screen', 0.05, 0.78);
    var glass = new THREE.Mesh(keep(new THREE.ExtrudeGeometry(rr(W, H, R), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 12 })),
      keep(new THREE.MeshPhysicalMaterial({ color: '#05080c', roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 })));
    glass.position.z = -0.01;
    var tex = keep(new THREE.CanvasTexture(screenCanvas(logo)));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    var dispMat = keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    var display = new THREE.Mesh(keep(new THREE.PlaneGeometry(W - 0.05, H - 0.05)), dispMat);
    display.position.z = 0.0175;
    screen.add(glass, display);
    screen.userData.display = dispMat;

    // Moldura com conector
    var frame = part('frame', 0, 0.3);
    var ring = rr(W + 0.02, H + 0.02, R + 0.01);
    ring.holes.push(rr(W - 0.06, H - 0.06, R - 0.03));
    var frameMat = keep(glowMat(new THREE.MeshStandardMaterial({ color: '#a7b2bd', metalness: 1, roughness: 0.3 })));
    var frameMesh = new THREE.Mesh(keep(new THREE.ExtrudeGeometry(ring, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 14 })), frameMat);
    frameMesh.position.z = -0.045;
    frame.add(frameMesh);
    var portMat = keep(glowMat(new THREE.MeshStandardMaterial({ color: '#0c1118', metalness: 0.6, roughness: 0.4 })));
    var port = new THREE.Mesh(keep(new RoundedBoxGeometry(0.18, 0.045, 0.035, 3, 0.015)), portMat);
    port.position.set(0, -H / 2 + 0.005, -0.012);
    frame.add(port);
    var portBoard = part('port', -0.012, -0.02);
    var pbMat = keep(glowMat(new THREE.MeshStandardMaterial({ color: '#0b2a2e', roughness: 0.55, metalness: 0.25 })));
    var pb = new THREE.Mesh(keep(new THREE.BoxGeometry(W * 0.62, 0.2, 0.012)), pbMat);
    pb.position.y = -H / 2 + 0.16;
    portBoard.add(pb);
    portBoard.userData.mats = [pbMat, portMat];
    frame.userData.mats = [frameMat];

    // Placa principal
    var board = part('board', -0.01, -0.06);
    var btex = keep(new THREE.CanvasTexture(boardCanvas()));
    btex.colorSpace = THREE.SRGBColorSpace;
    var boardMat = keep(glowMat(new THREE.MeshStandardMaterial({ map: btex, roughness: 0.5, metalness: 0.3 })));
    var bmesh = new THREE.Mesh(keep(new THREE.BoxGeometry(W * 0.84, H * 0.3, 0.014)), boardMat);
    bmesh.position.y = H * 0.3;
    board.add(bmesh);
    var chipMat = keep(glowMat(new THREE.MeshStandardMaterial({ color: '#12161c', metalness: 0.5, roughness: 0.35 })));
    var canMat = keep(new THREE.MeshStandardMaterial({ color: '#c3ccd5', metalness: 1, roughness: 0.25 }));
    [[-0.18, H * 0.33, 0.2, 0.2, chipMat], [0.14, H * 0.36, 0.16, 0.11, chipMat], [0.12, H * 0.22, 0.26, 0.1, canMat], [-0.2, H * 0.19, 0.12, 0.08, chipMat]].forEach(function (c) {
      var m = new THREE.Mesh(keep(new RoundedBoxGeometry(c[2], c[3], 0.03, 2, 0.008)), c[4]);
      m.position.set(c[0], c[1], 0.02);
      board.add(m);
    });
    board.userData.mats = [boardMat, chipMat];

    // Bateria
    var battery = part('battery', -0.015, -0.4);
    var batMat = keep(glowMat(new THREE.MeshStandardMaterial({ color: '#1b232d', roughness: 0.55, metalness: 0.25 })));
    var bat = new THREE.Mesh(keep(new RoundedBoxGeometry(W * 0.68, H * 0.46, 0.05, 4, 0.03)), batMat);
    bat.position.y = -H * 0.08;
    var stripeMat = keep(new THREE.MeshStandardMaterial({ color: '#2fa8c8', emissive: '#2fa8c8', emissiveIntensity: 0.6, roughness: 0.4 }));
    var stripe = new THREE.Mesh(keep(new THREE.BoxGeometry(W * 0.5, 0.03, 0.052)), stripeMat);
    stripe.position.y = -H * 0.08 + H * 0.12;
    battery.add(bat, stripe);
    battery.userData.mats = [batMat];

    // Tampa traseira + câmeras
    var back = part('back', -0.045, -0.8);
    var backMat = keep(glowMat(new THREE.MeshPhysicalMaterial({ color: '#0e1823', metalness: 0.3, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 })));
    var backMesh = new THREE.Mesh(keep(new THREE.ExtrudeGeometry(rr(W, H, R), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 12 })), backMat);
    backMesh.position.z = -0.012;
    back.add(backMesh);
    var camMat = keep(new THREE.MeshPhysicalMaterial({ color: '#1a2633', metalness: 0.6, roughness: 0.25, clearcoat: 1 }));
    var cam = new THREE.Mesh(keep(new RoundedBoxGeometry(0.34, 0.34, 0.04, 4, 0.07)), camMat);
    cam.position.set(-W / 2 + 0.25, H / 2 - 0.25, -0.03);
    back.add(cam);
    var lensMat = keep(new THREE.MeshPhysicalMaterial({ color: '#020406', metalness: 0.9, roughness: 0.05, clearcoat: 1 }));
    var lensGeo = keep(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 32));
    [[-0.07, 0.07], [-0.07, -0.07], [0.07, 0]].forEach(function (p) {
      var l = new THREE.Mesh(lensGeo, lensMat);
      l.rotation.x = Math.PI / 2;
      l.position.set(cam.position.x + p[0], cam.position.y + p[1], -0.06);
      back.add(l);
    });
    back.userData.mats = [backMat];

    var state = { progress: 0, explode: 0, spin: 0, px: 0, py: 0, tx: 0, ty: 0, focus: 'screen' };
    var clock = new THREE.Clock(), running = false, disposed = false;

    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!running) draw(0);
    }
    var damp = function (a, b, k, dt) { return a + (b - a) * (1 - Math.pow(k, dt)); };

    function draw(dt) {
      var t = clock.elapsedTime;
      var targetExplode = reduce ? 1 : smooth((state.progress - 0.04) / 0.36);
      state.explode = damp(state.explode, targetExplode, 0.02, dt || 1);
      if (!reduce) state.spin += dt * 0.08;
      state.px = damp(state.px, state.tx, 0.04, dt || 1);
      state.py = damp(state.py, state.ty, 0.04, dt || 1);
      var e = state.explode;
      Object.keys(parts).forEach(function (name) {
        var p = parts[name], u = p.userData;
        u.glow = damp(u.glow, state.focus === name ? 1 : 0, 0.01, dt || 1);
        var extra = u.glow * (u.z1 >= 0 ? 0.14 : -0.14) * e;
        p.position.z = u.z0 + (u.z1 - u.z0) * e + extra;
        u.mats.forEach(function (m) { m.emissiveIntensity = u.glow * 0.55; });
      });
      if (parts.screen.userData.display) parts.screen.userData.display.color.setScalar(0.85 + 0.15 * parts.screen.userData.glow);
      root.rotation.y = -0.2 - 0.85 * e + Math.sin(state.spin) * 0.12 + state.px * 0.3;
      root.rotation.x = 0.08 + 0.32 * e + state.py * 0.18;
      root.rotation.z = -0.06 * e;
      root.position.y = reduce ? 0 : Math.sin(t * 0.7) * 0.04;
      var sc = 1 - 0.14 * e;
      root.scale.setScalar(sc);
      renderer.render(scene, camera);
    }
    function frameLoop() { draw(Math.min(clock.getDelta(), 0.05)); }
    function setRunning(v) {
      if (disposed) return;
      if (reduce) { draw(0); return; }
      if (v === running) return;
      running = v;
      if (v) clock.getDelta();
      renderer.setAnimationLoop(v ? frameLoop : null);
    }
    var inView = false;
    var io = new IntersectionObserver(function (en) { inView = en[0].isIntersecting; setRunning(inView && !document.hidden); }, { rootMargin: '120px 0px' });
    io.observe(stage);
    var onVis = function () { setRunning(inView && !document.hidden); };
    document.addEventListener('visibilitychange', onVis);
    var ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    var section = stage.closest('section') || stage;
    var onMove = function (ev) {
      var r = stage.getBoundingClientRect();
      state.tx = clamp(((ev.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      state.ty = clamp(((ev.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    };
    var onLeave = function () { state.tx = 0; state.ty = 0; };
    if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      section.addEventListener('pointermove', onMove, { passive: true });
      section.addEventListener('pointerleave', onLeave);
    }
    renderer.domElement.addEventListener('webglcontextlost', function (ev) {
      ev.preventDefault(); setRunning(false); stage.classList.remove('is-ready'); stage.classList.add('is-fallback');
    });
    draw(0);
    requestAnimationFrame(function () { stage.classList.add('is-ready'); });

    function dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
      disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
      env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
    }
    window.addEventListener('pagehide', function (ev) { if (!ev.persisted) dispose(); });

    return {
      focus: function (name) { state.focus = parts[name] ? name : 'screen'; if (reduce) draw(0); },
      setProgress: function (p) { state.progress = p; if (reduce) draw(0); },
      dispose: dispose,
    };
  }

  window.PhoneScene = { mount: mount };
})();
