import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

function code6() {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => s[Math.floor(Math.random() * s.length)]).join("");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const rooms = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { room: true }
  });
  return NextResponse.json({ ok: true, rooms: rooms.map(r => r.room) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { action } = body as { action: "create" | "join" };
  if (action === "create") {
    const { name, isDm } = body as { name?: string; isDm?: boolean };
    let code = code6();
    // 중복 방지
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.room.findUnique({ where: { code } });
      if (!exists) break;
      code = code6();
    }
    const room = await prisma.room.create({
      data: {
        name: name?.slice(0, 40),
        code,
        isDm: !!isDm,
        createdBy: session.user.id,
        memberships: {
          create: { userId: session.user.id }
        }
      }
    });
    return NextResponse.json({ ok: true, room });
  }
  if (action === "join") {
    const { code } = body as { code: string };
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) return NextResponse.json({ ok: false, error: "코드가 올바르지 않습니다." }, { status: 404 });
    await prisma.membership.upsert({
      where: { roomId_userId: { roomId: room.id, userId: session.user.id } },
      create: { roomId: room.id, userId: session.user.id },
      update: {}
    });
    return NextResponse.json({ ok: true, room });
  }
  return NextResponse.json({ ok: false }, { status: 400 });
}
