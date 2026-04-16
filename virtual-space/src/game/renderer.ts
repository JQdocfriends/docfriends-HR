import { SCALED_TILE, MAP_COLS, MAP_ROWS } from "@/lib/constants";
import { getGroundTile, getObjectTile } from "./map";
import { PlayerEntity } from "./player";
import { Camera } from "./camera";

// Tile colors for procedural rendering (no external assets needed)
const GROUND_COLORS: Record<number, string> = {
  0: "#4a8c3f", // grass
  1: "#c4a96a", // path
};

const OBJECT_COLORS: Record<number, { fill: string; icon?: string }> = {
  2: { fill: "#3a7cbf" },           // water
  3: { fill: "#2d5a1e", icon: "🌳" }, // tree
  4: { fill: "transparent", icon: "🌸" }, // flower
  5: { fill: "#808080", icon: "🪨" }, // rock
  6: { fill: "#8B7355" },           // wall
  7: { fill: "#654321", icon: "🚪" }, // door
};

// Avatar colors
const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
];

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.ctx.fillStyle = "#2d2d2d";
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  drawMap(camera: Camera) {
    const startCol = Math.max(0, Math.floor(camera.x / SCALED_TILE));
    const endCol = Math.min(MAP_COLS, Math.ceil((camera.x + camera.width) / SCALED_TILE) + 1);
    const startRow = Math.max(0, Math.floor(camera.y / SCALED_TILE));
    const endRow = Math.min(MAP_ROWS, Math.ceil((camera.y + camera.height) / SCALED_TILE) + 1);

    // Draw ground layer
    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const tile = getGroundTile(x, y);
        const screenX = x * SCALED_TILE - camera.x;
        const screenY = y * SCALED_TILE - camera.y;

        this.ctx.fillStyle = GROUND_COLORS[tile] || GROUND_COLORS[0];
        this.ctx.fillRect(screenX, screenY, SCALED_TILE, SCALED_TILE);

        // Grid lines (subtle)
        this.ctx.strokeStyle = "rgba(0,0,0,0.08)";
        this.ctx.strokeRect(screenX, screenY, SCALED_TILE, SCALED_TILE);
      }
    }

    // Draw object layer
    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const tile = getObjectTile(x, y);
        if (tile === 0) continue;

        const screenX = x * SCALED_TILE - camera.x;
        const screenY = y * SCALED_TILE - camera.y;
        const obj = OBJECT_COLORS[tile];

        if (!obj) continue;

        if (obj.fill !== "transparent") {
          this.ctx.fillStyle = obj.fill;
          if (tile === 2) {
            // Water with slight wave effect
            this.ctx.fillRect(screenX + 1, screenY + 1, SCALED_TILE - 2, SCALED_TILE - 2);
          } else if (tile === 6) {
            // Wall - brick pattern
            this.ctx.fillRect(screenX, screenY, SCALED_TILE, SCALED_TILE);
            this.ctx.strokeStyle = "#7a6648";
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(screenX + 2, screenY + 2, SCALED_TILE - 4, SCALED_TILE / 2 - 3);
            this.ctx.strokeRect(screenX + SCALED_TILE / 4, screenY + SCALED_TILE / 2 + 1, SCALED_TILE / 2, SCALED_TILE / 2 - 3);
          } else if (tile === 3) {
            // Tree - circle top
            this.ctx.fillStyle = "#5a3a1a";
            this.ctx.fillRect(screenX + SCALED_TILE / 2 - 4, screenY + SCALED_TILE / 2, 8, SCALED_TILE / 2);
            this.ctx.fillStyle = "#2d7a1e";
            this.ctx.beginPath();
            this.ctx.arc(screenX + SCALED_TILE / 2, screenY + SCALED_TILE / 3, SCALED_TILE / 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = "#3d8a2e";
            this.ctx.beginPath();
            this.ctx.arc(screenX + SCALED_TILE / 2 - 4, screenY + SCALED_TILE / 3 + 2, SCALED_TILE / 4, 0, Math.PI * 2);
            this.ctx.fill();
          } else {
            this.ctx.fillRect(screenX + 4, screenY + 4, SCALED_TILE - 8, SCALED_TILE - 8);
          }
        }

        if (obj.icon && tile !== 3) {
          this.ctx.font = `${SCALED_TILE * 0.6}px serif`;
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(obj.icon, screenX + SCALED_TILE / 2, screenY + SCALED_TILE / 2);
        }
      }
    }
  }

  drawPlayer(player: PlayerEntity, camera: Camera, isLocal: boolean) {
    const screenX = player.pixelX - camera.x;
    const screenY = player.pixelY - camera.y;
    const color = AVATAR_COLORS[player.avatar % AVATAR_COLORS.length];
    const size = SCALED_TILE * 0.7;
    const offset = (SCALED_TILE - size) / 2;

    // Shadow
    this.ctx.fillStyle = "rgba(0,0,0,0.2)";
    this.ctx.beginPath();
    this.ctx.ellipse(
      screenX + SCALED_TILE / 2,
      screenY + SCALED_TILE - 6,
      size / 2.5,
      size / 6,
      0, 0, Math.PI * 2
    );
    this.ctx.fill();

    // Body
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      screenX + offset + 4,
      screenY + offset + size * 0.4,
      size - 8,
      size * 0.6
    );

    // Head
    const headSize = size * 0.45;
    this.ctx.fillStyle = "#FFD5B4";
    this.ctx.beginPath();
    this.ctx.arc(
      screenX + SCALED_TILE / 2,
      screenY + offset + headSize / 2 + 2,
      headSize / 2,
      0, Math.PI * 2
    );
    this.ctx.fill();

    // Eyes (direction-based)
    this.ctx.fillStyle = "#333";
    const eyeY = screenY + offset + headSize / 2;
    const eyeSize = 2.5;
    if (player.direction === "left") {
      this.ctx.fillRect(screenX + SCALED_TILE / 2 - 7, eyeY, eyeSize, eyeSize);
    } else if (player.direction === "right") {
      this.ctx.fillRect(screenX + SCALED_TILE / 2 + 4, eyeY, eyeSize, eyeSize);
    } else {
      this.ctx.fillRect(screenX + SCALED_TILE / 2 - 6, eyeY, eyeSize, eyeSize);
      this.ctx.fillRect(screenX + SCALED_TILE / 2 + 3, eyeY, eyeSize, eyeSize);
    }

    // Local player indicator
    if (isLocal) {
      this.ctx.strokeStyle = "#FFD700";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(screenX + offset, screenY + offset, size, size);
    }

    // Name label
    this.ctx.font = "bold 12px 'Courier New', monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "rgba(0,0,0,0.7)";
    const nameWidth = this.ctx.measureText(player.name).width;
    this.ctx.fillRect(
      screenX + SCALED_TILE / 2 - nameWidth / 2 - 4,
      screenY - 16,
      nameWidth + 8,
      16
    );
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(player.name, screenX + SCALED_TILE / 2, screenY - 5);

    // Chat bubble
    if (player.chatText) {
      this.drawChatBubble(screenX + SCALED_TILE / 2, screenY - 24, player.chatText);
    }
  }

  private drawChatBubble(x: number, y: number, text: string) {
    this.ctx.font = "12px 'Courier New', monospace";
    const width = this.ctx.measureText(text).width + 16;
    const height = 24;
    const bx = x - width / 2;
    const by = y - height;

    // Bubble background
    this.ctx.fillStyle = "rgba(255,255,255,0.95)";
    this.ctx.beginPath();
    this.ctx.roundRect(bx, by, width, height, 6);
    this.ctx.fill();
    this.ctx.strokeStyle = "#ccc";
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Tail
    this.ctx.fillStyle = "rgba(255,255,255,0.95)";
    this.ctx.beginPath();
    this.ctx.moveTo(x - 4, y);
    this.ctx.lineTo(x, y + 6);
    this.ctx.lineTo(x + 4, y);
    this.ctx.fill();

    // Text
    this.ctx.fillStyle = "#333";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, x, by + 16);
  }
}
