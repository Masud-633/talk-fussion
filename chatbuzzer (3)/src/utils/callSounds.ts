// Web Audio API generator for ultra-reliable, authentic telephone calling audio
// Provides realistic outgoing ringback tones (440Hz + 480Hz US/ITU standard),
// harmonic incoming call ringtones, and call end signals.

class CallSoundEngine {
  private ctx: AudioContext | null = null;
  private ringbackInterval: any = null;
  private incomingInterval: any = null;
  private activeNodes: { oscs: OscillatorNode[]; gain: GainNode }[] = [];

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // 1. Outgoing Call Ringback Tone (Dual Tone 440Hz & 480Hz, 1.5s tone, 2s silence)
  public startRingbackTone() {
    this.stopAll();
    const ctx = this.getContext();

    const playBeep = () => {
      try {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, now);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 1.4);
        gain.gain.linearRampToValueAtTime(0, now + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
      } catch {
        // AudioContext error handling
      }
    };

    playBeep();
    this.ringbackInterval = setInterval(playBeep, 3500);
  }

  // 2. Incoming Call Melodic Ringtone (Harmonic chime pattern, loops every 3s)
  public startIncomingRingtone() {
    this.stopAll();
    const ctx = this.getContext();

    const notes = [
      { f: 523.25, t: 0.0, d: 0.15 }, // C5
      { f: 659.25, t: 0.16, d: 0.15 }, // E5
      { f: 783.99, t: 0.32, d: 0.18 }, // G5
      { f: 1046.5, t: 0.52, d: 0.3 },  // C6
      { f: 783.99, t: 0.86, d: 0.15 }, // G5
      { f: 880.0, t: 1.02, d: 0.25 },  // A5
      { f: 1046.5, t: 1.3, d: 0.35 },  // C6
    ];

    const playChimeSequence = () => {
      try {
        const now = ctx.currentTime;
        notes.forEach(({ f, t, d }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0, now + t);
          gain.gain.linearRampToValueAtTime(0.12, now + t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + t);
          osc.stop(now + t + d);
        });
      } catch {
        // AudioContext error handling
      }
    };

    playChimeSequence();
    this.incomingInterval = setInterval(playChimeSequence, 2800);
  }

  // 3. Call Ended Tone (Quick descending double beep)
  public playCallEndTone() {
    this.stopAll();
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.setValueAtTime(360, now + 0.12);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // AudioContext error handling
    }
  }

  // 4. Stop all tones immediately
  public stopAll() {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
    if (this.incomingInterval) {
      clearInterval(this.incomingInterval);
      this.incomingInterval = null;
    }
    this.activeNodes.forEach(({ oscs, gain }) => {
      try {
        gain.disconnect();
        oscs.forEach((o) => {
          try {
            o.stop();
            o.disconnect();
          } catch {}
        });
      } catch {}
    });
    this.activeNodes = [];
  }
}

export const callSoundEngine = new CallSoundEngine();
