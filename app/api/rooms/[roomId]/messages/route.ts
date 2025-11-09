import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { pusherServer, roomChannel } from "@/lib/pusher";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type MessageFull = Prisma.MessageGetPayload<{ include: { user: true; reactions: true } }>;
type Membership = Prisma.Membership;

export async function GET(req: Request, { params }: { params: { roomId: string }}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(30, Number(searchParams.get("limit") ?? "30"));

  const messages: MessageFull[] = await prisma.message.findMany({
    where: { roomId: params.roomId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { user: true, reactions: true }
  });

  const mships: Membership[] = await prisma.membership.findMany({ where: { roomId: params.roomId } });

  const withRead = messages.map((m: MessageFull) => {
    const readCount = mships.filter(ms => ms.lastReadAt >= m.createdAt).length;
    return { ...m, readCount, memberCount: mships.length };
  });

  const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;
  return NextResponse.json({ ok: true, items: withRead, nextCursor });
}

export async function POST(req: Request, { params }: { params: { roomId: string }}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { content } = body as { content: string };
  if (!content || !content.trim()) return NextResponse.json({ ok: false }, { status: 400 });

  const member = await prisma.membership.findUnique({
    where: { roomId_userId: { roomId: params.roomId, userId: session.user.id } }
  });
  if (!member) return NextResponse.json({ ok: false }, { status: 403 });

  const msg = await prisma.message.create({
    data: { roomId: params.roomId, userId: session.user.id, content: content.slice(0, 2000) },
    include: { user: true, reactions: true }
  });

  await prisma.membership.update({
    where: { roomId_userId: { roomId: params.roomId, userId: session.user.id } },
    data: { lastReadAt: new Date() }
  }).catch(() => {});

  await pusherServer.trigger(roomChannel(params.roomId), "message:new", { message: msg });
  return NextResponse.json({ ok: true, message: msg });
}

export async function PATCH(req: Request, { params }: { params: { roomId: string }}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id, content } = body as { id: string; content: string };

  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg || msg.userId !== session.user.id) return NextResponse.json({ ok: false }, { status: 403 });

  const diffMin = (Date.now() - msg.createdAt.getTime()) / 60000;
  if (diffMin > 5) return NextResponse.json({ ok: false, error: "편집 가능 시간(5분) 초과" }, { status: 400 });

  const updated = await prisma.message.update({
    where: { id },
    data: { content: content.slice(0, 2000), edited: true }
  });

  await pusherServer.trigger(roomChannel(params.roomId), "message:update", { message: updated });
  return NextResponse.json({ ok: true, message: updated });
}

export async function DELETE(req: Request, { params }: { params: { roomId: string }}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id } = body as { id: string };

  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg || msg.userId !== session.user.id) return NextResponse.json({ ok: false }, { status: 403 });

  const diffMin = (Date.now() - msg.createdAt.getTime()) / 60000;
  if (diffMin > 1) return NextResponse.json({ ok: false, error: "삭제 가능 시간(1분) 초과" }, { status: 400 });

  const deleted = await prisma.message.update({
    where: { id },
    data: { deleted: true, content: "삭제된 메시지" }
  });

  await pusherServer.trigger(roomChannel(params.roomId), "message:delete", { id });
  return NextResponse.json({ ok: true, message: deleted });
}
