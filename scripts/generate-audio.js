const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const ffmpegPath = require('ffmpeg-static');

const SAMPLE_RATE = 44100;

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const writeWavFile = (samples, filePath) => {
  const byteRate = SAMPLE_RATE * 2;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
};

const writeMp3 = (samples, filePath) => {
  const tempFile = path.join(os.tmpdir(), `xpzito-${Date.now()}-${Math.random()}.wav`);
  writeWavFile(samples, tempFile);
  ensureDir(path.dirname(filePath));
  const result = spawnSync(
    ffmpegPath,
    ['-y', '-f', 'wav', '-i', tempFile, '-codec:a', 'libmp3lame', filePath],
    { stdio: 'inherit' }
  );
  fs.unlinkSync(tempFile);
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed while generating ${filePath}`);
  }
};

const createTone = (frequency, durationSeconds, volume = 0.25) => {
  const totalSamples = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i += 1) {
    const time = i / SAMPLE_RATE;
    const sampleValue = Math.sin(2 * Math.PI * frequency * time) * volume;
    samples[i] = Math.max(-1, Math.min(1, sampleValue)) * 0x7fff;
  }
  return samples;
};

const blendTones = (frequencies, durationSeconds) => {
  const totalSamples = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i += 1) {
    const time = i / SAMPLE_RATE;
    let value = 0;
    frequencies.forEach((frequency, idx) => {
      const volume = 0.2 + idx * 0.1;
      value += Math.sin(2 * Math.PI * frequency * time) * volume;
    });
    value /= frequencies.length;
    samples[i] = Math.max(-1, Math.min(1, value)) * 0x7fff;
  }
  return samples;
};

const projectRoot = path.resolve(__dirname, '..');
const transitionDir = path.join(projectRoot, 'api/public/media/audio/transition');
const randomDir = path.join(projectRoot, 'api/public/media/audio/random');

const assets = [
  {
    file: path.join(transitionDir, 'transition-in.mp3'),
    samples: createTone(440, 1.2)
  },
  {
    file: path.join(transitionDir, 'transition-out.mp3'),
    samples: createTone(220, 1.2)
  },
  {
    file: path.join(randomDir, 'placeholder-01.mp3'),
    samples: blendTones([330, 660, 990], 4)
  },
  {
    file: path.join(randomDir, 'placeholder-02.mp3'),
    samples: blendTones([250, 500, 750], 3.5)
  }
];

assets.forEach(({ file, samples }) => {
  writeMp3(samples, file);
  console.log(`Generated ${file}`);
});
