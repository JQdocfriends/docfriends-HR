import { SCALED_TILE, MAP_COLS, MAP_ROWS } from "@/lib/constants";
import { getGroundTile, getObjectTile, GROUND, OBJECT } from "./map";
import { PlayerEntity } from "./player";
import { Camera } from "./camera";
import { getAvatar, VISOR_COLOR, VISOR_SHINE, VISOR_SHADOW } from "@/lib/avatars";

// Floor shade variants per ground tile
const FLOOR_SHADES: Record<number, { base: string; seam: string; rivet: string }> = {
  [GROUND.FLOOR_A]: { base: "#3b4c5c", seam: "#2e3c48", rivet: "#1f2a33" },
  [GROUND.FLOOR_B]: { base: "#425567", seam: "#344452", rivet: "#23303b" },
  [GROUND.FLOOR_C]: { base: "#4a5d70", seam: "#3a4b5a", rivet: "#273441" },
  [GROUND.FLOOR_RED]: { base: "#6b3a3d", seam: "#522a2c", rivet: "#3c1e20" },
  [GROUND.FLOOR_DARK]: { base: "#232834", seam: "#191c25", rivet: "#0f121a" },
};

function tileHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >> 13)) * 1274126177) >>> 0;
  return (h ^ (h >> 16)) >>> 0;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private frameCount = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.ctx.fillStyle = "#0a0a1a";
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  tick() {
    this.frameCount++;
  }

  drawMap(camera: Camera, ventGlows?: Map<string, number>) {
    const startCol = Math.max(0, Math.floor(camera.x / SCALED_TILE));
    const endCol = Math.min(MAP_COLS, Math.ceil((camera.x + camera.width) / SCALED_TILE) + 1);
    const startRow = Math.max(0, Math.floor(camera.y / SCALED_TILE));
    const endRow = Math.min(MAP_ROWS, Math.ceil((camera.y + camera.height) / SCALED_TILE) + 1);

    // Ground layer
    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const tile = getGroundTile(x, y);
        const sx = x * SCALED_TILE - camera.x;
        const sy = y * SCALED_TILE - camera.y;
        this.drawFloor(sx, sy, tile, tileHash(x, y));
      }
    }

    // Object layer
    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const tile = getObjectTile(x, y);
        if (tile === OBJECT.EMPTY) continue;

        const sx = x * SCALED_TILE - camera.x;
        const sy = y * SCALED_TILE - camera.y;
        const hash = tileHash(x, y);

        switch (tile) {
          case OBJECT.WALL:
          case OBJECT.WALL_CORNER:
            this.drawWall(sx, sy, hash);
            break;
          case OBJECT.DOOR:
            this.drawDoor(sx, sy);
            break;
          case OBJECT.TABLE:
            this.drawTable(sx, sy, hash);
            break;
          case OBJECT.CONSOLE:
            this.drawConsole(sx, sy);
            break;
          case OBJECT.REACTOR:
            this.drawReactor(sx, sy, hash);
            break;
          case OBJECT.WIRES:
            this.drawWires(sx, sy, hash);
            break;
          case OBJECT.VENT: {
            const glow = ventGlows?.get(`${x},${y}`) ?? 0;
            this.drawVent(sx, sy, glow);
            break;
          }
          case OBJECT.CRYOPOD:
            this.drawCryopod(sx, sy);
            break;
        }
      }
    }
  }

  private drawFloor(sx: number, sy: number, tile: number, hash: number) {
    const shade = FLOOR_SHADES[tile];
    if (!shade) {
      // VOID or unknown — deep space
      this.ctx.fillStyle = "#0a0a1a";
      this.ctx.fillRect(sx, sy, SCALED_TILE, SCALED_TILE);
      return;
    }
    this.ctx.fillStyle = shade.base;
    this.ctx.fillRect(sx, sy, SCALED_TILE, SCALED_TILE);

    // Panel seams
    this.ctx.fillStyle = shade.seam;
    this.ctx.fillRect(sx, sy, SCALED_TILE, 1);
    this.ctx.fillRect(sx, sy, 1, SCALED_TILE);

    // Rivet dot (hash-based, ~20% of tiles)
    if (hash % 5 === 0) {
      this.ctx.fillStyle = shade.rivet;
      const rx = sx + 4 + ((hash >> 3) % 3);
      const ry = sy + 4 + ((hash >> 5) % 3);
      this.ctx.fillRect(rx, ry, 2, 2);
    }
  }

  private drawWall(sx: number, sy: number, hash: number) {
    // Base metal
    this.ctx.fillStyle = "#8892a0";
    this.ctx.fillRect(sx, sy, SCALED_TILE, SCALED_TILE);

    // Inner inset
    this.ctx.fillStyle = "#6c7684";
    this.ctx.fillRect(sx + 3, sy + 3, SCALED_TILE - 6, SCALED_TILE - 6);

    // Corner rivets
    this.ctx.fillStyle = "#2b2f38";
    const r = 2;
    this.ctx.beginPath();
    this.ctx.arc(sx + 6, sy + 6, r, 0, Math.PI * 2);
    this.ctx.arc(sx + SCALED_TILE - 6, sy + 6, r, 0, Math.PI * 2);
    this.ctx.arc(sx + 6, sy + SCALED_TILE - 6, r, 0, Math.PI * 2);
    this.ctx.arc(sx + SCALED_TILE - 6, sy + SCALED_TILE - 6, r, 0, Math.PI * 2);
    this.ctx.fill();

    // Top specular highlight
    this.ctx.fillStyle = "rgba(255,255,255,0.12)";
    this.ctx.fillRect(sx, sy, SCALED_TILE, 2);

    // Subtle seam variation
    if (hash % 3 === 0) {
      this.ctx.fillStyle = "rgba(0,0,0,0.12)";
      this.ctx.fillRect(sx + SCALED_TILE / 2 - 0.5, sy + 6, 1, SCALED_TILE - 12);
    }
  }

  private drawDoor(sx: number, sy: number) {
    // Floor base underneath
    this.ctx.fillStyle = "#4a5d70";
    this.ctx.fillRect(sx, sy, SCALED_TILE, SCALED_TILE);

    // Door frame (dark metal on left/right)
    this.ctx.fillStyle = "#2b323c";
    this.ctx.fillRect(sx, sy, 4, SCALED_TILE);
    this.ctx.fillRect(sx + SCALED_TILE - 4, sy, 4, SCALED_TILE);

    // Sliding panels (cyan) with pulse
    const pulse = 0.85 + Math.sin(this.frameCount * 0.04) * 0.15;
    this.ctx.fillStyle = `rgba(79, 195, 247, ${pulse})`;
    this.ctx.fillRect(sx + 4, sy + 4, SCALED_TILE / 2 - 5, SCALED_TILE - 8);
    this.ctx.fillRect(sx + SCALED_TILE / 2 + 1, sy + 4, SCALED_TILE / 2 - 5, SCALED_TILE - 8);

    // Center seam
    this.ctx.fillStyle = "#1b3a4d";
    this.ctx.fillRect(sx + SCALED_TILE / 2 - 1, sy + 4, 2, SCALED_TILE - 8);

    // Top/bottom rails
    this.ctx.fillStyle = "rgba(0,0,0,0.3)";
    this.ctx.fillRect(sx + 4, sy + 4, SCALED_TILE - 8, 2);
    this.ctx.fillRect(sx + 4, sy + SCALED_TILE - 6, SCALED_TILE - 8, 2);
  }

  private drawTable(sx: number, sy: number, hash: number) {
    // Table surface (cream)
    this.ctx.fillStyle = "#d9d3c4";
    this.ctx.beginPath();
    this.ctx.roundRect(sx + 2, sy + 4, SCALED_TILE - 4, SCALED_TILE - 8, 6);
    this.ctx.fill();

    // Edge tone
    this.ctx.strokeStyle = "#a39b88";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(sx + 2, sy + 4, SCALED_TILE - 4, SCALED_TILE - 8, 6);
    this.ctx.stroke();

    // A plate with food dot (~33% of tiles)
    if (hash % 3 === 0) {
      const cx = sx + SCALED_TILE / 2 + ((hash % 5) - 2);
      const cy = sy + SCALED_TILE / 2 + (((hash >> 3) % 5) - 2);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = hash % 2 === 0 ? "#e8564a" : "#4a9fd9";
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawConsole(sx: number, sy: number) {
    // Dark base
    this.ctx.fillStyle = "#2a2e38";
    this.ctx.fillRect(sx + 3, sy + 8, SCALED_TILE - 6, SCALED_TILE - 10);

    // Screen
    const screenX = sx + 6;
    const screenY = sy + 12;
    const screenW = SCALED_TILE - 12;
    const screenH = SCALED_TILE - 24;
    this.ctx.fillStyle = "#0a2230";
    this.ctx.fillRect(screenX, screenY, screenW, screenH);

    // Animated data bars
    const bars = 3;
    const barH = 3;
    for (let i = 0; i < bars; i++) {
      const phase = Math.sin(this.frameCount * 0.05 + i * 1.3) * 0.5 + 0.5;
      const w = screenW * (0.35 + phase * 0.5);
      this.ctx.fillStyle = "#58e0ff";
      this.ctx.fillRect(
        screenX + 2,
        screenY + 3 + i * (barH + 2),
        w - 2,
        barH
      );
    }

    // Keyboard strip
    this.ctx.fillStyle = "#1a1d24";
    this.ctx.fillRect(sx + 6, sy + SCALED_TILE - 8, SCALED_TILE - 12, 3);
  }

  private drawReactor(sx: number, sy: number, hash: number) {
    // Hex casing
    this.ctx.fillStyle = "#1f2530";
    this.ctx.fillRect(sx + 2, sy + 2, SCALED_TILE - 4, SCALED_TILE - 4);

    const cx = sx + SCALED_TILE / 2;
    const cy = sy + SCALED_TILE / 2;

    // Outer core
    const flicker = 0.85 + Math.sin(this.frameCount * 0.08 + hash * 0.3) * 0.15;
    this.ctx.fillStyle = `rgba(255, 140, 40, ${flicker * 0.85})`;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, SCALED_TILE * 0.32, 0, Math.PI * 2);
    this.ctx.fill();

    // Mid core
    this.ctx.fillStyle = `rgba(255, 200, 90, ${flicker})`;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, SCALED_TILE * 0.22, 0, Math.PI * 2);
    this.ctx.fill();

    // Hot center
    this.ctx.fillStyle = "#ffffff";
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, SCALED_TILE * 0.1, 0, Math.PI * 2);
    this.ctx.fill();

    // Casing highlight
    this.ctx.fillStyle = "rgba(255,255,255,0.08)";
    this.ctx.fillRect(sx + 2, sy + 2, SCALED_TILE - 4, 2);
  }

  private drawWires(sx: number, sy: number, hash: number) {
    // Floor cutout
    this.ctx.fillStyle = "#1a1d22";
    this.ctx.fillRect(sx + 6, sy + 10, SCALED_TILE - 12, SCALED_TILE - 20);

    // 3 diagonal wires
    const colors = ["#e8564a", "#f5d06a", "#58c2ff"];
    for (let i = 0; i < 3; i++) {
      this.ctx.strokeStyle = colors[i];
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      const y0 = sy + 12 + i * 6;
      const y1 = sy + SCALED_TILE - 14 + ((hash >> (i * 2)) & 1) * 2;
      this.ctx.moveTo(sx + 8, y0);
      this.ctx.lineTo(sx + SCALED_TILE - 8, y1);
      this.ctx.stroke();
    }

    // Connectors
    this.ctx.fillStyle = "#d4b866";
    this.ctx.fillRect(sx + 6, sy + 11, 3, SCALED_TILE - 22);
    this.ctx.fillRect(sx + SCALED_TILE - 9, sy + 11, 3, SCALED_TILE - 22);
  }

  private drawVent(sx: number, sy: number, glow: number = 0) {
    const cx = sx + SCALED_TILE / 2;
    const cy = sy + SCALED_TILE / 2;

    // Outer radial glow (under ring)
    if (glow > 0) {
      const grd = this.ctx.createRadialGradient(
        cx, cy, SCALED_TILE * 0.32,
        cx, cy, SCALED_TILE * 0.75
      );
      grd.addColorStop(0, `rgba(255, 220, 120, ${0.55 * glow})`);
      grd.addColorStop(1, "rgba(255, 220, 120, 0)");
      this.ctx.fillStyle = grd;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, SCALED_TILE * 0.75, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Outer ring
    this.ctx.fillStyle = "#c9a24a";
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, SCALED_TILE * 0.38, 0, Math.PI * 2);
    this.ctx.fill();

    // Inner darker well
    this.ctx.fillStyle = "#5a4220";
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, SCALED_TILE * 0.32, 0, Math.PI * 2);
    this.ctx.fill();

    // Horizontal slats
    this.ctx.fillStyle = "#2a2620";
    for (let i = 0; i < 4; i++) {
      const y = cy - 8 + i * 4;
      this.ctx.fillRect(cx - 10, y, 20, 2);
    }

    // Rim highlight
    this.ctx.strokeStyle = "rgba(255,255,255,0.25)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, SCALED_TILE * 0.38, -Math.PI * 0.75, -Math.PI * 0.25);
    this.ctx.stroke();

    // Bright pulsing overlay when active
    if (glow > 0) {
      const pulse = 0.75 + Math.sin(this.frameCount * 0.25) * 0.25;
      this.ctx.fillStyle = `rgba(255, 240, 160, ${0.5 * glow * pulse})`;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, SCALED_TILE * 0.38, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawCryopod(sx: number, sy: number) {
    // Pod base
    this.ctx.fillStyle = "#8aa8c0";
    this.ctx.beginPath();
    this.ctx.roundRect(sx + 6, sy + 4, SCALED_TILE - 12, SCALED_TILE - 8, 8);
    this.ctx.fill();

    // Inner glass
    this.ctx.fillStyle = "rgba(180,220,255,0.55)";
    this.ctx.beginPath();
    this.ctx.roundRect(sx + 9, sy + 7, SCALED_TILE - 18, SCALED_TILE - 14, 6);
    this.ctx.fill();

    // Silhouette inside
    this.ctx.fillStyle = "rgba(30,40,60,0.35)";
    this.ctx.beginPath();
    this.ctx.ellipse(sx + SCALED_TILE / 2, sy + SCALED_TILE / 2 + 2, 5, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Top LED
    const pulse = 0.5 + Math.sin(this.frameCount * 0.1) * 0.5;
    this.ctx.fillStyle = `rgba(80, 255, 160, ${0.5 + pulse * 0.5})`;
    this.ctx.beginPath();
    this.ctx.arc(sx + SCALED_TILE / 2, sy + 5, 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawPlayer(player: PlayerEntity, camera: Camera, isLocal: boolean) {
    // Hidden phase: draw nothing.
    if (player.ventPhase === "hidden") return;

    const sx = player.pixelX - camera.x;
    const sy = player.pixelY - camera.y;
    const { body, shadow } = getAvatar(player.avatar);
    const cx = sx + SCALED_TILE / 2;

    const venting = player.ventPhase !== "idle";
    const jumpY = venting ? 0 : player.jumpOffset;
    const walk = !venting && player.isMoving ? Math.sin(this.frameCount * 0.3) : 0;
    const bounce = !venting && player.isMoving ? Math.abs(walk) * 1.5 : 0;
    const floorBot = sy + SCALED_TILE - 8;
    const bodyTop = sy + 10 - bounce - jumpY;
    const bodyBot = floorBot - jumpY;
    const bodyH = bodyBot - bodyTop;
    const bodyW = 22;
    const left = cx - bodyW / 2;

    // Ground shadow (on floor plane — shrinks slightly while airborne)
    const shadowScale = jumpY > 0 ? Math.max(0.55, 1 - jumpY / 30) : 1;
    const shadowAlpha = (venting ? this.computeVentAlpha(player) : 1) * 0.28 * shadowScale;
    if (shadowAlpha > 0) {
      this.ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
      this.ctx.beginPath();
      this.ctx.ellipse(cx, floorBot + 2, 11 * shadowScale, 3.5 * shadowScale, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Apply vent transform around feet pivot if venting
    const vent = this.computeVentTransform(player);
    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.save();
    if (venting) {
      this.ctx.translate(cx, bodyBot + vent.dy);
      this.ctx.scale(vent.sx, vent.sy);
      this.ctx.translate(-cx, -bodyBot);
      this.ctx.globalAlpha = prevAlpha * vent.alpha;
    }

    // Backpack (hidden when facing down / toward camera)
    const packVisible = player.direction !== "down";
    if (packVisible) {
      const packOffset =
        player.direction === "left" ? 7 : player.direction === "right" ? -7 : 0;
      this.ctx.fillStyle = shadow;
      this.ctx.beginPath();
      this.ctx.roundRect(cx + packOffset - 6, bodyTop + 10, 12, 14, 4);
      this.ctx.fill();
    }

    // Legs (alternating swing)
    const legSwing = walk * 1.5;
    this.ctx.fillStyle = shadow;
    this.ctx.beginPath();
    this.ctx.roundRect(cx - 7, bodyBot - 4 + legSwing, 6, 6, 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.roundRect(cx + 1, bodyBot - 4 - legSwing, 6, 6, 2);
    this.ctx.fill();

    // Bean body
    this.ctx.fillStyle = body;
    this.ctx.beginPath();
    this.ctx.roundRect(left, bodyTop, bodyW, bodyH, [12, 12, 8, 8]);
    this.ctx.fill();

    // Side shading stripe (opposite side of facing)
    const shadeOnLeft = player.direction === "right";
    const shadeX = shadeOnLeft ? left + 1 : left + bodyW - 6;
    this.ctx.globalAlpha = (venting ? prevAlpha * vent.alpha : prevAlpha) * 0.32;
    this.ctx.fillStyle = shadow;
    this.ctx.beginPath();
    this.ctx.roundRect(shadeX, bodyTop + 4, 5, bodyH - 10, 4);
    this.ctx.fill();
    this.ctx.globalAlpha = venting ? prevAlpha * vent.alpha : prevAlpha;

    // Visor — direction-dependent
    const visorY = bodyTop + 10;
    switch (player.direction) {
      case "down":
        this.drawVisor(cx, visorY, 14, 8);
        break;
      case "left":
        this.drawVisor(cx - 3, visorY, 11, 8);
        break;
      case "right":
        this.drawVisor(cx + 3, visorY, 11, 8);
        break;
      case "up": {
        this.ctx.fillStyle = shadow;
        this.ctx.beginPath();
        this.ctx.roundRect(left + 3, visorY - 1, bodyW - 6, 3, 2);
        this.ctx.fill();
        break;
      }
    }

    // Local player highlight ring (inside transform so it shrinks too)
    if (isLocal) {
      this.ctx.strokeStyle = "rgba(255,215,0,0.55)";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.ellipse(cx, bodyBot + 2, 13, 4.5, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
    this.ctx.globalAlpha = prevAlpha;

    // Name + bubble hidden during vent
    if (venting) return;

    this.drawNameLabel(cx, sy - 2 + bounce - jumpY, player.name, isLocal);
    if (player.chatText) {
      this.drawChatBubble(cx, sy - 18 + bounce - jumpY, player.chatText, player.chatOpacity);
    }
  }

  private computeVentTransform(player: PlayerEntity): { sx: number; sy: number; dy: number; alpha: number } {
    const phase = player.ventPhase;
    if (phase === "idle" || phase === "hidden") {
      return { sx: 1, sy: 1, dy: 0, alpha: 1 };
    }
    const p = Math.min(1, Math.max(0, player.ventProgress));
    if (phase === "entering") {
      const e = easeOutCubic(p);
      return {
        sx: 1 - e * 0.4,
        sy: 1 - e * 0.9,
        dy: e * 14,
        alpha: p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3,
      };
    }
    // exiting
    const e = easeOutBack(p);
    return {
      sx: 0.6 + e * 0.4,
      sy: 0.1 + e * 0.9,
      dy: 14 - easeOutCubic(p) * 14,
      alpha: p < 0.3 ? p / 0.3 : 1,
    };
  }

  private computeVentAlpha(player: PlayerEntity): number {
    return this.computeVentTransform(player).alpha;
  }

  private drawVisor(cx: number, cy: number, w: number, h: number) {
    // Shadow base
    this.ctx.fillStyle = VISOR_SHADOW;
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy + 1, w / 2 + 1, h / 2 + 1, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Glass body
    this.ctx.fillStyle = VISOR_COLOR;
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Shine hotspot
    this.ctx.fillStyle = VISOR_SHINE;
    this.ctx.beginPath();
    this.ctx.ellipse(cx - w * 0.2, cy - h * 0.2, w * 0.18, h * 0.22, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawNameLabel(x: number, y: number, name: string, isLocal: boolean) {
    this.ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    this.ctx.textAlign = "center";
    const nameWidth = this.ctx.measureText(name).width;

    const px = x - nameWidth / 2 - 6;
    const py = y - 12;
    const pw = nameWidth + 12;
    const ph = 16;

    this.ctx.fillStyle = isLocal ? "rgba(255,215,0,0.85)" : "rgba(0,0,0,0.55)";
    this.ctx.beginPath();
    this.ctx.roundRect(px, py, pw, ph, 8);
    this.ctx.fill();

    this.ctx.fillStyle = isLocal ? "#1a1a1a" : "#fff";
    this.ctx.fillText(name, x, y - 1);
  }

  private drawChatBubble(x: number, y: number, text: string, opacity: number = 1) {
    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = prevAlpha * opacity;

    this.ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const width = this.ctx.measureText(text).width + 20;
    const height = 28;
    const bx = x - width / 2;
    const by = y - height;

    // Bubble shadow
    this.ctx.fillStyle = "rgba(0,0,0,0.1)";
    this.ctx.beginPath();
    this.ctx.roundRect(bx + 2, by + 2, width, height, 10);
    this.ctx.fill();

    // Bubble background
    this.ctx.fillStyle = "#fff";
    this.ctx.beginPath();
    this.ctx.roundRect(bx, by, width, height, 10);
    this.ctx.fill();

    // Tail
    this.ctx.fillStyle = "#fff";
    this.ctx.beginPath();
    this.ctx.moveTo(x - 5, y);
    this.ctx.lineTo(x, y + 7);
    this.ctx.lineTo(x + 5, y);
    this.ctx.fill();

    // Text
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(text, x, by + height / 2);
    this.ctx.textBaseline = "alphabetic";

    this.ctx.globalAlpha = prevAlpha;
  }
}
