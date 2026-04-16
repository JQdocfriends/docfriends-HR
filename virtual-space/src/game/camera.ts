import { SCALED_TILE, MAP_COLS, MAP_ROWS } from "@/lib/constants";

export class Camera {
  x = 0;
  y = 0;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  follow(targetX: number, targetY: number) {
    const pixelX = targetX * SCALED_TILE + SCALED_TILE / 2;
    const pixelY = targetY * SCALED_TILE + SCALED_TILE / 2;

    this.x = pixelX - this.width / 2;
    this.y = pixelY - this.height / 2;

    // Clamp to map bounds
    const maxX = MAP_COLS * SCALED_TILE - this.width;
    const maxY = MAP_ROWS * SCALED_TILE - this.height;
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
