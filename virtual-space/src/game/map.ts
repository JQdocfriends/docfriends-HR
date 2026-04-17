import { MAP_COLS, MAP_ROWS } from "@/lib/constants";
import { VENT_POSITIONS as SHARED_VENT_POSITIONS } from "@/lib/vents";

// Ground tile IDs
export const GROUND = {
  VOID: 0,
  FLOOR_A: 1,
  FLOOR_B: 2,
  FLOOR_C: 3,
  FLOOR_RED: 4,
  FLOOR_DARK: 5,
} as const;

// Object tile IDs
export const OBJECT = {
  EMPTY: 0,
  WALL: 1,
  WALL_CORNER: 2,
  DOOR: 3,
  TABLE: 4,
  CONSOLE: 5,
  REACTOR: 6,
  WIRES: 7,
  VENT: 8,
  CRYOPOD: 9,
} as const;

const SOLID_TILES = new Set<number>([
  OBJECT.WALL,
  OBJECT.WALL_CORNER,
  OBJECT.TABLE,
  OBJECT.CONSOLE,
  OBJECT.REACTOR,
  OBJECT.CRYOPOD,
]);

// Deterministic pseudo-random (kept for any future accent variation)
let seed = 12345;
function seededRandom(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

interface RoomRect {
  x: number;
  y: number;
  w: number;
  h: number;
  floor: number;
}

function generateMap(): { ground: number[][]; objects: number[][] } {
  const ground: number[][] = [];
  const objects: number[][] = [];

  for (let y = 0; y < MAP_ROWS; y++) {
    ground[y] = [];
    objects[y] = [];
    for (let x = 0; x < MAP_COLS; x++) {
      ground[y][x] = GROUND.FLOOR_B;
      objects[y][x] = OBJECT.EMPTY;
    }
  }

  // Outer hull (solid wall ring)
  for (let x = 0; x < MAP_COLS; x++) {
    objects[0][x] = OBJECT.WALL;
    objects[MAP_ROWS - 1][x] = OBJECT.WALL;
  }
  for (let y = 0; y < MAP_ROWS; y++) {
    objects[y][0] = OBJECT.WALL;
    objects[y][MAP_COLS - 1] = OBJECT.WALL;
  }

  // Corridor floor shade in the central hub
  for (let y = 7; y <= 12; y++) {
    for (let x = 8; x <= 20; x++) {
      ground[y][x] = GROUND.FLOOR_C;
    }
  }

  const rooms: RoomRect[] = [
    { x: 1, y: 1, w: 7, h: 6, floor: GROUND.FLOOR_A }, // Engines
    { x: 20, y: 1, w: 9, h: 5, floor: GROUND.FLOOR_A }, // Cafeteria
    { x: 1, y: 13, w: 7, h: 6, floor: GROUND.FLOOR_DARK }, // Electrical
    { x: 20, y: 13, w: 9, h: 6, floor: GROUND.FLOOR_RED }, // MedBay
  ];

  // Fill room floors and walls
  for (const r of rooms) {
    for (let dy = 0; dy < r.h; dy++) {
      for (let dx = 0; dx < r.w; dx++) {
        const gx = r.x + dx;
        const gy = r.y + dy;
        ground[gy][gx] = r.floor;
        const onEdge = dx === 0 || dy === 0 || dx === r.w - 1 || dy === r.h - 1;
        if (onEdge) {
          objects[gy][gx] = OBJECT.WALL;
        }
      }
    }
  }

  // Doors between rooms and corridor (cyan sliding doors)
  const doors: Array<[number, number]> = [
    [7, 3], // Engines east → corridor
    [20, 3], // Cafeteria west → corridor
    [7, 16], // Electrical east → corridor
    [20, 16], // MedBay west → corridor
    [3, 6], // Engines south
    [23, 5], // Cafeteria south
    [3, 13], // Electrical north
    [23, 13], // MedBay north
  ];
  for (const [x, y] of doors) {
    if (objects[y]?.[x] === OBJECT.WALL) {
      objects[y][x] = OBJECT.DOOR;
    }
  }

  // Room props
  // Engines: reactor core + wiring nodes
  objects[3][3] = OBJECT.REACTOR;
  objects[3][4] = OBJECT.REACTOR;
  objects[4][3] = OBJECT.REACTOR;
  objects[4][4] = OBJECT.REACTOR;
  objects[2][5] = OBJECT.WIRES;
  objects[5][2] = OBJECT.WIRES;

  // Cafeteria: central oval table (3x3)
  for (let ty = 2; ty <= 3; ty++) {
    for (let tx = 23; tx <= 25; tx++) {
      objects[ty][tx] = OBJECT.TABLE;
    }
  }

  // Electrical: wires stations scattered
  objects[14][3] = OBJECT.WIRES;
  objects[17][5] = OBJECT.WIRES;
  objects[15][6] = OBJECT.CONSOLE;

  // MedBay: cryopods + console cluster
  objects[14][24] = OBJECT.CRYOPOD;
  objects[15][24] = OBJECT.CRYOPOD;
  objects[14][26] = OBJECT.CRYOPOD;
  objects[15][26] = OBJECT.CRYOPOD;
  objects[17][22] = OBJECT.CONSOLE;
  objects[17][23] = OBJECT.CONSOLE;

  // A lone admin console near central hub
  objects[11][18] = OBJECT.CONSOLE;
  objects[8][10] = OBJECT.WIRES;

  // Enforce spawn clearance (5x5 around spawn 15,10 must be walkable floor)
  for (let y = 8; y <= 12; y++) {
    for (let x = 13; x <= 17; x++) {
      ground[y][x] = GROUND.FLOOR_C;
      objects[y][x] = OBJECT.EMPTY;
    }
  }

  // Vents — placed last so spawn clearance can't overwrite them, and
  // sourced from the shared list that the server also uses.
  for (const { x, y } of SHARED_VENT_POSITIONS) {
    if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
      objects[y][x] = OBJECT.VENT;
    }
  }

  // Touch the rng so future accents remain deterministic
  seededRandom();

  return { ground, objects };
}

const mapData = generateMap();

const VENT_POSITIONS: ReadonlyArray<{ x: number; y: number }> = (() => {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      if (mapData.objects[y][x] === OBJECT.VENT) out.push({ x, y });
    }
  }
  return out;
})();

export function getGroundTile(x: number, y: number): number {
  return mapData.ground[y]?.[x] ?? GROUND.VOID;
}

export function getObjectTile(x: number, y: number): number {
  return mapData.objects[y]?.[x] ?? OBJECT.EMPTY;
}

export function isWalkable(x: number, y: number): boolean {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return false;
  const obj = mapData.objects[y][x];
  return !SOLID_TILES.has(obj);
}

export function getVentPositions(): ReadonlyArray<{ x: number; y: number }> {
  return VENT_POSITIONS;
}

export function isVent(x: number, y: number): boolean {
  return getObjectTile(x, y) === OBJECT.VENT;
}
