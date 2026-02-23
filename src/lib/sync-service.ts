import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getProvider } from "@/lib/providers";

export async function syncSingleKey(platformKeyId: string, syncType: "manual" | "auto") {
  const platformKey = await prisma.platformKey.findUnique({
    where: { id: platformKeyId },
    include: { discoveredVia: true, project: true },
  });

  if (!platformKey || !platformKey.isActive) {
    throw new Error("Platform key not found or inactive");
  }

  const syncLog = await prisma.syncLog.create({
    data: {
      platformKeyId,
      syncType,
      status: "running",
    },
  });

  try {
    let apiKey: string;

    if (platformKey.discoveredVia) {
      apiKey = decrypt(platformKey.discoveredVia.encryptedKey);
    } else if (platformKey.encryptedKey) {
      apiKey = decrypt(platformKey.encryptedKey);
    } else {
      throw new Error("No API key available for this platform key");
    }

    const provider = getProvider(platformKey.platform);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const usage = await provider.fetchUsage(apiKey, startDate, endDate);
    let recordsSynced = 0;

    for (const record of usage) {
      await prisma.usageRecord.upsert({
        where: {
          platformKeyId_recordedAt_model: {
            platformKeyId,
            recordedAt: record.recordedAt,
            model: record.model,
          },
        },
        create: {
          platformKeyId,
          recordedAt: record.recordedAt,
          model: record.model,
          inputTokens: record.inputTokens,
          outputTokens: record.outputTokens,
          totalTokens: record.totalTokens,
          costUsd: record.costUsd,
          requestCount: record.requestCount,
          userIdExternal: record.userIdExternal,
          projectIdExternal: record.projectIdExternal,
          metadataExtra: record.metadataExtra ? JSON.parse(JSON.stringify(record.metadataExtra)) : undefined,
        },
        update: {
          inputTokens: record.inputTokens,
          outputTokens: record.outputTokens,
          totalTokens: record.totalTokens,
          costUsd: record.costUsd,
          requestCount: record.requestCount,
        },
      });
      recordsSynced++;
    }

    const billing = await provider.fetchBilling(apiKey, startDate, endDate);
    if (billing) {
      await prisma.billingSnapshot.create({
        data: {
          platformKeyId,
          periodStart: billing.periodStart,
          periodEnd: billing.periodEnd,
          totalCostUsd: billing.totalCostUsd,
          totalTokens: billing.totalTokens,
          breakdown: billing.breakdown ? JSON.parse(JSON.stringify(billing.breakdown)) : undefined,
        },
      });
    }

    await prisma.platformKey.update({
      where: { id: platformKeyId },
      data: { lastSyncedAt: new Date() },
    });

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "success", recordsSynced, completedAt: new Date() },
    });

    return { recordsSynced };
  } catch (error) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function syncAllKeys(tenantId?: string) {
  const where: Record<string, unknown> = { isActive: true };
  if (tenantId) where.project = { tenantId };

  const keys = await prisma.platformKey.findMany({ where, select: { id: true } });
  const results = [];

  for (const key of keys) {
    try {
      const result = await syncSingleKey(key.id, "auto");
      results.push({ keyId: key.id, ...result });
    } catch (error) {
      results.push({
        keyId: key.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
