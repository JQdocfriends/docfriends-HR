import { SCALED_TILE } from "@/lib/constants";

export class PlayerEntity {
  id: string;
  name: string;
  avatar: number;
  x: number; // grid x
  y: number; // grid y
  direction: "up" | "down" | "left" | "right" = "down";

  // Smooth movement
  pixelX: number;
  pixelY: number;
  targetPixelX: number;
  targetPixelY: number;
  isMoving = false;

  // Chat bubble
  chatText: string | null = null;
  chatTimer = 0;

  constructor(id: string, name: string, avatar: number, x: number, y: number) {
    this.id = id;
    this.name = name;
    this.avatar = avatar;
    this.x = x;
    this.y = y;
    this.pixelX = x * SCALED_TILE;
    this.pixelY = y * SCALED_TILE;
    this.targetPixelX = this.pixelX;
    this.targetPixelY = this.pixelY;
  }

  moveTo(x: number, y: number, direction: "up" | "down" | "left" | "right") {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.targetPixelX = x * SCALED_TILE;
    this.targetPixelY = y * SCALED_TILE;
    this.isMoving = true;
  }

  update() {
    const speed = 6;
    const dx = this.targetPixelX - this.pixelX;
    const dy = this.targetPixelY - this.pixelY;

    if (Math.abs(dx) < speed && Math.abs(dy) < speed) {
      this.pixelX = this.targetPixelX;
      this.pixelY = this.targetPixelY;
      this.isMoving = false;
    } else {
      this.pixelX += Math.sign(dx) * Math.min(Math.abs(dx), speed);
      this.pixelY += Math.sign(dy) * Math.min(Math.abs(dy), speed);
    }

    // Chat bubble timeout
    if (this.chatTimer > 0) {
      this.chatTimer--;
      if (this.chatTimer <= 0) {
        this.chatText = null;
      }
    }
  }

  showChat(text: string) {
    this.chatText = text.length > 30 ? text.slice(0, 30) + "..." : text;
    this.chatTimer = 180; // ~3 seconds at 60fps
  }
}
