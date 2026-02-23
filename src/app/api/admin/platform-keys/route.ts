import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { getSession, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const keys = await prisma.platformKey.findMany({
    where: { project: { tenantId: session.user.tenantId } },
    select: {
      id: true, projectId: true, platform: true, keyLabel: true,
      externalKeyId: true, redactedValue: true, isActive: true,
      discoveredViaId: true, lastSyncedAt: true, createdAt: true,
      project: { select: { name: true } },
      discoveredVia: { select: { keyLabel: true } },
      _count: { select: { usageRecords: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(keys);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const { projectId, platform, keyLabel, key } = await req.json();
  if (!projectId || !platform || !keyLabel || !key) {
    return badRequest("projectId, platform, keyLabel, and key are required");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.user.tenantId },
  });
  if (!project) return badRequest("Project not found");

  const encryptedKey = encrypt(key);
  const platformKey = await prisma.platformKey.create({
    data: {
      projectId,
      platform,
      keyLabel,
      encryptedKey,
      redactedValue: `...${key.slice(-4)}`,
    },
  });

  return NextResponse.json({ id: platformKey.id, keyLabel: platformKey.keyLabel });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("id is required");

  await prisma.platformKey.deleteMany({
    where: { id, project: { tenantId: session.user.tenantId } },
  });
  return NextResponse.json({ success: true });
}
