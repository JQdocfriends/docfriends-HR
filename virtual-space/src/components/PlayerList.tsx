"use client";

import type { PlayerEntity } from "@/game/player";

const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
];

interface Props {
  players: PlayerEntity[];
  localId: string | null;
  nearbyIds: string[];
}

export default function PlayerList({ players, localId, nearbyIds }: Props) {
  return (
    <div className="absolute top-4 right-4 w-56 bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
      <div className="px-4 py-2 border-b border-gray-700">
        <span className="text-white text-sm font-mono font-bold">
          접속 중 ({players.length})
        </span>
      </div>
      <div className="max-h-60 overflow-y-auto p-2 space-y-1">
        {players.map((p) => {
          const isLocal = p.id === localId;
          const isNearby = nearbyIds.includes(p.id);
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                isLocal ? "bg-gray-700/50" : ""
              }`}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: AVATAR_COLORS[p.avatar % AVATAR_COLORS.length] }}
              />
              <span className="text-white font-mono truncate flex-1">
                {p.name}
                {isLocal && <span className="text-gray-500 ml-1">(나)</span>}
              </span>
              {isNearby && !isLocal && (
                <span className="text-green-400 text-xs">근처</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
