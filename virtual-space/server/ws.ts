import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { VENT_POSITIONS, isVentCoord } from "../src/lib/vents";

interface Player {
  id: string;
  name: string;
  avatar: number;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  ws: WebSocket;
}

const players = new Map<string, Player>();
let nextId = 1;

function generateId(): string {
  return `p${nextId++}`;
}

function broadcast(data: object, excludeId?: string) {
  const msg = JSON.stringify(data);
  for (const [id, player] of players) {
    if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(msg);
    }
  }
}

function sendTo(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function manhattanDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const PROXIMITY_RADIUS = 5;

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    let playerId: string | null = null;

    ws.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case "join": {
          playerId = generateId();
          // Spawn near path intersection (center of map) with slight offset
          const offsets = [[-1,-1],[-1,1],[1,-1],[1,1],[0,2],[2,0],[-2,0],[0,-2]];
          const offset = offsets[players.size % offsets.length];
          const spawnX = 15 + (offset?.[0] ?? 0);
          const spawnY = 10 + (offset?.[1] ?? 0);
          const player: Player = {
            id: playerId,
            name: msg.name || "Anonymous",
            avatar: msg.avatar ?? 0,
            x: spawnX,
            y: spawnY,
            direction: "down",
            ws,
          };
          players.set(playerId, player);

          // Send init to the joining player
          const existingPlayers = Array.from(players.values())
            .filter((p) => p.id !== playerId)
            .map(({ ws: _, ...rest }) => rest);

          sendTo(ws, {
            type: "init",
            id: playerId,
            players: existingPlayers,
            selfPlayer: { id: playerId, name: player.name, avatar: player.avatar, x: player.x, y: player.y, direction: player.direction },
          });

          // Broadcast join to others
          broadcast(
            {
              type: "player_join",
              player: { id: playerId, name: player.name, avatar: player.avatar, x: player.x, y: player.y, direction: player.direction },
            },
            playerId
          );

          console.log(`${player.name} joined (${playerId}), total: ${players.size}`);
          break;
        }

        case "move": {
          if (!playerId) return;
          const player = players.get(playerId);
          if (!player) return;
          player.x = msg.x;
          player.y = msg.y;
          player.direction = msg.direction;

          broadcast(
            { type: "player_move", id: playerId, x: msg.x, y: msg.y, direction: msg.direction },
            playerId
          );
          break;
        }

        case "chat": {
          if (!playerId) return;
          const sender = players.get(playerId);
          if (!sender) return;

          const chatMsg = {
            type: "chat" as const,
            message: {
              id: `msg_${Date.now()}_${playerId}`,
              fromId: playerId,
              fromName: sender.name,
              text: msg.text,
              timestamp: Date.now(),
            },
          };

          // Send to nearby players only
          for (const [id, other] of players) {
            if (id === playerId) {
              sendTo(other.ws, chatMsg); // echo back to sender
              continue;
            }
            if (manhattanDistance(sender, other) <= PROXIMITY_RADIUS) {
              sendTo(other.ws, chatMsg);
            }
          }
          break;
        }

        case "vent": {
          if (!playerId) return;
          const p = players.get(playerId);
          if (!p) return;
          if (p.x !== msg.fromX || p.y !== msg.fromY) return;
          if (!isVentCoord(p.x, p.y)) return;
          const candidates = VENT_POSITIONS.filter(
            (v) => !(v.x === p.x && v.y === p.y)
          );
          if (candidates.length === 0) return;
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          p.x = target.x;
          p.y = target.y;
          broadcast({
            type: "player_vent",
            id: playerId,
            fromX: msg.fromX,
            fromY: msg.fromY,
            toX: target.x,
            toY: target.y,
          });
          console.log(`${p.name} vented (${msg.fromX},${msg.fromY}) → (${target.x},${target.y})`);
          break;
        }

        case "jump": {
          if (!playerId) return;
          // Broadcast to everyone except the sender (sender already started locally).
          broadcast({ type: "player_jump", id: playerId }, playerId);
          break;
        }
      }
    });

    ws.on("close", () => {
      if (playerId) {
        const player = players.get(playerId);
        console.log(`${player?.name} left (${playerId}), total: ${players.size - 1}`);
        players.delete(playerId);
        broadcast({ type: "player_leave", id: playerId });
      }
    });
  });

  console.log("WebSocket server initialized");
}
