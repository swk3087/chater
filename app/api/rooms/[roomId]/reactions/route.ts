import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { pusherServer, roomChannel } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { roomId: string }}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { messageId, type } = body as { messageId: string; type: "heart" };

  const found = await prisma.reaction.findUnique({
    where: { messageId_userId_type: { messageId, userId: session.user.id, type } }
  }).catch(() => null as any);

  if (found) {
    await prisma.reaction.delete({ where: { id: found.id } });
  } else {
    await prisma.reaction.create({ data: { messageId, userId: session.user.id, type } });
  }

  const reactions = await prisma.reaction.findMany({ where: { messageId } });
  await pusherServer.trigger(roomChannel(params.roomId), "reaction:update", { messageId, reactions });
  return NextResponse.json({ ok: true, reactions });
}
