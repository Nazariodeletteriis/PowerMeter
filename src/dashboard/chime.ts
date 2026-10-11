export const SOUND_KEY = "pm.eventSound"; // "1" = the user turned the event alert on; off by default

/** Short two-tone chime, no audio file. */
export function chime() {
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
  [880, 1320].forEach((hz, i) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = hz;
    osc.connect(gain);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + 0.6);
  });
  setTimeout(() => ctx.close(), 1000);
}
