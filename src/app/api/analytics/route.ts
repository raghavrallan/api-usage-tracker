import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "project";
  const id = searchParams.get("id");
  const range = parseInt(searchParams.get("range") || "30");
  const platform = searchParams.get("platform");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - range);

  if (view === "project" && id) {
    return getProjectAnalytics(id, tenantId, startDate, platform);
  }
  if (view === "key" && id) {
    return getKeyAnalytics(id, tenantId, startDate);
  }
  if (view === "department" && id) {
    return getDepartmentAnalytics(id, tenantId, startDate, platform);
  }
  if (view === "users") {
    return getUserRanking(tenantId, startDate);
  }

  return getOverviewList(tenantId, startDate, view);
}

async function getOverviewList(tenantId: string, startDate: Date, view: string) {
  if (view === "project") {
    const projects = await prisma.project.findMany({
      where: { tenantId },
      include: {
        department: { select: { name: true } },
        platformKeys: {
          select: {
            id: true, platform: true, keyLabel: true,
            _count: { select: { usageRecords: true } },
          },
        },
      },
    });

    const projectData = [];
    for (const p of projects) {
      const agg = await prisma.usageRecord.aggregate({
        where: { platformKeyId: { in: p.platformKeys.map((k) => k.id) }, recordedAt: { gte: startDate } },
        _sum: { totalTokens: true, costUsd: true },
      });
      projectData.push({
        id: p.id,
        name: p.name,
        department: p.department?.name,
        keys: p.platformKeys.length,
        totalTokens: agg._sum.totalTokens || 0,
        totalCost: Math.round((agg._sum.costUsd || 0) * 100) / 100,
      });
    }
    return NextResponse.json(projectData.sort((a, b) => b.totalCost - a.totalCost));
  }

  if (view === "key") {
    const keys = await prisma.platformKey.findMany({
      where: { project: { tenantId } },
      include: { project: { select: { name: true } } },
    });

    const keyData = [];
    for (const k of keys) {
      const agg = await prisma.usageRecord.aggregate({
        where: { platformKeyId: k.id, recordedAt: { gte: startDate } },
        _sum: { totalTokens: true, costUsd: true, inputTokens: true, outputTokens: true },
        _count: true,
      });
      keyData.push({
        id: k.id,
        keyLabel: k.keyLabel,
        platform: k.platform,
        project: k.project.name,
        redactedValue: k.redactedValue,
        totalTokens: agg._sum.totalTokens || 0,
        totalCost: Math.round((agg._sum.costUsd || 0) * 100) / 100,
        inputTokens: agg._sum.inputTokens || 0,
        outputTokens: agg._sum.outputTokens || 0,
        records: agg._count,
      });
    }
    return NextResponse.json(keyData.sort((a, b) => b.totalCost - a.totalCost));
  }

  if (view === "department") {
    const departments = await prisma.department.findMany({
      where: { tenantId },
      include: { projects: { select: { id: true, platformKeys: { select: { id: true } } } } },
    });

    const deptData = [];
    for (const d of departments) {
      const keyIds = d.projects.flatMap((p) => p.platformKeys.map((k) => k.id));
      const agg = keyIds.length > 0
        ? await prisma.usageRecord.aggregate({
            where: { platformKeyId: { in: keyIds }, recordedAt: { gte: startDate } },
            _sum: { totalTokens: true, costUsd: true },
          })
        : { _sum: { totalTokens: null, costUsd: null } };

      deptData.push({
        id: d.id,
        name: d.name,
        projects: d.projects.length,
        keys: keyIds.length,
        totalTokens: agg._sum.totalTokens || 0,
        totalCost: Math.round((agg._sum.costUsd || 0) * 100) / 100,
      });
    }
    return NextResponse.json(deptData.sort((a, b) => b.totalCost - a.totalCost));
  }

  return NextResponse.json([]);
}

async function getProjectAnalytics(projectId: string, tenantId: string, startDate: Date, platform: string | null) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    include: { platformKeys: true, department: { select: { name: true } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const keyIds = project.platformKeys
    .filter((k) => !platform || k.platform === platform)
    .map((k) => k.id);

  const records = await prisma.usageRecord.findMany({
    where: { platformKeyId: { in: keyIds }, recordedAt: { gte: startDate } },
    orderBy: { recordedAt: "asc" },
  });

  const byModel = new Map<string, { tokens: number; cost: number; requests: number }>();
  const byDay = new Map<string, { tokens: number; cost: number }>();

  for (const r of records) {
    const day = r.recordedAt.toISOString().split("T")[0];
    const dayData = byDay.get(day) || { tokens: 0, cost: 0 };
    dayData.tokens += r.totalTokens;
    dayData.cost += r.costUsd;
    byDay.set(day, dayData);

    const modelData = byModel.get(r.model) || { tokens: 0, cost: 0, requests: 0 };
    modelData.tokens += r.totalTokens;
    modelData.cost += r.costUsd;
    modelData.requests += r.requestCount;
    byModel.set(r.model, modelData);
  }

  return NextResponse.json({
    project: { id: project.id, name: project.name, department: project.department?.name },
    keys: project.platformKeys.map((k) => ({
      id: k.id, keyLabel: k.keyLabel, platform: k.platform, isActive: k.isActive,
    })),
    trends: Array.from(byDay.entries()).map(([date, data]) => ({
      date, tokens: data.tokens, cost: Math.round(data.cost * 10000) / 10000,
    })),
    modelBreakdown: Array.from(byModel.entries())
      .map(([model, data]) => ({
        model, tokens: data.tokens, cost: Math.round(data.cost * 100) / 100, requests: data.requests,
      }))
      .sort((a, b) => b.cost - a.cost),
  });
}

async function getKeyAnalytics(keyId: string, tenantId: string, startDate: Date) {
  const key = await prisma.platformKey.findFirst({
    where: { id: keyId, project: { tenantId } },
    include: { project: { select: { name: true } } },
  });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const records = await prisma.usageRecord.findMany({
    where: { platformKeyId: keyId, recordedAt: { gte: startDate } },
    orderBy: { recordedAt: "asc" },
  });

  const byModel = new Map<string, { tokens: number; cost: number; input: number; output: number; requests: number }>();
  const byDay = new Map<string, { tokens: number; cost: number }>();

  for (const r of records) {
    const day = r.recordedAt.toISOString().split("T")[0];
    const dayData = byDay.get(day) || { tokens: 0, cost: 0 };
    dayData.tokens += r.totalTokens;
    dayData.cost += r.costUsd;
    byDay.set(day, dayData);

    const m = byModel.get(r.model) || { tokens: 0, cost: 0, input: 0, output: 0, requests: 0 };
    m.tokens += r.totalTokens;
    m.cost += r.costUsd;
    m.input += r.inputTokens;
    m.output += r.outputTokens;
    m.requests += r.requestCount;
    byModel.set(r.model, m);
  }

  return NextResponse.json({
    key: {
      id: key.id, keyLabel: key.keyLabel, platform: key.platform,
      project: key.project.name, redactedValue: key.redactedValue,
    },
    trends: Array.from(byDay.entries()).map(([date, d]) => ({
      date, tokens: d.tokens, cost: Math.round(d.cost * 10000) / 10000,
    })),
    modelBreakdown: Array.from(byModel.entries())
      .map(([model, d]) => ({
        model, tokens: d.tokens, cost: Math.round(d.cost * 100) / 100,
        inputTokens: d.input, outputTokens: d.output, requests: d.requests,
      }))
      .sort((a, b) => b.cost - a.cost),
  });
}

async function getDepartmentAnalytics(deptId: string, tenantId: string, startDate: Date, platform: string | null) {
  const dept = await prisma.department.findFirst({
    where: { id: deptId, tenantId },
    include: {
      projects: {
        include: { platformKeys: { select: { id: true, platform: true, keyLabel: true } } },
      },
    },
  });
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const keyIds = dept.projects.flatMap((p) =>
    p.platformKeys.filter((k) => !platform || k.platform === platform).map((k) => k.id)
  );

  const records = await prisma.usageRecord.findMany({
    where: { platformKeyId: { in: keyIds }, recordedAt: { gte: startDate } },
    orderBy: { recordedAt: "asc" },
  });

  const byProject = new Map<string, { name: string; tokens: number; cost: number }>();
  for (const p of dept.projects) {
    byProject.set(p.id, { name: p.name, tokens: 0, cost: 0 });
  }

  const pkToProject = new Map<string, string>();
  for (const p of dept.projects) {
    for (const k of p.platformKeys) {
      pkToProject.set(k.id, p.id);
    }
  }

  for (const r of records) {
    const projId = pkToProject.get(r.platformKeyId);
    if (projId) {
      const proj = byProject.get(projId)!;
      proj.tokens += r.totalTokens;
      proj.cost += r.costUsd;
    }
  }

  return NextResponse.json({
    department: { id: dept.id, name: dept.name },
    projects: Array.from(byProject.entries()).map(([id, data]) => ({
      id, ...data, cost: Math.round(data.cost * 100) / 100,
    })),
  });
}

async function getUserRanking(tenantId: string, startDate: Date) {
  const records = await prisma.usageRecord.findMany({
    where: {
      platformKey: { project: { tenantId } },
      recordedAt: { gte: startDate },
      userIdExternal: { not: null },
    },
    select: { userIdExternal: true, totalTokens: true, costUsd: true },
  });

  const byUser = new Map<string, { tokens: number; cost: number }>();
  for (const r of records) {
    if (!r.userIdExternal) continue;
    const data = byUser.get(r.userIdExternal) || { tokens: 0, cost: 0 };
    data.tokens += r.totalTokens;
    data.cost += r.costUsd;
    byUser.set(r.userIdExternal, data);
  }

  return NextResponse.json(
    Array.from(byUser.entries())
      .map(([userId, data]) => ({
        id: userId,
        name: userId,
        totalTokens: data.tokens,
        totalCost: Math.round(data.cost * 100) / 100,
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
  );
}
