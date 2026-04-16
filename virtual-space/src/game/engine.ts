import { Camera } from "./camera";
import { InputManager } from "./input";
import { Renderer } from "./renderer";
import { PlayerEntity } from "./player";
import { isWalkable } from "./map";
import type { ServerMessage, ChatMessage } from "@/types";
import { WS_URL, PROXIMITY_RADIUS } from "@/lib/constants";

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
      const msg: ServerMessage & { selfPlayer?: any } = JSON.parse(event.data);
      this.handleServerMessage(msg);
    };

    this.ws.onclose = () => {
      this.events.onDisconnected();
    };

    this.startLoop();
  }

  private handleServerMessage(msg: ServerMessage & { selfPlayer?: any }) {
    switch (msg.type) {
      case "init": {
        const sp = (msg as any).selfPlayer;
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
        if (remote) {
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
        // Show bubble on the player
        if (chatMsg.fromId === this.localPlayer?.id) {
          this.localPlayer?.showChat(chatMsg.text);
        } else {
          const remote = this.remotePlayers.get(chatMsg.fromId);
          remote?.showChat(chatMsg.text);
        }
        this.events.onChatMessage(chatMsg);
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
    const loop = () => {
      this.update();
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private update() {
    // Handle local player movement
    if (this.localPlayer && this.moveCooldown <= 0) {
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
          this.moveCooldown = 8; // prevent too fast movement
        } else {
          this.localPlayer.direction = dir.direction;
        }
      }
    }
    if (this.moveCooldown > 0) this.moveCooldown--;

    // Update all players (smooth movement)
    this.localPlayer?.update();
    for (const p of this.remotePlayers.values()) {
      p.update();
    }

    // Camera follow
    if (this.localPlayer) {
      this.camera.follow(this.localPlayer.x, this.localPlayer.y);
    }

    // Update nearby players
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
    this.renderer.clear();
    this.renderer.drawMap(this.camera);

    // Draw remote players
    for (const p of this.remotePlayers.values()) {
      this.renderer.drawPlayer(p, this.camera, false);
    }

    // Draw local player on top
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

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.ws?.close();
  }
}
