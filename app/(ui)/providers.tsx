"use client";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);
  return <SessionProvider>{children}</SessionProvider>;
}
