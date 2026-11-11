/* ==========================================================================
   Team Noel-Willockx · gedrag
   Inhoud staat in data.js (window.NW_DATA), het oog in oog.js (window.NWOog).
   Dit bestand tekent de inhoud en regelt beweging. Elk onderdeel start
   alleen als zijn element op de pagina staat.
   ========================================================================== */
(function () {
  'use strict';

  var D = window.NW_DATA || { lijnen: [], duiven: [], nieuws: [], lossingen: [], uitslagen: {} };
  var Oog = window.NWOog;
  var root = document.documentElement;
  var ANIM = root.classList.contains('anim');
  var GS = ANIM && window.gsap && window.ScrollTrigger;
  var FIJN = window.matchMedia && matchMedia('(pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var breed = function () { return window.innerWidth >= 900; };
  var lenis = null;

  if (GS) gsap.registerPlugin(ScrollTrigger);

  /* ---------- hulpjes ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function getal(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function euro(n) { return '€ ' + getal(n); }
  function hoofd(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function vind(lijst, id) { for (var i = 0; i < lijst.length; i++) if (lijst[i].id === id) return lijst[i]; return null; }
  var lijnVan = function (id) { return vind(D.lijnen, id); };
  var duifVan = function (id) { return vind(D.duiven, id); };
  var PIJL = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
  function palmHTML(p) {
    var d = String(p).split(' · ');
    return '<li><span>' + esc(d[0]) + '</span>' + (d[1] ? '<span class="veld">' + esc(d[1]) + '</span>' : '') + '</li>';
  }
  var MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  /* ==========================================================================
     Tekst opsplitsen in woorden (koppen) en letters (voetwoord)
     ========================================================================== */
  function splits(el) {
    if (el.__gesplitst) return; el.__gesplitst = true;
    var nodes = Array.prototype.slice.call(el.childNodes), i = 0, woord = null;
    el.textContent = '';
    function nieuw() {
      var w = document.createElement('span'); w.className = 'w';
      var wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++);
      w.appendChild(wi); el.appendChild(w); return wi;
    }
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (deel) {
          if (!deel) return;
          if (/^\s+$/.test(deel)) { el.appendChild(document.createTextNode(' ')); woord = null; return; }
          if (!woord) woord = nieuw();
          woord.appendChild(document.createTextNode(deel));
        });
      } else if (n.nodeName === 'BR') { el.appendChild(n); woord = null; }
      else { if (!woord) woord = nieuw(); woord.appendChild(n); }
    });
  }

  /* ==========================================================================
     Verschijnen bij scrollen
     ========================================================================== */
  var kijker = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      kijker.unobserve(e.target);
      if (e.target.__bij) e.target.__bij();
    });
  }, { rootMargin: '0px 0px -10% 0px' }) : null;

  function bekijk(el) {
    if (!el) return;
    if (!ANIM || !kijker) { el.classList.add('is-in'); if (el.__bij) el.__bij(); return; }
    kijker.observe(el);
  }
  function startVerschijnen(binnen) {
    $$('[data-split]', binnen).forEach(splits);
    // stapsgewijs: broers en zussen met data-in na elkaar
    var groepen = new Map();
    $$('[data-in]', binnen).forEach(function (el) {
      if (el.closest('.held, .pkop')) return;
      var p = el.parentNode, n = groepen.get(p) || 0;
      el.style.setProperty('--d', Math.min(n, 6) * 90 + 'ms'); groepen.set(p, n + 1);
    });
    $$('[data-split], [data-in], .lat, .anatomie-fig, .voet-woord, .jaar li', binnen).forEach(function (el) {
      if (el.closest('.held, .pkop')) return;
      bekijk(el);
    });
  }

  /* koppen bovenaan: na het openen van het oog */
  function startKop(sec, vertraging) {
    if (!sec) return;
    $$('[data-split]', sec).forEach(function (el) { splits(el); el.style.setProperty('--start', vertraging + 'ms'); });
    $$('[data-in]', sec).forEach(function (el, i) { el.style.setProperty('--d', vertraging + 500 + i * 130 + 'ms'); });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        sec.classList.add('is-open');
        $$('[data-split], [data-in]', sec).forEach(function (el) { el.classList.add('is-in'); });
      });
    });
  }

  /* ==========================================================================
     Het oog in de kop van de homepage
     ========================================================================== */
  var muis = { x: -1, y: -1 };
  window.addEventListener('pointermove', function (e) { muis.x = e.clientX; muis.y = e.clientY; volg(); }, { passive: true });
  var volgers = [];
  function volg() {
    volgers.forEach(function (o) {
      var r = o.c.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
      var p = o.plaats(o.w, o.h);
      var kx = (muis.x - (r.left + p.x)) / (window.innerWidth * 0.45);
      var ky = (muis.y - (r.top + p.y)) / (window.innerHeight * 0.45);
      o.zet({ kx: Math.max(-1, Math.min(1, kx)), ky: Math.max(-1, Math.min(1, ky)) });
    });
  }

  function startHeld() {
    var held = $('#held'), c = $('#heldOog'); if (!held || !c || !Oog) return;
    function plaats(w, h) {
      if (w < 900) return { x: w * 0.56, y: h * 0.27, r: Math.min(w * 0.3, h * 0.17) };
      return { x: w * 0.7, y: h * 0.47, r: Math.min(h * 0.29, w * 0.19) };
    }
    var S = { intro: ANIM ? 3.4 : 0.3, scroll: 0, wijd: 0 };
    var oog = new Oog(c, { zaad: 'BE18-6032210', kleur: 'oranje', klok: true, pupil: S.intro, plaats: plaats }).start();
    volgers.push(oog);
    function bij() {
      var p = plaats(oog.w, oog.h), s = S.scroll;
      oog.zet({
        pupil: S.intro + S.wijd * 0.09 + Math.pow(s, 2.3) * 5.2,
        schaal: 1 + s * 1.1,
        dx: (0.5 - p.x / oog.w) * s,
        dy: (0.5 - p.y / oog.h) * s,
        licht: Math.max(0, 1 - s * 1.8)
      });
    }
    // het oog gaat open: de pupil trekt samen van zwart naar rust
    if (ANIM) {
      var t = { v: S.intro };
      var open = function () {
        if (window.gsap) gsap.to(t, { v: 0.3, duration: 2.6, ease: 'expo.out', onUpdate: function () { S.intro = t.v; bij(); } });
        else { S.intro = 0.3; bij(); }
        startKop(held, 650);
      };
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(open, 150); });
    } else startKop(held, 0);

    $$('[data-wijd]', held).forEach(function (a) {
      a.addEventListener('pointerenter', function () { S.wijd = 1; bij(); });
      a.addEventListener('pointerleave', function () { S.wijd = 0; bij(); });
    });

    // scrollen: de camera duikt de pupil in, die wordt de nacht van de volgende sectie
    if (GS) {
      var tekst = $$('.held-in, .held-klok, .held-scroll, .held-bijschrift', held);
      ScrollTrigger.create({
        trigger: held, start: 'top top', end: '+=115%', pin: true, scrub: true, anticipatePin: 1,
        onUpdate: function (st) {
          S.scroll = st.progress; bij();
          tekst.forEach(function (el) { el.style.opacity = Math.max(0, 1 - st.progress * 2.2); el.style.translate = '0 ' + (-st.progress * 90) + 'px'; });
        }
      });
    }

    var klok = $('#klok');
    if (klok) {
      var tik = function () { var d = new Date(); klok.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return n < 10 ? '0' + n : n; }).join(':'); };
      tik(); setInterval(tik, 1000);
    }
  }

  /* paginakoppen: elk een eigen oog dat opengaat */
  function startPkop() {
    var sec = $('.pkop'); if (!sec) return;
    var c = $('.pkop-oog', sec);
    if (c && Oog) {
      var plaats = function (w, h) {
        if (w < 900) return { x: w * 0.66, y: h * 0.26, r: Math.min(w * 0.34, h * 0.17) };
        return { x: w * 0.75, y: h * 0.5, r: Math.min(h * 0.3, w * 0.19) };
      };
      var oog = new Oog(c, { zaad: c.getAttribute('data-zaad'), kleur: c.getAttribute('data-kleur'), klok: c.hasAttribute('data-klok'), pupil: ANIM ? 3 : 0.3, plaats: plaats }).start();
      volgers.push(oog);
      if (ANIM && window.gsap) {
        var t = { v: 3 };
        gsap.to(t, { v: 0.3, duration: 2.2, delay: 0.15, ease: 'expo.out', onUpdate: function () { oog.zet({ pupil: t.v }); } });
      }
      if (GS) ScrollTrigger.create({
        trigger: sec, start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: function (st) { oog.zet({ schaal: 1 + st.progress * 0.35, licht: 1 - st.progress, dy: st.progress * 0.12 }); }
      });
    }
    startKop(sec, ANIM ? 450 : 0);
  }

  /* het oog naast de uitnodiging: kijkt naar je, en wordt groter als je wil komen */
  function startUitnodiging() {
    $$('.uitnodiging').forEach(function (sec, n) {
      var c = $('.uitnodiging-oog', sec); if (!c || !Oog) return;
      var oog = new Oog(c, {
        zaad: 'BE19-6077154' + n, kleur: 'rood',
        plaats: function (w, h) { return w < 900 ? { x: w * 0.86, y: h * 0.16, r: w * 0.2 } : { x: w * 0.8, y: h * 0.5, r: Math.min(h * 0.26, w * 0.15) }; }
      }).start();
      volgers.push(oog);
      var k = $('.knop', sec);
      if (k) {
        k.addEventListener('pointerenter', function () { oog.zet({ pupil: 0.5 }); });
        k.addEventListener('pointerleave', function () { oog.zet({ pupil: 0.3 }); });
      }
    });
  }

  /* ==========================================================================
     Manifest: woorden lichten op terwijl je leest
     ========================================================================== */
  function startManifest() {
    var el = $('[data-scrub]'); if (!el) return;
    if (!GS) return;
    var woorden = [];
    el.innerHTML = el.textContent.split(/\s+/).map(function (w) { return '<span class="sw">' + esc(w) + '</span>'; }).join(' ');
    woorden = $$('.sw', el);
    ScrollTrigger.create({
      trigger: el, start: 'top 82%', end: 'bottom 42%', scrub: true,
      onUpdate: function (st) {
        var n = st.progress * woorden.length;
        woorden.forEach(function (w, i) { w.style.opacity = Math.max(0.14, Math.min(1, n - i + 0.6)); });
      }
    });
  }

  /* tellers */
  function startTellers() {
    $$('[data-tel]').forEach(function (el) {
      var doel = +el.getAttribute('data-tel');
      if (!ANIM) return;
      el.textContent = '0';
      var ouder = el.closest('[data-in]') || el;
      var oud = ouder.__bij;
      ouder.__bij = function () {
        if (oud) oud();
        var t0 = performance.now(), duur = 2000;
        (function stap(t) {
          var p = Math.min(1, (t - t0) / duur), e = 1 - Math.pow(1 - p, 4);
          el.textContent = getal(Math.round(doel * e));
          if (p < 1) requestAnimationFrame(stap);
        })(t0);
      };
    });
  }

  /* ==========================================================================
     Bloedlijnen
     ========================================================================== */
  function vrijUit(id) { return D.duiven.filter(function (d) { return d.lijn === id && d.status !== 'verkocht'; }); }
  function oogOp(c, opt) {
    if (!Oog || !c) return null;
    return new Oog(c, opt).start();
  }

  function startLijnenSpoor() {
    var spoor = $('#lijnSpoor'); if (!spoor) return;
    spoor.innerHTML = D.lijnen.map(function (l, i) {
      var vrij = vrijUit(l.id).length;
      return '<article class="paneel" aria-labelledby="pl-' + l.id + '">' +
        '<div class="paneel-oog"><canvas data-zaad="' + esc(l.ring) + '" data-kleur="' + esc(l.oog) + '" aria-hidden="true"></canvas><span class="paneel-ring mono">' + esc(l.ring) + ' · oog ' + esc(l.oog) + '</span></div>' +
        '<div class="paneel-tekst"><p class="paneel-nr mono"><b>0' + (i + 1) + '</b><span>' + esc(l.discipline) + '</span><span>' + (l.geslacht === 'duivin' ? 'Stamduivin' : 'Stamdoffer') + '</span></p>' +
        '<h3 id="pl-' + l.id + '">' + esc(l.naam) + '</h3><p class="paneel-intro">' + esc(l.intro) + '</p>' +
        '<ul class="palmares">' + l.palmares.map(palmHTML).join('') + '</ul>' +
        '<a class="pijl" href="bloedlijnen.html#lijn-' + l.id + '">' + (vrij ? vrij + (vrij === 1 ? ' duif' : ' duiven') + ' te koop uit deze lijn' : 'Ontdek deze lijn') + '</a></div></article>';
    }).join('');
    $$('canvas', spoor).forEach(function (c) {
      var o = oogOp(c, { zaad: c.getAttribute('data-zaad'), kleur: c.getAttribute('data-kleur'), plaats: function (w, h) { return { x: w / 2, y: h / 2, r: Math.min(w, h) * 0.34 }; } });
      if (o) volgers.push(o);
    });
    var nu = $('#lijnNu'), balk = $('#lijnBalk'), sec = $('#lijnen');
    if (GS) {
      ScrollTrigger.matchMedia({
        '(min-width: 900px)': function () {
          sec.classList.add('is-spoor');
          var afstand = function () { return Math.max(0, spoor.scrollWidth - window.innerWidth); };
          var tw = gsap.to(spoor, {
            x: function () { return -afstand(); }, ease: 'none',
            scrollTrigger: {
              trigger: sec, start: 'top top', end: function () { return '+=' + afstand(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
              onUpdate: function (st) {
                if (balk) balk.style.transform = 'scaleX(' + (0.25 + st.progress * 0.75) + ')';
                if (nu) nu.textContent = '0' + Math.min(D.lijnen.length, Math.floor(st.progress * D.lijnen.length * 0.999) + 1);
              }
            }
          });
          return function () { sec.classList.remove('is-spoor'); tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); gsap.set(spoor, { clearProps: 'x' }); };
        }
      });
    }
  }

  function startStamlijnen() {
    var el = $('#lijnList'); if (!el) return;
    el.innerHTML = D.lijnen.map(function (l, i) {
      var vrij = vrijUit(l.id);
      return '<article class="stamlijn donker" id="lijn-' + l.id + '" aria-labelledby="sl-' + l.id + '"><div class="omslag stamlijn-in">' +
        '<div class="stamlijn-oog"><canvas data-zaad="' + esc(l.ring) + '" data-kleur="' + esc(l.oog) + '" aria-hidden="true"></canvas><span class="mono">' + esc(l.ring) + ' · oog ' + esc(l.oog) + '</span></div>' +
        '<div><p class="paneel-nr mono" data-in><b>0' + (i + 1) + ' / 0' + D.lijnen.length + '</b><span>' + esc(l.discipline) + '</span><span>' + (l.geslacht === 'duivin' ? 'Stamduivin' : 'Stamdoffer') + '</span></p>' +
        '<h2 id="sl-' + l.id + '" data-split>' + esc(l.naam) + '</h2>' +
        '<p class="paneel-intro" data-in>' + esc(l.intro) + '</p>' +
        '<ul class="palmares" data-in>' + l.palmares.map(palmHTML).join('') + '</ul>' +
        '<div class="stamlijn-koop"><h3 class="label mono">Nu te koop uit deze lijn</h3>' +
        (vrij.length ? '<div class="duiven">' + vrij.map(kaartHTML).join('') + '</div>' : '<p class="stamlijn-leeg">Op dit moment niets beschikbaar. <a class="pijl" href="contact.html?onderwerp=wachtlijst">Zet je op de wachtlijst</a></p>') +
        '</div></div></div></article>';
    }).join('');
    $$('.stamlijn-oog canvas', el).forEach(function (c) {
      var o = oogOp(c, { zaad: c.getAttribute('data-zaad'), kleur: c.getAttribute('data-kleur'), plaats: function (w, h) { return { x: w / 2, y: h / 2, r: Math.min(w, h) * 0.34 }; } });
      if (o) volgers.push(o);
    });
    startKaarten(el);
    if (location.hash) { var doel = $(location.hash); if (doel) setTimeout(function () { naar(doel); }, 60); }
  }

  /* ==========================================================================
     Duiven: kaarten, filters, dialoog
     ========================================================================== */
  function kaartHTML(d) {
    var weg = d.status === 'verkocht', lijn = lijnVan(d.lijn);
    var tag = d.status === 'nieuw' ? '<span class="tag">Nieuw</span>' : weg ? '<span class="tag is-verkocht">Verkocht</span>' : '';
    var beeld = d.foto ? '<img src="' + esc(d.foto) + '" alt="" loading="lazy">' : '<canvas data-zaad="' + esc(d.ring) + '" data-kleur="' + esc(d.oog) + '" aria-hidden="true"></canvas>';
    return '<article class="duif' + (weg ? ' is-verkocht' : '') + '" data-in>' +
      '<div class="duif-plaat">' + beeld + tag + '<p class="duif-kijk mono"><span>Oog ' + esc(d.oog) + '</span><span>Bekijk stamboom</span></p></div>' +
      '<div class="duif-kop"><h3><button class="duif-open" type="button" data-duif="' + esc(d.id) + '">' + esc(d.naam) + '</button></h3></div>' +
      '<p class="duif-meta mono"><span>' + esc(d.ring) + '</span><span>' + hoofd(d.geslacht) + '</span>' + (lijn ? '<span>Lijn ' + esc(lijn.naam) + '</span>' : '') + '</p>' +
      '<p class="duif-afst">' + esc(d.afstamming) + '</p>' +
      '<div class="duif-voet"><p class="prijs">' + (weg ? 'Verkocht' : euro(d.prijs)) + '</p><span class="duif-pijl">' + PIJL + '</span></div></article>';
  }
  function startKaarten(binnen) {
    $$('.duif', binnen).forEach(function (k) {
      var c = $('canvas', k); if (!c || c.__oog) return;
      var o = oogOp(c, { zaad: c.getAttribute('data-zaad'), kleur: c.getAttribute('data-kleur'), leeft: false, plaats: function (w, h) { return { x: w / 2, y: h * 0.45, r: w * 0.29 }; } });
      if (!o) return;
      k.addEventListener('pointerenter', function () { o.zet({ pupil: 0.17, draai: 0.35 }); });
      k.addEventListener('pointerleave', function () { o.zet({ pupil: 0.3, draai: 0 }); });
    });
    startVerschijnen(binnen);
  }

  var rang = function (d) { return d.status === 'verkocht' ? 2 : d.status === 'nieuw' ? 0 : 1; };
  var nieuwsteEerst = function (a, b) { return rang(a) - rang(b) || b.ring.localeCompare(a.ring); };

  function startKoop() {
    var uit = $('#uitgelicht');
    if (uit) {
      uit.innerHTML = D.duiven.filter(function (d) { return d.status !== 'verkocht'; }).sort(nieuwsteEerst).slice(0, +uit.getAttribute('data-max') || 4).map(kaartHTML).join('');
      startKaarten(uit);
    }
    var lijst = $('#duiven'), form = $('#filters');
    if (!lijst || !form) return;
    D.lijnen.forEach(function (l) { var o = document.createElement('option'); o.value = l.id; o.textContent = l.naam; $('#fLijn').appendChild(o); });
    function teken() {
      var g = form.elements.geslacht.value, l = form.elements.lijn.value, s = form.elements.sort.value;
      var r = D.duiven.filter(function (d) { return (!g || d.geslacht === g) && (!l || d.lijn === l); });
      r.sort(function (a, b) {
        var v = rang(a) === 2 ? 1 : 0, w = rang(b) === 2 ? 1 : 0;
        if (v !== w) return v - w;
        if (s === 'laag') return a.prijs - b.prijs;
        if (s === 'hoog') return b.prijs - a.prijs;
        return nieuwsteEerst(a, b);
      });
      lijst.innerHTML = r.map(kaartHTML).join('');
      startKaarten(lijst);
      var vrij = r.filter(function (d) { return d.status !== 'verkocht'; }).length;
      $('#fCount').textContent = vrij + (vrij === 1 ? ' duif' : ' duiven') + ' beschikbaar';
      $('#duivenLeeg').hidden = r.length > 0;
      if (GS) ScrollTrigger.refresh();
    }
    form.addEventListener('change', teken);
    $('#fReset').addEventListener('click', function () { form.reset(); teken(); });
    teken();
    var q = new URLSearchParams(location.search).get('duif');
    if (q && duifVan(q)) setTimeout(function () { openDuif(q); }, 400);
  }

  var dlg, dlgOog, dlgTerug;
  function ouderHTML(titel, o) {
    return '<section><h3 class="mono">' + titel + '</h3><p class="boom-naam">' + esc(o.naam) + '</p><p class="boom-ring mono">' + esc(o.ring) + '</p>' +
      '<p class="boom-uit">uit ' + esc(o.ouders) + '</p><ul class="palmares">' + o.palmares.map(palmHTML).join('') + '</ul></section>';
  }
  function openDuif(id, bron) {
    var d = duifVan(id); if (!d || !dlg) return;
    var lijn = lijnVan(d.lijn), weg = d.status === 'verkocht';
    $('#dlgIn').innerHTML =
      '<div class="dlg-vis">' + (d.foto ? '<img src="' + esc(d.foto) + '" alt="Studiofoto van ' + esc(d.naam) + '">' : '<canvas aria-hidden="true"></canvas>') +
      '<p class="mono"><span>' + esc(d.ring) + '</span><span>Oog ' + esc(d.oog) + '</span></p></div>' +
      '<div class="dlg-txt"><p class="dlg-meta mono"><span>' + hoofd(d.geslacht) + '</span>' + (lijn ? '<span>Lijn ' + esc(lijn.naam) + '</span>' : '') +
      '<span>' + esc(hoofd(d.kleur)) + '</span></p>' +
      '<h2 class="dlg-naam" id="dlgNaam">' + esc(d.naam) + '</h2>' +
      '<p class="dlg-afst">' + esc(d.afstamming) + '</p><p class="dlg-p">' + esc(d.tekst) + '</p>' +
      '<div class="boom">' + ouderHTML('Vader', d.vader) + ouderHTML('Moeder', d.moeder) + '</div>' +
      '<div class="dlg-koop"><p class="prijs">' + (weg ? 'Verkocht' : euro(d.prijs)) + '<small>' + (weg ? 'Deze duif is niet meer beschikbaar' : 'Met stamkaart en eigendomsbewijs') + '</small></p>' +
      '<a class="knop knop-inkt" href="contact.html?duif=' + esc(d.id) + '"><span>' + (weg ? 'Vraag naar een gelijkaardige duif' : 'Vraag deze duif aan') + '</span></a></div></div>';
    dlgTerug = bron || null;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    if (lenis) lenis.stop();
    var c = $('.dlg-vis canvas', dlg);
    if (c && Oog) {
      if (!dlgOog) dlgOog = { pupil: 0.3 };
      var o = new Oog(c, { zaad: d.ring, kleur: d.oog, pupil: ANIM ? 1.6 : 0.3, plaats: function (w, h) { return { x: w / 2, y: h * 0.47, r: Math.min(w, h) * 0.3 }; } }).start();
      volgers.push(o);
      o.zet({ pupil: 0.3 });
    }
  }
  function startDialog() {
    dlg = $('#dlg'); if (!dlg) return;
    $('#dlgX').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      if (lenis) lenis.start();
      if (dlgTerug && document.contains(dlgTerug)) dlgTerug.focus({ preventScroll: true });
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-duif]'); if (!b) return;
      e.preventDefault(); openDuif(b.getAttribute('data-duif'), b);
    });
  }

  /* ==========================================================================
     Uitslagen: afstandslat en bord
     ========================================================================== */
  var MAXKM = 1120;
  function startLat() {
    var lat = $('#lat'); if (!lat) return;
    var zones = [['Snelheid', 0, 250], ['Halve fond', 250, 450], ['Fond', 450, 800], ['Zware fond', 800, MAXKM]];
    var pct = function (km) { return (km / MAXKM * 100).toFixed(2) + '%'; };
    var tik = ''; for (var k = 100; k < MAXKM; k += 100) tik += '<i class="lat-tik" style="left:' + pct(k) + '"></i>';
    var pts = [{ naam: 'Hok', km: 0 }].concat(D.lossingen);
    lat.innerHTML = '<div class="lat-wrap"><div class="lat-in"><div class="lat-schaal">' +
      zones.map(function (z) { return '<span class="lat-zone" style="left:' + pct(z[1]) + ';width:' + pct(z[2] - z[1]) + '"><span>' + z[0] + '</span></span>'; }).join('') +
      '<div class="lat-lijn"><i></i></div>' + tik +
      pts.map(function (p, i) {
        return '<p class="lat-pt ' + (i % 2 ? 'onder' : 'boven') + (i === 0 ? ' is-hok' : '') + '" style="left:' + pct(p.km) + ';--km:' + p.km + '"><b>' + esc(p.naam) + '</b><small>' + getal(p.km) + ' km</small></p>';
      }).join('') + '</div></div></div>';
  }

  var jaar = null, cat = '';
  function rijHTML(u) {
    var plaatsen = String(u.prijzen).split(',').map(function (p) {
      p = p.trim(); var n = +p;
      return '<li class="' + (n === 1 ? 'is-1' : n <= 10 ? 'is-top' : '') + '">' + esc(p) + '</li>';
    }).join('');
    return '<li class="bord-rij" data-in><span class="d">' + esc(u.datum) + '</span><span class="v">' + esc(u.vlucht) + '</span>' +
      '<span class="km">' + getal(u.km) + ' km</span><span class="k">' + esc(u.niveau) + '</span>' +
      '<span class="dv">' + getal(u.duiven) + ' d.</span><ul class="plaatsen" aria-label="Onze prijzen">' + plaatsen + '</ul></li>';
  }
  var KOPRIJ = '<li class="bord-rij bord-kop mono" aria-hidden="true"><span>Datum</span><span>Vlucht</span><span class="km">Afstand</span><span>Niveau</span><span class="dv">Duiven</span><span>Onze prijzen</span></li>';
  function tekenBord() {
    var bord = $('#bord'); if (!bord) return;
    var max = +bord.getAttribute('data-max') || 0;
    var rijen = (D.uitslagen[jaar] || []).filter(function (u) { return !cat || u.cat === cat; });
    if (max) rijen = rijen.slice(0, max);
    bord.innerHTML = KOPRIJ + (rijen.length ? rijen.map(rijHTML).join('') : '<li class="bord-rij"><span class="v">Geen vluchten in deze selectie.</span></li>');
    startVerschijnen(bord);
    if (GS) ScrollTrigger.refresh();
  }
  function startUitslagen() {
    var bord = $('#bord'); if (!bord) return;
    var jaren = Object.keys(D.uitslagen).sort().reverse();
    jaar = jaren[0];
    var tabs = $('#jaarTabs');
    if (tabs) {
      tabs.innerHTML = jaren.map(function (j) { return '<button class="tab" type="button" role="tab" aria-selected="' + (j === jaar) + '" data-jaar="' + j + '">' + j + '</button>'; }).join('');
      tabs.addEventListener('click', function (e) {
        var b = e.target.closest('.tab'); if (!b) return;
        jaar = b.getAttribute('data-jaar');
        $$('.tab', tabs).forEach(function (t) { t.setAttribute('aria-selected', String(t === b)); });
        tekenBord();
      });
    }
    var chips = $('#catChips');
    if (chips) {
      $$('.chip', chips).forEach(function (c) { c.setAttribute('aria-pressed', String(c.classList.contains('is-aan'))); });
      chips.addEventListener('click', function (e) {
        var b = e.target.closest('.chip'); if (!b) return;
        cat = b.getAttribute('data-cat');
        $$('.chip', chips).forEach(function (c) { c.classList.toggle('is-aan', c === b); c.setAttribute('aria-pressed', String(c === b)); });
        tekenBord();
      });
    }
    tekenBord();
  }

  /* ==========================================================================
     Nieuws
     ========================================================================== */
  function datum(s) { var p = s.split('-'); return { d: p[2], m: MAANDEN[+p[1] - 1], j: p[0] }; }
  function startNieuws() {
    var N = D.nieuws || [];
    var kort = $('#nieuwsKort');
    if (kort) {
      kort.innerHTML = N.slice(0, +kort.getAttribute('data-max') || 4).map(function (n) {
        var t = datum(n.datum);
        return '<li class="bericht" data-in><a href="nieuws.html#' + esc(n.id) + '"><time class="mono" datetime="' + n.datum + '">' + t.d + ' ' + t.m + ' ' + t.j + '</time><h3>' + esc(n.titel) + '</h3><p>' + esc(n.intro) + '</p><span class="duif-pijl">' + PIJL + '</span></a></li>';
      }).join('');
    }
    var alle = $('#nieuwsAlle');
    if (alle) {
      alle.innerHTML = N.map(function (n) {
        var t = datum(n.datum);
        return '<article class="artikel" id="' + esc(n.id) + '" aria-labelledby="t-' + esc(n.id) + '"><div class="artikel-zij"><time datetime="' + n.datum + '">' + t.d + ' ' + t.m + '</time><span class="mono">' + t.j + '</span></div>' +
          '<div><h2 id="t-' + esc(n.id) + '" data-split>' + esc(n.titel) + '</h2><p class="artikel-intro" data-in>' + esc(n.intro) + '</p><div class="artikel-body" data-in>' + (n.tekst || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
          (n.link ? '<a class="pijl" href="' + esc(n.link.href) + '" data-in>' + esc(n.link.tekst) + '</a>' : '') + '</div></article>';
      }).join('');
      if (location.hash) { var doel = $(location.hash); if (doel) setTimeout(function () { naar(doel); }, 60); }
    }
  }

  /* ==========================================================================
     Contactformulier
     ========================================================================== */
  function startForm() {
    var form = $('#contactForm'); if (!form) return;
    var note = $('#formNote'), MAIL = 'info@teamnoelwillockx.be';
    function fout(veld, tekst) {
      var wrap = veld.closest('.veld') || veld.closest('.akkoord');
      wrap.classList.toggle('is-fout', !!tekst);
      var s = wrap.querySelector('.fout');
      if (tekst && wrap.classList.contains('veld')) {
        if (!s) { s = document.createElement('small'); s.className = 'fout'; wrap.appendChild(s); }
        s.textContent = tekst; veld.setAttribute('aria-invalid', 'true');
      } else if (s) { s.remove(); veld.removeAttribute('aria-invalid'); }
      return !tekst;
    }
    function check() {
      var e = form.elements, ok = true, eerste = null;
      [
        [e.name, e.name.value.trim() ? '' : 'Vul je naam in.'],
        [e.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.email.value.trim()) ? '' : 'Vul een geldig e-mailadres in, bv. jan@voorbeeld.be.'],
        [e.message, e.message.value.trim() ? '' : 'Schrijf kort wat je wil weten.'],
        [e.consent, e.consent.checked ? '' : 'x']
      ].forEach(function (r) { if (!fout(r[0], r[1])) { ok = false; eerste = eerste || r[0]; } });
      if (eerste) eerste.focus();
      return ok;
    }
    form.addEventListener('input', function (e) { if (e.target.closest('.is-fout')) fout(e.target, ''); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      note.className = 'form-noot'; note.textContent = '';
      if (!check()) {
        note.classList.add('is-fout');
        note.textContent = form.elements.consent.checked ? 'Kijk de gemarkeerde velden na.' : 'Vink het akkoord aan om te versturen.';
        return;
      }
      var knop = form.querySelector('button[type="submit"] span'), tekst = knop.textContent;
      knop.parentNode.disabled = true; knop.textContent = 'Bezig met versturen…';
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.success, msg: j.message }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.msg || '');
          form.reset(); toonDuif();
          note.classList.add('is-ok'); note.textContent = r.msg || 'Bericht verstuurd. We antwoorden binnen twee werkdagen.';
        })
        .catch(function () {
          note.classList.add('is-fout');
          note.innerHTML = 'Het bericht is niet verstuurd. Mail ons rechtstreeks op <a href="mailto:' + MAIL + '">' + MAIL + '</a>.';
        })
        .then(function () { knop.parentNode.disabled = false; knop.textContent = tekst; });
    });
    var onderwerp = $('#cSubject'), wrap = $('#cDuifWrap'), keuze = $('#cDuif');
    D.duiven.forEach(function (d) {
      if (d.status === 'verkocht') return;
      var o = document.createElement('option'); o.value = d.naam + ' (' + d.ring + ')'; o.textContent = d.naam + ' · ' + d.ring; o.setAttribute('data-id', d.id); keuze.appendChild(o);
    });
    var q = new URLSearchParams(location.search), d = duifVan(q.get('duif'));
    if (d) {
      onderwerp.value = 'Duif aankopen';
      var optie = keuze.querySelector('option[data-id="' + d.id + '"]');
      keuze.value = optie ? optie.value : '';
      form.elements.message.value = d.status === 'verkocht'
        ? "Ik zoek een duif zoals '" + d.naam + "' (" + d.ring + '). Hebben jullie iets gelijkaardigs?'
        : "Ik heb interesse in '" + d.naam + "' (" + d.ring + '). Kan ik langskomen om de duif te bekijken?';
    }
    if (q.get('onderwerp') === 'wachtlijst') onderwerp.value = 'Wachtlijst jongen 2027';
    if (q.get('onderwerp') === 'bezoek') onderwerp.value = 'Hokbezoek plannen';
    function toonDuif() { wrap.hidden = onderwerp.value !== 'Duif aankopen'; }
    onderwerp.addEventListener('change', toonDuif); toonDuif();
  }

  /* ==========================================================================
     Over ons: het oog als schema
     ========================================================================== */
  function startAnatomie() {
    var c = $('.anatomie-oog'); if (!c || !Oog) return;
    var o = oogOp(c, { zaad: c.getAttribute('data-zaad'), kleur: c.getAttribute('data-kleur'), rand: false, plaats: function (w, h) { return { x: w / 2, y: h / 2, r: Math.min(w, h) * 0.36 }; } });
    if (o) volgers.push(o);
  }

  /* ==========================================================================
     Kop, menu, scroll, voet, magneten
     ========================================================================== */
  function naar(el) {
    if (lenis) lenis.scrollTo(el, { offset: 0, immediate: true });
    else el.scrollIntoView();
  }
  function startMenu() {
    var knop = $('#menuKnop'), menu = $('#menu'); if (!knop || !menu) return;
    $$('.menu-a', menu).forEach(function (a, i) { a.style.setProperty('--i', i); });
    var dicht;
    function zet(open) {
      clearTimeout(dicht);
      knop.setAttribute('aria-expanded', String(open));
      $('.menu-woord', knop).textContent = open ? 'Sluit' : 'Menu';
      if (open) {
        menu.hidden = false;
        root.classList.add('menu-open');
        if (lenis) lenis.stop();
        requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('is-open'); }); });
        setTimeout(function () { var a = $('.menu-a', menu); if (a) a.focus({ preventScroll: true }); }, 300);
      } else {
        menu.classList.remove('is-open');
        root.classList.remove('menu-open');
        if (lenis) lenis.start();
        dicht = setTimeout(function () { menu.hidden = true; }, ANIM ? 900 : 0);
      }
    }
    knop.addEventListener('click', function () { zet(knop.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && knop.getAttribute('aria-expanded') === 'true') { zet(false); knop.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1200 && knop.getAttribute('aria-expanded') === 'true') zet(false); });
  }

  function startVoet() {
    var w = $('[data-woord]'); if (!w) return;
    var tekst = w.textContent;
    w.innerHTML = tekst.split('').map(function (l, i) { return '<span class="l" style="--i:' + i + '">' + esc(l) + '</span>'; }).join('');
    function pas() {
      w.style.fontSize = '100px';
      var ls = w.querySelectorAll('.l');
      var breedte = ls[ls.length - 1].getBoundingClientRect().right - ls[0].getBoundingClientRect().left;
      var ruimte = w.parentNode.clientWidth - 24;
      w.style.fontSize = Math.max(40, 100 * ruimte / breedte) + 'px';
    }
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(pas);
    window.addEventListener('resize', pas);
    $$('[data-naar-boven]').forEach(function (a) {
      a.addEventListener('click', function (e) { if (lenis) { e.preventDefault(); lenis.scrollTo(0); } });
    });
  }

  function startMagneten() {
    if (!ANIM || !FIJN) return;
    $$('[data-magneet]').forEach(function (k) {
      var s = $('span', k);
      k.addEventListener('pointermove', function (e) {
        var r = k.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        k.style.transform = 'translate(' + x * 0.22 + 'px,' + y * 0.32 + 'px)';
        if (s) s.style.transform = 'translate(' + x * 0.1 + 'px,' + y * 0.12 + 'px)';
      });
      k.addEventListener('pointerleave', function () { k.style.transform = ''; if (s) s.style.transform = ''; });
      k.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1), color .5s';
      if (s) s.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)';
    });
  }

  function startScroll() {
    if (!GS || !window.Lenis) return;
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ==========================================================================
     Start
     ========================================================================== */
  function start() {
    startScroll();
    startMenu();
    startDialog();
    startHeld();
    startPkop();
    startLijnenSpoor();
    startStamlijnen();
    startKoop();
    startLat();
    startUitslagen();
    startNieuws();
    startForm();
    startAnatomie();
    startUitnodiging();
    startManifest();
    startTellers();
    startVoet();
    startVerschijnen(document);
    startMagneten();
    if (GS) {
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { ScrollTrigger.refresh(); });
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
