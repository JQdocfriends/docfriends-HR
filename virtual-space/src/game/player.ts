import { SCALED_TILE } from "@/lib/constants";

export type VentPhase = "idle" | "entering" | "hidden" | "exiting";

export const VENT_PHASE_DURATIONS: Record<Exclude<VentPhase, "idle">, number> = {
  entering: 400,
  hidden: 100,
  exiting: 400,
};

export class PlayerEntity {
  id: string;
  name: string;
  avatar: number;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right" = "down";

  pixelX: number;
  pixelY: number;
  targetPixelX: number;
  targetPixelY: number;
  isMoving = false;

  chatText: string | null = null;
  chatTimer = 0;

  // Vent teleport animation state
  ventPhase: VentPhase = "idle";
  ventPhaseMs = 0;
  ventFromX = 0;
  ventFromY = 0;
  ventToX = 0;
  ventToY = 0;

  // In-place jump animation state
  isJumping = false;
  jumpElapsedMs = 0;

  static readonly CHAT_TOTAL_FRAMES = 300;
  static readonly CHAT_FADE_FRAMES = 120;
  static readonly JUMP_DURATION_MS = 400;
  static readonly JUMP_PEAK_PX = 16;

  get chatOpacity(): number {
    if (this.chatTimer <= 0) return 0;
    if (this.chatTimer >= PlayerEntity.CHAT_FADE_FRAMES) return 1;
    return this.chatTimer / PlayerEntity.CHAT_FADE_FRAMES;
  }

  get isVenting(): boolean {
    return this.ventPhase !== "idle";
  }

  get ventProgress(): number {
    if (this.ventPhase === "idle") return 0;
    const dur = VENT_PHASE_DURATIONS[this.ventPhase];
    return Math.min(1, Math.max(0, this.ventPhaseMs / dur));
  }

  get jumpOffset(): number {
    if (!this.isJumping) return 0;
    const p = Math.min(1, this.jumpElapsedMs / PlayerEntity.JUMP_DURATION_MS);
    return Math.sin(p * Math.PI) * PlayerEntity.JUMP_PEAK_PX;
  }

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

  startVent(fromX: number, fromY: number, toX: number, toY: number) {
    this.ventPhase = "entering";
    this.ventPhaseMs = 0;
    this.ventFromX = fromX;
    this.ventFromY = fromY;
    this.ventToX = toX;
    this.ventToY = toY;
    // Snap to origin exactly so the "sinking" pivots on the vent center
    this.x = fromX;
    this.y = fromY;
    this.pixelX = fromX * SCALED_TILE;
    this.pixelY = fromY * SCALED_TILE;
    this.targetPixelX = this.pixelX;
    this.targetPixelY = this.pixelY;
    this.isMoving = false;
  }

  setVentTarget(toX: number, toY: number) {
    this.ventToX = toX;
    this.ventToY = toY;
  }

  startJump() {
    this.isJumping = true;
    this.jumpElapsedMs = 0;
  }

  tickJump(dtMs: number) {
    if (!this.isJumping) return;
    this.jumpElapsedMs += dtMs;
    if (this.jumpElapsedMs >= PlayerEntity.JUMP_DURATION_MS) {
      this.isJumping = false;
      this.jumpElapsedMs = 0;
    }
  }

  tickVent(dtMs: number) {
    if (this.ventPhase === "idle") return;
    this.ventPhaseMs += dtMs;
    const dur = VENT_PHASE_DURATIONS[this.ventPhase];
    if (this.ventPhaseMs < dur) return;

    const carry = this.ventPhaseMs - dur;
    if (this.ventPhase === "entering") {
      // Jump to destination at the start of the hidden phase
      this.x = this.ventToX;
      this.y = this.ventToY;
      this.pixelX = this.ventToX * SCALED_TILE;
      this.pixelY = this.ventToY * SCALED_TILE;
      this.targetPixelX = this.pixelX;
      this.targetPixelY = this.pixelY;
      this.ventPhase = "hidden";
      this.ventPhaseMs = carry;
    } else if (this.ventPhase === "hidden") {
      this.ventPhase = "exiting";
      this.ventPhaseMs = carry;
    } else if (this.ventPhase === "exiting") {
      this.ventPhase = "idle";
      this.ventPhaseMs = 0;
    }
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

    if (this.chatTimer > 0) {
      this.chatTimer--;
      if (this.chatTimer <= 0) {
        this.chatText = null;
      }
    }
  }

  showChat(text: string) {
    this.chatText = text.length > 30 ? text.slice(0, 30) + "..." : text;
    this.chatTimer = PlayerEntity.CHAT_TOTAL_FRAMES;
  }
}
