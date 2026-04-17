import { Camera } from "./camera";
import { InputManager } from "./input";
import { Renderer } from "./renderer";
import { PlayerEntity } from "./player";
import { isWalkable, isVent, getVentPositions } from "./map";
import type { ServerMessage, ChatMessage } from "@/types";
import { WS_URL, PROXIMITY_RADIUS, SCALED_TILE } from "@/lib/constants";

export type EngineEvents = {
  onPlayersUpdate: (players: PlayerEntity[]) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onNearbyChange: (nearbyIds: string[]) => void;
  onConnected: () => void;
  onDisconnected: () => void;
};

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private camera: Camera;
  private input: InputManager;
  private localPlayer: PlayerEntity | null = null;
  private remotePlayers = new Map<string, PlayerEntity>();
  private ws: WebSocket | null = null;
  private animFrameId: number | null = null;
  private events: EngineEvents;
  private moveCooldown = 0;
  private lastFrameMs: number | null = null;

  constructor(canvas: HTMLCanvasElement, events: EngineEvents) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d")!;
    this.renderer = new Renderer(ctx);
    this.camera = new Camera(canvas.width, canvas.height);
    this.input = new InputManager();
    this.events = events;
  }

  connect(name: string, avatar: number) {
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.ws!.send(JSON.stringify({ type: "join", name, avatar }));
      this.events.onConnected();
    };

    this.ws.onmessage = (event) => {
      const msg: ServerMessage & { selfPlayer?: { id: string; name: string; avatar: number; x: number; y: number } } = JSON.parse(event.data);
      this.handleServerMessage(msg);
    };

    this.ws.onclose = () => {
      this.events.onDisconnected();
    };

    this.startLoop();
  }

  private handleServerMessage(msg: ServerMessage & { selfPlayer?: { id: string; name: string; avatar: number; x: number; y: number } }) {
    switch (msg.type) {
      case "init": {
        const sp = msg.selfPlayer!;
        this.localPlayer = new PlayerEntity(msg.id, sp.name, sp.avatar, sp.x, sp.y);
        for (const p of msg.players) {
          this.remotePlayers.set(p.id, new PlayerEntity(p.id, p.name, p.avatar, p.x, p.y));
        }
        this.notifyPlayersUpdate();
        break;
      }
      case "player_join": {
        const p = msg.player;
        this.remotePlayers.set(p.id, new PlayerEntity(p.id, p.name, p.avatar, p.x, p.y));
        this.notifyPlayersUpdate();
        break;
      }
      case "player_move": {
        const remote = this.remotePlayers.get(msg.id);
        if (remote && !remote.isVenting) {
          remote.moveTo(msg.x, msg.y, msg.direction);
        }
        break;
      }
      case "player_leave": {
        this.remotePlayers.delete(msg.id);
        this.notifyPlayersUpdate();
        break;
      }
      case "chat": {
        const chatMsg = msg.message;
        if (chatMsg.fromId === this.localPlayer?.id) {
          this.localPlayer?.showChat(chatMsg.text);
        } else {
          const remote = this.remotePlayers.get(chatMsg.fromId);
          remote?.showChat(chatMsg.text);
        }
        this.events.onChatMessage(chatMsg);
        break;
      }
      case "player_vent": {
        if (this.localPlayer && msg.id === this.localPlayer.id) {
          // Local started optimistically; patch target coordinates now.
          if (this.localPlayer.isVenting) {
            this.localPlayer.setVentTarget(msg.toX, msg.toY);
          } else {
            this.localPlayer.startVent(msg.fromX, msg.fromY, msg.toX, msg.toY);
          }
        } else {
          const remote = this.remotePlayers.get(msg.id);
          remote?.startVent(msg.fromX, msg.fromY, msg.toX, msg.toY);
        }
        break;
      }
      case "player_jump": {
        if (this.localPlayer && msg.id === this.localPlayer.id) {
          // Echo from server — already started locally; ignore.
          break;
        }
        const remote = this.remotePlayers.get(msg.id);
        remote?.startJump();
        break;
      }
    }
  }

  private notifyPlayersUpdate() {
    const all = this.getAllPlayers();
    this.events.onPlayersUpdate(all);
  }

  private getAllPlayers(): PlayerEntity[] {
    const players: PlayerEntity[] = [];
    if (this.localPlayer) players.push(this.localPlayer);
    for (const p of this.remotePlayers.values()) {
      players.push(p);
    }
    return players;
  }

  private startLoop() {
    const loop = (ts: number) => {
      const dt = this.lastFrameMs == null ? 16 : ts - this.lastFrameMs;
      this.lastFrameMs = ts;
      this.update(dt);
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private handleSpacePress() {
    if (!this.localPlayer) return;
    if (this.localPlayer.isVenting) return;

    const px = this.localPlayer.x;
    const py = this.localPlayer.y;
    const onVent = isVent(px, py);

    if (onVent && !this.localPlayer.isMoving) {
      const others = getVentPositions().filter(
        (v) => !(v.x === px && v.y === py)
      );
      if (others.length > 0) {
        // Optimistic local start with placeholder target (same as origin);
        // server patches the real target via `player_vent` before the
        // 400ms entering phase completes.
        this.localPlayer.startVent(px, py, px, py);
        this.ws?.send(JSON.stringify({ type: "vent", fromX: px, fromY: py }));
        return;
      }
    }

    // Not on a vent (or only vent) → jump in place.
    this.localPlayer.startJump();
    this.ws?.send(JSON.stringify({ type: "jump" }));
  }

  private update(dtMs: number) {
    // Advance vent + jump timers for all players first
    if (this.localPlayer?.isVenting) this.localPlayer.tickVent(dtMs);
    if (this.localPlayer?.isJumping) this.localPlayer.tickJump(dtMs);
    for (const p of this.remotePlayers.values()) {
      if (p.isVenting) p.tickVent(dtMs);
      if (p.isJumping) p.tickJump(dtMs);
    }

    // Space: vent if on vent tile, otherwise jump in place
    if (this.input.consumeSpacePress()) {
      this.handleSpacePress();
    }

    // Handle local movement (suppressed during vent)
    if (this.localPlayer && !this.localPlayer.isVenting && this.moveCooldown <= 0) {
      const dir = this.input.getDirection();
      if (dir && !this.localPlayer.isMoving) {
        const newX = this.localPlayer.x + dir.dx;
        const newY = this.localPlayer.y + dir.dy;
        if (isWalkable(newX, newY)) {
          this.localPlayer.moveTo(newX, newY, dir.direction);
          this.ws?.send(JSON.stringify({
            type: "move",
            x: newX,
            y: newY,
            direction: dir.direction,
          }));
          this.moveCooldown = 8;
        } else {
          this.localPlayer.direction = dir.direction;
        }
      }
    }
    if (this.moveCooldown > 0) this.moveCooldown--;

    // Smooth movement + chat timers
    this.localPlayer?.update();
    for (const p of this.remotePlayers.values()) {
      p.update();
    }

    // Camera follow
    if (this.localPlayer) {
      this.camera.follow(this.localPlayer.x, this.localPlayer.y);
    }

    // Proximity
    if (this.localPlayer) {
      const nearbyIds: string[] = [];
      for (const p of this.remotePlayers.values()) {
        const dist = Math.abs(p.x - this.localPlayer.x) + Math.abs(p.y - this.localPlayer.y);
        if (dist <= PROXIMITY_RADIUS) {
          nearbyIds.push(p.id);
        }
      }
      this.events.onNearbyChange(nearbyIds);
    }
  }

  private render() {
    this.renderer.tick();
    this.renderer.clear();

    // Compute active vent glows from currently venting players
    const ventGlows = new Map<string, number>();
    const markGlow = (x: number, y: number, intensity: number) => {
      const key = `${x},${y}`;
      ventGlows.set(key, Math.max(ventGlows.get(key) ?? 0, intensity));
    };
    const markPlayerGlow = (p: PlayerEntity) => {
      if (p.ventPhase === "entering") {
        markGlow(p.ventFromX, p.ventFromY, p.ventProgress);
      } else if (p.ventPhase === "hidden") {
        markGlow(p.ventFromX, p.ventFromY, 1);
        markGlow(p.ventToX, p.ventToY, 1);
      } else if (p.ventPhase === "exiting") {
        markGlow(p.ventToX, p.ventToY, 1 - p.ventProgress);
      }
    };
    if (this.localPlayer?.isVenting) markPlayerGlow(this.localPlayer);
    for (const p of this.remotePlayers.values()) {
      if (p.isVenting) markPlayerGlow(p);
    }

    this.renderer.drawMap(this.camera, ventGlows);

    for (const p of this.remotePlayers.values()) {
      this.renderer.drawPlayer(p, this.camera, false);
    }

    if (this.localPlayer) {
      this.renderer.drawPlayer(this.localPlayer, this.camera, true);
    }
  }

  sendChat(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "chat", text }));
    }
  }

  setInputEnabled(enabled: boolean) {
    this.input.enabled = enabled;
  }

  getLocalPlayerScreenPos(): { x: number; y: number } | null {
    if (!this.localPlayer) return null;
    return {
      x: this.localPlayer.pixelX - this.camera.x + SCALED_TILE / 2,
      y: this.localPlayer.pixelY - this.camera.y,
    };
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.input.destroy();
    this.ws?.close();
  }
}
