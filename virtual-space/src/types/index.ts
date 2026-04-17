// Shared types for client and server

export interface Player {
  id: string;
  name: string;
  avatar: number;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
}

export interface ChatMessage {
  id: string;
  fromId: string;
  fromName: string;
  text: string;
  timestamp: number;
}

// Client -> Server messages
export type ClientMessage =
  | { type: "join"; name: string; avatar: number }
  | { type: "move"; x: number; y: number; direction: Player["direction"] }
  | { type: "chat"; text: string }
  | { type: "vent"; fromX: number; fromY: number }
  | { type: "jump" };

// Server -> Client messages
export type ServerMessage =
  | { type: "init"; id: string; players: Player[] }
  | { type: "player_join"; player: Player }
  | { type: "player_move"; id: string; x: number; y: number; direction: Player["direction"] }
  | { type: "player_leave"; id: string }
  | { type: "chat"; message: ChatMessage }
  | { type: "player_vent"; id: string; fromX: number; fromY: number; toX: number; toY: number }
  | { type: "player_jump"; id: string };
