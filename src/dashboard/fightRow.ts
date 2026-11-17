/**
 * Home fight row. `killed` is written for boss fights only, already while the fight runs (saved from 15 s on),
 * so `false` means "the boss was not dead when the fight was saved" (running, abandoned or a wipe), and it is
 * missing on records saved before the field existed.
 */
export type FightOutcome = "kill" | "notKilled" | "unknown" | "na";

export function fightOutcome(f: { mode?: string; killed?: boolean | null }): FightOutcome {
  if (f.mode !== "boss") return "na";
  return f.killed == null ? "unknown" : f.killed ? "kill" : "notKilled";
}

/** Total damage of the whole group over the fight's length; null when the length is missing or zero. */
export function groupDps(f: { totalDamage: number; durationMs: number }): number | null {
  return f.durationMs > 0 ? f.totalDamage / (f.durationMs / 1000) : null;
}
