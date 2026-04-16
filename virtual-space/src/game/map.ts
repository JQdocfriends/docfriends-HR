import { MAP_COLS, MAP_ROWS } from "@/lib/constants";

// Simple procedurally generated map
// 0 = grass, 1 = path, 2 = water, 3 = tree, 4 = flower, 5 = rock, 6 = house wall, 7 = door
// Collision: 2 (water), 3 (tree), 5 (rock), 6 (wall) are not walkable

const SOLID_TILES = new Set([2, 3, 5, 6]);

function generateMap(): { ground: number[][]; objects: number[][] } {
  const ground: number[][] = [];
  const objects: number[][] = [];

  for (let y = 0; y < MAP_ROWS; y++) {
    ground[y] = [];
    objects[y] = [];
    for (let x = 0; x < MAP_COLS; x++) {
      ground[y][x] = 0; // grass
      objects[y][x] = 0; // empty
    }
  }

  // Border walls (trees)
  for (let x = 0; x < MAP_COLS; x++) {
    objects[0][x] = 3;
    objects[MAP_ROWS - 1][x] = 3;
  }
  for (let y = 0; y < MAP_ROWS; y++) {
    objects[y][0] = 3;
    objects[y][MAP_COLS - 1] = 3;
  }

  // Paths (horizontal and vertical cross)
  for (let x = 1; x < MAP_COLS - 1; x++) {
    ground[10][x] = 1;
    ground[11][x] = 1;
  }
  for (let y = 1; y < MAP_ROWS - 1; y++) {
    ground[y][15] = 1;
    ground[y][16] = 1;
  }

  // Pond (water area)
  for (let y = 3; y <= 6; y++) {
    for (let x = 3; x <= 7; x++) {
      objects[y][x] = 2;
    }
  }

  // Building (top-left area)
  for (let y = 3; y <= 7; y++) {
    for (let x = 20; x <= 26; x++) {
      if (y === 3 || y === 7 || x === 20 || x === 26) {
        objects[y][x] = 6; // wall
      }
    }
  }
  objects[7][23] = 7; // door

  // Scattered trees
  const treePositions = [
    [2, 10], [2, 12], [4, 14], [8, 3], [8, 5],
    [14, 2], [14, 8], [16, 4], [16, 22], [18, 10],
    [5, 28], [12, 25], [15, 27], [3, 18], [7, 12],
  ];
  for (const [y, x] of treePositions) {
    if (y > 0 && y < MAP_ROWS - 1 && x > 0 && x < MAP_COLS - 1) {
      objects[y][x] = 3;
    }
  }

  // Flowers scattered
  const flowerPositions = [
    [2, 2], [6, 9], [9, 6], [13, 3], [15, 12],
    [4, 11], [12, 20], [17, 5], [8, 22], [11, 28],
  ];
  for (const [y, x] of flowerPositions) {
    if (objects[y]?.[x] === 0) {
      objects[y][x] = 4;
    }
  }

  // Rocks
  const rockPositions = [
    [9, 8], [13, 18], [6, 24], [17, 14], [3, 13],
  ];
  for (const [y, x] of rockPositions) {
    if (objects[y]?.[x] === 0) {
      objects[y][x] = 5;
    }
  }

  return { ground, objects };
}

const mapData = generateMap();

export function getGroundTile(x: number, y: number): number {
  return mapData.ground[y]?.[x] ?? 0;
}

export function getObjectTile(x: number, y: number): number {
  return mapData.objects[y]?.[x] ?? 0;
}

export function isWalkable(x: number, y: number): boolean {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return false;
  const obj = mapData.objects[y][x];
  return !SOLID_TILES.has(obj);
}
