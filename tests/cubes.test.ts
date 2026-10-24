// Hidden cube guide. Run: node --test tests/cubes.test.ts  (Node 22.18+ strips the types)
import assert from "node:assert/strict";
import { test } from "node:test";
import { facing, nearCubes, toPixel, type Cube } from "../src/dashboard/pages/world/cubes.ts";

// Verteron: 8×1024 px spanning ±408000 units, so 1 px = 99.6 units ≈ 1 m. The player stands at the map's centre.
const HALF = 408000;
const W = 8192;
const C = W / 2;
const U = (2 * HALF) / W; // game units per pixel
const cube = (id: string, x: number, y: number, z?: number): Cube => ({ id, x, y, z, region: id });
const north = cube("north", C, C - 100);
const east = cube("east", C + 300, C);
const south = cube("south", C, C + 500);
const all = [south, east, north];
const none = new Set<string>();

test("game units to pixels: -half is the left edge, 0 the centre, +half the right edge", () => {
  assert.equal(toPixel(-HALF, HALF, W), 0);
  assert.equal(toPixel(0, HALF, W), C);
  assert.equal(toPixel(HALF, HALF, W), W);
});

test("nearest cube first, its bearing (north = 0°) and its distance in metres", () => {
  const [g] = nearCubes(all, [0, 0], HALF, W, W, none);
  assert.equal(g.cube.id, "north");
  assert.equal(g.deg, 0);
  assert.ok(Math.abs(g.metres - (100 * U) / 100) < 1e-9); // 100 px × 99.6 units / 100 = 99.6 m
});

test("every spot within the radius, nearest first", () => {
  assert.deepEqual(
    nearCubes(all, [0, 0], HALF, W, W, none, 600).map((g) => g.cube.id),
    ["north", "east", "south"],
  );
  // 300 px ≈ 299 m: south (≈ 498 m) is out.
  assert.deepEqual(
    nearCubes(all, [0, 0], HALF, W, W, none, 300).map((g) => g.cube.id),
    ["north", "east"],
  );
});

test("the nearest stays even out of the radius", () => {
  assert.deepEqual(
    nearCubes(all, [0, 0], HALF, W, W, none, 10).map((g) => g.cube.id),
    ["north"],
  );
});

test("at most `max` spots", () => {
  const ring = Array.from({ length: 9 }, (_, i) => cube(`c${i}`, C + 10 + i, C));
  assert.equal(nearCubes(ring, [0, 0], HALF, W, W, none).length, 6);
  assert.equal(nearCubes(ring, [0, 0], HALF, W, W, none, 100, 3).length, 3);
});

test("skipped cubes are passed over: the next nearest is east, at 90°", () => {
  const [g] = nearCubes(all, [0, 0], HALF, W, W, new Set(["north"]));
  assert.equal(g.cube.id, "east");
  assert.equal(g.deg, 90);
  assert.ok(Math.abs(g.metres - 3 * U) < 1e-9);
  assert.equal(nearCubes(all, [0, 0], HALF, W, W, new Set(["north", "east"]))[0].deg, 180);
});

test("west is 270°, never -90°", () => {
  assert.equal(nearCubes([cube("west", C - 10, C)], [0, 0], HALF, W, W, none)[0].deg, 270);
});

test("height: metres above (+) or below (-) you, when both heights are known", () => {
  const [up] = nearCubes([cube("up", C, C - 5, 3200)], [0, 0, 2000], HALF, W, W, none);
  assert.equal(up.climb, 12);
  const [down] = nearCubes([cube("down", C, C - 5, 1500)], [0, 0, 2000], HALF, W, W, none);
  assert.equal(down.climb, -5);
  assert.equal(nearCubes([cube("noZ", C, C - 5)], [0, 0, 2000], HALF, W, W, none)[0].climb, undefined);
  assert.equal(nearCubes([cube("up", C, C - 5, 3200)], [0, 0], HALF, W, W, none)[0].climb, undefined);
});

test("everything skipped, or no cubes: nothing to guide to", () => {
  assert.deepEqual(nearCubes(all, [0, 0], HALF, W, W, new Set(["north", "east", "south"])), []);
  assert.deepEqual(nearCubes([], [0, 0], HALF, W, W, none), []);
});

test("facing: the game's heading (atan2 of south and east) as a compass bearing", () => {
  assert.equal(facing(0), 90); // east
  assert.equal(facing(-90), 0); // north
  assert.equal(facing(90), 180); // south
  assert.equal(facing(180), 270); // west
  assert.equal(facing(-180), 270);
});
