"use client";
import { useEffect, useState } from "react";
import { ChatRoom } from "./room/ChatRoom";

type Room = { id: string; name: string | null; code: string; createdBy: string; isDm: boolean };

export function RoomsTab() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<Room | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  async function fetchRooms() {
    const r = await fetch("/api/rooms", { cache: "no-store" }).then(r => r.json());
    if (r.ok) setRooms(r.rooms);
  }

  useEffect(() => { fetchRooms(); }, []);

  if (selected) {
    return <ChatRoom room={selected} onBack={() => { setSelected(null); fetchRooms(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className="btn" onClick={() => setCreating(true)}>새 방 만들기</button>
        <button className="btn-ghost" onClick={() => setJoining(true)}>코드로 참여</button>
      </div>

      {creating && <CreateRoom onClose={() => { setCreating(false); fetchRooms(); }} />}
      {joining && (
        <div className="card animate-fade-in-up">
          <div className="flex gap-2">
            <input className="input" placeholder="방 코드(6자)" value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}/>
            <button className="btn" onClick={async () => {
              const r = await fetch("/api/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "join", code: joinCode.trim() })
              }).then(r => r.json());
              if (r.ok) { setJoining(false); setSelected(r.room); }
              else alert(r.error ?? "참여 실패");
            }}>참여</button>
            <button className="btn-ghost" onClick={() => setJoining(false)}>닫기</button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {rooms.map(room => (
          <button key={room.id}
            className="card text-left hover:scale-[1.01] transition"
            onClick={() => setSelected(room)}>
            <div className="font-semibold">{room.name ?? "이름 없는 방"}</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">코드: {room.code}</div>
          </button>
        ))}
        {rooms.length === 0 && <div className="opacity-60">참여한 방이 없습니다.</div>}
      </div>
    </div>
  );
}

function CreateRoom({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="card animate-fade-in-up">
      <div className="flex gap-2">
        <input className="input" placeholder="방 이름" value={name}
          onChange={e => setName(e.target.value)}/>
        <button className="btn" onClick={async () => {
          const r = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create", name })
          }).then(r => r.json());
          if (r.ok) onClose(); else alert("생성 실패");
        }}>만들기</button>
        <button className="btn-ghost" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
