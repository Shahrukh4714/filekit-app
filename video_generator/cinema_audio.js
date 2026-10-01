/**
 * Cinema Grade 130 BPM Soundtrack & Sound Design Generator for FileKit Master Cut
 * Generates an uncompressed 48,000 Hz 16-bit Stereo WAV file
 * Total Duration: 16.5 seconds
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 48000;
const DURATION = 16.5;
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

const leftChannel = new Float32Array(NUM_SAMPLES);
const rightChannel = new Float32Array(NUM_SAMPLES);

function clamp(v, min = -1, max = 1) {
  return Math.max(min, Math.min(max, v));
}

// -------------------------------------------------------------
// DSP Instruments
// -------------------------------------------------------------

// Punchy 808 Kick
function addKick(startTime, volume = 0.9) {
  const duration = 0.32;
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 15);
    const freq = 48 + 140 * Math.exp(-t * 32);
    const phase = 2 * Math.PI * freq * t;
    const click = (i < 80) ? (Math.random() * 2 - 1) * 0.4 * (1 - i / 80) : 0;
    const sample = (Math.sin(phase) + click) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// Sharp Clap / Snare
function addClap(startTime, volume = 0.6) {
  const duration = 0.2;
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const noiseEnv = Math.exp(-t * 22);
    const toneEnv = Math.exp(-t * 30);
    const tone = Math.sin(2 * Math.PI * 200 * t) * toneEnv * 0.4;
    const noise = (Math.random() * 2 - 1) * noiseEnv * 0.9;
    const sample = (tone + noise) * volume;

    leftChannel[startIdx + i] += sample * 0.95;
    rightChannel[startIdx + i] += sample * 1.05;
  }
}

// Hi-Hat
function addHat(startTime, open = false, volume = 0.3) {
  const duration = open ? 0.16 : 0.04;
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);
  const decayRate = open ? 26 : 90;

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * decayRate);
    const noise = (Math.random() * 2 - 1) * env * volume;

    leftChannel[startIdx + i] += noise * 0.85;
    rightChannel[startIdx + i] += noise * 1.15;
  }
}

// Synth Bass Note
function addBassNote(startTime, duration, freq, volume = 0.5) {
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t * 120) * Math.exp(-t * (1.8 / duration));
    const sub = Math.sin(2 * Math.PI * freq * t);
    const saw = ((freq * t) % 1) * 2 - 1;
    const sample = (sub * 0.75 + saw * 0.25) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// Synth Chord Stabs
function addSynthChord(startTime, freqs, duration = 0.4, volume = 0.32) {
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 6);
    let sampleL = 0;
    let sampleR = 0;

    freqs.forEach((f, idx) => {
      const pan = (idx % 2 === 0) ? 0.8 : 1.2;
      const wave = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(3 * Math.PI * f * t);
      sampleL += wave * env * (volume / freqs.length) * (2 - pan);
      sampleR += wave * env * (volume / freqs.length) * pan;
    });

    leftChannel[startIdx + i] += sampleL;
    rightChannel[startIdx + i] += sampleR;
  }
}

// Heavy Sub Impact
function addSubImpact(startTime, volume = 0.95) {
  const duration = 1.4;
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 2.8);
    const freq = 70 * Math.exp(-t * 3.0) + 28;
    const sub = Math.sin(2 * Math.PI * freq * t);
    const rumble = (Math.random() * 2 - 1) * 0.15 * Math.exp(-t * 6);
    const sample = (sub + rumble) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// Mechanical Shutter / Key Click
function addKeyClick(startTime, pitch = 2400, volume = 0.22) {
  const samples = Math.floor(0.015 * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 320);
    const sample = Math.sin(2 * Math.PI * pitch * t) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// Air Whoosh
function addAirWhoosh(startTime, duration = 0.6, volume = 0.45) {
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const p = t / duration;
    const env = Math.pow(p, 2.0);
    const noise = (Math.random() * 2 - 1) * env * volume;
    const tone = Math.sin(2 * Math.PI * (280 + 1100 * p) * t) * env * volume * 0.4;

    leftChannel[startIdx + i] += (noise + tone) * (1 - p * 0.4);
    rightChannel[startIdx + i] += (noise + tone) * (0.6 + p * 0.4);
  }
}

// Signature Pen Draw
function addPenDraw(startTime, duration = 1.2, volume = 0.25) {
  const samples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const scratch = (Math.random() * 2 - 1) * 0.75 + Math.sin(2 * Math.PI * 3600 * t) * 0.25;
    const mod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 7 * t);
    const sample = scratch * mod * volume;

    leftChannel[startIdx + i] += sample * 0.9;
    rightChannel[startIdx + i] += sample * 1.1;
  }
}

// Success Chime
function addSuccessChime(startTime, volume = 0.45) {
  const freqs = [523.25, 659.25, 783.99, 1046.50];
  freqs.forEach((freq, idx) => {
    const tNote = startTime + idx * 0.06;
    const duration = 0.6;
    const samples = Math.floor(duration * SAMPLE_RATE);
    const startIdx = Math.floor(tNote * SAMPLE_RATE);

    for (let i = 0; i < samples && (startIdx + i) < NUM_SAMPLES; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 5.5);
      const sample = Math.sin(2 * Math.PI * freq * t) * env * (volume / freqs.length);

      leftChannel[startIdx + i] += sample * (0.8 + idx * 0.1);
      rightChannel[startIdx + i] += sample * (1.2 - idx * 0.1);
    }
  });
}

// -------------------------------------------------------------
// COMPOSITION (130 BPM = 0.4615s per beat)
// -------------------------------------------------------------
console.log('Synthesizing 130 BPM master cinema soundtrack...');

const BPM = 130;
const BEAT = 60 / BPM;

// SHOT 1: THE HOOK (0.0s -> 2.2s)
addAirWhoosh(0.1, 1.2, 0.4);
addKeyClick(0.0, 1800, 0.25);
addKeyClick(0.6, 2200, 0.25);
addSubImpact(1.2, 1.0); // "ZERO UPLOADS" impact
addAirWhoosh(1.6, 0.6, 0.5);

// SHOT 2: APERTURE & CMDK (2.2s -> 5.5s)
addSubImpact(2.2, 0.8);
addSynthChord(2.2, [440, 554.37, 659.25], 0.7, 0.5); // A Maj
addKeyClick(3.0, 2600, 0.4); // ⌘K pop

// Rapid typing ticks
for (let k = 0; k < 12; k++) {
  addKeyClick(3.3 + k * 0.1, 1800 + (k % 4) * 200, 0.18);
}

// SHOT 3: DROPZONE & WASM CRUNCH (5.5s -> 9.0s)
addAirWhoosh(5.0, 0.5, 0.5);
addSubImpact(5.5, 0.9);

// Driving 4-on-the-floor groove
for (let t = 5.5; t < 14.5; t += BEAT) {
  addKick(t, 0.9);

  const beatInBar = Math.round((t - 5.5) / BEAT) % 4;
  if (beatInBar === 1 || beatInBar === 3) {
    addClap(t, 0.6);
  }
  // Hi-Hats
  addHat(t + BEAT / 2, true, 0.3);
  addHat(t + BEAT / 4, false, 0.18);
  addHat(t + (3 * BEAT) / 4, false, 0.18);

  // Bass
  const bassFreqs = [55, 55, 65.41, 73.42, 55, 49, 55, 82.41];
  const bIdx = Math.floor((t - 5.5) / BEAT) % bassFreqs.length;
  addBassNote(t, BEAT * 0.9, bassFreqs[bIdx], 0.5);
}

// File drop impact at 6.8s
addAirWhoosh(5.8, 0.8, 0.4);
addSubImpact(6.8, 0.95);
addSuccessChime(8.4, 0.45);

// SHOT 4: 3D DOCUMENT CRAFT (9.0s -> 12.5s)
const chordList = [
  [440, 554.37, 659.25, 880],
  [369.99, 440, 554.37, 739.99],
  [293.66, 369.99, 440, 587.33],
  [329.63, 415.30, 493.88, 659.25]
];
for (let i = 0; i < 7; i++) {
  const tC = 9.0 + i * (BEAT * 2);
  const chords = chordList[i % chordList.length];
  addSynthChord(tC, chords, BEAT * 1.8, 0.42);
}

// Stamp impact at 10.0s
addSubImpact(10.0, 0.75);
// Signature draw at 10.6s
addPenDraw(10.6, 1.2, 0.28);

// SHOT 5: VAULT (12.5s -> 14.5s)
addSuccessChime(12.6, 0.42);
addAirWhoosh(13.8, 0.7, 0.55);

// SHOT 6: CLIMAX (14.5s -> 16.0s)
addSubImpact(14.5, 1.0); // Final climax impact!
addSynthChord(14.5, [440, 554.37, 659.25, 880, 1108.73], 2.2, 0.65);
addAirWhoosh(14.9, 0.7, 0.4);

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
  if (i > (NUM_SAMPLES - SAMPLE_RATE * 0.35)) {
    fade = (NUM_SAMPLES - i) / (SAMPLE_RATE * 0.35);
  }

  const sL = clamp(leftChannel[i] * gain * fade);
  const sR = clamp(rightChannel[i] * gain * fade);

  const vL = sL < 0 ? sL * 32768 : sL * 32767;
  const vR = sR < 0 ? sR * 32768 : sR * 32767;

  buffer.writeInt16LE(Math.floor(vL), offset);
  buffer.writeInt16LE(Math.floor(vR), offset + 2);
  offset += 4;
}

const outAudio = path.join(__dirname, 'cinema_soundtrack.wav');
fs.writeFileSync(outAudio, buffer);
console.log(`✓ Cinema audio rendered at: ${outAudio}`);
