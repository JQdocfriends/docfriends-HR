"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { GameEngine } from "@/game/engine";
import type { PlayerEntity } from "@/game/player";
import type { ChatMessage } from "@/types";
import ChatPanel from "./ChatPanel";
import PlayerList from "./PlayerList";

interface Props {
  name: string;
  avatar: number;
}

export default function GameCanvas({ name, avatar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const floatingInputRef = useRef<HTMLInputElement>(null);
  const floatingWrapperRef = useRef<HTMLDivElement>(null);
  const [players, setPlayers] = useState<PlayerEntity[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nearbyIds, setNearbyIds] = useState<string[]>([]);
  const [localId, setLocalId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [floatingActive, setFloatingActive] = useState(false);
  const [floatingText, setFloatingText] = useState("");

  const handleSend = useCallback((text: string) => {
    engineRef.current?.sendChat(text);
  }, []);

  const handleChatFocus = useCallback(() => {
    engineRef.current?.setInputEnabled(false);
  }, []);

  const handleChatBlur = useCallback(() => {
    engineRef.current?.setInputEnabled(true);
  }, []);

  // Enter: open floating chat input above character (unless typing in an input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const active = document.activeElement as HTMLElement | null;
      if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA") return;
      e.preventDefault();
      setFloatingActive(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus the floating input and disable movement while it's active
  useEffect(() => {
    if (floatingActive) {
      engineRef.current?.setInputEnabled(false);
      floatingInputRef.current?.focus();
    } else {
      engineRef.current?.setInputEnabled(true);
      setFloatingText("");
    }
  }, [floatingActive]);

  // Track the character's screen position each frame while the input is open
  useEffect(() => {
    if (!floatingActive) return;
    let raf = 0;
    const tick = () => {
      const pos = engineRef.current?.getLocalPlayerScreenPos();
      const wrap = floatingWrapperRef.current;
      if (pos && wrap) {
        wrap.style.left = `${pos.x}px`;
        wrap.style.top = `${pos.y}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [floatingActive]);

  const handleFloatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = floatingText.trim();
    if (trimmed) {
      engineRef.current?.sendChat(trimmed);
    }
    setFloatingActive(false);
  };

  const handleFloatingKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setFloatingActive(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new GameEngine(canvas, {
      onPlayersUpdate: (allPlayers) => {
        setPlayers([...allPlayers]);
        // Extract local player id from first player update
        if (allPlayers.length > 0 && !engineRef.current) return;
        const local = allPlayers.find((p) => p.id === localId);
        if (!local && allPlayers.length > 0) {
          setLocalId(allPlayers[0].id);
        }
      },
      onChatMessage: (msg) => {
        setMessages((prev) => [...prev.slice(-50), msg]);
      },
      onNearbyChange: (ids) => {
        setNearbyIds(ids);
      },
      onConnected: () => setConnected(true),
      onDisconnected: () => setConnected(false),
    });

    engineRef.current = engine;
    engine.connect(name, avatar);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine.resize(canvas.width, canvas.height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, [name, avatar]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1a2a15]">
      <canvas
        ref={canvasRef}
        className="block"
        style={{ imageRendering: "pixelated" }}
      />

      {/* Floating chat input above the character */}
      {floatingActive && (
        <div
          ref={floatingWrapperRef}
          className="absolute pointer-events-auto -translate-x-1/2 -translate-y-full pb-2"
          style={{ left: -9999, top: -9999 }}
        >
          <form onSubmit={handleFloatingSubmit}>
            <input
              ref={floatingInputRef}
              type="text"
              value={floatingText}
              onChange={(e) => setFloatingText(e.target.value)}
              onKeyDown={handleFloatingKeyDown}
              onBlur={() => setFloatingActive(false)}
              maxLength={100}
              placeholder="이야기하기..."
              className="px-3 py-2 bg-white/95 backdrop-blur-sm border-2 border-[#6aaa4a] rounded-xl text-[#1a2a15] text-sm placeholder-[#6a7a60] focus:outline-none min-w-[220px] shadow-lg"
            />
          </form>
        </div>
      )}

      {/* Connection status */}
      <div className="absolute top-4 left-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] ${
          connected
            ? "bg-[#1a2a15]/80 text-[#6aaa4a] border border-[#3a5a2a]/40"
            : "bg-[#2a1515]/80 text-[#cc6666] border border-[#5a2a2a]/40"
        } backdrop-blur-sm`}>
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[#6aaa4a]" : "bg-[#cc6666]"}`} />
          {connected ? "연결됨" : "연결 끊김"}
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 text-[#5a7a4a] text-[11px] bg-[#1a2a15]/70 backdrop-blur-sm px-3 py-2 rounded-xl border border-[#3a5a2a]/30">
        방향키 이동 · Enter 대화 · Esc 취소
      </div>

      <PlayerList players={players} localId={localId} nearbyIds={nearbyIds} />
      <ChatPanel
        messages={messages}
        nearbyCount={nearbyIds.length}
        onSend={handleSend}
        onFocus={handleChatFocus}
        onBlur={handleChatBlur}
        chatRef={chatInputRef}
      />
    </div>
  );
}
