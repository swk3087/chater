import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { roomId: string }}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room) return NextResponse.json({ ok: false }, { status: 404 });
  const members = await prisma.membership.findMany({
    where: { roomId: params.roomId },
    include: { user: true }
  });
  return NextResponse.json({ ok: true, room, members });
}

export async function POST(_: Request, { params }: { params: { roomId: string }}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  await prisma.membership.update({
    where: { roomId_userId: { roomId: params.roomId, userId: session.user.id } },
    data: { lastReadAt: new Date() }
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
