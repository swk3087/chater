import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { pusherServer, roomChannel } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const { roomId, isTyping } = await req.json().catch(() => ({}));
  if (!roomId) return NextResponse.json({ ok: false }, { status: 400 });

  await pusherServer.trigger(roomChannel(roomId), "typing", {
    userId: session.user.id,
    nickname: session.user.nickname ?? session.user.name,
    isTyping: !!isTyping
  });
  return NextResponse.json({ ok: true });
}
