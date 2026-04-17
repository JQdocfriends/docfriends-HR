// Single source of truth for vent tile coordinates.
// Imported by both the client map generator and the server vent handler.
// MUST match actual map — any position placed here is also guaranteed walkable
// by the map generator (see src/game/map.ts placement loop).

export interface VentPos {
  readonly x: number;
  readonly y: number;
}

export const VENT_POSITIONS: ReadonlyArray<VentPos> = Object.freeze([
  { x: 13, y: 3 },
  { x: 13, y: 14 },
  { x: 3, y: 10 },
  { x: 26, y: 10 },
]);

export function isVentCoord(x: number, y: number): boolean {
  return VENT_POSITIONS.some((v) => v.x === x && v.y === y);
}
