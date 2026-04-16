"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types";

interface Props {
  messages: ChatMessage[];
  nearbyCount: number;
  onSend: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  chatRef?: React.RefObject<HTMLInputElement | null>;
}

export default function ChatPanel({ messages, nearbyCount, onSend, onFocus, onBlur, chatRef }: Props) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText("");
      chatRef?.current?.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !text.trim()) {
      e.preventDefault();
      chatRef?.current?.blur();
    }
  };

  return (
    <div className="absolute bottom-4 right-4 w-80 bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700 flex flex-col overflow-hidden shadow-2xl">
      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-white text-sm font-mono font-bold">대화</span>
        <span className="text-xs text-gray-400">
          {nearbyCount > 0 ? (
            <span className="text-green-400">{nearbyCount}명 근처</span>
          ) : (
            <span className="text-gray-500">주변에 아무도 없어요</span>
          )}
        </span>
      </div>

      <div ref={listRef} className="flex-1 max-h-48 overflow-y-auto px-4 py-2 space-y-1">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-4">
            가까이 다가가서 이야기를 나눠보세요!
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            <span className="text-blue-400 font-mono font-bold">{msg.fromName}</span>
            <span className="text-gray-300 ml-1">{msg.text}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            ref={chatRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            placeholder={nearbyCount > 0 ? "이야기하기..." : "주변에 아무도 없어요..."}
            maxLength={100}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors"
          >
            ↵
          </button>
        </div>
      </form>
    </div>
  );
}
