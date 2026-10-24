// Hidden cube guide. Run: node --test tests/cubes.test.ts  (Node 22.18+ strips the types)
import assert from "node:assert/strict";
import { test } from "node:test";
import { nearestCube, toPixel, type Cube } from "../src/dashboard/pages/world/cubes.ts";

// Verteron: 8×1024 px spanning ±408000 units, so 1 px = 99.6 units ≈ 1 m. The player stands at the map's centre.
const HALF = 408000;
const W = 8192;
const C = W / 2;
const U = (2 * HALF) / W; // game units per pixel
const cube = (id: string, x: number, y: number): Cube => ({ id, x, y, region: id });
const north = cube("north", C, C - 100);
const east = cube("east", C + 300, C);
const south = cube("south", C, C + 500);
const all = [south, east, north];

test("game units to pixels: -half is the left edge, 0 the centre, +half the right edge", () => {
  assert.equal(toPixel(-HALF, HALF, W), 0);
  assert.equal(toPixel(0, HALF, W), C);
  assert.equal(toPixel(HALF, HALF, W), W);
});

test("nearest cube, its bearing (north = 0°) and its distance in metres", () => {
  const g = nearestCube(all, [0, 0], HALF, W, W, new Set());
  assert.equal(g?.cube.id, "north");
  assert.equal(g?.deg, 0);
  assert.ok(Math.abs(g!.metres - (100 * U) / 100) < 1e-9); // 100 px × 99.6 units / 100 = 99.6 m
});

test("skipped cubes are passed over: the next nearest is east, at 90°", () => {
  const g = nearestCube(all, [0, 0], HALF, W, W, new Set(["north"]));
  assert.equal(g?.cube.id, "east");
  assert.equal(g?.deg, 90);
  assert.ok(Math.abs(g!.metres - 3 * U) < 1e-9);
  assert.equal(nearestCube(all, [0, 0], HALF, W, W, new Set(["north", "east"]))?.deg, 180);
});

test("west is 270°, never -90°", () => {
  const g = nearestCube([cube("west", C - 10, C)], [0, 0], HALF, W, W, new Set());
  assert.equal(g?.deg, 270);
});

test("everything skipped, or no cubes: nothing to guide to", () => {
  assert.equal(nearestCube(all, [0, 0], HALF, W, W, new Set(["north", "east", "south"])), undefined);
  assert.equal(nearestCube([], [0, 0], HALF, W, W, new Set()), undefined);
});
