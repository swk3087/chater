import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  return NextResponse.json({ ok: true, me });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { nickname, imageBase64 } = body as { nickname?: string; imageBase64?: string };
  const update: any = {};
  if (nickname) update.nickname = nickname.slice(0, 24);
  if (imageBase64 && imageBase64.length < 100_000) update.image = imageBase64; // 최대 ~100KB
  const me = await prisma.user.update({ where: { id: session.user.id }, data: update });
  return NextResponse.json({ ok: true, me });
}
