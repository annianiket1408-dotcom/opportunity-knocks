/**
 * Minimal Sound Service using Web Audio API
 */
class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  playTing() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    // Low-pass filter for a "softer" sound
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, this.audioCtx.currentTime);

    osc.type = 'sine'; // Sine is softest
    osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.1); // Slide down

    gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, this.audioCtx.currentTime + 0.01); // Soft attack
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4); // Long decay for reverb feel

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.5);
  }

  playGameOver() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, this.audioCtx.currentTime); // A3
    osc.frequency.linearRampToValueAtTime(110, this.audioCtx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.6);
  }
}

export const sounds = new SoundService();
