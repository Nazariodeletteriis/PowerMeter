// Hidden cube guide math (CubeGuide.tsx). No imports: tests/cubes.test.ts runs it under node --test.

/** TW map id of a zone load → our map and the game units its tiles span either way of 0 (tw_105 map_points: u = x / 2·half + 0.5). */
export const GAME_MAPS: Record<number, [string, number]> = { 1010: ["World_L_A", 408000], 1110: ["World_D_A", 408000], 20: ["Abyss_Reshanta_A", 204000] };

/** Game units (centimetres, Unreal) → map pixels, on an axis `size` pixels long. */
export const toPixel = (v: number, half: number, size: number) => ((v + half) / (2 * half)) * size;

/** `x`, `y` map pixels; `z` height in game units when known. */
export type Cube = { id: string; x: number; y: number; z?: number; region: string };

/**
 * The cubes not skipped within `radius` metres of `pos` (game units x, y, z), nearest first, at most `max`, and the
 * nearest even when it lies further, on a map `w`×`h` pixels spanning ±`half` units. Each with its compass bearing
 * (0° = north = up on the map, 90° = east; pixel y grows southwards), distance in metres, and `climb`: metres above
 * (+) or below (-) you, when both heights are known. The spots of one place lie within ~100 m of each other (cubes.json:
 * median 5-6 other spots within 100 m, nearest neighbour ~35 m).
 */
export function nearCubes(cubes: Cube[], pos: number[], half: number, w: number, h: number, skipped: ReadonlySet<string>, radius = 100, max = 6) {
  // Map pixels → game units, so the distance is in the game's own scale whatever the map's size.
  const ux = (2 * half) / w;
  const uy = (2 * half) / h;
  const px = toPixel(pos[0], half, w);
  const py = toPixel(pos[1], half, h);
  return cubes
    .filter((cube) => !skipped.has(cube.id))
    .map((cube) => {
      const dx = (cube.x - px) * ux;
      const dy = (cube.y - py) * uy;
      return {
        cube,
        deg: ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360,
        metres: Math.hypot(dx, dy) / 100,
        climb: cube.z == null || pos[2] == null ? undefined : (cube.z - pos[2]) / 100,
      };
    })
    .sort((a, b) => a.metres - b.metres)
    .filter((g, i) => i === 0 || g.metres <= radius)
    .slice(0, max);
}

/** The game's heading (degrees, atan2 of south and east, as its casts carry it) → a compass bearing, 0° = north. */
export const facing = (heading: number) => (heading + 450) % 360;
