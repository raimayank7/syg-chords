/* chords.shareyourgroup.com/tuner: microphone tuner and reference tones. Needs pitch.js (window.Pitch).
   The microphone is opened only after the visitor taps Start. Sound is analysed in the browser, a few times a second,
   and thrown away: nothing is recorded, stored or sent anywhere. Stop (or leaving the page) releases the microphone. */
(function () {
  'use strict';
  var d = document, P = window.Pitch, LS = window.localStorage;
  function $(s, r) { return (r || d).querySelector(s); }
  function load(k, def) { try { var v = JSON.parse(LS.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function save(k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) { } }
  var SWARA = ['Sa', 'komal Re', 'Re', 'komal Ga', 'Ga', 'Ma', 'tivra Ma', 'Pa', 'komal Dha', 'Dha', 'komal Ni', 'Ni'];
  var set = load('tn-set', { a4: 440, sa: -1 }), ctx = null;
  function audio() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  function label(midi) { var n = P.NAMES[((midi % 12) + 12) % 12], o = Math.floor(midi / 12) - 1; return set.sa >= 0 ? SWARA[(((midi - set.sa) % 12) + 12) % 12] : n + '<sub>' + o + '</sub>'; }

  /* ---- reference tone ---- */
  var osc = null, gain = null, playing = null;
  function stopTone() { if (osc) { try { gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03); osc.stop(ctx.currentTime + 0.15); } catch (e) { } osc = null; } if (playing) { playing.setAttribute('aria-pressed', 'false'); playing = null; } }
  function playTone(freq, btn, secs) {
    var same = playing === btn; stopTone(); if (same) return;
    var c = audio(); osc = c.createOscillator(); gain = c.createGain(); osc.type = 'triangle'; osc.frequency.value = freq; gain.gain.value = 0; osc.connect(gain); gain.connect(c.destination);
    gain.gain.setTargetAtTime(0.25, c.currentTime, 0.02); osc.start(); playing = btn; if (btn) btn.setAttribute('aria-pressed', 'true');
    var mine = osc; setTimeout(function () { if (osc === mine) stopTone(); }, (secs || 4) * 1000);
  }

  /* ---- the tuner ---- */
  function Tuner(root) {
    var self = this; this.root = root; this.strings = JSON.parse(root.getAttribute('data-strings') || '[]');   // [[label, midi], ...]
    this.noteEl = $('.tn-note', root); this.centEl = $('.tn-cents', root); this.hzEl = $('.tn-hz', root); this.needle = $('.tn-needle', root); this.msg = $('.tn-msg', root); this.btn = $('.tn-start', root); this.list = $('.tn-strings', root);
    this.hist = []; this.on = false; this.quiet = 0;
    this.btn.addEventListener('click', function () { if (self.on) self.stop(); else self.start(); });
    if (this.list) this.list.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; playTone(P.freqOf(+b.getAttribute('data-midi'), set.a4), b); });
    var a4 = $('.tn-a4', root); if (a4) { a4.value = set.a4; a4.addEventListener('change', function () { var v = Math.round(+a4.value); if (v >= 415 && v <= 466) { set.a4 = v; save('tn-set', set); self.paintStrings(); } else a4.value = set.a4; }); }
    var sa = $('.tn-sa', root); if (sa) { sa.value = String(set.sa); sa.addEventListener('change', function () { set.sa = +sa.value; save('tn-set', set); self.paintStrings(); self.hist = []; }); }
    d.addEventListener('visibilitychange', function () { if (d.hidden && self.on) self.stop(); });
    window.addEventListener('pagehide', function () { if (self.on) self.stop(); });
    this.paintStrings(); this.idle();
  }
  var T = Tuner.prototype;
  T.paintStrings = function () { if (!this.list) return; this.list.innerHTML = this.strings.map(function (s) { return '<button type="button" data-midi="' + s[1] + '" aria-pressed="false"><b>' + s[0] + '</b><span>' + label(s[1]) + '</span><small>' + P.freqOf(s[1], set.a4).toFixed(1) + ' Hz</small></button>'; }).join(''); };
  T.idle = function () { this.noteEl.innerHTML = '&ndash;'; this.centEl.textContent = ''; this.hzEl.textContent = ''; this.needle.style.left = '50%'; this.root.classList.remove('good', 'near'); };
  T.say = function (t) { this.msg.textContent = t; };
  T.start = function () {
    var self = this, md = navigator.mediaDevices;
    stopTone();
    if (!md || !md.getUserMedia) { this.say('This browser cannot use the microphone from a web page. Use the reference tones below and tune by ear.'); return; }
    this.say('Asking for the microphone...');
    md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (stream) {
      var c = audio(); self.stream = stream; self.src = c.createMediaStreamSource(stream); self.an = c.createAnalyser(); self.an.fftSize = 4096; self.src.connect(self.an);
      self.buf = new Float32Array(self.an.fftSize); self.on = true; self.btn.textContent = 'Stop'; self.btn.classList.add('ghost'); self.root.classList.add('live');
      self.say('Listening. Play one string or note and let it ring.');
      self.timer = setInterval(function () { self.tick(); }, 90);
    }).catch(function (e) {
      self.say(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'The microphone was not allowed. Allow it for this site in your browser, then tap Start again. Or use the reference tones below.' : e && e.name === 'NotFoundError' ? 'No microphone was found on this device. Use the reference tones below and tune by ear.' : 'The microphone could not be started. Close other apps that are using it and try again.');
    });
  };
  T.stop = function () {
    clearInterval(this.timer); this.on = false;
    if (this.stream) this.stream.getTracks().forEach(function (t) { t.stop(); });
    try { if (this.src) this.src.disconnect(); } catch (e) { }
    this.stream = this.src = this.an = null; this.btn.textContent = 'Start tuner'; this.btn.classList.remove('ghost'); this.root.classList.remove('live'); this.idle(); this.say('Stopped. The microphone is released.');
  };
  T.tick = function () {
    this.an.getFloatTimeDomainData(this.buf);
    var f = P.detect(this.buf, ctx.sampleRate, 25, 1400);
    if (!f) { if (++this.quiet > 12) { this.hist = []; this.idle(); } return; }
    this.quiet = 0; this.hist.push(f); if (this.hist.length > 5) this.hist.shift();
    var s = this.hist.slice().sort(function (a, b) { return a - b; }), med = s[s.length >> 1];
    if (Math.abs(1200 * Math.log(f / med) / Math.LN2) > 80 && this.hist.length > 2) return;   // a stray reading: wait for agreement
    this.show(med);
  };
  T.show = function (f) {
    var target = null, n = P.note(f, set.a4), cents = n.cents, midi = n.midi;
    if (this.strings.length) {   // with an instrument chosen, aim at its nearest string
      var bestD = 1e9; this.strings.forEach(function (s) { var dd = Math.abs(n.exact - s[1]); if (dd < bestD) { bestD = dd; target = s; } });
      if (bestD <= 3.5) { midi = target[1]; cents = Math.round((n.exact - midi) * 100); } else target = null;
    }
    this.noteEl.innerHTML = label(midi) + (target ? ' <small>' + target[0] + '</small>' : '');
    var c = Math.max(-50, Math.min(50, cents)); this.needle.style.left = (50 + c) + '%';
    this.hzEl.textContent = f.toFixed(1) + ' Hz';
    var ok = Math.abs(cents) <= 4, near = Math.abs(cents) <= 12;
    this.root.classList.toggle('good', ok); this.root.classList.toggle('near', !ok && near);
    this.centEl.textContent = ok ? 'In tune' : cents > 50 || cents < -50 ? (cents < 0 ? 'Much too low: tighten' : 'Much too high: loosen') : cents < 0 ? Math.abs(cents) + ' cents low: tighten a little' : cents + ' cents high: loosen a little';
    if (this.list) [].forEach.call(this.list.children, function (b) { var mine = !!target && +b.getAttribute('data-midi') === target[1]; b.classList.toggle('hit', mine); if (mine && ok) b.classList.add('done'); });
  };

  /* ---- tone generator page ---- */
  function toneBox(root) {
    var note = $('#tg-note', root), oct = $('#tg-oct', root), out = $('#tg-out', root), btn = $('#tg-play', root), keys = $('.tg-keys', root);
    function midi() { return +note.value + 12 * (+oct.value + 1); }
    function paint() { var m = midi(); out.innerHTML = label(m) + ' <small>' + P.freqOf(m, set.a4).toFixed(2) + ' Hz</small>'; }
    note.addEventListener('change', function () { paint(); if (playing) { stopTone(); playTone(P.freqOf(midi(), set.a4), btn, 30); } });
    oct.addEventListener('change', function () { paint(); if (playing) { stopTone(); playTone(P.freqOf(midi(), set.a4), btn, 30); } });
    btn.addEventListener('click', function () { playTone(P.freqOf(midi(), set.a4), btn, 30); });
    if (keys) keys.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; playTone(P.freqOf(+b.getAttribute('data-midi'), set.a4), b, 6); });
    paint();
  }
  function init() {
    [].forEach.call(d.querySelectorAll('[data-tuner]'), function (r) { new Tuner(r); });
    var tg = $('[data-tonegen]'); if (tg) toneBox(tg);
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-tone]'); if (b) playTone(P.freqOf(+b.getAttribute('data-tone'), set.a4), b, 4); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
