/* ==========================================================================
   Team Noel-Willockx · het oog
   --------------------------------------------------------------------------
   Tekent een duivenoog op een <canvas>: iris met vezels en pigment,
   correlatiecirkel, pupil en de glans van het hoornvlies. Elke duif krijgt
   haar eigen oog: de tekening hangt af van een zaad (ringnummer) en de
   oogkleur uit data.js (oranje | rood | parel | geel).

   Gebruik:  var oog = new NWOog(canvas, { zaad: 'BE18-6032210', kleur: 'oranje' });
             oog.doel.pupil = .5;   // het oog beweegt er vloeiend naartoe
   ========================================================================== */
(function () {
  'use strict';

  var KLEUREN = {
    oranje: { kern: '#f7b25a', mid: '#e0782c', rand: '#8a3413', diep: '#2b0d04', licht: '#ffe0ae' },
    rood:   { kern: '#ef8a5a', mid: '#c23d24', rand: '#64140f', diep: '#1e0504', licht: '#ffc2a2' },
    parel:  { kern: '#f6f3ea', mid: '#d9d3c4', rand: '#8f897c', diep: '#2c2a26', licht: '#ffffff' },
    geel:   { kern: '#f8d873', mid: '#e3a630', rand: '#8a5810', diep: '#2a1904', licht: '#fff3c2' }
  };
  var NACHT = '#050a1f';

  function zaad(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hexRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(h, a) { var c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function meng(h1, h2, t) {
    var a = hexRgb(h1), b = hexRgb(h2);
    return '#' + [0, 1, 2].map(function (i) {
      var v = Math.round(a[i] + (b[i] - a[i]) * t).toString(16); return v.length < 2 ? '0' + v : v;
    }).join('');
  }

  /* ---------- de iris: één keer tekenen op een losse canvas, daarna hergebruiken ---------- */
  var cache = {};
  function irisTextuur(sleutel, kleur, S) {
    var id = sleutel + '|' + kleur + '|' + S;
    if (cache[id]) return cache[id];
    var K = KLEUREN[kleur] || KLEUREN.oranje;
    var c = document.createElement('canvas'); c.width = c.height = S;
    var x = c.getContext('2d'), m = S / 2, R = S * 0.495, r = rng(zaad(sleutel)), i, a, f = S / 1024;

    x.save();
    x.beginPath(); x.arc(m, m, R, 0, Math.PI * 2); x.clip();

    // grondtoon
    var g = x.createRadialGradient(m, m, R * 0.12, m, m, R);
    g.addColorStop(0, K.diep);
    g.addColorStop(0.2, meng(K.rand, K.mid, 0.4));
    g.addColorStop(0.34, K.kern);
    g.addColorStop(0.58, K.mid);
    g.addColorStop(0.86, K.rand);
    g.addColorStop(1, K.diep);
    x.fillStyle = g; x.fillRect(0, 0, S, S);

    // pigmentvlekken
    for (i = 0; i < 420; i++) {
      a = r() * Math.PI * 2;
      var pr = R * (0.24 + r() * 0.72), pz = (6 + r() * 34) * f;
      var px = m + Math.cos(a) * pr, py = m + Math.sin(a) * pr;
      var pg = x.createRadialGradient(px, py, 0, px, py, pz);
      var pk = r() < 0.55 ? K.licht : (r() < 0.5 ? K.rand : K.diep);
      pg.addColorStop(0, rgba(pk, 0.05 + r() * 0.12)); pg.addColorStop(1, rgba(pk, 0));
      x.fillStyle = pg; x.fillRect(px - pz, py - pz, pz * 2, pz * 2);
    }

    // vezels: licht en donker, licht golvend van binnen naar buiten
    x.lineCap = 'round';
    for (i = 0; i < 2600; i++) {
      a = r() * Math.PI * 2;
      var r1 = R * (0.22 + r() * 0.16), r2 = R * (0.55 + r() * 0.44);
      var kr = (r() - 0.5) * 0.14, mr = (r1 + r2) / 2;
      var licht = r() < 0.58;
      x.strokeStyle = licht ? rgba(K.licht, 0.04 + r() * 0.2) : rgba(K.diep, 0.06 + r() * 0.22);
      x.lineWidth = (0.5 + r() * (licht ? 1.6 : 2.4)) * f;
      x.beginPath();
      x.moveTo(m + Math.cos(a) * r1, m + Math.sin(a) * r1);
      x.quadraticCurveTo(m + Math.cos(a + kr) * mr, m + Math.sin(a + kr) * mr, m + Math.cos(a + kr * 0.4) * r2, m + Math.sin(a + kr * 0.4) * r2);
      x.stroke();
    }

    // crypten: kleine donkere lensjes tussen de vezels
    for (i = 0; i < 70; i++) {
      a = r() * Math.PI * 2;
      var cr = R * (0.36 + r() * 0.4);
      x.save();
      x.translate(m + Math.cos(a) * cr, m + Math.sin(a) * cr); x.rotate(a);
      x.fillStyle = rgba(K.diep, 0.12 + r() * 0.22);
      x.beginPath(); x.ellipse(0, 0, (8 + r() * 26) * f, (1.5 + r() * 4) * f, 0, 0, Math.PI * 2); x.fill();
      x.restore();
    }

    // correlatiecirkel en adaptatiecirkel rond de pupil
    for (i = 0; i < 26; i++) {
      x.strokeStyle = rgba(K.diep, 0.035);
      x.lineWidth = (10 + i * 1.4) * f;
      x.beginPath(); x.arc(m, m, R * (0.375 + (r() - 0.5) * 0.012), 0, Math.PI * 2); x.stroke();
    }
    x.strokeStyle = rgba(K.licht, 0.22); x.lineWidth = 2.2 * f;
    x.beginPath(); x.arc(m, m, R * 0.332, 0, Math.PI * 2); x.stroke();

    // donkere limbusring aan de rand
    var lg = x.createRadialGradient(m, m, R * 0.8, m, m, R);
    lg.addColorStop(0, rgba(K.diep, 0)); lg.addColorStop(0.75, rgba(K.diep, 0.55)); lg.addColorStop(1, rgba(K.diep, 0.95));
    x.fillStyle = lg; x.fillRect(0, 0, S, S);
    x.restore();

    cache[id] = c;
    return c;
  }

  /* ---------- een oog op het scherm ---------- */
  function NWOog(canvas, opt) {
    opt = opt || {};
    this.c = canvas;
    this.x = canvas.getContext('2d');
    this.zaad = opt.zaad || 'NW';
    this.kleur = opt.kleur || 'oranje';
    this.rand = opt.rand !== false;          // haarlijnen rond het oog
    this.klok = !!opt.klok;                  // minutenschaal en secondestip (alleen de grote koppen)
    this.achtergrond = opt.achtergrond || null;
    this.pupilKleur = opt.pupilKleur || NACHT;
    this.plaats = opt.plaats || function (w, h) { return { x: w / 2, y: h / 2, r: Math.min(w, h) * 0.36 }; };
    var p = opt.pupil == null ? 0.3 : opt.pupil;
    this.nu = { pupil: p, draai: 0, kx: 0, ky: 0, schaal: 1, dx: 0, dy: 0, licht: 1 };
    this.doel = { pupil: p, draai: 0, kx: 0, ky: 0, schaal: 1, dx: 0, dy: 0, licht: 1 };
    this.leeft = opt.leeft !== false;        // kleine pupilbeweging (hippus) en trage draai
    this.t0 = performance.now();
    this.maat();
  }

  NWOog.prototype.maat = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = this.c.clientWidth || 1, h = this.c.clientHeight || 1;
    this.w = w; this.h = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    var p = this.plaats(w, h);
    var S = p.r * 2 * dpr > 900 ? 1400 : p.r * 2 * dpr > 420 ? 900 : 480;
    this.tex = irisTextuur(this.zaad, this.kleur, S);
    this.vuil = true;
  };

  /* stap: beweeg naar het doel; true zolang er nog iets verandert */
  NWOog.prototype.stap = function (dt, beweeg) {
    var n = this.nu, d = this.doel, k = beweeg ? 1 - Math.pow(0.0009, dt) : 1, rust = true;
    for (var s in d) {
      var v = n[s] + (d[s] - n[s]) * k;
      if (Math.abs(v - d[s]) < 0.0004) v = d[s]; else rust = false;
      n[s] = v;
    }
    return !rust;
  };

  NWOog.prototype.teken = function (tijd) {
    var x = this.x, w = this.w, h = this.h, n = this.nu, p = this.plaats(w, h);
    var t = ((tijd || performance.now()) - this.t0) / 1000;
    var leeft = this.leeft && NWOog.beweging;
    var cx = p.x + n.dx * w, cy = p.y + n.dy * h, R = p.r * n.schaal;
    var hip = leeft ? Math.sin(t * 0.9) * 0.012 + Math.sin(t * 2.3) * 0.006 : 0;
    var pr = R * Math.max(0.12, n.pupil + hip);
    var draai = n.draai + (leeft ? t * 0.012 : 0);

    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.achtergrond) { x.fillStyle = this.achtergrond; x.fillRect(0, 0, w, h); } else x.clearRect(0, 0, w, h);

    // haarlijnen en minutenschaal: het oog als uurwerk
    if (this.rand) {
      x.save(); x.translate(cx, cy);
      x.strokeStyle = 'rgba(242,239,230,' + (0.13 * n.licht) + ')'; x.lineWidth = 1;
      x.beginPath(); x.arc(0, 0, R * 1.09, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = 'rgba(242,239,230,' + (0.07 * n.licht) + ')';
      x.beginPath(); x.arc(0, 0, R * 1.42, 0, Math.PI * 2); x.stroke();
      if (this.klok) {
        x.beginPath(); x.arc(0, 0, R * 1.78, 0, Math.PI * 2); x.stroke();
        for (var i = 0; i < 60; i++) {
          var a = i / 60 * Math.PI * 2 - Math.PI / 2, lang = i % 5 === 0;
          x.strokeStyle = 'rgba(242,239,230,' + ((lang ? 0.42 : 0.16) * n.licht) + ')';
          x.beginPath();
          x.moveTo(Math.cos(a) * R * 1.42, Math.sin(a) * R * 1.42);
          x.lineTo(Math.cos(a) * R * (lang ? 1.5 : 1.46), Math.sin(a) * R * (lang ? 1.5 : 1.46));
          x.stroke();
        }
        // de secondestip loopt echt mee met de klok
        var nu = new Date(), sec = nu.getSeconds() + nu.getMilliseconds() / 1000;
        var sa = sec / 60 * Math.PI * 2 - Math.PI / 2;
        x.fillStyle = 'rgba(232,150,74,' + (0.95 * n.licht) + ')';
        x.beginPath(); x.arc(Math.cos(sa) * R * 1.42, Math.sin(sa) * R * 1.42, Math.max(2.5, R * 0.012), 0, Math.PI * 2); x.fill();
      }
      x.restore();
    }

    // zachte schaduw onder de bol
    var sg = x.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.12);
    sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sg; x.beginPath(); x.arc(cx, cy, R * 1.12, 0, Math.PI * 2); x.fill();

    // iris (schuift een fractie mee met de blik)
    var ix = cx + n.kx * R * 0.06, iy = cy + n.ky * R * 0.06;
    x.save();
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
    x.translate(ix, iy); x.rotate(draai);
    x.drawImage(this.tex, -R * 1.01, -R * 1.01, R * 2.02, R * 2.02);
    x.restore();

    // pupil
    var pg = x.createRadialGradient(ix, iy, pr * 0.82, ix, iy, pr * 1.06);
    pg.addColorStop(0, this.pupilKleur); pg.addColorStop(1, rgba(this.pupilKleur, 0));
    x.fillStyle = pg; x.beginPath(); x.arc(ix, iy, pr * 1.06, 0, Math.PI * 2); x.fill();
    x.fillStyle = this.pupilKleur; x.beginPath(); x.arc(ix, iy, pr * 0.84, 0, Math.PI * 2); x.fill();

    // bolling en glans van het hoornvlies
    if (pr < R * 1.2) {
      x.save();
      x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
      var bg = x.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.2, cx, cy, R * 1.02);
      bg.addColorStop(0, 'rgba(255,255,255,.06)'); bg.addColorStop(0.7, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,.5)');
      x.fillStyle = bg; x.fillRect(cx - R, cy - R, R * 2, R * 2);
      // venster dat spiegelt in het oog: verschuift tegen de blik in
      var gx = cx - R * 0.34 - n.kx * R * 0.05, gy = cy - R * 0.36 - n.ky * R * 0.05;
      x.translate(gx, gy); x.rotate(-0.5);
      var vg = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.26);
      vg.addColorStop(0, 'rgba(255,255,255,' + (0.5 * n.licht) + ')'); vg.addColorStop(0.45, 'rgba(255,255,255,' + (0.16 * n.licht) + ')'); vg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = vg; x.scale(1, 0.55); x.beginPath(); x.arc(0, 0, R * 0.26, 0, Math.PI * 2); x.fill();
      x.restore();
      x.save();
      x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
      x.fillStyle = 'rgba(255,255,255,' + (0.85 * n.licht) + ')';
      x.beginPath(); x.arc(cx - R * 0.2 - n.kx * R * 0.04, cy - R * 0.22 - n.ky * R * 0.04, Math.max(1.5, R * 0.028), 0, Math.PI * 2); x.fill();
      // randlicht onderaan
      x.strokeStyle = 'rgba(255,255,255,' + (0.1 * n.licht) + ')'; x.lineWidth = R * 0.02;
      x.beginPath(); x.arc(cx, cy, R * 0.97, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
      x.restore();
    }

    // groeit de pupil voorbij de iris, dan vult ze het scherm
    if (pr > R) {
      x.fillStyle = rgba(this.pupilKleur, Math.min(1, (pr - R) / (R * 0.5)));
      x.fillRect(0, 0, w, h);
    }
    this.vuil = false;
  };

  /* ---------- één klok voor alle ogen ---------- */
  var ogen = [], loopt = false, vorige = 0;
  function lus(tijd) {
    var dt = Math.min(0.05, (tijd - (vorige || tijd)) / 1000); vorige = tijd;
    var bezig = false;
    for (var i = 0; i < ogen.length; i++) {
      var o = ogen[i];
      // canvas uit de pagina gehaald (filter, dialoog dicht): oog opruimen
      if (!o.c.isConnected) { if (zicht) zicht.unobserve(o.c); ogen.splice(i--, 1); continue; }
      if (!o.zichtbaar) continue;
      var beweegt = o.stap(dt, NWOog.beweging);
      if (beweegt || o.vuil || ((o.leeft || o.klok) && NWOog.beweging)) { o.teken(tijd); }
      if (beweegt || ((o.leeft || o.klok) && NWOog.beweging)) bezig = true;
    }
    if (bezig) requestAnimationFrame(lus); else { loopt = false; vorige = 0; }
  }
  NWOog.wek = function () { if (!loopt) { loopt = true; requestAnimationFrame(lus); } };

  var zicht = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.__oog.zichtbaar = e.isIntersecting; if (e.isIntersecting) { e.target.__oog.vuil = true; NWOog.wek(); } });
  }, { rootMargin: '120px' }) : null;

  NWOog.prototype.start = function () {
    ogen.push(this); this.c.__oog = this;
    if (zicht) zicht.observe(this.c); else this.zichtbaar = true;
    this.teken();
    NWOog.wek();
    return this;
  };
  NWOog.prototype.zet = function (w) { for (var s in w) this.doel[s] = w[s]; NWOog.wek(); };

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { ogen.forEach(function (o) { o.maat(); o.teken(); }); }, 120);
  });

  NWOog.beweging = !document.documentElement.classList.contains('rustig');
  NWOog.NACHT = NACHT;
  window.NWOog = NWOog;
})();
