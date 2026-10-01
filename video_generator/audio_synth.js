/**
 * High-Energy Punchy Soundtrack & SFX Generator for FileKit Promo Video
 * Generates an uncompressed 48,000 Hz 16-bit Stereo WAV file
 * Total Duration: 22.5 seconds
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 48000;
const DURATION = 22.5;
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

const leftChannel = new Float32Array(NUM_SAMPLES);
const rightChannel = new Float32Array(NUM_SAMPLES);

// Utilities
function clamp(val, min = -1, max = 1) {
  return Math.max(min, Math.min(max, val));
}

// -------------------------------------------------------------
// Synthesizer Primitives
// -------------------------------------------------------------

// Kick Drum
function addKick(startTime, volume = 0.8) {
  const kickDuration = 0.35;
  const kickSamples = Math.floor(kickDuration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < kickSamples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 12);
    // Pitch envelope from 160Hz down to 42Hz
    const freq = 42 + 120 * Math.exp(-t * 28);
    const phase = 2 * Math.PI * freq * t;
    const click = (i < 80) ? (Math.random() * 2 - 1) * 0.4 * (1 - i / 80) : 0;
    const sample = (Math.sin(phase) + click) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// Snare / Clap
function addSnare(startTime, volume = 0.5) {
  const snareDuration = 0.22;
  const snareSamples = Math.floor(snareDuration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < snareSamples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const noiseEnv = Math.exp(-t * 18);
    const toneEnv = Math.exp(-t * 25);
    const tone = Math.sin(2 * Math.PI * 185 * t) * toneEnv * 0.5;
    const noise = (Math.random() * 2 - 1) * noiseEnv * 0.8;
    const sample = (tone + noise) * volume;

    leftChannel[startIdx + i] += sample * 0.95;
    rightChannel[startIdx + i] += sample * 1.05;
  }
}

// Hi-Hat
function addHiHat(startTime, open = false, volume = 0.3) {
  const hatDuration = open ? 0.18 : 0.05;
  const hatSamples = Math.floor(hatDuration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);
  const decayRate = open ? 22 : 80;

  for (let i = 0; i < hatSamples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * decayRate);
    const noise = (Math.random() * 2 - 1) * env * volume;

    leftChannel[startIdx + i] += noise * 0.8;
    rightChannel[startIdx + i] += noise * 1.2;
  }
}

// Synth Bass Note
function addBassNote(startTime, duration, freq, volume = 0.4) {
  const noteSamples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < noteSamples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t * 80) * Math.exp(-t * (1.5 / duration));
    // Warm saw + sub sine wave
    const sub = Math.sin(2 * Math.PI * freq * t);
    const saw = ((freq * t) % 1) * 2 - 1;
    const sample = (sub * 0.7 + saw * 0.3) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// Synth Chord / Pluck
function addPluckChord(startTime, freqs, duration = 0.4, volume = 0.25) {
  const chordSamples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < chordSamples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 6);
    let sampleL = 0;
    let sampleR = 0;

    freqs.forEach((f, idx) => {
      const pan = (idx % 2 === 0) ? 0.8 : 1.2;
      const wave = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
      sampleL += wave * env * (volume / freqs.length) * (2 - pan);
      sampleR += wave * env * (volume / freqs.length) * pan;
    });

    leftChannel[startIdx + i] += sampleL;
    rightChannel[startIdx + i] += sampleR;
  }
}

// SFX: Dramatic Sub Boom / Impact
function addSubBoom(startTime, volume = 0.85) {
  const boomDuration = 1.4;
  const boomSamples = Math.floor(boomDuration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < boomSamples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 2.8);
    const freq = 65 * Math.exp(-t * 2.5) + 28;
    const sub = Math.sin(2 * Math.PI * freq * t);
    const rumble = (Math.random() * 2 - 1) * 0.15 * Math.exp(-t * 6);
    const sample = (sub + rumble) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// SFX: Futuristic UI Riser / Whoosh
function addRiserWhoosh(startTime, duration = 0.8, volume = 0.35) {
  const riserSamples = Math.floor(duration * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < riserSamples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const p = t / duration;
    const env = Math.pow(p, 2.2);
    const noise = (Math.random() * 2 - 1) * env * volume;
    const sineFreq = 300 + 1200 * Math.pow(p, 3);
    const sine = Math.sin(2 * Math.PI * sineFreq * t) * env * volume * 0.5;

    leftChannel[startIdx + i] += (noise * (1 - p * 0.5) + sine) * 0.9;
    rightChannel[startIdx + i] += (noise * (0.5 + p * 0.5) + sine) * 1.1;
  }
}

// SFX: UI Click / Key Ticks
function addKeyTick(startTime, pitch = 1800, volume = 0.18) {
  const tickSamples = Math.floor(0.02 * SAMPLE_RATE);
  const startIdx = Math.floor(startTime * SAMPLE_RATE);

  for (let i = 0; i < tickSamples && (startIdx + i) < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 220);
    const sample = Math.sin(2 * Math.PI * pitch * t) * env * volume;

    leftChannel[startIdx + i] += sample;
    rightChannel[startIdx + i] += sample;
  }
}

// SFX: Digital WASM Processing Chirps
function addWasmPulse(startTime, volume = 0.22) {
  const chirpCount = 6;
  for (let c = 0; c < chirpCount; c++) {
    const tStart = startTime + c * 0.07;
    const freq = 1200 + c * 250;
    addKeyTick(tStart, freq, volume * (1 - c * 0.1));
  }
}

// SFX: Success Chime
function addSuccessChime(startTime, volume = 0.4) {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const tNote = startTime + idx * 0.08;
    const duration = 0.6;
    const noteSamples = Math.floor(duration * SAMPLE_RATE);
    const startIdx = Math.floor(tNote * SAMPLE_RATE);

    for (let i = 0; i < noteSamples && (startIdx + i) < NUM_SAMPLES; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 5);
      const sample = Math.sin(2 * Math.PI * freq * t) * env * (volume / notes.length);

      leftChannel[startIdx + i] += sample * (0.8 + idx * 0.1);
      rightChannel[startIdx + i] += sample * (1.2 - idx * 0.1);
    }
  });
}

// -------------------------------------------------------------
// COMPOSITION & SEQUENCING (128 BPM = 0.46875s per beat)
// -------------------------------------------------------------
console.log('Generating punchy promo audio track...');

const BPM = 128;
const BEAT = 60 / BPM; // ~0.46875s
const BAR = BEAT * 4;  // ~1.875s

// --- SECTION 1: INTRO TENSION (0.0s -> 3.2s) ---
// Ambient tension sweep & riser
addRiserWhoosh(0.2, 1.5, 0.4);
// Heavy sub strike hit at 1.7s (scene 1 red strike!)
addSubBoom(1.7, 0.9);
addRiserWhoosh(2.0, 1.2, 0.5);

// --- SECTION 2: MEET FILEKIT & CMD+K (3.2s -> 7.0s) ---
// Entrance hit
addSubBoom(3.2, 0.7);
addPluckChord(3.2, [440, 554.37, 659.25], 0.8, 0.4); // A Maj

// Key ticks for typing "PDF to Word..."
for (let k = 0; k < 12; k++) {
  addKeyTick(4.6 + k * 0.12, 1600 + (k % 4) * 200, 0.15);
}
// Cmd+K palette open pop at 4.2s
addKeyTick(4.2, 2200, 0.35);

// Bassline groove starts entering at 3.75s
for (let t = 3.75; t < 7.0; t += BEAT) {
  addHiHat(t, false, 0.2);
}

// --- SECTION 3: DRAG & DROP + WASM ACCELERATION (7.0s -> 11.5s) ---
// Rhythmic groove full drop!
addRiserWhoosh(6.2, 0.8, 0.45);
addSubBoom(7.0, 0.85);

// 4-on-the-floor kick & snare groove
for (let t = 7.0; t < 19.5; t += BEAT) {
  addKick(t, 0.85);
  // Snare on 2 and 4
  const beatInBar = Math.round((t - 7.0) / BEAT) % 4;
  if (beatInBar === 1 || beatInBar === 3) {
    addSnare(t, 0.55);
  }
  // Offbeat Open Hi-Hat
  addHiHat(t + BEAT / 2, true, 0.28);
  // 16th closed hats
  addHiHat(t + BEAT / 4, false, 0.16);
  addHiHat(t + (3 * BEAT) / 4, false, 0.16);

  // Bass notes
  const bassFreqs = [55, 55, 65.41, 73.42, 55, 49, 55, 82.41];
  const bIdx = Math.floor((t - 7.0) / BEAT) % bassFreqs.length;
  addBassNote(t, BEAT * 0.9, bassFreqs[bIdx], 0.45);
}

// Drag swoosh & drop impact at 8.6s
addRiserWhoosh(7.4, 1.1, 0.4);
addSubBoom(8.6, 0.9); // Drop file thud!
addWasmPulse(8.8, 0.28); // WASM engine chirps
addSuccessChime(10.6, 0.45); // Processing completed chime!

// --- SECTION 4: BENTO GRID CAPABILITIES (11.5s -> 16.0s) ---
// Synth pluck chords synced to beats
const chordProgression = [
  [440, 554.37, 659.25, 880],   // A Maj
  [369.99, 440, 554.37, 739.99],// F# min
  [293.66, 369.99, 440, 587.33],// D Maj
  [329.63, 415.30, 493.88, 659.25] // E Maj
];

for (let i = 0; i < 8; i++) {
  const tChord = 11.5 + i * (BEAT * 2);
  const chords = chordProgression[i % chordProgression.length];
  addPluckChord(tChord, chords, BEAT * 1.8, 0.38);
}

// --- SECTION 5: PRIVACY FORTRESS (16.0s -> 19.0s) ---
addSuccessChime(16.2, 0.4);
addRiserWhoosh(17.8, 1.2, 0.55);

// --- SECTION 6: CLIMAX & OUTRO (19.0s -> 22.0s) ---
addSubBoom(19.0, 1.0); // Epic final impact!
addPluckChord(19.0, [440, 554.37, 659.25, 880, 1108.73], 2.5, 0.55);
addRiserWhoosh(19.6, 0.8, 0.35); // Button shimmer sweep

// Master Limiter / Normalizer
let maxPeak = 0;
for (let i = 0; i < NUM_SAMPLES; i++) {
  if (Math.abs(leftChannel[i]) > maxPeak) maxPeak = Math.abs(leftChannel[i]);
  if (Math.abs(rightChannel[i]) > maxPeak) maxPeak = Math.abs(rightChannel[i]);
}

const normGain = maxPeak > 0 ? (0.95 / maxPeak) : 1;
console.log(`Peak audio level: ${maxPeak.toFixed(3)}, applying gain: ${normGain.toFixed(3)}`);

// Encode to 16-bit PCM WAV
const byteLength = 44 + NUM_SAMPLES * 4;
const wavBuffer = Buffer.alloc(byteLength);

// WAV Header
wavBuffer.write('RIFF', 0);
wavBuffer.writeUInt32LE(byteLength - 8, 4);
wavBuffer.write('WAVE', 8);
wavBuffer.write('fmt ', 12);
wavBuffer.writeUInt32LE(16, 16);           // SubChunk1Size (16 for PCM)
wavBuffer.writeUInt16LE(1, 20);            // AudioFormat (1 for PCM)
wavBuffer.writeUInt16LE(2, 22);            // NumChannels (2 for Stereo)
wavBuffer.writeUInt32LE(SAMPLE_RATE, 24);  // SampleRate
wavBuffer.writeUInt32LE(SAMPLE_RATE * 4, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
wavBuffer.writeUInt16LE(4, 32);            // BlockAlign (NumChannels * BitsPerSample/8)
wavBuffer.writeUInt16LE(16, 34);           // BitsPerSample
wavBuffer.write('data', 36);
wavBuffer.writeUInt32LE(NUM_SAMPLES * 4, 40);

let offset = 44;
for (let i = 0; i < NUM_SAMPLES; i++) {
  // Fade out during last 0.5s
  let fade = 1.0;
  if (i > (NUM_SAMPLES - SAMPLE_RATE * 0.5)) {
    fade = (NUM_SAMPLES - i) / (SAMPLE_RATE * 0.5);
  }

  const sL = clamp(leftChannel[i] * normGain * fade);
  const sR = clamp(rightChannel[i] * normGain * fade);

  const valL = sL < 0 ? sL * 32768 : sL * 32767;
  const valR = sR < 0 ? sR * 32768 : sR * 32767;

  wavBuffer.writeInt16LE(Math.floor(valL), offset);
  wavBuffer.writeInt16LE(Math.floor(valR), offset + 2);
  offset += 4;
}

const outputPath = path.join(__dirname, 'soundtrack.wav');
fs.writeFileSync(outputPath, wavBuffer);
console.log(`✓ Generated pristine audio soundtrack at: ${outputPath} (${(byteLength / 1024 / 1024).toFixed(2)} MB)`);
