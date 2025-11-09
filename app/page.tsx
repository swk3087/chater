"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { ProfileTab } from "@/components/ProfileTab";
import { RoomsTab } from "@/components/RoomsTab";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<"rooms" | "profile">("rooms");

  if (status === "loading") {
    return <div className="p-6">로딩중…</div>;
  }
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">채팅앱</h1>
        <button className="btn" onClick={() => signIn("google")}>
          Google로 시작하기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md sm:max-w-2xl lg:max-w-3xl p-4">
      <header className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            className={`btn-ghost ${tab === "rooms" ? "underline" : ""}`}
            onClick={() => setTab("rooms")}
          >
            채팅방
          </button>
          <button
            className={`btn-ghost ${tab === "profile" ? "underline" : ""}`}
            onClick={() => setTab("profile")}
          >
            프로필
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="btn-ghost" onClick={() => signOut()}>로그아웃</button>
        </div>
      </header>
      {tab === "rooms" ? <RoomsTab /> : <ProfileTab />}
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(false);
  return (
    <button
      aria-label="theme"
      className="btn-ghost"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
      }}
    >
      {dark ? "☾" : "☀"}
    </button>
  );
}
