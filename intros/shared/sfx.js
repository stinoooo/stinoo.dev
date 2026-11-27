// Cinematic terminal sound for stinoo.dev, synthesized live with the Web Audio API: no audio files.
//
// Film hacking and HUD scenes layer a few things, and this does the same:
//   * text chatter: every character that prints gets a short glassy FM "tick" (Iron Man, Oblivion)
//   * computing: rapid random FM bleeps, the Nostromo / WarGames mainframe thinking out loud
//   * glitch: stuttering grains of filtered noise, the digital tearing on a cut
//   * risers and hits: noise and pitch swelling into a sub-bass "braam" on the big moments
//   * access granted: a bell arpeggio with echoes; access denied: a buzzing detuned saw
//   * a dark drone bed with a slowly moving filter, and a far-off machine now and then
// Everything runs through a ping-pong delay and a room reverb, then a compressor and a limiter.
//
// Browsers only start audio after a click or key press, so nothing plays before that. The toggle
// in the header mutes everything, and the choice is remembered.

const KEY = "stinoo.sound";
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22]; // minor pentatonic: dark, never clashes
const ROOT = 57; // A3
let ctx = null;
let bus = null;
let sends = null;
let noise = null;
let bed = null;
let on = true;
let unlocked = false;
const last = new Map();
const listeners = new Set();

try {
  on = localStorage.getItem(KEY) !== "off";
} catch {}

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const note = (octave = 2) => hz(ROOT + 12 * octave + pick(SCALE));

function impulse(seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let k = 0; k < len; k++) data[k] = (Math.random() * 2 - 1) * (1 - k / len) ** decay;
  }
  return buffer;
}

function setup() {
  if (ctx) return ctx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  ctx = new Ctx({ latencyHint: "interactive" });

  // output: glue compressor -> limiter -> speakers
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.knee.value = 10;
  glue.ratio.value = 3;
  glue.attack.value = 0.005;
  glue.release.value = 0.2;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -3;
  limit.knee.value = 0;
  limit.ratio.value = 20;
  limit.attack.value = 0.001;
  limit.release.value = 0.08;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  glue.connect(limit).connect(master).connect(ctx.destination);

  bus = ctx.createGain();
  bus.connect(glue);

  // ping-pong delay, darkened so the echoes sit behind the dry sound
  const delayIn = ctx.createGain();
  const left = ctx.createDelay(1);
  const right = ctx.createDelay(1);
  left.delayTime.value = 0.135;
  right.delayTime.value = 0.2;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const dark = ctx.createBiquadFilter();
  dark.type = "lowpass";
  dark.frequency.value = 3200;
  const merge = ctx.createChannelMerger(2);
  delayIn.connect(dark).connect(left);
  left.connect(right);
  right.connect(fb).connect(left);
  left.connect(merge, 0, 0);
  right.connect(merge, 0, 1);
  merge.connect(glue);

  // room reverb
  const verbIn = ctx.createGain();
  const verb = ctx.createConvolver();
  verb.buffer = impulse(2.2, 2.6);
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.9;
  verbIn.connect(verb).connect(verbOut).connect(glue);
  sends = { delay: delayIn, verb: verbIn };

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let k = 0; k < data.length; k++) data[k] = Math.random() * 2 - 1;
  noise = buffer;
  return ctx;
}

// Route a node to the dry bus plus some delay and reverb.
function out(node, { pan = 0, delay = 0.15, verb = 0.2 } = {}) {
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  node.connect(p);
  p.connect(bus);
  if (delay) {
    const g = ctx.createGain();
    g.gain.value = delay;
    p.connect(g).connect(sends.delay);
  }
  if (verb) {
    const g = ctx.createGain();
    g.gain.value = verb;
    p.connect(g).connect(sends.verb);
  }
}

function envelope(t, { attack = 0.002, hold = 0, decay = 0.05, peak = 0.1 }) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
  return g;
}

/** FM voice: a sine carrier bent by a sine modulator whose depth falls away, from bright to pure. */
function fm({ f, at = 0, ratio = 2, index = 3, fall = 0.03, decay = 0.08, attack = 0.002, peak = 0.08, glide = 0, pan = 0, delay = 0.15, verb = 0.2 }) {
  const t = ctx.currentTime + at;
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const depth = ctx.createGain();
  car.frequency.setValueAtTime(f, t);
  if (glide) car.frequency.exponentialRampToValueAtTime(f * glide, t + attack + decay);
  mod.frequency.setValueAtTime(f * ratio, t);
  depth.gain.setValueAtTime(f * index, t);
  depth.gain.exponentialRampToValueAtTime(Math.max(1, f * 0.02), t + fall);
  mod.connect(depth).connect(car.frequency);
  const env = envelope(t, { attack, decay, peak });
  car.connect(env);
  out(env, { pan, delay, verb });
  const end = t + attack + decay + 0.05;
  car.start(t);
  mod.start(t);
  car.stop(end);
  mod.stop(end);
}

function osc({ type = "sine", f, to, at = 0, attack = 0.005, hold = 0, decay = 0.2, peak = 0.1, cutoff = 0, q = 0.7, pan = 0, delay = 0, verb = 0.2, detune = 0 }) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  o.type = type;
  o.detune.value = detune;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + hold + decay);
  let head = o;
  if (cutoff) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    lp.Q.value = q;
    head = head.connect(lp);
  }
  const env = envelope(t, { attack, hold, decay, peak });
  head.connect(env);
  out(env, { pan, delay, verb });
  o.start(t);
  o.stop(t + attack + hold + decay + 0.05);
}

function hiss({ at = 0, attack = 0.002, hold = 0, decay = 0.03, peak = 0.1, type = "bandpass", f = 3000, to = 0, q = 1, pan = 0, delay = 0, verb = 0.15 }) {
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(f, t);
  if (to) filter.frequency.exponentialRampToValueAtTime(to, t + attack + hold + decay);
  filter.Q.value = q;
  const env = envelope(t, { attack, hold, decay, peak });
  src.connect(filter).connect(env);
  out(env, { pan, delay, verb });
  src.start(t, Math.random() * 1.5);
  src.stop(t + attack + hold + decay + 0.05);
}

function unlock() {
  if (!on) return;
  const c = setup();
  if (!c) return;
  const fresh = !unlocked;
  if (c.state === "suspended") c.resume().catch(() => {});
  unlocked = true;
  if (fresh)
    setTimeout(() => {
      startBed();
      sfx.boot();
    }, 60);
}

for (const type of ["pointerdown", "keydown", "touchend"]) window.addEventListener(type, unlock, { capture: true, passive: true });

// Same-origin navigations after a click usually keep permission to play: try straight away.
if (on) {
  try {
    const c = setup();
    c?.resume()
      .then(() => {
        if (c.state === "running" && !unlocked) {
          unlocked = true;
          startBed();
          sfx.arrive();
        }
      })
      .catch(() => {});
  } catch {}
}

function ready(name, gap = 0) {
  if (!on || !ctx || ctx.state !== "running") return false;
  const now = performance.now();
  if (gap && now - (last.get(name) || 0) < gap) return false;
  last.set(name, now);
  return true;
}

// The bed: a dark detuned drone whose filter breathes slowly, plus a distant machine thinking.
function startBed() {
  if (bed || !ctx || !on) return;
  const t = ctx.currentTime;
  const level = ctx.createGain();
  level.gain.setValueAtTime(0.0001, t);
  level.gain.exponentialRampToValueAtTime(1, t + 4);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 260;
  lp.Q.value = 3;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 160;
  lfo.connect(lfoDepth).connect(lp.frequency);
  const voices = [
    [hz(ROOT - 24), -7, 0.05],
    [hz(ROOT - 24), 7, 0.05],
    [hz(ROOT - 17), 4, 0.03],
    [hz(ROOT - 12), -3, 0.02],
  ].map(([f, detune, g]) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.detune.value = detune;
    const gain = ctx.createGain();
    gain.gain.value = g;
    o.connect(gain).connect(lp);
    o.start();
    return o;
  });
  const air = ctx.createBufferSource();
  air.buffer = noise;
  air.loop = true;
  const airBand = ctx.createBiquadFilter();
  airBand.type = "bandpass";
  airBand.frequency.value = 900;
  airBand.Q.value = 0.6;
  const airGain = ctx.createGain();
  airGain.gain.value = 0.004;
  air.connect(airBand).connect(airGain).connect(level);
  air.start();
  lfo.start();
  // kept far back, and without the sub-bass laptops cannot play anyway
  const pad = ctx.createGain();
  pad.gain.value = 0.07;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 75;
  lp.connect(hp).connect(pad).connect(level);
  out(level, { delay: 0, verb: 0.4 });
  const machine = setInterval(() => {
    if (document.hidden || !ready("machine")) return;
    const n = 3 + Math.floor(Math.random() * 7);
    const pan = rand(-0.9, 0.9);
    for (let k = 0; k < n; k++) fm({ f: note(2), at: k * rand(0.05, 0.09), ratio: 2, index: 1.5, decay: 0.05, peak: 0.012, pan, delay: 0.4, verb: 0.7 });
  }, 4300);
  const onVisible = () => level.gain.setTargetAtTime(document.hidden ? 0.0001 : 1, ctx.currentTime, 0.4);
  document.addEventListener("visibilitychange", onVisible);
  bed = {
    stop() {
      clearInterval(machine);
      document.removeEventListener("visibilitychange", onVisible);
      level.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
      const end = ctx.currentTime + 1.5;
      [...voices, air, lfo].forEach((o) => o.stop(end));
    },
  };
}

function stopBed() {
  bed?.stop();
  bed = null;
}

export const sfx = {
  /** A character printing: a short glassy FM tick, with a hint of key click. */
  key(ch = "") {
    if (!ready("key", 18)) return;
    if (ch === " ") return hiss({ decay: 0.012, peak: 0.05, f: 1800, q: 1.5 });
    fm({ f: note(3), ratio: pick([2, 3, 3.5]), index: rand(2, 4), fall: 0.015, decay: 0.035, peak: 0.07, pan: rand(-0.35, 0.35), delay: 0.12, verb: 0.12 });
    hiss({ decay: 0.006, peak: 0.06, type: "highpass", f: 6500 });
  },
  /** Return: command accepted, a rising chirp with an echo. */
  enter() {
    if (!ready("enter", 60)) return;
    fm({ f: hz(ROOT + 24), glide: 2, ratio: 1.5, index: 2, decay: 0.07, peak: 0.1, delay: 0.3 });
    fm({ f: hz(ROOT + 31), at: 0.06, ratio: 3, index: 1.5, decay: 0.12, peak: 0.06, delay: 0.3 });
  },
  /** A line of output: one quiet readout bleep. */
  line() {
    if (!ready("line", 40)) return;
    fm({ f: note(3), ratio: 2, index: 1.2, decay: 0.03, peak: 0.04, pan: rand(-0.5, 0.5), delay: 0.2, verb: 0.15 });
  },
  /** Computing: a run of random bleeps bouncing left and right over a sweeping hiss. */
  data(ms = 260) {
    if (!ready("data", 250)) return;
    const n = Math.max(4, Math.round(ms / 32));
    for (let k = 0; k < n; k++) fm({ f: note(pick([2, 3])), at: k * 0.032, ratio: pick([1, 2, 4]), index: rand(0.5, 3), decay: 0.028, peak: 0.045, pan: k % 2 ? 0.45 : -0.45, delay: 0.18, verb: 0.1 });
    hiss({ attack: 0.02, hold: ms / 1000 - 0.04, decay: 0.05, peak: 0.018, f: 2000, to: 6000, q: 4 });
  },
  /** Digital tearing: stuttering grains of filtered noise and a crushed chirp. */
  glitch(grains = 8) {
    if (!ready("glitch", 120)) return;
    let at = 0;
    for (let k = 0; k < grains; k++) {
      hiss({ at, decay: rand(0.006, 0.02), peak: rand(0.04, 0.09), f: rand(400, 7000), q: rand(4, 12), pan: rand(-0.7, 0.7), verb: 0.05 });
      at += rand(0.008, 0.03);
    }
    osc({ type: "square", f: rand(300, 900), to: rand(2000, 4000), decay: 0.05, peak: 0.025, cutoff: 5000, verb: 0.05 });
  },
  /** A small tick for moving through a list; `step` walks it up the scale, like a dial clicking round. */
  tick(step = null) {
    if (!ready("tick", 35)) return;
    const n = step === null ? 36 : 24 + SCALE[((step % SCALE.length) + SCALE.length) % SCALE.length];
    fm({ f: hz(ROOT + n), ratio: 3.5, index: 1, decay: 0.025, peak: 0.04, delay: 0.12, verb: 0.08, pan: step === null ? 0 : Math.sin(step) * 0.3 });
    hiss({ decay: 0.005, peak: 0.03, type: "highpass", f: 7000, verb: 0 });
  },
  /** Choosing something: a two-note lock-in and the machine fetching it. */
  select() {
    if (!ready("select", 120)) return;
    fm({ f: hz(ROOT + 24), ratio: 2, index: 2, decay: 0.05, peak: 0.06, delay: 0.2 });
    fm({ f: hz(ROOT + 31), at: 0.05, ratio: 3.5, index: 2, fall: 0.08, decay: 0.18, peak: 0.055, delay: 0.3, verb: 0.3 });
    hiss({ at: 0.02, attack: 0.04, decay: 0.12, peak: 0.03, f: 1200, to: 5000, q: 2, verb: 0.2 });
  },
  /** A screenshot sliding to the next one: a soft swipe. */
  slide() {
    if (!ready("slide", 200)) return;
    hiss({ attack: 0.05, decay: 0.16, peak: 0.016, f: 2500, to: 900, q: 1.2, pan: 0.3, verb: 0.2 });
  },
  /** The project list forming: ticks fanning out along the circle, low to high. */
  form(count = 10) {
    if (!ready("form", 800)) return;
    const n = Math.min(count, 14);
    for (let k = 0; k < n; k++) fm({ f: hz(ROOT + 12 + SCALE[k % SCALE.length] + 12 * Math.floor(k / SCALE.length)), at: k * 0.045, ratio: 3.5, index: 1.2, decay: 0.05, peak: 0.045, pan: -0.6 + (1.2 * k) / Math.max(1, n - 1), delay: 0.25, verb: 0.2 });
  },
  /** A round tile opening on the intro, like an iris: a rising glassy shimmer over a soft swell. */
  iris() {
    if (!ready("iris", 400)) return;
    for (let k = 0; k < 6; k++) fm({ f: hz(ROOT + 24 + SCALE[k + 2]), at: k * 0.035, ratio: 2, index: 1.5, decay: 0.14, peak: 0.05, pan: k % 2 ? 0.4 : -0.4, delay: 0.3, verb: 0.35 });
    hiss({ attack: 0.12, decay: 0.2, peak: 0.05, f: 800, to: 4000, q: 3, verb: 0.3 });
  },
  /** The code wall dissolving outward: a granular rain of tiny high grains thinning out. */
  dissolve(seconds = 0.7) {
    if (!ready("dissolve", 600)) return;
    const n = 60;
    for (let k = 0; k < n; k++) {
      const t = (k / n) ** 1.4 * seconds;
      hiss({ at: t, decay: rand(0.004, 0.014), peak: 0.09 * (1 - k / n) + 0.02, f: rand(3000, 9000), q: rand(5, 14), pan: rand(-0.9, 0.9), verb: 0.15 });
    }
    osc({ type: "sawtooth", f: hz(ROOT + 12), to: hz(ROOT - 12), decay: seconds, peak: 0.04, cutoff: 900, verb: 0.3 });
  },
  /** Being pulled into the circle: an accelerating vacuum swell that tightens to a point. */
  dive(seconds = 1.2) {
    if (!ready("dive", 800)) return;
    const t = ctx.currentTime;
    // noise rushing in, its band closing upward as the zoom speeds up
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.setValueAtTime(1, t);
    band.Q.exponentialRampToValueAtTime(9, t + seconds);
    band.frequency.setValueAtTime(220, t);
    band.frequency.exponentialRampToValueAtTime(7000, t + seconds);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.3, t + seconds * 0.92);
    env.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.06);
    src.connect(band).connect(env);
    out(env, { delay: 0.1, verb: 0.35 });
    src.start(t);
    src.stop(t + seconds + 0.1);
    // a tone spiralling up with a tremolo that gets faster, like spinning into the centre
    const tone = ctx.createOscillator();
    tone.type = "sawtooth";
    tone.frequency.setValueAtTime(55, t);
    tone.frequency.exponentialRampToValueAtTime(880, t + seconds);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(4000, t + seconds);
    const trem = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(3, t);
    lfo.frequency.exponentialRampToValueAtTime(28, t + seconds);
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.5;
    trem.gain.value = 0.5;
    lfo.connect(lfoDepth).connect(trem.gain);
    const level = ctx.createGain();
    level.gain.setValueAtTime(0.0001, t);
    level.gain.exponentialRampToValueAtTime(0.13, t + seconds * 0.95);
    level.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.05);
    tone.connect(lp).connect(trem).connect(level);
    out(level, { delay: 0.15, verb: 0.3 });
    tone.start(t);
    lfo.start(t);
    tone.stop(t + seconds + 0.1);
    lfo.stop(t + seconds + 0.1);
  },
  /** Arriving in the editor: a low hit, the screen materializing, and the ready chime. */
  arrive() {
    if (!ready("arrive", 1500)) return;
    last.delete("hit");
    sfx.hit(0.8);
    hiss({ attack: 0.005, decay: 0.5, peak: 0.05, f: 6000, to: 400, q: 1, verb: 0.4 });
    [12, 19, 24].forEach((n, k) => fm({ f: hz(ROOT + 12 + n), at: 0.18 + k * 0.08, ratio: 3.5, index: 2, fall: 0.15, decay: 0.45, peak: 0.045, delay: 0.35, verb: 0.4 }));
  },
  /** Low impact: a sub drop with a thump, the "braam" under a reveal. */
  hit(scale = 1) {
    if (!ready("hit", 300)) return;
    osc({ f: 110, to: 34, attack: 0.004, decay: 0.9, peak: 0.3 * scale, verb: 0.3 });
    // a mid "thud" so the hit still lands on laptop and phone speakers
    osc({ type: "triangle", f: 240, to: 90, attack: 0.002, decay: 0.16, peak: 0.12 * scale, verb: 0.25 });
    osc({ type: "sawtooth", f: hz(ROOT - 24), attack: 0.01, decay: 1.2, peak: 0.08 * scale, cutoff: 400, q: 2, verb: 0.6, detune: -8 });
    osc({ type: "sawtooth", f: hz(ROOT - 24), attack: 0.01, decay: 1.2, peak: 0.08 * scale, cutoff: 400, q: 2, verb: 0.6, detune: 8 });
    hiss({ decay: 0.18, peak: 0.12 * scale, type: "lowpass", f: 900, to: 120, verb: 0.4 });
  },
  /** Something rising: a filtered noise swell and a climbing tone. */
  rise(seconds = 0.8) {
    if (!ready("rise", 300)) return;
    hiss({ attack: seconds * 0.9, decay: 0.06, peak: 0.07, f: 300, to: 7000, q: 6, verb: 0.3 });
    osc({ type: "sawtooth", f: 80, to: 900, attack: seconds * 0.9, decay: 0.06, peak: 0.035, cutoff: 1800, q: 4, verb: 0.3 });
  },
  /** A window opening: tear, whoosh and a soft thump. */
  open() {
    if (!ready("open", 150)) return;
    sfx.glitch(6);
    hiss({ attack: 0.05, decay: 0.25, peak: 0.07, f: 500, to: 6000, q: 1.5, verb: 0.3 });
    osc({ f: 150, to: 50, decay: 0.25, peak: 0.15, verb: 0.2 });
  },
  /** Closing: the whoosh going down. */
  close() {
    if (!ready("close", 150)) return;
    hiss({ attack: 0.02, decay: 0.3, peak: 0.06, f: 6000, to: 400, q: 1.5, verb: 0.3 });
    fm({ f: hz(ROOT + 19), glide: 0.5, ratio: 2, index: 2, decay: 0.2, peak: 0.04, delay: 0.3 });
  },
  /** Leaving the intro for the editor: a short rise into a hit. */
  transition() {
    if (!ready("transition", 800)) return;
    sfx.rise(0.55);
    setTimeout(() => {
      last.delete("hit");
      sfx.hit(0.8);
      last.delete("glitch");
      sfx.glitch(10);
    }, 520);
  },
  /** A face scan starting: a riser, radar pings speeding up, and the machine computing. */
  scan() {
    if (!ready("scan", 800)) return;
    sfx.rise(1.1);
    let at = 0;
    for (let k = 0; k < 8; k++) {
      fm({ f: hz(ROOT + 27), at, ratio: 1, index: 0.3, attack: 0.002, decay: 0.12, peak: 0.05, delay: 0.25, verb: 0.3 });
      at += 0.17 * 0.84 ** k;
    }
    setTimeout(() => {
      last.delete("data");
      sfx.data(500);
    }, 250);
  },
  /** Locked on, access granted: a bell arpeggio over a low hit. */
  lock() {
    if (!ready("lock", 400)) return;
    last.delete("hit");
    sfx.hit(0.5);
    [0, 7, 12, 19].forEach((n, k) => fm({ f: hz(ROOT + 24 + n), at: k * 0.07, ratio: 3.5, index: 2.5, fall: 0.2, attack: 0.003, decay: 0.6, peak: 0.06, delay: 0.35, verb: 0.4 }));
  },
  /** A new color scheme: a glitch and a quick bell run. */
  theme() {
    if (!ready("theme", 150)) return;
    last.delete("glitch");
    sfx.glitch(5);
    [0, 3, 7, 10, 12].forEach((n, k) => fm({ f: hz(ROOT + 24 + n), at: 0.05 + k * 0.035, ratio: 2, index: 2, decay: 0.09, peak: 0.06, delay: 0.25 }));
  },
  /** Access denied: a buzzing, beating low saw. */
  error() {
    if (!ready("error", 300)) return;
    for (const detune of [-30, 30]) osc({ type: "sawtooth", f: hz(ROOT - 12), attack: 0.005, hold: 0.18, decay: 0.12, peak: 0.08, cutoff: 1100, q: 3, detune, verb: 0.15 });
    osc({ type: "square", f: hz(ROOT - 13), at: 0.2, attack: 0.005, hold: 0.12, decay: 0.15, peak: 0.05, cutoff: 900, verb: 0.15 });
  },
  /** System online: a hit, the machine waking up, and the ready chime. */
  boot() {
    if (!ready("boot", 1500)) return;
    last.delete("hit");
    sfx.hit(0.9);
    for (let k = 0; k < 12; k++) fm({ f: note(pick([2, 3])), at: 0.25 + k * 0.035, ratio: pick([1, 2, 3]), index: 2, decay: 0.03, peak: 0.035, pan: rand(-0.6, 0.6), delay: 0.2 });
    [12, 19, 24].forEach((n, k) => fm({ f: hz(ROOT + 12 + n), at: 0.75 + k * 0.09, ratio: 3.5, index: 2, fall: 0.15, decay: 0.5, peak: 0.05, delay: 0.35, verb: 0.4 }));
  },
  get on() {
    return on;
  },
  set(next) {
    on = Boolean(next);
    try {
      localStorage.setItem(KEY, on ? "on" : "off");
    } catch {}
    if (on) {
      const c = setup();
      c?.resume().catch(() => {});
      unlocked = true;
      setTimeout(() => {
        startBed();
        last.delete("boot");
        sfx.boot();
      }, 60);
    } else {
      stopBed();
      setTimeout(() => ctx?.suspend().catch(() => {}), 400);
    }
    listeners.forEach((fn) => fn(on));
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/** Wires a header button that shows and flips the sound state. */
export function soundToggle(button) {
  if (!button) return;
  const paint = () => {
    button.textContent = sfx.on ? "sound on" : "sound off";
    button.setAttribute("aria-pressed", String(sfx.on));
    button.setAttribute("aria-label", sfx.on ? "Sound is on. Turn it off" : "Sound is off. Turn it on");
  };
  paint();
  sfx.onChange(paint);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    sfx.set(!sfx.on);
  });
}
