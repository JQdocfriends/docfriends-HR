export const TILE_SIZE = 16;
export const SCALE = 3;
export const SCALED_TILE = TILE_SIZE * SCALE;
export const MAP_COLS = 30;
export const MAP_ROWS = 20;
export const PROXIMITY_RADIUS = 5; // tiles
export const MOVE_SPEED = 4; // pixels per frame (smooth movement)
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
