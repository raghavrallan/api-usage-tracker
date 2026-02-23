import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { getSession, unauthorized, badRequest } from "@/lib/api-helpers";
import { getProvider } from "@/lib/providers";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const keys = await prisma.adminKey.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { discoveredKeys: true } } },
  });

  return NextResponse.json(
    keys.map((k) => ({
      id: k.id,
      platform: k.platform,
      keyLabel: k.keyLabel,
      keyType: k.keyType,
      isActive: k.isActive,
      lastSyncedAt: k.lastSyncedAt,
      createdAt: k.createdAt,
      discoveredKeysCount: k._count.discoveredKeys,
    }))
  );
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const body = await req.json();
  const { platform, keyLabel, key, keyType } = body;

  if (!platform || !keyLabel || !key) {
    return badRequest("platform, keyLabel, and key are required");
  }

  const encryptedKey = encrypt(key);

  const adminKey = await prisma.adminKey.create({
    data: {
      tenantId: session.user.tenantId,
      platform,
      keyLabel,
      encryptedKey,
      keyType: keyType || "admin",
    },
  });

  return NextResponse.json({ id: adminKey.id, platform: adminKey.platform, keyLabel: adminKey.keyLabel });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("id is required");

  await prisma.adminKey.delete({ where: { id, tenantId: session.user.tenantId } });
  return NextResponse.json({ success: true });
}
