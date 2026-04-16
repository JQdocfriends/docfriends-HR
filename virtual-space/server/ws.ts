import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

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
          const spawnX = 5 + Math.floor(Math.random() * 20);
          const spawnY = 5 + Math.floor(Math.random() * 10);
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
