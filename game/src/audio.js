/** Original press sounds, built from short oscillators and a seeded noise buffer. */
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let playing = false;
  let lastBeat = -1;
  let closed = false;
  const voices = new Set();

  function gainForState() {
    if (!context || !master) return;
    master.gain.setTargetAtTime(muted ? 0 : 0.34, context.currentTime, 0.025);
  }

  async function unlock() {
    if (closed) return false;
    try {
      if (!context) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return false;
        context = new Audio({ latencyHint: 'interactive' });
        master = context.createGain();
        master.gain.value = muted ? 0 : 0.34;
        master.connect(context.destination);
      }
      if (context.state === 'suspended') await context.resume();
      return context.state === 'running';
    } catch {
      return false;
    }
  }

  function available() {
    return context && !closed && !muted && context.state === 'running' && voices.size < 18;
  }

  function tone(frequency, duration = 0.09, volume = 0.09, kind = 'triangle', delay = 0, endFrequency = frequency) {
    if (!available()) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = kind;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    voices.add(oscillator);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.015);
  }

  function paper(duration = 0.07, volume = 0.05, filterFrequency = 1700) {
    if (!available()) return;
    const frames = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 104729;
    for (let index = 0; index < frames; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[index] = (seed / 2147483648 - 1) * (1 - index / frames);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    filter.Q.value = 0.65;
    envelope.gain.value = volume;
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    voices.add(source);
    source.onended = () => {
      voices.delete(source);
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
    source.start();
  }

  function chord(notes, volume = 0.085) {
    notes.forEach((note, index) => tone(note, 0.20, volume, 'triangle', index * 0.065));
  }

  function event(value) {
    const type = typeof value === 'string' ? value : value?.type;
    if (!available()) return;
    if (type === 'ink') {
      tone([330, 415.3, 493.9][value?.ink ?? 0], 0.065, 0.09);
      paper(0.025, 0.035, 2100);
    } else if (type === 'route' || type === 'select-lane') {
      tone(190, 0.065, 0.10, 'triangle', 0, 260);
    } else if (type === 'stamp' || type === 'stamp-sheet') {
      tone(120, 0.07, 0.13, 'triangle', 0, 70);
      paper(0.065, 0.075, 950);
    } else if (type === 'print') {
      paper(0.045, 0.025, 2800);
    } else if (type === 'ship') {
      chord([523.25, 659.25], 0.07);
      paper(0.09, 0.04, 1250);
    } else if (type === 'spoil') {
      tone(235, 0.20, 0.075, 'triangle', 0, 117.5);
    } else if (type === 'recycle') {
      paper(0.15, 0.065, 2400);
      tone(147, 0.08, 0.07);
    } else if (type === 'brake') {
      tone(260, 0.23, 0.055, 'sine', 0, 95);
    } else if (type === 'upgrade' || type === 'shift-complete') {
      chord([392, 493.88, 587.33, 783.99]);
    } else if (type === 'victory') {
      chord([392, 523.25, 659.25, 783.99, 1046.5], 0.11);
    } else if (type === 'failure') {
      chord([293.66, 246.94, 196], 0.08);
    } else if (type === 'start' || type === 'shift-start' || type === 'resume') {
      chord([261.63, 329.63, 392], 0.065);
    } else if (type === 'pause' || type === 'click') {
      tone(440, 0.05, 0.045, 'sine');
    }
  }

  /** Called by the frame loop; no interval or background audio process is created. */
  function update(state) {
    playing = state?.stage === 'play';
    if (!available() || !playing) {
      lastBeat = -1;
      return;
    }
    const elapsed = Math.max(0, (state.level?.duration || 60) - (state.stats?.timeRemaining || 0));
    const beat = Math.floor(elapsed / 0.55);
    if (beat === lastBeat) return;
    lastBeat = beat;
    // A quiet alternating press pulse gives the belts a rhythm without masking feedback.
    tone(beat % 4 === 0 ? 65.41 : 98, 0.075, 0.025, 'sine');
    if (beat % 2 === 1) paper(0.018, 0.008, 3400);
  }

  function setMuted(value) {
    muted = Boolean(value);
    gainForState();
  }

  function pause() {
    playing = false;
    lastBeat = -1;
  }

  function close() {
    closed = true;
    playing = false;
    for (const voice of voices) {
      try { voice.stop(); } catch { /* An already ended short voice needs no work. */ }
    }
    voices.clear();
    context?.close().catch(() => {});
  }

  return { unlock, setMuted, event, update, pause, close };
}
