(function attachAudio(root) {
  let context = null;
  let enabled = true;
  let volume = 0.45;

  function getContext() {
    if (!context) {
      const AudioContext = root.AudioContext || root.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function tone(frequency, duration, options = {}) {
    if (!enabled) return;
    const audio = getContext();
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + (options.delay || 0);
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * (options.gain || 0.16)), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function noise(duration = 0.08, delay = 0) {
    if (!enabled) return;
    const audio = getContext();
    if (!audio) return;
    const length = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    filter.type = 'highpass';
    filter.frequency.value = 1100;
    gain.gain.value = volume * 0.08;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    source.start(audio.currentTime + delay);
  }

  const effects = {
    click() { tone(480, 0.055, { gain: 0.08, type: 'triangle' }); },
    deal() { noise(0.07); tone(240, 0.06, { gain: 0.04, type: 'triangle' }); },
    flip() { noise(0.11); tone(360, 0.09, { gain: 0.06, type: 'triangle', endFrequency: 520 }); },
    chip() { tone(1250, 0.07, { gain: 0.08, type: 'sine' }); tone(1750, 0.09, { delay: 0.045, gain: 0.06 }); },
    check() { tone(320, 0.06, { gain: 0.07, type: 'triangle' }); tone(290, 0.07, { delay: 0.07, gain: 0.06 }); },
    fold() { tone(280, 0.13, { gain: 0.07, type: 'sine', endFrequency: 150 }); },
    win() { [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.22, { delay: index * 0.09, gain: 0.1, type: 'triangle' })); },
    reward() { [660, 880, 1100].forEach((frequency, index) => tone(frequency, 0.18, { delay: index * 0.07, gain: 0.08 })); },
    error() { tone(160, 0.16, { gain: 0.1, type: 'sawtooth' }); },
  };

  root.GGAudio = {
    play(name) {
      if (effects[name]) effects[name]();
    },
    configure(options) {
      enabled = options.sound !== false;
      volume = Number.isFinite(options.volume) ? Math.max(0, Math.min(1, options.volume)) : volume;
    },
    unlock() { getContext(); },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
