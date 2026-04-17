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
    <div className="absolute bottom-4 right-4 w-72 bg-[#1a2a15]/85 backdrop-blur-md rounded-2xl border border-[#3a5a2a]/40 flex flex-col overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#3a5a2a]/30 flex items-center justify-between">
        <span className="text-[#c8e6b8] text-xs font-semibold tracking-wide">대화</span>
        <span className="text-[10px]">
          {nearbyCount > 0 ? (
            <span className="text-[#6aaa4a]">{nearbyCount}명 근처</span>
          ) : (
            <span className="text-[#5a6a50]">주변에 아무도 없어요</span>
          )}
        </span>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 max-h-44 overflow-y-auto px-4 py-2 space-y-1.5">
        {messages.length === 0 && (
          <p className="text-[#4a6a3a] text-[11px] text-center py-6">
            가까이 다가가서 이야기를 나눠보세요
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-[13px] leading-relaxed">
            <span className="text-[#8cc870] font-semibold">{msg.fromName}</span>
            <span className="text-[#c8dab8] ml-1.5">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-[#3a5a2a]/30">
        <div className="flex gap-1.5">
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
            className="flex-1 px-3 py-2 bg-[#162010]/60 border border-[#3a5a2a]/40 rounded-lg text-[#d4e8c8] text-xs placeholder-[#4a6a3a] focus:outline-none focus:border-[#6aaa4a]/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-3 py-2 bg-[#3a6a2a]/80 hover:bg-[#4a7a3a] disabled:bg-transparent disabled:text-[#3a5a2a] text-[#c8e6b8] rounded-lg text-xs font-semibold transition-colors"
          >
            ↵
          </button>
        </div>
      </form>
    </div>
  );
}
