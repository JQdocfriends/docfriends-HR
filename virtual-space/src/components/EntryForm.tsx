"use client";

import { useState } from "react";
import { AVATARS, VISOR_SHADOW } from "@/lib/avatars";
import DotField from "./DotField";

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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] relative overflow-hidden">
      {/* Interactive dot field — covers viewport; form card below sits on top */}
      <div className="absolute inset-0 pointer-events-none">
        <DotField
          dotRadius={1.5}
          dotSpacing={10}
          bulgeStrength={113}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
          cursorRadius={500}
          cursorForce={0.1}
          bulgeOnly
          gradientFrom="#A855F7"
          gradientTo="#B497CF"
          glowColor="#120F17"
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative bg-[#141826] rounded-3xl p-10 w-full max-w-md shadow-2xl border border-[#3a4560]/50"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-[#e0e8f5] mb-2 tracking-wide">
            숲
          </h1>
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-8 bg-[#58e0ff]/40" />
            <p className="text-[#58e0ff] text-[11px] tracking-widest uppercase">
              crewmate terminal
            </p>
            <div className="h-px w-8 bg-[#58e0ff]/40" />
          </div>
          <p className="text-[#8a9ab5] text-sm">
            숲에서 자유롭게 이야기하세요
          </p>
        </div>

        <div className="mb-7">
          <label className="block text-[#8a9ab5] text-xs font-medium mb-2 tracking-wide uppercase">
            이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            maxLength={16}
            className="w-full px-4 py-3 bg-[#0c1020]/60 border border-[#3a4560]/60 rounded-xl text-[#d4e0f0] placeholder-[#4a5a75] focus:outline-none focus:border-[#58e0ff]/60 focus:ring-1 focus:ring-[#58e0ff]/20 transition-all text-sm"
            autoFocus
          />
        </div>

        <div className="mb-8">
          <label className="block text-[#8a9ab5] text-xs font-medium mb-3 tracking-wide uppercase">
            색상
          </label>
          <div className="grid grid-cols-6 gap-3 justify-items-center">
            {AVATARS.map((av, i) => {
              const selected = avatar === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatar(i)}
                  aria-label={av.label}
                  title={av.label}
                  className={`relative w-[44px] h-[56px] transition-all duration-200 ${
                    selected
                      ? "scale-110"
                      : "opacity-60 hover:opacity-95 hover:scale-105"
                  }`}
                >
                  {/* Ground shadow */}
                  <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-[30px] h-[5px] rounded-full bg-black/35" />
                  {/* Backpack peeking on the back-right */}
                  <div
                    className="absolute top-[14px] right-[2px] w-[9px] h-[18px] rounded-[4px]"
                    style={{ backgroundColor: av.shadow }}
                  />
                  {/* Bean body with volume shading */}
                  <div
                    className="absolute top-[6px] left-[6px] right-[6px] bottom-[9px] rounded-t-[14px] rounded-b-[10px]"
                    style={{
                      backgroundColor: av.body,
                      boxShadow: `inset -4px -2px 0 ${av.shadow}, inset 3px 2px 0 rgba(255,255,255,0.15)`,
                    }}
                  />
                  {/* Visor — offset to the left for 3/4 angle */}
                  <div
                    className="absolute top-[11px] left-[5px] w-[16px] h-[10px] rounded-full overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, #D9EEF5 0%, #A8D5E8 50%, ${VISOR_SHADOW} 100%)`,
                      border: `1px solid ${VISOR_SHADOW}`,
                    }}
                  >
                    <div className="absolute top-[1.5px] left-[2.5px] w-[5px] h-[2.5px] rounded-full bg-white/90" />
                  </div>
                  {/* Staggered legs for perspective */}
                  <div
                    className="absolute bottom-0 left-[9px] w-[8px] h-[8px] rounded-[3px]"
                    style={{ backgroundColor: av.shadow }}
                  />
                  <div
                    className="absolute bottom-[2px] left-[22px] w-[8px] h-[6px] rounded-[3px]"
                    style={{ backgroundColor: av.shadow, opacity: 0.85 }}
                  />
                  {selected && (
                    <div className="absolute -inset-1 rounded-xl border-2 border-[#58e0ff]/80 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full py-3.5 bg-[#2a5a8a] hover:bg-[#3670a8] disabled:bg-[#1a2030] disabled:text-[#4a5570] disabled:cursor-not-allowed text-[#d4e8f5] font-semibold rounded-xl transition-all duration-200 text-sm tracking-wide border border-[#58e0ff]/30"
        >
          숲으로 들어가기
        </button>

        <div className="mt-6 text-center text-[#5a6b85] text-[11px] space-y-0.5">
          <p>방향키로 이동 · Enter로 대화</p>
          <p>가까이 있는 사람과 이야기할 수 있어요</p>
        </div>
      </form>
    </div>
  );
}
