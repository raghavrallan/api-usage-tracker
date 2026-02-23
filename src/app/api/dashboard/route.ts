import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const range = parseInt(searchParams.get("range") || "30");
  const platform = searchParams.get("platform");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - range);

  const prevStart = new Date();
  prevStart.setDate(prevStart.getDate() - range * 2);

  const baseWhere = {
    platformKey: {
      project: { tenantId },
      ...(platform ? { platform } : {}),
    },
  };

  const currentAgg = await prisma.usageRecord.aggregate({
    where: { ...baseWhere, recordedAt: { gte: startDate } },
    _sum: { totalTokens: true, costUsd: true, requestCount: true },
  });
  const prevAgg = await prisma.usageRecord.aggregate({
    where: { ...baseWhere, recordedAt: { gte: prevStart, lt: startDate } },
    _sum: { totalTokens: true, costUsd: true },
  });

  const currentTokens = currentAgg._sum.totalTokens || 0;
  const currentCost = currentAgg._sum.costUsd || 0;
  const currentRequests = currentAgg._sum.requestCount || 0;
  const prevTokens = prevAgg._sum.totalTokens || 1;
  const prevCost = prevAgg._sum.costUsd || 1;

  const activeKeys = await prisma.platformKey.count({ where: { isActive: true, project: { tenantId } } });
  const activeProjects = await prisma.project.count({ where: { tenantId, platformKeys: { some: { isActive: true } } } });

  // Fetch records for charts
  const allRecords = await prisma.usageRecord.findMany({
    where: { ...baseWhere, recordedAt: { gte: startDate } },
    select: { recordedAt: true, totalTokens: true, costUsd: true, requestCount: true, platformKeyId: true },
    orderBy: { recordedAt: "asc" },
  });

  // Build platform lookup
  const pkIds = [...new Set(allRecords.map((r) => r.platformKeyId))];
  const pkLookup = new Map<string, string>();
  if (pkIds.length > 0) {
    const pkeys = await prisma.platformKey.findMany({
      where: { id: { in: pkIds } },
      select: { id: true, platform: true, project: { select: { name: true } } },
    });
    for (const pk of pkeys) pkLookup.set(pk.id, pk.platform);
  }

  // Usage trend (tokens + cost per day)
  const trendMap = new Map<string, { tokens: number; cost: number }>();
  // Stacked by platform per day
  const stackedMap = new Map<string, Record<string, number>>();
  // Heatmap: requests per day
  const heatmapMap = new Map<string, number>();
  // Cost by platform
  const costByPlatform = new Map<string, number>();
  // Cost by project
  const costByProject = new Map<string, { name: string; cost: number; tokens: number }>();

  for (const r of allRecords) {
    const day = r.recordedAt.toISOString().split("T")[0];
    const plat = pkLookup.get(r.platformKeyId) || "unknown";

    // Trend
    const trend = trendMap.get(day) || { tokens: 0, cost: 0 };
    trend.tokens += r.totalTokens;
    trend.cost += r.costUsd;
    trendMap.set(day, trend);

    // Stacked
    const stacked = stackedMap.get(day) || {};
    stacked[plat] = (stacked[plat] || 0) + r.totalTokens;
    stackedMap.set(day, stacked);

    // Heatmap
    heatmapMap.set(day, (heatmapMap.get(day) || 0) + r.requestCount);

    // Cost by platform
    costByPlatform.set(plat, (costByPlatform.get(plat) || 0) + r.costUsd);
  }

  // Build project cost from pkLookup
  if (pkIds.length > 0) {
    const pkeys = await prisma.platformKey.findMany({
      where: { id: { in: pkIds } },
      select: { id: true, project: { select: { name: true } } },
    });
    const pkProjMap = new Map<string, string>();
    for (const pk of pkeys) pkProjMap.set(pk.id, pk.project.name);

    for (const r of allRecords) {
      const projName = pkProjMap.get(r.platformKeyId) || "Unknown";
      const existing = costByProject.get(projName) || { name: projName, cost: 0, tokens: 0 };
      existing.cost += r.costUsd;
      existing.tokens += r.totalTokens;
      costByProject.set(projName, existing);
    }
  }

  const usageTrends = Array.from(trendMap.entries()).map(([date, data]) => ({
    date,
    tokens: data.tokens,
    cost: Math.round(data.cost * 10000) / 10000,
  }));

  const allPlatforms = [...new Set(pkLookup.values())];
  const platformStacked = Array.from(stackedMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, platData]) => ({ date, ...platData }));

  const costBreakdown = Array.from(costByPlatform.entries()).map(([p, cost]) => ({
    platform: p,
    cost: Math.round(cost * 100) / 100,
  }));

  // Model distribution
  const modelDist = await prisma.usageRecord.groupBy({
    by: ["model"],
    where: { ...baseWhere, recordedAt: { gte: startDate } },
    _sum: { totalTokens: true },
    orderBy: { _sum: { totalTokens: "desc" } },
    take: 10,
  });

  const topProjects = Array.from(costByProject.values())
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5)
    .map((p) => ({ ...p, cost: Math.round(p.cost * 100) / 100 }));

  const heatmap = Array.from(heatmapMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  // Recent sync logs
  const recentSyncs = await prisma.syncLog.findMany({
    where: { platformKey: { project: { tenantId } } },
    include: { platformKey: { select: { keyLabel: true, platform: true } } },
    orderBy: { startedAt: "desc" },
    take: 5,
  });

  return NextResponse.json({
    kpi: {
      totalTokens: currentTokens,
      totalCost: Math.round(currentCost * 100) / 100,
      totalRequests: currentRequests,
      activeKeys,
      activeProjects,
      tokenChange: prevTokens > 0 ? Math.round(((currentTokens - prevTokens) / prevTokens) * 100) : 0,
      costChange: prevCost > 0 ? Math.round(((currentCost - prevCost) / prevCost) * 100) : 0,
    },
    usageTrends,
    platformStacked,
    platforms: allPlatforms,
    costBreakdown,
    modelDistribution: modelDist.map((m) => ({ model: m.model, tokens: m._sum.totalTokens || 0 })),
    topProjects,
    heatmap,
    recentSyncs: recentSyncs.map((s) => ({
      id: s.id,
      keyLabel: s.platformKey.keyLabel,
      platform: s.platformKey.platform,
      status: s.status,
      syncType: s.syncType,
      recordsSynced: s.recordsSynced,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString(),
    })),
  });
}
