"use client";
import { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";

type Room = { id: string; name: string | null; code: string; createdBy: string; isDm: boolean };
type Msg = {
  id: string; content: string; createdAt: string; updatedAt: string; edited: boolean; deleted: boolean;
  user: { id: string; name: string | null; image: string | null; nickname: string | null };
  reactions: { id: string; userId: string; type: string }[];
  readCount: number; memberCount: number;
};

export function ChatRoom({ room, onBack }: { room: Room; onBack: () => void }) {
  const [items, setItems] = useState<Msg[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState<string[]>([]);
  const topRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const pusherRef = useRef<Pusher | null>(null);

  // 초기 로드
  async function loadInitial() {
    const r = await fetch(`/api/rooms/${room.id}/messages`).then(r => r.json());
    if (r.ok) {
      setItems(r.items.reverse());
      setNextCursor(r.nextCursor);
      markRead();
      setTimeout(() => scrollToBottom(), 0);
    }
  }

  useEffect(() => { loadInitial(); }, [room.id]);

  // Pusher 구독
  useEffect(() => {
    // @ts-ignore
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || (globalThis as any).NEXT_PUBLIC_PUSHER_KEY || "${PUSHER_KEY}", {
      cluster: (process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string) || "ap3"
    });
    pusherRef.current = pusher;
    const channel = pusher.subscribe(`room-${room.id}`);

    channel.bind("message:new", ({ message }: any) => {
      setItems(prev => [...prev, decorate(message, prev)]);
      scrollToBottom();
    });
    channel.bind("message:update", ({ message }: any) => {
      setItems(prev => prev.map(m => m.id === message.id ? { ...m, ...message, edited: true } : m));
    });
    channel.bind("message:delete", ({ id }: any) => {
      setItems(prev => prev.map(m => m.id === id ? { ...m, deleted: true, content: "삭제된 메시지" } : m));
    });
    channel.bind("reaction:update", ({ messageId, reactions }: any) => {
      setItems(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    });
    channel.bind("typing", ({ userId, nickname, isTyping }: any) => {
      setTyping(prev => {
        const set = new Set(prev);
        if (isTyping) set.add(nickname ?? "상대방");
        else set.delete(nickname ?? "상대방");
        return Array.from(set);
      });
    });

    return () => { pusher.unsubscribe(`room-${room.id}`); pusher.disconnect(); };
  }, [room.id]);

  function decorate(message: any, base: Msg[]): Msg {
    const memberCount = base.at(-1)?.memberCount ?? 1;
    return { ...message, readCount: 1, memberCount };
  }

  async function loadMore() {
    if (!nextCursor) return;
    const r = await fetch(`/api/rooms/${room.id}/messages?cursor=${nextCursor}`).then(r => r.json());
    if (r.ok) {
      setItems(prev => [...r.items.reverse(), ...prev]);
      setNextCursor(r.nextCursor);
      // keep scroll position
      topRef.current?.scrollIntoView({ block: "start" });
    }
  }

  function scrollToBottom() {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }

  async function markRead() {
    await fetch(`/api/rooms/${room.id}`, { method: "POST" }).catch(() => {});
  }

  async function send() {
    const content = text.trim();
    if (!content || sendingRef.current) return;
    sendingRef.current = true;
    const r = await fetch(`/api/rooms/${room.id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    }).then(r => r.json()).finally(() => (sendingRef.current = false));
    if (r.ok) setText("");
  }

  // typing 신호
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/typing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, isTyping: !!text })
      }).catch(() => {});
    }, 150);
    return () => clearTimeout(t);
  }, [text, room.id]);

  // 스크롤 이벤트(무한스크롤 + 읽음)
  useEffect(() => {
    const el = listRef.current!;
    const onScroll = () => {
      if (el.scrollTop < 60 && nextCursor) loadMore();
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) markRead();
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [nextCursor]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="btn-ghost" onClick={onBack}>← 뒤로</button>
        <div className="text-lg font-semibold">{room.name ?? "채팅방"} <span className="opacity-60 text-sm">/ 코드 {room.code}</span></div>
      </div>

      <div ref={listRef} className="card h-[65vh] sm:h-[70vh] overflow-y-auto">
        <div ref={topRef}></div>
        {items.map(m => (
          <MessageBubble key={m.id} msg={m} roomId={room.id} />
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="메시지 입력… (더블클릭=하트)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); send();
            }
          }}
        />
        <button className="btn" onClick={send}>보내기</button>
      </div>

      <div className="h-5 text-sm opacity-70">{typing.length ? `${typing.join(", ")} 입력중…` : " "}</div>
    </div>
  );
}

function MessageBubble({ msg, roomId }: { msg: Msg; roomId: string }) {
  const mine = typeof window !== "undefined" && (window as any).__meId && ((window as any).__meId === msg.user.id);
  const canEdit = !msg.deleted && minutesSince(msg.createdAt) <= 5 && mine;
  const canDelete = !msg.deleted && minutesSince(msg.createdAt) <= 1 && mine;
  const hearted = msg.reactions.some(r => r.type === "heart" && r.userId === (window as any).__meId);
  const heartCount = msg.reactions.filter(r => r.type === "heart").length;

  async function toggleHeart() {
    await fetch(`/api/rooms/${roomId}/reactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msg.id, type: "heart" })
    });
  }

  async function doEdit() {
    const content = prompt("수정할 메시지", msg.content);
    if (content == null) return;
    await fetch(`/api/rooms/${roomId}/messages`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: msg.id, content })
    }).then(r => r.json()).then(r => { if (!r.ok) alert(r.error ?? "수정 실패"); });
  }

  async function doDelete() {
    if (!confirm("정말 삭제하시겠습니까? (1분 이내만 가능)")) return;
    await fetch(`/api/rooms/${roomId}/messages`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: msg.id })
    }).then(r => r.json()).then(r => { if (!r.ok) alert(r.error ?? "삭제 실패"); });
  }

  return (
    <div
      onDoubleClick={toggleHeart}
      className={`my-2 flex gap-2 ${mine ? "justify-end" : "justify-start"} animate-fade-in-up`}
    >
      {!mine && (
        <img src={msg.user.image ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${msg.user.id}`}
             className="w-8 h-8 rounded-xl border" />
      )}
      <div className={`max-w-[75%] p-3 rounded-2xl shadow ${mine ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`}>
        <div className="text-xs opacity-80 mb-1">{msg.user.nickname ?? msg.user.name ?? "익명"}</div>
        <div className={`${msg.deleted ? "italic opacity-70" : ""}`}>{msg.content}</div>
        <div className="mt-1 text-[11px] opacity-70 flex items-center gap-2">
          <span>{timeStr(msg.createdAt)}{msg.edited ? " · 수정됨" : ""}</span>
          <span>· 읽음 {Math.max(0, msg.readCount - 1)}/{Math.max(0, msg.memberCount - 1)}</span>
          <button className={`btn-ghost px-1 py-0.5 rounded-lg ${hearted ? "animate-pulse-in" : ""}`} onClick={toggleHeart}>
            ❤️ {heartCount}
          </button>
          {canEdit && <button className="btn-ghost px-1 py-0.5" onClick={doEdit}>편집</button>}
          {canDelete && <button className="btn-ghost px-1 py-0.5" onClick={doDelete}>삭제</button>}
        </div>
      </div>
    </div>
  );
}

function minutesSince(iso: string) { return (Date.now() - new Date(iso).getTime()) / 60000; }
function timeStr(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}
