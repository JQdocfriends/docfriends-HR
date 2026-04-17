import { WebSocketServer, WebSocket } from "ws";
import type { Server, IncomingMessage } from "http";
import { VENT_POSITIONS, isVentCoord } from "../src/lib/vents";

interface Player {
  id: string;
  name: string;
  avatar: number;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  ws: WebSocket;
  lastMoveMs: number;
  lastChatMs: number;
  lastVentMs: number;
  lastJumpMs: number;
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

// Production safeguards — configurable via env vars
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 50;
const MAX_CONNECTIONS_PER_IP = Number(process.env.MAX_CONNECTIONS_PER_IP) || 3;
const MOVE_MIN_MS = Number(process.env.MOVE_MIN_MS) || 50;
const CHAT_MIN_MS = Number(process.env.CHAT_MIN_MS) || 200;
const VENT_MIN_MS = Number(process.env.VENT_MIN_MS) || 500;
const JUMP_MIN_MS = Number(process.env.JUMP_MIN_MS) || 100;
const NAME_MAX_LEN = 16;
const CHAT_MAX_LEN = 200;

const ipConnections = new Map<string, number>();

function ipOf(req: IncomingMessage): string {
  const xf = req.headers["x-forwarded-for"];
  const forwarded = Array.isArray(xf) ? xf[0] : xf?.split(",")[0]?.trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (ALLOWED_ORIGINS.length === 0) return true; // permissive when not configured (dev)
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "Anonymous";
  const trimmed = raw.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  return trimmed.slice(0, NAME_MAX_LEN) || "Anonymous";
}

function sanitizeChat(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, CHAT_MAX_LEN);
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const origin = req.headers.origin;
    if (!isOriginAllowed(origin)) {
      console.warn(`Rejected WS from disallowed origin: ${origin}`);
      ws.close(1008, "origin");
      return;
    }
    const ip = ipOf(req);
    const ipCount = ipConnections.get(ip) ?? 0;
    if (ipCount >= MAX_CONNECTIONS_PER_IP) {
      console.warn(`Rejected WS from ${ip}: too many connections`);
      ws.close(1008, "too-many-connections");
      return;
    }
    if (players.size >= MAX_PLAYERS) {
      console.warn(`Rejected WS from ${ip}: server full`);
      ws.close(1008, "server-full");
      return;
    }
    ipConnections.set(ip, ipCount + 1);

    let playerId: string | null = null;

    ws.on("message", (raw) => {
      let msg: { type?: string; [k: string]: unknown };
      try {
        const parsed = JSON.parse(raw.toString());
        if (!parsed || typeof parsed !== "object") return;
        msg = parsed;
      } catch {
        return;
      }

      switch (msg.type) {
        case "join": {
          if (playerId) return; // already joined
          playerId = generateId();
          const offsets = [[-1, -1], [-1, 1], [1, -1], [1, 1], [0, 2], [2, 0], [-2, 0], [0, -2]];
          const offset = offsets[players.size % offsets.length];
          const spawnX = 15 + (offset?.[0] ?? 0);
          const spawnY = 10 + (offset?.[1] ?? 0);
          const now = Date.now();
          const player: Player = {
            id: playerId,
            name: sanitizeName(msg.name),
            avatar: typeof msg.avatar === "number" && Number.isFinite(msg.avatar) ? Math.floor(msg.avatar) : 0,
            x: spawnX,
            y: spawnY,
            direction: "down",
            ws,
            lastMoveMs: 0,
            lastChatMs: 0,
            lastVentMs: 0,
            lastJumpMs: 0,
          };
          players.set(playerId, player);

          const existingPlayers = Array.from(players.values())
            .filter((p) => p.id !== playerId)
            .map(({ ws: _ws, lastMoveMs: _m, lastChatMs: _c, lastVentMs: _v, lastJumpMs: _j, ...rest }) => rest);

          sendTo(ws, {
            type: "init",
            id: playerId,
            players: existingPlayers,
            selfPlayer: {
              id: playerId,
              name: player.name,
              avatar: player.avatar,
              x: player.x,
              y: player.y,
              direction: player.direction,
            },
          });

          broadcast(
            {
              type: "player_join",
              player: {
                id: playerId,
                name: player.name,
                avatar: player.avatar,
                x: player.x,
                y: player.y,
                direction: player.direction,
              },
            },
            playerId,
          );

          void now;
          console.log(`${player.name} joined (${playerId}), total: ${players.size}`);
          break;
        }

        case "move": {
          if (!playerId) return;
          const p = players.get(playerId);
          if (!p) return;
          const now = Date.now();
          if (now - p.lastMoveMs < MOVE_MIN_MS) return;
          const nx = typeof msg.x === "number" ? Math.floor(msg.x) : NaN;
          const ny = typeof msg.y === "number" ? Math.floor(msg.y) : NaN;
          const dir = msg.direction;
          if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
          if (dir !== "up" && dir !== "down" && dir !== "left" && dir !== "right") return;
          // Must be exactly one orthogonal tile from current position
          const step = Math.abs(nx - p.x) + Math.abs(ny - p.y);
          if (step !== 1) return;
          p.x = nx;
          p.y = ny;
          p.direction = dir;
          p.lastMoveMs = now;
          broadcast(
            { type: "player_move", id: playerId, x: nx, y: ny, direction: dir },
            playerId,
          );
          break;
        }

        case "chat": {
          if (!playerId) return;
          const sender = players.get(playerId);
          if (!sender) return;
          const now = Date.now();
          if (now - sender.lastChatMs < CHAT_MIN_MS) return;
          const text = sanitizeChat(msg.text);
          if (!text) return;
          sender.lastChatMs = now;

          const chatMsg = {
            type: "chat" as const,
            message: {
              id: `msg_${now}_${playerId}`,
              fromId: playerId,
              fromName: sender.name,
              text,
              timestamp: now,
            },
          };

          for (const [id, other] of players) {
            if (id === playerId) {
              sendTo(other.ws, chatMsg);
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
          const now = Date.now();
          if (now - p.lastVentMs < VENT_MIN_MS) return;
          if (typeof msg.fromX !== "number" || typeof msg.fromY !== "number") return;
          if (p.x !== msg.fromX || p.y !== msg.fromY) return;
          if (!isVentCoord(p.x, p.y)) return;
          const candidates = VENT_POSITIONS.filter((v) => !(v.x === p.x && v.y === p.y));
          if (candidates.length === 0) return;
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          p.x = target.x;
          p.y = target.y;
          p.lastVentMs = now;
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
          const p = players.get(playerId);
          if (!p) return;
          const now = Date.now();
          if (now - p.lastJumpMs < JUMP_MIN_MS) return;
          p.lastJumpMs = now;
          broadcast({ type: "player_jump", id: playerId }, playerId);
          break;
        }
      }
    });

    ws.on("close", () => {
      const remaining = (ipConnections.get(ip) ?? 1) - 1;
      if (remaining <= 0) ipConnections.delete(ip);
      else ipConnections.set(ip, remaining);

      if (playerId) {
        const player = players.get(playerId);
        console.log(`${player?.name} left (${playerId}), total: ${players.size - 1}`);
        players.delete(playerId);
        broadcast({ type: "player_leave", id: playerId });
      }
    });
  });

  console.log("WebSocket server initialized");
  if (ALLOWED_ORIGINS.length > 0) {
    console.log(`  Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  } else {
    console.log("  Allowed origins: * (set ALLOWED_ORIGINS in production)");
  }
  console.log(`  Max players: ${MAX_PLAYERS} · max conn/IP: ${MAX_CONNECTIONS_PER_IP}`);
}
