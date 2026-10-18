export const SOUND_KEY = "pm.eventSound"; // "1" = the user turned the event alert on; off by default
export const VOLUME_KEY = "pm.eventVolume"; // 0-100, set in the widget's Settings; 50 when unset
export const LEAD_KEY = "pm.eventLead"; // minutes before a start the widget notice opens and rings, set on the Timer page
export const LEADS = [1, 3, 5, 10];
export const POPUP_KEY = "pm.eventPopup"; // "0" = no popup over the widget when an event notice opens; on when unset
export const POPUP_SECONDS_KEY = "pm.eventPopupSeconds"; // how long the popup stays, 3-30 s
/** The popup's seconds: 3-30, 8 when unset or out of range. */
export const popupSeconds = (value?: string) => {
  const n = Math.round(Number(value));
  return n >= 3 && n <= 30 ? n : 8;
};
/** The lead setting in minutes: one of LEADS, 10 when unset or unknown. */
export const leadMinutes = (value?: string) => (LEADS.includes(Number(value)) ? Number(value) : 10);

/** Short two-tone chime, no audio file. `volume` is the 0-100 setting: 50 is the original level, 100 twice it. */
export function chime(volume: string | number = 50) {
  const n = Number(volume);
  const peak = 0.4 * Math.min(1, Math.max(0, Number.isFinite(n) ? n / 100 : 0.5));
  if (peak <= 0) return; // the ramps below cannot reach 0
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.02);
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
