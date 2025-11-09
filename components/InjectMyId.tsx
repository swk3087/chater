"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function InjectMyId() {
  const { data: session } = useSession();
  useEffect(() => {
    (window as any).__meId = session?.user?.id;
  }, [session?.user?.id]);
  return null;
}
