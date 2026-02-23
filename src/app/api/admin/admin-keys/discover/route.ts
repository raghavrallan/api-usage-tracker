import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getSession, unauthorized, badRequest } from "@/lib/api-helpers";
import { getProvider } from "@/lib/providers";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const body = await req.json();
  const { adminKeyId, projectId } = body;

  if (!adminKeyId) return badRequest("adminKeyId is required");

  const adminKey = await prisma.adminKey.findFirst({
    where: { id: adminKeyId, tenantId: session.user.tenantId },
  });

  if (!adminKey) return badRequest("Admin key not found");

  const decryptedKey = decrypt(adminKey.encryptedKey);
  const provider = getProvider(adminKey.platform);

  try {
    const discoveredKeys = await provider.discoverKeys(decryptedKey);

    let storedCount = 0;
    for (const dk of discoveredKeys) {
      const existing = await prisma.platformKey.findFirst({
        where: {
          externalKeyId: dk.externalKeyId,
          discoveredViaId: adminKey.id,
        },
      });

      if (!existing && projectId) {
        await prisma.platformKey.create({
          data: {
            projectId,
            platform: adminKey.platform,
            keyLabel: dk.name,
            externalKeyId: dk.externalKeyId,
            redactedValue: dk.redactedValue,
            discoveredViaId: adminKey.id,
            isActive: true,
          },
        });
        storedCount++;
      }
    }

    await prisma.adminKey.update({
      where: { id: adminKey.id },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({
      discovered: discoveredKeys.length,
      stored: storedCount,
      keys: discoveredKeys,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
