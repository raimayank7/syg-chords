/* chords.shareyourgroup.com: chord finder, "hear this chord" (plain tones made by the browser) and the transposing tool. Nothing is sent anywhere. */
(function () {
  'use strict';
  var d = document, ctx = null;
  function $(s) { return d.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function play(midis) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume();
      var t0 = ctx.currentTime + 0.05, n = midis.length;
      midis.forEach(function (m, i) {   // once as a slow strum, then all together
        [[t0 + i * 0.22, 0.5], [t0 + n * 0.22 + 0.25 + i * 0.03, 1.6]].forEach(function (p) {
          var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
          g.gain.setValueAtTime(0, p[0]); g.gain.linearRampToValueAtTime(0.9 / (n + 1), p[0] + 0.02); g.gain.exponentialRampToValueAtTime(0.001, p[0] + p[1]);
          o.connect(g); g.connect(ctx.destination); o.start(p[0]); o.stop(p[0] + p[1] + 0.05);
        });
      });
    } catch (e) { }
  }
  var SH = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], FL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  function pc(note) { var n = 'C D EF G A B'.indexOf(note[0]); if (n < 0) return -1; if (note[1] === '#' || note[1] === '♯') n++; if (note[1] === 'b' || note[1] === '♭') n--; return (n + 12) % 12; }
  function shiftChord(ch, by, flats) {
    return ch.replace(/(^|\/)([A-G])([#b♯♭]?)/g, function (all, pre, l, acc) { var p = pc(l + acc); return pre + (flats ? FL : SH)[((p + by) % 12 + 12) % 12]; });
  }
  function transposer() {
    var box = $('#tp'); if (!box) return;
    var inp = $('#tp-in'), out = $('#tp-out'), nEl = $('#tp-n'), flat = $('#tp-flat'), by = 0;
    function run() {
      var toks = inp.value.split(/[\s,|]+/).filter(Boolean), good = [], bad = [];
      toks.forEach(function (t) { if (/^[A-G][#b♯♭]?[A-Za-z0-9+\-#°()]*(\/[A-G][#b♯♭]?)?$/.test(t) && t.length <= 12) good.push(shiftChord(t, by, flat.checked)); else bad.push(t); });
      nEl.textContent = (by > 0 ? '+' : '') + by + (Math.abs(by) === 1 ? ' semitone' : ' semitones');
      if (!toks.length) { out.hidden = true; return; }
      var txt = good.join('  ');
      out.hidden = false;
      out.innerHTML = (good.length ? '<p class="big">' + esc(txt) + '</p><div class="acts" style="display:flex"><button class="btn sm" type="button" data-copy="' + esc(txt) + '">Copy</button></div>' : '') +
        (bad.length ? '<p class="hint">Not read as chord names and left out: ' + esc(bad.slice(0, 8).join(', ')) + '</p>' : '') +
        (by ? '<p class="hint">With a capo: ' + (by > 0 ? 'play the original shapes with a capo on fret ' + by + '.' : 'the new chords are lower than the originals, so a capo cannot do this; play the new shapes.') + '</p>' : '');
    }
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-tp]'); if (!b) return; by += +b.getAttribute('data-tp'); if (by > 11) by = 11; if (by < -11) by = -11; run(); });
    inp.addEventListener('input', run); flat.addEventListener('change', run); run();
  }
  function init() {
    var go = $('#cf-go'); if (go) go.addEventListener('click', function () { location.href = '/' + $('#cf-root').value + '-' + $('#cf-type').value + '/'; });
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-chord]'); if (b) { e.preventDefault(); play(b.getAttribute('data-chord').split(',').map(Number)); } });
    transposer();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
