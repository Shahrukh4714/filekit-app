/**
 * Cinema Grade Multi-Track Audio Synthesizer for FileKit Master Promo
 * Generates an uncompressed 48,000 Hz 16-bit Stereo WAV file
 * Total Duration: 21.5 seconds
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 48000;
const DURATION = 21.5;
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

const leftChannel = new Float32Array(NUM_SAMPLES);
const rightChannel = new Float32Array(NUM_SAMPLES);

function clamp(v, min = -1, max = 1) {
  return Math.max(min, Math.min(max, v));
}

// -------------------------------------------------------------
// DSP Instruments
// -------------------------------------------------------------

// Sub Kick
function addSubKick(startTime, volume = 0.85) {
  const duration = 0.35;
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 14);
    const freq = 45 + 130 * Math.exp(-t * 30);
    const phase = 2 * Math.PI * freq * t;
    const click = (i < 90) ? (Math.random() * 2 - 1) * 0.45 * (1 - i / 90) : 0;
    const sample = (Math.sin(phase) + click) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// Snare / Rimshot
function addSnare(startTime, volume = 0.55) {
  const duration = 0.22;
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const noiseEnv = Math.exp(-t * 20);
    const toneEnv = Math.exp(-t * 28);
    const tone = Math.sin(2 * Math.PI * 190 * t) * toneEnv * 0.5;
    const noise = (Math.random() * 2 - 1) * noiseEnv * 0.85;
    const sample = (tone + noise) * volume;

    leftChannel[startIdx + i] += sample * 0.95;
    rightChannel[startIdx + i] += sample * 1.05;
  }
}

// Hi-Hat
function addHiHat(startTime, open = false, volume = 0.28) {
  const duration = open ? 0.18 : 0.05;
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);
  const decayRate = open ? 24 : 85;

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * decayRate);
    const noise = (Math.random() * 2 - 1) * env * volume;

    leftChannel[startIdx + i] += noise * 0.85;
    rightChannel[startIdx + i] += noise * 1.15;
  }
}

// Deep Bass Note
function addBassNote(startTime, duration, freq, volume = 0.45) {
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t * 100) * Math.exp(-t * (1.6 / duration));
    const sub = Math.sin(2 * Math.PI * freq * t);
    const saw = ((freq * t) % 1) * 2 - 1;
    const sample = (sub * 0.75 + saw * 0.25) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// Synth Chord Stabs
function addSynthChord(startTime, freqs, duration = 0.45, volume = 0.3) {
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 5.5);
    let sampleL = 0;
    let sampleR = 0;

    freqs.forEach((f, idx) => {
      const pan = (idx % 2 === 0) ? 0.8 : 1.2;
      const wave = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(3 * Math.PI * f * t);
      sampleL += wave * env * (volume / freqs.length) * (2 - pan);
      sampleR += wave * env * (volume / freqs.length) * pan;
    });

    leftChannel[startIdx + i] += sampleL;
    rightChannel[startIdx + i] += sampleR;
  }
}

// Sub Impact Boom
function addSubImpact(startTime, volume = 0.9) {
  const duration = 1.5;
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 2.5);
    const freq = 68 * Math.exp(-t * 2.8) + 26;
    const sub = Math.sin(2 * Math.PI * freq * t);
    const rumble = (Math.random() * 2 - 1) * 0.12 * Math.exp(-t * 5);
    const sample = (sub + rumble) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// Mechanical Typing Click
function addKeyClick(startTime, pitch = 2200, volume = 0.2) {
  const samples = Math.floor(0.015 * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 300);
    const sample = Math.sin(2 * Math.PI * pitch * t) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// Air Whoosh / Riser
function addAirWhoosh(startTime, duration = 0.7, volume = 0.4) {
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const p = t / duration;
    const env = Math.pow(p, 2.2);
    const noise = (Math.random() * 2 - 1) * env * volume;
    const tone = Math.sin(2 * Math.PI * (250 + 1000 * p) * t) * env * volume * 0.4;

    leftChannel[startIdx + i] += (noise + tone) * (1 - p * 0.4);
    rightChannel[startIdx + i] += (noise + tone) * (0.6 + p * 0.4);
  }
}

// Pen Signature Draw SFX
function addPenDraw(startTime, duration = 1.2, volume = 0.22) {
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const scratch = (Math.random() * 2 - 1) * 0.7 + Math.sin(2 * Math.PI * 3400 * t) * 0.3;
    const mod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 6 * t);
    const sample = scratch * mod * volume;

    leftChannel[startIdx + i] += sample * 0.9;
    rightChannel[startIdx + i] += sample * 1.1;
  }
}

// Success Chime
function addSuccessArp(startTime, volume = 0.4) {
  const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  freqs.forEach((freq, idx) => {
    const tNote = startTime + idx * 0.07;
    const duration = 0.6;
    const samples = Math.floor(duration * SAMPLE_RATE);
    const startIdx = Math.floor(tNote * SAMPLE_RATE);

    for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 5.2);
      const sample = Math.sin(2 * Math.PI * freq * t) * env * (volume / freqs.length);

      leftChannel[startIdx + i] += sample * (0.8 + idx * 0.1);
      rightChannel[startIdx + i] += sample * (1.2 - idx * 0.1);
    }
  });
}

// -------------------------------------------------------------
// TRACK COMPOSITION (128 BPM = 0.46875s per beat)
// -------------------------------------------------------------
console.log('Composing cinema-grade promo soundtrack...');

const BPM = 128;
const BEAT = 60 / BPM;

// --- ACT 1: THE MANIFESTO (0.0s -> 3.0s) ---
addAirWhoosh(0.1, 1.4, 0.4);
addKeyClick(0.3, 1800, 0.2);
addKeyClick(0.7, 2400, 0.2);
addSubImpact(1.0, 0.9); // Bass impact on "NONE OF OUR BUSINESS"
addAirWhoosh(2.2, 0.8, 0.5);

// --- ACT 2: THE COMMAND DECK & CMDK (3.0s -> 6.5s) ---
addSubImpact(3.0, 0.75);
addSynthChord(3.0, [440, 554.37, 659.25], 0.8, 0.45); // A Maj
addKeyClick(3.8, 2600, 0.35); // ⌘K pop

// Mechanical typing sequence
for (let k = 0; k < 14; k++) {
  addKeyClick(4.2 + k * 0.11, 1700 + (k % 4) * 220, 0.16);
}

// Rhythm groove starts
for (let t = 3.75; t < 6.5; t += BEAT) {
  addHiHat(t, false, 0.2);
}

// --- ACT 3: THE DROPZONE & WASM SPEED (6.5s -> 11.0s) ---
// High energy drop!
addAirWhoosh(5.8, 0.7, 0.5);
addSubImpact(6.5, 0.85);

for (let t = 6.5; t < 18.5; t += BEAT) {
  addSubKick(t, 0.85);

  const beatInBar = Math.round((t - 6.5) / BEAT) % 4;
  if (beatInBar === 1 || beatInBar === 3) {
    addSnare(t, 0.55);
  }
  // Hi-Hats
  addHiHat(t + BEAT / 2, true, 0.28);
  addHiHat(t + BEAT / 4, false, 0.16);
  addHiHat(t + (3 * BEAT) / 4, false, 0.16);

  // Bassline
  const bassFreqs = [55, 55, 65.41, 73.42, 55, 49, 55, 82.41];
  const bIdx = Math.floor((t - 6.5) / BEAT) % bassFreqs.length;
  addBassNote(t, BEAT * 0.9, bassFreqs[bIdx], 0.45);
}

// File drop impact & WASM acceleration
addAirWhoosh(7.2, 0.9, 0.4);
addSubImpact(8.2, 0.9); // File drop thud!
addSuccessArp(10.2, 0.45); // WASM 100% complete chime!

// --- ACT 4: 3D DOCUMENT STUDIO (11.0s -> 15.0s) ---
const chordList = [
  [440, 554.37, 659.25, 880],
  [369.99, 440, 554.37, 739.99],
  [293.66, 369.99, 440, 587.33],
  [329.63, 415.30, 493.88, 659.25]
];
for (let i = 0; i < 8; i++) {
  const tC = 11.0 + i * (BEAT * 2);
  const chords = chordList[i % chordList.length];
  addSynthChord(tC, chords, BEAT * 1.8, 0.4);
}

// Watermark stamp impact at 12.2s
addSubImpact(12.2, 0.7);
// Signature draw swoosh from 12.8s
addPenDraw(12.8, 1.3, 0.25);

// --- ACT 5: ZERO CLOUD VAULT (15.0s -> 18.0s) ---
addSuccessArp(15.2, 0.4);
addAirWhoosh(17.2, 0.9, 0.55);

// --- ACT 6: CLIMAX & CTA (18.0s -> 21.0s) ---
addSubImpact(18.1, 1.0); // Epic climax drop!
addSynthChord(18.1, [440, 554.37, 659.25, 880, 1108.73], 2.8, 0.6);
addAirWhoosh(18.7, 0.8, 0.4); // CTA sweep

// Master Normalizer
let maxPeak = 0;
for (let i = 0; i < NUM_SAMPLES; i++) {
  if (Math.abs(leftChannel[i]) > maxPeak) maxPeak = Math.abs(leftChannel[i]);
  if (Math.abs(rightChannel[i]) > maxPeak) maxPeak = Math.abs(rightChannel[i]);
}

const gain = maxPeak > 0 ? (0.95 / maxPeak) : 1;
console.log(`Peak: ${maxPeak.toFixed(3)}, Master Gain: ${gain.toFixed(3)}`);

const byteLen = 44 + NUM_SAMPLES * 4;
const buffer = Buffer.alloc(byteLen);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(byteLen - 8, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 4, 28);
buffer.writeUInt16LE(4, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(NUM_SAMPLES * 4, 40);

let offset = 44;
for (let i = 0; i < NUM_SAMPLES; i++) {
  let fade = 1.0;
  if (i > (NUM_SAMPLES - SAMPLE_RATE * 0.4)) {
    fade = (NUM_SAMPLES - i) / (SAMPLE_RATE * 0.4);
  }

  const sL = clamp(leftChannel[i] * gain * fade);
  const sR = clamp(rightChannel[i] * gain * fade);

  const vL = sL < 0 ? sL * 32768 : sL * 32767;
  const vR = sR < 0 ? sR * 32768 : sR * 32767;

  buffer.writeInt16LE(Math.floor(vL), offset);
  buffer.writeInt16LE(Math.floor(vR), offset + 2);
  offset += 4;
}

const outAudio = path.join(__dirname, 'soundtrack2.wav');
fs.writeFileSync(outAudio, buffer);
console.log(`✓ Master audio rendered at: ${outAudio}`);
