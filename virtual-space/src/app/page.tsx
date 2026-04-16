"use client";

import { useState } from "react";
import EntryForm from "@/components/EntryForm";
import GameCanvas from "@/components/GameCanvas";

export default function Home() {
  const [joined, setJoined] = useState(false);
  const [playerInfo, setPlayerInfo] = useState({ name: "", avatar: 0 });

  const handleJoin = (name: string, avatar: number) => {
    setPlayerInfo({ name, avatar });
    setJoined(true);
  };

  if (!joined) {
    return <EntryForm onJoin={handleJoin} />;
  }

  return <GameCanvas name={playerInfo.name} avatar={playerInfo.avatar} />;
}
