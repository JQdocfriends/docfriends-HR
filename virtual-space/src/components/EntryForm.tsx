"use client";

import { useState } from "react";

const AVATAR_COLORS = [
  { color: "#FF6B6B", label: "Red" },
  { color: "#4ECDC4", label: "Teal" },
  { color: "#45B7D1", label: "Blue" },
  { color: "#96CEB4", label: "Green" },
  { color: "#FFEAA7", label: "Yellow" },
  { color: "#DDA0DD", label: "Purple" },
];

interface Props {
  onJoin: (name: string, avatar: number) => void;
}

export default function EntryForm({ onJoin }: Props) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim(), avatar);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-700"
      >
        <h1 className="text-4xl font-bold text-center text-white mb-1">
          숲
        </h1>
        <p className="text-gray-500 text-center text-xs mb-1 font-mono">
          임금님 귀는 당나귀 귀
        </p>
        <p className="text-gray-400 text-center mb-8 text-sm">
          숲에서 자유롭게 이야기하세요
        </p>

        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요..."
            maxLength={16}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            autoFocus
          />
        </div>

        <div className="mb-8">
          <label className="block text-gray-300 text-sm font-medium mb-3">
            아바타 선택
          </label>
          <div className="flex gap-3 justify-center">
            {AVATAR_COLORS.map((av, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAvatar(i)}
                className={`w-12 h-12 rounded-xl transition-all flex items-center justify-center ${
                  avatar === i
                    ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110"
                    : "hover:scale-105 opacity-70 hover:opacity-100"
                }`}
                style={{ backgroundColor: av.color }}
              >
                <span className="text-lg">😊</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors font-mono text-lg"
        >
          숲으로 들어가기 →
        </button>

        <div className="mt-6 text-center text-gray-500 text-xs">
          <p>WASD / 방향키로 이동</p>
          <p>가까이 있는 사람과 대화할 수 있어요</p>
        </div>
      </form>
    </div>
  );
}
