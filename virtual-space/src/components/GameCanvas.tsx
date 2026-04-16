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
  const [players, setPlayers] = useState<PlayerEntity[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nearbyIds, setNearbyIds] = useState<string[]>([]);
  const [localId, setLocalId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const handleSend = useCallback((text: string) => {
    engineRef.current?.sendChat(text);
  }, []);

  const handleChatFocus = useCallback(() => {
    engineRef.current?.setInputEnabled(false);
  }, []);

  const handleChatBlur = useCallback(() => {
    engineRef.current?.setInputEnabled(true);
  }, []);

  useEffect(() => {
    const handleGlobalEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter" && document.activeElement !== chatInputRef.current) {
        e.preventDefault();
        chatInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalEnter);
    return () => window.removeEventListener("keydown", handleGlobalEnter);
  }, []);

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
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900">
      <canvas
        ref={canvasRef}
        className="block"
        style={{ imageRendering: "pixelated" }}
      />

      {/* Connection status */}
      <div className="absolute top-4 left-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono ${
          connected ? "bg-green-900/80 text-green-300" : "bg-red-900/80 text-red-300"
        }`}>
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
          {connected ? "연결됨" : "연결 끊김"}
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 text-gray-500 text-xs font-mono bg-gray-900/70 px-3 py-2 rounded-lg">
        방향키로 이동
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
