"use client";

import type { PlayerEntity } from "@/game/player";

const AVATAR_COLORS = [
  "#E8564A", "#3DBDB3", "#4A9FD9", "#7EC4A5",
  "#F0D56E", "#C88FD6", "#E8956A", "#6BCAEB",
];

interface Props {
  players: PlayerEntity[];
  localId: string | null;
  nearbyIds: string[];
}

export default function PlayerList({ players, localId, nearbyIds }: Props) {
  return (
    <div className="absolute top-4 right-4 w-48 bg-[#1a2a15]/85 backdrop-blur-md rounded-2xl border border-[#3a5a2a]/40 overflow-hidden shadow-xl">
      <div className="px-4 py-2.5 border-b border-[#3a5a2a]/30">
        <span className="text-[#c8e6b8] text-xs font-semibold tracking-wide">
          접속 중
          <span className="text-[#6aaa4a] ml-1.5">{players.length}</span>
        </span>
      </div>
      <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
        {players.map((p) => {
          const isLocal = p.id === localId;
          const isNearby = nearbyIds.includes(p.id);
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                isLocal ? "bg-[#2a3a20]/60" : "hover:bg-[#2a3a20]/30"
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/10"
                style={{ backgroundColor: AVATAR_COLORS[p.avatar % AVATAR_COLORS.length] }}
              />
              <span className="text-[#c8dab8] truncate flex-1 text-[12px]">
                {p.name}
                {isLocal && <span className="text-[#5a7a4a] ml-1">(나)</span>}
              </span>
              {isNearby && !isLocal && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#6aaa4a]" title="근처" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
