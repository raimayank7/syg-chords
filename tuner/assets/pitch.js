/* Pitch detection for chords.shareyourgroup.com/tuner. Written for this site; runs in the browser and in Node (test_pitch.js).
   Method: the difference function with cumulative mean normalisation (the idea behind the published YIN method), first dip under a
   threshold, parabolic refinement. Input: a Float32Array of samples and the sample rate. Output: frequency in Hz, or 0 for "no clear pitch". */
(function (root) {
  'use strict';
  var NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function detect(buf, sampleRate, minHz, maxHz) {
    var n = buf.length, half = n >> 1, i, tau, rms = 0;
    for (i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < 0.008) return 0;                       // too quiet
    var tauMin = Math.max(2, Math.floor(sampleRate / (maxHz || 1400))), tauMax = Math.min(half - 1, Math.ceil(sampleRate / (minHz || 25)));
    var d = new Float32Array(tauMax + 2), run = 0, best = -1;
    d[0] = 1;
    for (tau = 1; tau <= tauMax + 1; tau++) {
      var s = 0;
      for (i = 0; i < half; i++) { var x = buf[i] - buf[i + tau]; s += x * x; }
      run += s; d[tau] = run > 0 ? s * tau / run : 1;
    }
    for (tau = tauMin; tau <= tauMax; tau++) {
      if (d[tau] < 0.12) { while (tau + 1 <= tauMax && d[tau + 1] < d[tau]) tau++; best = tau; break; }
    }
    if (best < 0) {                                  // no clear dip: take the deepest one, if it is deep enough
      var m = 1; for (tau = tauMin; tau <= tauMax; tau++) if (d[tau] < m) { m = d[tau]; best = tau; }
      if (m > 0.3) return 0;
    }
    var a = d[best - 1], b = d[best], c = d[best + 1], shift = (a + c - 2 * b) ? (a - c) / (2 * (a + c - 2 * b)) : 0;
    if (shift > 1 || shift < -1) shift = 0;
    return sampleRate / (best + shift);
  }
  /* frequency -> nearest note in equal temperament. a4 = reference pitch of A4 */
  function note(freq, a4) {
    var midi = 69 + 12 * Math.log(freq / (a4 || 440)) / Math.LN2, near = Math.round(midi);
    return { midi: near, name: NAMES[((near % 12) + 12) % 12], octave: Math.floor(near / 12) - 1, cents: Math.round((midi - near) * 100), exact: midi };
  }
  function freqOf(midi, a4) { return (a4 || 440) * Math.pow(2, (midi - 69) / 12); }
  function midiOf(name) { var m = /^([A-G]#?)(-?\d)$/.exec(name); return NAMES.indexOf(m[1]) + 12 * (+m[2] + 1); }
  var API = { detect: detect, note: note, freqOf: freqOf, midiOf: midiOf, NAMES: NAMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Pitch = API;
})(typeof window !== 'undefined' ? window : this);
