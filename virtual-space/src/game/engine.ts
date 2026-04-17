import { Camera } from "./camera";
import { InputManager } from "./input";
import { Renderer } from "./renderer";
import { PlayerEntity } from "./player";
import { isWalkable, isVent, getVentPositions } from "./map";
import type { ChatMessage } from "@/types";
import { PROXIMITY_RADIUS, SCALED_TILE } from "@/lib/constants";
import { getSupabase, ROOM_CHANNEL } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type EngineEvents = {
  onPlayersUpdate: (players: PlayerEntity[]) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onNearbyChange: (nearbyIds: string[]) => void;
  onConnected: () => void;
  onDisconnected: () => void;
};

interface PresencePayload {
  id: string;
  name: string;
  avatar: number;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
}

function makeClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private camera: Camera;
  private input: InputManager;
  private localPlayer: PlayerEntity | null = null;
  private remotePlayers = new Map<string, PlayerEntity>();
  private channel: RealtimeChannel | null = null;
  private animFrameId: number | null = null;
  private events: EngineEvents;
  private moveCooldown = 0;
  private lastFrameMs: number | null = null;
  private readonly clientId: string;
  private subscribed = false;
  private lastNearbyKey = "";

  constructor(canvas: HTMLCanvasElement, events: EngineEvents) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d")!;
    this.renderer = new Renderer(ctx);
    this.camera = new Camera(canvas.width, canvas.height);
    this.input = new InputManager();
    this.events = events;
    this.clientId = makeClientId();
  }

  connect(name: string, avatar: number) {
    const offsets: Array<[number, number]> = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
      [0, 2],
      [2, 0],
      [-2, 0],
      [0, -2],
    ];
    const pick = offsets[Math.floor(Math.random() * offsets.length)];
    const spawnX = 15 + pick[0];
    const spawnY = 10 + pick[1];

    this.localPlayer = new PlayerEntity(this.clientId, name, avatar, spawnX, spawnY);
    this.notifyPlayersUpdate();

    const supabase = getSupabase();
    const channel = supabase.channel(ROOM_CHANNEL, {
      config: {
        presence: { key: this.clientId },
        broadcast: { self: false },
        private: false,
      },
    });
    this.channel = channel;

    channel.on("presence", { event: "sync" }, () => {
      if (!this.localPlayer) return;
      const state = channel.presenceState<PresencePayload>();
      const onlineIds = new Set<string>();
      for (const key in state) {
        if (key === this.clientId) continue;
        const entries = state[key];
        if (!entries || entries.length === 0) continue;
        const p = entries[0];
        onlineIds.add(p.id);
        let remote = this.remotePlayers.get(p.id);
        if (!remote) {
          remote = new PlayerEntity(p.id, p.name, p.avatar, p.x, p.y);
          remote.direction = p.direction;
          this.remotePlayers.set(p.id, remote);
        } else if (
          !remote.isVenting &&
          (remote.x !== p.x || remote.y !== p.y || remote.direction !== p.direction)
        ) {
          remote.moveTo(p.x, p.y, p.direction);
        }
      }
      for (const id of Array.from(this.remotePlayers.keys())) {
        if (!onlineIds.has(id)) this.remotePlayers.delete(id);
      }
      this.notifyPlayersUpdate();
    });

    channel.on("broadcast", { event: "chat" }, ({ payload }) => {
      const p = payload as {
        id: string;
        fromId: string;
        fromName: string;
        text: string;
        timestamp: number;
        x: number;
        y: number;
      };
      const local = this.localPlayer;
      if (!local) return;
      // Proximity filter on receive
      const dist = Math.abs(p.x - local.x) + Math.abs(p.y - local.y);
      if (dist > PROXIMITY_RADIUS) return;

      const remote = this.remotePlayers.get(p.fromId);
      remote?.showChat(p.text);

      this.events.onChatMessage({
        id: p.id,
        fromId: p.fromId,
        fromName: p.fromName,
        text: p.text,
        timestamp: p.timestamp,
      });
    });

    channel.on("broadcast", { event: "vent" }, ({ payload }) => {
      const p = payload as {
        id: string;
        fromX: number;
        fromY: number;
        toX: number;
        toY: number;
      };
      if (p.id === this.clientId) return;
      const remote = this.remotePlayers.get(p.id);
      remote?.startVent(p.fromX, p.fromY, p.toX, p.toY);
    });

    channel.on("broadcast", { event: "jump" }, ({ payload }) => {
      const p = payload as { id: string };
      if (p.id === this.clientId) return;
      const remote = this.remotePlayers.get(p.id);
      remote?.startJump();
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        this.subscribed = true;
        await channel.track({
          id: this.clientId,
          name,
          avatar,
          x: spawnX,
          y: spawnY,
          direction: "down",
        } satisfies PresencePayload);
        this.events.onConnected();
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        this.subscribed = false;
        this.events.onDisconnected();
      }
    }, 30000);

    this.startLoop();
  }

  private trackPresence() {
    if (!this.subscribed || !this.channel || !this.localPlayer) return;
    const p = this.localPlayer;
    void this.channel.track({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      x: p.x,
      y: p.y,
      direction: p.direction,
    } satisfies PresencePayload);
  }

  private broadcast(event: string, payload: Record<string, unknown>) {
    if (!this.subscribed || !this.channel) return;
    void this.channel.send({ type: "broadcast", event, payload });
  }

  private notifyPlayersUpdate() {
    this.events.onPlayersUpdate(this.getAllPlayers());
  }

  private getAllPlayers(): PlayerEntity[] {
    const players: PlayerEntity[] = [];
    if (this.localPlayer) players.push(this.localPlayer);
    for (const p of this.remotePlayers.values()) players.push(p);
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
      const others = getVentPositions().filter((v) => !(v.x === px && v.y === py));
      if (others.length > 0) {
        const target = others[Math.floor(Math.random() * others.length)];
        this.localPlayer.startVent(px, py, target.x, target.y);
        this.broadcast("vent", {
          id: this.clientId,
          fromX: px,
          fromY: py,
          toX: target.x,
          toY: target.y,
        });
        this.trackPresence();
        return;
      }
    }

    this.localPlayer.startJump();
    this.broadcast("jump", { id: this.clientId });
  }

  private update(dtMs: number) {
    if (this.localPlayer?.isVenting) this.localPlayer.tickVent(dtMs);
    if (this.localPlayer?.isJumping) this.localPlayer.tickJump(dtMs);
    for (const p of this.remotePlayers.values()) {
      if (p.isVenting) p.tickVent(dtMs);
      if (p.isJumping) p.tickJump(dtMs);
    }

    if (this.input.consumeSpacePress()) {
      this.handleSpacePress();
    }

    if (this.localPlayer && !this.localPlayer.isVenting && this.moveCooldown <= 0) {
      const dir = this.input.getDirection();
      if (dir && !this.localPlayer.isMoving) {
        const newX = this.localPlayer.x + dir.dx;
        const newY = this.localPlayer.y + dir.dy;
        if (isWalkable(newX, newY)) {
          this.localPlayer.moveTo(newX, newY, dir.direction);
          this.trackPresence();
          this.moveCooldown = 8;
        } else {
          this.localPlayer.direction = dir.direction;
          this.trackPresence();
        }
      }
    }
    if (this.moveCooldown > 0) this.moveCooldown--;

    this.localPlayer?.update();
    for (const p of this.remotePlayers.values()) p.update();

    if (this.localPlayer) {
      this.camera.follow(this.localPlayer.x, this.localPlayer.y);
    }

    if (this.localPlayer) {
      const nearbyIds: string[] = [];
      for (const p of this.remotePlayers.values()) {
        const dist = Math.abs(p.x - this.localPlayer.x) + Math.abs(p.y - this.localPlayer.y);
        if (dist <= PROXIMITY_RADIUS) nearbyIds.push(p.id);
      }
      nearbyIds.sort();
      const key = nearbyIds.join(",");
      if (key !== this.lastNearbyKey) {
        this.lastNearbyKey = key;
        this.events.onNearbyChange(nearbyIds);
      }
    }
  }

  private render() {
    this.renderer.tick();
    this.renderer.clear();

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
    if (!this.subscribed || !this.channel || !this.localPlayer) return;
    const now = Date.now();
    const chatMsg = {
      id: `msg_${now}_${this.clientId}`,
      fromId: this.clientId,
      fromName: this.localPlayer.name,
      text,
      timestamp: now,
      x: this.localPlayer.x,
      y: this.localPlayer.y,
    };
    // Local echo (proximity check not needed for own message)
    this.localPlayer.showChat(text);
    this.events.onChatMessage({
      id: chatMsg.id,
      fromId: chatMsg.fromId,
      fromName: chatMsg.fromName,
      text: chatMsg.text,
      timestamp: chatMsg.timestamp,
    });
    this.broadcast("chat", chatMsg);
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
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.input.destroy();
    if (this.channel) {
      void this.channel.unsubscribe();
      this.channel = null;
    }
  }
}
