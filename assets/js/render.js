/* ==========================================================================
   ELETROTEC — Renderização: lê window.SITE_CONFIG e preenche o HTML
   ========================================================================== */
(function () {
  'use strict';

  var C = window.SITE_CONFIG;
  if (!C) { console.warn('[EletroTEC] config.js não carregado.'); return; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var get = function (path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, C); };
  var use = function (id) { return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-' + id + '"></use></svg>'; };
  var ext = ' target="_blank" rel="noopener"';
  var A = C.address;

  /* Links ----------------------------------------------------------------- */
  var Links = {
    wa: function (msg) { return 'https://wa.me/' + C.contact.whatsapp.number + '?text=' + encodeURIComponent(msg); },
    general: function () { return Links.wa(C.messages.general); },
    service: function (s) { return Links.wa(C.messages.service.replace('{servico}', s.topic || s.name.toLowerCase())); },
    place: function () {
      return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Eletro Tec') +
        (A.placeId ? '&query_place_id=' + A.placeId : '');
    },
    route: function () {
      return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('Eletro Tec') +
        (A.placeId ? '&destination_place_id=' + A.placeId : '');
    },
    embed: function () { return 'https://maps.google.com/maps?q=' + encodeURIComponent(A.mapsQuery) + '&z=17&hl=pt-BR&output=embed'; },
  };
  window.SiteLinks = Links;

  var streetLine = function () { return [A.street, A.complement].filter(Boolean).join(' – '); };
  var cityLine = function () { return [A.district, A.city + ' – ' + A.state].filter(Boolean).join(', '); };

  /* Horários e status "aberto agora" --------------------------------------- */
  var DAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var toMin = function (t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; };
  var fmt = function (m) { var h = Math.floor(m / 60), mm = m % 60; return h + 'h' + (mm ? pad(mm) : ''); };
  function nowBR() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    var val = function (t) { return (parts.find(function (p) { return p.type === t; }) || {}).value; };
    var h = +val('hour'); if (h === 24) h = 0;
    return { day: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[val('weekday')], minutes: h * 60 + +val('minute') };
  }
  function rangeFor(day) {
    var r = (C.hours || []).find(function (h) { return h.days.indexOf(day) >= 0; });
    if (!r || r.closed) return null;
    return { open: toMin(r.open), close: toMin(r.close) };
  }
  function openStatus() {
    if (!C.hours || !C.hours.length) return null;
    var n = nowBR(), today = rangeFor(n.day);
    if (today && n.minutes >= today.open && n.minutes < today.close) return { open: true, text: 'Aberto agora · fecha às ' + fmt(today.close) };
    if (today && n.minutes < today.open) return { open: false, text: 'Fechado · abre hoje às ' + fmt(today.open) };
    for (var k = 1; k <= 7; k++) {
      var d = (n.day + k) % 7, r = rangeFor(d);
      if (r) return { open: false, text: 'Fechado · abre ' + (k === 1 ? 'amanhã' : DAYS[d]) + ' às ' + fmt(r.open) };
    }
    return null;
  }
  function updateStatus() {
    var st = openStatus();
    $$('[data-status]').forEach(function (el) {
      if (!st) { el.hidden = true; return; }
      el.classList.toggle('is-open', st.open);
      el.classList.toggle('is-closed', !st.open);
      var t = $('[data-status-text]', el);
      if (t) t.textContent = st.text;
    });
  }

  function hoursHtml(compact) {
    var today = nowBR().day;
    var rows = (C.hours || []).map(function (h) {
      var isToday = h.days.indexOf(today) >= 0;
      var time = h.closed ? 'Fechado' : fmt(toMin(h.open)) + ' às ' + fmt(toMin(h.close));
      return compact
        ? esc(h.label) + ': ' + esc(time)
        : '<div class="hours__row' + (isToday ? ' is-today' : '') + '"><span>' + esc(h.label) + '</span><span>' + esc(time) + '</span></div>';
    });
    if (compact) return rows.join('<br>');
    return '<div class="hours">' + rows.join('') + (C.hoursNote ? '<p class="hours__note">' + esc(C.hoursNote) + '</p>' : '') + '</div>';
  }

  /* Ícones ----------------------------------------------------------------- */
  var TIP_ICONS = {
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
    plug: '<path d="M9 2v5M15 2v5M7 7h10v4a5 5 0 0 1-10 0V7ZM12 16v6"/>',
    flame: '<path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8Z"/>',
    turtle: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17-3.5-4"/><path d="M12 9v1M7 11l.7.7M17 11l-.7.7"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  };
  var ART = {
    scan: '<rect class="draw" x="30" y="10" width="46" height="84" rx="9"/><path class="draw" d="M47 18h12"/><circle class="draw" cx="74" cy="72" r="19"/><path class="draw" d="m88 86 16 16"/><rect class="glow" x="64" y="68" width="20" height="3" rx="1.5"/>',
    shield: '<path class="draw" d="M60 10l38 14v30c0 24-16 41-38 52-22-11-38-28-38-52V24Z"/><path class="draw" d="m42 58 12 12 24-26"/><circle class="glow" cx="60" cy="24" r="3"/>',
    bolt: '<circle class="draw" cx="60" cy="66" r="38"/><path class="draw" d="M50 12h20M60 12v16"/><path class="draw" d="M65 42 48 70h14l-5 22 19-30H62l3-20Z"/>',
    chat: '<path class="draw" d="M16 26h56a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8H42L26 80V68h-10a8 8 0 0 1-8-8V34a8 8 0 0 1 8-8Z"/><path class="draw" d="M88 46h12a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8h-6v12L82 86H66a8 8 0 0 1-8-8v-4"/><circle class="glow" cx="30" cy="47" r="3.2"/><circle class="glow" cx="44" cy="47" r="3.2"/><circle class="glow" cx="58" cy="47" r="3.2"/>',
  };

  /* Blocos ----------------------------------------------------------------- */
  function bind() {
    $$('[data-wa]').forEach(function (a) { a.href = Links.general(); a.target = '_blank'; a.rel = 'noopener'; });
    $$('[data-maps-route]').forEach(function (a) { a.href = Links.route(); });
    $$('[data-maps-reviews]').forEach(function (a) { a.href = Links.place(); });
    $$('[data-instagram]').forEach(function (a) { if (C.contact.instagram) a.href = C.contact.instagram.url; else a.remove(); });
    $$('[data-bind]').forEach(function (el) { var v = get(el.getAttribute('data-bind')); if (v != null && v !== '') el.textContent = v; });
    var R = C.rating;
    $$('[data-rating]').forEach(function (el) { if (!R) el.remove(); });
    if (R) {
      $$('[data-rating-value]').forEach(function (el) { el.textContent = R.value; });
      $$('[data-rating-count]').forEach(function (el) { el.textContent = R.count; });
      $$('[data-rating-checked]').forEach(function (el) { el.textContent = 'consultado em ' + R.checkedAt; });
    }
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  function marquee() {
    var track = $('[data-marquee-track]');
    if (!track) return;
    var words = ['Celulares', 'Notebooks', 'Videogames', 'Acessórios'].concat(C.services.slice(0, 4).map(function (s) { return s.name; }));
    var chunk = '<span>' + words.map(function (w) { return esc(w) + '<b></b>'; }).join('') + '</span>';
    track.innerHTML = chunk + chunk;
  }

  function specs() {
    var dl = $('[data-render="specs"]');
    if (!dl) return;
    var R = C.rating, items = [];
    if (R) {
      items.push(['Nota no ' + R.source, R.value]);
      items.push(['Avaliações', String(R.count)]);
    }
    items.push(['Avaliação do aparelho', 'Grátis']);
    dl.innerHTML = items.map(function (i) { return '<div class="spec"><dt>' + esc(i[0]) + '</dt><dd>' + esc(i[1]) + '</dd></div>'; }).join('');
  }

  function services() {
    var list = $('[data-render="services"]');
    if (!list) return;
    list.setAttribute('role', 'list');
    list.innerHTML = C.services.map(function (s, i) {
      return '<li class="svc' + (i === 0 ? ' is-active' : '') + '" data-svc-index="' + i + '">' +
        '<button class="svc__btn" type="button" id="svc-btn-' + i + '" aria-controls="svc-panel-' + i + '" aria-expanded="false">' +
        '<span class="svc__num">' + pad(i + 1) + '</span><span class="svc__name">' + esc(s.name) + '</span><span class="svc__led" aria-hidden="true"></span></button>' +
        '<div class="svc__panel" id="svc-panel-' + i + '"><div><div class="svc__panel-inner"><p>' + esc(s.description) + '</p>' +
        '<a class="link-arrow" href="' + Links.service(s) + '"' + ext + '><span>Pedir orçamento</span>' + use('arrow') + '</a>' +
        '</div></div></div></li>';
    }).join('');
  }

  function differentials() {
    var box = $('[data-render="differentials"]');
    if (!box) return;
    box.innerHTML = (C.differentials || []).map(function (d, i) {
      return '<article class="bento__card" data-anim="fade-up">' +
        '<span class="bento__num">' + pad(i + 1) + '</span>' +
        '<span class="bento__art" aria-hidden="true"><svg viewBox="0 0 120 120">' + (ART[d.icon] || '') + '</svg></span>' +
        '<h3>' + esc(d.title) + '</h3><p>' + esc(d.text) + '</p></article>';
    }).join('');
  }

  function steps() {
    var list = $('[data-render="steps"]');
    if (!list) return;
    list.setAttribute('role', 'list');
    list.innerHTML = (C.steps || []).map(function (s, i) {
      return '<li class="step"><span class="step__node" aria-hidden="true"></span>' +
        '<span class="step__num" aria-hidden="true">' + pad(i + 1) + '</span>' +
        '<h3 class="step__title"><span class="sr-only">Etapa ' + (i + 1) + ': </span>' + esc(s.title) + '</h3>' +
        '<p class="step__text">' + esc(s.text) + '</p></li>';
    }).join('');
  }

  function reviews() {
    var R = C.reviews;
    var section = $('[data-render-if="reviews"]');
    if (!R || !R.enabled || !R.items || !R.items.length) { if (section) section.remove(); return; }
    var tags = $('[data-render="review-tags"]');
    if (tags) tags.innerHTML = (R.tags || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    var list = $('[data-render="reviews"]');
    if (list) {
      list.innerHTML = R.items.map(function (r) {
        return '<li class="review" data-anim="fade-up"><blockquote><p>“' + esc(r.text) + '”</p>' +
          '<footer><span class="stars" aria-label="5 estrelas">★★★★★</span><cite>' + esc(r.author) + '</cite> · Google</footer></blockquote></li>';
      }).join('');
    }
  }

  function tips() {
    var list = $('[data-render="tips"]');
    if (!list) return;
    list.innerHTML = (C.tips || []).map(function (t, i) {
      return '<li class="tip" data-anim="fade-up"><span class="tip__icon" aria-hidden="true"><svg viewBox="0 0 24 24">' + (TIP_ICONS[t.icon] || '') + '</svg></span>' +
        '<span class="tip__num" aria-hidden="true">#' + pad(i + 1) + '</span>' +
        '<h3>' + esc(t.title) + '</h3><p>' + esc(t.text) + '</p></li>';
    }).join('');
  }

  function faqAnswer(text) {
    var wa = C.contact.whatsapp, ig = C.contact.instagram;
    return esc(text)
      .replace(/\{whatsapp\}/g, wa ? '<a href="' + Links.general() + '"' + ext + '>' + esc(wa.display) + '</a>' : '')
      .replace(/\{instagram\}/g, ig ? '<a href="' + esc(ig.url) + '"' + ext + '>' + esc(ig.handle) + '</a>' : '')
      .replace(/\{endereco\}/g, esc(streetLine() + ', ' + cityLine()))
      .replace(/\{horarios\}/g, hoursHtml(true).replace(/<br>/g, '; ') + '.');
  }

  function faq() {
    var box = $('[data-render="faq"]');
    if (!box) return;
    var items = C.faq || [];
    box.innerHTML = items.map(function (f, i) {
      return '<div class="faq-item" data-anim="fade-up"><h3>' +
        '<button class="faq-item__btn" type="button" id="faq-btn-' + i + '" aria-expanded="false" aria-controls="faq-panel-' + i + '">' +
        '<span>' + esc(f.q) + '</span><span class="faq-item__icon" aria-hidden="true"></span></button></h3>' +
        '<div class="faq-item__panel" id="faq-panel-' + i + '" role="region" aria-labelledby="faq-btn-' + i + '"><div><p>' + faqAnswer(f.a) + '</p></div></div></div>';
    }).join('');
    var tmp = document.createElement('div');
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(function (f) {
        tmp.innerHTML = faqAnswer(f.a);
        return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: tmp.textContent } };
      }),
    });
    document.head.appendChild(s);
  }

  function channels(withIcons) {
    var c = C.contact, out = [];
    if (c.whatsapp) out.push('<li><a href="' + Links.general() + '"' + ext + '>' + (withIcons ? use('whatsapp') : '') + '<span>WhatsApp ' + esc(c.whatsapp.display) + '</span></a></li>');
    if (c.instagram) out.push('<li><a href="' + esc(c.instagram.url) + '"' + ext + '>' + (withIcons ? use('instagram') : '') + '<span>Instagram ' + esc(c.instagram.handle) + '</span></a></li>');
    if (c.facebook) out.push('<li><a href="' + esc(c.facebook.url) + '"' + ext + '>' + (withIcons ? use('facebook') : '') + '<span>Facebook ' + esc(c.facebook.label) + '</span></a></li>');
    if (c.email) out.push('<li><a href="mailto:' + esc(c.email) + '"><span>' + esc(c.email) + '</span></a></li>');
    return out.join('');
  }

  function contact() {
    var addr = $('[data-render="address"]');
    if (addr) addr.innerHTML = esc(streetLine()) + '<br>' + esc(cityLine()) + '<br>CEP ' + esc(A.zip);
    var hours = $('[data-render="hours"]');
    if (hours) hours.innerHTML = hoursHtml(false);
    var ch = $('[data-render="channels"]');
    if (ch) ch.innerHTML = channels(true);
    var fch = $('[data-render="footer-channels"]');
    if (fch) fch.innerHTML = channels(true);
    var fad = $('[data-render="footer-address"]');
    if (fad) fad.innerHTML = esc(streetLine()) + '<br>' + esc(cityLine());
    var fh = $('[data-render="footer-hours"]');
    if (fh) fh.innerHTML = hoursHtml(true);
  }

  window.SiteRender = {
    init: function () {
      marquee();
      specs();
      services();
      differentials();
      steps();
      reviews();
      tips();
      faq();
      contact();
      bind();
      updateStatus();
      setInterval(updateStatus, 60000);
    },
  };
})();
