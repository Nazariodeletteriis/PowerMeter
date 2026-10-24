// Hidden cube guide math (CubeGuide.tsx). No imports: tests/cubes.test.ts runs it under node --test.

/** TW map id of a zone load → our map and the game units its tiles span either way of 0 (tw_105 map_points: u = x / 2·half + 0.5). */
export const GAME_MAPS: Record<number, [string, number]> = { 1010: ["World_L_A", 408000], 1110: ["World_D_A", 408000], 20: ["Abyss_Reshanta_A", 204000] };

/** Game units (centimetres, Unreal) → map pixels, on an axis `size` pixels long. */
export const toPixel = (v: number, half: number, size: number) => ((v + half) / (2 * half)) * size;

export type Cube = { id: string; x: number; y: number; region: string };

/**
 * The cube nearest to `pos` (game units) that isn't skipped, on a map `w`×`h` pixels spanning ±`half` units:
 * its compass bearing (0° = north = up on the map, 90° = east; pixel y grows southwards) and distance in metres.
 */
export function nearestCube(cubes: Cube[], pos: [number, number], half: number, w: number, h: number, skipped: ReadonlySet<string>) {
  // Map pixels → game units, so the distance is in the game's own scale whatever the map's size.
  const ux = (2 * half) / w;
  const uy = (2 * half) / h;
  const px = toPixel(pos[0], half, w);
  const py = toPixel(pos[1], half, h);
  let best: { cube: Cube; dx: number; dy: number; d: number } | undefined;
  for (const cube of cubes) {
    if (skipped.has(cube.id)) continue;
    const dx = (cube.x - px) * ux;
    const dy = (cube.y - py) * uy;
    const d = Math.hypot(dx, dy);
    if (!best || d < best.d) best = { cube, dx, dy, d };
  }
  if (!best) return undefined;
  const deg = ((Math.atan2(best.dx, -best.dy) * 180) / Math.PI + 360) % 360;
  return { cube: best.cube, deg, metres: best.d / 100 };
}
